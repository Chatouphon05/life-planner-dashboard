import { useState, useRef, useCallback } from 'react';

export function Skeleton({ width = '100%', height = 12, radius = 4, style: s = {} }) {
  return (
    <div className="lp-shimmer" style={{ width, height, borderRadius: radius, flexShrink: 0, ...s }} />
  );
}

export function Bullet({ kind = 'task', color, size = 16, style: s = {} }) {
  const glyphs = { task: '·', done: '✕', event: '○', note: '–', priority: '★', irrelevant: '⊘' };
  return (
    <span className="lp-mono" style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size + 8, height: size + 8, fontSize: size,
      color: color || 'currentColor', flexShrink: 0,
      lineHeight: 1, fontWeight: 400, ...s,
    }}>{glyphs[kind] ?? glyphs.task}</span>
  );
}

export function SectionHeader({ label, stat, right }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      paddingBottom: 9, borderBottom: '1.5px solid var(--text)', marginBottom: 14,
    }}>
      <span className="lp-mono" style={{
        fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--text)',
      }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {stat !== undefined && (
          <span className="lp-mono" style={{ fontSize: 13, color: 'var(--muted)' }}>
            {stat}
          </span>
        )}
        {right}
      </div>
    </div>
  );
}

export function Eyebrow({ children, count, color, style: s = {} }) {
  return (
    <div className="lp-eyebrow" style={{
      display: 'flex', alignItems: 'center', gap: 8,
      color: color || 'var(--muted)', ...s,
    }}>
      <span>{children}</span>
      {count !== undefined && (
        <span className="lp-num" style={{ color: 'var(--faint)' }}>{String(count).padStart(2, '0')}</span>
      )}
      <span style={{ flex: 1, height: 0.5, background: 'var(--hair)' }} />
    </div>
  );
}

export function ProgressBar({ pct = 0, color, height = 2, animate = true, trackOpacity = 0.15 }) {
  const safe = Math.max(0, Math.min(100, pct));
  const trackColor = `color-mix(in oklch, ${color || 'var(--text)'} ${trackOpacity * 100}%, transparent)`;
  return (
    <div style={{ width: '100%', height, borderRadius: 99, background: trackColor, overflow: 'hidden' }}>
      <div className={animate ? 'lp-bar-anim' : ''} style={{ height: '100%' }}>
        <div style={{
          width: safe + '%', height: '100%',
          background: color || 'var(--accent)',
          borderRadius: 99,
        }} />
      </div>
    </div>
  );
}

export function MetricRow({ label, value, pct, color, sub }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '6px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ color: 'var(--text)', fontSize: 15 }}>{label}</span>
        <span className="lp-mono" style={{ color: 'var(--muted)', fontSize: 12 }}>{value}</span>
      </div>
      {pct !== undefined && <ProgressBar pct={pct} color={color} />}
      {sub && <span className="lp-mono" style={{ color: 'var(--faint)', fontSize: 11 }}>{sub}</span>}
    </div>
  );
}

// Fraunces display header for week/month/year hierarchy levels (Plan tab).
// NOT used on the Today tab (keeps mono SectionHeader there).
export function HierarchyHeader({ eyebrow, title, stat }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {eyebrow && (
        <div className="lp-eyebrow" style={{ color: 'var(--faint)', marginBottom: 6 }}>
          {eyebrow}
        </div>
      )}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        paddingBottom: 9, borderBottom: '1.5px solid var(--text)',
      }}>
        <span className="lp-display-i" style={{ fontSize: 22, color: 'var(--text)' }}>
          {title}
        </span>
        {stat !== undefined && (
          <span className="lp-mono lp-num" style={{ fontSize: 13, color: 'var(--muted)' }}>
            {stat}
          </span>
        )}
      </div>
    </div>
  );
}

// ── TaskRow sub-components ────────────────────────────────────────────────────

// BuJo bullet: · open, ✕ done, ★ high-priority — the glyph itself is the tap target.
function CheckboxIcon({ done, failed, priority }) {
  if (done) return <Bullet kind="done" color="var(--accent2)" size={14} style={{ animation: 'lp-fade-in 0.22s ease-out both' }} />;
  if (!failed && priority?.includes('High')) return <Bullet kind="priority" color="var(--priority-high)" size={12} />;
  return <Bullet kind="task" color={failed ? 'var(--faint)' : 'var(--muted)'} size={15} />;
}

function AreaTag({ area }) {
  return (
    <span className="lp-mono" style={{
      fontSize: 10, color: 'var(--faint)',
      background: 'var(--bg-3)',
      padding: '1px 5px', borderRadius: 4,
      letterSpacing: '0.05em',
    }}>
      {area}
    </span>
  );
}

function DueChip() {
  return (
    <span className="lp-mono" style={{
      fontSize: 10, color: 'var(--priority-high)',
      background: 'var(--priority-high-fill)',
      padding: '1px 5px', borderRadius: 4,
      letterSpacing: '0.05em',
    }}>
      overdue
    </span>
  );
}

function LineageTag({ weekly, goal, color, onNavigate }) {
  return (
    <span className={onNavigate ? 'lp-mono lp-tap' : 'lp-mono'}
      onClick={onNavigate ? (e) => { e.stopPropagation(); onNavigate(); } : undefined}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 10, color: 'var(--muted)', letterSpacing: '0.03em',
        minWidth: 0, cursor: onNavigate ? 'pointer' : 'default' }}>
      <span style={{ color: 'var(--faint)', flexShrink: 0 }}>↳</span>
      <span style={{ width: 5, height: 5, borderRadius: 1, background: color || 'var(--accent)', flexShrink: 0 }} />
      {weekly && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{weekly}</span>}
      {goal && <span style={{ color: 'var(--faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {goal}</span>}
      {onNavigate && <span style={{ color: 'var(--faint)', flexShrink: 0 }}>→</span>}
    </span>
  );
}

// ── TaskRow ───────────────────────────────────────────────────────────────────
// Props: task, done, onToggle, onEdit, priority (string|null), area (string|null),
//        date (YYYY-MM-DD|null), failed (bool), lineage ({weekly, goal, color, onNavigate}|null)
export function TaskRow({ task, done, onToggle, onEdit, priority, area, date, failed, lineage }) {
  const [expanded, setExpanded] = useState(false);
  const [swipeX,   setSwipeX]   = useState(0);
  const [swiping,  setSwiping]  = useState(false);
  const touchRef = useRef({ startX: 0, startY: 0, locked: null });

  const todayStr = new Date().toISOString().split('T')[0];
  const isOverdue = date && !done && date < todayStr;

  const priorityColor =
    priority?.includes('High')   ? 'var(--priority-high)'
    : priority?.includes('Low')  ? 'var(--priority-low)'
    : priority?.includes('Medium') ? 'var(--accent)'
    : null;

  // ── Swipe-to-complete (disabled under prefers-reduced-motion) ────────────
  const onTouchStart = useCallback((e) => {
    if (failed) return;
    touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, locked: null };
  }, [failed]);

  const onTouchMove = useCallback((e) => {
    if (failed) return;
    const dx = e.touches[0].clientX - touchRef.current.startX;
    const dy = e.touches[0].clientY - touchRef.current.startY;

    if (touchRef.current.locked === null) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      touchRef.current.locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (touchRef.current.locked !== 'x') return;

    if (dx > 0) {
      e.preventDefault();
      setSwiping(true);
      setSwipeX(Math.min(dx, 120));
    }
  }, [failed]);

  const onTouchEnd = useCallback(() => {
    if (swipeX >= 80 && !done) onToggle?.();
    setSwiping(false);
    setSwipeX(0);
    touchRef.current = { startX: 0, startY: 0, locked: null };
  }, [swipeX, done, onToggle]);

  return (
    <div
      className="task-row"
      style={{
        position: 'relative', borderRadius: 8,
        borderBottom: '0.5px solid var(--hair)',
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Swipe underlay — green hint revealed as user drags right */}
      {swiping && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 8,
          background: `color-mix(in oklch, var(--accent2) ${Math.round(swipeX / 120 * 55)}%, transparent)`,
          display: 'flex', alignItems: 'center', paddingLeft: 14,
          pointerEvents: 'none',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="var(--accent2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ opacity: Math.min(1, swipeX / 60) }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {/* Row content — slides right on swipe, snaps back on release */}
      <div style={{
        display: 'flex', alignItems: 'center', minHeight: 44,
        opacity: done ? 0.4 : (failed ? 0.55 : 1),
        transform: swipeX > 0 ? `translateX(${swipeX}px)` : undefined,
        transition: swiping ? 'opacity 1.2s ease' : 'opacity 1.2s ease, transform 0.2s cubic-bezier(.2,.8,.3,1)',
        borderRadius: 8,
        background: swiping ? 'var(--bg-2)' : 'transparent',
      }}>

        {/* Checkbox — full-height tap target */}
        <button
          className="lp-tap"
          onClick={failed ? undefined : onToggle}
          aria-label={done ? 'Mark incomplete' : 'Mark complete'}
          style={{
            background: 'none', border: 'none',
            cursor: failed ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 44, alignSelf: 'stretch', flexShrink: 0,
          }}
        >
          <CheckboxIcon done={done} failed={failed} priority={priority} />
        </button>

        {/* Text + tags */}
        <div
          style={{ flex: 1, minWidth: 0, paddingTop: 10, paddingBottom: 10, paddingRight: 4 }}
          onClick={() => setExpanded(x => !x)}
        >
          <p style={{
            margin: 0, fontSize: 16, lineHeight: 1.4,
            color: failed ? 'var(--faint)' : 'var(--text)',
            textDecoration: done ? 'line-through' : 'none',
            textDecorationColor: 'var(--muted)', textDecorationThickness: '0.5px',
            overflow: expanded ? 'visible' : 'hidden',
            textOverflow: expanded ? 'clip' : 'ellipsis',
            whiteSpace: expanded ? 'normal' : 'nowrap',
          }}>
            {task}
          </p>

          {!failed && (area || isOverdue) && (
            <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
              {area && <AreaTag area={area} />}
              {isOverdue && <DueChip />}
            </div>
          )}

          {!failed && lineage && (lineage.weekly || lineage.goal) && (
            <div style={{ display: 'flex', marginTop: 4, minWidth: 0 }}>
              <LineageTag weekly={lineage.weekly} goal={lineage.goal}
                color={lineage.color} onNavigate={lineage.onNavigate} />
            </div>
          )}

          {failed && (
            <p className="lp-mono" style={{ margin: 0, fontSize: 11, color: 'var(--faint)', marginTop: 3 }}>
              sync failed · pull to retry
            </p>
          )}
        </div>

        {/* Priority dot */}
        {priorityColor && !failed && (
          <div style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: priorityColor,
            marginRight: onEdit ? 4 : 12,
          }} />
        )}

        {/* Edit pencil */}
        {onEdit && !failed && (
          <button
            className="lp-tap"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            aria-label="Edit task"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              alignSelf: 'stretch', display: 'flex', alignItems: 'center',
              paddingLeft: 4, paddingRight: 10, color: 'var(--faint)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
