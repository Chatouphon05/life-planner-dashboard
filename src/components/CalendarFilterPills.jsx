export default function CalendarFilterPills({ calendars, selectedIds, onToggle }) {
  if (!calendars.length) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {calendars.map(c => {
        const active = selectedIds.includes(c.id);
        return (
          <span
            key={c.id}
            className="lp-tap lp-mono"
            onClick={() => onToggle(c.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11, padding: '5px 10px', borderRadius: 99, cursor: 'pointer',
              border: `0.5px solid ${active ? c.color : 'var(--hair-strong)'}`,
              background: active ? `color-mix(in oklch, ${c.color} 16%, transparent)` : 'transparent',
              color: active ? 'var(--text)' : 'var(--faint)',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
            {c.name}
          </span>
        );
      })}
    </div>
  );
}
