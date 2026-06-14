import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react'
import { createPortal } from 'react-dom'

const CONFIG = {
  success: {
    icon: CheckCircle2,
    bg: '#f0fdf4', border: '#86efac',
    iconColor: '#16a34a', textColor: '#14532d',
    bar: '#16a34a',
  },
  error: {
    icon: XCircle,
    bg: '#fff1f2', border: '#fca5a5',
    iconColor: '#dc2626', textColor: '#7f1d1d',
    bar: '#dc2626',
  },
  warning: {
    icon: AlertTriangle,
    bg: '#fffbeb', border: '#fcd34d',
    iconColor: '#d97706', textColor: '#78350f',
    bar: '#d97706',
  },
  info: {
    icon: Info,
    bg: '#eff6ff', border: '#93c5fd',
    iconColor: '#2563eb', textColor: '#1e3a8a',
    bar: '#2563eb',
  },
}

export default function ToastContainer({ toasts }) {
  if (!toasts.length) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        width: 320,
        maxWidth: 'calc(100vw - 32px)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => {
        const c = CONFIG[t.type] ?? CONFIG.info
        const Icon = c.icon
        return (
          <div
            key={t.id}
            role="alert"
            className="animate-toast-in"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '14px 16px',
              borderRadius: 16,
              border: `1.5px solid ${c.border}`,
              background: c.bg,
              boxShadow: '0 8px 32px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06)',
              pointerEvents: 'all',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Accent left bar */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: 4, background: c.bar, borderRadius: '16px 0 0 16px',
            }} />
            <div style={{ paddingLeft: 6, display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 }}>
              <Icon size={18} style={{ color: c.iconColor, flexShrink: 0, marginTop: 1 }} />
              <p style={{
                margin: 0, fontSize: 13, fontWeight: 500,
                color: c.textColor, lineHeight: 1.5, fontFamily: 'Inter, system-ui, sans-serif',
              }}>
                {t.message}
              </p>
            </div>
          </div>
        )
      })}
    </div>,
    document.body
  )
}
