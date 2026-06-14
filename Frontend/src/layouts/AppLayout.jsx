import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, BookOpen, GitBranch,
  Sparkles, LogOut, Menu, X, GraduationCap, Shield,
  ChevronLeft,
} from 'lucide-react'
import { useAuth } from '../store/authStore'

const ADMIN_NAV = [
  { path: '/',             label: 'Dashboard',    icon: LayoutDashboard, color: 'from-indigo-500 to-violet-600',   group: 'main'   },
  { path: '/students',     label: 'Students',     icon: GraduationCap,   color: 'from-sky-500 to-blue-600',        group: 'main'   },
  { path: '/courses',      label: 'Courses',      icon: BookOpen,        color: 'from-violet-500 to-purple-600',   group: 'main'   },
  { path: '/allocation',   label: 'Allocation',   icon: GitBranch,       color: 'from-emerald-500 to-teal-600',    group: 'main'   },
  { path: '/users',        label: 'Users',        icon: Users,           color: 'from-amber-500 to-orange-600',    group: 'manage' },
  { path: '/ai-assistant', label: 'AI Assistant', icon: Sparkles,        color: 'from-blue-500 to-indigo-600',     group: 'tools'  },
]

const STUDENT_NAV = [
  { path: '/',             label: 'Dashboard',    icon: LayoutDashboard, color: 'from-indigo-500 to-violet-600', group: 'main'  },
  { path: '/my-profile',  label: 'My Profile',   icon: GraduationCap,   color: 'from-sky-500 to-blue-600',      group: 'main'  },
  { path: '/ai-assistant', label: 'AI Assistant', icon: Sparkles,        color: 'from-blue-500 to-indigo-600',   group: 'tools' },
]

const GROUP_LABELS = { manage: 'Management', tools: 'Tools' }

function NavItem({ item, collapsed }) {
  const { pathname } = useLocation()
  const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
  const Icon = item.icon

  return (
    <Link
      to={item.path}
      title={collapsed ? item.label : undefined}
      className={`
        group flex items-center gap-3 rounded-xl text-sm font-medium
        transition-all duration-200 relative overflow-hidden select-none
        ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}
        ${active
          ? 'bg-white/15 text-white'
          : 'text-white/50 hover:text-white hover:bg-white/8'}
      `}
    >
      {/* Active left bar */}
      {active && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-white" />
      )}

      {/* Icon container */}
      <span className={`
        flex items-center justify-center rounded-lg shrink-0 transition-all duration-200
        ${collapsed ? 'w-9 h-9' : 'w-8 h-8'}
        ${active
          ? `bg-gradient-to-br ${item.color} shadow-lg`
          : 'group-hover:bg-white/10'}
      `}>
        <Icon size={15} />
      </span>

      {!collapsed && (
        <>
          <span className="truncate flex-1">{item.label}</span>
          {active && <span className="w-1.5 h-1.5 rounded-full bg-white/80 shrink-0" />}
        </>
      )}
    </Link>
  )
}

function Sidebar({ collapsed, mobile, onClose }) {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const NAV = isAdmin ? ADMIN_NAV : STUDENT_NAV

  return (
    <aside
      className="sidebar-bg flex flex-col h-full overflow-hidden"
      style={{
        width: mobile ? 260 : collapsed ? 72 : 260,
        transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-violet-500/8 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-28 h-28 bg-indigo-400/8 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      {/* ── Logo ──────────────────────────────────────── */}
      <div className={`
        flex items-center relative z-10 border-b border-white/8 py-4 shrink-0
        ${collapsed && !mobile ? 'justify-center px-2' : 'gap-3 px-4'}
      `}>
        {/* Logo mark */}
        <div style={{
          width: 38, height: 38, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, #312e81, #4338ca)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: '0 0 0 1.5px rgba(255,255,255,0.1), 0 4px 16px rgba(67,56,202,0.4)',
        }}>
          <img src="/icon.svg" alt="CourseFlow" style={{ width: 24, height: 24, objectFit: 'contain' }} />
        </div>

        {(!collapsed || mobile) && (
          <div className="min-w-0 flex-1">
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '-0.015em' }}>
              CourseFlow{' '}
              <span style={{ color: '#a78bfa' }}>AI</span>
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: 500, letterSpacing: '0.04em' }}>
              Allocation & Analytics
            </p>
          </div>
        )}

        {mobile && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors ml-auto shrink-0"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Nav ───────────────────────────────────────── */}
      <nav className={`flex-1 overflow-y-auto overflow-x-hidden pt-2 relative z-10 ${collapsed && !mobile ? 'px-2' : 'px-3'}`}>
        {(() => {
          const items = []
          let lastGroup = null
          NAV.forEach((item) => {
            const g = item.group ?? 'main'
            if (g !== lastGroup) {
              if (lastGroup !== null && (!collapsed || mobile)) {
                items.push(<div key={`sep-${g}`} className="mx-1 my-2 h-px bg-white/8" />)
                if (GROUP_LABELS[g]) {
                  items.push(
                    <p key={`lbl-${g}`} className="px-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/20">
                      {GROUP_LABELS[g]}
                    </p>
                  )
                }
              }
              lastGroup = g
            }
            items.push(<NavItem key={item.path} item={item} collapsed={collapsed && !mobile} />)
          })
          return items
        })()}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/8 my-2 relative z-10 shrink-0" />

      {/* ── User profile ──────────────────────────────── */}
      <div className={`pb-4 relative z-10 shrink-0 ${collapsed && !mobile ? 'px-2 flex justify-center' : 'px-3'}`}>
        {(!collapsed || mobile) ? (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/8 transition-colors">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500
              flex items-center justify-center shrink-0 shadow-md">
              <span className="text-sm font-bold text-white">
                {user?.username?.[0]?.toUpperCase() ?? 'A'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white truncate leading-tight">{user?.username}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {user?.role === 'admin'
                  ? <Shield size={9} className="text-violet-300 shrink-0" />
                  : <GraduationCap size={9} className="text-sky-300 shrink-0" />}
                <p className={`text-[11px] capitalize font-semibold ${user?.role === 'admin' ? 'text-violet-300' : 'text-sky-300'}`}>
                  {user?.role}
                </p>
              </div>
            </div>
            <button
              onClick={() => { logout(); navigate('/login') }}
              className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="p-2.5 rounded-xl text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={15} />
          </button>
        )}
      </div>
    </aside>
  )
}

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const { isAdmin } = useAuth()
  const NAV = isAdmin ? ADMIN_NAV : STUDENT_NAV
  const currentPage = NAV.find(n => n.path === pathname || (n.path !== '/' && pathname.startsWith(n.path)))

  return (
    <div className="flex h-screen" style={{ background: 'var(--color-bg)', overflow: 'clip' }}>

      {/* ── Desktop sidebar ────────────────────────────── */}
      <div
        className="hidden lg:flex shrink-0 h-full relative"
        style={{ width: collapsed ? 72 : 260, transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)' }}
      >
        <Sidebar collapsed={collapsed} />
      </div>

      {/* ── Mobile sidebar overlay ─────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[9998] flex lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 h-full shadow-2xl">
            <Sidebar mobile onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Main content area ──────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header
          className="shrink-0 flex items-center gap-2 px-4 border-b"
          style={{
            height: 60,
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderColor: '#e8edf5',
            boxShadow: '0 1px 12px rgba(15,23,42,0.05)',
          }}
        >
          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>

          {/* Desktop collapse toggle */}
          <button
            className="hidden lg:flex p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            onClick={() => setCollapsed(c => !c)}
            aria-label="Toggle sidebar"
          >
            <Menu size={17} />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-slate-300 text-sm">/</span>
            <span className="text-sm font-semibold text-slate-700">
              {currentPage?.label ?? 'Dashboard'}
            </span>
          </div>

          <div className="flex-1" />

          {/* Status pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
            style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 hidden sm:block select-none">
              CourseFlow AI · Online
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-4 sm:p-5 lg:p-6 animate-fade-up">
            {children}
          </div>
        </main>

      </div>
    </div>
  )
}
