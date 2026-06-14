import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { UserPlus, Search, Edit2, Trash2, Eye, X, KeyRound } from 'lucide-react'
import { studentsAPI, coursesAPI, authAPI } from '../services/api'
import { useToast } from '../store/toastStore'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { getErrorMessage, formatDateOnly } from '../utils/helpers'

const CATEGORIES = ['General', 'OBC', 'SC', 'ST']

/* ── Shared inline select style — no Tailwind color interference ── */
const SELECT_STYLE = (w = 148) => ({
  height: 40, borderRadius: 10, border: '1.5px solid #e2e8f0',
  paddingLeft: 12, paddingRight: 32, fontSize: 13, fontWeight: 500,
  color: '#0f172a', background: '#ffffff',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
  appearance: 'none', WebkitAppearance: 'none', outline: 'none',
  cursor: 'pointer', flexShrink: 0,
  fontFamily: 'Inter, system-ui, sans-serif', boxSizing: 'border-box', width: w,
})

function StudentForm({ defaultValues, onSubmit, loading, courses, isEdit }) {
  const { register, handleSubmit, control, watch, formState: { errors } } = useForm({
    defaultValues: defaultValues ?? {
      name: '', email: '', phone: '',
      marks: '', category: 'General',
      application_date: new Date().toISOString().slice(0, 16),
      preferences: [{ course_id: '', preference_order: 1 }],
      create_account: true,
      login_username: '',
      login_password: '',
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'preferences' })
  const createAccount = watch('create_account')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

      {/* Personal Details */}
      <div className="p-3 rounded-xl border space-y-3" style={{ background: '#fafbff', borderColor: '#e8edf5' }}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Personal Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Full Name" required placeholder="John Doe" error={errors.name?.message}
            {...register('name', { required: 'Required', minLength: { value: 2, message: 'Min 2 chars' } })} />
          <Input label="Email" type="email" placeholder="john@example.com" {...register('email')} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Phone" placeholder="+91 9876543210" {...register('phone')} />
          <Input label="Marks (0–100)" type="number" step="0.1" required placeholder="85.5"
            error={errors.marks?.message}
            {...register('marks', { required: 'Required', min: { value: 0, message: 'Min 0' }, max: { value: 100, message: 'Max 100' } })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Category — fully inline-styled to avoid Tailwind v4 reset */}
          <Controller control={control} name="category"
            render={({ field }) => (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  Category <span style={{ color: '#f43f5e' }}>*</span>
                </label>
                <select {...field} style={{ ...SELECT_STYLE(), width: '100%', background: '#fafbff' }}>
                  {CATEGORIES.map(c => <option key={c} value={c} style={{ color: '#0f172a' }}>{c}</option>)}
                </select>
              </div>
            )}
          />
          <Input label="Application Date" type="datetime-local" required error={errors.application_date?.message}
            {...register('application_date', { required: 'Required' })} />
        </div>
      </div>

      {/* Course Preferences */}
      <div className="p-3 rounded-xl border space-y-2" style={{ background: '#fafbff', borderColor: '#e8edf5' }}>
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Course Preferences <span className="text-rose-500">*</span>
          </p>
          {fields.length < 3 && (
            <button type="button"
              onClick={() => append({ course_id: '', preference_order: fields.length + 1 })}
              style={{
                fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
                border: 'none', background: 'transparent', cursor: 'pointer', color: '#5b5ef6',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#eef2ff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              + Add
            </button>
          )}
        </div>
        {fields.map((field, idx) => (
          <div key={field.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', background: '#fff', borderRadius: 10,
            border: '1px solid #f1f5f9',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', width: 24, flexShrink: 0 }}>P{idx + 1}</span>
            <Controller control={control} name={`preferences.${idx}.course_id`} rules={{ required: true }}
              render={({ field }) => (
                <select {...field} style={{
                  flex: 1, minWidth: 0, height: 36, borderRadius: 8,
                  border: '1.5px solid #e2e8f0', paddingLeft: 10, paddingRight: 28,
                  fontSize: 13, color: '#0f172a', background: '#fafbff',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
                  appearance: 'none', WebkitAppearance: 'none',
                  outline: 'none', fontFamily: 'Inter, system-ui, sans-serif', boxSizing: 'border-box',
                }}>
                  <option value="" style={{ color: '#94a3b8' }}>— Select course —</option>
                  {(courses ?? []).map(c => (
                    <option key={c.id} value={c.id} style={{ color: '#0f172a' }}>{c.course_code} – {c.course_name}</option>
                  ))}
                </select>
              )}
            />
            {idx > 0 && (
              <button type="button" onClick={() => remove(idx)}
                style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 26, height: 26, borderRadius: 7, border: 'none',
                  background: 'transparent', cursor: 'pointer', color: '#cbd5e1', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#e11d48'; e.currentTarget.style.background = '#fff1f2' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = 'transparent' }}>
                <X size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Login Account (create only) */}
      {!isEdit && (
        <div className="p-3 rounded-xl border space-y-3" style={{ background: '#eef2ff', borderColor: '#c7d2fe' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound size={13} style={{ color: '#5b5ef6' }} className="shrink-0" />
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#4f46e5' }}>Login Account</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded accent-indigo-600" {...register('create_account')} />
              <span className="text-xs font-semibold" style={{ color: '#4338ca' }}>Create account</span>
            </label>
          </div>
          {createAccount && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Username" required placeholder="john2026" error={errors.login_username?.message}
                {...register('login_username', createAccount ? { required: 'Required' } : {})} />
              <Input label="Password" type="password" required placeholder="••••••••" error={errors.login_password?.message}
                {...register('login_password', createAccount ? { required: 'Required', minLength: { value: 4, message: 'Min 4 chars' } } : {})} />
            </div>
          )}
          {!createAccount && (
            <p className="text-xs" style={{ color: '#6366f1' }}>Student account can be created later from the Users page.</p>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
        <Button type="submit" loading={loading}>
          {isEdit ? 'Save Changes' : 'Register Student'}
        </Button>
      </div>
    </form>
  )
}

/* ── Action icon button ───────────────────────────────── */
function ActionBtn({ children, onClick, title, color, hoverBg }) {
  return (
    <button onClick={onClick} title={title} aria-label={title}
      onMouseEnter={e => { e.currentTarget.style.color = color; e.currentTarget.style.background = hoverBg }}
      onMouseLeave={e => { e.currentTarget.style.color = '#c9d1de'; e.currentTarget.style.background = 'transparent' }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 30, borderRadius: 8, border: 'none',
        background: 'transparent', cursor: 'pointer',
        color: '#c9d1de', transition: 'all 0.15s ease', flexShrink: 0,
      }}>
      {children}
    </button>
  )
}

export default function Students() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState(null)
  const [serverError, setServerError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['students', search, category, statusFilter],
    queryFn: () => studentsAPI.list({
      search: search || undefined,
      category: category || undefined,
      allocation_status: statusFilter || undefined,
      limit: 200,
    }).then(r => r.data),
    staleTime: 10_000,
  })
  const { data: coursesData } = useQuery({
    queryKey: ['courses-list'],
    queryFn: () => coursesAPI.list({ is_active: true, limit: 100 }).then(r => r.data),
    staleTime: 60_000,
  })

  const createMutation = useMutation({
    mutationFn: d => authAPI.registerStudent(d),
    onSuccess: (res) => {
      qc.invalidateQueries(['students']); qc.invalidateQueries(['users'])
      setModal(null); setServerError('')
      if (res.data.account_created) toast.success(`Student registered! Login: ${res.data.username}`)
      else toast.success('Student registered successfully.')
    },
    onError: e => setServerError(getErrorMessage(e)),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => studentsAPI.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['students']); setModal(null); setServerError('')
      toast.success('Student updated successfully.')
    },
    onError: e => setServerError(getErrorMessage(e)),
  })
  const deleteMutation = useMutation({
    mutationFn: id => studentsAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries(['students']); toast.success('Student deleted.') },
    onError: e => toast.error(getErrorMessage(e)),
  })

  function formatPrefs(preferences) {
    return (preferences ?? [])
      .sort((a, b) => a.preference_order - b.preference_order)
      .map(p => `P${p.preference_order}:${p.course_code ?? p.course_id}`)
      .join(' · ')
  }

  function buildCreatePayload(fd) {
    return {
      name: fd.name, email: fd.email || null, phone: fd.phone || null,
      marks: parseFloat(fd.marks), category: fd.category,
      application_date: fd.application_date,
      preferences: fd.preferences.filter(p => p.course_id)
        .map((p, i) => ({ course_id: parseInt(p.course_id), preference_order: i + 1 })),
      login_username: fd.create_account ? fd.login_username : '',
      login_password: fd.create_account ? fd.login_password : '',
    }
  }

  function buildUpdatePayload(fd) {
    // eslint-disable-next-line no-unused-vars
    const { student_id, create_account, login_username, login_password, ...rest } = fd
    return {
      ...rest, marks: parseFloat(fd.marks),
      preferences: fd.preferences.filter(p => p.course_id)
        .map((p, i) => ({ course_id: parseInt(p.course_id), preference_order: i + 1 })),
    }
  }

  const columns = [
    {
      key: '_sno', label: '#', align: 'center', width: '48px',
      render: (_, _row, i) => <span style={{ color: '#b0bac9', fontSize: 12, fontWeight: 600 }}>{i + 1}</span>,
    },
    {
      key: 'name', label: 'Student', width: '20%',
      render: (v, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(135deg,#5b5ef6,#7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{v?.[0]?.toUpperCase()}</span>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#1e293b', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</p>
            <p style={{ margin: 0, fontSize: 11, fontFamily: 'monospace', color: '#5b5ef6', lineHeight: 1.3, marginTop: 2 }}>{row.student_id}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category', label: 'Category', align: 'center', width: '13%',
      render: v => <Badge dot label={v} />,
    },
    {
      key: 'marks', label: 'Marks', align: 'center', width: '13%',
      render: v => <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{v}</span>,
    },
    {
      key: 'application_date', label: 'Applied', align: 'center', width: '13%',
      render: v => <span style={{ fontSize: 12, color: '#94a3b8' }}>{formatDateOnly(v)}</span>,
    },
    {
      key: 'allocation_status', label: 'Status', align: 'center', width: '13%',
      render: v => <Badge dot label={v} />,
    },
    {
      key: 'preferences', label: 'Preferences', width: '20%',
      render: v => (
        <span style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap' }}>
          {formatPrefs(v)}
        </span>
      ),
    },
    {
      key: '_actions', label: 'Actions', align: 'right', width: '96px',
      render: (_, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
          <ActionBtn onClick={() => setModal({ mode: 'view', data: row })} title="View" color="#5b5ef6" hoverBg="#eef2ff"><Eye size={14} /></ActionBtn>
          <ActionBtn onClick={() => { setServerError(''); setModal({ mode: 'edit', data: row }) }} title="Edit" color="#d97706" hoverBg="#fffbeb"><Edit2 size={14} /></ActionBtn>
          <ActionBtn onClick={() => { if (window.confirm(`Delete "${row.name}"?`)) deleteMutation.mutate(row.id) }} title="Delete" color="#e11d48" hoverBg="#fff1f2"><Trash2 size={14} /></ActionBtn>
        </div>
      ),
    },
  ]

  const ErrorAlert = () => serverError ? (
    <div style={{
      marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '10px 14px', borderRadius: 12,
      border: '1px solid #fca5a5', background: '#fff1f2',
    }}>
      <span style={{ color: '#dc2626', flexShrink: 0 }}>⚠</span>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#9f1239' }}>{serverError}</p>
    </div>
  ) : null

  const hasFilters = search || category || statusFilter

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>

      {/* ── Page header ───────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>Students</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#94a3b8' }}>
            <span style={{ fontWeight: 700, color: '#475569' }}>{data?.total ?? 0}</span> registered students
          </p>
        </div>
        <Button onClick={() => { setServerError(''); setModal({ mode: 'create' }) }} size="sm" style={{ flexShrink: 0 }}>
          <UserPlus size={14} /> Add Student
        </Button>
      </div>

      {/* ── Filter bar ────────────────────────────────── */}
      <div style={{
        background: '#ffffff', borderRadius: 16,
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
        padding: '14px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 160px', minWidth: 0 }}>
            <Search size={14} style={{
              position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)', pointerEvents: 'none', color: '#a5b4cb',
            }} />
            <input
              style={{
                width: '100%', height: 40, borderRadius: 10,
                border: '1.5px solid #e2e8f0', paddingLeft: 36, paddingRight: 14,
                fontSize: 13, color: '#0f172a', background: '#fafbff',
                outline: 'none', fontFamily: 'Inter, system-ui, sans-serif',
                boxSizing: 'border-box', transition: 'border-color 0.18s, box-shadow 0.18s, background 0.18s',
              }}
              onFocus={e => { e.target.style.borderColor = '#5b5ef6'; e.target.style.boxShadow = '0 0 0 3px rgba(91,94,246,0.12)'; e.target.style.background = '#fff' }}
              onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#fafbff' }}
              placeholder="Search by name or student ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Category */}
          <select value={category} onChange={e => setCategory(e.target.value)} style={SELECT_STYLE(148)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(o => <option key={o} value={o} style={{ color: '#0f172a' }}>{o}</option>)}
          </select>

          {/* Status */}
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={SELECT_STYLE(152)}>
            <option value="">All Statuses</option>
            {['Pending', 'Allocated', 'Not Allocated'].map(o => <option key={o} value={o} style={{ color: '#0f172a' }}>{o}</option>)}
          </select>

          {/* Clear */}
          {hasFilters && (
            <button onClick={() => { setSearch(''); setCategory(''); setStatusFilter('') }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                height: 40, paddingLeft: 12, paddingRight: 12, borderRadius: 10,
                border: '1.5px solid #e2e8f0', background: '#fff',
                fontSize: 12, fontWeight: 600, color: '#64748b',
                cursor: 'pointer', flexShrink: 0,
                fontFamily: 'Inter, system-ui, sans-serif', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#e11d48'; e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.background = '#fff1f2' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff' }}
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────── */}
      <Table columns={columns} data={data?.students ?? []} loading={isLoading}
        emptyMessage="No students found. Add one to get started." />

      {/* Create */}
      <Modal isOpen={modal?.mode === 'create'} onClose={() => setModal(null)} title="Register New Student" size="lg">
        <ErrorAlert />
        <StudentForm courses={coursesData?.courses ?? []} loading={createMutation.isPending}
          onSubmit={d => createMutation.mutate(buildCreatePayload(d))} />
      </Modal>

      {/* Edit */}
      <Modal isOpen={modal?.mode === 'edit'} onClose={() => setModal(null)} title="Edit Student" size="lg">
        <ErrorAlert />
        {modal?.data && (
          <StudentForm isEdit courses={coursesData?.courses ?? []} loading={updateMutation.isPending}
            defaultValues={{
              name: modal.data.name, email: modal.data.email ?? '', phone: modal.data.phone ?? '',
              marks: modal.data.marks?.toString(), category: modal.data.category,
              application_date: modal.data.application_date
                ? new Date(modal.data.application_date).toISOString().slice(0, 16) : '',
              preferences: (modal.data.preferences ?? []).map(p => ({
                course_id: p.course_id?.toString() ?? '',
                preference_order: p.preference_order,
              })),
            }}
            onSubmit={d => updateMutation.mutate({ id: modal.data.id, data: buildUpdatePayload(d) })} />
        )}
      </Modal>

      {/* View */}
      <Modal isOpen={modal?.mode === 'view'} onClose={() => setModal(null)} title="Student Details">
        {modal?.data && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 rounded-2xl border"
              style={{ background: 'linear-gradient(135deg,#eef2ff,#f5f3ff)', borderColor: '#c7d2fe' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0"
                style={{ background: 'linear-gradient(135deg,#5b5ef6,#7c3aed)' }}>
                <span className="text-white text-xl font-bold">{modal.data.name?.[0]?.toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 text-base sm:text-lg truncate">{modal.data.name}</p>
                <p className="text-xs sm:text-sm text-slate-500 font-mono">{modal.data.student_id}</p>
                <Badge dot label={modal.data.allocation_status} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm">
              {[
                ['Email', modal.data.email], ['Phone', modal.data.phone],
                ['Marks', modal.data.marks], ['Category', modal.data.category],
                ['Applied', formatDateOnly(modal.data.application_date)],
                ['Preferences', formatPrefs(modal.data.preferences)],
              ].map(([k, v]) => (
                <div key={k} className="p-2.5 sm:p-3 rounded-xl" style={{ background: '#fafbff', border: '1px solid #e8edf5' }}>
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">{k}</p>
                  <p className="font-semibold text-slate-800 text-xs sm:text-sm truncate">{v ?? '—'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
