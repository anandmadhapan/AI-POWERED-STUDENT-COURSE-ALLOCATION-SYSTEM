import { useQuery } from '@tanstack/react-query'
import { BookOpen, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { studentsAPI } from '../services/api'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { CATEGORY_COLOURS, STATUS_COLOURS, formatDateOnly, CHART_COLORS } from '../utils/helpers'

export default function StudentProfile() {
  const { data: student, isLoading, error } = useQuery({
    queryKey: ['student-me'],
    queryFn: () => studentsAPI.me().then(r => r.data),
    staleTime: 30_000,
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: '#5b5ef6', borderTopColor: 'transparent' }} />
          <p className="text-sm">Loading your profile…</p>
        </div>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle size={40} className="text-rose-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">Profile not found</p>
          <p className="text-sm text-slate-400 mt-1">Your account is not linked to a student record.</p>
        </div>
      </div>
    )
  }

  const allocation = student.allocation_status
  const statusIcon = allocation === 'Allocated'
    ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
    : allocation === 'Pending'
      ? <Clock size={18} className="text-amber-500 shrink-0" />
      : <XCircle size={18} className="text-rose-500 shrink-0" />

  const prefs = [...(student.preferences ?? [])].sort((a, b) => a.preference_order - b.preference_order)

  /* Banner config */
  const bannerCfg = {
    Allocated:     { bg: '#f0fdf4', border: '#86efac', headCol: '#14532d', subCol: '#16a34a' },
    Pending:       { bg: '#fffbeb', border: '#fcd34d', headCol: '#78350f', subCol: '#d97706' },
    'Not Allocated': { bg: '#fff1f2', border: '#fca5a5', headCol: '#7f1d1d', subCol: '#dc2626' },
  }
  const bCfg = bannerCfg[allocation] ?? bannerCfg['Pending']

  const bannerMsg = {
    Allocated:       '🎉 Congratulations! You have been allocated a course.',
    Pending:         '⏳ Allocation is pending. Please wait for the process to run.',
    'Not Allocated': '❌ You were not allocated to any course this round.',
  }
  const bannerSub = {
    Allocated:       'Check your preferences above to see which course was assigned.',
    Pending:         'Contact your administrator for more information.',
    'Not Allocated': 'Contact your administrator for more information.',
  }

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-2xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-400 mt-0.5">Your student record and allocation result</p>
      </div>

      {/* Hero card */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
            style={{ background: 'linear-gradient(135deg,#5b5ef6,#7c3aed)' }}>
            <span className="text-white text-2xl sm:text-3xl font-extrabold">
              {student.name?.[0]?.toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 truncate">{student.name}</h2>
            <p className="text-sm font-mono font-bold" style={{ color: '#5b5ef6' }}>{student.student_id}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge dot label={student.category} />
              <div className="flex items-center gap-1.5">
                {statusIcon}
                <Badge dot label={student.allocation_status} />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Details grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'Marks',    value: student.marks,    highlight: true },
          { label: 'Category', value: student.category },
          { label: 'Applied',  value: formatDateOnly(student.application_date) },
          { label: 'Email',    value: student.email ?? '—' },
          { label: 'Phone',    value: student.phone ?? '—' },
          { label: 'Status',   value: student.allocation_status },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="p-3 sm:p-4 rounded-xl"
            style={{ background: '#fafbff', border: '1px solid #e8edf5' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
            <p className={`font-bold truncate ${
              highlight ? 'text-xl sm:text-2xl' : 'text-sm sm:text-base text-slate-800'
            }`} style={highlight ? { color: '#5b5ef6' } : {}}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Course preferences */}
      {prefs.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <BookOpen size={16} className="shrink-0" style={{ color: '#5b5ef6' }} />
            <h3 className="font-bold text-slate-800">Course Preferences</h3>
          </div>
          <div className="space-y-2">
            {prefs.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: '#fafbff', border: '1px solid #e8edf5' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-extrabold"
                  style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}>
                  P{p.preference_order}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 text-sm truncate">{p.course_name}</p>
                  <p className="text-xs text-slate-400 font-mono">{p.course_code}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Allocation result banner */}
      <div className="rounded-2xl p-4 sm:p-5 border" style={{ background: bCfg.bg, borderColor: bCfg.border }}>
        <div className="flex items-start gap-3">
          {statusIcon}
          <div className="min-w-0">
            <p className="font-bold text-sm sm:text-base leading-snug" style={{ color: bCfg.headCol }}>
              {bannerMsg[allocation] ?? bannerMsg['Pending']}
            </p>
            <p className="text-sm mt-1" style={{ color: bCfg.subCol }}>
              {bannerSub[allocation] ?? bannerSub['Pending']}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
