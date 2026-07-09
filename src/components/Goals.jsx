import { useState } from 'react';
import { Eyebrow, ProgressBar, Skeleton } from './Primitives.jsx';

const AREA_ORDER = ['Career & Learning', 'Health & Fitness', 'Personal Growth', 'Relationships'];
const AREA_GLYPH = {
  'Career & Learning': '§',
  'Health & Fitness':  '✚',
  'Personal Growth':   '✦',
  'Relationships':     '◇',
};

export default function Goals({ goals, loading }) {
  const [openAreas, setOpenAreas] = useState({});

  if (loading) return (
    <div>
      <Eyebrow>Active goals · 2026</Eyebrow>
      <div style={{ marginTop: 8 }}>
        {[null, null].map((_, i) => (
          <div key={i} style={{ borderBottom: '0.5px solid var(--hair)', padding: '14px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Skeleton width={18} height={18} radius={3} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Skeleton width="55%" height={12} />
                  <Skeleton width={36} height={12} />
                </div>
                <Skeleton width="100%" height={2} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (!goals.length) return (
    <div>
      <Eyebrow>Active goals · 2026</Eyebrow>
      <p className="lp-mono" style={{ fontSize: 13, color: 'var(--faint)', marginTop: 16 }}>
        No active goals found.
      </p>
    </div>
  );

  const areas = AREA_ORDER.filter(a => goals.some(g => g.area === a));

  return (
    <div>
      <Eyebrow count={goals.length}>Active goals · 2026</Eyebrow>
      <div style={{ marginTop: 6 }}>
        {areas.map(area => {
          const items = goals.filter(g => g.area === area);
          const avg   = Math.round(items.reduce((s, g) => s + g.pct, 0) / items.length);
          const open  = openAreas[area] === true;

          return (
            <div key={area} style={{ borderBottom: '0.5px solid var(--hair)', padding: '12px 0' }}>
              {/* area header row */}
              <div
                className="lp-tap"
                onClick={() => setOpenAreas(s => ({ ...s, [area]: !open }))}
                style={{ display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <span className="lp-display" style={{ fontSize: 20, color: 'var(--accent)', lineHeight: 1 }}>
                  {AREA_GLYPH[area]}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 15, color: 'var(--text)', fontWeight: 500 }}>{area}</span>
                    <span className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)' }}>
                      {items.length} · avg {avg}%
                    </span>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <ProgressBar pct={avg} color="var(--accent2)" height={1} trackOpacity={0.1} />
                  </div>
                </div>
                <span className="lp-mono" style={{
                  fontSize: 14, color: 'var(--faint)',
                  transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform .18s',
                }}>›</span>
              </div>

              {/* expanded goals */}
              {open && (
                <div className="lp-fade" style={{
                  marginTop: 14, marginLeft: 28,
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                  {items.map(g => (
                    <div key={g.id}>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'baseline', gap: 12,
                      }}>
                        <span style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.35 }}>{g.name}</span>
                        <span className="lp-mono lp-num" style={{
                          fontSize: 12, flexShrink: 0,
                          color: g.pct === 0 ? 'var(--faint)' : 'var(--text)',
                        }}>{g.pct}%</span>
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <ProgressBar pct={g.pct} color="var(--accent)" height={1} trackOpacity={0.08} />
                      </div>
                      {(g.period || g.sub) && (
                        <div className="lp-mono" style={{
                          marginTop: 5, display: 'flex', gap: 8,
                          fontSize: 11, color: 'var(--faint)',
                        }}>
                          {g.period && <span>{g.period}</span>}
                          {g.period && g.sub && <span>·</span>}
                          {g.sub && <span>{g.sub}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
