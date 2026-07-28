import { addDaysStr, dowOfDateStr } from '../utils/dateGrid.js';

const VIEWS = [
  { key: 'day',      label: 'Day' },
  { key: '4day',     label: '4 Days' },
  { key: 'week',     label: 'Week' },
  { key: 'month',    label: 'Month' },
  { key: 'schedule', label: 'Schedule' },
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function rangeLabel(view, anchorDate) {
  const [y, m, d] = anchorDate.split('-').map(Number);

  if (view === 'month')    return `${MONTHS[m - 1]} ${y}`;
  if (view === 'schedule') return 'Upcoming';
  if (view === 'day')      return `${DAYS_SHORT[dowOfDateStr(anchorDate)]}, ${MONTHS[m - 1].slice(0, 3)} ${d}`;

  const days  = view === 'week' ? 7 : 4;
  const start = view === 'week' ? addDaysStr(anchorDate, -dowOfDateStr(anchorDate)) : anchorDate;
  const end   = addDaysStr(start, days - 1);
  const [, sm, sd] = start.split('-').map(Number);
  const [, em, ed] = end.split('-').map(Number);

  return sm === em
    ? `${MONTHS[sm - 1].slice(0, 3)} ${sd}–${ed}`
    : `${MONTHS[sm - 1].slice(0, 3)} ${sd} – ${MONTHS[em - 1].slice(0, 3)} ${ed}`;
}

export default function CalendarControls({ view, anchorDate, onChangeView, onToday, onPrev, onNext }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onToday} className="lp-tap lp-mono" style={{
          padding: '5px 10px', borderRadius: 8, border: '0.5px solid var(--hair-strong)',
          background: 'transparent', color: 'var(--muted)', fontSize: 10.5,
          letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0,
        }}>Today</button>

        <button onClick={onPrev} aria-label="Previous" className="lp-tap" style={{
          background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
          fontSize: 16, padding: '0 4px', flexShrink: 0,
        }}>‹</button>
        <button onClick={onNext} aria-label="Next" className="lp-tap" style={{
          background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
          fontSize: 16, padding: '0 4px', flexShrink: 0,
        }}>›</button>

        <span style={{ fontSize: 14, color: 'var(--text)', flex: 1, minWidth: 0 }}>
          {rangeLabel(view, anchorDate)}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto' }}>
        {VIEWS.map(v => {
          const active = view === v.key;
          return (
            <span
              key={v.key}
              onClick={() => onChangeView(v.key)}
              className="lp-tap lp-mono"
              style={{
                flexShrink: 0, fontSize: 10.5, padding: '5px 10px', borderRadius: 99,
                letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
                background: active ? 'var(--accent)' : 'transparent',
                color:      active ? 'var(--bg)'     : 'var(--faint)',
                border:     active ? 'none' : '0.5px solid var(--hair-strong)',
              }}
            >{v.label}</span>
          );
        })}
      </div>
    </div>
  );
}
