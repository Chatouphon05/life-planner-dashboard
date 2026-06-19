import { useState, useRef, useCallback } from 'react';
import { SectionHeader, Skeleton } from './Primitives.jsx';
import TaskHeatmap from './TaskHeatmap.jsx';
import PlanTaskModal from './PlanTaskModal.jsx';

const STATUS_GLYPH = {
  'Not Started': '○',
  'In Progress':  '·',
  'Done':         '✕',
  'Dropped':      '⊘',
};

const STATUS_COLOR = {
  'Not Started': 'var(--faint)',
  'In Progress': 'var(--accent)',
  'Done':        'var(--accent2)',
  'Dropped':     'var(--faint)',
};

const TEXT_STYLE = {
  'Done':    { textDecoration: 'line-through', textDecorationColor: 'var(--muted)', textDecorationThickness: '0.5px' },
  'Dropped': { textDecoration: 'line-through', textDecorationColor: 'var(--faint)', textDecorationThickness: '0.5px', opacity: 0.5 },
};

function DailyTaskRow({ task, done, date, onToggle }) {
  return (
    <div
      className="lp-tap"
      onClick={onToggle}
      style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '5px 0', cursor: 'pointer' }}
    >
      <span className="lp-display-i" style={{
        fontSize: 14, color: done ? 'var(--accent2)' : 'var(--faint)',
        flexShrink: 0, width: 12, textAlign: 'center',
      }}>
        {done ? '✕' : '○'}
      </span>
      <span style={{
        fontSize: 13, flex: 1,
        color: done ? 'var(--muted)' : 'var(--text)',
        ...(done ? { textDecoration: 'line-through', textDecorationColor: 'var(--muted)', textDecorationThickness: '0.5px' } : {}),
      }}>
        {task}
      </span>
      {date && (
        <span className="lp-mono" style={{ fontSize: 10, color: 'var(--faint)', flexShrink: 0 }}>
          {date.slice(5).replace('-', '/')}
        </span>
      )}
    </div>
  );
}

function ExpandBody({ state, weeklyTaskId, onToggleDailyTask }) {
  if (state.loading) return (
    <div style={{ paddingTop: 8, paddingBottom: 4 }}>
      {[80, 60, 90].map((w, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 0' }}>
          <Skeleton width={12} height={12} radius={99} />
          <Skeleton width={`${w}%`} height={11} />
        </div>
      ))}
    </div>
  );
  if (state.error) return (
    <p className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)', padding: '8px 0' }}>
      Failed to load · pull to retry
    </p>
  );
  if (!state.tasks?.length) return (
    <p className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)', padding: '8px 0' }}>
      No daily tasks linked
    </p>
  );

  const done  = state.tasks.filter(t => t.done).length;
  const total = state.tasks.length;
  return (
    <div style={{ paddingTop: 4, paddingBottom: 4 }}>
      <div style={{ marginBottom: 6 }}>
        <span className="lp-mono" style={{ fontSize: 10, color: 'var(--faint)' }}>
          {done}/{total} done this week
        </span>
      </div>
      {state.tasks.map(t => (
        <DailyTaskRow
          key={t.id}
          task={t.task}
          done={t.done}
          date={t.date}
          onToggle={() => onToggleDailyTask(weeklyTaskId, t)}
        />
      ))}
    </div>
  );
}

export default function WeeklyTasks({ weeklyTasks, currentWeek, loading, fetchExpand, writeback, refetch, goals, monthlyTasks, weeklyHeatmap = [] }) {
  const [expanded,   setExpanded]   = useState(new Set());
  const [expandData, setExpandData] = useState({});
  const fetchCache = useRef({});

  const [overrides, setOverrides] = useState({});
  const [failed,    setFailed]    = useState({});

  // Modal: false = closed; null = create mode; task object = edit mode.
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask,  setEditTask]  = useState(null);

  // When a non-current week tile in the heatmap is tapped, fetch and show that week's tasks instead.
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [weekTasks,    setWeekTasks]    = useState(null);
  const [weekLoading,  setWeekLoading]  = useState(false);
  const [weekError,    setWeekError]    = useState(null);

  const onSelectWeek = useCallback(async (weekStr) => {
    if (!weekStr || weekStr === currentWeek) {
      setSelectedWeek(null);
      setWeekTasks(null);
      setWeekError(null);
      return;
    }
    setSelectedWeek(weekStr);
    setWeekLoading(true);
    setWeekError(null);
    try {
      const result = await fetchExpand('week', weekStr);
      setWeekTasks(Array.isArray(result) ? result : []);
    } catch (err) {
      setWeekError(err.message || 'Could not load tasks for this week.');
      setWeekTasks([]);
    } finally {
      setWeekLoading(false);
    }
  }, [fetchExpand, currentWeek]);

  const viewingOtherWeek = !!selectedWeek;
  const displayTasks     = viewingOtherWeek ? (weekTasks || []) : weeklyTasks;

  const openCreate = () => { setEditTask(null); setModalOpen(true); };
  const openEdit   = (t) => { setEditTask(t);  setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  const toggleExpand = useCallback(async (taskId) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });

    if (fetchCache.current[taskId]) return;
    fetchCache.current[taskId] = true;
    setExpandData(prev => ({ ...prev, [taskId]: { loading: true, tasks: null, error: null } }));
    try {
      const tasks = await fetchExpand('weeklyTask', taskId);
      setExpandData(prev => ({ ...prev, [taskId]: { loading: false, tasks, error: null } }));
    } catch (err) {
      setExpandData(prev => ({ ...prev, [taskId]: { loading: false, tasks: [], error: err.message } }));
      delete fetchCache.current[taskId];
    }
  }, [fetchExpand]);

  const toggleDone = useCallback(async (task) => {
    if (failed[task.id]) return;
    const current = overrides.hasOwnProperty(task.id) ? overrides[task.id] : task.status;
    const next    = current === 'Done' ? 'In Progress' : 'Done';
    setOverrides(o => ({ ...o, [task.id]: next }));
    try {
      await writeback('task-status', task.id, next);
    } catch {
      setOverrides(o => { const n = { ...o }; delete n[task.id]; return n; });
      setFailed(f => ({ ...f, [task.id]: true }));
      setTimeout(() => setFailed(f => { const n = { ...f }; delete n[task.id]; return n; }), 2500);
    }
  }, [overrides, failed, writeback]);

  const toggleDailyTask = useCallback(async (weeklyTaskId, dailyTask) => {
    const next = !dailyTask.done;
    // Optimistic update inside expandData
    setExpandData(prev => ({
      ...prev,
      [weeklyTaskId]: {
        ...prev[weeklyTaskId],
        tasks: prev[weeklyTaskId].tasks.map(t =>
          t.id === dailyTask.id ? { ...t, done: next } : t
        ),
      },
    }));
    try {
      await writeback('daily-task-done', dailyTask.id, next);
    } catch {
      // Revert
      setExpandData(prev => ({
        ...prev,
        [weeklyTaskId]: {
          ...prev[weeklyTaskId],
          tasks: prev[weeklyTaskId].tasks.map(t =>
            t.id === dailyTask.id ? { ...t, done: !next } : t
          ),
        },
      }));
    }
  }, [writeback]);

  if (loading) return (
    <div>
      <SectionHeader label="Weekly Tasks" />
      {[100, 75, 90, 60].map((w, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 0', borderBottom: '0.5px dashed var(--hair)' }}>
          <Skeleton width={14} height={14} radius={99} />
          <Skeleton width={`${w}%`} height={12} />
        </div>
      ))}
    </div>
  );

  const effectiveStatus = (t) => overrides.hasOwnProperty(t.id) ? overrides[t.id] : t.status;
  const doneCount = displayTasks.filter(t => effectiveStatus(t) === 'Done').length;
  const total     = displayTasks.length;
  const labelWeek = selectedWeek || currentWeek;
  const label     = labelWeek ? `Weekly · ${labelWeek}` : 'Weekly · tasks';

  return (
    <div>
      <SectionHeader label={label} stat={total > 0 ? `${doneCount}/${total}` : undefined} />

      {weeklyHeatmap.length > 0 && (
        <TaskHeatmap data={weeklyHeatmap} type="weekly" onSelect={onSelectWeek} />
      )}

      {weekLoading ? (
        <p className="lp-mono" style={{ fontSize: 13, color: 'var(--faint)', marginTop: 12 }}>
          Loading tasks…
        </p>
      ) : weekError ? (
        <p className="lp-mono" style={{ fontSize: 13, color: 'var(--faint)', marginTop: 12 }}>
          {weekError}
        </p>
      ) : total === 0 ? (
        <p className="lp-mono" style={{ fontSize: 13, color: 'var(--faint)', marginTop: 12 }}>
          {viewingOtherWeek ? 'No weekly tasks in this week.' : 'No weekly tasks — add one below.'}
        </p>
      ) : (
        <div>
          {displayTasks.map(t => {
            const s        = effectiveStatus(t) || 'Not Started';
            const isFailed = !!failed[t.id];
            const isOpen   = expanded.has(t.id);
            const expState = expandData[t.id];
            const isHigh   = t.priority === 'High';

            return (
              <div key={t.id}>
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 0,
                  borderBottom: isOpen ? 'none' : '0.5px dashed var(--hair)',
                }}>
                  {/* Glyph — taps toggle done */}
                  <div
                    className="lp-tap"
                    onClick={() => toggleDone(t)}
                    style={{
                      padding: '9px 10px 9px 0',
                      flexShrink: 0, width: 24,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: isFailed ? 0.4 : 1,
                    }}
                  >
                    <span className="lp-display-i" style={{
                      fontSize: 16, color: isFailed ? 'var(--faint)' : (STATUS_COLOR[s] || 'var(--faint)'),
                      lineHeight: 1,
                    }}>
                      {STATUS_GLYPH[s] || '·'}
                    </span>
                  </div>

                  {/* Task name + chevron — taps expand */}
                  <div
                    className="lp-tap"
                    onClick={() => toggleExpand(t.id)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'flex-start',
                      padding: '9px 0', gap: 8, cursor: 'pointer',
                    }}
                  >
                    <span style={{
                      fontSize: 15, flex: 1,
                      color: isFailed ? 'var(--faint)' : (s === 'Done' || s === 'Dropped' ? 'var(--muted)' : 'var(--text)'),
                      lineHeight: 1.4,
                      ...(TEXT_STYLE[s] || {}),
                    }}>
                      {isHigh && s !== 'Done' && s !== 'Dropped' && (
                        <span style={{ color: 'var(--accent)', marginRight: 5, fontSize: 12 }}>★</span>
                      )}
                      {t.task}
                    </span>
                    <span style={{
                      fontSize: 13, color: 'var(--faint)', flexShrink: 0,
                      transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      display: 'inline-block', lineHeight: 1.6,
                    }}>›</span>
                  </div>

                  {/* Edit pencil */}
                  <button
                    className="lp-tap"
                    onClick={(e) => { e.stopPropagation(); openEdit(t); }}
                    aria-label="Edit task"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '9px 0 9px 6px', color: 'var(--faint)', alignSelf: 'center', flexShrink: 0,
                      display: 'inline-flex',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                </div>

                {isFailed && (
                  <div className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)', paddingLeft: 24, marginTop: -4, marginBottom: 4 }}>
                    sync failed · pull to retry
                  </div>
                )}

                {/* Accordion */}
                <div style={{
                  maxHeight: isOpen ? '600px' : '0',
                  overflow: 'hidden',
                  transition: 'max-height 0.28s ease',
                  borderBottom: isOpen ? '0.5px dashed var(--hair)' : 'none',
                }}>
                  <div style={{ paddingLeft: 24 }}>
                    {expState ? (
                      <ExpandBody
                        state={expState}
                        weeklyTaskId={t.id}
                        onToggleDailyTask={toggleDailyTask}
                      />
                    ) : (
                      <div style={{ paddingTop: 8, paddingBottom: 4 }}>
                        {[80, 60, 90].map((w, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 0' }}>
                            <Skeleton width={12} height={12} radius={99} />
                            <Skeleton width={`${w}%`} height={11} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          className="lp-tap"
          onClick={openCreate}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 0', borderRadius: 10, border: '1px solid color-mix(in oklch, var(--accent) 45%, transparent)',
            background: 'color-mix(in oklch, var(--accent) 8%, var(--bg-2))', cursor: 'pointer',
          }}
        >
          <span className="lp-mono" style={{ fontSize: 14, color: 'var(--accent)' }}>+</span>
          <span className="lp-mono" style={{ fontSize: 12, color: 'var(--accent)', letterSpacing: '0.10em' }}>ADD TASK</span>
        </button>

        <a
          href="https://www.notion.so/5e77a48652b247ca99a86710e12094bb"
          target="_blank"
          rel="noopener noreferrer"
          className="lp-tap"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            textDecoration: 'none', padding: '12px 0', borderRadius: 10,
            border: '0.5px solid var(--hair-strong)',
          }}
        >
          <span className="lp-mono" style={{ fontSize: 14, color: 'var(--faint)' }}>↗</span>
          <span className="lp-mono" style={{ fontSize: 12, color: 'var(--faint)', letterSpacing: '0.10em' }}>
            OPEN WEEKLY TASKS
          </span>
        </a>
      </div>

      {modalOpen && (
        <PlanTaskModal
          task={editTask}
          level="weekly"
          onClose={closeModal}
          writeback={writeback}
          refetch={refetch}
          defaultPeriod={selectedWeek || currentWeek}
          goals={goals}
          monthlyTasks={monthlyTasks}
          fetchExpand={fetchExpand}
        />
      )}
    </div>
  );
}
