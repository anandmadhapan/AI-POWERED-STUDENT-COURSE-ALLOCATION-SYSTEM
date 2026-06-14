import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Send, Sparkles, User, Trash2, Lightbulb, Bot } from 'lucide-react'
import { aiAPI } from '../services/api'
import { useToast } from '../store/toastStore'
import Button from '../components/ui/Button'
import { formatDate, getErrorMessage } from '../utils/helpers'

const SUGGESTIONS = [
  { icon: '📊', text: 'How many students were allocated to each course?' },
  { icon: '❌', text: 'Which students did not get their first preference?' },
  { icon: '📈', text: 'Which course has the highest rejection rate?' },
  { icon: '🏷️', text: 'Show category-wise allocation summary.' },
  { icon: '🎯', text: 'How many ST students were allocated?' },
  { icon: '⭐', text: 'List students with marks above 90 who were not allocated.' },
  { icon: '💺', text: 'What is the fill rate for each course?' },
  { icon: '🔍', text: 'Which course has the most available seats?' },
]

/* ── Parse and render AI response as readable content ─── */
function AiResponseBody({ content }) {
  if (!content) return null

  // Split by double newlines to get paragraphs/blocks
  const blocks = content.split(/\n{2,}/).filter(b => b.trim())

  return (
    <div style={{ fontSize: 13, lineHeight: 1.75, color: '#374151' }}>
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter(l => l.trim())

        // Detect bullet list block
        const isList = lines.every(l =>
          l.trim().startsWith('•') ||
          l.trim().startsWith('-') ||
          l.trim().startsWith('*') ||
          /^\d+[\.\)]/.test(l.trim())
        )

        if (isList) {
          return (
            <ul key={bi} style={{ margin: '6px 0', paddingLeft: 0, listStyle: 'none' }}>
              {lines.map((line, li) => {
                const text = line.replace(/^[•\-\*]|\d+[\.\)]\s*/, '').trim()
                return (
                  <li key={li} style={{
                    display: 'flex', gap: 8, marginBottom: 4,
                    alignItems: 'flex-start',
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#5b5ef6', flexShrink: 0, marginTop: 7,
                    }} />
                    <span>{renderInline(text)}</span>
                  </li>
                )
              })}
            </ul>
          )
        }

        // Single line or paragraph
        const joined = lines.join(' ')
        return (
          <p key={bi} style={{ margin: '4px 0' }}>
            {renderInline(joined)}
          </p>
        )
      })}
    </div>
  )
}

/* Render inline markdown — bold only */
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ fontWeight: 700, color: '#1e293b' }}>
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

/* ── Chat bubble ──────────────────────────────────────── */
function ChatMessage({ msg }) {
  const isUser = msg.role === 'user'

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 10,
      alignItems: 'flex-start',
    }}>
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0, marginTop: 2,
        background: isUser
          ? 'linear-gradient(135deg,#5b5ef6,#7c3aed)'
          : 'linear-gradient(135deg,#2563eb,#5b5ef6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(91,94,246,0.25)',
      }}>
        {isUser
          ? <User size={13} color="#fff" />
          : <Sparkles size={13} color="#fff" />}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: '78%',
        borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
        padding: '12px 16px',
        background: isUser
          ? 'linear-gradient(135deg,#5b5ef6,#7c3aed)'
          : '#ffffff',
        border: isUser ? 'none' : '1.5px solid #e8edf5',
        boxShadow: isUser
          ? '0 4px 16px rgba(91,94,246,0.25)'
          : '0 2px 8px rgba(15,23,42,0.06)',
      }}>
        {isUser ? (
          <p style={{ margin: 0, fontSize: 13, color: '#fff', lineHeight: 1.65 }}>
            {msg.content}
          </p>
        ) : (
          <AiResponseBody content={msg.content} />
        )}
        <p style={{
          margin: '6px 0 0',
          fontSize: 10,
          color: isUser ? 'rgba(255,255,255,0.5)' : '#b0bac9',
          textAlign: isUser ? 'right' : 'left',
        }}>
          {formatDate(msg.timestamp)}
        </p>
      </div>
    </div>
  )
}

/* ── Typing indicator ─────────────────────────────────── */
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: 'linear-gradient(135deg,#2563eb,#5b5ef6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(91,94,246,0.25)',
      }}>
        <Sparkles size={13} color="#fff" />
      </div>
      <div style={{
        borderRadius: '4px 18px 18px 18px',
        padding: '12px 18px',
        background: '#fff',
        border: '1.5px solid #e8edf5',
        boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#a5b4fc', display: 'inline-block',
            animation: 'ai-bounce 1.2s ease infinite',
            animationDelay: `${i * 0.18}s`,
          }} />
        ))}
        <style>{`
          @keyframes ai-bounce {
            0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
            30% { transform: translateY(-5px); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  )
}

/* ── Suggestion button ────────────────────────────────── */
function SuggestionBtn({ s, onClick, disabled }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', textAlign: 'left',
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 12px', borderRadius: 12, border: 'none',
        background: hov ? '#eef2ff' : '#fafbff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background 0.15s',
        outline: 'none',
      }}
    >
      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
      <span style={{
        fontSize: 12, lineHeight: 1.5,
        color: hov ? '#4f46e5' : '#475569',
        fontWeight: 500,
      }}>{s.text}</span>
    </button>
  )
}

/* ── Main ─────────────────────────────────────────────── */
export default function AIAssistant() {
  const { toast } = useToast()
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Hello! I'm your **AI assistant** powered by **Gemini 2.5 Flash**.\n\nAsk me anything about the allocation data — students, courses, statistics, and more! 🎓",
    timestamp: new Date().toISOString(),
  }])
  const [input, setInput]     = useState('')
  const [sessionId]           = useState(() => `session_${Date.now()}`)
  const [showSugg, setShowSugg] = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  const { data: aiStatus } = useQuery({
    queryKey:  ['ai-status'],
    queryFn:   () => aiAPI.status().then(r => r.data),
    staleTime: 60_000,
    retry:     false,
  })

  const chatMutation = useMutation({
    mutationFn: question => aiAPI.chat({ question, session_id: sessionId }),
    onSuccess: res => {
      setMessages(prev => [...prev, {
        role:      'assistant',
        content:   res.data.response,
        timestamp: res.data.created_at ?? new Date().toISOString(),
      }])
    },
    onError: e => {
      setMessages(prev => [...prev, {
        role:      'assistant',
        content:   `Sorry, something went wrong. ${getErrorMessage(e)}`,
        timestamp: new Date().toISOString(),
      }])
    },
  })

  const clearMutation = useMutation({
    mutationFn: () => aiAPI.clearHistory(sessionId),
    onSuccess: () => {
      setMessages([{
        role:      'assistant',
        content:   'Chat cleared. How can I help you?',
        timestamp: new Date().toISOString(),
      }])
      toast.success('Chat cleared.')
    },
    onError: e => toast.error(getErrorMessage(e)),
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatMutation.isPending])

  function send(text) {
    const q = (text ?? input).trim()
    if (!q || chatMutation.isPending) return
    setMessages(prev => [...prev, {
      role: 'user', content: q, timestamp: new Date().toISOString(),
    }])
    setInput('')
    setShowSugg(false)
    chatMutation.mutate(q)
  }

  const chatH = 'calc(100vh - 60px - 48px)'

  return (
    <div style={{ display: 'flex', gap: 20, width: '100%', height: chatH }}>

      {/* ── Main chat panel ─────────────────────────────── */}
      <div style={{
        flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
        borderRadius: 20, overflow: 'hidden',
        background: '#fff',
        border: '1.5px solid #e8edf5',
        boxShadow: '0 2px 20px rgba(15,23,42,0.07)',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px', flexShrink: 0,
          background: 'linear-gradient(135deg,#fafbff,#f0f4ff)',
          borderBottom: '1.5px solid #e8edf5',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(135deg,#2563eb,#5b5ef6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
            }}>
              <Sparkles size={16} color="#fff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#1e293b', lineHeight: 1 }}>
                Gemini AI Assistant
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#22c55e', display: 'inline-block',
                  animation: 'pulse 2s infinite',
                }} />
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  {aiStatus?.model ?? 'Gemini 2.5 Flash'} · Online
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Mobile suggestions toggle */}
            <button
              onClick={() => setShowSugg(v => !v)}
              title="Suggestions"
              style={{
                display: 'none', // shown via media query override below
                padding: '6px 8px', borderRadius: 10, border: 'none',
                background: showSugg ? '#eef2ff' : 'transparent',
                cursor: 'pointer', color: showSugg ? '#5b5ef6' : '#94a3b8',
              }}
              className="xl-hide-sugg-btn"
            >
              <Lightbulb size={15} />
            </button>

            <Button
              variant="ghost" size="xs"
              onClick={() => { if (window.confirm('Clear this chat?')) clearMutation.mutate() }}
              loading={clearMutation.isPending}
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </Button>
          </div>
        </div>

        {/* Mobile suggestions panel */}
        {showSugg && (
          <div style={{
            borderBottom: '1.5px solid #e8edf5',
            padding: '12px 16px', flexShrink: 0,
            background: '#fafbff',
          }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Quick questions
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {SUGGESTIONS.map((s, i) => (
                <SuggestionBtn key={i} s={s} disabled={chatMutation.isPending}
                  onClick={() => send(s.text)} />
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '20px 20px',
          display: 'flex', flexDirection: 'column', gap: 16,
          background: 'linear-gradient(180deg,#fafbff 0%,#f5f7ff 100%)',
        }}>
          {messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
          {chatMutation.isPending && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '12px 16px', flexShrink: 0,
          background: '#fff', borderTop: '1.5px solid #e8edf5',
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
              }}
              placeholder="Ask anything about the allocation data…"
              disabled={chatMutation.isPending}
              style={{
                flex: 1, resize: 'none', maxHeight: 110,
                borderRadius: 14,
                border: '1.5px solid #dde3ef',
                padding: '11px 16px',
                fontSize: 13, color: '#0f172a',
                background: '#fafbff',
                outline: 'none',
                fontFamily: "'Inter',system-ui,sans-serif",
                lineHeight: 1.6,
                transition: 'border-color 0.18s, box-shadow 0.18s',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#5b5ef6'
                e.target.style.boxShadow = '0 0 0 3px rgba(91,94,246,0.1)'
                e.target.style.background = '#fff'
              }}
              onBlur={e => {
                e.target.style.borderColor = '#dde3ef'
                e.target.style.boxShadow = 'none'
                e.target.style.background = '#fafbff'
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || chatMutation.isPending}
              style={{
                width: 44, height: 44, borderRadius: 14, border: 'none',
                background: input.trim() && !chatMutation.isPending
                  ? 'linear-gradient(135deg,#5b5ef6,#7c3aed)'
                  : '#e8edf5',
                color: input.trim() && !chatMutation.isPending ? '#fff' : '#b0bac9',
                cursor: input.trim() && !chatMutation.isPending ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: input.trim() && !chatMutation.isPending
                  ? '0 4px 14px rgba(91,94,246,0.35)' : 'none',
                transition: 'all 0.18s',
              }}
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </div>
          <p style={{
            margin: '6px 0 0', fontSize: 10,
            color: '#b0bac9', textAlign: 'center',
          }}>
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* ── Desktop suggestions sidebar ──────────────────── */}
      <div className="hidden xl:flex" style={{ width: 260, flexShrink: 0, flexDirection: 'column', gap: 12, overflowY: 'auto' }}>

        {/* Suggestions */}
        <div style={{
          borderRadius: 20, padding: '16px',
          background: '#fff', border: '1.5px solid #e8edf5',
          boxShadow: '0 2px 16px rgba(15,23,42,0.06)',
        }}>
          <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
            Suggested Questions
          </p>
          <p style={{ margin: '0 0 12px', fontSize: 11, color: '#94a3b8' }}>
            Click to send instantly
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {SUGGESTIONS.map((s, i) => (
              <SuggestionBtn key={i} s={s} disabled={chatMutation.isPending}
                onClick={() => send(s.text)} />
            ))}
          </div>
        </div>

        {/* Model info */}
        <div style={{
          borderRadius: 20, padding: '16px',
          background: '#fff', border: '1.5px solid #e8edf5',
          boxShadow: '0 2px 16px rgba(15,23,42,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9,
              background: 'linear-gradient(135deg,#2563eb,#5b5ef6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={14} color="#fff" />
            </div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
              Gemini 2.5 Flash
            </p>
          </div>
          {[
            ['Provider', 'Google ADK'],
            ['Mode', 'Natural Language'],
            ['Messages', messages.length],
          ].map(([k, v]) => (
            <div key={k} style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 8,
            }}>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{k}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Status</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#16a34a' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              Online
            </span>
          </div>
        </div>

        {/* Tips */}
        <div style={{
          borderRadius: 20, padding: '16px',
          background: '#fff', border: '1.5px solid #e8edf5',
          boxShadow: '0 2px 16px rgba(15,23,42,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Lightbulb size={14} color="#d97706" />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Pro Tips</p>
          </div>
          {[
            'Ask about specific categories (General, OBC, SC, ST)',
            'Compare courses by fill rate',
            'Ask for allocation statistics',
            'Find unallocated students by marks range',
          ].map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#d97706', flexShrink: 0, marginTop: 6,
              }} />
              <span style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{tip}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 1279px) {
          .xl-hide-sugg-btn { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
