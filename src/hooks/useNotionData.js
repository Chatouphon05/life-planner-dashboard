import { useState, useEffect, useCallback } from 'react';

const WORKER_URL = 'https://life-planner-dashboard.vercel.app/api';

const BRISBANE_DATE      = new Date(2026, 5, 7); // June 7, 2026
const BRISBANE_TOTAL_DAYS = 158;                 // Jan 1 → Jun 7

const DAYS         = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS       = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

export function getLiveDate() {
  const now = new Date();

  const brisbaneDaysLeft = Math.max(0, Math.ceil((BRISBANE_DATE - now) / 86400000));

  const daysSinceMonday = (now.getDay() + 6) % 7;
  const weekPct         = Math.round((daysSinceMonday / 7) * 100);

  const daysInMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthPct      = Math.round((now.getDate() / daysInMonth) * 100);
  const monthDaysLeft = daysInMonth - now.getDate();

  const startOfYear  = new Date(now.getFullYear(), 0, 1);
  const dayOfYear    = Math.ceil((now - startOfYear) / 86400000);
  const daysInYear   = now.getFullYear() % 4 === 0 ? 366 : 365;
  const yearPct      = Math.round((dayOfYear / daysInYear) * 100);

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
    brisbane: { daysLeft: brisbaneDaysLeft, target: 'Jun 7' },
    city:   brisbaneDaysLeft <= 0 ? 'Brisbane' : 'Vientiane',
    mantra: 'Becoming more stable, clearer, and braver as who I already am.',
    time: [
      { label: 'This week',   pct: weekPct,     sub: `${7 - daysSinceMonday}d remaining` },
      { label: 'This month',  pct: monthPct,    sub: `${monthDaysLeft}d remaining · ${MONTHS[now.getMonth()]}` },
      { label: 'This year',   pct: yearPct,     sub: `${daysInYear - dayOfYear}d remaining · ${now.getFullYear()}` },
      { label: 'To Brisbane', pct: brisbanePct, sub: `${brisbaneDaysLeft}d remaining · Jun 7 departure` },
    ],
  };
}

function adaptWorkerData(raw) {
  // Tasks — v2 returns rich objects
  const tasks = (raw.tasks || []).map(t => ({
    id:       t.id,
    task:     t.task     || '',
    done:     t.done     ?? false,
    area:     t.area     || null,
    priority: t.priority || null,
  }));

  // Habits — v2 returns rich objects
  const habits = (raw.habits || []).map(h => ({
    id:       h.id,
    habit:    h.habit    || '',
    done:     h.done     ?? false,
    category: h.category || null,
    streak:   h.streak   ?? 0,
  }));

  // Today's mood + energy
  const today = {
    mood:    raw.today?.mood    || null,
    energy:  raw.today?.energy  || null,
    dailyId: raw.today?.dailyId || null,
  };

  // 14-day history arrays (pass through from Worker)
  const taskHistory  = raw.taskHistory  || [];
  const habitHistory = raw.habitHistory || {};

  // Weekly priorities — already an array in v2
  const priorities = (raw.week?.priorities || []).map((p, i) => ({
    n:    i + 1,
    task: typeof p === 'string' ? p : String(p),
  }));

  // Monthly
  const monthly = {
    theme:      raw.month?.theme || raw.month?.focus || null,
    name:       raw.month?.name  || null,
    focusAreas: [],
  };

  // Goals
  const goals = (raw.goals || []).map(g => ({
    id:     g.id     || '',
    name:   g.name   || '',
    area:   g.area   || '',
    period: g.quarter || '',
    pct:    g.progress != null ? Math.round(g.progress) : 0,
    sub:    g.status || '',
  }));

  // Weekly tasks (hierarchy level 3)
  const weeklyTasks = (raw.weeklyTasks || []).map(t => ({
    id:       t.id       || '',
    task:     t.task     || '',
    status:   t.status   || 'Not Started',
    priority: t.priority || null,
    week:     t.week     || null,
  }));

  // Monthly tasks (hierarchy level 2)
  const monthlyTasks = (raw.monthlyTasks || []).map(t => ({
    id:       t.id       || '',
    task:     t.task     || '',
    status:   t.status   || 'Not Started',
    priority: t.priority || null,
    month:    t.month    || null,
  }));

  const currentWeek  = raw.currentWeek  || '';
  const currentMonth = raw.currentMonth || '';

  return { tasks, habits, today, taskHistory, habitHistory, priorities, monthly, goals, weeklyTasks, monthlyTasks, currentWeek, currentMonth };
}

const CACHE_KEY = 'lp-data-v2';

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
}
function saveCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
}

const EMPTY_STATE = {
  loading:       true,
  stale:         false,
  error:         null,
  tasks:         [],
  habits:        [],
  today:         { mood: null, energy: null, dailyId: null },
  taskHistory:   [],
  habitHistory:  {},
  priorities:    [],
  monthly:       { theme: null, name: null, focusAreas: [] },
  goals:         [],
  weeklyTasks:   [],
  monthlyTasks:  [],
  currentWeek:   '',
  currentMonth:  '',
};

export function useNotionData() {
  const [state, setState] = useState(() => {
    const cached = loadCache();
    if (cached) return { loading: false, stale: true, error: null, ...cached };
    return EMPTY_STATE;
  });

  // Central write-back: POST { type, pageId, value } to Worker
  const writeback = useCallback(async (type, pageId, value) => {
    const res = await fetch(WORKER_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type, pageId, value }),
    });
    if (!res.ok) throw new Error(`Writeback failed: ${res.status}`);
    return res.json();
  }, []);

  const fetchData = useCallback(async () => {
    // Only show loading spinner when there's nothing to show yet
    setState(s => ({
      ...s,
      loading: !s.tasks.length && !s.habits.length,
      stale:   true,
      error:   null,
    }));
    try {
      const res = await fetch(WORKER_URL);
      if (!res.ok) throw new Error(`Worker returned ${res.status}`);
      const raw     = await res.json();
      const adapted = adaptWorkerData(raw);
      saveCache(adapted);
      setState({ loading: false, stale: false, error: null, ...adapted });
    } catch (err) {
      // If we have cached data, stay silent on background-refresh failure
      setState(s => ({
        ...s,
        loading: false,
        stale:   false,
        error:   (s.tasks.length || s.habits.length) ? null : err.message,
      }));
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { ...state, liveDate: getLiveDate(), refetch: fetchData, writeback };

}
