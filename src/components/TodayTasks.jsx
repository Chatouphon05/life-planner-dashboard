import { useState } from 'react';
import { Eyebrow, TaskRow } from './Primitives.jsx';

export default function TodayTasks({ tasks, loading, error, dayLabel }) {
  const [done, setDone] = useState({});
  const completed = tasks.filter(t => done[t.id]).length;

  if (loading) return (
    <div>
      <Eyebrow>Today · tasks</Eyebrow>
      <p className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 16, textAlign: 'center' }}>
        Syncing Notion…
      </p>
    </div>
  );

  if (error) return (
    <div>
      <Eyebrow>Today · tasks</Eyebrow>
      <p className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 16 }}>
        Could not reach Notion — pull down to retry.
      </p>
    </div>
  );

  if (!tasks.length) return (
    <div>
      <Eyebrow>Today · tasks</Eyebrow>
      <p className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 16 }}>
        No tasks for today — add them in your Daily Journal.
      </p>
    </div>
  );

  return (
    <div>
      <Eyebrow count={tasks.length}>Today · {dayLabel} log</Eyebrow>
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
        {tasks.map(t => (
          <TaskRow
            key={t.id}
            task={t.task}
            meta={t.meta}
            priority={t.priority}
            done={!!done[t.id]}
            onToggle={() => setDone(d => ({ ...d, [t.id]: !d[t.id] }))}
          />
        ))}
      </div>
    </div>
  );
}
