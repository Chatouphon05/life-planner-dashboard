import { useState, useEffect, useCallback, useRef } from 'react';

const WORKER_URL = 'https://life-planner-proxy.chatouphonstch.workers.dev/';

// June 7, 2026 — departure date
const BRISBANE_DATE = new Date(2026, 5, 7);
// Jan 1 → Jun 7 = 158 days, used as the denominator for the Brisbane progress bar
const BRISBANE_TOTAL_DAYS = 158;

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

export function getLiveDate() {
  const now = new Date();

  const brisbaneDaysLeft = Math.max(0, Math.ceil((BRISBANE_DATE - now) / 86400000));

  const daysSinceMonday = (now.getDay() + 6) % 7;
  const weekPct         = Math.round((daysSinceMonday / 7) * 100);
  const weekDaysLeft    = 7 - daysSinceMonday;

  const daysInMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthPct     = Math.round((now.getDate() / daysInMonth) * 100);
  const monthDaysLeft = daysInMonth - now.getDate();

  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear   = Math.ceil((now - startOfYear) / 86400000);
  const daysInYear  = now.getFullYear() % 4 === 0 ? 366 : 365;
  const yearPct     = Math.round((dayOfYear / daysInYear) * 100);
  const yearDaysLeft = daysInYear - dayOfYear;

  const brisbanePct = brisbaneDaysLeft <= 0
    ? 100
    : Math.min(100, Math.round((dayOfYear / BRISBANE_TOTAL_DAYS) * 100));

  return {
    date: {
      day:    DAYS[now.getDay()],
      d:      now.getDate(),
      m:      MONTHS[now.getMonth()],
      mShort: MONTHS_SHORT[now.getMonth()],
      y:      now.getFullYear(),
    },
    brisbane: {
      daysLeft: brisbaneDaysLeft,
      target:   'Jun 7',
    },
    city: brisbaneDaysLeft <= 0 ? 'Brisbane' : 'Vientiane',
    mantra: 'Becoming more stable, clearer, and braver as who I already am.',
    time: [
      { label: 'This week',   pct: weekPct,     sub: `${weekDaysLeft}d remaining` },
      { label: 'This month',  pct: monthPct,    sub: `${monthDaysLeft}d remaining · ${MONTHS[now.getMonth()]}` },
      { label: 'This year',   pct: yearPct,     sub: `${yearDaysLeft}d remaining · ${now.getFullYear()}` },
      { label: 'To Brisbane', pct: brisbanePct, sub: `${brisbaneDaysLeft}d remaining · Jun 7 departure` },
    ],
  };
}

function adaptWorkerData(raw) {
  const tasks = (raw.today?.tasks || []).map((t, i) => ({
    id:       `t${i}`,
    task:     typeof t === 'string' ? t : (t.name || String(t)),
    meta:     null,
    priority: i === 0,
  }));

  const priorities = (raw.week?.priorities || []).map((p, i) => ({
    n:      i + 1,
    task:   typeof p === 'string' ? p : (p.name || String(p)),
    detail: null,
  }));

  const monthly = {
    theme:      raw.month?.theme || raw.month?.focus || null,
    name:       raw.month?.name  || null,
    focusAreas: [],
  };

  const goals = (raw.goals || []).map((g, i) => ({
    id:     `g${i}`,
    name:   g.name   || '',
    area:   g.area   || '',
    period: g.quarter || '',
    pct:    g.progress != null ? Math.round(g.progress) : 0,
    sub:    g.status || '',
  }));

  return { tasks, priorities, monthly, goals };
}

export function useNotionData() {
  const [state, setState] = useState({
    loading:    true,
    error:      null,
    tasks:      [],
    priorities: [],
    monthly:    { theme: null, name: null, focusAreas: [] },
    goals:      [],
  });

  const fetchData = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(WORKER_URL);
      if (!res.ok) throw new Error(`Worker returned ${res.status}`);
      const raw = await res.json();
      setState({ loading: false, error: null, ...adaptWorkerData(raw) });
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err.message }));
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { ...state, liveDate: getLiveDate(), refetch: fetchData };
}
