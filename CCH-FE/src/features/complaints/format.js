export const STATUS_META = {
  '101': { label: 'ENTRI', tone: 'amber' },
  '102': { label: 'RESPON', tone: 'sky' },
  '103': { label: 'KONFIRMASI', tone: 'indigo' },
  '104': { label: 'RESOLVED', tone: 'violet' },
  '109': { label: 'SELESAI', tone: 'green' },
}

export function statusMeta(code) {
  return STATUS_META[code] || { label: code || '—', tone: 'neutral' }
}

export function formatDateTime(value, timeZone = undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(date)
}

export function formatDateOnly(value) {
  if (!value) return '—'
  return value.slice(0, 10)
}

export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '—'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}h ${hours}j`
  if (hours > 0) return `${hours}j ${minutes}m`
  return `${minutes}m`
}

export function formatCount(value) {
  if (value === null || value === undefined) return '0';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? new Intl.NumberFormat('id-ID').format(value) : '0';
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{1,3}(\.\d{3})+$/.test(trimmed)) {
      return trimmed;
    }
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const num = Number(trimmed);
      return Number.isFinite(num) ? new Intl.NumberFormat('id-ID').format(num) : trimmed;
    }
    return value;
  }
  return String(value);
}

export function normalizeText(value) {
  return String(value || '').toLowerCase().trim()
}

export function waitingForCode(code) {
  return code === '101' || code === '102' || code === '103' || code === '104'
}