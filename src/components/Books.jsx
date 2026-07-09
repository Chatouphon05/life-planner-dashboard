import { useState, useEffect, useCallback } from 'react';
import { Eyebrow, ProgressBar } from './Primitives.jsx';

const STORAGE_KEY = 'lp-books-v1';

const DEFAULT_STATE = {
  current:  null, // { title, author, pct, lastOpened }
  queue:    [],   // [{ id, title, author }]
  finished: 0,
  goal:     12,
};

function loadBooks() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (raw && typeof raw === 'object') return { ...DEFAULT_STATE, ...raw };
  } catch {}
  return DEFAULT_STATE;
}
function saveBooks(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function relativeDay(iso) {
  if (!iso) return 'never';
  const days = Math.floor((Date.now() - new Date(iso + 'T12:00:00').getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

function initials(title) {
  const parts = title.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '··';
}

const inputStyle = {
  background: 'var(--bg-2)', border: '0.5px solid var(--hair-strong)',
  borderRadius: 6, padding: '8px 10px', fontSize: 13, color: 'var(--text)',
  fontFamily: 'var(--font-body)', outline: 'none', width: '100%',
};

const stepperBtn = {
  width: 22, height: 22, borderRadius: 4, border: '0.5px solid var(--hair-strong)',
  background: 'var(--bg-2)', color: 'var(--muted)', fontSize: 14, lineHeight: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};

function EditPencil({ onClick }) {
  return (
    <button
      className="lp-tap"
      onClick={onClick}
      aria-label="Edit reading"
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--faint)', display: 'flex', alignItems: 'center', padding: 2 }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    </button>
  );
}

function BooksEditor({ draft, setDraft, onSave, onCancel }) {
  return (
    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        value={draft.title}
        onChange={e => setDraft({ ...draft, title: e.target.value })}
        placeholder="Title"
        style={inputStyle}
        autoFocus
      />
      <input
        value={draft.author}
        onChange={e => setDraft({ ...draft, author: e.target.value })}
        placeholder="Author"
        style={inputStyle}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="lp-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>Progress</span>
        <input
          type="number" min="0" max="100" value={draft.pct}
          onChange={e => setDraft({ ...draft, pct: e.target.value })}
          style={{ ...inputStyle, width: 56 }}
        />
        <span className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)' }}>%</span>
        <span className="lp-mono" style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>Yearly goal</span>
        <input
          type="number" min="1" value={draft.goal}
          onChange={e => setDraft({ ...draft, goal: e.target.value })}
          style={{ ...inputStyle, width: 48 }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button className="lp-tap" onClick={onSave} style={{
          flex: 1, padding: '8px 0', borderRadius: 6, border: 'none',
          background: 'var(--accent)', color: 'var(--bg)', fontFamily: 'var(--font-mono)',
          fontSize: 11, letterSpacing: '0.05em', cursor: 'pointer',
        }}>Save</button>
        <button className="lp-tap" onClick={onCancel} style={{
          flex: 1, padding: '8px 0', borderRadius: 6, border: '0.5px solid var(--hair-strong)',
          background: 'none', color: 'var(--muted)', fontFamily: 'var(--font-mono)',
          fontSize: 11, letterSpacing: '0.05em', cursor: 'pointer',
        }}>Cancel</button>
      </div>
    </div>
  );
}

export default function Books() {
  const [state, setState]     = useState(loadBooks);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(null);
  const [queueDraft, setQueueDraft] = useState('');

  useEffect(() => { saveBooks(state); }, [state]);

  const openEdit = () => {
    setDraft({
      title:  state.current?.title  || '',
      author: state.current?.author || '',
      pct:    state.current?.pct ?? 0,
      goal:   state.goal,
    });
    setEditing(true);
  };

  const saveEdit = () => {
    setState(s => ({
      ...s,
      current: draft.title.trim()
        ? {
            title:      draft.title.trim(),
            author:     draft.author.trim(),
            pct:        Math.max(0, Math.min(100, Number(draft.pct) || 0)),
            lastOpened: todayISO(),
          }
        : null,
      goal: Math.max(1, Number(draft.goal) || s.goal),
    }));
    setEditing(false);
  };

  const bumpProgress = useCallback((delta) => {
    setState(s => s.current ? {
      ...s,
      current: {
        ...s.current,
        pct:        Math.max(0, Math.min(100, s.current.pct + delta)),
        lastOpened: todayISO(),
      },
    } : s);
  }, []);

  const finishCurrent = useCallback(() => {
    setState(s => {
      if (!s.current) return s;
      const [next, ...rest] = s.queue;
      return {
        ...s,
        current: next ? { title: next.title, author: next.author, pct: 0, lastOpened: todayISO() } : null,
        queue: rest,
        finished: s.finished + 1,
      };
    });
  }, []);

  const addToQueue = () => {
    const text = queueDraft.trim();
    if (!text) return;
    const [title, author] = text.split(' — ').map(x => x?.trim());
    setState(s => ({ ...s, queue: [...s.queue, { id: Date.now(), title: title || text, author: author || '' }] }));
    setQueueDraft('');
  };

  const removeQueueItem = (id) => {
    setState(s => ({ ...s, queue: s.queue.filter(q => q.id !== id) }));
  };

  return (
    <div>
      <Eyebrow right={<EditPencil onClick={openEdit} />}>Reading · {state.finished}/{state.goal} this year</Eyebrow>

      {editing ? (
        <BooksEditor draft={draft} setDraft={setDraft} onSave={saveEdit} onCancel={() => setEditing(false)} />
      ) : (
        <>
          {state.current ? (
            <div style={{ marginTop: 12, padding: '14px 0', borderBottom: '0.5px solid var(--hair)' }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 48, height: 68, flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--bg-3), var(--bg-2))',
                  border: '0.5px solid var(--hair-strong)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}>
                  <span className="lp-display-i" style={{ fontSize: 18, color: 'var(--accent)' }}>
                    {initials(state.current.title)}
                  </span>
                  <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: 'var(--accent)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="lp-mono" style={{ fontSize: 9, color: 'var(--faint)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Now reading
                  </div>
                  <div className="lp-display" style={{ fontSize: 16, color: 'var(--text)', marginTop: 4, lineHeight: 1.2 }}>
                    {state.current.title}
                  </div>
                  <div className="lp-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
                    {state.current.author}{state.current.author ? ' · ' : ''}last opened {relativeDay(state.current.lastOpened)}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <ProgressBar pct={state.current.pct} color="var(--accent)" height={1} trackOpacity={0.1} />
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
                    <button className="lp-tap" onClick={() => bumpProgress(-5)} style={stepperBtn} aria-label="Decrease progress">−</button>
                    <span className="lp-mono lp-num" style={{ fontSize: 11, color: 'var(--text)', width: 32, textAlign: 'center' }}>
                      {state.current.pct}%
                    </span>
                    <button className="lp-tap" onClick={() => bumpProgress(5)} style={stepperBtn} aria-label="Increase progress">+</button>
                    <button className="lp-tap" onClick={finishCurrent} style={{
                      marginLeft: 'auto', fontSize: 10, color: 'var(--accent2)', background: 'none', border: 'none',
                      fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', cursor: 'pointer',
                    }}>mark finished</button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 12, padding: '14px 0', borderBottom: '0.5px solid var(--hair)' }}>
              <p className="lp-mono" style={{ fontSize: 12, color: 'var(--faint)', margin: 0 }}>
                Nothing set — tap ✎ to add what you're reading.
              </p>
            </div>
          )}

          {/* queue */}
          <div style={{ marginTop: 12 }}>
            <div className="lp-mono" style={{ fontSize: 9, color: 'var(--faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              On deck
            </div>
            {state.queue.length === 0 ? (
              <p className="lp-mono" style={{ fontSize: 11, color: 'var(--faint)', margin: 0 }}>Queue is empty.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {state.queue.map((q, i) => (
                  <div key={q.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span className="lp-mono lp-num" style={{ fontSize: 10, color: 'var(--faint)', width: 16 }}>
                      0{i + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.3 }}>{q.title}</div>
                      {q.author && <div className="lp-mono" style={{ fontSize: 9, color: 'var(--faint)' }}>{q.author}</div>}
                    </div>
                    <button
                      className="lp-tap" onClick={() => removeQueueItem(q.id)} aria-label="Remove from queue"
                      style={{ background: 'none', border: 'none', color: 'var(--faint)', fontSize: 12, cursor: 'pointer', padding: 2 }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <input
                value={queueDraft}
                onChange={e => setQueueDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addToQueue()}
                placeholder="Title — Author"
                style={{ ...inputStyle, padding: '6px 8px', fontSize: 12 }}
              />
              <button className="lp-tap" onClick={addToQueue} style={{
                fontSize: 11, color: 'var(--accent)', background: 'none',
                border: '0.5px solid var(--hair-strong)', borderRadius: 6, padding: '0 10px', cursor: 'pointer',
              }}>Add</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
