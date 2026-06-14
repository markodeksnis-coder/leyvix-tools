import { useState, useRef, useEffect } from 'react'
import { Send, Key, ChevronDown, ChevronUp, Loader, Bot, Trash2 } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'

const MODEL = 'claude-sonnet-4-6'

function buildSystemPrompt() {
  try {
    const get = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback } }

    const mindEntries    = get('mind_entries', [])
    const bodyStats      = get('body_stats', {})
    const workouts       = get('body_workouts', [])
    const diet           = get('body_diet', { targets: {}, history: [] })
    const people         = get('relations_people', [])
    const psyNotes       = get('relations_psy_notes', [])
    const deals          = get('business_deals', [])
    const revenue        = get('business_revenue_history', [])
    const prayers        = get('soul_prayers', [])
    const values         = get('soul_values', [])
    const identity       = localStorage.getItem('soul_identity') || ''

    const todayStr = new Date().toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const monthRevenue = revenue.filter(r => r.date >= monthStart).reduce((s, r) => s + r.amount, 0)
    const gap = Math.max(0, 10000 - monthRevenue)
    const pipeline = deals.filter(d => !['Won', 'Lost'].includes(d.stage)).reduce((s, d) => s + (parseFloat(d.value) || 0), 0)
    const wonDeals = deals.filter(d => d.stage === 'Won').length
    const closedDeals = deals.filter(d => ['Won', 'Lost'].includes(d.stage)).length
    const closeRate = closedDeals > 0 ? Math.round((wonDeals / closedDeals) * 100) : 0
    const todayDiet = diet.history?.find(h => h.date === todayStr) || { calories: 0, protein: 0 }
    const mindCategories = [...new Set(mindEntries.map(e => e.category))]

    return `You are Marko's personal AI operating system coach. You have complete context on his life across six domains: mind, body, relations, business, soul, and overall strategy. You speak directly, like a trusted high-performance advisor who knows him deeply — not a generic assistant. No fluff. Reference his actual data when relevant. Be direct, tactical, and honest. If he's off track, say it. If he's winning, acknowledge it and push further.

Today: ${todayStr}

═══ IDENTITY & SOUL ═══
Identity: ${identity || '(not written yet)'}
Core Values: ${values.length > 0 ? values.join(', ') : '(not set)'}
Recent prayers: ${prayers.length} logged
${prayers.slice(0, 2).map(p => `• ${p.date}: "${p.content.slice(0, 120)}${p.content.length > 120 ? '...' : ''}"`).join('\n') || '(none yet)'}

═══ BODY ═══
Weight: ${bodyStats.weight ? `${bodyStats.weight} lbs` : 'not tracked'}
Body Fat: ${bodyStats.bodyFat ? `${bodyStats.bodyFat}%` : 'not tracked'}
Recent workouts: ${workouts.slice(0, 5).map(w => `${w.name} (${w.type}, ${w.date?.slice(0,10)})`).join(', ') || 'none logged'}
Today's calories: ${todayDiet.calories} kcal (target: ${diet.targets?.calories || 2500})
Today's protein: ${todayDiet.protein}g (target: ${diet.targets?.protein || 200}g)

═══ BUSINESS ═══
Revenue this month: $${monthRevenue.toLocaleString()}
Gap to $10k goal: ${gap === 0 ? 'GOAL HIT' : `$${gap.toLocaleString()} remaining`}
Active pipeline: $${pipeline.toLocaleString()} across ${deals.filter(d => !['Won','Lost'].includes(d.stage)).length} deals
Close rate: ${closeRate}% (${wonDeals} won / ${closedDeals} closed)
Open deals:
${deals.filter(d => !['Won','Lost'].includes(d.stage)).slice(0,5).map(d => `• ${d.name} — $${parseFloat(d.value||0).toLocaleString()} [${d.stage}]`).join('\n') || '• None'}

═══ MIND (Knowledge Base) ═══
Total entries: ${mindEntries.length}
Categories active: ${mindCategories.join(', ') || 'none'}

═══ RELATIONS ═══
People tracked: ${people.length}
${people.slice(0, 6).map(p => {
  const days = Math.floor((Date.now() - new Date(p.lastInteraction)) / 86400000)
  return `• ${p.name} (${p.type}) — last contact ${days === 0 ? 'today' : `${days}d ago`}`
}).join('\n') || '• None tracked yet'}
Psychology notes: ${psyNotes.length} observations

═══ HOW TO RESPOND ═══
- Be concise unless depth is requested
- Reference his actual numbers, not hypotheticals
- Call out patterns across domains when you see them
- Think like a coach who wants him to win — not a chatbot trying to be helpful
- When he asks what to focus on, synthesize across all domains and give a clear answer`
  } catch {
    return `You are Marko's personal AI coach. Be direct, tactical, and honest. Help him optimize his business, body, relationships, mind, and spirit.`
  }
}

const STARTER_PROMPTS = [
  "What should I focus on this week?",
  "How close am I to my $10k revenue goal?",
  "What's my biggest bottleneck right now?",
  "Give me a tactical plan for today.",
]

export default function Coach() {
  const [apiKey, setApiKey] = useLocalStorage('coach_api_key', '')
  const [messages, setMessages] = useLocalStorage('coach_messages', [])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [keyDraft, setKeyDraft] = useState('')
  const [showContext, setShowContext] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [input])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return
    if (!apiKey) { setShowKeyInput(true); return }

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

  const saveKey = () => {
    if (keyDraft.trim()) {
      setApiKey(keyDraft.trim())
      setShowKeyInput(false)
      setKeyDraft('')
    }
  }

  const clearChat = () => {
    if (window.confirm('Clear conversation history?')) setMessages([])
  }

  const systemPrompt = buildSystemPrompt()

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#1f1f1f] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Coach</h1>
          <p className="text-[10px] font-mono text-neutral-600 mt-0.5 uppercase tracking-widest">
            AI that actually knows you · {MODEL}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowContext(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#2a2a2a] text-neutral-600 text-[10px] uppercase tracking-widest hover:border-neutral-600 hover:text-neutral-300 transition-colors"
          >
            Context
            {showContext ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
          <button
            onClick={() => { setShowKeyInput(v => !v); setKeyDraft('') }}
            className={`flex items-center gap-1.5 px-3 py-1.5 border text-[10px] uppercase tracking-widest transition-colors ${
              apiKey
                ? 'border-[#2a2a2a] text-neutral-600 hover:border-neutral-600 hover:text-neutral-300'
                : 'border-neutral-600 text-neutral-400 hover:border-neutral-400'
            }`}
          >
            <Key size={10} />
            {apiKey ? 'Key ✓' : 'Set API Key'}
          </button>
          {messages.length > 0 && (
            <button onClick={clearChat} className="text-neutral-800 hover:text-neutral-500 transition-colors">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* API Key panel */}
      {showKeyInput && (
        <div className="px-8 py-4 border-b border-[#1f1f1f] bg-[#0d0d0d] flex gap-3 items-center shrink-0">
          <div className="flex-1">
            <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-700 mb-1.5">
              Anthropic API Key — stored in localStorage only
            </div>
            <input
              value={keyDraft}
              onChange={e => setKeyDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveKey()}
              placeholder={apiKey ? '••••••••••••••••••' : 'sk-ant-api03-...'}
              type="password"
              autoFocus
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm font-mono text-neutral-100 placeholder-neutral-800 focus:outline-none focus:border-neutral-500"
            />
          </div>
          <button
            onClick={saveKey}
            className="px-4 py-2 bg-white text-black text-[10px] font-semibold uppercase tracking-widest hover:bg-neutral-200 transition-colors mt-5"
          >
            Save
          </button>
          <button
            onClick={() => setShowKeyInput(false)}
            className="text-neutral-700 hover:text-neutral-400 transition-colors mt-5 text-[10px] uppercase"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Context preview */}
      {showContext && (
        <div className="px-8 py-4 border-b border-[#1f1f1f] bg-[#0d0d0d] shrink-0 max-h-52 overflow-auto">
          <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-700 mb-2">System Prompt Preview</div>
          <pre className="text-[10px] font-mono text-neutral-600 whitespace-pre-wrap leading-relaxed">{systemPrompt}</pre>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {messages.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 text-center max-w-md mx-auto">
            <Bot size={28} className="text-neutral-800" strokeWidth={1} />
            <div>
              <p className="text-neutral-400 text-sm font-medium">Your coach is ready</p>
              <p className="text-neutral-700 text-xs mt-1 font-mono">
                {apiKey ? 'Trained on your data across all sections.' : 'Set your Anthropic API key to start.'}
              </p>
            </div>
            <div className="w-full space-y-1.5">
              {STARTER_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => { setInput(p); textareaRef.current?.focus() }}
                  className="w-full text-left px-4 py-3 border border-[#1f1f1f] text-xs text-neutral-600 hover:border-[#2a2a2a] hover:text-neutral-300 transition-colors bg-[#111]"
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
                  <Bot size={11} className="text-neutral-600" />
                </div>
                <div className="bg-[#111] border border-[#1f1f1f] px-4 py-3">
                  <Loader size={13} className="text-neutral-700 animate-spin" />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-950/20 border border-red-900/40 px-4 py-3 text-xs text-red-400 font-mono">
                Error: {error}
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-8 py-4 border-t border-[#1f1f1f] shrink-0 bg-[#0a0a0a]">
        <div className="max-w-3xl mx-auto">
          {!apiKey && (
            <div className="text-[10px] font-mono text-neutral-700 mb-2 text-center uppercase tracking-widest">
              Set your Anthropic API key above to start
            </div>
          )}
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
              placeholder="Ask your coach... (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="flex-1 bg-[#111] border border-[#1f1f1f] px-4 py-3 text-sm text-neutral-100 placeholder-neutral-700 focus:outline-none focus:border-[#2a2a2a] resize-none transition-colors overflow-hidden"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim() || !apiKey}
              className="px-5 py-3 bg-white text-black hover:bg-neutral-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center shrink-0"
            >
              <Send size={14} />
            </button>
          </div>
          <div className="text-[9px] font-mono text-neutral-800 mt-2 flex items-center justify-between">
            <span>Context built from all your data in real-time</span>
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
        isUser
          ? 'bg-white text-black border-white'
          : 'bg-[#151515] border-[#2a2a2a] text-neutral-600'
      }`}>
        {isUser ? 'M' : <Bot size={11} />}
      </div>
      <div className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? 'bg-[#191919] border border-[#2a2a2a] text-neutral-200'
          : 'bg-[#111] border border-[#1f1f1f] text-neutral-300'
      }`}>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}
