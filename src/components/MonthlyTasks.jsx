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
  'Not Started': {},
  'In Progress': {},
  'Done':        { textDecoration: 'line-through', textDecorationColor: 'var(--muted)', textDecorationThickness: '0.5px' },
  'Dropped':     { textDecoration: 'line-through', textDecorationColor: 'var(--faint)', textDecorationThickness: '0.5px', opacity: 0.5 },
};

function TaskItem({ task, status, priority }) {
  const s      = status || 'Not Started';
  const glyph  = STATUS_GLYPH[s] || '·';
  const color  = STATUS_COLOR[s] || 'var(--faint)';
  const tStyle = TEXT_STYLE[s]   || {};
  const isHigh = priority === 'High';

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '9px 0',
      borderBottom: '0.5px dashed var(--hair)',
    }}>
      <span className="lp-display-i" style={{
        fontSize: 14, color, lineHeight: 1.6, flexShrink: 0, width: 14, textAlign: 'center',
      }}>
        {glyph}
      </span>
      <span style={{
        fontSize: 13, color: s === 'Not Started' || s === 'In Progress' ? 'var(--text)' : 'var(--muted)',
        lineHeight: 1.4, flex: 1, ...tStyle,
      }}>
        {isHigh && s !== 'Done' && s !== 'Dropped' && (
          <span style={{ color: 'var(--accent)', marginRight: 5, fontSize: 10 }}>★</span>
        )}
        {task}
      </span>
    </div>
  );
}

export default function MonthlyTasks({ monthlyTasks, currentMonth, loading }) {
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

  const done  = monthlyTasks.filter(t => t.status === 'Done').length;
  const total = monthlyTasks.length;
  const label = currentMonth ? `Monthly · ${currentMonth}` : 'Monthly · tasks';

  return (
    <div>
      <Eyebrow count={total}>{label}</Eyebrow>

      {total > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8, marginBottom: 2 }}>
          <span className="lp-display-i" style={{ fontSize: 22, color: 'var(--text)' }}>
            {total - done}
            {' '}<span style={{ color: 'var(--muted)', fontSize: 14 }}>open</span>
          </span>
          <span className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)' }}>
            {done}/{total} done
          </span>
        </div>
      )}

      {total === 0 ? (
        <p className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 12 }}>
          No monthly tasks — add them in Notion.
        </p>
      ) : (
        <div>
          {monthlyTasks.map(t => (
            <TaskItem key={t.id} task={t.task} status={t.status} priority={t.priority} />
          ))}
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
