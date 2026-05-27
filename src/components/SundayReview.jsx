// Shown only on Sundays — a lightweight nudge to reflect before planning next week
const SAGE = '#4aab82';

export default function SundayReview() {
  const today = new Date();
  if (today.getDay() !== 0) return null; // 0 = Sunday

  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: 12,
      background: 'var(--bg-2)',
      borderTop:    '0.5px solid var(--hair-strong)',
      borderRight:  '0.5px solid var(--hair-strong)',
      borderBottom: '0.5px solid var(--hair-strong)',
      borderLeft:   `3px solid ${SAGE}`,
    }}>

      {/* eyebrow */}
      <div className="lp-mono" style={{
        fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: SAGE, marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ fontSize: 12, lineHeight: 1 }}>◎</span>
        Sunday Review
      </div>

      {/* body */}
      <p style={{
        margin: 0,
        fontSize: 14, lineHeight: 1.55,
        color: 'var(--text)',
      }}>
        Week's done. Reflect on what got done, what didn't, and why — then set your sights on the next one.
      </p>

      {/* CTA */}
      <a
        href="https://www.notion.so/5e77a48652b247ca99a86710e12094bb"
        target="_blank"
        rel="noopener noreferrer"
        className="lp-tap"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          marginTop: 12, padding: '7px 14px', borderRadius: 8,
          textDecoration: 'none',
          background: `rgba(74,171,130,0.10)`,
          border: `0.5px solid rgba(74,171,130,0.30)`,
        }}
      >
        <span className="lp-mono" style={{
          fontSize: 11, color: SAGE, letterSpacing: '0.08em',
        }}>
          Open Weekly Tasks ↗
        </span>
      </a>

    </div>
  );
}
