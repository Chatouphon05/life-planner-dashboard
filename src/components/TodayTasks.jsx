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

export default function TodayTasks({ tasks, taskHistory, loading, error, dayLabel, writeback, refetch }) {
  // Local overrides: { [id]: boolean }. Falls back to task.done when not set.
  const [overrides, setOverrides] = useState({});
  const [failed,    setFailed]    = useState({});
  const [adding,   setAdding]   = useState(false);
  const [newTask,  setNewTask]   = useState('');
  const [priority, setPriority]  = useState('');
  const [creating, setCreating]  = useState(false);
  const [created,  setCreated]   = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const handleCreate = async () => {
    if (!newTask.trim() || creating) return;
    setCreating(true);
    try {
      await writeback('create-task', null, { task: newTask.trim(), priority: priority || null, date: todayStr });
      setNewTask('');
      setPriority('');
      setAdding(false);
      setCreated(true);
      refetch?.();
      setTimeout(() => setCreated(false), 3000);
    } catch {
      // leave form open so user can retry
    } finally {
      setCreating(false);
    }
  };

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
      <div style={{ marginTop: 16 }}>
        {created && (
          <p className="lp-mono" style={{ fontSize: 11, color: 'var(--accent2)', marginBottom: 8 }}>
            ✓ Task added — syncing…
          </p>
        )}
        {!adding ? (
          <button
            className="lp-tap"
            onClick={() => setAdding(true)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 0', borderRadius: 10, border: '1px solid color-mix(in oklch, var(--accent) 45%, transparent)',
              background: 'color-mix(in oklch, var(--accent) 8%, var(--bg-2))', cursor: 'pointer',
            }}
          >
            <span className="lp-mono" style={{ fontSize: 14, color: 'var(--accent)' }}>+</span>
            <span className="lp-mono" style={{ fontSize: 12, color: 'var(--accent)', letterSpacing: '0.10em' }}>ADD TASK</span>
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', borderRadius: 10, background: 'var(--bg-2)', border: '0.5px solid var(--hair-strong)' }}>
            <input
              autoFocus
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setAdding(false); }}
              placeholder="Task name…"
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', width: '100%',
              }}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {['High', 'Medium', 'Low'].map(p => (
                <button key={p} className="lp-tap" onClick={() => setPriority(priority === p ? '' : p)}
                  style={{
                    padding: '3px 8px', borderRadius: 6, border: '0.5px solid var(--hair-strong)',
                    background: priority === p ? 'color-mix(in oklch, var(--accent) 20%, var(--bg-2))' : 'transparent',
                    color: priority === p ? 'var(--accent)' : 'var(--faint)',
                    fontSize: 10, fontFamily: 'var(--font-mono)', cursor: 'pointer', letterSpacing: '0.06em',
                  }}
                >{p}</button>
              ))}
              <div style={{ flex: 1 }} />
              <button className="lp-tap" onClick={() => setAdding(false)}
                style={{ background: 'none', border: 'none', color: 'var(--faint)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>
                ×
              </button>
              <button className="lp-tap" onClick={handleCreate} disabled={!newTask.trim() || creating}
                style={{
                  padding: '5px 12px', borderRadius: 7, border: 'none', cursor: newTask.trim() ? 'pointer' : 'default',
                  background: newTask.trim() ? 'var(--accent)' : 'var(--bg-3)',
                  color: newTask.trim() ? 'var(--bg)' : 'var(--faint)',
                  fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
                }}>
                {creating ? '…' : 'ADD'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
