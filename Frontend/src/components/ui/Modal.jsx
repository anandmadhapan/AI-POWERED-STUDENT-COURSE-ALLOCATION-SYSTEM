import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const sizeClass = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size] ?? 'max-w-lg'

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Render into document.body via portal — bypasses any overflow:hidden parent
  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{
          position: 'relative',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 32px 80px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15,23,42,0.06)',
          width: '100%',
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'modal-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        }}
        className={sizeClass}
        // stop clicks inside panel from closing
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px 16px',
            borderBottom: '1px solid #f1f5f9',
            flexShrink: 0,
          }}
        >
          <h2
            id="modal-title"
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h2>

          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              border: '1.5px solid #e2e8f0',
              background: '#f8fafc',
              cursor: 'pointer',
              color: '#64748b',
              flexShrink: 0,
              marginLeft: '12px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#fee2e2'
              e.currentTarget.style.borderColor = '#fca5a5'
              e.currentTarget.style.color = '#ef4444'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#f8fafc'
              e.currentTarget.style.borderColor = '#e2e8f0'
              e.currentTarget.style.color = '#64748b'
            }}
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────── */}
        <div
          style={{
            overflowY: 'auto',
            flex: 1,
            padding: '20px 24px 24px',
          }}
        >
          {children}
        </div>
      </div>

      {/* Keyframe style injected once */}
      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.94) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  )
}
