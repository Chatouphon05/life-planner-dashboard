import { SectionHeader, MetricRow } from './Primitives.jsx';

export default function TimeRemaining({ time }) {
  return (
    <div>
      <SectionHeader label="Time Remaining" />
      <div style={{ marginTop: 8 }}>
        {time.map((t, i) => (
          <MetricRow
            key={t.label}
            label={t.label}
            value={t.pct + '%'}
            pct={t.pct}
            sub={t.sub}
            color={
              i === 3 ? 'var(--accent)' :
              i === 2 ? 'var(--accent2)' :
              'var(--text)'
            }
          />
        ))}
      </div>
    </div>
  );
}
