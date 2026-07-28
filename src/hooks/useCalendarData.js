import { useState, useEffect, useCallback } from 'react';
import { WORKER_URL } from './useNotionData.js';

// Phase B: connection status + calendar list + today's events (day range
// only). Week/month navigation lands with Phase C — for now this always
// shows "today" as the Worker defines it.

const STATUS_CACHE_KEY    = 'lp-calendar-status-v1';
const CALENDARS_CACHE_KEY = 'lp-calendar-calendars-v1';
const SELECTED_CACHE_KEY  = 'lp-calendar-selected-v1';

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const EMPTY_STATUS = { connected: false, email: null, connectedAt: null, updatedAt: null };

export function useCalendarData() {
  const [status, setStatus] = useState(() => {
    const cached = loadJSON(STATUS_CACHE_KEY, null);
    return { loading: !cached, error: null, ...(cached || EMPTY_STATUS) };
  });
  const [calendars, setCalendars] = useState(() => loadJSON(CALENDARS_CACHE_KEY, []));
  const [selectedCalendarIds, setSelectedCalendarIds] = useState(() => loadJSON(SELECTED_CACHE_KEY, null));
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(null);

  const fetchStatus = useCallback(async () => {
    setStatus(s => ({ ...s, error: null }));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(`${WORKER_URL}/calendar/status`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`Worker returned ${res.status}`);
      const data = await res.json();
      saveJSON(STATUS_CACHE_KEY, data);
      setStatus({ loading: false, error: null, ...data });
      return data;
    } catch (err) {
      clearTimeout(timer);
      const timedOut = err.name === 'AbortError';
      setStatus(s => ({ ...s, loading: false, error: timedOut ? 'Status check timed out' : err.message }));
      return null;
    }
  }, []);

  const fetchCalendars = useCallback(async () => {
    try {
      const res = await fetch(`${WORKER_URL}/calendar/calendars`);
      if (!res.ok) throw new Error(`Worker returned ${res.status}`);
      const data = await res.json();
      const list = data.calendars || [];
      setCalendars(list);
      saveJSON(CALENDARS_CACHE_KEY, list);
      return list;
    } catch {
      return null;
    }
  }, []);

  const fetchEvents = useCallback(async (calendarIds) => {
    if (!calendarIds || !calendarIds.length) {
      setEvents([]);
      setEventsLoading(false);
      return;
    }
    setEventsLoading(true);
    setEventsError(null);
    try {
      const res = await fetch(`${WORKER_URL}/calendar?range=day&cal=${calendarIds.map(encodeURIComponent).join(',')}`);
      if (!res.ok) throw new Error(`Worker returned ${res.status}`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      setEventsError(err.message);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const toggleCalendar = useCallback((id) => {
    setSelectedCalendarIds(prev => {
      const current = prev || [];
      const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
      saveJSON(SELECTED_CACHE_KEY, next);
      return next;
    });
  }, []);

  const refetch = useCallback(async () => {
    const s = await fetchStatus();
    if (!s?.connected) return;
    const list = await fetchCalendars();
    setSelectedCalendarIds(prev => {
      if (prev && prev.length) {
        fetchEvents(prev);
        return prev;
      }
      const defaults = (list || []).filter(c => c.selected).map(c => c.id);
      saveJSON(SELECTED_CACHE_KEY, defaults);
      fetchEvents(defaults);
      return defaults;
    });
  }, [fetchStatus, fetchCalendars, fetchEvents]);

  useEffect(() => {
    refetch();

    const interval = setInterval(refetch, 300000);
    const onVisibility = () => { if (document.visibilityState === 'visible') refetch(); };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...status,
    calendars,
    selectedCalendarIds: selectedCalendarIds || [],
    toggleCalendar,
    events,
    eventsLoading,
    eventsError,
    refetch,
  };
}
