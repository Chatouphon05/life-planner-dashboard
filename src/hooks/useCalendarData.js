import { useState, useEffect, useCallback } from 'react';
import { WORKER_URL } from './useNotionData.js';

// Phase A: connection status only. Event fetching (calendars/events/writes)
// lands in later phases once the OAuth loop is proven end-to-end.

const CACHE_KEY = 'lp-calendar-status-v1';

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
}
function saveCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
}

const EMPTY_STATE = {
  connected:   false,
  email:       null,
  connectedAt: null,
  updatedAt:   null,
};

export function useCalendarData() {
  const [state, setState] = useState(() => {
    const cached = loadCache();
    return { loading: !cached, error: null, ...(cached || EMPTY_STATE) };
  });

  const fetchStatus = useCallback(async () => {
    setState(s => ({ ...s, error: null }));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(`${WORKER_URL}/calendar/status`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`Worker returned ${res.status}`);
      const data = await res.json();
      saveCache(data);
      setState({ loading: false, error: null, ...data });
    } catch (err) {
      clearTimeout(timer);
      const timedOut = err.name === 'AbortError';
      setState(s => ({ ...s, loading: false, error: timedOut ? 'Status check timed out' : err.message }));
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    const interval = setInterval(fetchStatus, 300000);
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchStatus(); };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchStatus]);

  return { ...state, refetch: fetchStatus };
}
