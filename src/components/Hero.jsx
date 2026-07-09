import { ProgressBar } from './Primitives.jsx';

const CATEGORY = {
  'Transition':   { icon: '→', color: 'var(--accent)'  },
  'Deadline':     { icon: '⊙', color: 'var(--muted)'   },
  'Look Forward': { icon: '✦', color: 'var(--accent2)' },
};

const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function fmtTarget(dateStr) {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-').map(Number);
  return `${MONTHS_FULL[m - 1]} ${d}`;
}

export default function Hero({ liveDate, theme, onToggleTheme, syncing, milestones = [], loading, tab = 'Daily' }) {
  const { date, mantra, city } = liveDate;

  const crumbs = [ String(date.y), date.m, `Week ${date.weekNum}`, date.day.slice(0, 3) ];
  const depth  = tab === 'Monthly' ? 2 : tab === 'Weekly' ? 3 : 4;

  let big, small;
  if (tab === 'Monthly')      { big = date.m;         small = String(date.y); }
  else if (tab === 'Weekly')  { big = date.weekRange; small = `${date.mShort} · WEEK ${date.weekNum}`; }
  else                        { big = date.d;         small = `${date.mShort} · ${date.y}`; }

  // Footer shows only Active milestones — sorted soonest first
  const visible = milestones
    .filter(m => m.status === 'Active')
    .sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });

  // Desktop spread swaps the mantra for a countdown to the soonest upcoming
  // milestone (mirrors the mockup's DesktopApp, which hardcodes a Brisbane
  // countdown) — falls back to the mantra when there are no milestones at all.
  const nearest = milestones
    .filter(m => m.status !== 'Done' && m.daysLeft != null)
    .sort((a, b) => a.daysLeft - b.daysLeft)[0] || null;

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

      {/* breadcrumb eyebrow */}
      <div className="lp-eyebrow" style={{
        color: 'var(--muted)', marginBottom: 14,
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6,
      }}>
        <span style={{ color: 'var(--accent)',
          animation: syncing ? 'lp-pulse 1.4s ease-in-out infinite' : 'none' }}>●</span>
        {crumbs.slice(0, depth).map((c, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <span style={{ color: 'var(--faint)' }}>›</span>}
            <span style={{ color: i === depth - 1 ? 'var(--text)' : 'var(--muted)' }}>{c.toUpperCase()}</span>
          </span>
        ))}
        <span style={{ color: 'var(--faint)' }}>·</span>
        <span>{city.toUpperCase()}</span>
      </div>

      {/* scope-aware date */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span className="lp-display-i lp-num" style={{
          fontSize: tab === 'Daily' ? 56 : 44, lineHeight: 0.98, color: 'var(--text)' }}>{big}</span>
        <span className="lp-mono" style={{
          fontSize: 14, color: 'var(--muted)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>{small}</span>
      </div>

      {/* mantra — mobile/narrow default; hidden on desktop when a countdown is available */}
      <p className={`lp-display-i${nearest ? ' lp-hero-mantra' : ''}`} style={{
        marginTop: 16, marginBottom: 0,
        fontSize: 16, lineHeight: 1.4,
        color: 'var(--muted)', maxWidth: 320,
      }}>
        "{mantra}"
      </p>

      {/* countdown to nearest milestone — desktop spread only (see index.css) */}
      {nearest && (
        <div className="lp-hero-countdown" style={{ marginTop: 18, alignItems: 'baseline', gap: 10 }}>
          <span className="lp-display-i" style={{ fontSize: 38, color: 'var(--accent)' }}>{nearest.daysLeft}</span>
          <div className="lp-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
            days until<br />{nearest.name}{nearest.date ? ` · ${fmtTarget(nearest.date)}` : ''}
          </div>
        </div>
      )}

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
