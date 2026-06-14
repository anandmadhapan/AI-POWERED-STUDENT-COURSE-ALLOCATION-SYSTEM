import { useQuery } from '@tanstack/react-query'
import { Users, BookOpen, CheckCircle2, XCircle, Zap } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { dashboardAPI } from '../services/api'
import { useAuth } from '../store/authStore'
import Card, { CardHeader } from '../components/ui/Card'
import { CHART_COLORS } from '../utils/helpers'

/* ── Stat card ─────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, grad, sub }) {
  return (
    <div className={`${grad} rounded-2xl p-4 sm:p-5 text-white relative overflow-hidden shadow-md`}>
      <div className="absolute -right-3 -top-3 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -left-3 -bottom-3 w-14 h-14 rounded-full bg-white/5 pointer-events-none" />
      <div className="flex items-start justify-between relative z-10 gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-white/70 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest mb-1.5 sm:mb-2">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold leading-none tabular-nums">{value ?? '—'}</p>
          {sub && <p className="text-white/55 text-[10px] sm:text-xs mt-1.5 sm:mt-2 leading-snug">{sub}</p>}
        </div>
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Icon size={17} />
        </div>
      </div>
    </div>
  )
}

/* ── Custom tooltip ────────────────────────────────────── */
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(15,23,42,0.12)',
      border: '1px solid #e8edf5', padding: '10px 14px', minWidth: 120,
    }}>
      {label && <p style={{ fontWeight: 600, color: '#374151', marginBottom: 6, fontSize: 11 }}>{label}</p>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.fill || p.color, flexShrink: 0 }} />
          <span style={{ color: '#6b7280', fontSize: 11 }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: '#111827', fontSize: 11 }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { isAdmin } = useAuth()

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardAPI.summary().then(r => r.data),
    staleTime: 30_000,
  })
  const { data: categoryData } = useQuery({
    queryKey: ['dashboard-category'],
    queryFn: () => dashboardAPI.categoryWise().then(r => r.data.category_summary),
    staleTime: 30_000,
  })
  const { data: courseStats } = useQuery({
    queryKey: ['dashboard-course-stats'],
    queryFn: () => dashboardAPI.courseStats().then(r => r.data.courses),
    staleTime: 30_000,
  })

  const allocationRate = summary?.allocation.allocation_rate ?? 0

  const barData = courseStats?.map(c => ({
    name: c.course_code,
    Allocated: c.allocated_seats,
    Available: c.available_seats,
  })) ?? []

  const catPie = categoryData?.map(c => ({ name: c.category, value: c.allocated })) ?? []

  const prefPie = summary ? [
    { name: '1st Pref', value: summary.preference_satisfaction.first_preference },
    { name: '2nd Pref', value: summary.preference_satisfaction.second_preference },
    { name: '3rd Pref', value: summary.preference_satisfaction.third_preference },
  ] : []

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-full">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">Real-time allocation overview</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-100 shadow-sm text-sm text-slate-500 shrink-0">
          <Zap size={13} className="text-amber-500" />
          <span className="hidden sm:block text-xs font-medium">Live data</span>
        </div>
      </div>

      {/* Student notice */}
      {!isAdmin && (
        <div className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border text-sm"
          style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af' }}>
          <span>View your personal allocation result on the{' '}
            <a href="/my-profile" className="font-bold underline underline-offset-2">My Profile</a> page.
          </span>
        </div>
      )}

      {/* ── Stat cards — 2×2 on mobile, 4-col on md+ ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Students"  value={isLoading ? '…' : summary?.total_students}                  icon={Users}        grad="grad-indigo"  sub="Registered & active" />
        <StatCard label="Total Courses"   value={isLoading ? '…' : summary?.total_courses}                   icon={BookOpen}     grad="grad-violet"  sub={`${summary?.total_seats ?? 0} total seats`} />
        <StatCard label="Allocated"       value={isLoading ? '…' : summary?.allocation.total_allocated}      icon={CheckCircle2} grad="grad-emerald" sub={`${allocationRate}% rate`} />
        <StatCard label="Not Allocated"   value={isLoading ? '…' : summary?.allocation.total_not_allocated}  icon={XCircle}      grad="grad-rose"    sub="No seat available" />
      </div>

      {/* ── Allocation rate ── */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Overall Allocation Rate</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">{allocationRate}%</p>
          </div>
          <div className="flex flex-wrap gap-4 sm:gap-6">
            {[
              { label: '1st Pref',     val: summary?.preference_satisfaction.first_preference  ?? 0, col: '#5b5ef6' },
              { label: '2nd Pref',     val: summary?.preference_satisfaction.second_preference ?? 0, col: '#d97706' },
              { label: '3rd Pref',     val: summary?.preference_satisfaction.third_preference  ?? 0, col: '#e11d48' },
              { label: 'Avail. Seats', val: summary?.total_available_seats                     ?? 0, col: '#059669' },
            ].map(s => (
              <div key={s.label} className="text-center min-w-[48px]">
                <p className="text-xl sm:text-2xl font-extrabold tabular-nums" style={{ color: s.col }}>{s.val}</p>
                <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="w-full rounded-full h-2.5 overflow-hidden" style={{ background: '#eef2ff' }}>
          <div
            className="h-2.5 rounded-full transition-all duration-1000"
            style={{
              width: `${allocationRate}%`,
              background: 'linear-gradient(90deg, #5b5ef6, #7c3aed)',
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-2">
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
      </Card>

      {/* ── Charts row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Course Seat Occupancy" subtitle="Allocated vs Available per course" />
          <div className="h-52 sm:h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barCategoryGap="28%" barGap={3}
                margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gAlloc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5b5ef6" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                  <linearGradient id="gAvail" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e0e7ff" />
                    <stop offset="100%" stopColor="#c7d2fe" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={26} />
                <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(91,94,246,0.04)', radius: 6 }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="Allocated" fill="url(#gAlloc)" radius={[5, 5, 0, 0]} />
                <Bar dataKey="Available" fill="url(#gAvail)" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Category Distribution" subtitle="Allocated students by category" />
          <div className="h-52 sm:h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={catPie} cx="50%" cy="44%"
                  innerRadius="34%" outerRadius="56%" paddingAngle={4} dataKey="value">
                  {catPie.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <Tooltip content={<ChartTip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ── Charts row 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <Card>
          <CardHeader title="Preference Satisfaction" subtitle="Which preference order was fulfilled" />
          <div className="h-48 sm:h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={prefPie} cx="50%" cy="50%"
                  outerRadius="58%" paddingAngle={5} dataKey="value"
                  label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                  labelLine={{ stroke: '#c7d2e8', strokeWidth: 1 }}>
                  {prefPie.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<ChartTip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Category Summary" subtitle="Allocation rate per reservation category" />
          <div className="space-y-3.5 sm:space-y-4 mt-1">
            {(categoryData ?? []).map((c, i) => (
              <div key={c.category}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-sm font-semibold text-slate-700">{c.category}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500">
                    <span>{c.allocated}/{c.total_students} students</span>
                    <span className="font-bold text-sm tabular-nums"
                      style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>
                      {c.allocation_rate_percent}%
                    </span>
                  </div>
                </div>
                <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: '#eef2ff' }}>
                  <div
                    className="h-2 rounded-full transition-all duration-700"
                    style={{
                      width: `${c.allocation_rate_percent}%`,
                      background: `linear-gradient(90deg,${CHART_COLORS[i % CHART_COLORS.length]},${CHART_COLORS[(i + 1) % CHART_COLORS.length]})`,
                    }}
                  />
                </div>
              </div>
            ))}
            {(!categoryData || categoryData.length === 0) && (
              <p className="text-sm text-slate-400 text-center py-6">No allocation data yet</p>
            )}
          </div>
        </Card>
      </div>

      {/* ── Course performance grid ── */}
      {courseStats?.length > 0 && (
        <Card>
          <CardHeader title="Course Performance" subtitle="Fill rate and seat utilisation per course" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {courseStats.map(c => (
              <div key={c.course_id}
                className="p-3 sm:p-4 rounded-xl border border-slate-100 bg-slate-50/70
                  hover:bg-indigo-50 hover:border-indigo-200 transition-colors cursor-default">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 mb-0.5">{c.course_code}</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate mb-2.5 sm:mb-3 leading-snug">
                  {c.course_name.split(' ').slice(0, 2).join(' ')}
                </p>
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 mb-1">
                  <span>Fill rate</span>
                  <span className="font-bold" style={{ color: '#5b5ef6' }}>{c.fill_rate_percent}%</span>
                </div>
                <div className="w-full rounded-full h-1.5 mb-2" style={{ background: '#e0e7ff' }}>
                  <div className="h-1.5 rounded-full"
                    style={{
                      width: `${c.fill_rate_percent}%`,
                      background: 'linear-gradient(90deg,#5b5ef6,#7c3aed)',
                    }} />
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-600">{c.allocated_seats}</span>/{c.total_seats} seats
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
