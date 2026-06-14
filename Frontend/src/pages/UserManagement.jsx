import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { UserPlus, Edit2, Trash2, Shield, GraduationCap, Mail } from 'lucide-react'
import { authAPI, studentsAPI } from '../services/api'
import { useToast } from '../store/toastStore'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input, { Select } from '../components/ui/Input'
import { getErrorMessage } from '../utils/helpers'

const ROLE_COLOURS = {
  admin:   'bg-violet-100 text-violet-700',
  student: 'bg-sky-100 text-sky-700',
}

function UserForm({ defaultValues, onSubmit, loading, students, isEdit }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: defaultValues ?? {
      full_name: '', username: '', email: '',
      password: '', role: 'admin', student_uid: '',
    },
  })
  const role = watch('role')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

      {/* Identity */}
      <div className="p-3 rounded-xl border space-y-3" style={{ background: '#fafbff', borderColor: '#e8edf5' }}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Identity</p>
        <Input label="Full Name" placeholder="John Doe" {...register('full_name')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Username" required placeholder="john_admin"
            error={errors.username?.message}
            {...register('username', { required: 'Required' })} />
          <Input label="Email" type="email" placeholder="john@example.com"
            {...register('email')} />
        </div>
      </div>

      {/* Security */}
      <div className="p-3 rounded-xl border space-y-3" style={{ background: '#fafbff', borderColor: '#e8edf5' }}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Security</p>
        <Input
          label={isEdit ? 'New Password (leave blank to keep)' : 'Password'}
          type="password" placeholder="••••••••"
          error={errors.password?.message}
          {...register('password', isEdit
            ? {}
            : { required: 'Required', minLength: { value: 4, message: 'Min 4 chars' } }
          )}
        />
      </div>

      {/* Role */}
      <div className="p-3 rounded-xl border space-y-3" style={{ background: '#fafbff', borderColor: '#e8edf5' }}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Role & Access</p>
        <Select label="Role" required {...register('role', { required: 'Required' })}>
          <option value="admin">Admin — Full access</option>
          <option value="student">Student — Own profile only</option>
        </Select>
        {role === 'student' && (
          <Select label="Link to Student Record" required
            error={errors.student_uid?.message}
            {...register('student_uid', role === 'student' ? { required: 'Required for student role' } : {})}>
            <option value="">— Select student —</option>
            {(students ?? []).map(s => (
              <option key={s.student_id} value={s.student_id}>
                {s.student_id} — {s.name} ({s.email ?? 'no email'})
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="flex justify-end pt-3 border-t border-slate-100">
        <Button type="submit" loading={loading}>
          {isEdit ? 'Save Changes' : 'Create User'}
        </Button>
      </div>
    </form>
  )
}

/* ── Reusable action icon button ─────────────────────── */
function ActionBtn({ children, onClick, title, color, hoverBg }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      onMouseEnter={e => {
        e.currentTarget.style.color = color
        e.currentTarget.style.background = hoverBg
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = '#c9d1de'
        e.currentTarget.style.background = 'transparent'
      }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 30, borderRadius: 8, border: 'none',
        background: 'transparent', cursor: 'pointer',
        color: '#c9d1de', transition: 'all 0.15s ease', flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

export default function UserManagement() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [modal, setModal] = useState(null)
  const [serverError, setServerError] = useState('')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => authAPI.listUsers().then(r => r.data),
    staleTime: 15_000,
  })
  const { data: studentsData } = useQuery({
    queryKey: ['students-all'],
    queryFn: () => studentsAPI.list({ limit: 500 }).then(r => r.data),
    staleTime: 60_000,
  })

  const createMutation = useMutation({
    mutationFn: d => authAPI.register(d),
    onSuccess: () => {
      qc.invalidateQueries(['users'])
      setModal(null)
      setServerError('')
      toast.success('User created successfully.')
    },
    onError: e => setServerError(getErrorMessage(e)),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => authAPI.updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['users'])
      setModal(null)
      setServerError('')
      toast.success('User updated successfully.')
    },
    onError: e => setServerError(getErrorMessage(e)),
  })
  const deleteMutation = useMutation({
    mutationFn: id => authAPI.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries(['users'])
      toast.success('User deleted.')
    },
    onError: e => toast.error(getErrorMessage(e)),
  })

  function buildPayload(fd) {
    const payload = {
      username: fd.username,
      role: fd.role,
      full_name: fd.full_name || null,
      email: fd.email || null,
    }
    if (fd.password) payload.password = fd.password
    if (fd.role === 'student' && fd.student_uid) payload.student_uid = fd.student_uid
    return payload
  }

  const columns = [
    {
      key: '_sno', label: '#', align: 'center', width: '48px',
      render: (_, row, i) => <span style={{ color: '#b0bac9', fontSize: 12, fontWeight: 600 }}>{i + 1}</span>,
    },
    {
      key: 'username', label: 'User', width: '22%',
      render: (v, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: row.role === 'admin' ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'linear-gradient(135deg,#0284c7,#38bdf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{v?.[0]?.toUpperCase()}</span>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#1e293b', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</p>
            {row.full_name && <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.3, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.full_name}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'email', label: 'Email', width: '22%',
      render: v => v
        ? <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#475569', overflow: 'hidden' }}>
            <Mail size={11} style={{ color: '#94a3b8', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
          </span>
        : <span style={{ color: '#dde3ef', fontSize: 12 }}>—</span>,
    },
    {
      key: 'role', label: 'Role', width: '12%',
      render: v => <Badge dot label={v} />,
    },
    {
      key: 'student_uid', label: 'Student ID', width: '14%',
      render: v => v
        ? <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#0284c7' }}>{v}</span>
        : <span style={{ color: '#dde3ef', fontSize: 12 }}>—</span>,
    },
    {
      key: 'is_active', label: 'Status', width: '11%',
      render: v => <Badge dot label={v ? 'Active' : 'Inactive'} />,
    },
    {
      key: '_actions', label: 'Actions', align: 'right', width: '80px',
      render: (_, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
          <ActionBtn onClick={() => { setServerError(''); setModal({ mode: 'edit', data: row }) }} title="Edit" color="#d97706" hoverBg="#fffbeb"><Edit2 size={14} /></ActionBtn>
          <ActionBtn onClick={() => { if (window.confirm(`Delete "${row.username}"?`)) deleteMutation.mutate(row.id) }} title="Delete" color="#e11d48" hoverBg="#fff1f2"><Trash2 size={14} /></ActionBtn>
        </div>
      ),
    },
  ]

  const ErrorAlert = () => serverError ? (
    <div className="mb-4 flex items-start gap-2 p-3 rounded-xl border"
      style={{ background: '#fff1f2', borderColor: '#fca5a5' }}>
      <span style={{ color: '#dc2626' }} className="shrink-0">⚠</span>
      <p className="text-sm font-medium" style={{ color: '#9f1239' }}>{serverError}</p>
    </div>
  ) : null

  const students = studentsData?.students ?? []
  const adminCount   = users.filter(u => u.role === 'admin').length
  const studentCount = users.filter(u => u.role === 'student').length

  return (
    <div className="space-y-4 sm:space-y-5 w-full">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            <span className="font-bold text-slate-600">{users.length}</span> users ·{' '}
            <span className="font-semibold text-violet-600">{adminCount} admins</span> ·{' '}
            <span className="font-semibold text-sky-600">{studentCount} students</span>
          </p>
        </div>
        <Button onClick={() => { setServerError(''); setModal({ mode: 'create' }) }} size="sm" className="shrink-0">
          <UserPlus size={14} /> Add User
        </Button>
      </div>

      {/* Role legend */}
      <div className="flex flex-wrap gap-3">
        {[
          { role: 'admin',   icon: Shield,        desc: 'Full access — all pages, all actions',   col: 'bg-violet-50 border-violet-200 text-violet-700' },
          { role: 'student', icon: GraduationCap, desc: 'Own profile — dashboard + my allocation', col: 'bg-sky-50 border-sky-200 text-sky-700' },
        ].map(({ role, icon: Icon, desc, col }) => (
          <div key={role}
            className={`flex items-center gap-2.5 px-3 sm:px-4 py-2.5 rounded-xl border text-xs sm:text-sm ${col}`}>
            <Icon size={14} className="shrink-0" />
            <div>
              <span className="font-bold capitalize">{role}</span>
              <span className="opacity-70 ml-1.5 hidden sm:inline">{desc}</span>
            </div>
          </div>
        ))}
      </div>

      <Table columns={columns} data={users} loading={isLoading} emptyMessage="No users found." />

      {/* Create */}
      <Modal isOpen={modal?.mode === 'create'} onClose={() => setModal(null)} title="Create New User" size="md">
        <ErrorAlert />
        <UserForm students={students} loading={createMutation.isPending}
          onSubmit={d => createMutation.mutate(buildPayload(d))} />
      </Modal>

      {/* Edit */}
      <Modal isOpen={modal?.mode === 'edit'} onClose={() => setModal(null)} title="Edit User" size="md">
        <ErrorAlert />
        {modal?.data && (
          <UserForm isEdit students={students} loading={updateMutation.isPending}
            defaultValues={{
              full_name: modal.data.full_name ?? '',
              username:  modal.data.username,
              email:     modal.data.email ?? '',
              password:  '',
              role:      modal.data.role,
              student_uid: modal.data.student_uid ?? '',
            }}
            onSubmit={d => updateMutation.mutate({ id: modal.data.id, data: buildPayload(d) })} />
        )}
      </Modal>
    </div>
  )
}
