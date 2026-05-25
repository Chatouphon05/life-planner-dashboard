import { Eyebrow } from './Primitives.jsx';

export default function WeekPriorities({ priorities, loading }) {
  if (loading) return (
    <div>
      <Eyebrow>This week · top 3</Eyebrow>
      <p className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 16, textAlign: 'center' }}>
        Syncing Notion…
      </p>
    </div>
  );

  if (!priorities.length) return (
    <div>
      <Eyebrow>This week · top 3</Eyebrow>
      <p className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 16 }}>
        No priorities set — update your Weekly Plan in Notion.
      </p>
    </div>
  );

  return (
    <div>
      <Eyebrow count={priorities.length}>This week · top 3</Eyebrow>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {priorities.map(p => (
          <div key={p.n} style={{
            display: 'flex', gap: 14, paddingBottom: 12,
            borderBottom: p.n < priorities.length ? '0.5px solid var(--hair)' : 'none',
          }}>
            <span className="lp-display-i lp-num" style={{
              fontSize: 28, color: 'var(--accent)', lineHeight: 1, width: 24, flexShrink: 0,
            }}>{p.n}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.35, fontWeight: 500 }}>
                {p.task}
              </div>
              {p.detail && (
                <div className="lp-mono" style={{ fontSize: 10, color: 'var(--faint)', marginTop: 4, lineHeight: 1.4 }}>
                  {p.detail}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
