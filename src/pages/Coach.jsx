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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="bg-[#0f0f0f] border border-[#2a2a2a] w-full max-w-md mx-4 p-8">
        <div className="text-center mb-6">
          <div className="text-[#dc2626] text-2xl font-black mb-2">⚡</div>
          <h2 className="text-lg font-black uppercase tracking-widest mb-2">Anthropic API Key Required</h2>
          <p className="text-xs text-[#444] font-mono">Stored locally. Never sent anywhere except Anthropic.</p>
        </div>
        <div className="space-y-3">
          <input
            type="password"
            value={keyDraft}
            onChange={e => setKeyDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveKey()}
            placeholder="sk-ant-..."
            autoFocus
            className="w-full bg-[#080808] border border-[#2a2a2a] px-3 py-3 text-sm text-white font-mono placeholder-[#333] focus:outline-none focus:border-[#dc2626]"
          />
          <button onClick={saveKey} className="w-full py-3 bg-[#dc2626] text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-colors">
            Save & Start
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-[#080808]">
      {showKeyModal && <KeyModal />}

      <div className="px-8 py-5 border-b border-[#2a2a2a] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-tight">Coach</h1>
          <p className="text-[10px] font-mono text-[#444] mt-0.5 uppercase tracking-widest">Demanding mentor · {MODEL}</p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button onClick={() => { if (window.confirm('Start new session?')) setMessages([]) }} className="flex items-center gap-1.5 px-3 py-1.5 border border-[#2a2a2a] text-[#444] text-[9px] uppercase tracking-widest hover:border-[#dc2626] hover:text-white transition-colors">
              <Plus size={9} /> New Session
            </button>
          )}
          <button onClick={() => { setKeyDraft(apiKey); setShowKeyModal(true) }} className="text-[#333] hover:text-white transition-colors p-1.5">
            <Settings size={14} strokeWidth={1.5} />
          </button>
          {apiKey ? (
            <span className="text-[9px] font-mono text-[#16a34a]/70 border border-[#16a34a]/20 px-2 py-1 uppercase tracking-widest">Key ✓</span>
          ) : (
            <span className="text-[9px] font-mono text-[#dc2626]/70 border border-[#dc2626]/20 px-2 py-1 uppercase tracking-widest">No Key</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6">
        {messages.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center max-w-md mx-auto">
            <Bot size={28} className="text-[#222]" strokeWidth={1} />
            <div>
              <p className="text-[#888] text-sm font-medium">Your coach is ready</p>
              <p className="text-[#333] text-xs mt-1 font-mono">
                {apiKey ? 'Full context loaded from all your data.' : 'Set your API key to start.'}
              </p>
            </div>
            <div className="w-full space-y-1.5">
              {STARTERS.map(p => (
                <button key={p} onClick={() => { setInput(p); textareaRef.current?.focus() }}
                  className="w-full text-left px-4 py-3 border border-[#2a2a2a] text-xs text-[#444] hover:border-[#dc2626] hover:text-white transition-colors bg-[#0f0f0f]">
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-mono font-black border ${
                  msg.role === 'user' ? 'bg-white text-black border-white' : 'bg-[#141414] border-[#2a2a2a] text-[#444]'
                }`}>
                  {msg.role === 'user' ? 'M' : <Bot size={11} />}
                </div>
                <div className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#141414] border border-[#2a2a2a] text-white'
                    : 'bg-[#0f0f0f] border border-[#2a2a2a] border-l-[#dc2626] border-l-2 text-[#999]'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 border border-[#2a2a2a] bg-[#141414] flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={11} className="text-[#444]" />
                </div>
                <div className="bg-[#0f0f0f] border border-[#2a2a2a] border-l-[#dc2626] border-l-2 px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-[#444] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 h-1 bg-[#444] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1 h-1 bg-[#444] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="bg-red-950/20 border border-red-900/40 px-4 py-3 text-xs text-red-400 font-mono">{error}</div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-8 py-4 border-t border-[#2a2a2a] shrink-0 bg-[#080808]">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder={apiKey ? 'Ask your coach...' : 'Set API key first...'}
              rows={1}
              disabled={!apiKey}
              className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#dc2626] resize-none transition-colors overflow-hidden disabled:opacity-30"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim() || !apiKey}
              className="px-5 py-3 bg-[#dc2626] text-white hover:bg-red-500 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center shrink-0"
            >
              <Send size={14} />
            </button>
          </div>
          <div className="text-[9px] font-mono text-[#222] mt-2 flex items-center justify-between">
            <span>Context built from all sections in real-time</span>
            <span>{messages.length} messages</span>
          </div>
        </div>
      </div>
    </div>
  )
}
