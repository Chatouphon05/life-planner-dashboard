import { useState, useEffect } from 'react';

const PRIORITIES = ['High', 'Medium', 'Low'];
const STATUSES   = ['Not Started', 'In Progress', 'Done', 'Dropped'];
const MONTHS     = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKS      = Array.from({ length: 52 }, (_, i) => `W${String(i + 1).padStart(2, '0')}`);

// Priority from Notion may arrive as "🔴 High" or plain "High" — normalise to the plain word.
function stripPriority(p) {
  if (!p) return '';
  return PRIORITIES.find(x => p.includes(x)) || '';
}

// level: 'weekly' | 'monthly'
export default function PlanTaskModal({ task, level, onClose, writeback, refetch, defaultPeriod, goals, monthlyTasks, quarterlyActions, fetchExpand }) {
  const isEdit       = !!task;
  const periodKey    = level === 'weekly' ? 'week' : 'month';
  const periodOptions = level === 'weekly' ? WEEKS : MONTHS;

  const [name,              setName]              = useState(task?.task || '');
  const [priority,          setPriority]          = useState(stripPriority(task?.priority));
  const [status,            setStatus]            = useState(task?.status || 'Not Started');
  const [period,            setPeriod]            = useState(task?.[periodKey] || defaultPeriod);
  const [notes,             setNotes]             = useState(task?.notes || '');
  const [goalId,            setGoalId]            = useState(task?.goalId || '');
  const [monthlyTaskId,     setMonthlyTaskId]     = useState(task?.monthlyTaskId || '');
  const [deadline,          setDeadline]          = useState(task?.deadline || '');
  const [quarterlyActionId, setQuarterlyActionId] = useState(task?.quarterlyActionId || '');
  const [busy,              setBusy]              = useState(false);
  const [err,               setErr]               = useState(null);
  const [confirmDelete,     setConfirmDelete]     = useState(false);

  const [periodTasks,   setPeriodTasks]   = useState(null);
  const [periodLoading, setPeriodLoading] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Show what's already in the selected week/month so duplicates/clashes are obvious before saving.
  useEffect(() => {
    if (!period || !fetchExpand) return;
    let cancelled = false;
    setPeriodLoading(true);
    fetchExpand(periodKey, period)
      .then(list => { if (!cancelled) setPeriodTasks(list); })
      .catch(() => { if (!cancelled) setPeriodTasks(null); })
      .finally(() => { if (!cancelled) setPeriodLoading(false); });
    return () => { cancelled = true; };
  }, [period, periodKey, fetchExpand]);

  const save = async () => {
    if (!name.trim() || busy) return;
    setBusy(true); setErr(null);
    try {
      const value = {
        task: name.trim(), priority: priority || null, status,
        [periodKey]: period,
        notes: notes.trim() || null,
        goalId: goalId || null,
        ...(level === 'weekly'
          ? { monthlyTaskId: monthlyTaskId || null }
          : { deadline: deadline || null, quarterlyActionId: quarterlyActionId || null }),
      };
      const createType = level === 'weekly' ? 'create-weekly-task' : 'create-monthly-task';
      const updateType = level === 'weekly' ? 'update-weekly-task' : 'update-monthly-task';
      if (isEdit) await writeback(updateType, task.id, value);
      else        await writeback(createType, null, value);
      await refetch?.();
      onClose();
    } catch {
      setErr('Could not save — try again.');
      setBusy(false);
    }
  };

  const del = async () => {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      await writeback('delete-task', task.id, null);
      await refetch?.();
      onClose();
    } catch {
      setErr('Could not delete — try again.');
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460, margin: 'auto',
          background: 'var(--bg-2)', border: '0.5px solid var(--hair-strong)',
          borderRadius: 16, padding: '20px 18px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="lp-mono" style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            {isEdit ? `Edit ${level} task` : `New ${level} task`}
          </span>
          <button className="lp-tap" onClick={onClose} aria-label="Close"
            style={{ background: 'none', border: 'none', color: 'var(--faint)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>
            ×
          </button>
        </div>

        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); }}
          placeholder="Task name…"
          style={{
            background: 'var(--bg)', border: '0.5px solid var(--hair-strong)', borderRadius: 8,
            outline: 'none', color: 'var(--text)', fontSize: 16,
            fontFamily: 'var(--font-body)', padding: '10px 12px', width: '100%',
          }}
        />

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="lp-mono" style={{ fontSize: 10, color: 'var(--faint)', letterSpacing: '0.08em' }}>PRIORITY</span>
          {PRIORITIES.map(p => (
            <button key={p} className="lp-tap" onClick={() => setPriority(priority === p ? '' : p)}
              style={{
                padding: '4px 10px', borderRadius: 6, border: '0.5px solid var(--hair-strong)',
                background: priority === p ? 'color-mix(in oklch, var(--accent) 20%, var(--bg-2))' : 'transparent',
                color: priority === p ? 'var(--accent)' : 'var(--faint)',
                fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', letterSpacing: '0.06em',
              }}>
              {p}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="lp-mono" style={{ fontSize: 10, color: 'var(--faint)', letterSpacing: '0.08em' }}>STATUS</span>
          {STATUSES.map(s => (
            <button key={s} className="lp-tap" onClick={() => setStatus(s)}
              style={{
                padding: '4px 10px', borderRadius: 6, border: '0.5px solid var(--hair-strong)',
                background: status === s ? 'color-mix(in oklch, var(--accent) 20%, var(--bg-2))' : 'transparent',
                color: status === s ? 'var(--accent)' : 'var(--faint)',
                fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', letterSpacing: '0.06em',
              }}>
              {s}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="lp-mono" style={{ fontSize: 10, color: 'var(--faint)', letterSpacing: '0.08em' }}>
            {level === 'weekly' ? 'WEEK' : 'MONTH'}
          </span>
          <select
            value={period || ''}
            onChange={e => setPeriod(e.target.value)}
            style={{
              background: 'var(--bg)', border: '0.5px solid var(--hair-strong)', borderRadius: 6,
              outline: 'none', color: 'var(--text)', fontSize: 13,
              fontFamily: 'var(--font-mono)', padding: '5px 8px', colorScheme: 'dark',
            }}
          >
            {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {level === 'monthly' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="lp-mono" style={{ fontSize: 10, color: 'var(--faint)', letterSpacing: '0.08em' }}>DEADLINE</span>
            <input
              type="date"
              value={deadline || ''}
              onChange={e => setDeadline(e.target.value)}
              style={{
                background: 'var(--bg)', border: '0.5px solid var(--hair-strong)', borderRadius: 6,
                outline: 'none', color: 'var(--text)', fontSize: 13,
                fontFamily: 'var(--font-mono)', padding: '5px 8px', colorScheme: 'dark',
              }}
            />
            {deadline && (
              <button className="lp-tap" onClick={() => setDeadline('')}
                style={{ background: 'none', border: 'none', color: 'var(--faint)', fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
                clear
              </button>
            )}
          </div>
        )}

        {(periodLoading || (periodTasks && periodTasks.length > 0)) && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 5,
            padding: '8px 10px', borderRadius: 8,
            background: 'var(--bg)', border: '0.5px solid var(--hair)',
          }}>
            <span className="lp-mono" style={{ fontSize: 10, color: 'var(--faint)', letterSpacing: '0.08em' }}>
              {periodLoading ? `LOADING TASKS IN THIS ${level === 'weekly' ? 'WEEK' : 'MONTH'}…` : `TASKS IN THIS ${level === 'weekly' ? 'WEEK' : 'MONTH'} (${periodTasks.length})`}
            </span>
            {!periodLoading && periodTasks
              .filter(t => !isEdit || t.id !== task.id)
              .map(t => (
                <span key={t.id} className="lp-mono" style={{
                  fontSize: 12,
                  color: t.status === 'Done' ? 'var(--faint)' : 'var(--text)',
                  textDecoration: t.status === 'Done' ? 'line-through' : 'none',
                }}>
                  {t.task}
                </span>
              ))}
          </div>
        )}

        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes…"
          rows={2}
          style={{
            background: 'var(--bg)', border: '0.5px solid var(--hair-strong)', borderRadius: 8,
            outline: 'none', color: 'var(--text)', fontSize: 14, resize: 'vertical',
            fontFamily: 'var(--font-body)', padding: '8px 12px', width: '100%',
          }}
        />

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <label style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="lp-mono" style={{ fontSize: 10, color: 'var(--faint)', letterSpacing: '0.08em' }}>GOAL</span>
            <select
              value={goalId}
              onChange={e => setGoalId(e.target.value)}
              style={{
                background: 'var(--bg)', border: '0.5px solid var(--hair-strong)', borderRadius: 6,
                outline: 'none', color: 'var(--text)', fontSize: 12,
                fontFamily: 'var(--font-mono)', padding: '6px 8px', width: '100%',
              }}
            >
              <option value="">— none —</option>
              {(goals || []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </label>
          {level === 'weekly' && (
            <label style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="lp-mono" style={{ fontSize: 10, color: 'var(--faint)', letterSpacing: '0.08em' }}>MONTHLY TASK</span>
              <select
                value={monthlyTaskId}
                onChange={e => setMonthlyTaskId(e.target.value)}
                style={{
                  background: 'var(--bg)', border: '0.5px solid var(--hair-strong)', borderRadius: 6,
                  outline: 'none', color: 'var(--text)', fontSize: 12,
                  fontFamily: 'var(--font-mono)', padding: '6px 8px', width: '100%',
                }}
              >
                <option value="">— none —</option>
                {(monthlyTasks || []).map(m => <option key={m.id} value={m.id}>{m.task}</option>)}
              </select>
            </label>
          )}
          {level === 'monthly' && (
            <label style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="lp-mono" style={{ fontSize: 10, color: 'var(--faint)', letterSpacing: '0.08em' }}>QUARTERLY ACTION</span>
              <select
                value={quarterlyActionId}
                onChange={e => setQuarterlyActionId(e.target.value)}
                style={{
                  background: 'var(--bg)', border: '0.5px solid var(--hair-strong)', borderRadius: 6,
                  outline: 'none', color: 'var(--text)', fontSize: 12,
                  fontFamily: 'var(--font-mono)', padding: '6px 8px', width: '100%',
                }}
              >
                <option value="">— none —</option>
                {(quarterlyActions || []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
          )}
        </div>

        {err && (
          <p className="lp-mono" style={{ fontSize: 11, color: 'var(--accent)', margin: 0 }}>{err}</p>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
          {isEdit && (
            confirmDelete ? (
              <button className="lp-tap" onClick={del} disabled={busy}
                style={{
                  padding: '8px 12px', borderRadius: 8, border: '0.5px solid color-mix(in oklch, red 50%, transparent)',
                  background: 'color-mix(in oklch, red 14%, var(--bg-2))', color: 'tomato',
                  fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', letterSpacing: '0.06em',
                }}>
                {busy ? '…' : 'CONFIRM DELETE'}
              </button>
            ) : (
              <button className="lp-tap" onClick={() => setConfirmDelete(true)} disabled={busy}
                style={{
                  padding: '8px 12px', borderRadius: 8, border: '0.5px solid var(--hair-strong)',
                  background: 'transparent', color: 'var(--faint)',
                  fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', letterSpacing: '0.06em',
                }}>
                DELETE
              </button>
            )
          )}
          <div style={{ flex: 1 }} />
          <button className="lp-tap" onClick={save} disabled={!name.trim() || busy}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              cursor: name.trim() ? 'pointer' : 'default',
              background: name.trim() ? 'var(--accent)' : 'var(--bg-3)',
              color: name.trim() ? 'var(--bg)' : 'var(--faint)',
              fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
            }}>
            {busy ? '…' : isEdit ? 'SAVE' : 'ADD'}
          </button>
        </div>
      </div>
    </div>
  );
}
