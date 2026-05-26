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

export function SectionHeader({ label, stat }) {
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
      {stat !== undefined && (
        <span className="lp-mono" style={{ fontSize: 13, color: 'var(--muted)' }}>
          {stat}
        </span>
      )}
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
        <span style={{ color: 'var(--faint)' }}>{String(count).padStart(2, '0')}</span>
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

export function TaskRow({ task, done, onToggle, priority, meta, failed }) {
  const bulletKind  = failed ? 'irrelevant' : (done ? 'done' : (priority ? 'priority' : 'task'));
  const bulletColor = failed ? 'var(--faint)'
    : done     ? 'var(--accent2)'
    : priority ? 'var(--accent)'
    :            'var(--muted)';
  const bulletSize  = priority && !done && !failed ? 13 : 15;

  return (
    <div
      className={failed ? '' : 'lp-tap'}
      onClick={failed ? undefined : onToggle}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 4,
        padding: '8px 0', borderBottom: '0.5px dashed var(--hair)',
        opacity: done ? 0.4 : (failed ? 0.55 : 1),
        transition: 'opacity .18s',
      }}
    >
      <Bullet kind={bulletKind} color={bulletColor} size={bulletSize} />
      <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
        <div style={{
          fontSize: 16, lineHeight: 1.4,
          color: failed ? 'var(--faint)' : 'var(--text)',
          textDecoration: done ? 'line-through' : 'none',
          textDecorationColor: 'var(--muted)', textDecorationThickness: '0.5px',
        }}>{task}</div>
        {meta && !failed && (
          <div className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 3 }}>
            {meta}
          </div>
        )}
        {failed && (
          <div className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 3 }}>
            sync failed · pull to retry
          </div>
        )}
      </div>
    </div>
  );
}
