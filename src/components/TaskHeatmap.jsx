import { useState } from 'react';

// ── Completion level (0–5) ────────────────────────────────────────────────────
function getLevel(done, total) {
  if (total === 0) return 0;
  const r = done / total;
  if (r === 0)   return 1; // tasks exist but nothing done
  if (r < 0.35)  return 2;
  if (r < 0.70)  return 3;
  if (r < 1.00)  return 4;
  return 5;                 // 100% complete
}

// Amber / gold scale that pops against dark navy
const TILE_BG = [
  'var(--bg-3)',             // 0 — no tasks this period
  'rgba(180,140,30,0.13)',   // 1 — tasks exist, 0% done
  'rgba(180,140,30,0.32)',   // 2 — <35% done
  'rgba(180,140,30,0.56)',   // 3 — <70% done
  'rgba(180,140,30,0.80)',   // 4 — <100% done
  'rgba(190,152,36,1.00)',   // 5 — fully done
];

// ── Component ─────────────────────────────────────────────────────────────────
// data:  [{ week|month, done, total, isCurrent }]  — oldest → newest
// type:  'weekly' | 'monthly'
export default function TaskHeatmap({ data, type }) {
  const [sel, setSel] = useState(null);

  if (!data || data.length === 0) return null;

  const selItem = sel !== null ? data[sel] : null;
  const detail  = selItem
    ? type === 'weekly'
      ? `${selItem.week}  ·  ${selItem.done} / ${selItem.total} done`
      : `${selItem.month.slice(0, 3).toUpperCase()}  ·  ${selItem.done} / ${selItem.total} done`
    : null;

  return (
    <div style={{ marginBottom: 14 }}>

      {/* ── Tile row ── */}
      <div style={{ display: 'flex', gap: 3 }}>
        {data.map((item, i) => {
          const level      = getLevel(item.done, item.total);
          const isCurrent  = item.isCurrent;
          const isSelected = sel === i;
          const label      = type === 'weekly'
            ? item.week                                       // "W21"
            : item.month.slice(0, 3).toUpperCase();           // "MAY"

          return (
            <div
              key={i}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}
              onClick={() => setSel(sel === i ? null : i)}
            >
              {/* tile */}
              <div style={{
                width: '100%',
                height: 24,
                borderRadius: 4,
                background: TILE_BG[level],
                outline: isCurrent
                  ? '1.5px solid var(--accent)'
                  : isSelected
                  ? '1px solid var(--muted)'
                  : '1px solid transparent',
                outlineOffset: '0px',
                transition: 'background 0.15s',
              }} />
              {/* label */}
              <span className="lp-mono" style={{
                fontSize: 8,
                color: isCurrent ? 'var(--accent)' : 'var(--faint)',
                letterSpacing: '0.02em',
                lineHeight: 1,
                userSelect: 'none',
              }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Tap-detail line ── */}
      <div style={{ minHeight: 18, marginTop: 4, paddingLeft: 1 }}>
        {detail && (
          <span className="lp-mono" style={{
            fontSize: 10,
            color: 'var(--muted)',
            letterSpacing: '0.04em',
          }}>
            {detail}
          </span>
        )}
      </div>

    </div>
  );
}
