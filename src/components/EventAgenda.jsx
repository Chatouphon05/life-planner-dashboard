import { Eyebrow, Skeleton } from './Primitives.jsx';
import EventRow from './EventRow.jsx';
import { todayStr } from '../utils/dateGrid.js';

export default function EventAgenda({ events, calendars, loading, error, anchorDate }) {
  const label = anchorDate === todayStr() ? 'Today' : 'Events';

  if (loading) return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: 'flex', gap: 12 }}>
            <Skeleton width={44} height={12} />
            <Skeleton height={14} style={{ flex: 1 }} />
          </div>
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <p className="lp-mono" style={{ fontSize: 11, color: 'var(--priority-high)', marginTop: 10 }}>{error}</p>
    </div>
  );

  const colorById = Object.fromEntries(calendars.map(c => [c.id, c.color]));
  const now = Date.now();
  const nextId = events.find(e => !e.allDay && e.start && new Date(e.start).getTime() >= now)?.id;

  return (
    <div>
      <Eyebrow count={events.length}>{label}</Eyebrow>
      {events.length === 0 ? (
        <p className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 10 }}>
          No events.
        </p>
      ) : (
        <div style={{ marginTop: 4 }}>
          {events.map(e => (
            <EventRow key={e.id} event={e} color={colorById[e.calendarId]} isNext={e.id === nextId} />
          ))}
        </div>
      )}
    </div>
  );
}
