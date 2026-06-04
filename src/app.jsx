import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useNotionData } from './hooks/useNotionData.js';
import Hero         from './components/Hero.jsx';
import TabBar       from './components/TabBar.jsx';
import NavGrid      from './components/NavGrid.jsx';
import TodayTasks   from './components/TodayTasks.jsx';
import WeekPriorities from './components/WeekPriorities.jsx';
import TimeRemaining  from './components/TimeRemaining.jsx';
import MonthlyFocus   from './components/MonthlyFocus.jsx';
import Goals          from './components/Goals.jsx';
import HabitTracker   from './components/HabitTracker.jsx';
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

export default function App() {
  const [tab, setTab]               = useState('Today');
  const [pull, setPull]             = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [theme, setTheme]           = useState(() => localStorage.getItem('lp-theme') || 'dark');
  const scrollRef = useRef(null);
  const pullRef   = useRef(0);

  // Sync theme to <html data-theme="..."> before first paint to avoid flash
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('lp-theme', next);
  };

  const {
    tasks, habits, today, taskHistory, habitHistory, moodHistory,
    priorities, monthly, goals,
    weeklyTasks, monthlyTasks, weeklyHeatmap, monthlyHeatmap,
    currentWeek, currentMonth,
    milestones,
    liveDate, loading, stale, error, refetch, writeback, fetchExpand,
  } = useNotionData();

  // Override city based on whether any Transition milestone is Done
  const city = milestones.some(m => m.category === 'Transition' && m.status === 'Done')
    ? 'Brisbane'
    : liveDate.city;

  // Mantra: pull from Notion monthly theme if set, fallback to hardcoded yearly theme
  const mantra = monthly.theme || liveDate.mantra;

  const liveDateFinal = { ...liveDate, city, mantra };

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
    <div className="lp-root">
      <PullIndicator pull={pull} refreshing={refreshing} />

      <Hero liveDate={liveDateFinal} theme={theme} onToggleTheme={toggleTheme} syncing={stale} milestones={milestones} loading={loading} />
      <TabBar tab={tab} onChange={setTab} badges={{ Today: tasks.filter(t => !t.done).length }} />

      <div
        ref={scrollRef}
        className="lp-scrollable"
        style={{
          flex: 1, overflowY: 'auto', position: 'relative',
          transform: `translateY(${refreshing ? 40 : pull * 0.35}px)`,
          transition: (refreshing || pull === 0) ? 'transform .25s cubic-bezier(.2,.7,.3,1)' : 'none',
        }}
      >
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 28 }}>

          {tab === 'Today' && (
            <ErrorBoundary key="Today">
              <MoodPicker today={today} writeback={writeback} loading={loading} moodHistory={moodHistory} />
              <TodayTasks
                tasks={tasks}
                taskHistory={taskHistory}
                loading={loading}
                error={error}
                dayLabel={liveDate.date.day}
                writeback={writeback}
              />
              <HabitTracker
                habits={habits}
                habitHistory={habitHistory}
                loading={loading}
                writeback={writeback}
              />
            </ErrorBoundary>
          )}

          {tab === 'Plan' && (
            <ErrorBoundary key="Plan">
              <WeekStatsRow habits={habits} weeklyHeatmap={weeklyHeatmap} loading={loading} />
              <SundayReview todayDate={today.date} />
              <WeekPriorities priorities={priorities} loading={loading} />
              <WeeklyTasks weeklyTasks={weeklyTasks} currentWeek={currentWeek} loading={loading} fetchExpand={fetchExpand} writeback={writeback} weeklyHeatmap={weeklyHeatmap} />
              <MonthlyFocus monthly={monthly} loading={loading} monthName={liveDate.date.m} />
              <MonthlyTasks monthlyTasks={monthlyTasks} currentMonth={currentMonth} loading={loading} fetchExpand={fetchExpand} writeback={writeback} monthlyHeatmap={monthlyHeatmap} />
            </ErrorBoundary>
          )}

          {tab === 'Life' && (
            <ErrorBoundary key="Life">
              <Milestones milestones={milestones} loading={loading} />
              <Goals goals={goals} loading={loading} />
              <TimeRemaining time={liveDate.time} />
              <NavGrid />
            </ErrorBoundary>
          )}

          <div style={{ height: 40 }} />
        </div>
      </div>
    </div>
  );
}
