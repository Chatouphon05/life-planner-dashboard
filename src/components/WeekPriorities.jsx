import { HierarchyHeader, Skeleton } from './Primitives.jsx';

export default function WeekPriorities({ priorities, loading }) {
  if (loading) return (
    <div>
      <HierarchyHeader eyebrow="This week" title="Priorities" />
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[85, 65, 75].map((w, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', paddingBottom: 14, borderBottom: '0.5px solid var(--hair)' }}>
            <Skeleton width={24} height={28} radius={3} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton width={`${w}%`} height={13} />
              <Skeleton width="45%" height={9} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (!priorities.length) return (
    <div>
      <HierarchyHeader eyebrow="This week" title="Priorities" />
      <p className="lp-mono" style={{ fontSize: 13, color: 'var(--faint)', marginTop: 16 }}>
        No priorities set — update your Weekly Plan in Notion.
      </p>
    </div>
  );

  return (
    <div>
      <HierarchyHeader eyebrow="This week" title="Priorities" />
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {priorities.map(p => (
          <div key={p.n} style={{
            display: 'flex', gap: 14, paddingBottom: 12,
            borderBottom: p.n < priorities.length ? '0.5px solid var(--hair)' : 'none',
          }}>
            <span className="lp-display-i lp-num" style={{
              fontSize: 20, color: 'var(--accent)', lineHeight: 1.2, width: 20, flexShrink: 0,
            }}>{p.n}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, color: 'var(--text)', lineHeight: 1.35, fontWeight: 500 }}>
                {p.task}
              </div>
              {p.detail && (
                <div className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 4, lineHeight: 1.4 }}>
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
