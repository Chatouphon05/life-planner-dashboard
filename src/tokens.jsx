// tokens.jsx — design tokens, base CSS, primitive atoms.
// Loaded once, exposes constants & components on window.

const TOKENS = {
  // Themes - each is a complete palette. Tweaks toggles between them.
  themes: {
    night: {
      bg: 'oklch(0.13 0.012 270)',
      bg2: 'oklch(0.17 0.014 270)',
      bg3: 'oklch(0.21 0.014 270)',
      hairline: 'rgba(255,255,255,0.07)',
      hairlineStrong: 'rgba(255,255,255,0.12)',
      text: 'oklch(0.94 0.008 80)',
      muted: 'oklch(0.62 0.015 270)',
      faint: 'oklch(0.42 0.015 270)',
      accent: 'oklch(0.80 0.11 70)',   // amber - today, now
      accent2: 'oklch(0.72 0.07 150)', // sage  - done, progress
      gradient: 'radial-gradient(120% 80% at 10% 0%, oklch(0.22 0.06 290) 0%, oklch(0.13 0.012 270) 60%)',
      heroOverlay: 'linear-gradient(180deg, oklch(0.18 0.04 285 / 0.0) 0%, oklch(0.13 0.012 270) 92%)',
    },
    dawn: {
      bg: 'oklch(0.18 0.018 35)',
      bg2: 'oklch(0.22 0.020 35)',
      bg3: 'oklch(0.26 0.020 35)',
      hairline: 'rgba(255,235,210,0.08)',
      hairlineStrong: 'rgba(255,235,210,0.14)',
      text: 'oklch(0.95 0.012 80)',
      muted: 'oklch(0.65 0.020 40)',
      faint: 'oklch(0.45 0.020 40)',
      accent: 'oklch(0.82 0.11 50)',
      accent2: 'oklch(0.74 0.08 170)',
      gradient: 'radial-gradient(120% 80% at 10% 0%, oklch(0.32 0.08 40) 0%, oklch(0.18 0.018 35) 65%)',
      heroOverlay: 'linear-gradient(180deg, oklch(0.22 0.05 35 / 0.0) 0%, oklch(0.18 0.018 35) 92%)',
    },
    parchment: {
      bg: 'oklch(0.96 0.012 80)',
      bg2: 'oklch(0.99 0.008 80)',
      bg3: 'oklch(0.93 0.012 80)',
      hairline: 'rgba(40,30,20,0.10)',
      hairlineStrong: 'rgba(40,30,20,0.18)',
      text: 'oklch(0.22 0.012 80)',
      muted: 'oklch(0.45 0.015 80)',
      faint: 'oklch(0.60 0.015 80)',
      accent: 'oklch(0.55 0.13 50)',
      accent2: 'oklch(0.50 0.09 160)',
      gradient: 'radial-gradient(120% 80% at 10% 0%, oklch(0.92 0.020 80) 0%, oklch(0.96 0.012 80) 65%)',
      heroOverlay: 'linear-gradient(180deg, oklch(0.92 0.020 80 / 0.0) 0%, oklch(0.96 0.012 80) 92%)',
    },
  },
  font: {
    display: '"Newsreader", "Cormorant Garamond", Georgia, serif',
    body: '"Geist", "Public Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
  },
};

// inject base stylesheet once
if (typeof document !== 'undefined' && !document.getElementById('lp-base-css')) {
  const link = document.createElement('link');
  link.id = 'lp-base-fonts';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,300;1,6..72,400;1,6..72,500;1,6..72,600&display=swap';
  document.head.appendChild(link);

  const s = document.createElement('style');
  s.id = 'lp-base-css';
  s.textContent = `
    .lp-root{font-family:${TOKENS.font.body};font-weight:400;-webkit-font-smoothing:antialiased;letter-spacing:-0.005em}
    .lp-root *{box-sizing:border-box}
    .lp-display{font-family:${TOKENS.font.display};font-weight:400;letter-spacing:-0.02em}
    .lp-display-i{font-family:${TOKENS.font.display};font-style:italic;font-weight:400;letter-spacing:-0.015em}
    .lp-mono{font-family:${TOKENS.font.mono};font-feature-settings:"ss01","cv11";font-variant-numeric:tabular-nums}
    .lp-eyebrow{font-family:${TOKENS.font.mono};font-size:10px;letter-spacing:0.14em;text-transform:uppercase;font-weight:400}
    .lp-num{font-variant-numeric:tabular-nums lining-nums}
    .lp-hairline{border:0;border-top:0.5px solid var(--hair);margin:0}
    .lp-scrollable{scrollbar-width:none}
    .lp-scrollable::-webkit-scrollbar{display:none}
    .lp-tap{cursor:pointer;-webkit-tap-highlight-color:transparent}
    @keyframes lp-fade-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
    @keyframes lp-bar-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
    @keyframes lp-pull-spin{to{transform:rotate(360deg)}}
    .lp-fade{animation:lp-fade-in .42s cubic-bezier(.2,.7,.3,1) both}
    .lp-bar-anim>div{transform-origin:left;animation:lp-bar-fill .9s cubic-bezier(.2,.7,.3,1) both}
  `;
  document.head.appendChild(s);
}

// ------- BuJo bullet glyphs -------
function Bullet({kind = 'task', color, size = 14, style = {}}) {
  const glyphs = {
    task:      '·',  // open
    done:      '✕',
    migrated:  '›',
    scheduled: '‹',
    event:     '○',
    note:      '–',
    priority:  '★',
    irrelevant: '⊘',
  };
  return (
    <span className="lp-mono" style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size + 8, height: size + 8, fontSize: size,
      color: color || 'currentColor', flexShrink: 0,
      lineHeight: 1, fontWeight: 400, ...style,
    }}>{glyphs[kind]}</span>
  );
}

// ------- Eyebrow heading (mono caps with optional symbol) -------
function Eyebrow({children, count, color, style = {}}) {
  return (
    <div className="lp-eyebrow" style={{
      display: 'flex', alignItems: 'center', gap: 8,
      color: color || 'var(--muted)', ...style,
    }}>
      <span>{children}</span>
      {count !== undefined && (
        <span style={{color: 'var(--faint)', fontVariantNumeric: 'tabular-nums'}}>
          {String(count).padStart(2, '0')}
        </span>
      )}
      <span style={{flex: 1, height: 0.5, background: 'var(--hair)'}} />
    </div>
  );
}

// ------- Thin progress bar -------
function ProgressBar({pct = 0, color, height = 2, animate = true, trackOpacity = 0.15}) {
  const safe = Math.max(0, Math.min(100, pct));
  return (
    <div style={{
      width: '100%', height, borderRadius: 99,
      background: `color-mix(in oklch, ${color || 'var(--text)'} ${trackOpacity * 100}%, transparent)`,
      overflow: 'hidden',
    }}>
      <div className={animate ? 'lp-bar-anim' : ''} style={{height: '100%'}}>
        <div style={{
          width: safe + '%', height: '100%',
          background: color || 'var(--accent)',
          borderRadius: 99,
        }} />
      </div>
    </div>
  );
}

// ------- Vertical labeled row with metric on right -------
function MetricRow({label, value, pct, color, sub}) {
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 6, padding: '6px 0'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
        <span style={{color: 'var(--text)', fontSize: 13, fontWeight: 400}}>{label}</span>
        <span className="lp-mono" style={{color: 'var(--muted)', fontSize: 11}}>
          {value}
        </span>
      </div>
      {pct !== undefined && <ProgressBar pct={pct} color={color} />}
      {sub && <span className="lp-mono" style={{color: 'var(--faint)', fontSize: 10}}>{sub}</span>}
    </div>
  );
}

// ------- Tap target wrapping a checkable task -------
function TaskRow({task, done, onToggle, priority, meta, accent}) {
  return (
    <div className="lp-tap" onClick={onToggle} style={{
      display: 'flex', alignItems: 'flex-start', gap: 4,
      padding: '8px 0', borderBottom: '0.5px dashed var(--hair)',
      transition: 'opacity .18s',
      opacity: done ? 0.4 : 1,
    }}>
      <Bullet kind={done ? 'done' : (priority ? 'priority' : 'task')}
        color={done ? 'var(--accent2)' : (priority ? 'var(--accent)' : 'var(--muted)')}
        size={priority && !done ? 11 : 13} />
      <div style={{flex: 1, minWidth: 0, paddingTop: 4}}>
        <div style={{
          fontSize: 14, lineHeight: 1.4, color: 'var(--text)',
          textDecoration: done ? 'line-through' : 'none',
          textDecorationColor: 'var(--muted)',
          textDecorationThickness: '0.5px',
        }}>{task}</div>
        {meta && (
          <div className="lp-mono" style={{
            fontSize: 10, color: 'var(--faint)', marginTop: 3,
          }}>{meta}</div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, {TOKENS, Bullet, Eyebrow, ProgressBar, MetricRow, TaskRow});
