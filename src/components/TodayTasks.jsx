import { useState, useCallback } from 'react';
import { SectionHeader, TaskRow, Skeleton } from './Primitives.jsx';
import TaskHeatmap from './TaskHeatmap.jsx';
import TaskModal from './TaskModal.jsx';

// taskHistory is [{date, done, total}], oldest → newest, ending today.
// Adapt to the shared heatmap shape (last entry is the current day).
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

export default function TodayTasks({ tasks, taskHistory, loading, error, dayLabel, writeback, refetch, goals, weeklyTasks, fetchExpand }) {
  // Local overrides: { [id]: boolean }. Falls back to task.done when not set.
  const [overrides, setOverrides] = useState({});
  const [failed,    setFailed]    = useState({});

  // Modal: false = closed; null = create mode; task object = edit mode.
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask,  setEditTask]  = useState(null);

  // When a non-today tile in the heatmap is tapped, fetch and show that date's tasks instead.
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

  const effectiveDone = (t) =>
    overrides.hasOwnProperty(t.id) ? overrides[t.id] : t.done;

  const completed = displayTasks.filter(t => effectiveDone(t)).length;

  if (loading) return (
    <div>
      <SectionHeader label="Tasks" />
      <div style={{ display: 'flex', gap: 2, marginBottom: 14 }}>
        {Array(14).fill(0).map((_, i) => <Skeleton key={i} height={18} style={{ flex: 1 }} />)}
      </div>
      {[120, 80, 100].map((w, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 0', borderBottom: '0.5px dashed var(--hair)' }}>
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

  return (
    <div>
      <SectionHeader label={`Tasks · ${headerLabel}`} stat={`${completed}/${displayTasks.length}`} />
      <TaskHeatmap data={toHeatmap(taskHistory)} type="daily" onSelect={onSelectDate} />
      {dateLoading ? (
        <p className="lp-mono" style={{ fontSize: 13, color: 'var(--faint)', marginTop: 12 }}>
          Loading tasks…
        </p>
      ) : dateError ? (
        <p className="lp-mono" style={{ fontSize: 13, color: 'var(--faint)', marginTop: 12 }}>
          {dateError}
        </p>
      ) : displayTasks.length === 0 ? (
        <p className="lp-mono" style={{ fontSize: 13, color: 'var(--faint)', marginTop: 12 }}>
          {viewingOtherDate ? 'No tasks on this date.' : 'No tasks today — add one below.'}
        </p>
      ) : (
        <div>
          {displayTasks.map(t => {
              const done = effectiveDone(t);
              return (
                <TaskRow
                  key={t.id}
                  task={t.task}
                  area={t.area || undefined}
                  priority={t.priority || undefined}
                  date={t.date || undefined}
                  done={done}
                  failed={!!failed[t.id]}
                  onToggle={() => toggle(t)}
                  onEdit={() => openEdit(t)}
                />
              );
            })}
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
