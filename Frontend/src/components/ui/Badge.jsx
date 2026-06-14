/**
 * Badge component — uses inline styles so colours are never purged by Tailwind.
 * Pass a `variant` string or `style` object directly.
 */

/* Preset variants — all inline, never purged */
const PRESETS = {
  /* Category */
  General:         { background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' },
  OBC:             { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' },
  SC:              { background: '#ede9fe', color: '#6d28d9', border: '1px solid #ddd6fe' },
  ST:              { background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' },
  /* Status */
  Allocated:       { background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' },
  'Not Allocated': { background: '#ffe4e6', color: '#9f1239', border: '1px solid #fecdd3' },
  Waitlisted:      { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' },
  Pending:         { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' },
  /* Role */
  admin:           { background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' },
  student:         { background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' },
  /* Active/Inactive */
  Active:          { background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' },
  Inactive:        { background: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3' },
}

export default function Badge({ label, variant, dot = false, className = '', style: propStyle }) {
  /* Resolve style: explicit propStyle > preset by label > preset by variant > fallback */
  const resolved = propStyle
    ?? PRESETS[label]
    ?? PRESETS[variant]
    ?? { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
        lineHeight: 1.5,
        ...resolved,
        ...propStyle,
      }}
      className={className}
    >
      {dot && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'currentColor', opacity: 0.75, flexShrink: 0,
        }} />
      )}
      {label}
    </span>
  )
}
