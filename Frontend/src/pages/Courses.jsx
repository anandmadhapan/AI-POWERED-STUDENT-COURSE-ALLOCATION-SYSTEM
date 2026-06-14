import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { BookPlus, Search, Edit2, Trash2, Eye, X } from 'lucide-react'
import { coursesAPI } from '../services/api'
import { useToast } from '../store/toastStore'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input, { Textarea } from '../components/ui/Input'
import { getErrorMessage, CHART_COLORS } from '../utils/helpers'

const CATEGORIES = ['General', 'OBC', 'SC', 'ST']

/* ── Custom category dropdown (avoids Tailwind v4 select colour reset) ── */
function CategorySelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const BADGE = {
    General: { bg: '#e0f2fe', color: '#0369a1' },
    OBC:     { bg: '#fef3c7', color: '#b45309' },
    SC:      { bg: '#ede9fe', color: '#6d28d9' },
    ST:      { bg: '#d1fae5', color: '#065f46' },
  }

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', height: 40, borderRadius: 10,
          border: open ? '1.5px solid #5b5ef6' : '1.5px solid #dde3ef',
          boxShadow: open ? '0 0 0 3px rgba(91,94,246,0.12)' : 'none',
          background: '#fafbff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingLeft: 12, paddingRight: 10,
          cursor: 'pointer', transition: 'border-color 0.18s, box-shadow 0.18s',
        }}
      >
        {value ? (
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: BADGE[value]?.color ?? '#0f172a',
            background: BADGE[value]?.bg ?? '#f1f5f9',
            borderRadius: 6, padding: '2px 8px',
          }}>{value}</span>
        ) : (
          <span style={{ fontSize: 13, color: '#a5b4cb' }}>Select…</span>
        )}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="#a5b4cb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transition: 'transform 0.18s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#fff', border: '1.5px solid #e8edf5', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(15,23,42,0.12)', zIndex: 999, overflow: 'hidden',
        }}>
          {CATEGORIES.map(c => (
            <button key={c} type="button"
              onClick={() => { onChange(c); setOpen(false) }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                padding: '8px 12px',
                background: value === c ? '#f5f3ff' : 'transparent',
                border: 'none', cursor: 'pointer', gap: 8, transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (value !== c) e.currentTarget.style.background = '#f8fafc' }}
              onMouseLeave={e => { if (value !== c) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: BADGE[c]?.color ?? '#0f172a',
                background: BADGE[c]?.bg ?? '#f1f5f9',
                borderRadius: 6, padding: '2px 8px',
              }}>{c}</span>
              {value === c && (
                <svg style={{ marginLeft: 'auto' }} width="12" height="12" viewBox="0 0 24 24"
                  fill="none" stroke="#5b5ef6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CourseForm({ defaultValues, onSubmit, loading }) {
  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: defaultValues ?? {
      course_name: '', description: '', total_seats: '', category_seats: [],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'category_seats' })
  const available = CATEGORIES.filter(c => !fields.some(f => f.category === c))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Input label="Course Name" required placeholder="Computer Science & Engineering"
        error={errors.course_name?.message}
        {...register('course_name', { required: 'Required', minLength: { value: 2, message: 'Min 2 chars' } })} />
      <Textarea label="Description" placeholder="Optional description…" {...register('description')} />
      <Input label="Total Seats" type="number" required placeholder="60"
        error={errors.total_seats?.message}
        {...register('total_seats', { required: 'Required', min: { value: 1, message: 'Min 1' } })} />

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Category Reserved Seats</label>
          {available.length > 0 && (
            <button type="button"
              onClick={() => append({ category: available[0], reserved_seats: 0 })}
              style={{
                fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
                border: 'none', background: 'transparent', cursor: 'pointer', color: '#5b5ef6',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#eef2ff'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              + Add
            </button>
          )}
        </div>

        {/* Table header */}
        {fields.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 120px 36px',
            gap: 8, padding: '7px 12px',
            borderRadius: '10px 10px 0 0',
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0', borderBottom: 'none',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Category</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'center' }}>Seats</span>
            <span />
          </div>
        )}

        {/* Table rows */}
        <div style={{
          border: fields.length > 0 ? '1.5px solid #e2e8f0' : 'none',
          borderRadius: fields.length > 0 ? '0 0 10px 10px' : 10,
          overflow: 'hidden',
        }}>
          {fields.map((field, idx) => (
            <div key={field.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 120px 36px',
              gap: 8, alignItems: 'center', padding: '8px 12px',
              background: idx % 2 === 0 ? '#ffffff' : '#fafbff',
              borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none',
            }}>
              <Controller
                control={control}
                name={`category_seats.${idx}.category`}
                render={({ field }) => (
                  <CategorySelect value={field.value} onChange={field.onChange} />
                )}
              />
              <input type="number" min="0" placeholder="0"
                style={{
                  width: '100%', height: 36, borderRadius: 8,
                  border: '1.5px solid #e2e8f0',
                  paddingLeft: 10, paddingRight: 8,
                  fontSize: 13, fontWeight: 600, color: '#0f172a',
                  background: '#f8fafc', outline: 'none',
                  textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.target.style.borderColor = '#5b5ef6'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(91,94,246,0.1)' }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }}
                {...register(`category_seats.${idx}.reserved_seats`, { min: 0 })}
              />
              <button type="button" onClick={() => remove(idx)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 7, border: 'none',
                  background: 'transparent', cursor: 'pointer', color: '#cbd5e1',
                  transition: 'all 0.15s', margin: '0 auto',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#e11d48'; e.currentTarget.style.background = '#fff1f2' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = 'transparent' }}
              >
                <X size={13} />
              </button>
            </div>
          ))}
          {fields.length === 0 && (
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontStyle: 'italic', padding: '10px 12px' }}>
              No reservations — all seats open pool
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
        <Button type="submit" loading={loading}>
          {defaultValues ? 'Save Changes' : 'Create Course'}
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

export default function Courses() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [serverError, setServerError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['courses', search],
    queryFn: () => coursesAPI.list({ search: search || undefined, limit: 200 }).then(r => r.data),
    staleTime: 15_000,
  })

  const createMutation = useMutation({
    mutationFn: d => coursesAPI.create(d),
    onSuccess: () => {
      qc.invalidateQueries(['courses'])
      setModal(null); setServerError('')
      toast.success('Course created successfully.')
    },
    onError: e => setServerError(getErrorMessage(e)),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => coursesAPI.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['courses'])
      setModal(null); setServerError('')
      toast.success('Course updated successfully.')
    },
    onError: e => setServerError(getErrorMessage(e)),
  })
  const deleteMutation = useMutation({
    mutationFn: id => coursesAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries(['courses']); toast.success('Course deleted.') },
    onError: e => toast.error(getErrorMessage(e)),
  })

  function buildPayload(d) {
    return {
      course_name: d.course_name,
      description: d.description || null,
      total_seats: parseInt(d.total_seats),
      category_seats: (d.category_seats ?? []).map(cs => ({
        category: cs.category,
        reserved_seats: parseInt(cs.reserved_seats) || 0,
      })),
    }
  }

  const columns = [
    {
      key: '_sno', label: '#', align: 'center', width: '48px',
      render: (_, _row, i) => <span style={{ color: '#b0bac9', fontSize: 12, fontWeight: 600 }}>{i + 1}</span>,
    },
    {
      key: 'course_name', label: 'Course', width: '22%',
      render: (v, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{row.course_code?.slice(0, 2)}</span>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#1e293b', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</p>
            <p style={{ margin: 0, fontSize: 11, fontFamily: 'monospace', color: '#7c3aed', lineHeight: 1.3, marginTop: 2 }}>{row.course_code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'total_seats', label: 'Total', align: 'center', width: '11%',
      render: v => <span style={{ fontWeight: 600, fontSize: 13, color: '#475569' }}>{v}</span>,
    },
    {
      key: 'allocated_seats', label: 'Allocated', align: 'center', width: '11%',
      render: v => <span style={{ fontWeight: 700, fontSize: 13, color: '#5b5ef6' }}>{v}</span>,
    },
    {
      key: 'available_seats', label: 'Available', align: 'center', width: '11%',
      render: v => <span style={{ fontWeight: 700, fontSize: 13, color: v > 0 ? '#059669' : '#e11d48' }}>{v}</span>,
    },
    {
      key: 'is_active', label: 'Status', align: 'center', width: '11%',
      render: v => <Badge dot label={v ? 'Active' : 'Inactive'} />,
    },
    {
      key: 'category_seats', label: 'Reservations', wrap: true, width: '22%',
      render: v => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(v ?? []).map(cs => {
            const styles = {
              General: { background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' },
              OBC:     { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' },
              SC:      { background: '#ede9fe', color: '#6d28d9', border: '1px solid #ddd6fe' },
              ST:      { background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' },
            }
            return <Badge key={cs.category} label={`${cs.category} ${cs.available_seats}/${cs.reserved_seats}`} style={styles[cs.category]} />
          })}
        </div>
      ),
    },
    {
      key: '_actions', label: 'Actions', align: 'right', width: '96px',
      render: (_, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
          <ActionBtn onClick={() => setModal({ mode: 'view', data: row })} title="View" color="#5b5ef6" hoverBg="#eef2ff"><Eye size={14} /></ActionBtn>
          <ActionBtn onClick={() => { setServerError(''); setModal({ mode: 'edit', data: row }) }} title="Edit" color="#d97706" hoverBg="#fffbeb"><Edit2 size={14} /></ActionBtn>
          <ActionBtn onClick={() => { if (window.confirm(`Delete "${row.course_name}"?`)) deleteMutation.mutate(row.id) }} title="Delete" color="#e11d48" hoverBg="#fff1f2"><Trash2 size={14} /></ActionBtn>
        </div>
      ),
    },
  ]

  const ErrorAlert = () => serverError ? (
    <div style={{
      marginBottom: 16, padding: '10px 14px', borderRadius: 12,
      border: '1px solid #fca5a5', background: '#fff1f2',
      fontSize: 13, fontWeight: 500, color: '#9f1239',
    }}>{serverError}</div>
  ) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>

      {/* ── Page header ───────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>Courses</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#94a3b8' }}>
            <span style={{ fontWeight: 700, color: '#475569' }}>{data?.total ?? 0}</span> courses configured
          </p>
        </div>
        <Button onClick={() => { setServerError(''); setModal({ mode: 'create' }) }} size="sm" style={{ flexShrink: 0 }}>
          <BookPlus size={14} /> Add Course
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
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
            <Search size={14} style={{
              position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)', pointerEvents: 'none', color: '#a5b4cb',
            }} />
            <input
              style={{
                width: '100%', height: 40, borderRadius: 10,
                border: '1.5px solid #e2e8f0',
                paddingLeft: 36, paddingRight: 14,
                fontSize: 13, color: '#0f172a', background: '#fafbff',
                outline: 'none', fontFamily: 'Inter, system-ui, sans-serif',
                boxSizing: 'border-box', transition: 'border-color 0.18s, box-shadow 0.18s, background 0.18s',
              }}
              onFocus={e => { e.target.style.borderColor = '#5b5ef6'; e.target.style.boxShadow = '0 0 0 3px rgba(91,94,246,0.12)'; e.target.style.background = '#fff' }}
              onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#fafbff' }}
              placeholder="Search by name or code…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {search && (
            <button onClick={() => setSearch('')}
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
      <Table columns={columns} data={data?.courses ?? []} loading={isLoading}
        emptyMessage="No courses found. Create one to get started." />

      {/* Create */}
      <Modal isOpen={modal?.mode === 'create'} onClose={() => setModal(null)} title="Create New Course" size="lg">
        <ErrorAlert />
        <CourseForm loading={createMutation.isPending} onSubmit={d => createMutation.mutate(buildPayload(d))} />
      </Modal>

      {/* Edit */}
      <Modal isOpen={modal?.mode === 'edit'} onClose={() => setModal(null)} title="Edit Course" size="lg">
        <ErrorAlert />
        {modal?.data && (
          <CourseForm key={modal.data.id} loading={updateMutation.isPending}
            defaultValues={{
              course_name: modal.data.course_name,
              description: modal.data.description ?? '',
              total_seats: modal.data.total_seats?.toString(),
              category_seats: (modal.data.category_seats ?? []).map(cs => ({
                category: cs.category,
                reserved_seats: cs.reserved_seats?.toString(),
              })),
            }}
            onSubmit={d => updateMutation.mutate({ id: modal.data.id, data: buildPayload(d) })} />
        )}
      </Modal>

      {/* View */}
      <Modal isOpen={modal?.mode === 'view'} onClose={() => setModal(null)} title="Course Details" size="md">
        {modal?.data && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl border"
              style={{ background: 'linear-gradient(135deg,#f5f3ff,#eef2ff)', borderColor: '#c4b5fd' }}>
              <p className="font-mono font-bold text-sm mb-1" style={{ color: '#5b5ef6' }}>{modal.data.course_code}</p>
              <p className="font-extrabold text-slate-900 text-base sm:text-lg">{modal.data.course_name}</p>
              {modal.data.description && <p className="text-sm text-slate-500 mt-2">{modal.data.description}</p>}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
              {[
                ['Total', modal.data.total_seats, 'text-slate-800'],
                ['Allocated', modal.data.allocated_seats, 'text-indigo-600'],
                ['Available', modal.data.available_seats, modal.data.available_seats > 0 ? 'text-emerald-600' : 'text-rose-600'],
              ].map(([l, v, c]) => (
                <div key={l} className="p-2.5 sm:p-3 rounded-xl" style={{ background: '#fafbff', border: '1px solid #e8edf5' }}>
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">{l}</p>
                  <p className={`text-xl sm:text-2xl font-extrabold ${c}`}>{v}</p>
                </div>
              ))}
            </div>
            {modal.data.category_seats?.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Reservations</p>
                <div className="space-y-3">
                  {modal.data.category_seats.map((cs, i) => (
                    <div key={cs.category} className="flex items-center gap-3">
                      <Badge dot label={cs.category} />
                      <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ background: '#e0e7ff' }}>
                        <div className="h-2 rounded-full" style={{
                          width: cs.reserved_seats > 0 ? `${(cs.allocated_seats / cs.reserved_seats) * 100}%` : '0%',
                          background: CHART_COLORS[i % CHART_COLORS.length],
                        }} />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 shrink-0">{cs.allocated_seats}/{cs.reserved_seats}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
