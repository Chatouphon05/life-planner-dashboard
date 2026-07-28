import { Eyebrow, Skeleton } from './Primitives.jsx';
import EventRow from './EventRow.jsx';
import { dowOfDateStr, todayStr } from '../utils/dateGrid.js';

const DAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function EventSchedule({ events, calendars, loading, error }) {
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ display: 'flex', gap: 12 }}>
          <Skeleton width={44} height={12} />
          <Skeleton height={14} style={{ flex: 1 }} />
        </div>
      ))}
    </div>
  );

  if (error) return (
    <p className="lp-mono" style={{ fontSize: 11, color: 'var(--priority-high)' }}>{error}</p>
  );

  const colorById = Object.fromEntries(calendars.map(c => [c.id, c.color]));
  const now = Date.now();
  const nextId = events.find(e => !e.allDay && e.start && new Date(e.start).getTime() >= now)?.id;
  const today = todayStr();

  const groups = {};
  for (const e of events) {
    const day = (e.start || '').slice(0, 10);
    if (!groups[day]) groups[day] = [];
    groups[day].push(e);
  }
  const orderedDays = Object.keys(groups).sort();

  if (!orderedDays.length) return (
    <div>
      <Eyebrow>Events</Eyebrow>
      <p className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 10 }}>Nothing scheduled.</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {orderedDays.map(day => {
        const d = Number(day.slice(8, 10));
        const dow = dowOfDateStr(day);
        const label = day === today ? `${DAYS_SHORT[dow]} ${d} · Today` : `${DAYS_SHORT[dow]} ${d}`;
        return (
          <div key={day}>
            <Eyebrow count={groups[day].length}>{label}</Eyebrow>
            <div style={{ marginTop: 4 }}>
              {groups[day].map(e => (
                <EventRow key={e.id} event={e} color={colorById[e.calendarId]} isNext={e.id === nextId} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
