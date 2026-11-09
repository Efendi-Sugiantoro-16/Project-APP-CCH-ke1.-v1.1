import { statusMeta } from '../format.js'
import { Badge } from '../../../shared/ui/Badge.jsx'

const TONE_TO_BADGE = {
  amber: 'amber',
  sky: 'sky',
  indigo: 'indigo',
  violet: 'violet',
  green: 'green',
  neutral: 'neutral',
}

/** Complaint status pill driven by the shared status code map. */
export function StatusBadge({ code, label }) {
  const meta = statusMeta(code)
  return <Badge tone={TONE_TO_BADGE[meta.tone] || 'neutral'}>{label || meta.label}</Badge>
}

export function StatusDot({ tone }) {
  return <span className={`status-dot status-dot-${tone}`} aria-hidden="true" />
}