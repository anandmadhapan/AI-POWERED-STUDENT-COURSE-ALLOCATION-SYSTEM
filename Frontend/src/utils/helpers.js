/** Format ISO datetime → readable string (IST) */
export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata',
  })
}

export function formatDateOnly(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    dateStyle: 'medium', timeZone: 'Asia/Kolkata',
  })
}

/**
 * These are kept for backward compatibility but Badge now resolves
 * colours automatically from the label preset — no className needed.
 */
export const CATEGORY_COLOURS = {
  General: '',
  OBC:     '',
  SC:      '',
  ST:      '',
}

export const STATUS_COLOURS = {
  Allocated:       '',
  'Not Allocated': '',
  Waitlisted:      '',
  Pending:         '',
}

/** Extract readable error message from Axios error */
export function getErrorMessage(err) {
  return (
    err?.response?.data?.detail ||
    err?.response?.data?.message ||
    err?.message ||
    'An unexpected error occurred'
  )
}

/** Chart colour palette — premium indigo-led */
export const CHART_COLORS = ['#5b5ef6', '#d97706', '#059669', '#e11d48', '#7c3aed', '#0891b2']
