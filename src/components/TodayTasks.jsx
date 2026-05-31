import { useState, useCallback } from 'react';
import { SectionHeader, TaskRow, Skeleton } from './Primitives.jsx';
import TaskHeatmap from './TaskHeatmap.jsx';

// taskHistory is [{date, done, total}], oldest → newest, ending today.
// Adapt to the shared heatmap shape (last entry is the current day).
function toHeatmap(taskHistory) {
  return (taskHistory || []).map((d, i, arr) => ({
    ...d,
    isCurrent: i === arr.length - 1,
  }));
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
      <SectionHeader label="Tasks" />
      <div style={{ display: 'flex', gap: 2, marginBottom: 14 }}>
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
      <SectionHeader label="Tasks" />
      {taskHistory?.length > 0 && <TaskHeatmap data={toHeatmap(taskHistory)} type="daily" />}
      <p className="lp-mono" style={{ fontSize: 13, color: 'var(--faint)', marginTop: 12 }}>
        Could not reach Notion — pull down to retry.
      </p>
    </div>
  );

  return (
    <div>
      <SectionHeader label={`Tasks · ${dayLabel}`} stat={`${completed}/${tasks.length}`} />
      <TaskHeatmap data={toHeatmap(taskHistory)} type="daily" />
      {tasks.length === 0 ? (
        <p className="lp-mono" style={{ fontSize: 13, color: 'var(--faint)', marginTop: 12 }}>
          No tasks today — add them in Notion.
        </p>
      ) : (
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
      )}
      <a
        href="https://www.notion.so/c88c5452b1224fc3a8e421c77447e063"
        target="_blank"
        rel="noopener noreferrer"
        className="lp-tap"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          marginTop: 16, textDecoration: 'none', padding: '12px 0', borderRadius: 10,
          border: '1px solid color-mix(in oklch, var(--accent) 45%, transparent)',
          background: 'color-mix(in oklch, var(--accent) 8%, var(--bg-2))',
        }}
      >
        <span className="lp-mono" style={{ fontSize: 14, color: 'var(--accent)' }}>+</span>
        <span className="lp-mono" style={{ fontSize: 12, color: 'var(--accent)', letterSpacing: '0.10em' }}>
          ADD TASK
        </span>
      </a>
    </div>
  );
}
