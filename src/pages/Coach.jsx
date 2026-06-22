import { useState, useRef, useEffect } from 'react'
import { Send, Plus, Bot, Settings, X } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'

const MODEL = 'claude-sonnet-4-6'

function getCurrentStreak(logs = []) {
  if (!logs.length) return 0
  const set = new Set(logs)
  const today = new Date().toISOString().split('T')[0]
  const yest = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const anchor = set.has(today) ? today : set.has(yest) ? yest : null
  if (!anchor) return 0
  let count = 0
  let d = new Date(anchor)
  while (set.has(d.toISOString().split('T')[0])) {
    count++
    d = new Date(d.getTime() - 86400000)
  }
  return count
}

function buildSystemPrompt() {
  try {
    const get = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback } }

    const habits      = get('marko_habits', [])
    const mindEntries = get('marko_mind', [])
    const body        = get('marko_body', {})
    const diet        = get('marko_diet', { targets: {}, history: [], supplements: [] })
    const soul        = get('marko_soul', { prayers: [], values: [], identity: '' })
    const business    = get('marko_business', { deals: [], lessons: [], revenueHistory: [] })
    const relations   = get('marko_relations', { people: [], behaviorNotes: [] })
    const settings    = get('marko_settings', { name: 'Marko' })

    const todayStr = new Date().toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

    const revenueHistory = business.revenueHistory || []
    const deals = business.deals || []
    const lessons = business.lessons || []

    const monthRevenue = revenueHistory.filter(r => r.date >= monthStart).reduce((s, r) => s + (r.amount || 0), 0)
    const gap = Math.max(0, 10000 - monthRevenue)
    const openDeals = deals.filter(d => !['Closed', 'Lost'].includes(d.status))
    const wonDeals = deals.filter(d => d.status === 'Closed')
    const closedDeals = deals.filter(d => ['Closed', 'Lost'].includes(d.status))
    const closeRate = closedDeals.length > 0 ? Math.round((wonDeals.length / closedDeals.length) * 100) : 0
    const pipeline = openDeals.reduce((s, d) => s + (parseFloat(d.value) || 0), 0)

    const todayDiet = (diet.history || []).find(h => h.date === todayStr) || {}
    const prayers = soul.prayers || []
    const values = soul.values || []
    const people = relations.people || []

    const habitLines = habits.filter(h => h.active !== false).map(h => {
      const streak = getCurrentStreak(h.logs || [])
      const doneToday = (h.logs || []).includes(todayStr)
      const failToday = (h.fails || []).includes(todayStr)
      const status = doneToday ? '✓ done' : failToday ? '✗ failed' : '— not logged'
      return `• ${h.name}: ${streak}d streak | today: ${status}`
    }).join('\n')

    const recentLessons = lessons.slice(0, 3).map(l =>
      `• ${l.title}: ${l.whatLearned?.slice(0, 100) || l.learned?.slice(0, 100) || ''}`
    ).join('\n')

    const name = settings.name || 'Marko'

    return `You are ${name}'s personal AI coach. You are a demanding, no-excuses mentor with complete context on his life. You are NOT here to make him feel good. You are here to make him WIN.

Rules:
- No filler phrases. No "Great question!" No "Certainly!" No "I understand."
- Reference his actual data. "Your gym streak is 12 days" not "you should exercise."
- When he asks what to focus on: give ONE clear answer, no essay.
- If something in his data is concerning, bring it up unprompted.
- Be short unless depth is requested. 3-6 sentences is usually enough.
- Call out patterns across domains. His body, business, soul are connected.

Today: ${todayStr}

═══ IDENTITY ═══
${soul.identity ? soul.identity : '(NO IDENTITY STATEMENT WRITTEN — ask him why not)'}

Core Values: ${values.length > 0 ? values.map(v => v.value || v).join(', ') : '(none set — red flag)'}
Prayers logged: ${prayers.length} | Last: ${prayers[0]?.date || 'never'}

═══ HABITS (TODAY) ═══
${habitLines || '(no habits tracked)'}

═══ BODY ═══
Weight: ${body.currentWeight ? `${body.currentWeight} lbs` : 'not tracked'}
Body fat: ${body.bodyFat ? `${body.bodyFat}%` : 'not tracked'} | Goal: ${body.goalBodyFat ? `${body.goalBodyFat}%` : 'not set'}
Today: ${todayDiet.calories || 0} kcal / ${todayDiet.protein || 0}g protein (targets: ${diet.targets?.calories || 2500} kcal / ${diet.targets?.protein || 200}g)

═══ BUSINESS ═══
Revenue MTD: $${monthRevenue.toLocaleString()} | Gap to $10k: ${gap === 0 ? 'GOAL HIT' : `$${gap.toLocaleString()}`}
Pipeline: $${pipeline.toLocaleString()} across ${openDeals.length} open deals
Close rate: ${closeRate}% (${wonDeals.length} won / ${closedDeals.length} closed)
${openDeals.length > 0 ? `Open: ${openDeals.slice(0,3).map(d => `${d.prospect} $${d.value} [${d.status}]`).join(' | ')}` : 'No open deals'}
${recentLessons ? `Recent lessons:\n${recentLessons}` : ''}

═══ MIND ═══
Knowledge base: ${mindEntries.length} entries

═══ RELATIONS ═══
${people.slice(0, 5).map(p => {
  const days = (p.lastContact || p.lastInteraction) ? Math.floor((Date.now() - new Date(p.lastContact || p.lastInteraction).getTime()) / 86400000) : null
  return `• ${p.name} (${p.type}) — ${p.energyRating} | ${days !== null ? `${days}d ago` : 'unknown'}`
}).join('\n') || '(no people tracked)'}

Your job: give real answers, push hard, demand excellence.`
  } catch {
    return `You are Marko's personal AI coach — demanding, no fluff, high standards. Reference real data. Help him win.`
  }
}

const STARTERS = [
  "What should I focus on today?",
  "Where am I slipping — be honest.",
  "How do I hit $10k this month?",
  "What patterns do you see in my data?",
]

export default function Coach() {
  const [messages, setMessages] = useLocalStorage('marko_coach_messages', [])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [keyDraft, setKeyDraft] = useState('')
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  const [apiKey, setApiKeyState] = useState(() => import.meta.env.VITE_ANTHROPIC_API_KEY || localStorage.getItem('anthropic_key') || '')

  const saveKey = () => {
    const k = keyDraft.trim()
    localStorage.setItem('anthropic_key', k)
    setApiKeyState(k)
    setShowKeyModal(false)
    setKeyDraft('')
  }

  useEffect(() => {
    if (!apiKey) setShowKeyModal(true)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [input])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return
    if (!apiKey) { setShowKeyModal(true); return }

    const userMsg = { role: 'user', content: text, id: Date.now() }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)
    setError('')

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1000,
          system: buildSystemPrompt(),
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `HTTP ${res.status}`)
      }

      const data = await res.json()
      setMessages([...history, { role: 'assistant', content: data.content[0].text, id: Date.now() + 1 }])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  const KeyModal = () => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.92)' }}>
      <div style={{ background: '#080e1a', border: '1px solid #1e3050', width: '100%', maxWidth: 448, margin: '0 16px', padding: 32, borderRadius: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ color: '#b8a0ff', fontSize: 24, fontWeight: 900, marginBottom: 8 }}>⚡</div>
          <h2 style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#fff', marginBottom: 8 }}>Anthropic API Key Required</h2>
          <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#a0bcdf' }}>Stored locally. Never sent anywhere except Anthropic.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            value={keyDraft}
            onChange={e => setKeyDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveKey()}
            placeholder="sk-ant-..."
            autoFocus
            style={{ width: '100%', background: '#020609', border: '1px solid #1e3050', padding: '12px', fontSize: 14, color: '#fff', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', borderRadius: 6 }}
            onFocus={e => e.target.style.borderColor = '#b8a0ff'}
            onBlur={e => e.target.style.borderColor = '#1e3050'}
          />
          <button onClick={saveKey} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', border: 'none', cursor: 'pointer', borderRadius: 6, boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}>
            Save & Start
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col" style={{ background: '#020609' }}>
      {showKeyModal && <KeyModal />}

      {/* Page Header */}
      <div style={{ background: '#020609', borderBottom: '1px solid #1e3050', padding: '20px 32px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, color: '#a0bcdf', letterSpacing: '0.12em', textTransform: 'uppercase' }}>AI COMMAND LINK ACTIVE</span>
            </div>
            <h1 style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 64, fontWeight: 400, lineHeight: 0.9, fontStyle: 'italic', letterSpacing: '0.02em', background: 'linear-gradient(135deg, #b8a0ff, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
              COACH
            </h1>
            <p style={{ fontFamily: 'Inter', fontSize: 10, color: '#a0bcdf', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>OPERATOR AI // STRATEGIC ADVISOR</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {messages.length > 0 && (
              <button
                onClick={() => { if (window.confirm('Start new session?')) setMessages([]) }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid #1e3050', color: '#a0bcdf', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', background: 'transparent', cursor: 'pointer' }}
              >
                <Plus size={9} /> New Session
              </button>
            )}
            <button
              onClick={() => { setKeyDraft(apiKey); setShowKeyModal(true) }}
              style={{ color: '#a0bcdf', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 6 }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = '#a0bcdf'}
            >
              <Settings size={14} strokeWidth={1.5} />
            </button>
            {apiKey ? (
              <span style={{ fontSize: 9, fontFamily: 'Inter', color: '#1ad9a0', border: '1px solid rgba(26,217,160,0.4)', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Key ✓</span>
            ) : (
              <span style={{ fontSize: 9, fontFamily: 'Inter', color: '#b8a0ff', border: '1px solid rgba(184,160,255,0.4)', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>No Key</span>
            )}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-auto" style={{ padding: '24px 32px' }}>
        {messages.length === 0 && !loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 24, textAlign: 'center', maxWidth: 448, margin: '0 auto' }}>
            <Bot size={28} style={{ color: '#2a4a7a' }} strokeWidth={1} />
            <div>
              <p style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 500, color: '#a0bcdf' }}>Your coach is ready</p>
              <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#a0bcdf', marginTop: 4 }}>
                {apiKey ? 'Full context loaded from all your data.' : 'Set your API key to start.'}
              </p>
            </div>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {STARTERS.map(p => (
                <button
                  key={p}
                  onClick={() => { setInput(p); textareaRef.current?.focus() }}
                  style={{ width: '100%', textAlign: 'left', padding: '12px 16px', border: '1px solid #1e3050', fontSize: 12, color: '#a0bcdf', background: '#080e1a', cursor: 'pointer', borderRadius: 8, fontFamily: 'Inter', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#b8a0ff'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e3050'; e.currentTarget.style.color = '#a0bcdf' }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 768, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{
                  width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
                  fontSize: 10, fontFamily: 'monospace', fontWeight: 900,
                  background: msg.role === 'user' ? '#fff' : '#080e1a',
                  color: msg.role === 'user' ? '#000' : '#a0bcdf',
                  border: msg.role === 'user' ? '1px solid #fff' : '1px solid rgba(184,160,255,0.35)',
                  borderRadius: 4,
                }}>
                  {msg.role === 'user' ? 'M' : <Bot size={11} />}
                </div>
                <div style={{
                  maxWidth: '85%', padding: '12px 16px', fontSize: 14, lineHeight: 1.6,
                  background: msg.role === 'user' ? 'rgba(184,160,255,0.15)' : 'linear-gradient(135deg, #080e1a, #080e1a)',
                  border: msg.role === 'user' ? '1px solid rgba(184,160,255,0.35)' : '1px solid rgba(184,160,255,0.35)',
                  borderLeft: msg.role === 'assistant' ? '2px solid #b8a0ff' : undefined,
                  boxShadow: msg.role === 'assistant' ? '0 0 20px rgba(99,102,241,0.1)' : undefined,
                  color: msg.role === 'user' ? '#fff' : '#c8d8f0',
                  borderRadius: 8,
                }}>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 24, height: 24, border: '1px solid rgba(184,160,255,0.35)', background: '#080e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, borderRadius: 4 }}>
                  <Bot size={11} style={{ color: '#a0bcdf' }} />
                </div>
                <div style={{ background: 'linear-gradient(135deg, #080e1a, #080e1a)', border: '1px solid rgba(184,160,255,0.35)', borderLeft: '2px solid #b8a0ff', padding: '12px 16px', borderRadius: 8, boxShadow: '0 0 20px rgba(99,102,241,0.1)' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <div className="w-1 h-1 animate-bounce" style={{ width: 4, height: 4, background: '#a0bcdf', animationDelay: '0ms' }} />
                    <div className="w-1 h-1 animate-bounce" style={{ width: 4, height: 4, background: '#a0bcdf', animationDelay: '150ms' }} />
                    <div className="w-1 h-1 animate-bounce" style={{ width: 4, height: 4, background: '#a0bcdf', animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div style={{ background: 'rgba(127,29,29,0.2)', border: '1px solid rgba(127,29,29,0.4)', padding: '12px 16px', fontSize: 12, color: '#f87171', fontFamily: 'monospace', borderRadius: 8 }}>{error}</div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Chat input area */}
      <div style={{ padding: '16px 32px', borderTop: '1px solid #1e3050', flexShrink: 0, background: '#080e1a' }}>
        <div style={{ maxWidth: 768, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder={apiKey ? 'Ask your coach...' : 'Set API key first...'}
              rows={1}
              disabled={!apiKey}
              style={{ flex: 1, background: '#020609', border: '1px solid #1e3050', padding: '12px 16px', fontSize: 14, color: '#fff', resize: 'none', outline: 'none', overflow: 'hidden', fontFamily: 'Inter', opacity: apiKey ? 1 : 0.3, borderRadius: 8, transition: 'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor = '#b8a0ff'}
              onBlur={e => e.target.style.borderColor = '#1e3050'}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim() || !apiKey}
              style={{ padding: '12px 20px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, borderRadius: 8, opacity: (loading || !input.trim() || !apiKey) ? 0.2 : 1, transition: 'opacity 0.15s', boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}
            >
              <Send size={14} />
            </button>
          </div>
          <div style={{ fontSize: 9, fontFamily: 'Inter', color: '#5a7aaa', marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>Context built from all sections in real-time</span>
            <span>{messages.length} messages</span>
          </div>
        </div>
      </div>
    </div>
  )
}
