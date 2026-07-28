import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { WORKER_URL } from './useNotionData.js';
import { addDaysStr, dowOfDateStr, firstOfMonthStr, addMonthsStr, todayStr } from '../utils/dateGrid.js';

// Phase C: full Day/4-day/Week/Month/Schedule navigation, matching Google
// Calendar's own view switcher. All views fetch through the same Worker
// window endpoint (/calendar?start=&days=) — only the window size and the
// step size for prev/next differ per view.

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

// Window (start date + day count) the Worker should fetch for a given view.
function windowFor(view, anchorDate) {
  if (view === 'day')      return { start: anchorDate, days: 1 };
  if (view === '4day')     return { start: anchorDate, days: 4 };
  if (view === 'schedule') return { start: anchorDate, days: 30 };
  if (view === 'week') {
    const start = addDaysStr(anchorDate, -dowOfDateStr(anchorDate));
    return { start, days: 7 };
  }
  if (view === 'month') {
    const first = firstOfMonthStr(anchorDate);
    const start = addDaysStr(first, -dowOfDateStr(first));
    return { start, days: 42 };
  }
  return { start: anchorDate, days: 1 };
}

// How far prev/next steps for a given view (month steps by calendar month
// instead, handled separately since it isn't a fixed day count).
function stepDaysFor(view) {
  if (view === '4day') return 4;
  if (view === 'week')  return 7;
  if (view === 'schedule') return 7;
  return 1;
}

export function useCalendarData() {
  const [status, setStatus] = useState(() => {
    const cached = loadJSON(STATUS_CACHE_KEY, null);
    return { loading: !cached, error: null, ...(cached || EMPTY_STATUS) };
  });
  const [calendars, setCalendars] = useState(() => loadJSON(CALENDARS_CACHE_KEY, []));
  const [selectedCalendarIds, setSelectedCalendarIds] = useState(() => loadJSON(SELECTED_CACHE_KEY, null));
  const [view, setView] = useState('day');
  const [anchorDate, setAnchorDate] = useState(() => todayStr());
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(null);

  const { start, days } = useMemo(() => windowFor(view, anchorDate), [view, anchorDate]);

  // Mirrors the latest window/selection into refs so the mount-once polling
  // effect below (interval + visibilitychange) always reads current values
  // instead of whatever was in scope when that effect first ran.
  const windowRef = useRef({ start, days });
  windowRef.current = { start, days };
  const selectedRef = useRef(selectedCalendarIds);
  selectedRef.current = selectedCalendarIds;

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

  const fetchEvents = useCallback(async (calendarIds, windowStart, windowDays) => {
    if (!calendarIds || !calendarIds.length) {
      setEvents([]);
      setEventsLoading(false);
      return;
    }
    setEventsLoading(true);
    setEventsError(null);
    try {
      const url = `${WORKER_URL}/calendar?start=${windowStart}&days=${windowDays}&cal=${calendarIds.map(encodeURIComponent).join(',')}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Worker returned ${res.status}`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      setEventsError(err.message);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  // Bootstrap + manual refresh (REFRESH button) + the mount-once polling
  // effect below all call this. Its identity never changes (every dep is a
  // stable, empty-deps useCallback) so the polling effect can safely run
  // once and keep firing this forever — it reads the *current* window via
  // windowRef/selectedRef rather than closing over stale start/days.
  const refetch = useCallback(async () => {
    const s = await fetchStatus();
    if (!s?.connected) return;
    const list = await fetchCalendars();
    const current = selectedRef.current;
    const ids = (current && current.length) ? current : (list || []).filter(c => c.selected).map(c => c.id);
    if (!current || !current.length) {
      saveJSON(SELECTED_CACHE_KEY, ids);
      setSelectedCalendarIds(ids);
    }
    const { start: winStart, days: winDays } = windowRef.current;
    fetchEvents(ids, winStart, winDays);
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

  // Refetch whenever the visible window or the selected calendars change
  // (skips the very first render — the bootstrap effect above covers it).
  const [bootstrapped, setBootstrapped] = useState(false);
  useEffect(() => {
    if (!bootstrapped) { setBootstrapped(true); return; }
    if (!status.connected || !selectedCalendarIds || !selectedCalendarIds.length) return;
    fetchEvents(selectedCalendarIds, start, days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, anchorDate]);

  const toggleCalendar = useCallback((id) => {
    setSelectedCalendarIds(prev => {
      const current = prev || [];
      const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
      saveJSON(SELECTED_CACHE_KEY, next);
      fetchEvents(next, start, days);
      return next;
    });
  }, [fetchEvents, start, days]);

  const changeView = useCallback((nextView) => {
    setView(nextView);
    if (nextView === 'month') setAnchorDate(prev => firstOfMonthStr(prev));
  }, []);

  const goToday = useCallback(() => {
    setAnchorDate(view === 'month' ? firstOfMonthStr(todayStr()) : todayStr());
  }, [view]);

  const goPrev = useCallback(() => {
    setAnchorDate(prev => view === 'month' ? addMonthsStr(prev, -1) : addDaysStr(prev, -stepDaysFor(view)));
  }, [view]);

  const goNext = useCallback(() => {
    setAnchorDate(prev => view === 'month' ? addMonthsStr(prev, 1) : addDaysStr(prev, stepDaysFor(view)));
  }, [view]);

  const goToDate = useCallback((dateStr) => setAnchorDate(dateStr), []);

  return {
    ...status,
    calendars,
    selectedCalendarIds: selectedCalendarIds || [],
    toggleCalendar,
    view, anchorDate,
    changeView, goToday, goPrev, goNext, goToDate,
    events,
    eventsLoading,
    eventsError,
    refetch,
  };
}
