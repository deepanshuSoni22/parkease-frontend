export function escapeHtml(value) {
  return String(value ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function formatDurationMinutes(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? '1 hr' : `${hours} hrs`;
  }
  return `${minutes} min`;
}

export function roleBadgeVariant(role) {
  if (role === 'ADMIN') return 'warning';
  if (role === 'OWNER') return 'success';
  return 'secondary';
}

export function statusBadgeVariant(status) {
  return String(status).toUpperCase() === 'ACTIVE' ? 'success' : 'secondary';
}
