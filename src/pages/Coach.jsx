import { useState, useRef, useEffect } from 'react'
import { Send, ChevronDown, ChevronUp, Loader, Bot, Plus } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'

const MODEL = 'claude-sonnet-4-6'

function getCurrentStreak(logs = []) {
  if (!logs.length) return 0
  const set = new Set(logs)
  const today = new Date().toISOString().split('T')[0]
  const yest = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  let cur = set.has(today) ? today : set.has(yest) ? yest : null
  if (!cur) return 0
  let count = 0
  let d = new Date(cur)
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
    const pipeline = openDeals.reduce((s, d) => s + (parseFloat(d.value) || 0), 0)
    const closedDeals = deals.filter(d => ['Closed', 'Lost'].includes(d.status))
    const wonDeals = deals.filter(d => d.status === 'Closed')
    const closeRate = closedDeals.length > 0 ? Math.round((wonDeals.length / closedDeals.length) * 100) : 0

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

    const recentWorkouts = (body.workouts || []).slice(0, 5).map(w =>
      `• ${w.date} — ${w.name}${w.exercises?.length ? ` (${w.exercises.length} exercises)` : ''}`
    ).join('\n')

    const recentLessons = lessons.slice(0, 3).map(l =>
      `• ${l.title}: ${l.whatLearned?.slice(0, 100) || ''}${(l.whatLearned?.length || 0) > 100 ? '...' : ''}`
    ).join('\n')

    const name = settings.name || 'Marko'

    return `You are ${name}'s personal AI coach — a demanding, high-standards mentor who has complete context on his life. You are NOT a cheerleader. You are NOT here to make him feel good. You are here to help him WIN.

Your job: ask hard questions, call out patterns, hold him to his word, and give real tactical answers. Be direct. No fluff. No filler phrases. No "Great question!" or "Certainly!". If he's slipping, say it. If he's winning, acknowledge it briefly and push harder.

You have full context on his data. Reference actual numbers when relevant. Think across all domains simultaneously — his body, business, soul, relationships, and mind are all connected.

Today: ${todayStr}

═══ IDENTITY ═══
${soul.identity ? soul.identity : '(no identity statement written yet — call this out)'}

Core Values: ${values.length > 0 ? values.map(v => v.value || v).join(', ') : '(none set)'}
Prayer log: ${prayers.length} entries | Last: ${prayers[0]?.date || 'never'}

═══ HABITS (TODAY) ═══
${habitLines || '(no habits tracked)'}

═══ BODY ═══
Weight: ${body.currentWeight ? `${body.currentWeight} lbs` : 'not tracked'}
Body fat: ${body.bodyFat ? `${body.bodyFat}%` : 'not tracked'} | Goal: ${body.goalBodyFat ? `${body.goalBodyFat}%` : 'not set'}
${recentWorkouts ? `Recent workouts:\n${recentWorkouts}` : 'No workouts logged recently'}
Today's calories: ${todayDiet.calories || 0} kcal (target: ${diet.targets?.calories || 2500})
Today's protein: ${todayDiet.protein || 0}g (target: ${diet.targets?.protein || 200}g)

═══ BUSINESS ═══
Revenue MTD: $${monthRevenue.toLocaleString()} | Gap to $10k: ${gap === 0 ? 'GOAL HIT 🎯' : `$${gap.toLocaleString()}`}
Pipeline: $${pipeline.toLocaleString()} across ${openDeals.length} open deals
Close rate: ${closeRate}% (${wonDeals.length} won / ${closedDeals.length} closed)
${openDeals.length > 0 ? `Open deals:\n${openDeals.slice(0, 5).map(d => `• ${d.name || d.client} — $${parseFloat(d.value||0).toLocaleString()} [${d.status}]`).join('\n')}` : 'No open deals in pipeline'}
${recentLessons ? `Recent lessons learned:\n${recentLessons}` : ''}

═══ MIND ═══
Knowledge entries: ${mindEntries.length} | Categories: ${[...new Set(mindEntries.map(e => e.category))].join(', ') || 'none'}

═══ RELATIONS ═══
People tracked: ${people.length}
${people.slice(0, 6).map(p => {
  const days = p.lastContact ? Math.floor((Date.now() - new Date(p.lastContact)) / 86400000) : null
  return `• ${p.name} (${p.type || 'unknown'}) — energy: ${p.energy || 'unknown'} | last contact: ${days !== null ? `${days}d ago` : 'unknown'}`
}).join('\n') || '(no people tracked)'}

═══ YOUR RULES ═══
- Answer in 3-8 sentences unless depth is asked for
- Use his actual numbers, not hypotheticals
- When he asks what to focus on: synthesize all domains and give ONE clear priority
- Never soften hard truths
- If something in his data is concerning, bring it up proactively`
  } catch {
    return `You are Marko's personal AI coach. You are a demanding mentor — direct, no fluff, high standards. Reference his actual data when possible. Help him win across business, body, soul, relationships, and mind.`
  }
}

const STARTERS = [
  "What should I focus on today?",
  "Where am I slipping — be honest.",
  "How do I close the gap to $10k this month?",
  "What patterns do you see across my data?",
]

export default function Coach() {
  const [settings] = useLocalStorage('marko_settings', { apiKey: '' })
  const [messages, setMessages] = useLocalStorage('marko_coach_messages', [])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showContext, setShowContext] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  const apiKey = settings?.apiKey || ''

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
    if (!apiKey) {
      setError('No API key set. Go to Settings (bottom of sidebar) to add your Anthropic API key.')
      return
    }

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
          max_tokens: 1536,
          system: buildSystemPrompt(),
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `HTTP ${res.status}`)
      }

      const data = await res.json()
      const reply = { role: 'assistant', content: data.content[0].text, id: Date.now() + 1 }
      setMessages([...history, reply])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  const newConversation = () => {
    if (messages.length === 0) return
    if (window.confirm('Start a new conversation? Current history will be cleared.')) setMessages([])
  }

  const systemPrompt = buildSystemPrompt()

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      <div className="px-8 py-6 border-b border-[#1f1f1f] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight uppercase">Coach</h1>
          <p className="text-[10px] font-mono text-[#555] mt-0.5 uppercase tracking-widest">
            Demanding mentor · {MODEL}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowContext(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#2a2a2a] text-[#555] text-[9px] uppercase tracking-widest hover:border-[#555] hover:text-neutral-300 transition-colors"
          >
            Context {showContext ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
          </button>
          <button
            onClick={newConversation}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#2a2a2a] text-[#555] text-[9px] uppercase tracking-widest hover:border-[#555] hover:text-neutral-300 transition-colors"
          >
            <Plus size={9} /> New
          </button>
          {!apiKey && (
            <span className="text-[9px] font-mono text-red-500/70 border border-red-900/30 px-2 py-1 uppercase tracking-widest">
              No API Key
            </span>
          )}
          {apiKey && (
            <span className="text-[9px] font-mono text-[#facc15]/70 border border-[#facc15]/20 px-2 py-1 uppercase tracking-widest">
              Key Set ✓
            </span>
          )}
        </div>
      </div>

      {showContext && (
        <div className="px-8 py-4 border-b border-[#1f1f1f] bg-[#0d0d0d] shrink-0 max-h-56 overflow-auto">
          <div className="text-[9px] font-mono uppercase tracking-widest text-[#444] mb-2">Live System Prompt</div>
          <pre className="text-[10px] font-mono text-[#555] whitespace-pre-wrap leading-relaxed">{systemPrompt}</pre>
        </div>
      )}

      <div className="flex-1 overflow-auto px-8 py-6">
        {messages.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center max-w-md mx-auto">
            <Bot size={28} className="text-[#222]" strokeWidth={1} />
            <div>
              <p className="text-neutral-400 text-sm font-medium">Your coach is ready</p>
              <p className="text-[#444] text-xs mt-1 font-mono">
                {apiKey ? 'Full context loaded from all your data.' : 'Add your Anthropic API key in Settings to start.'}
              </p>
            </div>
            <div className="w-full space-y-1.5">
              {STARTERS.map(p => (
                <button
                  key={p}
                  onClick={() => { setInput(p); textareaRef.current?.focus() }}
                  className="w-full text-left px-4 py-3 border border-[#1f1f1f] text-xs text-[#555] hover:border-[#2a2a2a] hover:text-neutral-300 transition-colors bg-[#111]"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {loading && (
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 border border-[#2a2a2a] bg-[#151515] flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={11} className="text-[#555]" />
                </div>
                <div className="bg-[#111] border border-[#1f1f1f] px-4 py-3">
                  <Loader size={13} className="text-[#444] animate-spin" />
                </div>
              </div>
            )}
            {error && (
              <div className="bg-red-950/20 border border-red-900/40 px-4 py-3 text-xs text-red-400 font-mono">
                {error}
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-8 py-4 border-t border-[#1f1f1f] shrink-0 bg-[#0a0a0a]">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder={apiKey ? 'Ask your coach... (Enter to send)' : 'Set API key in Settings first...'}
              rows={1}
              disabled={!apiKey}
              className="flex-1 bg-[#111] border border-[#1f1f1f] px-4 py-3 text-sm text-neutral-100 placeholder-[#444] focus:outline-none focus:border-[#2a2a2a] resize-none transition-colors overflow-hidden disabled:opacity-40"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim() || !apiKey}
              className="px-5 py-3 bg-[#facc15] text-black hover:bg-yellow-300 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center shrink-0"
            >
              <Send size={14} />
            </button>
          </div>
          <div className="text-[9px] font-mono text-[#333] mt-2 flex items-center justify-between">
            <span>Context built from all sections in real-time</span>
            <span>{messages.length} messages</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-6 h-6 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-mono font-bold border ${
        isUser ? 'bg-[#facc15] text-black border-[#facc15]' : 'bg-[#151515] border-[#2a2a2a] text-[#555]'
      }`}>
        {isUser ? 'M' : <Bot size={11} />}
      </div>
      <div className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
        isUser ? 'bg-[#191919] border border-[#2a2a2a] text-neutral-200' : 'bg-[#111] border border-[#1f1f1f] text-neutral-300'
      }`}>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}
