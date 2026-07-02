import { useState } from 'react';

const MONTHS_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

// Format a YYYY-MM-DD string as "MAY 29"
function fmtDay(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${MONTHS_SHORT[Number(m) - 1]} ${Number(d)}`;
}

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

// Amber / gold scale derived from --accent token so light/dark themes adapt
const TILE_BG = [
  'var(--bg-3)',                                            // 0 — no tasks this period
  'color-mix(in oklch, var(--accent) 13%, transparent)',    // 1 — tasks exist, 0% done
  'color-mix(in oklch, var(--accent) 32%, transparent)',    // 2 — <35% done
  'color-mix(in oklch, var(--accent) 56%, transparent)',    // 3 — <70% done
  'color-mix(in oklch, var(--accent) 80%, transparent)',    // 4 — <100% done
  'var(--accent)',                                          // 5 — fully done
];

// ── Component ─────────────────────────────────────────────────────────────────
// data:  [{ week|month|date, done, total, isCurrent }]  — oldest → newest
// type:  'weekly' | 'monthly' | 'daily'
export default function TaskHeatmap({ data, type, onSelect }) {
  const [sel, setSel] = useState(null);

  if (!data || data.length === 0) return null;

  // Per-type label (under each tile) and detail (tap line)
  const labelOf = (item) =>
    type === 'weekly'  ? item.week                            // "W21"
  : type === 'monthly' ? item.month.slice(0, 3).toUpperCase() // "MAY"
  :                      String(Number(item.date.split('-')[2])); // "29"

  const periodOf = (item) =>
    type === 'weekly' ? item.week : type === 'monthly' ? item.month : item.date;

  const selectTile = (i) => {
    const next = sel === i ? null : i;
    setSel(next);
    if (onSelect) onSelect(next !== null ? periodOf(data[next]) : null);
  };

  const headOf = (item) =>
    type === 'weekly'  ? item.week
  : type === 'monthly' ? item.month.slice(0, 3).toUpperCase()
  :                      fmtDay(item.date);                    // "MAY 29"

  const selItem = sel !== null ? data[sel] : null;
  const detail  = selItem
    ? `${headOf(selItem)}  ·  ${selItem.done} / ${selItem.total} done`
    : null;

  return (
    <div style={{ marginBottom: 14 }}>

      {/* ── Tile row ── */}
      <div style={{ display: 'flex', gap: 3 }}>
        {data.map((item, i) => {
          const level      = getLevel(item.done, item.total);
          const isCurrent  = item.isCurrent;
          const isSelected = sel === i;
          const label      = labelOf(item);

          return (
            <div
              key={i}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}
              onClick={() => selectTile(i)}
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
