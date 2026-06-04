export default function WeekStatsRow({ habits, weeklyHeatmap, loading }) {
  if (loading) return null;

  const doneToday  = habits.filter(h => h.done === true).length;
  const totalToday = habits.length;

  const currentWeek = weeklyHeatmap?.find(w => w.isCurrent === true);

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
      {/* Habits chip */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span className="lp-eyebrow">HABITS</span>
        <span className="lp-mono lp-num" style={{ fontSize: 14, color: 'var(--text)' }}>
          {doneToday}/{totalToday}
        </span>
      </div>

      {currentWeek && (
        <>
          <span className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)' }}>·</span>

          {/* Week tasks chip */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="lp-eyebrow">WEEK</span>
            <span className="lp-mono lp-num" style={{ fontSize: 14, color: 'var(--text)' }}>
              {currentWeek.done}/{currentWeek.total}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
