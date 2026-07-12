import { useState, useEffect, useCallback } from 'react';

export const WORKER_URL = 'https://api.lunkystch.com';

const DAYS         = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS       = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

// workerDateStr: YYYY-MM-DD from Worker (UTC+7/UTC+10 timezone). When provided,
// the date display fields (day name, d, m, y) reflect the Worker's "today" so
// Hero and API stay in sync regardless of browser timezone.
export function getLiveDate(workerDateStr = null) {
  const now = new Date();

  // Progress percentages stay on browser local time — fine for "Time Remaining"
  const daysSinceMonday = (now.getDay() + 6) % 7;
  const weekPct         = Math.round((daysSinceMonday / 7) * 100);

  const daysInMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthPct      = Math.round((now.getDate() / daysInMonth) * 100);
  const monthDaysLeft = daysInMonth - now.getDate();

  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear   = Math.ceil((now - startOfYear) / 86400000);
  const daysInYear  = now.getFullYear() % 4 === 0 ? 366 : 365;
  const yearPct     = Math.round((dayOfYear / daysInYear) * 100);

  // Date display: use Worker's date if available so Hero matches API "today"
  const display = workerDateStr
    ? new Date(workerDateStr + 'T12:00:00Z')
    : now;
  const getDay   = workerDateStr ? (d) => d.getUTCDay()      : (d) => d.getDay();
  const getDate  = workerDateStr ? (d) => d.getUTCDate()     : (d) => d.getDate();
  const getMonth = workerDateStr ? (d) => d.getUTCMonth()    : (d) => d.getMonth();
  const getYear  = workerDateStr ? (d) => d.getUTCFullYear() : (d) => d.getFullYear();

  // ISO week number + Mon–Sun label for the breadcrumb
  const wkBase = workerDateStr ? new Date(workerDateStr + 'T12:00:00Z') : new Date();
  const wd = new Date(Date.UTC(wkBase.getFullYear(), wkBase.getMonth(), wkBase.getDate()));
  const dayNr = (wd.getUTCDay() + 6) % 7;            // Mon=0
  wd.setUTCDate(wd.getUTCDate() - dayNr + 3);        // nearest Thursday
  const firstThu = new Date(Date.UTC(wd.getUTCFullYear(), 0, 4));
  const weekNum = 1 + Math.round(((wd - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);

  const monday = new Date(wkBase); monday.setDate(wkBase.getDate() - ((wkBase.getDay() + 6) % 7));
  const sunday = new Date(monday);  sunday.setDate(monday.getDate() + 6);
  const weekRange = monday.getMonth() === sunday.getMonth()
    ? `${monday.getDate()}–${sunday.getDate()}`
    : `${monday.getDate()} ${MONTHS_SHORT[monday.getMonth()]}–${sunday.getDate()} ${MONTHS_SHORT[sunday.getMonth()]}`;

  return {
    date: {
      day:    DAYS[getDay(display)],
      d:      getDate(display),
      m:      MONTHS[getMonth(display)],
      mShort: MONTHS_SHORT[getMonth(display)],
      y:      getYear(display),
      weekNum,
      weekRange,
    },
    // city is overridden in app.jsx based on milestones (Transition → Done)
    city:   'Vientiane',
    mantra: 'Becoming more stable, clearer, and braver as who I already am.',
    time: [
      { label: 'This week',  pct: weekPct,  sub: `${7 - daysSinceMonday}d remaining` },
      { label: 'This month', pct: monthPct, sub: `${monthDaysLeft}d remaining · ${MONTHS[now.getMonth()]}` },
      { label: 'This year',  pct: yearPct,  sub: `${daysInYear - dayOfYear}d remaining · ${now.getFullYear()}` },
    ],
  };
}

function adaptWorkerData(raw) {
  // Tasks — v2 returns rich objects
  const tasks = (raw.tasks || []).map(t => ({
    id:           t.id,
    task:         t.task         || '',
    done:         t.done         ?? false,
    area:         t.area         || null,
    priority:     t.priority     || null,
    date:         t.date         || null,
    notes:        t.notes        || '',
    goalId:       t.goalId       || null,
    weeklyTaskId: t.weeklyTaskId || null,
  }));

  // Habits — v2 returns rich objects
  const habits = (raw.habits || []).map(h => ({
    id:       h.id,
    habit:    h.habit    || '',
    done:     h.done     ?? false,
    category: h.category || null,
    streak:   h.streak   ?? 0,
  }));

  // Today's mood + energy + Worker date (YYYY-MM-DD in Worker timezone)
  const today = {
    date:        raw.today?.date        || null,
    mood:        raw.today?.mood        || null,
    energy:      raw.today?.energy      || null,
    energyScore: raw.today?.energyScore ?? null,
    focusScore:  raw.today?.focusScore  ?? null,
    moodScore:   raw.today?.moodScore   ?? null,
    dailyId:     raw.today?.dailyId     || null,
  };

  // 14-day history arrays (pass through from Worker)
  const taskHistory  = raw.taskHistory  || [];
  const habitHistory = raw.habitHistory || {};
  const moodHistory  = raw.moodHistory  || [];

  // Weekly priorities — already an array in v2
  const priorities = (raw.week?.priorities || []).map((p, i) => ({
    n:    i + 1,
    task: typeof p === 'string' ? p : String(p),
  }));
  const weekId = raw.week?.id || null;

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
    id:                t.id                || '',
    task:              t.task              || '',
    status:            t.status            || 'Not Started',
    priority:          t.priority          || null,
    month:             t.month             || null,
    deadline:          t.deadline          || null,
    quarterlyActionId: t.quarterlyActionId || null,
  }));

  // Quarterly Actions (hierarchy level 1.5, between Goals and Monthly Tasks)
  const quarterlyActions = (raw.quarterlyActions || []).map(a => ({
    id:      a.id      || '',
    name:    a.name    || '',
    quarter: a.quarter || '',
    status:  a.status  || '',
    goalId:  a.goalId  || null,
  }));

  const currentWeek  = raw.currentWeek  || '';
  const currentMonth = raw.currentMonth || '';

  // Heatmaps — pass through directly (computed server-side)
  const weeklyHeatmap  = raw.weeklyHeatmap  || [];
  const monthlyHeatmap = raw.monthlyHeatmap || [];

  // Milestones — compute daysLeft and progress client-side
  const now = Date.now();
  const milestones = (raw.milestones || []).map(m => {
    const targetMs = m.date  ? new Date(m.date  + 'T12:00:00Z').getTime() : null;
    const startMs  = m.start ? new Date(m.start + 'T12:00:00Z').getTime() : null;
    const daysLeft = targetMs != null
      ? Math.max(0, Math.ceil((targetMs - now) / 86400000))
      : null;
    let progress = null;
    if (m.status === 'Active' && startMs != null && targetMs != null && targetMs > startMs) {
      progress = Math.min(100, Math.max(0, Math.round(((now - startMs) / (targetMs - startMs)) * 100)));
    }
    return {
      id:       m.id       || '',
      name:     m.name     || '',
      date:     m.date     || null,
      start:    m.start    || null,
      category: m.category || null,
      status:   m.status   || 'Upcoming',
      daysLeft,
      progress,
    };
  });

  return { tasks, habits, today, taskHistory, habitHistory, moodHistory, priorities, weekId, monthly, goals, quarterlyActions, weeklyTasks, monthlyTasks, weeklyHeatmap, monthlyHeatmap, currentWeek, currentMonth, milestones };
}

// v3: week/month priorities+theme now source from Weekly/Monthly Tasks anchor
// rows instead of the retired Plans DBs — bump forces one clean refetch past
// any stale cached payload (see plans-to-tasks-migration.md).
const CACHE_KEY = 'lp-data-v3';

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
  today:         { date: null, mood: null, energy: null, energyScore: null, focusScore: null, moodScore: null, dailyId: null },
  taskHistory:   [],
  habitHistory:  {},
  moodHistory:   [],
  priorities:    [],
  weekId:        null,
  monthly:       { theme: null, name: null, focusAreas: [] },
  goals:         [],
  quarterlyActions: [],
  weeklyTasks:    [],
  monthlyTasks:   [],
  weeklyHeatmap:  [],
  monthlyHeatmap: [],
  currentWeek:    '',
  currentMonth:   '',
  milestones:     [],
};

export function useNotionData() {
  const [state, setState] = useState(() => {
    const cached = loadCache();
    if (cached) return { loading: false, stale: true, error: null, ...cached };
    return EMPTY_STATE;
  });

  // Drilldown fetch: GET /api?weeklyTask=<id> or ?monthlyTask=<id>
  // Always bypasses CDN cache (?fresh=1) so expanded tasks reflect latest Notion state.
  const fetchExpand = useCallback(async (type, id) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(`${WORKER_URL}?${type}=${id}&fresh=1`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`Expand fetch failed: ${res.status}`);
      return res.json();
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error('Expand timed out — pull to retry');
      throw err;
    }
  }, []);

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

  // fresh=true appends ?fresh=1 to bust Vercel's CDN cache (used by pull-to-refresh)
  const fetchData = useCallback(async (fresh = false) => {
    setState(s => ({
      ...s,
      loading: !s.tasks.length && !s.habits.length,
      stale:   true,
      error:   null,
    }));

    const controller = new AbortController();
    // Give up after 12s — prevents the phone hanging indefinitely when Notion is slow
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      const url = fresh ? `${WORKER_URL}?fresh=1` : WORKER_URL;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`Worker returned ${res.status}`);
      const raw     = await res.json();
      const adapted = adaptWorkerData(raw);
      saveCache(adapted);
      setState({ loading: false, stale: false, error: null, ...adapted });
    } catch (err) {
      clearTimeout(timer);
      const timedOut = err.name === 'AbortError';
      setState(s => ({
        ...s,
        loading: false,
        stale:   false,
        error:   (s.tasks.length || s.habits.length)
          ? null
          : (timedOut ? 'Notion is slow — pull down to retry' : err.message),
      }));
    }
  }, []);

  // Pull-to-refresh bypasses the CDN cache to guarantee fresh data
  const refetch = useCallback(() => fetchData(true), [fetchData]);

  useEffect(() => {
    fetchData();

    const interval = setInterval(() => fetchData(), 300000);

    const onVisibility = () => { if (document.visibilityState === 'visible') fetchData(); };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchData]);

  return { ...state, liveDate: getLiveDate(state.today?.date || null), refetch, writeback, fetchExpand };

}
