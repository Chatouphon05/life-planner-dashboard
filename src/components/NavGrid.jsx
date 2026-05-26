const NAV_ITEMS = [
  { sym: '○',  label: 'Daily',     href: 'https://www.notion.so/f35023fab2344a4a8a71f87f6e7d9610', color: 'var(--accent)' },
  { sym: '›',  label: 'Weekly',    href: 'https://www.notion.so/2682d573db944fcf84c08dac4acc1a02', color: 'var(--text)' },
  { sym: '◑',  label: 'Monthly',   href: 'https://www.notion.so/a24a10e0ad52408ab4fdd70e2768b979', color: 'var(--text)' },
  { sym: '◎',  label: 'Quarterly', href: 'https://www.notion.so/2ac4ae462b4d436baa485b4dd14a75ea', color: 'var(--accent2)' },
  { sym: '◆',  label: 'Goals',     href: 'https://www.notion.so/bde57e266a3f43438d5913bf205c10f3', color: 'var(--accent2)' },
  { sym: '●',  label: 'Habits',    href: 'https://www.notion.so/e00177c934234bbebbcffed9cd847b98', color: 'var(--muted)' },
];

export default function NavGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {NAV_ITEMS.map(item => (
        <a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="lp-tap"
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            padding: '14px 8px',
            background: 'var(--bg-2)',
            border: '0.5px solid var(--hair)',
            borderRadius: 12,
            textDecoration: 'none',
          }}
        >
          <span className="lp-display-i" style={{ fontSize: 20, color: item.color, lineHeight: 1 }}>
            {item.sym}
          </span>
          <span className="lp-mono" style={{
            fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase',
            color: 'var(--muted)',
          }}>
            {item.label}
          </span>
        </a>
      ))}
    </div>
  );
}
