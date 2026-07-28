import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useNotionData } from './hooks/useNotionData.js';
import { useCalendarData } from './hooks/useCalendarData.js';
import Hero         from './components/Hero.jsx';
import TabBar       from './components/TabBar.jsx';
import ConnectionBanner from './components/ConnectionBanner.jsx';
import NavGrid      from './components/NavGrid.jsx';
import TodayTasks   from './components/TodayTasks.jsx';
import QuickCapture from './components/QuickCapture.jsx';
import WeekPriorities from './components/WeekPriorities.jsx';
import TimeRemaining  from './components/TimeRemaining.jsx';
import MonthlyFocus   from './components/MonthlyFocus.jsx';
import Goals          from './components/Goals.jsx';
import HabitTracker   from './components/HabitTracker.jsx';
import Books          from './components/Books.jsx';
import MoodPicker     from './components/MoodPicker.jsx';
import WeeklyTasks    from './components/WeeklyTasks.jsx';
import MonthlyTasks   from './components/MonthlyTasks.jsx';
import Milestones     from './components/Milestones.jsx';
import SundayReview  from './components/SundayReview.jsx';
import WeekStatsRow  from './components/WeekStatsRow.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

function PullIndicator({ pull, refreshing }) {
  const pct = Math.min(1, pull / 60);
  if (pull < 4 && !refreshing) return null;
  return (
    <div style={{
      position: 'absolute',
      top: pull > 0 ? Math.min(pull - 24, 60) : 4,
      left: 0, right: 0,
      display: 'flex', justifyContent: 'center',
      zIndex: 6,
      transition: refreshing ? 'top .25s' : 'none',
      pointerEvents: 'none',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px', borderRadius: 99,
        background: 'var(--bg-2)', border: '0.5px solid var(--hair-strong)',
        opacity: refreshing ? 1 : pct,
      }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{
          animation: refreshing ? 'lp-spin 0.8s linear infinite' : 'none',
          transform: refreshing ? '' : `rotate(${pct * 360}deg)`,
        }}>
          <path d="M6 1.5a4.5 4.5 0 1 1-4.5 4.5"
            stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        </svg>
        <span className="lp-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
          {refreshing ? 'Syncing Notion…' : pct >= 1 ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>
    </div>
  );
}

function FAB({ onClick }) {
  return (
    <button onClick={onClick} className="lp-tap" style={{
      position: 'absolute', right: 20, bottom: 24, zIndex: 40,
      width: 52, height: 52, borderRadius: 16, border: 0,
      background: 'var(--accent)', color: 'var(--bg)',
      boxShadow: '0 8px 24px color-mix(in oklch, var(--accent) 40%, transparent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 26, lineHeight: 1, cursor: 'pointer', fontWeight: 300,
    }}>+</button>
  );
}

export default function App() {
  // Google OAuth redirects back to `/?tab=Calendar&gcal=connected` (or gcal=error) —
  // land on the right tab immediately, then strip the params so a reload/share
  // doesn't replay them.
  const [tab, setTab]               = useState(() => new URLSearchParams(window.location.search).get('tab') || 'Daily');
  const [pull, setPull]             = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [theme, setTheme]           = useState(() => localStorage.getItem('lp-theme') || 'dark');
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const scrollRef = useRef(null);
  const pullRef   = useRef(0);

  // Sync theme to <html data-theme="..."> before first paint to avoid flash
  // Also update theme-color meta so the browser chrome matches the app bg
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.content = theme === 'dark' ? '#06070c' : theme === 'navy' ? '#030b1a' : '#f5f0e8';
    }
  }, [theme]);

  const THEME_ORDER = ['dark', 'navy', 'light'];
  const toggleTheme = () => {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];
    setTheme(next);
    localStorage.setItem('lp-theme', next);
  };

  const {
    tasks, habits, today, taskHistory, habitHistory,
    priorities, weekId, monthly, goals, quarterlyActions,
    weeklyTasks, monthlyTasks, weeklyHeatmap, monthlyHeatmap,
    currentWeek, currentMonth,
    milestones,
    liveDate, loading, stale, error, refetch, writeback, fetchExpand,
  } = useNotionData();

  const calendarStatus = useCalendarData();

  // Override city based on whether any Transition milestone is Done
  const city = milestones.some(m => m.category === 'Transition' && m.status === 'Done')
    ? 'Brisbane'
    : liveDate.city;

  // Mantra: pull from Notion monthly theme if set, fallback to hardcoded yearly theme
  const mantra = monthly.theme || liveDate.mantra;

  const liveDateFinal = { ...liveDate, city, mantra };
  const todayStr = new Date().toISOString().split('T')[0];

  // Strip the OAuth redirect's ?tab=&gcal= params once consumed above
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('tab') || params.has('gcal')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Pull-to-refresh gesture
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let startY = null;

    const onTouchStart = (e) => {
      if (el.scrollTop <= 0) startY = e.touches[0].clientY;
    };
    const onTouchMove = (e) => {
      if (startY === null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 0 && el.scrollTop <= 0) {
        e.preventDefault();
        const next = Math.min(120, dy);
        pullRef.current = next;
        setPull(next);
      }
    };
    const onTouchEnd = () => {
      if (pullRef.current >= 60) {
        setRefreshing(true);
        setPull(0);
        pullRef.current = 0;
        refetch().finally(() => setRefreshing(false));
      } else {
        setPull(0);
        pullRef.current = 0;
      }
      startY = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: false });
    el.addEventListener('touchend',   onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  }, [refetch]);

  return (
    <div className="lp-root" data-active-tab={tab}>
      <PullIndicator pull={pull} refreshing={refreshing} />

      <Hero liveDate={liveDateFinal} theme={theme} onToggleTheme={toggleTheme} syncing={stale} milestones={milestones} loading={loading} tab={tab} />
      <div className="lp-tabbar">
        <TabBar tab={tab} onChange={setTab} badges={{ Daily: tasks.filter(t => !t.done).length }} />
      </div>

      <div
        ref={scrollRef}
        className="lp-scrollable"
        style={{
          flex: 1, overflowY: 'auto', position: 'relative',
          transform: `translateY(${refreshing ? 40 : pull * 0.35}px)`,
          transition: (refreshing || pull === 0) ? 'transform .25s cubic-bezier(.2,.7,.3,1)' : 'none',
        }}
      >
        <div className="lp-content" data-active-tab={tab} style={{ padding: '20px 22px' }}>

          <div className="lp-pane" data-pane="Daily">
            <ErrorBoundary>
              <MoodPicker today={today} writeback={writeback} loading={loading} dayLabel={liveDate.date.day} />
              <TodayTasks
                tasks={tasks}
                taskHistory={taskHistory}
                loading={loading}
                error={error}
                dayLabel={liveDate.date.day}
                writeback={writeback}
                refetch={refetch}
                goals={goals}
                weeklyTasks={weeklyTasks}
                fetchExpand={fetchExpand}
                onNavigate={setTab}
              />
              <HabitTracker
                habits={habits}
                habitHistory={habitHistory}
                loading={loading}
                writeback={writeback}
              />
              <Books />
            </ErrorBoundary>
            <div style={{ height: 40 }} />
          </div>

          <div className="lp-pane" data-pane="Weekly">
            <ErrorBoundary>
              <WeekStatsRow habits={habits} weeklyHeatmap={weeklyHeatmap} loading={loading} />
              <SundayReview todayDate={today.date} weekId={weekId} writeback={writeback} />
              <WeekPriorities priorities={priorities} loading={loading} />
              <WeeklyTasks weeklyTasks={weeklyTasks} currentWeek={currentWeek} loading={loading} fetchExpand={fetchExpand} writeback={writeback} refetch={refetch} goals={goals} monthlyTasks={monthlyTasks} weeklyHeatmap={weeklyHeatmap} />
              <TimeRemaining time={liveDate.time} />
            </ErrorBoundary>
            <div style={{ height: 40 }} />
          </div>

          <div className="lp-pane" data-pane="Monthly">
            <ErrorBoundary>
              <MonthlyFocus monthly={monthly} loading={loading} monthName={liveDate.date.m} />
              <MonthlyTasks monthlyTasks={monthlyTasks} currentMonth={currentMonth} loading={loading} fetchExpand={fetchExpand} writeback={writeback} refetch={refetch} goals={goals} quarterlyActions={quarterlyActions} monthlyHeatmap={monthlyHeatmap} />
              <Goals goals={goals} loading={loading} />
              <Milestones milestones={milestones} loading={loading} />
              <NavGrid />
            </ErrorBoundary>
            <div style={{ height: 40 }} />
          </div>

          <div className="lp-pane" data-pane="Calendar">
            <ErrorBoundary>
              <ConnectionBanner status={calendarStatus} onRefresh={calendarStatus.refetch} />
            </ErrorBoundary>
            <div style={{ height: 40 }} />
          </div>
        </div>
      </div>

      <FAB onClick={() => setQuickCaptureOpen(true)} />
      {quickCaptureOpen && (
        <QuickCapture
          onClose={() => setQuickCaptureOpen(false)}
          writeback={writeback}
          refetch={refetch}
          defaultDate={todayStr}
          dayLabel={liveDate.date.day}
        />
      )}
    </div>
  );
}
