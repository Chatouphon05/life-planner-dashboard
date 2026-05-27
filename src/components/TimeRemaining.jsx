import { SectionHeader, MetricRow } from './Primitives.jsx';

// Cycle through accent colors for multiple milestones
const MILESTONE_COLORS = ['var(--accent)', 'var(--accent2)', 'var(--muted)'];

export default function TimeRemaining({ time, milestones = [] }) {
  // Only Active milestones have a meaningful progress bar (start → date)
  const activeMilestones = milestones.filter(m => m.status === 'Active' && m.progress != null);

  return (
    <div>
      <SectionHeader label="Time Remaining" />
      <div style={{ marginTop: 8 }}>

        {/* Standard time rows: week / month / year */}
        {time.map((t, i) => (
          <MetricRow
            key={t.label}
            label={t.label}
            value={t.pct + '%'}
            pct={t.pct}
            sub={t.sub}
            color={i === 2 ? 'var(--accent2)' : 'var(--text)'}
          />
        ))}

        {/* Active milestone rows */}
        {activeMilestones.map((m, i) => (
          <MetricRow
            key={m.id}
            label={m.name}
            value={m.daysLeft != null ? `${m.daysLeft}d` : '—'}
            pct={m.progress}
            sub={`${m.daysLeft ?? '?'}d remaining · ${m.date ?? ''}`}
            color={MILESTONE_COLORS[i % MILESTONE_COLORS.length]}
          />
        ))}

      </div>
    </div>
  );
}
