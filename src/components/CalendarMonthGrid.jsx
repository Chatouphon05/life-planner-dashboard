import { Skeleton } from './Primitives.jsx';
import { addDaysStr, dowOfDateStr, firstOfMonthStr, todayStr } from '../utils/dateGrid.js';

const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MAX_SINGLE_PER_CELL = 3;
const MAX_LANES = 2;
const LANE_HEIGHT = 11;

function isMultiDay(ev) {
  if (!ev.allDay || !ev.start || !ev.end) return false;
  const startMs = Date.parse(ev.start + 'T00:00:00Z');
  const endMs   = Date.parse(ev.end   + 'T00:00:00Z'); // Google's all-day end is exclusive
  return (endMs - startMs) > 86400000;
}

function buildGridDays(anchorDate) {
  const first = firstOfMonthStr(anchorDate);
  const gridStart = addDaysStr(first, -dowOfDateStr(first));
  return Array.from({ length: 42 }, (_, i) => addDaysStr(gridStart, i));
}

// One week-row's multi-day bar segments, each assigned a stacking lane so
// simultaneous multi-day events don't overlap visually (greedy first-fit,
// not a perfect packing — good enough for a personal calendar's volume).
function layoutRowSegments(rowDays, multiDayEvents) {
  const rowStart = rowDays[0], rowEnd = rowDays[6];
  const segments = [];
  for (const ev of multiDayEvents) {
    const evEndIncl = addDaysStr(ev.end, -1);
    if (evEndIncl < rowStart || ev.start > rowEnd) continue;
    const segStart = ev.start   < rowStart ? rowStart : ev.start;
    const segEnd   = evEndIncl  > rowEnd   ? rowEnd   : evEndIncl;
    segments.push({
      ev,
      colStart: rowDays.indexOf(segStart),
      colEnd:   rowDays.indexOf(segEnd),
      startsHere: ev.start >= rowStart,
      endsHere:   evEndIncl <= rowEnd,
    });
  }
  segments.sort((a, b) => a.colStart - b.colStart || (b.colEnd - b.colStart) - (a.colEnd - a.colStart));
  const lanes = [];
  for (const seg of segments) {
    let lane = lanes.findIndex(occupied => occupied.every(s => s.colEnd < seg.colStart || s.colStart > seg.colEnd));
    if (lane === -1) { lane = lanes.length; lanes.push([]); }
    lanes[lane].push(seg);
    seg.lane = lane;
  }
  return { segments, laneCount: lanes.length };
}

export default function CalendarMonthGrid({ anchorDate, events, calendars, loading, onSelectDay }) {
  if (loading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
      {Array.from({ length: 35 }, (_, i) => <Skeleton key={i} height={70} radius={4} />)}
    </div>
  );

  const colorById = Object.fromEntries(calendars.map(c => [c.id, c.color]));
  const gridDays  = buildGridDays(anchorDate);
  const monthNum  = Number(firstOfMonthStr(anchorDate).split('-')[1]);
  const today     = todayStr();

  const multiDay = events.filter(isMultiDay);
  const singleByDay = {};
  for (const e of events) {
    if (isMultiDay(e)) continue;
    const day = (e.start || '').slice(0, 10);
    if (!singleByDay[day]) singleByDay[day] = [];
    singleByDay[day].push(e);
  }

  const rows = Array.from({ length: 6 }, (_, r) => {
    const rowDays = gridDays.slice(r * 7, r * 7 + 7);
    return { rowDays, ...layoutRowSegments(rowDays, multiDay) };
  });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {DAYS_SHORT.map((d, i) => (
          <div key={i} className="lp-mono" style={{ textAlign: 'center', fontSize: 9, color: 'var(--faint)', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {rows.map((row, ri) => {
          const visibleLanes = Math.min(row.laneCount, MAX_LANES);
          return (
            <div key={ri} style={{ position: 'relative' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
                {row.rowDays.map(day => {
                  const inMonth = Number(day.slice(5, 7)) === monthNum;
                  const dayNum  = Number(day.slice(8, 10));
                  const isToday = day === today;
                  const dayEvents = singleByDay[day] || [];
                  const shownCount = Math.max(0, MAX_SINGLE_PER_CELL - visibleLanes);
                  const shown = dayEvents.slice(0, shownCount);
                  const overflow = dayEvents.length - shown.length;

                  return (
                    <div
                      key={day}
                      onClick={() => onSelectDay?.(day)}
                      className="lp-tap"
                      style={{
                        minHeight: 76, padding: '3px 3px 2px',
                        background: isToday ? 'color-mix(in oklch, var(--accent) 8%, transparent)' : 'transparent',
                        border: '0.5px solid var(--hair)',
                        opacity: inMonth ? 1 : 0.35,
                        cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2,
                      }}
                    >
                      <span className="lp-mono" style={{
                        fontSize: 10, color: isToday ? 'var(--accent)' : 'var(--text)',
                        fontWeight: isToday ? 600 : 400,
                      }}>{dayNum}</span>

                      <div style={{ marginTop: visibleLanes * LANE_HEIGHT }}>
                        {shown.map(e => (
                          <div key={e.id} className="lp-mono" style={{
                            fontSize: 8.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1,
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: colorById[e.calendarId] || 'var(--accent)', flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</span>
                          </div>
                        ))}
                        {overflow > 0 && (
                          <div className="lp-mono" style={{ fontSize: 8.5, color: 'var(--faint)', marginTop: 1 }}>+{overflow} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Multi-day bars, absolutely positioned over the day-number row */}
              <div style={{ position: 'absolute', top: 16, left: 0, right: 0, pointerEvents: 'none' }}>
                {row.segments.filter(s => s.lane < MAX_LANES).map((s, i) => {
                  const roundLeft  = s.startsHere ? 3 : 0;
                  const roundRight = s.endsHere   ? 3 : 0;
                  return (
                    <div
                      key={s.ev.id + '-' + i}
                      className="lp-mono"
                      style={{
                        position: 'absolute',
                        top: s.lane * LANE_HEIGHT,
                        left:  `${(s.colStart / 7) * 100}%`,
                        width: `${((s.colEnd - s.colStart + 1) / 7) * 100}%`,
                        height: 10, lineHeight: '10px', fontSize: 8, paddingLeft: 3,
                        borderRadius: `${roundLeft}px ${roundRight}px ${roundRight}px ${roundLeft}px`,
                        background: colorById[s.ev.calendarId] || 'var(--accent)',
                        color: 'var(--bg)', overflow: 'hidden', whiteSpace: 'nowrap',
                        pointerEvents: 'auto',
                      }}
                    >{s.startsHere ? s.ev.title : ''}</div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
