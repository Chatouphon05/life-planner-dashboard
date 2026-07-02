import { useState, useCallback, useMemo } from 'react';
import { SectionHeader, TaskRow, Skeleton, Eyebrow } from './Primitives.jsx';
import TaskHeatmap from './TaskHeatmap.jsx';
import TaskModal from './TaskModal.jsx';
import { groupByArea, getMvdTasks } from '../utils/groupTasks.js';

function toHeatmap(taskHistory) {
  return (taskHistory || []).map((d, i, arr) => ({
    ...d,
    isCurrent: i === arr.length - 1,
  }));
}

// "2026-06-07" -> "Sunday, Jun 7"
function fmtDayLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function MvdToggle({ active, onToggle }) {
  return (
    <button
      className="lp-tap"
      onClick={onToggle}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '2px 6px', borderRadius: 4,
        color: active ? 'var(--accent)' : 'var(--faint)',
        fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
        transition: 'color 0.15s',
      }}
    >
      {active ? 'ALL TASKS' : 'FOCUS'}
    </button>
  );
}

export default function TodayTasks({ tasks, taskHistory, loading, error, dayLabel, writeback, refetch, goals, weeklyTasks, fetchExpand }) {
  const [overrides, setOverrides] = useState({});
  const [failed,    setFailed]    = useState({});
  const [mvdMode,   setMvdMode]   = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTask,  setEditTask]  = useState(null);

  const [selectedDate, setSelectedDate] = useState(null);
  const [dateTasks,    setDateTasks]    = useState(null);
  const [dateLoading,  setDateLoading]  = useState(false);
  const [dateError,    setDateError]    = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const onSelectDate = useCallback(async (dateStr) => {
    if (!dateStr || dateStr === todayStr) {
      setSelectedDate(null);
      setDateTasks(null);
      setDateError(null);
      return;
    }
    setSelectedDate(dateStr);
    setDateLoading(true);
    setDateError(null);
    try {
      const result = await fetchExpand('date', dateStr);
      setDateTasks(Array.isArray(result) ? result : []);
    } catch (err) {
      setDateError(err.message || 'Could not load tasks for this date.');
      setDateTasks([]);
    } finally {
      setDateLoading(false);
    }
  }, [fetchExpand, todayStr]);

  const viewingOtherDate = !!selectedDate;
  const displayTasks     = viewingOtherDate ? (dateTasks || []) : tasks;
  const headerLabel      = viewingOtherDate ? fmtDayLabel(selectedDate) : dayLabel;

  const openCreate = () => { setEditTask(null); setModalOpen(true); };
  const openEdit   = (t) => { setEditTask(t);  setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  const toggle = useCallback(async (task) => {
    if (failed[task.id]) return;
    const current = overrides.hasOwnProperty(task.id) ? overrides[task.id] : task.done;
    const next    = !current;
    setOverrides(o => ({ ...o, [task.id]: next }));
    try {
      await writeback('task-done', task.id, next);
    } catch {
      setOverrides(o => { const n = { ...o }; delete n[task.id]; return n; });
      setFailed(f => ({ ...f, [task.id]: true }));
      setTimeout(() => setFailed(f => { const n = { ...f }; delete n[task.id]; return n; }), 2500);
    }
  }, [overrides, failed, writeback]);

  const effectiveDone = useCallback((t) =>
    overrides.hasOwnProperty(t.id) ? overrides[t.id] : t.done,
  [overrides]);

  const completed = displayTasks.filter(t => effectiveDone(t)).length;

  if (loading) return (
    <div>
      <SectionHeader label="Tasks" />
      <div style={{ display: 'flex', gap: 2, marginBottom: 14 }}>
        {Array(14).fill(0).map((_, i) => <Skeleton key={i} height={18} style={{ flex: 1 }} />)}
      </div>
      {[120, 80, 100].map((w, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 0', borderBottom: '0.5px solid var(--hair)' }}>
          <Skeleton width={22} height={22} radius={99} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 2 }}>
            <Skeleton width={`${w}%`} height={13} />
            <Skeleton width="40%" height={9} />
          </div>
        </div>
      ))}
    </div>
  );

  if (error) return (
    <div>
      <SectionHeader label="Tasks" />
      {taskHistory?.length > 0 && <TaskHeatmap data={toHeatmap(taskHistory)} type="daily" />}
      <p className="lp-mono" style={{ fontSize: 13, color: 'var(--faint)', marginTop: 12 }}>
        Could not reach Notion — pull down to retry.
      </p>
    </div>
  );

  const weeklyById = useMemo(
    () => new Map((weeklyTasks || []).map(w => [w.id, w])),
    [weeklyTasks]
  );
  const goalById = useMemo(
    () => new Map((goals || []).map(g => [g.id, g])),
    [goals]
  );

  const mvdTasks   = getMvdTasks(tasks, effectiveDone);
  const mvdAllDone = mvdMode && mvdTasks.length > 0 && mvdTasks.every(t => effectiveDone(t));
  const hiddenCount = tasks.length - mvdTasks.length;

  const renderTask = (t) => {
    const done = effectiveDone(t);

    const weeklyParent = t.weeklyTaskId ? weeklyById.get(t.weeklyTaskId) : null;
    const goal         = t.goalId       ? goalById.get(t.goalId)         : null;
    const lineage = (weeklyParent || goal)
      ? { weekly: weeklyParent?.task || null, goal: goal?.name || null }
      : null;

    return (
      <TaskRow
        key={t.id}
        task={t.task}
        area={t.area || undefined}
        priority={t.priority || undefined}
        date={t.date || undefined}
        done={done}
        failed={!!failed[t.id]}
        lineage={lineage}
        onToggle={() => toggle(t)}
        onEdit={() => openEdit(t)}
      />
    );
  };

  const sectionLabel = viewingOtherDate
    ? `Tasks · ${headerLabel}`
    : mvdMode ? 'Just these today' : `Tasks · ${dayLabel}`;
  const sectionStat = (mvdMode && !viewingOtherDate)
    ? undefined
    : `${completed}/${displayTasks.length}`;

  return (
    <div>
      <SectionHeader
        label={sectionLabel}
        stat={sectionStat}
        right={!viewingOtherDate && tasks.length > 0 && <MvdToggle active={mvdMode} onToggle={() => setMvdMode(m => !m)} />}
      />
      <TaskHeatmap data={toHeatmap(taskHistory)} type="daily" onSelect={onSelectDate} />

      {dateLoading ? (
        <p className="lp-mono" style={{ fontSize: 13, color: 'var(--faint)', marginTop: 12 }}>
          Loading tasks…
        </p>
      ) : dateError ? (
        <p className="lp-mono" style={{ fontSize: 13, color: 'var(--faint)', marginTop: 12 }}>
          {dateError}
        </p>
      ) : viewingOtherDate ? (
        // ── Selected-date view (flat, no MVD) ────────────────────────────
        displayTasks.length === 0 ? (
          <p className="lp-mono" style={{ fontSize: 13, color: 'var(--faint)', marginTop: 12 }}>
            No tasks on this date.
          </p>
        ) : (
          <div>{displayTasks.map(renderTask)}</div>
        )
      ) : tasks.length === 0 ? (
        <p className="lp-mono" style={{ fontSize: 13, color: 'var(--faint)', marginTop: 12 }}>
          No tasks today — add one below.
        </p>
      ) : mvdMode ? (
        // ── Minimum Viable Day view ───────────────────────────────────────
        <div>
          {mvdTasks.length === 0 ? (
            <p className="lp-display-i" style={{ color: 'var(--muted)', fontSize: 15, marginTop: 8, lineHeight: 1.65 }}>
              No high or medium priority tasks — you're clear to choose freely today.
            </p>
          ) : mvdAllDone ? (
            <p className="lp-display-i lp-fade" style={{ color: 'var(--muted)', fontSize: 15, marginTop: 8, lineHeight: 1.65 }}>
              That counts. Everything else is still here when you want it.
            </p>
          ) : (
            mvdTasks.map(renderTask)
          )}

          {hiddenCount > 0 && (
            <button
              className="lp-tap lp-mono"
              onClick={() => setMvdMode(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                marginTop: 12, padding: 0,
                fontSize: 11, color: 'var(--faint)', letterSpacing: '0.06em',
              }}
            >
              Show all ({hiddenCount} more)
            </button>
          )}
        </div>
      ) : (
        // ── Normal view with section grouping ────────────────────────────
        <div>
          {groupByArea(tasks).map(({ area, tasks: group }) => (
            <div key={area ?? '__none__'} style={{ marginBottom: 8 }}>
              {area && (
                <div style={{ marginBottom: 4 }}>
                  <Eyebrow count={group.length}>{area}</Eyebrow>
                </div>
              )}
              {group.map(renderTask)}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <button
          className="lp-tap"
          onClick={openCreate}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 0', borderRadius: 10, border: '1px solid color-mix(in oklch, var(--accent) 45%, transparent)',
            background: 'color-mix(in oklch, var(--accent) 8%, var(--bg-2))', cursor: 'pointer',
          }}
        >
          <span className="lp-mono" style={{ fontSize: 14, color: 'var(--accent)' }}>+</span>
          <span className="lp-mono" style={{ fontSize: 12, color: 'var(--accent)', letterSpacing: '0.10em' }}>ADD TASK</span>
        </button>
      </div>

      {modalOpen && (
        <TaskModal
          task={editTask}
          onClose={closeModal}
          writeback={writeback}
          refetch={refetch}
          defaultDate={selectedDate || todayStr}
          goals={goals}
          weeklyTasks={weeklyTasks}
          fetchExpand={fetchExpand}
        />
      )}
    </div>
  );
}
