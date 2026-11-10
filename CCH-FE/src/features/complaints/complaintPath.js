/**
 * Ticket status helpers.
 *
 * CCH treats status `109` (SELESAI) as terminal. The backend deliberately
 * separates open and completed routes: open detail queries add
 * `Status_Akhir <> '109'`, so requesting an open-detail URL for a closed ticket
 * returns 404 (indistinguishable from "does not exist" by design).
 *
 * Every link into a ticket detail page must therefore resolve its route from the
 * ticket's current status. These helpers are the single source of that rule.
 */

const CLOSED_STATUS_CODE = '109'

/** Route prefixes for the two detail variants in `app/routes.jsx`. */
export const COMPLAINT_DETAIL_PATHS = {
  open: '/workspace/complaints/open',
  completed: '/workspace/complaints/completed',
}

/**
 * Resolve a ticket's status code across the shapes returned by the different
 * list endpoints (call-center summary, dashboard list, reports, analytics).
 */
export function complaintStatusCode(item) {
  if (!item) return ''
  return String(
    item.status_code ??
      item.latest_status_code ??
      item.final_status_code ??
      item.status ??
      '',
  ).trim()
}

/** True when the ticket is terminal (status 109 / SELESAI). */
export function isClosedComplaint(item) {
  return complaintStatusCode(item) === CLOSED_STATUS_CODE
}

/** True when the ticket is still open and therefore served by the open routes. */
export function isOpenComplaint(item) {
  const code = complaintStatusCode(item)
  return code !== '' && code !== CLOSED_STATUS_CODE
}

/**
 * Detail path for a ticket, chosen from its status.
 *
 * `fallback` decides the route when the status is unknown (some report payloads
 * omit it); it defaults to the open route because that is the common case.
 */
export function complaintDetailPath(item, { fallback = 'open' } = {}) {
  const id = item?.id ?? item?.complaint_id ?? item?.ticket_id ?? ''
  if (!id) return COMPLAINT_DETAIL_PATHS[fallback] || COMPLAINT_DETAIL_PATHS.open

  const code = complaintStatusCode(item)
  if (code === CLOSED_STATUS_CODE) return `${COMPLAINT_DETAIL_PATHS.completed}/${id}`
  if (code !== '') return `${COMPLAINT_DETAIL_PATHS.open}/${id}`

  const base = COMPLAINT_DETAIL_PATHS[fallback] || COMPLAINT_DETAIL_PATHS.open
  return `${base}/${id}`
}