// sections.jsx — high-level dashboard sections. Read from window globals
// (TOKENS, Bullet, Eyebrow, ProgressBar, MetricRow, TaskRow).

// ============================================================
// DATA — realistic content from the reference doc (May 25, 2026)
// ============================================================
const DATA = {
  user: {name: 'Lunk', city: 'Vientiane'},
  date: {iso: '2026-05-25', day: 'Monday', d: 25, m: 'May', mShort: 'MAY', y: 2026},
  brisbane: {daysLeft: 13, target: 'June 7'},
  mantra: 'Becoming more stable, clearer, and braver as who I already am.',
  mood: {energy: 6, focus: 7, mood: 7},
  time: [
    {label: 'This week',  pct: 14, sub: '6d remaining · Mon → Sun'},
    {label: 'This month', pct: 80, sub: '6d remaining · May'},
    {label: 'This year',  pct: 40, sub: '220d remaining · 2026'},
    {label: 'To Brisbane',pct: 89, sub: '13d remaining · Jun 7 departure'},
  ],
  tasks: [
    {id: 't1', task: 'Open The ML Mindset · Phase 02 W1', meta: 'Thu evening · 60 min', priority: true},
    {id: 't2', task: 'Laligence dashboard — final QA pass', meta: 'Work · before standup', priority: true},
    {id: 't3', task: 'EventPix handover doc', meta: 'Work · 30 min'},
    {id: 't4', task: 'Maruhan dashboard sample — outline 3 views', meta: 'Work'},
    {id: 't5', task: 'Daily journal — evening entry', meta: 'Habit · 10 min'},
    {id: 't6', task: 'Stretch + walk before bed', meta: 'Health · 15 min'},
  ],
  priorities: [
    {n: 1, task: 'The ML Mindset — Phase 02 W1', detail: 'Thu evening reading session, open it for real'},
    {n: 2, task: 'Last full work week', detail: 'Laligence dashboard + EventPix handover, Maruhan sample'},
    {n: 3, task: 'Laligence Farewell — be present', detail: 'Weekend team building, no work/study obligation'},
  ],
  monthly: {
    theme: 'Wrap up clean. Leave nothing trailing.',
    focusAreas: ['Career handover', 'Health reset', 'Brisbane prep'],
  },
  habits: [
    {id: 'h1', name: 'Daily journal',       symbol: 'note',     streak: 14, color: 'accent'},
    {id: 'h2', name: 'Read 20 min',         symbol: 'task',     streak: 7,  color: 'accent2'},
    {id: 'h3', name: 'No screen after 11',  symbol: 'event',    symLabel: 'No screens after 11pm', streak: 3, color: 'accent'},
    {id: 'h4', name: 'Move · 30 min',       symbol: 'task',     streak: 5,  color: 'accent2'},
    {id: 'h5', name: 'English speaking',    symbol: 'event',    streak: 9,  color: 'accent'},
  ],
  // 14-day grid: 1 = done, 0 = miss, null = no data / future
  habitGrid: {
    h1: [1,1,1,1,1,1,0,1,1,1,1,1,1,null],
    h2: [1,0,1,1,0,1,1,1,1,0,1,1,1,null],
    h3: [0,1,0,1,1,0,0,1,1,0,1,1,1,null],
    h4: [1,1,0,1,1,0,1,1,0,1,1,1,1,null],
    h5: [1,1,1,0,1,1,1,1,1,1,0,1,1,null],
  },
  goals: [
    {id: 'g1', name: 'Master Python for Data', area: 'Career & Learning', period: 'Q1', pct: 10, sub: 'pandas, numpy, EDA, regression'},
    {id: 'g2', name: 'Improve Statistics',     area: 'Career & Learning', period: 'Q1', pct: 10, sub: 'hypothesis testing, CI, regression'},
    {id: 'g3', name: 'Build strong data portfolio', area: 'Career & Learning', period: 'Full Year', pct: 5, sub: '3–6 projects shipped'},
    {id: 'g4', name: 'Improve English Speaking',    area: 'Career & Learning', period: 'Full Year', pct: 10, sub: 'IELTS Band 7.0'},
    {id: 'g5', name: 'Good sleep',         area: 'Health & Fitness', period: 'Full Year', pct: 10, sub: '2–3 good weeks per month'},
    {id: 'g6', name: 'Reduce fat',         area: 'Health & Fitness', period: 'Full Year', pct: 5,  sub: 'Aim for 65 kg'},
    {id: 'g7', name: 'Inner peace over external pressure', area: 'Personal Growth', period: 'Full Year', pct: 5,  sub: 'Daily quiet 10 min'},
    {id: 'g8', name: 'Daily journal',      area: 'Personal Growth', period: 'Full Year', pct: 15, sub: 'Track myself every day'},
    {id: 'g9', name: 'Move on from past sadness', area: 'Personal Growth', period: 'Full Year', pct: 5,  sub: 'Learn to live with it'},
    {id: 'g10', name: 'Read 1–2 books per month', area: 'Personal Growth', period: 'Full Year', pct: 0,  sub: 'Then review each one'},
    {id: 'g11', name: 'Keep strong connections', area: 'Relationships', period: 'Full Year', pct: 10, sub: 'Friends, co-workers, mentors'},
  ],
  books: {
    reading: {title: 'The ML Mindset', author: 'Chip Huyen', pct: 18, last: '2 days ago'},
    queue: [
      {title: 'Designing Machine Learning Systems', author: 'Chip Huyen'},
      {title: 'How to Take Smart Notes', author: 'Sönke Ahrens'},
      {title: 'The Comfort Crisis', author: 'Michael Easter'},
    ],
    finished: 2,
    goal: 12,
  },
};

const AREA_ORDER = ['Career & Learning', 'Health & Fitness', 'Personal Growth', 'Relationships'];
const AREA_GLYPH = {
  'Career & Learning': '§',
  'Health & Fitness':  '✚',
  'Personal Growth':   '✦',
  'Relationships':     '◇',
};

// ============================================================
// HERO — date in serif italic + mantra + countdown chip
// ============================================================
function Hero({variant = 'mantra'}) {
  return (
    <div style={{padding: '24px 22px 18px', position: 'relative'}}>
      {/* atmospheric gradient backdrop */}
      <div style={{
        position: 'absolute', inset: 0, background: 'var(--gradient)',
        zIndex: -1,
      }} />

      <div className="lp-eyebrow" style={{color: 'var(--muted)', marginBottom: 14}}>
        <span style={{color: 'var(--accent)'}}>●</span> &nbsp;{DATA.date.day.toUpperCase()} · {DATA.user.city.toUpperCase()}
      </div>

      <div className="lp-display" style={{
        fontSize: 56, lineHeight: 0.98, color: 'var(--text)',
        display: 'flex', alignItems: 'baseline', gap: 12,
      }}>
        <span className="lp-display-i lp-num">{DATA.date.d}</span>
        <span style={{
          fontSize: 14, fontFamily: TOKENS.font.mono,
          color: 'var(--muted)', letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>{DATA.date.mShort} · {DATA.date.y}</span>
      </div>

      {variant === 'countdown' ? (
        <div style={{marginTop: 18, display: 'flex', alignItems: 'baseline', gap: 10}}>
          <span className="lp-display-i" style={{fontSize: 38, color: 'var(--accent)'}}>{DATA.brisbane.daysLeft}</span>
          <div className="lp-mono" style={{fontSize: 11, color: 'var(--muted)'}}>
            days until<br/>Brisbane · {DATA.brisbane.target}
          </div>
        </div>
      ) : (
        <p className="lp-display-i" style={{
          marginTop: 16, marginBottom: 0,
          fontSize: 16, lineHeight: 1.4,
          color: 'var(--muted)',
          maxWidth: 320,
        }}>
          “{DATA.mantra}”
        </p>
      )}

      <div style={{
        marginTop: 18, display: 'flex', gap: 14,
        paddingTop: 14, borderTop: '0.5px solid var(--hair)',
      }}>
        <span className="lp-mono" style={{fontSize: 10, color: 'var(--faint)'}}>
          → BRISBANE <span style={{color: 'var(--accent)'}}>{String(DATA.brisbane.daysLeft).padStart(2,'0')}d</span>
        </span>
        <span className="lp-mono" style={{fontSize: 10, color: 'var(--faint)'}}>
          → MDS START <span style={{color: 'var(--text)'}}>JUL 2026</span>
        </span>
      </div>
    </div>
  );
}

// ============================================================
// MOOD CHECK-IN — 3 sliders displayed as dot-rows
// ============================================================
function MoodCheckIn({values, onChange}) {
  const fields = [
    {key: 'energy', label: 'Energy'},
    {key: 'focus',  label: 'Focus'},
    {key: 'mood',   label: 'Mood'},
  ];
  return (
    <div>
      <Eyebrow>How are you · {DATA.date.day.slice(0,3)} morning</Eyebrow>
      <div style={{marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10}}>
        {fields.map(f => (
          <div key={f.key} style={{display: 'flex', alignItems: 'center', gap: 12}}>
            <span style={{fontSize: 12, color: 'var(--muted)', width: 56}}>{f.label}</span>
            <div style={{display: 'flex', gap: 6, flex: 1}}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => {
                const active = n <= values[f.key];
                return (
                  <span key={n} className="lp-tap" onClick={() => onChange(f.key, n)}
                    style={{
                      flex: 1, height: 14,
                      borderRadius: 1,
                      background: active
                        ? (n >= 8 ? 'var(--accent)' : n >= 5 ? 'var(--accent2)' : 'var(--muted)')
                        : 'var(--hair-strong)',
                      transition: 'background .15s',
                    }} />
                );
              })}
            </div>
            <span className="lp-mono" style={{
              fontSize: 11, color: 'var(--text)', width: 20, textAlign: 'right',
            }}>{values[f.key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// TODAY'S TASKS
// ============================================================
function TodayTasks({tasks, done, onToggle, max}) {
  const list = max ? tasks.slice(0, max) : tasks;
  const completed = list.filter(t => done[t.id]).length;
  return (
    <div>
      <Eyebrow count={list.length}>Today · {DATA.date.day} log</Eyebrow>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginTop: 8, marginBottom: 4,
      }}>
        <span className="lp-display-i" style={{
          fontSize: 22, color: 'var(--text)',
        }}>{list.length - completed} <span style={{color: 'var(--muted)', fontSize: 14}}>open</span></span>
        <span className="lp-mono" style={{fontSize: 11, color: 'var(--faint)'}}>
          {completed}/{list.length} done
        </span>
      </div>
      <div>
        {list.map(t => (
          <TaskRow key={t.id} task={t.task} meta={t.meta}
            priority={t.priority} done={!!done[t.id]}
            onToggle={() => onToggle(t.id)} />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// THIS WEEK · TOP 3 PRIORITIES
// ============================================================
function WeekPriorities() {
  return (
    <div>
      <Eyebrow count={3}>This week · top 3</Eyebrow>
      <div style={{marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12}}>
        {DATA.priorities.map(p => (
          <div key={p.n} style={{
            display: 'flex', gap: 14,
            paddingBottom: 12,
            borderBottom: p.n < 3 ? '0.5px solid var(--hair)' : 'none',
          }}>
            <span className="lp-display-i lp-num" style={{
              fontSize: 28, color: 'var(--accent)', lineHeight: 1, width: 24,
            }}>{p.n}</span>
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{fontSize: 14, color: 'var(--text)', lineHeight: 1.35, fontWeight: 500}}>
                {p.task}
              </div>
              <div className="lp-mono" style={{
                fontSize: 10, color: 'var(--faint)', marginTop: 4, lineHeight: 1.4,
              }}>{p.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MONTHLY FOCUS
// ============================================================
function MonthlyFocus() {
  return (
    <div>
      <Eyebrow>{DATA.date.m} · monthly theme</Eyebrow>
      <p className="lp-display-i" style={{
        margin: '14px 0 14px', fontSize: 22, lineHeight: 1.25,
        color: 'var(--text)',
      }}>“{DATA.monthly.theme}”</p>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 6}}>
        {DATA.monthly.focusAreas.map(a => (
          <span key={a} className="lp-mono" style={{
            fontSize: 10, color: 'var(--muted)',
            padding: '4px 8px', borderRadius: 99,
            border: '0.5px solid var(--hair-strong)',
          }}>{a}</span>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// TIME REMAINING — 4 bars (week / month / year / brisbane)
// ============================================================
function TimeRemaining() {
  return (
    <div>
      <Eyebrow>Time remaining</Eyebrow>
      <div style={{marginTop: 8}}>
        {DATA.time.map((t, i) => (
          <MetricRow key={t.label}
            label={t.label}
            value={t.pct + '%'}
            pct={t.pct}
            sub={t.sub}
            color={i === 3 ? 'var(--accent)' : (i === 2 ? 'var(--accent2)' : 'var(--text)')} />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// HABITS — symbol + name + 14-day dot row + streak
// ============================================================
function Habits({values, onToggle, days = 14}) {
  // Today is index days-1
  const dayLabels = [];
  const today = new Date(2026, 4, 25);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    dayLabels.push({
      d: d.getDate(),
      isToday: i === 0,
      dow: ['S','M','T','W','T','F','S'][d.getDay()],
    });
  }
  return (
    <div>
      <Eyebrow count={DATA.habits.length}>Habits · 14 days</Eyebrow>
      <div style={{marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14}}>
        {/* date strip header */}
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <div style={{width: 100, flexShrink: 0}} />
          <div style={{flex: 1, display: 'grid', gridTemplateColumns: `repeat(${days}, 1fr)`, gap: 3}}>
            {dayLabels.map((d, i) => (
              <span key={i} className="lp-mono" style={{
                fontSize: 9, textAlign: 'center', color: d.isToday ? 'var(--accent)' : 'var(--faint)',
              }}>{d.d}</span>
            ))}
          </div>
          <span style={{width: 32, flexShrink: 0}} />
        </div>

        {DATA.habits.map(h => {
          const grid = (values[h.id] || DATA.habitGrid[h.id]).slice(-days);
          const cur = grid[grid.length - 1];
          const streak = h.streak;
          const color = h.color === 'accent' ? 'var(--accent)' : 'var(--accent2)';
          return (
            <div key={h.id} style={{display: 'flex', alignItems: 'center', gap: 8}}>
              <div style={{
                width: 100, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Bullet kind={h.symbol} size={11} color="var(--muted)" />
                <span style={{fontSize: 12, color: 'var(--text)'}}>{h.name}</span>
              </div>
              <div style={{flex: 1, display: 'grid', gridTemplateColumns: `repeat(${days}, 1fr)`, gap: 3}}>
                {grid.map((v, i) => {
                  const isToday = i === grid.length - 1;
                  return (
                    <span key={i}
                      className={isToday ? 'lp-tap' : ''}
                      onClick={isToday && onToggle ? () => onToggle(h.id, days - 1) : undefined}
                      style={{
                        height: 14,
                        borderRadius: 2,
                        background: v === 1
                          ? color
                          : v === 0
                            ? 'var(--hair-strong)'
                            : 'transparent',
                        border: v === null
                          ? '0.5px dashed var(--hair-strong)'
                          : isToday ? `0.5px solid ${color}` : 'none',
                        transition: 'background .15s',
                      }} />
                  );
                })}
              </div>
              <span className="lp-mono" style={{
                width: 32, flexShrink: 0, textAlign: 'right',
                fontSize: 11, color: 'var(--text)',
              }}>{streak}d</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// GOALS — grouped by area, collapsible
// ============================================================
function Goals({openAreas, onToggleArea}) {
  return (
    <div>
      <Eyebrow count={DATA.goals.length}>Active goals · 2026</Eyebrow>
      <div style={{marginTop: 6}}>
        {AREA_ORDER.map(area => {
          const items = DATA.goals.filter(g => g.area === area);
          if (!items.length) return null;
          const avg = Math.round(items.reduce((a,g) => a + g.pct, 0) / items.length);
          const open = openAreas[area] !== false;
          return (
            <div key={area} style={{
              borderBottom: '0.5px solid var(--hair)',
              padding: '12px 0',
            }}>
              <div className="lp-tap" onClick={() => onToggleArea(area)}
                style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <span className="lp-display" style={{fontSize: 18, color: 'var(--accent)', lineHeight: 1}}>{AREA_GLYPH[area]}</span>
                <div style={{flex: 1}}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  }}>
                    <span style={{fontSize: 13, color: 'var(--text)', fontWeight: 500}}>{area}</span>
                    <span className="lp-mono" style={{fontSize: 10, color: 'var(--faint)'}}>
                      {items.length} · avg {avg}%
                    </span>
                  </div>
                  <div style={{marginTop: 6}}>
                    <ProgressBar pct={avg} color="var(--accent2)" height={1} trackOpacity={0.1} />
                  </div>
                </div>
                <span className="lp-mono" style={{
                  fontSize: 12, color: 'var(--faint)',
                  transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform .18s',
                }}>›</span>
              </div>

              {open && (
                <div className="lp-fade" style={{marginTop: 14, marginLeft: 28, display: 'flex', flexDirection: 'column', gap: 12}}>
                  {items.map(g => (
                    <div key={g.id}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12}}>
                        <span style={{fontSize: 12.5, color: 'var(--text)', lineHeight: 1.35}}>{g.name}</span>
                        <span className="lp-mono lp-num" style={{
                          fontSize: 11, color: g.pct === 0 ? 'var(--faint)' : 'var(--text)',
                          flexShrink: 0,
                        }}>{g.pct}%</span>
                      </div>
                      <div style={{marginTop: 4}}>
                        <ProgressBar pct={g.pct} color="var(--accent)" height={1} trackOpacity={0.08} />
                      </div>
                      <div className="lp-mono" style={{
                        marginTop: 5, display: 'flex', gap: 8, fontSize: 10, color: 'var(--faint)',
                      }}>
                        <span>{g.period}</span>
                        <span>·</span>
                        <span>{g.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// BOOKS — currently reading + queue + counter
// ============================================================
function Books() {
  const b = DATA.books;
  return (
    <div>
      <Eyebrow>Reading · {b.finished}/{b.goal} this year</Eyebrow>
      {/* current book */}
      <div style={{
        marginTop: 12,
        padding: '14px 0',
        borderBottom: '0.5px solid var(--hair)',
      }}>
        <div style={{display: 'flex', gap: 14, alignItems: 'flex-start'}}>
          <div style={{
            width: 48, height: 68, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--bg-3), var(--bg-2))',
            border: '0.5px solid var(--hair-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <span className="lp-display-i" style={{
              fontSize: 18, color: 'var(--accent)',
            }}>ML</span>
            <span style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
              background: 'var(--accent)',
            }} />
          </div>
          <div style={{flex: 1, minWidth: 0}}>
            <div className="lp-mono" style={{fontSize: 9, color: 'var(--faint)', letterSpacing: '0.1em', textTransform: 'uppercase'}}>
              Now reading
            </div>
            <div className="lp-display" style={{fontSize: 16, color: 'var(--text)', marginTop: 4, lineHeight: 1.2}}>
              {b.reading.title}
            </div>
            <div className="lp-mono" style={{fontSize: 10, color: 'var(--muted)', marginTop: 3}}>
              {b.reading.author} · last opened {b.reading.last}
            </div>
            <div style={{marginTop: 8}}>
              <ProgressBar pct={b.reading.pct} color="var(--accent)" height={1} trackOpacity={0.1} />
            </div>
          </div>
        </div>
      </div>

      {/* queue */}
      <div style={{marginTop: 12}}>
        <div className="lp-mono" style={{fontSize: 9, color: 'var(--faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8}}>
          On deck
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
          {b.queue.map((q, i) => (
            <div key={i} style={{display: 'flex', alignItems: 'baseline', gap: 8}}>
              <span className="lp-mono lp-num" style={{fontSize: 10, color: 'var(--faint)', width: 16}}>
                0{i+1}
              </span>
              <div style={{flex: 1, minWidth: 0}}>
                <div style={{fontSize: 12, color: 'var(--text)', lineHeight: 1.3}}>{q.title}</div>
                <div className="lp-mono" style={{fontSize: 9, color: 'var(--faint)'}}>{q.author}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  DATA, AREA_ORDER, AREA_GLYPH,
  Hero, MoodCheckIn, TodayTasks, WeekPriorities, MonthlyFocus,
  TimeRemaining, Habits, Goals, Books,
});
