export function formatEventTime(iso, allDay) {
  if (allDay) return 'All day';
  if (!iso) return '';
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12; if (h === 0) h = 12;
  return m === 0 ? `${h} ${ampm}` : `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function formatEventDuration(startIso, endIso, allDay) {
  if (allDay || !startIso || !endIso) return null;
  const mins = Math.round((new Date(endIso) - new Date(startIso)) / 60000);
  if (mins <= 0) return null;
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}
