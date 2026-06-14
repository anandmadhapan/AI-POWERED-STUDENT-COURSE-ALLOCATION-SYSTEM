import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Zap, RotateCcw, Info, Filter } from 'lucide-react'
import { allocationAPI } from '../services/api'
import { useToast } from '../store/toastStore'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import { CATEGORY_COLOURS, STATUS_COLOURS, getErrorMessage, formatDate } from '../utils/helpers'

export default function Allocation() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState('')
  const [runResult, setRunResult] = useState(null)
  const [activeTab, setActiveTab] = useState('results')

  const { data: allocations, isLoading } = useQuery({
    queryKey: ['allocations', statusFilter],
    queryFn: () => allocationAPI.list({ status: statusFilter || undefined, limit: 500 }).then(r => r.data),
    staleTime: 10_000,
  })
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['allocation-logs'],
    queryFn: () => allocationAPI.logs({ limit: 500 }).then(r => r.data),
    staleTime: 10_000,
    enabled: activeTab === 'logs',
  })

  const runMutation = useMutation({
    mutationFn: () => allocationAPI.run(),
    onSuccess: res => {
      setRunResult(res.data)
      setActiveTab('results')
      qc.invalidateQueries(['allocations'])
      qc.invalidateQueries(['allocation-logs'])
      qc.invalidateQueries(['dashboard-summary'])
      qc.invalidateQueries(['dashboard-category'])
      qc.invalidateQueries(['dashboard-course-stats'])
      qc.invalidateQueries(['students'])
      toast.success(`Allocation complete! ${res.data.summary?.allocated ?? 0} students allocated.`)
    },
    onError: e => toast.error(getErrorMessage(e)),
  })

  const resetMutation = useMutation({
    mutationFn: () => allocationAPI.reset(),
    onSuccess: () => {
      setRunResult(null)
      qc.invalidateQueries(['allocations'])
      qc.invalidateQueries(['allocation-logs'])
      qc.invalidateQueries(['dashboard-summary'])
      qc.invalidateQueries(['students'])
      toast.success('All allocations reset. Students reverted to Pending.')
    },
    onError: e => toast.error(getErrorMessage(e)),
  })

  const resultCols = [
    {
      key: 'student_uid', label: 'Student', width: '22%',
      render: (v, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: 'linear-gradient(135deg,#5b5ef6,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{row.student_name?.[0]?.toUpperCase() ?? 'S'}</span>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#1e293b', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.student_name}</p>
            <p style={{ margin: 0, fontSize: 11, fontFamily: 'monospace', color: '#5b5ef6', lineHeight: 1.3, marginTop: 2 }}>{v}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'allocated_category', label: 'Category', width: '12%',
      render: v => <Badge dot label={v} />,
    },
    {
      key: 'allocated_marks', label: 'Marks', align: 'center', width: '9%',
      render: v => <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{v}</span>,
    },
    {
      key: 'allocated_preference', label: 'Pref', align: 'center', width: '8%',
      render: v => v
        ? <span style={{ fontWeight: 800, fontSize: 13, color: v === 1 ? '#059669' : v === 2 ? '#d97706' : '#ea580c' }}>P{v}</span>
        : <span style={{ color: '#dde3ef' }}>—</span>,
    },
    {
      key: 'course_code', label: 'Course', width: '18%',
      render: (v, row) => v ? (
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 12, fontFamily: 'monospace', color: '#7c3aed', lineHeight: 1.3 }}>{v}</p>
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.3, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.course_name}</p>
        </div>
      ) : <span style={{ color: '#dde3ef' }}>—</span>,
    },
    {
      key: 'allocation_status', label: 'Status', width: '13%',
      render: v => <Badge dot label={v} />,
    },
    {
      key: 'allocated_at', label: 'Time', width: '16%',
      render: v => <span style={{ fontSize: 11, color: '#94a3b8' }}>{formatDate(v)}</span>,
    },
  ]

  const logCols = [
    {
      key: 'student_uid', label: 'Student', width: '20%',
      render: (v, row) => (
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 12, fontFamily: 'monospace', color: '#5b5ef6', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</p>
          <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: 1.3, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.student_name}</p>
        </div>
      ),
    },
    {
      key: 'preference_order', label: 'Pref', align: 'center', width: '8%',
      render: v => v ? <span style={{ fontWeight: 700, fontSize: 13, color: '#5b5ef6' }}>P{v}</span> : <span style={{ color: '#dde3ef' }}>—</span>,
    },
    {
      key: 'course_code', label: 'Course', width: '13%',
      render: v => v ? <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#475569' }}>{v}</span> : <span style={{ color: '#dde3ef' }}>—</span>,
    },
    {
      key: 'action', label: 'Decision', width: '13%',
      render: v => {
        const cfg = {
          Allocated:  { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
          Rejected:   { bg: '#fff1f2', color: '#dc2626', border: '#fca5a5' },
          Skipped:    { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
          Waitlisted: { bg: '#fffbeb', color: '#d97706', border: '#fcd34d' },
        }[v] ?? { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' }
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />{v}
          </span>
        )
      },
    },
    {
      key: 'remarks', label: 'Reason', wrap: true, width: '30%',
      render: v => <span style={{ fontSize: 11, color: '#94a3b8' }}>{v ?? '—'}</span>,
    },
    {
      key: 'created_at', label: 'Time', width: '16%',
      render: v => <span style={{ fontSize: 11, color: '#94a3b8' }}>{formatDate(v)}</span>,
    },
  ]

  const summary = runResult?.summary
  const metrics = summary ? [
    { label: 'Total',      val: summary.total_students,              bg: '#fafbff', text: '#1e293b', border: '#e8edf5', sub: '#94a3b8' },
    { label: 'Allocated',  val: summary.allocated,                   bg: 'linear-gradient(135deg,#059669,#10b981)', text: '#fff', border: null },
    { label: 'Not Alloc.', val: summary.not_allocated,               bg: 'linear-gradient(135deg,#e11d48,#f43f5e)', text: '#fff', border: null },
    { label: '1st Pref',   val: summary.first_preference_satisfied,  bg: 'linear-gradient(135deg,#5b5ef6,#7c3aed)', text: '#fff', border: null },
    { label: '2nd Pref',   val: summary.second_preference_satisfied, bg: 'linear-gradient(135deg,#d97706,#f59e0b)', text: '#fff', border: null },
    { label: '3rd Pref',   val: summary.third_preference_satisfied,  bg: 'linear-gradient(135deg,#ea580c,#f97316)', text: '#fff', border: null },
  ] : []

  return (
    <div className="space-y-4 sm:space-y-5 w-full">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Allocation Engine</h1>
        <p className="text-sm text-slate-400 mt-0.5">Merit-based course allocation with reservation rules</p>
      </div>

      {/* Action bar */}
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => {
              if (window.confirm('Run allocation? This will clear all existing results and re-process.')) {
                runMutation.mutate()
              }
            }}
            loading={runMutation.isPending}
          >
            <Zap size={15} />
            {runMutation.isPending ? 'Running…' : 'Run Allocation'}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm('Reset all allocations? Students will revert to Pending status.')) {
                resetMutation.mutate()
              }
            }}
            loading={resetMutation.isPending}
          >
            <RotateCcw size={14} />
            Reset All
          </Button>
          <div className="flex items-center gap-2 ml-auto">
            <Filter size={13} className="text-slate-400 shrink-0" />
            <select
              className="inp-base"
              style={{ width: 160 }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Allocated">Allocated</option>
              <option value="Not Allocated">Not Allocated</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Info banner */}
      <div className="flex gap-2.5 p-3 sm:p-4 rounded-2xl border text-xs sm:text-sm"
        style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af' }}>
        <Info size={15} className="shrink-0 mt-0.5" style={{ color: '#3b82f6' }} />
        <span>
          <strong>Algorithm:</strong> Sorted by marks ↓, date ↑.
          Reserved pool → open pool. Preferences P1 → P2 → P3. One course per student.
        </span>
      </div>

      {/* Last run summary */}
      {metrics.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Last Run Results</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            {metrics.map(s => (
              <div key={s.label}
                style={{
                  borderRadius: 16,
                  padding: '14px 12px',
                  textAlign: 'center',
                  background: s.bg,
                  color: s.text,
                  border: s.border ? `1.5px solid ${s.border}` : 'none',
                  boxShadow: s.border ? '0 1px 4px rgba(15,23,42,0.04)' : '0 4px 14px rgba(15,23,42,0.12)',
                }}>
                <p style={{ margin: 0, fontSize: 24, fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
                  {s.val}
                </p>
                <p style={{ margin: '5px 0 0', fontSize: 10, fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {[['results', 'Allocation Results'], ['logs', 'Audit Logs']].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 sm:px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all whitespace-nowrap
              ${activeTab === tab
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'results' && (
        <Table columns={resultCols} data={allocations?.allocations ?? []} loading={isLoading}
          emptyMessage="No results yet. Run the allocation engine above." />
      )}
      {activeTab === 'logs' && (
        <Table columns={logCols} data={logsData ?? []} loading={logsLoading}
          emptyMessage="No audit logs. Run the allocation engine first." />
      )}
    </div>
  )
}
