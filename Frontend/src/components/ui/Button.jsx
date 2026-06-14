import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary:   'text-white shadow-md btn-shine hover:brightness-110 active:brightness-90',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 shadow-sm',
  danger:    'text-white shadow-md btn-shine hover:brightness-110 active:brightness-90',
  success:   'text-white shadow-md btn-shine hover:brightness-110 active:brightness-90',
  ghost:     'text-slate-600 hover:bg-slate-100',
  outline:   'border-2 text-indigo-600 hover:bg-indigo-50',
}

const VARIANT_STYLES = {
  primary:   { background: 'linear-gradient(135deg,#5b5ef6,#7c3aed)', boxShadow: '0 4px 14px rgba(91,94,246,0.35)' },
  secondary: {},
  danger:    { background: 'linear-gradient(135deg,#e11d48,#f43f5e)', boxShadow: '0 4px 14px rgba(225,29,72,0.3)' },
  success:   { background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' },
  ghost:     {},
  outline:   { borderColor: '#5b5ef6' },
}

const SIZES = {
  xs: 'px-2.5 py-1 text-xs rounded-lg',
  sm: 'px-3.5 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
}

export default function Button({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false, className = '',
  style: propStyle = {},
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-semibold
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
        ${VARIANTS[variant] ?? VARIANTS.primary}
        ${SIZES[size] ?? SIZES.md}
        ${className}
      `}
      style={{
        ...(VARIANT_STYLES[variant] ?? {}),
        focusRingColor: '#5b5ef6',
        ...propStyle,
      }}
      {...props}
    >
      {loading && <Loader2 size={15} className="animate-spin shrink-0" />}
      {children}
    </button>
  )
}
