export default function Hero({ liveDate, theme, onToggleTheme }) {
  const { date, brisbane, mantra, city } = liveDate;

  return (
    <div style={{ padding: '24px 22px 18px', position: 'relative', flexShrink: 0 }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'var(--gradient)',
        zIndex: -1,
      }} />

      {/* theme toggle — top-right */}
      <div className="lp-tap" onClick={onToggleTheme} style={{
        position: 'absolute', top: 20, right: 20,
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', borderRadius: 99,
        border: '0.5px solid var(--hair-strong)',
        background: 'color-mix(in oklch, var(--bg-2) 70%, transparent)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}>
        <span className="lp-mono" style={{ fontSize: 11, color: 'var(--accent)', lineHeight: 1 }}>
          {theme === 'dark' ? '○' : '●'}
        </span>
        <span className="lp-mono" style={{
          fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--muted)',
        }}>
          {theme === 'dark' ? 'light' : 'dark'}
        </span>
      </div>

      <div className="lp-eyebrow" style={{ color: 'var(--muted)', marginBottom: 14 }}>
        <span style={{ color: 'var(--accent)' }}>●</span>
        &nbsp;{date.day.toUpperCase()} · {city.toUpperCase()}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span className="lp-display-i lp-num" style={{ fontSize: 56, lineHeight: 0.98, color: 'var(--text)' }}>
          {date.d}
        </span>
        <span className="lp-mono" style={{
          fontSize: 14, color: 'var(--muted)',
          letterSpacing: '0.10em', textTransform: 'uppercase',
        }}>
          {date.mShort} · {date.y}
        </span>
      </div>

      <p className="lp-display-i" style={{
        marginTop: 16, marginBottom: 0,
        fontSize: 16, lineHeight: 1.4,
        color: 'var(--muted)', maxWidth: 320,
      }}>
        "{mantra}"
      </p>

      <div style={{
        marginTop: 18, display: 'flex', gap: 16,
        paddingTop: 14, borderTop: '0.5px solid var(--hair)',
      }}>
        <span className="lp-mono" style={{ fontSize: 10, color: 'var(--faint)' }}>
          → BRISBANE{' '}
          <span style={{ color: 'var(--accent)' }}>
            {brisbane.daysLeft > 0 ? `${String(brisbane.daysLeft).padStart(2, '0')}d` : 'ARRIVED'}
          </span>
        </span>
        <span className="lp-mono" style={{ fontSize: 10, color: 'var(--faint)' }}>
          → MDS START <span style={{ color: 'var(--text)' }}>JUL 2026</span>
        </span>
      </div>
    </div>
  );
}
