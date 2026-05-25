import { useState, useCallback } from 'react';
import { Eyebrow, TaskRow, Skeleton } from './Primitives.jsx';

const HEAT = [
  'var(--hair)',
  'color-mix(in oklch, var(--accent2) 28%, transparent)',
  'color-mix(in oklch, var(--accent2) 55%, transparent)',
  'color-mix(in oklch, var(--accent2) 80%, transparent)',
  'var(--accent2)',
];

function heatColor(done, total) {
  if (!total) return HEAT[0];
  const r = done / total;
  if (r === 0)  return HEAT[0];
  if (r < 0.34) return HEAT[1];
  if (r < 0.67) return HEAT[2];
  if (r < 1)    return HEAT[3];
  return HEAT[4];
}

function TaskHeatmap({ taskHistory }) {
  if (!taskHistory?.length) return null;
  return (
    <div style={{ display: 'flex', gap: 2, marginBottom: 14, marginTop: 6 }}>
      {taskHistory.map(({ date, done, total }) => (
        <div
          key={date}
          title={`${date}: ${done}/${total}`}
          style={{ flex: 1, height: 18, borderRadius: 3, background: heatColor(done, total) }}
        />
      ))}
    </div>
  );
}

export default function TodayTasks({ tasks, taskHistory, loading, error, dayLabel, writeback }) {
  // Local overrides: { [id]: boolean }. Falls back to task.done when not set.
  const [overrides, setOverrides] = useState({});
  const [failed,    setFailed]    = useState({});

  const toggle = useCallback(async (task) => {
    if (failed[task.id]) return;
    const current = overrides.hasOwnProperty(task.id) ? overrides[task.id] : task.done;
    const next    = !current;
    setOverrides(o => ({ ...o, [task.id]: next }));
    try {
      await writeback('task-done', task.id, next);
    } catch {
      setOverrides(o => { const n = { ...o }; delete n[task.id]; return n; });
      setFailed(f => ({ ...f, [task.id]: true }));
      setTimeout(() => setFailed(f => { const n = { ...f }; delete n[task.id]; return n; }), 2500);
    }
  }, [overrides, failed, writeback]);

  const effectiveDone = (t) =>
    overrides.hasOwnProperty(t.id) ? overrides[t.id] : t.done;

  const completed = tasks.filter(t => effectiveDone(t)).length;

  if (loading) return (
    <div>
      <Eyebrow>Today · tasks</Eyebrow>
      <div style={{ display: 'flex', gap: 2, marginBottom: 14, marginTop: 10 }}>
        {Array(14).fill(0).map((_, i) => <Skeleton key={i} height={18} style={{ flex: 1 }} />)}
      </div>
      {[120, 80, 100].map((w, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 0', borderBottom: '0.5px dashed var(--hair)' }}>
          <Skeleton width={22} height={22} radius={99} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 2 }}>
            <Skeleton width={`${w}%`} height={13} />
            <Skeleton width="40%" height={9} />
          </div>
        </div>
      ))}
    </div>
  );

  if (error) return (
    <div>
      <Eyebrow>Today · tasks</Eyebrow>
      {taskHistory?.length > 0 && <TaskHeatmap taskHistory={taskHistory} />}
      <p className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 12 }}>
        Could not reach Notion — pull down to retry.
      </p>
    </div>
  );

  return (
    <div>
      <Eyebrow count={tasks.length}>Today · {dayLabel} log</Eyebrow>
      <TaskHeatmap taskHistory={taskHistory} />
      {tasks.length === 0 ? (
        <p className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 12 }}>
          No tasks today — add them in Notion.
        </p>
      ) : (
        <>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            marginTop: 8, marginBottom: 4,
          }}>
            <span className="lp-display-i" style={{ fontSize: 22, color: 'var(--text)' }}>
              {tasks.length - completed}
              {' '}<span style={{ color: 'var(--muted)', fontSize: 14 }}>open</span>
            </span>
            <span className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)' }}>
              {completed}/{tasks.length} done
            </span>
          </div>
          <div>
            {tasks.map(t => {
              const done = effectiveDone(t);
              return (
                <TaskRow
                  key={t.id}
                  task={t.task}
                  meta={[t.area, t.priority].filter(Boolean).join(' · ') || undefined}
                  priority={t.priority?.includes('High')}
                  done={done}
                  failed={!!failed[t.id]}
                  onToggle={() => toggle(t)}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
