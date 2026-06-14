import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Lock, User, Sparkles, ArrowRight, Shield, Zap, BarChart3 } from 'lucide-react'
import { useAuth } from '../store/authStore'
import { getErrorMessage } from '../utils/helpers'

/* ── Feature cards data ──────────────────────────────── */
const FEATURES = [
  {
    icon: <Shield   size={14} color="#fff" strokeWidth={2.5} />,
    title: 'Merit-based Allocation',
    desc:  'Reservation rules & preference cascading',
    grad:  'linear-gradient(135deg,#5b5ef6,#7c3aed)',
    glow:  'rgba(91,94,246,0.32)',
  },
  {
    icon: <Sparkles size={14} color="#fff" strokeWidth={2.5} />,
    title: 'Gemini AI Analytics',
    desc:  'Natural language insights via Google ADK',
    grad:  'linear-gradient(135deg,#7c3aed,#a855f7)',
    glow:  'rgba(124,58,237,0.32)',
  },
  {
    icon: <BarChart3 size={14} color="#fff" strokeWidth={2.5} />,
    title: 'Real-time Dashboard',
    desc:  'Live metrics, audit trails & seats',
    grad:  'linear-gradient(135deg,#059669,#10b981)',
    glow:  'rgba(5,150,105,0.32)',
  },
  {
    icon: <Zap size={14} color="#fff" strokeWidth={2.5} />,
    title: 'Instant Processing',
    desc:  'Allocation results in seconds',
    grad:  'linear-gradient(135deg,#d97706,#f59e0b)',
    glow:  'rgba(217,119,6,0.32)',
  },
]

export default function Login() {
  const { login }   = useAuth()
  const navigate    = useNavigate()
  const [showPwd, setShowPwd]         = useState(false)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()

  async function onSubmit(data) {
    setServerError('')
    try {
      const me = await login(data.username, data.password)
      navigate(me.role === 'student' ? '/my-profile' : '/')
    } catch (err) {
      setServerError(getErrorMessage(err))
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      fontFamily: "'Inter', system-ui, sans-serif",
      background: '#f0f4ff',
    }}>

      {/* ════════════════════════════════════════
          LEFT — Premium indigo panel
      ════════════════════════════════════════ */}
      <div
        id="login-left"
        style={{
          display: 'none',
          width: '50%', flexShrink: 0,
          flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          padding: '60px 52px',
          position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(155deg, #1e1b4b 0%, #2d2a6e 40%, #1e1b4b 75%, #16163a 100%)',
        }}
      >
        {/* Ambient orbs */}
        <div style={{
          position: 'absolute', top: -160, left: -80, width: 500, height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(91,94,246,0.18) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, right: -60, width: 400, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 560, height: 260,
          background: 'radial-gradient(ellipse, rgba(91,94,246,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.055,
          backgroundImage: 'radial-gradient(rgba(199,210,254,0.9) 1px, transparent 1px)',
          backgroundSize: '28px 28px', pointerEvents: 'none',
        }} />

        {/* Content */}
        <div style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 400,
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '5px 16px', borderRadius: 99, marginBottom: 26,
            background: 'rgba(91,94,246,0.15)',
            border: '1px solid rgba(91,94,246,0.35)',
          }}>
            <Sparkles size={11} color="#a5b4fc" />
            <span style={{
              color: '#a5b4fc', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              AI-Powered Platform
            </span>
          </div>

          {/* Heading */}
          <h1 style={{
            color: '#f1f5f9', fontSize: 38, fontWeight: 800,
            lineHeight: 1.18, margin: '0 0 16px', letterSpacing: '-0.025em',
          }}>
            Smarter{' '}
            <span style={{
              background: 'linear-gradient(135deg,#a5b4fc 0%,#818cf8 55%,#c4b5fd 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>CourseFlow</span>
            ,<br />Faster Results
          </h1>

          {/* Subtitle */}
          <p style={{
            color: 'rgba(148,163,184,0.72)', fontSize: 14,
            lineHeight: 1.75, margin: '0 0 36px', maxWidth: 340,
          }}>
            Merit-based course allocation with category reservations,
            preference cascading, and AI-powered analytics — all in one platform.
          </p>

          {/* Feature grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 10, width: '100%',
          }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14, padding: '14px 12px',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 9,
                textAlign: 'left',
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                  background: f.grad,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 3px 12px ${f.glow}`,
                }}>
                  {f.icon}
                </div>
                <div>
                  <p style={{ margin: 0, color: 'rgba(241,245,249,0.88)', fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>
                    {f.title}
                  </p>
                  <p style={{ margin: '3px 0 0', color: 'rgba(148,163,184,0.5)', fontSize: 11, lineHeight: 1.4 }}>
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p style={{
          position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center',
          color: 'rgba(148,163,184,0.18)', fontSize: 11, margin: 0, zIndex: 1,
        }}>
          © 2026 CourseFlow AI · All rights reserved
        </p>
      </div>

      {/* ════════════════════════════════════════
          RIGHT — Light premium form panel
      ════════════════════════════════════════ */}
      <div style={{
        flex: 1, minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
        background: 'linear-gradient(155deg,#f0f4ff 0%,#fafbff 45%,#f5f3ff 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background blobs */}
        <div style={{
          position: 'absolute', top: '-8%', right: '-5%',
          width: 360, height: 360, borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(91,94,246,0.1) 0%,transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-6%', left: '-4%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(124,58,237,0.07) 0%,transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

          {/* Mobile logo */}
          <div id="mobile-logo" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'linear-gradient(135deg,#5b5ef6,#7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, boxShadow: '0 4px 18px rgba(91,94,246,0.4)',
            }}>
              <img src="/icon.svg" alt="" style={{
                width: 26, height: 26, objectFit: 'contain',
                filter: 'brightness(0) invert(1)',
              }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1 }}>
                CourseFlow{' '}
                <span style={{
                  background: 'linear-gradient(135deg,#5b5ef6,#7c3aed)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>AI</span>
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
                Intelligent Course Allocation
              </p>
            </div>
          </div>

          {/* Page heading */}
          <div style={{ marginBottom: 26 }}>
            <h2 style={{
              margin: '0 0 6px', fontSize: 28, fontWeight: 800,
              color: '#0f172a', letterSpacing: '-0.025em', lineHeight: 1.2,
            }}>
              Welcome back 👋
            </h2>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
              Sign in to access your CourseFlow AI dashboard
            </p>
          </div>

          {/* Server error */}
          {serverError && (
            <div style={{
              marginBottom: 18, padding: '12px 16px', borderRadius: 14,
              background: '#fff1f2', border: '1.5px solid #fca5a5',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'linear-gradient(135deg,#dc2626,#ef4444)',
                flexShrink: 0, marginTop: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(220,38,38,0.3)',
              }}>
                <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>!</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#9f1239', fontWeight: 500, lineHeight: 1.5 }}>
                {serverError}
              </p>
            </div>
          )}

          {/* Form card */}
          <div style={{
            background: '#ffffff',
            borderRadius: 22,
            border: '1.5px solid #dde3ef',
            boxShadow: '0 2px 8px rgba(15,23,42,0.04), 0 16px 48px rgba(15,23,42,0.08)',
            padding: '32px 28px 28px',
          }}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Username */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 3 }}>
                  Username or Email <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} color="#a5b4cb"
                    style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    placeholder="admin@courseflow.com"
                    autoComplete="username"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '12px 14px 12px 38px',
                      borderRadius: 11,
                      border: `1.5px solid ${errors.username ? '#fca5a5' : '#dde3ef'}`,
                      background: errors.username ? '#fff1f2' : '#fafbff',
                      fontSize: 14, color: '#0f172a', outline: 'none', fontFamily: 'inherit',
                      transition: 'all 0.18s ease',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#5b5ef6'
                      e.target.style.boxShadow   = '0 0 0 3px rgba(91,94,246,0.12)'
                      e.target.style.background  = '#fff'
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = errors.username ? '#fca5a5' : '#dde3ef'
                      e.target.style.boxShadow   = 'none'
                      e.target.style.background  = errors.username ? '#fff1f2' : '#fafbff'
                    }}
                    {...register('username', { required: 'Username is required' })}
                  />
                </div>
                {errors.username && (
                  <span style={{ fontSize: 11.5, color: '#dc2626', fontWeight: 500 }}>⚠ {errors.username.message}</span>
                )}
              </div>

              {/* Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 3 }}>
                  Password <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color="#a5b4cb"
                    style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '12px 44px 12px 38px',
                      borderRadius: 11,
                      border: `1.5px solid ${errors.password ? '#fca5a5' : '#dde3ef'}`,
                      background: errors.password ? '#fff1f2' : '#fafbff',
                      fontSize: 14, color: '#0f172a', outline: 'none', fontFamily: 'inherit',
                      transition: 'all 0.18s ease',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#5b5ef6'
                      e.target.style.boxShadow   = '0 0 0 3px rgba(91,94,246,0.12)'
                      e.target.style.background  = '#fff'
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = errors.password ? '#fca5a5' : '#dde3ef'
                      e.target.style.boxShadow   = 'none'
                      e.target.style.background  = errors.password ? '#fff1f2' : '#fafbff'
                    }}
                    {...register('password', { required: 'Password is required' })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#a5b4cb', padding: 4,
                      display: 'flex', alignItems: 'center', transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#5b5ef6'}
                    onMouseLeave={e => e.currentTarget.style.color = '#a5b4cb'}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <span style={{ fontSize: 11.5, color: '#dc2626', fontWeight: 500 }}>⚠ {errors.password.message}</span>
                )}
              </div>

              <div style={{ height: 1, background: '#f0f4ff', margin: '2px 0' }} />

              {/* Credentials hint */}
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'linear-gradient(135deg,#eef2ff,#f5f3ff)',
                border: '1px solid #c7d2fe',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: 'linear-gradient(135deg,#5b5ef6,#7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Shield size={13} color="#fff" strokeWidth={2.5} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#4338ca', letterSpacing: '0.02em' }}>
                    Demo Admin Credentials
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6366f1', fontFamily: 'monospace' }}>
                    admin@courseflow.com&nbsp;·&nbsp;admin123
                  </p>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="cf-signin-btn"
                style={{
                  width: '100%', padding: '13px 20px',
                  borderRadius: 12, border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  background: isSubmitting
                    ? 'linear-gradient(135deg,#a5b4fc,#c4b5fd)'
                    : 'linear-gradient(135deg,#5b5ef6 0%,#7c3aed 100%)',
                  color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: isSubmitting ? 'none' : '0 6px 22px rgba(91,94,246,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                  transition: 'all 0.22s ease',
                  letterSpacing: '-0.01em',
                  position: 'relative', overflow: 'hidden',
                  opacity: isSubmitting ? 0.72 : 1,
                }}
              >
                <span style={{
                  position: 'absolute', inset: 0, borderRadius: 'inherit',
                  background: 'linear-gradient(105deg,transparent 38%,rgba(255,255,255,0.13) 50%,transparent 62%)',
                  pointerEvents: 'none',
                }} />
                {isSubmitting ? (
                  <>
                    <svg style={{ animation: 'cfSpin 0.8s linear infinite', width: 17, height: 17, flexShrink: 0 }}
                      fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                      <path fill="rgba(255,255,255,0.9)" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>Sign In <ArrowRight size={16} /></>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cfSpin { to { transform: rotate(360deg); } }
        .cf-signin-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(91,94,246,0.5), inset 0 1px 0 rgba(255,255,255,0.2) !important;
          background: linear-gradient(135deg,#4f46e5 0%,#6d28d9 100%) !important;
        }
        .cf-signin-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        @media (min-width: 1024px) {
          #login-left  { display: flex !important; }
          #mobile-logo { display: none  !important; }
        }
      `}</style>
    </div>
  )
}
