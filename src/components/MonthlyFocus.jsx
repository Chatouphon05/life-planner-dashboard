import { SectionHeader } from './Primitives.jsx';

export default function MonthlyFocus({ monthly, loading, monthName }) {
  if (loading) return (
    <div>
      <SectionHeader label={monthName} />
      <p className="lp-mono" style={{ fontSize: 13, color: 'var(--faint)', marginTop: 16, textAlign: 'center' }}>
        Syncing Notion…
      </p>
    </div>
  );

  return (
    <div>
      <SectionHeader label={monthName} />
      {monthly.theme ? (
        <p className="lp-display-i" style={{
          margin: '14px 0 14px', fontSize: 22, lineHeight: 1.25, color: 'var(--text)',
        }}>
          "{monthly.theme}"
        </p>
      ) : (
        <p className="lp-mono" style={{ fontSize: 13, color: 'var(--faint)', margin: '14px 0' }}>
          No theme set — add one in your Monthly Plan.
        </p>
      )}
      {monthly.focusAreas.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {monthly.focusAreas.map(a => (
            <span key={a} className="lp-mono" style={{
              fontSize: 11, color: 'var(--muted)',
              padding: '4px 8px', borderRadius: 99,
              border: '0.5px solid var(--hair-strong)',
            }}>{a}</span>
          ))}
        </div>
      )}
    </div>
  );
}
