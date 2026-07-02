const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };

function priorityRank(p) {
  if (!p) return 3;
  for (const [key, rank] of Object.entries(PRIORITY_RANK)) {
    if (p.includes(key)) return rank;
  }
  return 3;
}

// Returns [{area: string|null, tasks: Task[]}]
// Groups sorted alphabetically; null-area group is last.
// Tasks within each group sorted High → Medium → Low → null.
export function groupByArea(tasks) {
  const map = new Map();

  for (const t of tasks) {
    const key = t.area || null;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  }

  const sortTasks = (arr) =>
    [...arr].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

  const named = [...map.entries()]
    .filter(([k]) => k !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([area, tasks]) => ({ area, tasks: sortTasks(tasks) }));

  const uncategorised = map.has(null)
    ? [{ area: null, tasks: sortTasks(map.get(null)) }]
    : [];

  return [...named, ...uncategorised];
}

// Compute the MVD task set: all High-priority undone tasks, then Medium, up to 3.
export function getMvdTasks(tasks, effectiveDone) {
  const undone = tasks.filter(t => !effectiveDone(t));
  const high   = undone.filter(t => t.priority?.includes('High'));
  const medium = undone.filter(t => t.priority?.includes('Medium'));
  return [...high, ...medium].slice(0, 3);
}
