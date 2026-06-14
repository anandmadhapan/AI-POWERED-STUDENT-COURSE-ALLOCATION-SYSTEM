export default function Card({ children, className = '', padding = true, hover = false }) {
  return (
    <div
      className={`
        rounded-2xl
        ${hover ? 'hover:-translate-y-0.5 transition-all duration-200 cursor-pointer' : ''}
        ${padding ? 'p-4 sm:p-5' : ''}
        ${className}
      `}
      style={{
        background: '#ffffff',
        border: '1.5px solid #e8edf5',
        boxShadow: hover
          ? undefined
          : '0 1px 4px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.05)',
      }}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-4 sm:mb-5">
      <div>
        <h3 className="text-[14px] sm:text-[15px] font-semibold text-slate-800 leading-tight">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5 sm:mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 ml-4">{action}</div>}
    </div>
  )
}
