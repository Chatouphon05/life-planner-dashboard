import { useState, useCallback } from 'react';
import { Eyebrow, Skeleton } from './Primitives.jsx';

const DOT = 20;
const GAP = 2;

function buildAxis() {
  const today = new Date();
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (13 - i));
    return d;
  });
}

const axis = buildAxis();
const DAY_LABELS = ['S','M','T','W','T','F','S'];

function Dot({ value, isToday, done: localDone, onToggle, pending }) {
  const effectiveDone = localDone !== undefined ? localDone : (value === 1);
  const absent        = value === null && localDone === undefined;
  const isToday_done  = isToday && effectiveDone;

  let bg     = 'transparent';
  let border = '0.5px dashed var(--hair)';

  if (absent) {
    bg = 'transparent';
    border = '0.5px dashed var(--hair)';
  } else if (effectiveDone) {
    bg     = isToday ? 'var(--accent)' : 'var(--accent2)';
    border = 'none';
  } else {
    bg     = 'transparent';
    border = `0.5px solid ${isToday ? 'var(--accent)' : 'var(--hair-strong)'}`;
  }

  return (
    <div
      className={isToday ? 'lp-tap' : ''}
      onClick={isToday ? onToggle : undefined}
      style={{
        flex: 1, height: DOT,
        borderRadius: 2,
        background: bg,
        border,
        opacity: pending ? 0.6 : 1,
        transition: 'background .15s, border .15s',
        boxShadow: isToday_done ? `0 0 6px color-mix(in oklch, var(--accent) 50%, transparent)` : 'none',
      }}
    />
  );
}

export default function HabitTracker({ habits, habitHistory, loading, writeback }) {
  // { [id]: boolean } — optimistic overrides for today's habits
  const [overrides, setOverrides] = useState({});
  const [failed,    setFailed]    = useState({});

  const toggle = useCallback(async (habit) => {
    if (failed[habit.id]) return;
    const current = overrides.hasOwnProperty(habit.id) ? overrides[habit.id] : habit.done;
    const next    = !current;
    setOverrides(o => ({ ...o, [habit.id]: next }));
    try {
      await writeback('habit-done', habit.id, next);
    } catch {
      setOverrides(o => { const n = { ...o }; delete n[habit.id]; return n; });
      setFailed(f => ({ ...f, [habit.id]: true }));
      setTimeout(() => setFailed(f => { const n = { ...f }; delete n[habit.id]; return n; }), 2500);
    }
  }, [overrides, failed, writeback]);

  if (loading) return (
    <div>
      <Eyebrow>Habits · 14 days</Eyebrow>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
        {[90, 75, 110].map((w, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <Skeleton width={w} height={12} />
              <Skeleton width={20} height={12} />
            </div>
            <div style={{ display: 'flex', gap: GAP }}>
              {Array(14).fill(0).map((_, j) => (
                <Skeleton key={j} width={DOT} height={DOT} radius={99} style={{ flex: 'none' }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (!habits.length) return (
    <div>
      <Eyebrow>Habits · 14 days</Eyebrow>
      <p className="lp-mono" style={{ fontSize: 13, color: 'var(--faint)', marginTop: 12 }}>
        No habits today — add them in Notion.
      </p>
    </div>
  );

  return (
    <div>
      <Eyebrow count={habits.length}>Habits · 14 days</Eyebrow>

      {/* Date axis */}
      <div style={{
        display: 'flex', gap: GAP, marginTop: 10, marginBottom: 6,
        paddingLeft: 0,
      }}>
        {/* spacer for habit name column — we stack vertically so no offset needed */}
        {axis.map((d, i) => (
          <div key={i} style={{
            flex: 1,
            textAlign: 'center',
          }}>
            <span className="lp-mono" style={{
              fontSize: 9,
              color: i === 13 ? 'var(--accent)' : 'var(--faint)',
              lineHeight: 1,
            }}>
              {i === 13 ? '▾' : DAY_LABELS[d.getDay()]}
            </span>
          </div>
        ))}
      </div>

      {/* Habit rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {habits.map(habit => {
          const history   = habitHistory[habit.habit] || Array(14).fill(null);
          const todayVal  = history[13]; // index 13 = today
          const isDone    = overrides.hasOwnProperty(habit.id) ? overrides[habit.id] : habit.done;
          const isFailed  = !!failed[habit.id];

          return (
            <div key={habit.id}>
              {/* Name row */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'baseline', marginBottom: 5,
              }}>
                <span style={{
                  fontSize: 15, color: isFailed ? 'var(--faint)' : 'var(--text)',
                  lineHeight: 1.2,
                  flex: 1, minWidth: 0, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  textDecoration: isDone ? 'line-through' : 'none',
                  textDecorationColor: 'var(--muted)',
                  textDecorationThickness: '0.5px',
                }}>
                  {habit.habit}
                </span>
                <span className="lp-mono" style={{ marginLeft: 8, flexShrink: 0 }}>
                  {habit.streak > 0 && (() => {
                    const s = habit.streak;
                    const color = s >= 7 ? 'var(--accent)' : s >= 3 ? 'var(--muted)' : 'var(--faint)';
                    const glyph = s >= 30 ? '◆' : s >= 7 ? '●' : null;
                    return (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        {glyph && <span style={{ fontSize: 7, color, lineHeight: 1 }}>{glyph}</span>}
                        <span style={{ fontSize: 11, color }}>{s}d</span>
                      </span>
                    );
                  })()}
                </span>
              </div>

              {/* Dot grid */}
              <div style={{ display: 'flex', gap: GAP }}>
                {history.map((val, i) => (
                  <Dot
                    key={i}
                    value={val}
                    isToday={i === 13}
                    done={i === 13 ? (overrides.hasOwnProperty(habit.id) ? overrides[habit.id] : undefined) : undefined}
                    onToggle={() => toggle(habit)}
                    pending={isFailed && i === 13}
                  />
                ))}
              </div>

              {isFailed && (
                <div className="lp-mono" style={{ fontSize: 10, color: 'var(--faint)', marginTop: 3 }}>
                  sync failed · pull to retry
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
