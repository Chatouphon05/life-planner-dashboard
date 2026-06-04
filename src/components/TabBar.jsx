const TABS = ['Today', 'Plan', 'Life'];

export default function TabBar({ tab, onChange, badges = {} }) {
  return (
    <div style={{
      display: 'flex',
      padding: '0 22px',
      borderBottom: '0.5px solid var(--hair)',
      flexShrink: 0,
      position: 'sticky', top: 0, zIndex: 8,
      background: 'color-mix(in oklch, var(--bg) 88%, transparent)',
      backdropFilter: 'blur(20px) saturate(160%)',
      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
    }}>
      {TABS.map(t => {
        const active = tab === t;
        return (
          <div key={t} className="lp-tap" onClick={() => onChange(t)} style={{
            flex: 1, textAlign: 'center',
            padding: '14px 0 12px', position: 'relative',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span className="lp-mono" style={{
                fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: active ? 'var(--text)' : 'var(--faint)',
                fontWeight: active ? 500 : 400,
              }}>{t}</span>
              {badges[t] > 0 && (
                <span className="lp-mono" style={{
                  fontSize: 9, lineHeight: 1.4, padding: '1px 5px', borderRadius: 99,
                  background: 'var(--accent)', color: 'var(--bg)',
                }}>{badges[t]}</span>
              )}
            </span>
            {active && (
              <span style={{
                position: 'absolute', bottom: -0.5, left: '25%', right: '25%',
                height: 1, background: 'var(--accent)',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
