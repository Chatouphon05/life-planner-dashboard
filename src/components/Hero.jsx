import { ProgressBar } from './Primitives.jsx';

const CATEGORY = {
  'Transition':   { icon: '→', color: 'var(--accent)'  },
  'Deadline':     { icon: '⊙', color: 'var(--muted)'   },
  'Look Forward': { icon: '✦', color: 'var(--accent2)' },
};

export default function Hero({ liveDate, theme, onToggleTheme, syncing, milestones = [], loading }) {
  const { date, mantra, city } = liveDate;

  // Footer shows only Active milestones — sorted soonest first
  const visible = milestones
    .filter(m => m.status === 'Active')
    .sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });

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
        background: 'var(--bg-2)',
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

      {/* eyebrow */}
      <div className="lp-eyebrow" style={{ color: 'var(--muted)', marginBottom: 14 }}>
        <span style={{
          color: 'var(--accent)',
          animation: syncing ? 'lp-pulse 1.4s ease-in-out infinite' : 'none',
        }}>●</span>
        &nbsp;{date.day.toUpperCase()} · {city.toUpperCase()}
      </div>

      {/* date */}
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

      {/* mantra */}
      <p className="lp-display-i" style={{
        marginTop: 16, marginBottom: 0,
        fontSize: 16, lineHeight: 1.4,
        color: 'var(--muted)', maxWidth: 320,
      }}>
        "{mantra}"
      </p>

      {/* ── Active milestone strip (hidden when nothing active) ── */}
      {(visible.length > 0 || loading) && (
        <div style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: '0.5px solid var(--hair)',
          display: 'flex',
          flexDirection: 'column',
          gap: 9,
        }}>
          {visible.length > 0 ? visible.map(m => {
            const cat      = CATEGORY[m.category] || CATEGORY['Transition'];
            const dayLabel = m.daysLeft === 0   ? 'today'
                           : m.daysLeft === 1   ? '1 day'
                           : m.daysLeft != null ? `${m.daysLeft}d`
                           : '—';
            return (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {/* category glyph */}
                <span className="lp-mono" style={{
                  fontSize: 10, color: cat.color,
                  flexShrink: 0, width: 14, lineHeight: 1,
                }}>
                  {cat.icon}
                </span>

                {/* name */}
                <span className="lp-display-i" style={{
                  fontSize: 14, lineHeight: 1,
                  color: 'var(--text)',
                  flexShrink: 0,
                }}>
                  {m.name}
                </span>

                {/* progress bar (replaces dot leader) */}
                <div style={{ flex: 1, minWidth: 20 }}>
                  <ProgressBar
                    pct={m.progress ?? 0}
                    color={cat.color}
                    height={3}
                    trackOpacity={0.18}
                  />
                </div>

                {/* countdown */}
                <span className="lp-mono lp-num" style={{
                  fontSize: 13,
                  color: cat.color,
                  letterSpacing: '0.04em',
                  flexShrink: 0,
                }}>
                  {dayLabel}
                </span>
              </div>
            );
          }) : (
            // shimmer while loading
            <>
              {[100, 130].map((w, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.35 }}>
                  <div className="lp-shimmer" style={{ width: 10, height: 10, borderRadius: 2, flexShrink: 0 }} />
                  <div className="lp-shimmer" style={{ width: `${w}px`, height: 11, borderRadius: 3, flexShrink: 0 }} />
                  <div className="lp-shimmer" style={{ flex: 1, height: 3, borderRadius: 99 }} />
                  <div className="lp-shimmer" style={{ width: 28, height: 11, borderRadius: 3 }} />
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
