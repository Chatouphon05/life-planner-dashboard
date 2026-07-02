export function areaColor(area) {
  if (!area) return 'var(--accent)';
  if (area.includes('Learning'))     return 'var(--area-learning)';
  if (area.includes('Work'))         return 'var(--area-work)';
  if (area.includes('Health'))       return 'var(--area-health)';
  if (area.includes('Mental'))       return 'var(--area-mental)';
  if (area.includes('Relationship')) return 'var(--area-relationships)';
  if (area.includes('Life'))         return 'var(--area-life)';
  return 'var(--accent)';
}
