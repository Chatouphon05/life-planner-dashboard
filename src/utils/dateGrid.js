// Hand-rolled calendar-grid date math (no date lib), consistent with the
// rest of the codebase's native-Date approach (see useNotionData.js).
// All dateStr values are YYYY-MM-DD, all math done via Date.UTC to avoid
// local-timezone off-by-one bugs.

export function addDaysStr(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().split('T')[0];
}

export function dowOfDateStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
}

export function firstOfMonthStr(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  return `${y}-${String(m).padStart(2, '0')}-01`;
}

export function addMonthsStr(dateStr, n) {
  const [y, m] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
