import { useState, useRef, useCallback } from 'react';
import { Eyebrow, Skeleton } from './Primitives.jsx';
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

function WeeklyGroup({ wt, onToggleDailyTask }) {
  const s         = wt.status || 'Not Started';
  const daily     = wt.dailyTasks || [];
  const doneCount = daily.filter(d => d.done).length;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span className="lp-display-i" style={{
          fontSize: 14, color: STATUS_COLOR[s] || 'var(--faint)',
          flexShrink: 0, width: 12, textAlign: 'center',
        }}>
          {STATUS_GLYPH[s] || '·'}
        </span>
        <span style={{
          fontSize: 13, flex: 1,
          color: s === 'Done' || s === 'Dropped' ? 'var(--muted)' : 'var(--text)',
          ...(TEXT_STYLE[s] || {}),
        }}>
          {wt.task}
        </span>
        {wt.week && (
          <span className="lp-mono" style={{ fontSize: 10, color: 'var(--faint)', flexShrink: 0 }}>
            {wt.week}
          </span>
        )}
        {daily.length > 0 && (
          <span className="lp-mono" style={{ fontSize: 10, color: 'var(--faint)', flexShrink: 0 }}>
            {doneCount}/{daily.length}
          </span>
        )}
      </div>

      {daily.length > 0 ? (
        <div style={{ paddingLeft: 20, borderLeft: '0.5px solid var(--hair)', marginLeft: 6 }}>
          {daily.map(dt => (
            <div
              key={dt.id}
              className="lp-tap"
              onClick={() => onToggleDailyTask(wt.id, dt)}
              style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '4px 0', cursor: 'pointer' }}
            >
              <span className="lp-display-i" style={{
                fontSize: 13, color: dt.done ? 'var(--accent2)' : 'var(--faint)',
                flexShrink: 0, width: 10, textAlign: 'center',
              }}>
                {dt.done ? '✕' : '○'}
              </span>
              <span style={{
                fontSize: 12, flex: 1,
                color: dt.done ? 'var(--muted)' : 'var(--text)',
                ...(dt.done ? { textDecoration: 'line-through', textDecorationColor: 'var(--muted)', textDecorationThickness: '0.5px' } : {}),
              }}>
                {dt.task}
              </span>
              {dt.date && (
                <span className="lp-mono" style={{ fontSize: 10, color: 'var(--faint)', flexShrink: 0 }}>
                  {dt.date.slice(5).replace('-', '/')}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <span className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)', paddingLeft: 20 }}>
          No daily tasks
        </span>
      )}
    </div>
  );
}

function ExpandBody({ state, monthlyTaskId, onToggleDailyTask }) {
  if (state.loading) return (
    <div style={{ paddingTop: 8, paddingBottom: 4 }}>
      {[90, 70, 85].map((w, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <Skeleton width={12} height={12} radius={99} />
            <Skeleton width={`${w}%`} height={12} />
          </div>
          <div style={{ paddingLeft: 20 }}>
            {[75, 55].map((w2, j) => (
              <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '3px 0' }}>
                <Skeleton width={10} height={10} radius={99} />
                <Skeleton width={`${w2}%`} height={11} />
              </div>
            ))}
          </div>
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
      No weekly tasks linked
    </p>
  );

  return (
    <div style={{ paddingTop: 4, paddingBottom: 4 }}>
      {state.tasks.map(wt => (
        <WeeklyGroup
          key={wt.id}
          wt={wt}
          onToggleDailyTask={(weeklyTaskId, dt) => onToggleDailyTask(monthlyTaskId, weeklyTaskId, dt)}
        />
      ))}
    </div>
  );
}

// ISO "2026-07-31" → "Jul 31"
function fmtDeadline(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number);
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${MONTHS_SHORT[m - 1]} ${d}`;
}

export default function MonthlyTasks({ monthlyTasks, currentMonth, loading, fetchExpand, writeback, refetch, goals, quarterlyActions = [], monthlyHeatmap = [] }) {
  const [expanded,   setExpanded]   = useState(new Set());
  const [expandData, setExpandData] = useState({});
  const fetchCache = useRef({});

  const [overrides, setOverrides] = useState({});
  const [failed,    setFailed]    = useState({});

  // Modal: false = closed; null = create mode; task object = edit mode.
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask,  setEditTask]  = useState(null);

  // When a non-current month tile in the heatmap is tapped, fetch and show that month's tasks instead.
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [monthTasks,    setMonthTasks]    = useState(null);
  const [monthLoading,  setMonthLoading]  = useState(false);
  const [monthError,    setMonthError]    = useState(null);

  const onSelectMonth = useCallback(async (monthStr) => {
    if (!monthStr || monthStr === currentMonth) {
      setSelectedMonth(null);
      setMonthTasks(null);
      setMonthError(null);
      return;
    }
    setSelectedMonth(monthStr);
    setMonthLoading(true);
    setMonthError(null);
    try {
      const result = await fetchExpand('month', monthStr);
      setMonthTasks(Array.isArray(result) ? result : []);
    } catch (err) {
      setMonthError(err.message || 'Could not load tasks for this month.');
      setMonthTasks([]);
    } finally {
      setMonthLoading(false);
    }
  }, [fetchExpand, currentMonth]);

  const viewingOtherMonth = !!selectedMonth;
  const displayTasks      = viewingOtherMonth ? (monthTasks || []) : monthlyTasks;

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
      const tasks = await fetchExpand('monthlyTask', taskId);
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

  // Toggle a daily task inside the monthly→weekly→daily tree
  const toggleDailyTask = useCallback(async (monthlyTaskId, weeklyTaskId, dailyTask) => {
    const next = !dailyTask.done;
    setExpandData(prev => ({
      ...prev,
      [monthlyTaskId]: {
        ...prev[monthlyTaskId],
        tasks: prev[monthlyTaskId].tasks.map(wt =>
          wt.id === weeklyTaskId
            ? { ...wt, dailyTasks: wt.dailyTasks.map(dt => dt.id === dailyTask.id ? { ...dt, done: next } : dt) }
            : wt
        ),
      },
    }));
    try {
      await writeback('daily-task-done', dailyTask.id, next);
    } catch {
      // Revert
      setExpandData(prev => ({
        ...prev,
        [monthlyTaskId]: {
          ...prev[monthlyTaskId],
          tasks: prev[monthlyTaskId].tasks.map(wt =>
            wt.id === weeklyTaskId
              ? { ...wt, dailyTasks: wt.dailyTasks.map(dt => dt.id === dailyTask.id ? { ...dt, done: !next } : dt) }
              : wt
          ),
        },
      }));
    }
  }, [writeback]);

  if (loading) return (
    <div>
      <Eyebrow>{currentMonth || 'Current month'} · monthly tasks</Eyebrow>
      {[100, 80, 65, 90].map((w, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 0', borderBottom: '0.5px dashed var(--hair)' }}>
          <Skeleton width={14} height={14} radius={99} />
          <Skeleton width={`${w}%`} height={12} />
        </div>
      ))}
    </div>
  );

  const effectiveStatus  = (t) => overrides.hasOwnProperty(t.id) ? overrides[t.id] : t.status;
  const quarterlyActionById = Object.fromEntries(quarterlyActions.map(a => [a.id, a]));
  const todayStr   = new Date().toISOString().split('T')[0];
  const total      = displayTasks.length;
  const labelMonth = selectedMonth || currentMonth;
  const label      = labelMonth ? `Monthly · ${labelMonth}` : 'Monthly · tasks';

  return (
    <div>
      <Eyebrow count={total}>{currentMonth || 'Current month'} · monthly tasks</Eyebrow>

      {monthlyHeatmap.length > 0 && (
        <TaskHeatmap data={monthlyHeatmap} type="monthly" onSelect={onSelectMonth} />
      )}

      {monthLoading ? (
        <p className="lp-mono" style={{ fontSize: 13, color: 'var(--faint)', marginTop: 12 }}>
          Loading tasks…
        </p>
      ) : monthError ? (
        <p className="lp-mono" style={{ fontSize: 13, color: 'var(--faint)', marginTop: 12 }}>
          {monthError}
        </p>
      ) : total === 0 ? (
        <p className="lp-mono" style={{ fontSize: 13, color: 'var(--faint)', marginTop: 12 }}>
          {viewingOtherMonth ? 'No monthly tasks in this month.' : 'No monthly tasks — add one below.'}
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

                {(t.deadline || t.quarterlyActionId) && (() => {
                  const qa        = t.quarterlyActionId ? quarterlyActionById[t.quarterlyActionId] : null;
                  const isOverdue = t.deadline && s !== 'Done' && s !== 'Dropped' && t.deadline < todayStr;
                  return (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                      paddingLeft: 24, marginTop: -4, marginBottom: 6,
                    }}>
                      {t.deadline && (
                        <span className="lp-mono" style={{
                          fontSize: 10, letterSpacing: '0.04em',
                          color: isOverdue ? 'var(--priority-high)' : 'var(--faint)',
                        }}>
                          ⊙ {fmtDeadline(t.deadline)}{isOverdue ? ' · overdue' : ''}
                        </span>
                      )}
                      {qa && (
                        <span className="lp-mono" style={{
                          fontSize: 10, color: 'var(--muted)',
                          padding: '2px 7px', borderRadius: 99,
                          border: '0.5px solid var(--hair-strong)',
                        }}>
                          {qa.name}
                        </span>
                      )}
                    </div>
                  );
                })()}

                {isFailed && (
                  <div className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)', paddingLeft: 24, marginTop: -4, marginBottom: 4 }}>
                    sync failed · pull to retry
                  </div>
                )}

                {/* Accordion */}
                <div style={{
                  maxHeight: isOpen ? '1200px' : '0',
                  overflow: 'hidden',
                  transition: 'max-height 0.32s ease',
                  borderBottom: isOpen ? '0.5px dashed var(--hair)' : 'none',
                }}>
                  <div style={{ paddingLeft: 24, paddingBottom: 4 }}>
                    {expState ? (
                      <ExpandBody
                        state={expState}
                        monthlyTaskId={t.id}
                        onToggleDailyTask={toggleDailyTask}
                      />
                    ) : (
                      <div style={{ paddingTop: 8, paddingBottom: 4 }}>
                        {[90, 70].map((w, i) => (
                          <div key={i} style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                              <Skeleton width={12} height={12} radius={99} />
                              <Skeleton width={`${w}%`} height={12} />
                            </div>
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
          href="https://www.notion.so/0eaa802009e147e1ac04425330958f06"
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
            OPEN MONTHLY TASKS
          </span>
        </a>
      </div>

      {modalOpen && (
        <PlanTaskModal
          task={editTask}
          level="monthly"
          onClose={closeModal}
          writeback={writeback}
          refetch={refetch}
          defaultPeriod={selectedMonth || currentMonth}
          goals={goals}
          quarterlyActions={quarterlyActions}
          fetchExpand={fetchExpand}
        />
      )}
    </div>
  );
}
