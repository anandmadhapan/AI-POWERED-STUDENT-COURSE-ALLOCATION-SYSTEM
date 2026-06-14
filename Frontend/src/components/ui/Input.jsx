export default function Input({ label, error, hint, className = '', required, icon, ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-[13px] font-semibold text-slate-600 mb-1.5">
          {label}{required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          className={`inp-base ${icon ? 'pl-10' : ''} ${error ? 'inp-error' : ''}`}
          style={{ height: 40 }}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-[11px] text-rose-500 font-medium">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

export function Select({ label, error, hint, className = '', required, children, ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-[13px] font-semibold text-slate-600 mb-1.5">
          {label}{required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <select
        className={`inp-base ${error ? 'inp-error' : ''}`}
        style={{ height: 40 }}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1.5 text-[11px] text-rose-500 font-medium">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

export function Textarea({ label, error, hint, className = '', required, ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-[13px] font-semibold text-slate-600 mb-1.5">
          {label}{required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        rows={3}
        className={`inp-base resize-none ${error ? 'inp-error' : ''}`}
        style={{ height: 'auto' }}
        {...props}
      />
      {error && <p className="mt-1.5 text-[11px] text-rose-500 font-medium">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}
