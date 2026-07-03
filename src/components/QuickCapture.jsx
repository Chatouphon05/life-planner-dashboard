import { useState } from 'react';
import { Bullet } from './Primitives.jsx';

const CAPTURE_TYPES = [
  { kind: 'task',     label: 'Task' },
  { kind: 'event',    label: 'Event' },
  { kind: 'note',     label: 'Note' },
  { kind: 'priority', label: 'Priority' },
];

// Bottom-sheet BuJo quick-capture opened from the FAB. Only "task" and
// "priority" map onto real Notion fields today — event/note still create a
// plain task, same as everything else, since there's no bullet-kind field
// on the Tasks DB yet.
export default function QuickCapture({ onClose, writeback, refetch, defaultDate, dayLabel }) {
  const [kind, setKind] = useState('task');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState(null);

  const submit = async () => {
    if (!text.trim() || busy) return;
    setBusy(true); setErr(null);
    try {
      await writeback('create-task', null, {
        task: text.trim(),
        priority: kind === 'priority' ? 'High' : null,
        date: defaultDate,
      });
      await refetch?.();
      onClose();
    } catch {
      setErr('Could not save — try again.');
      setBusy(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 80,
      background: 'color-mix(in oklch, var(--bg) 55%, transparent)',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={(e) => e.stopPropagation()} className="lp-fade" style={{
        width: '100%', maxWidth: 480, margin: '0 auto',
        background: 'var(--bg-2)',
        borderTop: '0.5px solid var(--hair-strong)',
        borderRadius: '20px 20px 0 0',
        padding: '20px 22px calc(24px + env(safe-area-inset-bottom, 0px))',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span className="lp-eyebrow" style={{ color: 'var(--muted)' }}>
            Quick capture{dayLabel ? ` · ${dayLabel} log` : ''}
          </span>
          <span onClick={onClose} className="lp-tap" style={{ fontSize: 18, color: 'var(--faint)', lineHeight: 1 }}>×</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <Bullet kind={kind} size={14} color="var(--accent)" style={{ marginTop: 6 }} />
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="What needs logging?"
            style={{
              flex: 1, border: 0, borderBottom: '0.5px solid var(--hair-strong)',
              background: 'transparent', color: 'var(--text)',
              fontFamily: 'var(--font-body)', fontSize: 16, padding: '8px 0',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 18 }}>
          {CAPTURE_TYPES.map(c => {
            const active = kind === c.kind;
            return (
              <button key={c.kind} onClick={() => setKind(c.kind)} className="lp-tap"
                style={{
                  flex: 1, padding: '9px 0', cursor: 'pointer',
                  border: `0.5px solid ${active ? 'var(--accent)' : 'var(--hair-strong)'}`,
                  background: active ? 'color-mix(in oklch, var(--accent) 14%, transparent)' : 'transparent',
                  borderRadius: 8, color: active ? 'var(--accent)' : 'var(--muted)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                }}>
                <Bullet kind={c.kind} size={13} color="currentColor" />
                <span className="lp-mono" style={{ fontSize: 9, letterSpacing: '0.06em' }}>{c.label}</span>
              </button>
            );
          })}
        </div>

        {err && (
          <p className="lp-mono" style={{ fontSize: 11, color: 'var(--priority-high)', marginTop: 10 }}>{err}</p>
        )}

        <button onClick={submit} disabled={busy || !text.trim()} className="lp-tap" style={{
          width: '100%', marginTop: 18, padding: '13px 0', border: 0, borderRadius: 10,
          background: 'var(--accent)', color: 'var(--bg)',
          cursor: busy || !text.trim() ? 'default' : 'pointer',
          opacity: busy || !text.trim() ? 0.6 : 1,
          fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          {busy ? 'Saving…' : 'Add to log'}
        </button>
      </div>
    </div>
  );
}
