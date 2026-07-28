import { formatEventTime, formatEventDuration } from '../utils/eventTime.js';

export default function EventRow({ event, color, isNext }) {
  const time     = formatEventTime(event.start, event.allDay);
  const duration = formatEventDuration(event.start, event.end, event.allDay);

  return (
    <div style={{
      display: 'flex', gap: 12, padding: '10px 0',
      borderBottom: '0.5px solid var(--hair)',
    }}>
      <div style={{ width: 52, flexShrink: 0, textAlign: 'right' }}>
        <div className="lp-mono" style={{ fontSize: 12, color: 'var(--text)' }}>{time}</div>
        {duration && (
          <div className="lp-mono" style={{ fontSize: 10, color: 'var(--faint)', marginTop: 2 }}>{duration}</div>
        )}
      </div>

      <span style={{ width: 2, borderRadius: 1, background: color || 'var(--accent)', flexShrink: 0, alignSelf: 'stretch' }} />

      <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{
            fontSize: 14, color: 'var(--text)', minWidth: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {event.title}
          </span>
          {isNext && (
            <span className="lp-mono" style={{
              fontSize: 9, padding: '1px 6px', borderRadius: 99, flexShrink: 0,
              background: 'var(--accent)', color: 'var(--bg)',
            }}>NEXT</span>
          )}
        </div>
        {event.location && (
          <div className="lp-mono" style={{
            fontSize: 10.5, color: 'var(--faint)', marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {event.location}
          </div>
        )}
      </div>
    </div>
  );
}
