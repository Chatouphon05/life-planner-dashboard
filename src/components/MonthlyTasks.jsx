import { useState, useRef, useCallback } from 'react';
import { Eyebrow, Skeleton } from './Primitives.jsx';

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
          fontSize: 12, color: STATUS_COLOR[s] || 'var(--faint)',
          flexShrink: 0, width: 12, textAlign: 'center',
        }}>
          {STATUS_GLYPH[s] || '·'}
        </span>
        <span style={{
          fontSize: 12, flex: 1,
          color: s === 'Done' || s === 'Dropped' ? 'var(--muted)' : 'var(--text)',
          ...(TEXT_STYLE[s] || {}),
        }}>
          {wt.task}
        </span>
        {wt.week && (
          <span className="lp-mono" style={{ fontSize: 9, color: 'var(--faint)', flexShrink: 0 }}>
            {wt.week}
          </span>
        )}
        {daily.length > 0 && (
          <span className="lp-mono" style={{ fontSize: 9, color: 'var(--faint)', flexShrink: 0 }}>
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
                fontSize: 11, color: dt.done ? 'var(--accent2)' : 'var(--faint)',
                flexShrink: 0, width: 10, textAlign: 'center',
              }}>
                {dt.done ? '✕' : '○'}
              </span>
              <span style={{
                fontSize: 11, flex: 1,
                color: dt.done ? 'var(--muted)' : 'var(--text)',
                ...(dt.done ? { textDecoration: 'line-through', textDecorationColor: 'var(--muted)', textDecorationThickness: '0.5px' } : {}),
              }}>
                {dt.task}
              </span>
              {dt.date && (
                <span className="lp-mono" style={{ fontSize: 9, color: 'var(--faint)', flexShrink: 0 }}>
                  {dt.date.slice(5).replace('-', '/')}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <span className="lp-mono" style={{ fontSize: 10, color: 'var(--faint)', paddingLeft: 20 }}>
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
    <p className="lp-mono" style={{ fontSize: 10, color: 'var(--faint)', padding: '8px 0' }}>
      Failed to load · pull to retry
    </p>
  );
  if (!state.tasks?.length) return (
    <p className="lp-mono" style={{ fontSize: 10, color: 'var(--faint)', padding: '8px 0' }}>
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

export default function MonthlyTasks({ monthlyTasks, currentMonth, loading, fetchExpand, writeback }) {
  const [expanded,   setExpanded]   = useState(new Set());
  const [expandData, setExpandData] = useState({});
  const fetchCache = useRef({});

  const [overrides, setOverrides] = useState({});
  const [failed,    setFailed]    = useState({});

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
      <Eyebrow>Monthly · tasks</Eyebrow>
      {[100, 80, 65, 90].map((w, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 0', borderBottom: '0.5px dashed var(--hair)' }}>
          <Skeleton width={14} height={14} radius={99} />
          <Skeleton width={`${w}%`} height={12} />
        </div>
      ))}
    </div>
  );

  const effectiveStatus = (t) => overrides.hasOwnProperty(t.id) ? overrides[t.id] : t.status;
  const doneCount = monthlyTasks.filter(t => effectiveStatus(t) === 'Done').length;
  const total     = monthlyTasks.length;
  const label     = currentMonth ? `Monthly · ${currentMonth}` : 'Monthly · tasks';

  return (
    <div>
      <Eyebrow count={total}>{label}</Eyebrow>

      {total > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8, marginBottom: 2 }}>
          <span className="lp-display-i" style={{ fontSize: 22, color: 'var(--text)' }}>
            {total - doneCount}
            {' '}<span style={{ color: 'var(--muted)', fontSize: 14 }}>open</span>
          </span>
          <span className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)' }}>
            {doneCount}/{total} done
          </span>
        </div>
      )}

      {total === 0 ? (
        <p className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 12 }}>
          No monthly tasks — add them in Notion.
        </p>
      ) : (
        <div>
          {monthlyTasks.map(t => {
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
                      fontSize: 14, color: isFailed ? 'var(--faint)' : (STATUS_COLOR[s] || 'var(--faint)'),
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
                      fontSize: 13, flex: 1,
                      color: isFailed ? 'var(--faint)' : (s === 'Done' || s === 'Dropped' ? 'var(--muted)' : 'var(--text)'),
                      lineHeight: 1.4,
                      ...(TEXT_STYLE[s] || {}),
                    }}>
                      {isHigh && s !== 'Done' && s !== 'Dropped' && (
                        <span style={{ color: 'var(--accent)', marginRight: 5, fontSize: 10 }}>★</span>
                      )}
                      {t.task}
                    </span>
                    <span style={{
                      fontSize: 11, color: 'var(--faint)', flexShrink: 0,
                      transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      display: 'inline-block', lineHeight: 1.6,
                    }}>›</span>
                  </div>
                </div>

                {isFailed && (
                  <div className="lp-mono" style={{ fontSize: 10, color: 'var(--faint)', paddingLeft: 24, marginTop: -4, marginBottom: 4 }}>
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

      <a
        href="https://www.notion.so/0eaa802009e147e1ac04425330958f06"
        target="_blank"
        rel="noopener noreferrer"
        className="lp-tap"
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, textDecoration: 'none' }}
      >
        <span className="lp-mono" style={{ fontSize: 10, color: 'var(--accent)' }}>+</span>
        <span className="lp-mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em' }}>
          OPEN MONTHLY TASKS
        </span>
      </a>
    </div>
  );
}
