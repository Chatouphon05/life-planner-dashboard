import { SectionHeader, ProgressBar, Skeleton } from './Primitives.jsx';

// ── Category config ────────────────────────────────────────────────────────────
const CATEGORY = {
  'Transition':   { icon: '→', color: 'var(--accent)',  label: 'Transition'   },
  'Deadline':     { icon: '⊙', color: 'var(--muted)',   label: 'Deadline'     },
  'Look Forward': { icon: '✦', color: 'var(--accent2)', label: 'Look Forward' },
};

const DEFAULT_CAT = CATEGORY['Transition'];

function formatDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-').map(Number);
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${MON[m - 1]} ${d}, ${y}`;
}

// ── Single card ────────────────────────────────────────────────────────────────
function MilestoneCard({ m }) {
  const cat     = CATEGORY[m.category] || DEFAULT_CAT;
  const daysStr = m.daysLeft === 0   ? '00'
                : m.daysLeft != null ? String(m.daysLeft)
                : '—';
  const unit    = m.daysLeft === 1 ? 'day' : 'days';
  const isActive   = m.status === 'Active';
  const isUpcoming = m.status === 'Upcoming';

  return (
    <div style={{
      position: 'relative',
      padding: '16px 16px 14px',
      borderRadius: 14,
      background: 'var(--bg-2)',
      border: '0.5px solid var(--hair-strong)',
      overflow: 'hidden',
    }}>

      {/* ── Top accent bar ── */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 2,
        background: cat.color,
        opacity: isUpcoming ? 0.45 : 1,
      }} />

      {/* ── Header row: category · status ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 14,
      }}>
        <span className="lp-mono" style={{
          fontSize: 9, letterSpacing: '0.13em', textTransform: 'uppercase',
          color: cat.color, opacity: isUpcoming ? 0.65 : 1,
        }}>
          {cat.icon}&nbsp;&nbsp;{cat.label}
        </span>
        <span className="lp-mono" style={{
          fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase',
          color: isActive ? 'var(--accent2)' : 'var(--faint)',
        }}>
          {isActive ? '● active' : '○ upcoming'}
        </span>
      </div>

      {/* ── Main row: name (left) · countdown (right) ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-end',
        justifyContent: 'space-between', gap: 16,
      }}>
        {/* Name */}
        <div className="lp-display-i" style={{
          fontSize: 22, lineHeight: 1.2,
          color: isUpcoming ? 'var(--muted)' : 'var(--text)',
          flex: 1, minWidth: 0,
        }}>
          {m.name}
        </div>

        {/* Countdown number */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className="lp-mono lp-num" style={{
            fontSize: 44, lineHeight: 0.88,
            color: cat.color,
            opacity: isUpcoming ? 0.65 : 1,
            letterSpacing: '-0.03em',
          }}>
            {daysStr}
          </div>
          <div className="lp-mono" style={{
            fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase',
            color: 'var(--faint)', marginTop: 5,
          }}>
            {unit}
          </div>
        </div>
      </div>

      {/* ── Progress + date range (Active) ── */}
      {isActive && m.progress != null && (
        <div style={{ marginTop: 16 }}>
          <ProgressBar pct={m.progress} color={cat.color} height={1.5} />
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginTop: 6,
          }}>
            <span className="lp-mono" style={{ fontSize: 9, color: 'var(--faint)' }}>
              {formatDate(m.start)}
            </span>
            <span className="lp-mono" style={{ fontSize: 9, color: 'var(--faint)' }}>
              {formatDate(m.date)}
            </span>
          </div>
        </div>
      )}

      {/* ── Target date only (Upcoming) ── */}
      {isUpcoming && m.date && (
        <div className="lp-mono" style={{
          fontSize: 9, color: 'var(--faint)',
          marginTop: 12, letterSpacing: '0.06em',
        }}>
          {formatDate(m.date)}
        </div>
      )}

    </div>
  );
}

// ── Section ────────────────────────────────────────────────────────────────────
export default function Milestones({ milestones = [], loading }) {
  const visible = milestones.filter(m => m.status !== 'Done');

  if (!loading && visible.length === 0) return null;

  return (
    <div>
      <SectionHeader label="Milestones" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && visible.length === 0 ? (
          <>
            <Skeleton height={110} radius={14} />
            <Skeleton height={90}  radius={14} style={{ opacity: 0.5 }} />
          </>
        ) : (
          visible.map(m => <MilestoneCard key={m.id} m={m} />)
        )}
      </div>
    </div>
  );
}
