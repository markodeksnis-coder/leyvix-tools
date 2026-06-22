import { useState } from 'react'
import { Plus, Pencil, X, Sparkles, Trophy, Search, RefreshCw, Check, AlertTriangle, Moon, Sun } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, AreaChart, Area } from 'recharts'
import { calcStreak, today, fmtShort, daysSinceStart } from '../utils'

const CARD = { background: '#0d1427', border: '1px solid #1a2440', borderRadius: 12, padding: 20 }
const WAR_CARD = { background: '#0d1427', border: '1px solid #1a2440', borderRadius: 12, padding: 20 }
const LABEL = { fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: 'white', letterSpacing: '0.04em' }
const SUBLABEL = { fontFamily: 'Inter', fontSize: 9, color: '#a0aec0', letterSpacing: '0.08em', marginTop: 2 }
const WAR_LABEL = { fontFamily: 'Inter', fontSize: 11, fontWeight: 800, color: 'white', letterSpacing: '0.08em', textTransform: 'uppercase' }

const CONTENT_CATS = ['All', 'Sales', 'Psychology', 'Business', 'Theology', 'Fitness', 'Relationships', 'Door-to-Door', 'Other']
const CAT_COLORS = {
  Sales: '#3b82f6', Psychology: '#3b82f6', Business: '#c9a84c', Theology: '#10b981',
  Fitness: '#ef4444', Relationships: '#c9a84c', 'Door-to-Door': '#c9a84c', Other: '#a0aec0',
}
const BAR_PALETTE = ['#c9a84c', '#3b82f6', '#3b82f6', '#10b981', '#ef4444', '#c9a84c', '#c9a84c', '#22c55e']
const PODIUM = [
  { stroke: '#c9a84c', glow: 'rgba(250,204,21,0.4)', medal: '🥇', size: 160 },
  { stroke: '#94a3b8', glow: 'rgba(148,163,184,0.3)', medal: '🥈', size: 140 },
  { stroke: '#c9a84c', glow: 'rgba(201,168,76,0.3)', medal: '🥉', size: 140 },
]
const ALERT_COLORS = {
  RECORD: { bg: '#0d1427', border: '#3b82f640', text: '#3b82f6', icon: '#3b82f6' },
  BODY: { bg: '#0d1427', border: '#c9a84c40', text: '#c9a84c', icon: '#c9a84c' },
  BUSINESS: { bg: '#0d1427', border: '#c9a84c40', text: '#c9a84c', icon: '#c9a84c' },
  RELATIONS: { bg: '#0d1427', border: '#c9a84c40', text: '#c9a84c', icon: '#c9a84c' },
  SYSTEM: { bg: '#0d1427', border: '#1a244040', text: '#a0aec0', icon: '#a0aec0' },
}

const cls = {
  input: "w-full bg-[#000000] border border-[#1a2440] px-3 py-2 text-sm text-white placeholder-[#a0aec0] focus:outline-none focus:border-[#c9a84c] transition-colors rounded-lg",
  warInput: "w-full bg-[#000000] border border-[#1a2440] px-3 py-2 text-sm text-white placeholder-[#a0aec0] focus:outline-none focus:border-[#c9a84c] transition-colors rounded-lg",
  label: "block text-[9px] font-mono uppercase tracking-widest text-[#a0aec0] mb-1.5",
}

function ProgressRing({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const r = 14
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={36} height={36} viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
      <circle cx={18} cy={18} r={r} fill="none" stroke="#0d1427" strokeWidth={3} />
      <circle cx={18} cy={18} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={`${dash.toFixed(2)} ${circ.toFixed(2)}`}
        strokeLinecap="round" transform="rotate(-90 18 18)" />
      <text x={18} y={18} textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize={9} fontFamily="Inter" fontWeight="700">{pct}%</text>
    </svg>
  )
}

function Sparkline({ logs, fails }) {
  const logSet = new Set(logs)
  const failSet = new Set(fails || [])
  const dots = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const ds = d.toISOString().split('T')[0]
    dots.push(logSet.has(ds) ? 'done' : failSet.has(ds) ? 'failed' : 'missed')
  }
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center', overflow: 'hidden' }}>
      {dots.map((status, i) => (
        <div key={i} style={{ width: 3, height: 10, borderRadius: 1.5, flexShrink: 0, background: status === 'done' ? '#22c55e' : status === 'failed' ? '#ef4444' : '#0d1427' }} />
      ))}
    </div>
  )
}

const SectionHeader = ({ children }) => (
  <div className="font-display text-white" style={{ fontSize: 22, borderLeft: '2px solid #c9a84c', paddingLeft: 12 }}>{children}</div>
)

async function callOrders(prompt) {
  const apiKey = localStorage.getItem('anthropic_key') || import.meta.env.VITE_ANTHROPIC_API_KEY || ''
  if (!apiKey) throw new Error('No API key set')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 500, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `API ${res.status}`) }
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

export default function Record() {
  const [view, setView] = useState('warroom')
  const [habits, setHabits] = useLocalStorage('marko_habits', [])
  const [content, setContent] = useLocalStorage('marko_content', [])
  const [checkLogs, setCheckLogs] = useLocalStorage('marko_checklogs', {})
  const [diet] = useLocalStorage('marko_diet', { targets: { calories: 2800 }, history: [] })
  const [businessData] = useLocalStorage('marko_business', { deals: [], lessons: [] })

  const [contentCat, setContentCat] = useState('All')
  const [habitSearch, setHabitSearch] = useState('')
  const [showContentModal, setShowContentModal] = useState(false)
  const [showHabitModal, setShowHabitModal] = useState(false)
  const [showMorningModal, setShowMorningModal] = useState(false)
  const [showEveningModal, setShowEveningModal] = useState(false)
  const [editHabit, setEditHabit] = useState(null)
  const [habitForm, setHabitForm] = useState({ name: '', icon: '🎯', category: 'Health', target: 'Daily' })
  const [contentForm, setContentForm] = useState({ title: '', category: 'Sales', date: today(), takeaway: '' })
  const [morningForm, setMorningForm] = useState({ sleep: '', energy: '', mood: '' })
  const [eveningForm, setEveningForm] = useState({ stress: '', work: '', training: false })
  const [orders, setOrders] = useState(null)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')

  const todayStr = today()
  const dayNum = daysSinceStart()
  const now = new Date()
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const dateLabel = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toUpperCase()

  const logHabit = id => setHabits(habits.map(h => h.id !== id ? h : {
    ...h, logs: h.logs.includes(todayStr) ? h.logs : [...h.logs, todayStr],
    fails: (h.fails || []).filter(f => f !== todayStr),
  }))
  const failHabit = id => {
    if (!window.confirm('Mark as failed today?')) return
    setHabits(habits.map(h => h.id !== id ? h : {
      ...h, fails: (h.fails || []).includes(todayStr) ? (h.fails || []) : [...(h.fails || []), todayStr],
      logs: h.logs.filter(l => l !== todayStr),
    }))
  }
  const undoHabit = id => setHabits(habits.map(h => h.id !== id ? h : {
    ...h, logs: h.logs.filter(l => l !== todayStr), fails: (h.fails || []).filter(f => f !== todayStr),
  }))
  const saveHabit = () => {
    if (!habitForm.name.trim()) return
    if (editHabit) {
      setHabits(habits.map(h => h.id === editHabit.id ? { ...h, name: habitForm.name, icon: habitForm.icon, category: habitForm.category } : h))
    } else {
      setHabits([...habits, { id: Date.now().toString(), name: habitForm.name, icon: habitForm.icon || '🎯', category: habitForm.category, target: habitForm.target, logs: [], fails: [] }])
    }
    setHabitForm({ name: '', icon: '🎯', category: 'Health', target: 'Daily' })
    setEditHabit(null); setShowHabitModal(false)
  }
  const addContent = () => {
    if (!contentForm.title.trim()) return
    setContent([{ ...contentForm, id: Date.now() }, ...content])
    setContentForm({ title: '', category: 'Sales', date: today(), takeaway: '' })
    setShowContentModal(false)
  }
  const deleteContent = id => setContent(content.filter(c => c.id !== id))
  const filteredContent = content.filter(c => contentCat === 'All' || c.category === contentCat)

  const saveMorningLog = () => {
    setCheckLogs(l => ({ ...l, [todayStr]: { ...l[todayStr], morning: { ...morningForm, loggedAt: Date.now() } } }))
    setShowMorningModal(false)
    setMorningForm({ sleep: '', energy: '', mood: '' })
  }
  const saveEveningLog = () => {
    setCheckLogs(l => ({ ...l, [todayStr]: { ...l[todayStr], evening: { ...eveningForm, loggedAt: Date.now() } } }))
    setShowEveningModal(false)
    setEveningForm({ stress: '', work: '', training: false })
  }

  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const thisWeekStart = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0] })()

  const habitStats = habits.map(h => {
    const s = calcStreak(h.logs)
    return { ...h, best: s.longest, current: s.current, streak: s }
  })
  const topHabits = [...habitStats].sort((a, b) => b.best - a.best).filter(h => h.best > 0)
  const bestEver = topHabits[0]?.best || 0
  const activeStreaks = habits.filter(h => calcStreak(h.logs).current > 0).length
  const doneCount = habits.filter(h => h.logs.includes(todayStr)).length
  const failedCount = habits.filter(h => (h.fails || []).includes(todayStr)).length
  const perfectDays = habits.length === 0 ? 0 : (() => {
    const days = [...new Set(habits.flatMap(h => h.logs.filter(d => d >= thisMonthStart)))]
    return days.filter(d => habits.every(h => h.logs.includes(d))).length
  })()
  const missionPct = habits.length ? Math.round((doneCount / habits.length) * 100) : 0
  const activePct = habits.length ? Math.round((activeStreaks / habits.length) * 100) : 0
  const failedPct = habits.length ? Math.round((failedCount / habits.length) * 100) : 0

  const streakChartData = habitStats.map(h => ({
    name: (h.icon ? `${h.icon} ` : '') + h.name.substring(0, 7).toUpperCase(),
    Current: h.current, Best: h.best,
  }))
  const filteredHabits = habits.filter(h => !habitSearch || h.name.toLowerCase().includes(habitSearch.toLowerCase()))
  const trophies = habits.map((h, i) => {
    const s = calcStreak(h.logs)
    return { name: h.name, icon: h.icon || '🎯', best: s.longest, current: s.current, color: BAR_PALETTE[i % BAR_PALETTE.length] }
  }).filter(t => t.best > 0).sort((a, b) => b.best - a.best)
  const chartData = trophies.map(t => ({ name: `${t.icon} ${t.name}`, value: t.best, fill: t.color }))
  const longestEver = trophies[0]?.best || 0

  const todayCheckLog = checkLogs[todayStr] || {}
  const morningLogged = !!todayCheckLog.morning?.loggedAt
  const eveningLogged = !!todayCheckLog.evening?.loggedAt

  // Fatigue Index
  const todayDiet = (diet.history || []).find(h => h.date === todayStr)
  const calTarget = diet.targets?.calories || 2800
  const calToday = todayDiet?.calories || 0
  const fatigueIndex = (() => {
    let score = 100
    const drivers = []
    const calDef = calTarget - calToday
    if (calDef > 200 && calToday > 0) {
      const impact = -Math.min(12, Math.round(calDef / 50))
      score += impact
      drivers.push({ label: `Eating ${calDef} cal under target`, impact })
    }
    const morn = todayCheckLog.morning
    if (morn) {
      const sl = parseFloat(morn.sleep || 0)
      if (sl > 0 && sl < 7) {
        const impact = sl < 6 ? -12 : -5
        score += impact
        drivers.push({ label: `Sleep debt (${sl}h avg)`, impact })
      }
      const en = parseFloat(morn.energy || 0)
      if (en > 0 && en < 6) {
        const impact = -Math.round((6 - en) * 2)
        score += impact
        drivers.push({ label: `Low energy (${en}/10)`, impact })
      }
    }
    score = Math.max(0, Math.min(100, score))
    const label = score >= 85 ? 'PRIMED' : score >= 70 ? 'CHARGED' : score >= 50 ? 'STABLE' : score >= 30 ? 'DRAINED' : 'CRITICAL'
    return { score, label, drivers }
  })()

  const fatigueChart = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const ds = d.toISOString().split('T')[0]
    const log = checkLogs[ds]?.morning
    let s = 100
    if (log) {
      const sl = parseFloat(log.sleep || 0)
      if (sl > 0 && sl < 7) s += sl < 6 ? -12 : -5
      const en = parseFloat(log.energy || 0)
      if (en > 0 && en < 6) s -= Math.round((6 - en) * 2)
    }
    return { day: d.toLocaleDateString('en-US', { weekday: 'short' }), score: Math.max(0, Math.min(100, s)) }
  })

  // Alert cards
  const alerts = []
  const atRisk = habits.filter(h => !h.logs.includes(todayStr) && !((h.fails || []).includes(todayStr)) && calcStreak(h.logs).current > 0)
  if (atRisk.length > 0) {
    const top = [...atRisk].sort((a, b) => calcStreak(b.logs).current - calcStreak(a.logs).current)[0]
    alerts.push({ type: 'RECORD', title: `${atRisk.length} STREAK${atRisk.length > 1 ? 'S' : ''} AT RISK`, body: `${top.name} not logged today. Don't engrave a zero.` })
  }
  if (calToday > 0 && calToday < calTarget * 0.8) {
    alerts.push({ type: 'BODY', title: 'ENERGY TRENDING DOWN', body: `${calTarget - calToday} cal below target today. Fuel the machine.` })
  }
  const openDeals = (businessData.deals || []).filter(d => !['Closed', 'Lost'].includes(d.status))
  const staleDeals = openDeals.filter(d => Math.floor((Date.now() - new Date(d.date).getTime()) / 86400000) > 7)
  if (staleDeals.length > 0) {
    alerts.push({ type: 'BUSINESS', title: `${staleDeals.length} DEAL${staleDeals.length > 1 ? 'S' : ''} GOING COLD`, body: staleDeals.slice(0, 2).map(d => d.prospect).join(', ') + ' untouched >7 days. Follow up.' })
  }
  if (!morningLogged && new Date().getHours() >= 9) {
    alerts.push({ type: 'SYSTEM', title: 'MORNING LOG PENDING', body: 'Log sleep, energy, and mood to calibrate the fatigue index.' })
  }

  const generateOrders = async () => {
    setOrdersLoading(true); setOrdersError('')
    const morn = todayCheckLog.morning
    const sleepInfo = morn ? `sleep ${morn.sleep}h, energy ${morn.energy}/10, mood ${morn.mood}/10` : 'not logged'
    const prompt = `You are the Operator AI for Marko's personal war room. Day ${dayNum} of the mission. Be brutally direct and specific — no fluff, no generic advice.

Today's data:
- Habits: ${doneCount}/${habits.length} done, ${activeStreaks} streaks active
- Streaks at risk: ${atRisk.map(h => h.name).join(', ') || 'none'}
- Calories: ${calToday}/${calTarget} kcal
- Open deals: ${openDeals.length} (${staleDeals.length} stale)
- Morning log: ${sleepInfo}

Write a war-room briefing in exactly this format:
**READ:** [1-2 sentences: blunt current situation]
**TODAY'S ORDERS:**
1. [Body] specific action
2. [Work] specific action
3. [Recovery] specific action
4. [Edge] specific action
**WATCH:** [1 sentence: main risk to avoid today]`
    try {
      const text = await callOrders(prompt)
      setOrders(text)
    } catch (e) {
      setOrdersError(e.message)
    } finally {
      setOrdersLoading(false)
    }
  }

  const readinessPct = Math.round(((doneCount + (morningLogged ? 1 : 0)) / Math.max(1, habits.length + 1)) * 100)

  return (
    <div className="h-full flex flex-col overflow-auto" style={{ background: '#000000' }}>
      <div className="px-8 py-7" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display" style={{
              fontSize: 52, lineHeight: 1, letterSpacing: '0.02em',
              background: view === 'warroom' ? 'linear-gradient(135deg, #c9a84c 0%, #c9a84c 100%)' : '#c9a84c',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>THE RECORD</h1>
            <p style={{ fontFamily: 'Inter', fontSize: 11, color: '#a0aec0', letterSpacing: '0.1em', marginTop: 6 }}>
              {view === 'warroom' ? 'PERSONAL PERFORMANCE OS // WAR-ROOM LEDGER' : 'PERSONAL HABIT & STREAK OPERATING SYSTEM'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Inter', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, fontWeight: 600, color: view === 'warroom' ? '#c9a84c' : '#c9a84c' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: view === 'warroom' ? '#c9a84c' : '#c9a84c' }} />
              {view === 'warroom' ? 'SYSTEM STATUS: OPERATIONAL' : 'LIVE TRANSMISSION'}
            </div>
            <div style={{ fontFamily: 'Inter', fontSize: 10, color: '#a0aec0', marginTop: 4, letterSpacing: '0.05em' }}>LOCAL SAVE · ENGRAVED</div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1.5">
          {[{ id: 'dashboard', label: 'Dashboard' }, { id: 'warroom', label: 'War Room Ledger' }].map(t => {
            const isActive = view === t.id
            return (
              <button key={t.id} onClick={() => setView(t.id)} style={{
                background: isActive ? (t.id === 'warroom' ? 'linear-gradient(135deg, #c9a84c, #c9a84c)' : '#c9a84c') : 'transparent',
                color: isActive ? 'white' : '#a0aec0',
                border: isActive ? 'none' : '1px solid #1a2440',
                fontFamily: 'Inter', fontSize: 11, fontWeight: isActive ? 700 : 400,
                padding: '6px 14px', borderRadius: 8, cursor: 'pointer', letterSpacing: '0.04em', transition: 'all 0.15s',
              }}>{t.label}</button>
            )
          })}
        </div>

        {/* Big header - visible on warroom tab */}
        {view === 'warroom' && (
          <div style={{ background: '#000000', borderBottom: '1px solid #1a2440', padding: '20px 32px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, color: '#a0aec0', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                SYSTEM STATUS: OPERATIONAL
              </span>
            </div>
            <h1 style={{ fontFamily: '"Bebas Neue",cursive', fontSize: 64, fontWeight: 400, lineHeight: 0.9, letterSpacing: '0.02em', background: 'linear-gradient(180deg,#c9a84c 0%,#c9a84c 60%,#c9a84c 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0, fontStyle: 'italic' }}>
              THE RECORD
            </h1>
            <p style={{ fontFamily: 'Inter', fontSize: 10, color: '#a0aec0', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>
              PERSONAL PERFORMANCE OS // WAR-ROOM LEDGER
            </p>
          </div>
        )}

        {view === 'dashboard' ? (
          <>
            {/* Active Streaks */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <SectionHeader>Active Streaks</SectionHeader>
                <button onClick={() => { setHabitForm({ name: '', icon: '🎯', category: 'Health', target: 'Daily' }); setEditHabit(null); setShowHabitModal(true) }}
                  style={{ border: '1px solid #1a2440', color: '#a0aec0', fontFamily: 'Inter' }}
                  className="flex items-center gap-1 px-3 py-1 text-[9px] uppercase tracking-widest hover:text-white hover:border-[#c9a84c] transition-colors">
                  <Plus size={9} /> Add Habit
                </button>
              </div>
              {habits.length === 0 ? (
                <div style={{ background: '#0d1427', border: '1px solid #1a2440', borderRadius: 10, padding: '32px', textAlign: 'center', fontFamily: 'Inter', fontSize: 12, color: '#a0aec0' }}>No habits yet</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {habits.map(h => {
                    const streak = calcStreak(h.logs)
                    const doneToday = h.logs.includes(todayStr)
                    const failedToday = (h.fails || []).includes(todayStr)
                    const isRecord = streak.current > 0 && streak.current === streak.longest && streak.current > 1
                    const numColor = (failedToday || streak.current === 0) ? '#ef4444' : isRecord ? '#c9a84c' : '#ffffff'
                    const barColor = isRecord ? '#c9a84c' : failedToday ? '#ef4444' : streak.current > 0 ? '#22c55e' : '#1a2440'
                    const ringColor = isRecord ? '#c9a84c' : failedToday ? '#ef4444' : '#22c55e'
                    const badge = failedToday ? '💀' : isRecord ? '👑' : streak.current > 7 ? '🔥' : ''
                    return (
                      <div key={h.id} style={{
                        background: '#0d1427', border: '1px solid #1a2440', borderLeft: `3px solid ${barColor}`,
                        borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 6,
                        boxShadow: isRecord ? '0 0 16px rgba(201,168,76,0.2)' : 'none',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.icon} {h.name}</span>
                          <button onClick={() => { setHabitForm({ name: h.name, icon: h.icon || '🎯', category: h.category || 'Health', target: h.target || 'Daily' }); setEditHabit(h); setShowHabitModal(true) }} style={{ color: '#a0aec0', flexShrink: 0, marginLeft: 4 }} className="hover:text-[#a0aec0] transition-colors"><Pencil size={10} /></button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, lineHeight: 1 }}>
                          <span className="font-display" style={{ fontSize: 48, color: numColor, lineHeight: 1, textShadow: isRecord ? '0 0 12px rgba(250,204,21,0.5)' : 'none' }}>{streak.current}</span>
                          {badge && <span style={{ fontSize: 16 }}>{badge}</span>}
                        </div>
                        <div style={{ fontFamily: 'Inter', fontSize: 10, color: '#a0aec0' }}>BEST {streak.longest}d · WK {streak.weekCount} / MO {streak.monthCount}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ProgressRing value={streak.current} max={Math.max(1, streak.longest)} color={ringColor} />
                          <div style={{ flex: 1, overflow: 'hidden' }}><Sparkline logs={h.logs} fails={h.fails || []} /></div>
                        </div>
                        {doneToday ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1, height: 28, background: '#166534', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: 'white' }}>✓ LOGGED</div>
                            <button onClick={() => undoHabit(h.id)} style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0aec0' }} className="hover:text-[#a0aec0] transition-colors">UNDO</button>
                          </div>
                        ) : failedToday ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1, height: 28, border: '1px solid #ef4444', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: '#ef4444' }}>✗ FAILED</div>
                            <button onClick={() => undoHabit(h.id)} style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0aec0' }} className="hover:text-[#a0aec0] transition-colors">UNDO</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => logHabit(h.id)} style={{ flex: 1, height: 28, background: '#16a34a', borderRadius: 6, fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: 'white', cursor: 'pointer' }} className="hover:opacity-90 transition-opacity">✓ Done</button>
                            <button onClick={() => failHabit(h.id)} style={{ flex: 1, height: 28, border: '1px solid #ef4444', borderRadius: 6, color: '#ef4444', fontFamily: 'Inter', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'transparent' }} className="hover:bg-[#ef4444]/10 transition-colors">✗ Fail</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Trophy Wall */}
            {trophies.length > 0 && (
              <section>
                <div className="mb-6"><SectionHeader>Trophy Wall</SectionHeader></div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 24, marginBottom: 32 }}>
                  {[trophies[1] ? { t: trophies[1], p: PODIUM[1] } : null, { t: trophies[0], p: PODIUM[0] }, trophies[2] ? { t: trophies[2], p: PODIUM[2] } : null].map((item, i) => {
                    if (!item) return <div key={i} style={{ width: 140 }} />
                    const { t, p } = item
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: p.size, height: p.size, borderRadius: '50%', border: `8px solid ${p.stroke}`, boxShadow: `0 0 24px ${p.glow}`, background: '#0d1427', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                          <div style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 700, color: '#999', textAlign: 'center', padding: '0 12px', maxWidth: p.size - 24, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name.toUpperCase()}</div>
                          <div className="font-display" style={{ fontSize: p.size === 160 ? 40 : 36, color: p.stroke, lineHeight: 1 }}>{t.best}</div>
                          <div style={{ fontFamily: 'Inter', fontSize: 10, color: '#a0aec0' }}>days</div>
                        </div>
                        <div style={{ fontSize: p.size === 160 ? 22 : 18 }}>{p.medal}</div>
                      </div>
                    )
                  })}
                </div>
                {chartData.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData} margin={{ top: 16, right: 16, bottom: 52, left: 0 }}>
                        <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{ fill: '#a0aec0', fontSize: 11, fontFamily: 'Inter' }} axisLine={{ stroke: '#1a2440' }} tickLine={false} />
                        <YAxis tick={{ fill: '#a0aec0', fontSize: 11, fontFamily: 'Inter' }} axisLine={{ stroke: '#1a2440' }} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#0d1427', border: '1px solid #1a2440', borderRadius: 8, fontSize: 12, fontFamily: 'Inter' }} labelStyle={{ color: '#a0aec0' }} itemStyle={{ color: '#fff' }} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: '#a0aec0', fontFamily: 'Inter' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                  {[{ label: 'Habits Tracked', value: habits.length }, { label: 'Longest Streak Ever', value: `${longestEver}d` }, { label: 'Active Streaks', value: activeStreaks }, { label: 'Perfect Days (Mo)', value: perfectDays }].map(s => (
                    <div key={s.label}>
                      <div className="font-display" style={{ fontSize: 28, color: '#c9a84c', lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#a0aec0', marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Content Library */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <SectionHeader>Content Library</SectionHeader>
                <button onClick={() => setShowContentModal(true)} style={{ border: '1px solid #1a2440', color: '#a0aec0', fontFamily: 'Inter' }} className="flex items-center gap-1 px-3 py-1 text-[9px] uppercase tracking-widest hover:text-white hover:border-[#c9a84c] transition-colors">
                  <Plus size={9} /> Add Entry
                </button>
              </div>
              <div className="flex gap-4 mb-3" style={{ fontFamily: 'Inter', fontSize: 11, color: '#a0aec0' }}>
                <span>Total <span style={{ color: '#a0aec0' }}>{content.length}</span></span>
                <span>This week <span style={{ color: '#a0aec0' }}>{content.filter(c => c.date >= thisWeekStart).length}</span></span>
                <span>This month <span style={{ color: '#a0aec0' }}>{content.filter(c => c.date >= thisMonthStart).length}</span></span>
              </div>
              <div className="flex gap-1.5 flex-wrap mb-4">
                {CONTENT_CATS.map(cat => {
                  const isActive = contentCat === cat
                  const color = cat === 'All' ? '#c9a84c' : (CAT_COLORS[cat] || '#a0aec0')
                  return (
                    <button key={cat} onClick={() => setContentCat(cat)} style={{ background: isActive ? color : '#0d1427', color: isActive ? (cat === 'All' ? '#000000' : 'white') : '#a0aec0', fontFamily: 'Inter', fontSize: 11, fontWeight: isActive ? 600 : 400, padding: '4px 12px', borderRadius: 9999, border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}>{cat}</button>
                  )
                })}
              </div>
              {filteredContent.length === 0 ? (
                <div style={{ background: '#0d1427', border: '1px solid #1a2440', borderRadius: 10, padding: '32px', textAlign: 'center', fontFamily: 'Inter', fontSize: 12, color: '#a0aec0' }}>No entries yet</div>
              ) : (
                <div style={{ columnCount: 2, columnGap: 12 }}>
                  {filteredContent.map(c => {
                    const color = CAT_COLORS[c.category] || '#a0aec0'
                    return (
                      <div key={c.id} className="group" style={{ background: '#0d1427', border: '1px solid #1a2440', borderRadius: 10, borderLeft: `4px solid ${color}`, padding: '12px 14px', marginBottom: 10, breakInside: 'avoid', transition: 'box-shadow 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 16px ${color}26` }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ background: color, fontFamily: 'Inter', fontSize: 10, fontWeight: 700, color: 'white', padding: '2px 8px', borderRadius: 9999 }}>{c.category}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#a0aec0' }}>{fmtShort(c.date)}</span>
                            <button onClick={() => deleteContent(c.id)} style={{ color: '#a0aec0' }} className="hover:text-[#ef4444] opacity-0 group-hover:opacity-100 transition-all"><X size={11} /></button>
                          </div>
                        </div>
                        <div className="line-clamp-2" style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 4 }}>{c.title}</div>
                        {c.takeaway && <div className="line-clamp-3" style={{ fontFamily: 'Inter', fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>{c.takeaway}</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            {/* === WAR ROOM LEDGER TAB === */}

            {/* TODAY'S ORDERS + LOG CHECK-INS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

              {/* Today's Orders */}
              <div style={{ ...WAR_CARD, borderColor: '#c9a84c30', boxShadow: '0 0 28px rgba(201,168,76,0.1)' }}>
                <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: 14 }}>
                  <div className="flex items-center gap-2">
                    <span style={WAR_LABEL}>TODAY'S ORDERS</span>
                    <span style={{ background: '#c9a84c18', border: '1px solid #c9a84c40', borderRadius: 4, padding: '2px 8px', fontFamily: 'Inter', fontSize: 9, fontWeight: 700, color: '#c9a84c', letterSpacing: '0.06em' }}>OPERATOR AI</span>
                  </div>
                  <button
                    onClick={generateOrders}
                    disabled={ordersLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid #c9a84c40', color: '#c9a84c', borderRadius: 6, padding: '5px 10px', fontFamily: 'Inter', fontSize: 10, fontWeight: 600, cursor: ordersLoading ? 'wait' : 'pointer', letterSpacing: '0.04em' }}
                  >
                    <RefreshCw size={10} style={{ animation: ordersLoading ? 'spin 1s linear infinite' : 'none' }} />
                    {ordersLoading ? 'GENERATING...' : 'REGENERATE'}
                  </button>
                </div>

                {ordersError ? (
                  <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#ef4444', padding: '12px 0' }}>
                    {ordersError.includes('No API key') ? (
                      <span>No API key set. <button onClick={() => { const k = prompt('Paste your Anthropic API key:'); if (k) { localStorage.setItem('anthropic_key', k.trim()); setOrdersError('') } }} style={{ color: '#c9a84c', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Inter', fontSize: 12, padding: 0 }}>Set key</button></span>
                    ) : ordersError}
                  </div>
                ) : orders ? (
                  <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#d1d5db', lineHeight: 1.7 }}>
                    {orders.split('\n').map((line, i) => {
                      const bold = line.match(/^\*\*(.+?)\*\*(.*)/)
                      if (bold) return <div key={i} style={{ marginTop: i > 0 ? 8 : 0 }}><span style={{ color: '#c9a84c', fontWeight: 700 }}>{bold[1]}</span><span>{bold[2]}</span></div>
                      return <div key={i} style={{ color: line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') || line.startsWith('4.') ? '#d1d5db' : '#999', marginTop: 2 }}>{line}</div>
                    })}
                  </div>
                ) : (
                  <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#a0aec0', padding: '16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Sparkles size={14} color="#c9a84c" />
                    <span>Click REGENERATE to get your daily orders from Operator AI</span>
                  </div>
                )}

                <div style={{ marginTop: 16, height: 3, background: '#0d1427', borderRadius: 2 }}>
                  <div style={{ width: `${readinessPct}%`, height: 3, background: 'linear-gradient(90deg, #c9a84c, #c9a84c)', borderRadius: 2, transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#c9a84c', marginTop: 6, letterSpacing: '0.06em', fontWeight: 600 }}>READINESS: {readinessPct}%</div>
              </div>

              {/* Log Morning + Evening */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div
                  style={{ ...WAR_CARD, padding: 16, cursor: morningLogged ? 'default' : 'pointer', borderColor: morningLogged ? '#22c55e40' : '#1a2440' }}
                  onClick={() => !morningLogged && setShowMorningModal(true)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sun size={13} color={morningLogged ? '#22c55e' : '#c9a84c'} />
                      <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: morningLogged ? '#22c55e' : 'white', letterSpacing: '0.06em' }}>LOG MORNING</span>
                    </div>
                    {morningLogged ? (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={12} color="white" strokeWidth={3} />
                      </div>
                    ) : (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #c9a84c60', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a84c' }}>
                        <Plus size={12} />
                      </div>
                    )}
                  </div>
                  <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0aec0', marginTop: 6, letterSpacing: '0.06em' }}>SLEEP · ENERGY · MOOD</div>
                  {morningLogged && (
                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                      {[['💤', todayCheckLog.morning?.sleep, 'h'], ['⚡', todayCheckLog.morning?.energy, '/10'], ['😊', todayCheckLog.morning?.mood, '/10']].map(([icon, val, unit]) => val ? (
                        <span key={icon} style={{ fontFamily: 'Inter', fontSize: 10, color: '#a0aec0' }}>{icon} {val}{unit}</span>
                      ) : null)}
                    </div>
                  )}
                </div>

                <div
                  style={{ ...WAR_CARD, padding: 16, cursor: eveningLogged ? 'default' : 'pointer', borderColor: eveningLogged ? '#22c55e40' : '#1a2440' }}
                  onClick={() => !eveningLogged && setShowEveningModal(true)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Moon size={13} color={eveningLogged ? '#22c55e' : '#3b82f6'} />
                      <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: eveningLogged ? '#22c55e' : 'white', letterSpacing: '0.06em' }}>LOG EVENING</span>
                    </div>
                    {eveningLogged ? (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={12} color="white" strokeWidth={3} />
                      </div>
                    ) : (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #3b82f640', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                        <Plus size={12} />
                      </div>
                    )}
                  </div>
                  <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0aec0', marginTop: 6, letterSpacing: '0.06em' }}>STRESS · WORK · TRAINING</div>
                  {eveningLogged && (
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                      {[['😤', todayCheckLog.evening?.stress, '/10'], ['💼', todayCheckLog.evening?.work, '/10']].map(([icon, val, unit]) => val ? (
                        <span key={icon} style={{ fontFamily: 'Inter', fontSize: 10, color: '#a0aec0' }}>{icon} {val}{unit}</span>
                      ) : null)}
                      {todayCheckLog.evening?.training && <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#22c55e' }}>🏋️ trained</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Alert Cards */}
            {alerts.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                {alerts.map((alert, i) => {
                  const ac = ALERT_COLORS[alert.type] || ALERT_COLORS.SYSTEM
                  return (
                    <div key={i} style={{ background: ac.bg, border: `1px solid ${ac.border}`, borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <AlertTriangle size={13} color={ac.icon} style={{ flexShrink: 0, marginTop: 1 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 800, color: ac.text, letterSpacing: '0.04em' }}>{alert.title}</span>
                          <span style={{ fontFamily: 'Inter', fontSize: 8, color: ac.text, border: `1px solid ${ac.border}`, borderRadius: 3, padding: '1px 5px', letterSpacing: '0.06em' }}>{alert.type}</span>
                        </div>
                        <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#a0aec0', lineHeight: 1.5 }}>{alert.body}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* TODAY'S STATUS | FATIGUE INDEX | ALL-TIME RECORDS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Today's Status */}
              <div style={WAR_CARD}>
                <div className="flex items-center justify-between">
                  <span style={WAR_LABEL}>TODAY'S STATUS</span>
                  <Sparkles size={13} color="#c9a84c" />
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0aec0', letterSpacing: '0.06em', marginTop: 2 }}>{dayName}, {dateLabel}</div>
                <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: 'MISSION DONE', value: `${doneCount}/${habits.length}`, pct: missionPct, color: '#c9a84c' },
                    { label: 'ACTIVE STREAKS', value: `${activeStreaks}/${habits.length}`, pct: activePct, color: '#c9a84c' },
                    { label: 'FAILED TODAY', value: `${failedCount}/${habits.length}`, pct: failedPct, color: '#ef4444' },
                  ].map(row => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between" style={{ fontFamily: 'Inter', fontSize: 10, color: '#a0aec0', letterSpacing: '0.05em', marginBottom: 5 }}>
                        <span>{row.label}</span>
                        <span style={{ color: 'white', fontWeight: 700 }}>{row.value}</span>
                      </div>
                      <div style={{ height: 3, background: '#0d1427', borderRadius: 2 }}>
                        <div style={{ width: `${row.pct}%`, height: 3, background: row.color, borderRadius: 2, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  ))}
                  {habits.length === 0 && <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#a0aec0' }}>No habits yet</div>}
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 20, paddingTop: 14, borderTop: '1px solid #0d1427' }}>
                  {[{ label: 'BEST EVER', value: bestEver }, { label: 'PERFECT DAYS', value: perfectDays }, { label: 'HABITS', value: habits.length }].map(s => (
                    <div key={s.label}>
                      <div className="font-display" style={{ fontSize: 22, color: '#c9a84c', lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontFamily: 'Inter', fontSize: 8, color: '#a0aec0', marginTop: 3, letterSpacing: '0.05em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fatigue Index */}
              <div style={WAR_CARD}>
                <div className="flex items-center justify-between">
                  <span style={WAR_LABEL}>FATIGUE INDEX</span>
                  <Sparkles size={13} color="#c9a84c" />
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0aec0', letterSpacing: '0.06em', marginTop: 2 }}>COMPOSITE RECOVERY / 7-DAY</div>
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span className="font-display" style={{ fontSize: 52, lineHeight: 1, background: fatigueIndex.score >= 70 ? 'linear-gradient(135deg, #c9a84c, #c9a84c)' : fatigueIndex.score >= 40 ? '#c9a84c' : '#ef4444', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{fatigueIndex.score}</span>
                  <span style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: fatigueIndex.score >= 70 ? '#c9a84c' : '#a0aec0' }}>{fatigueIndex.label}</span>
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0aec0', marginBottom: 10 }}>OUT OF 100</div>
                <ResponsiveContainer width="100%" height={48}>
                  <AreaChart data={fatigueChart} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="fatigueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="score" stroke="#c9a84c" strokeWidth={1.5} fill="url(#fatigueGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                {fatigueIndex.drivers.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0aec0', letterSpacing: '0.06em', marginBottom: 8 }}>DRIVERS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {fatigueIndex.drivers.map((d, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#a0aec0' }}>{d.label}</span>
                          <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 700, color: '#ef4444' }}>{d.impact}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!morningLogged && (
                  <button onClick={() => setShowMorningModal(true)} style={{ marginTop: 12, width: '100%', background: 'transparent', border: '1px solid #c9a84c30', borderRadius: 6, padding: '6px', fontFamily: 'Inter', fontSize: 10, color: '#c9a84c', cursor: 'pointer', letterSpacing: '0.04em' }}>
                    LOG MORNING TO CALIBRATE
                  </button>
                )}
              </div>

              {/* All-Time Records */}
              <div style={WAR_CARD}>
                <div className="flex items-center justify-between">
                  <span style={WAR_LABEL}>ALL-TIME RECORDS</span>
                  <Trophy size={13} color="#c9a84c" />
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0aec0', letterSpacing: '0.06em', marginTop: 2, marginBottom: 14 }}>PERSONAL BESTS</div>
                {topHabits.length === 0 ? (
                  <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#a0aec0', textAlign: 'center', padding: '32px 0' }}>No records yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {topHabits.slice(0, 6).map((h, i) => (
                      <div key={h.id} className="flex items-center justify-between gap-2">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                          <span style={{ fontFamily: 'Inter', fontSize: 9, color: i === 0 ? '#c9a84c' : '#a0aec0', flexShrink: 0, fontWeight: 700 }}>#{String(i + 1).padStart(2, '0')}</span>
                          <span style={{ flexShrink: 0 }}>{h.icon}</span>
                          <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: i === 0 ? 'white' : '#a0aec0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name.toUpperCase()}</span>
                        </div>
                        <span style={{ fontFamily: 'Inter', fontSize: 12, color: i === 0 ? '#c9a84c' : '#a0aec0', fontWeight: 700, flexShrink: 0 }}>
                          {h.best}<span style={{ color: '#a0aec0', fontWeight: 400, fontSize: 9 }}>d</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Streak Overview */}
            <div style={WAR_CARD}>
              <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                <span style={WAR_LABEL}>STREAK OVERVIEW</span>
                <div style={{ display: 'flex', gap: 10, fontFamily: 'Inter', fontSize: 9, color: '#a0aec0' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, background: '#c9a84c', borderRadius: 2 }} /> CURRENT</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, background: '#7a2e00', borderRadius: 2 }} /> BEST</span>
                </div>
              </div>
              <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0aec0', letterSpacing: '0.06em', marginBottom: 8 }}>CURRENT VS BEST</div>
              {habits.length === 0 ? (
                <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#a0aec0', textAlign: 'center', padding: '32px 0' }}>Add habits to see chart</div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={streakChartData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barGap={2} barCategoryGap="30%">
                    <XAxis dataKey="name" tick={{ fill: '#a0aec0', fontSize: 8, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#a0aec0', fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} width={22} />
                    <Tooltip contentStyle={{ background: '#0d1427', border: '1px solid #1a2440', borderRadius: 8, fontFamily: 'Inter', fontSize: 11 }} labelStyle={{ color: '#c9a84c' }} itemStyle={{ color: '#fff' }} cursor={{ fill: 'rgba(201,168,76,0.08)' }} />
                    <Bar dataKey="Current" fill="#c9a84c" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Best" fill="#7a2e00" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Streak Ledger */}
            <div style={WAR_CARD}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <span style={WAR_LABEL}>STREAK LEDGER</span>
                  <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0aec0', letterSpacing: '0.06em', marginTop: 3 }}>LIVE STATUS · {habits.length} HABITS ENGRAVED</div>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ position: 'relative' }}>
                    <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }} />
                    <input value={habitSearch} onChange={e => setHabitSearch(e.target.value)} placeholder="Search habits..."
                      style={{ background: '#000000', border: '1px solid #1a2440', borderRadius: 6, padding: '7px 10px 7px 30px', fontFamily: 'Inter', fontSize: 11, color: 'white', width: 160, outline: 'none' }} />
                  </div>
                  <button onClick={() => { setHabitForm({ name: '', icon: '🎯', category: 'Health', target: 'Daily' }); setEditHabit(null); setShowHabitModal(true) }}
                    style={{ background: 'linear-gradient(135deg, #c9a84c, #c9a84c)', color: 'white', border: 'none', borderRadius: 6, padding: '7px 12px', fontFamily: 'Inter', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                    <Plus size={11} /> NEW HABIT
                  </button>
                </div>
              </div>
              {habits.length === 0 ? (
                <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#a0aec0', textAlign: 'center', padding: '32px 0' }}>No habits registered yet</div>
              ) : (
                <>
                  <div style={{ overflowX: 'auto', marginTop: 14 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1a2440' }}>
                          {['HABIT', 'CURRENT', 'EFFICIENCY', 'BEST', 'STATUS', 'COMMAND'].map(h => (
                            <th key={h} style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left', padding: '0 10px 10px', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHabits.map((h, i) => {
                          const streak = calcStreak(h.logs)
                          const failedToday = (h.fails || []).includes(todayStr)
                          const doneToday = h.logs.includes(todayStr)
                          const isRecord = streak.current > 0 && streak.current === streak.longest
                          const status = (failedToday || streak.current === 0) ? 'DOWN' : isRecord ? 'RECORD' : 'ACTIVE'
                          const effPct = streak.longest > 0 ? Math.min(100, Math.round((streak.current / streak.longest) * 100)) : 0
                          return (
                            <tr key={h.id} style={{ borderBottom: '1px solid #111' }}>
                              <td style={{ padding: '11px 10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                  <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0aec0' }}>{String(i + 1).padStart(2, '0')}</span>
                                  <span>{h.icon}</span>
                                  <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: 'white' }}>{h.name.toUpperCase()}</span>
                                  <button onClick={() => { setHabitForm({ name: h.name, icon: h.icon || '🎯', category: h.category || 'Health', target: h.target || 'Daily' }); setEditHabit(h); setShowHabitModal(true) }} style={{ color: '#a0aec0', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}><Pencil size={9} /></button>
                                </div>
                              </td>
                              <td style={{ padding: '11px 10px' }}>
                                <span className="font-display" style={{ fontSize: 20, color: '#c9a84c' }}>{String(streak.current).padStart(2, '0')}</span>
                                <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0aec0' }}>d</span>
                              </td>
                              <td style={{ padding: '11px 10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                  <div style={{ width: 70, height: 3, background: '#0d1427', borderRadius: 2, flexShrink: 0 }}>
                                    <div style={{ width: `${effPct}%`, height: 3, background: 'linear-gradient(90deg, #c9a84c, #c9a84c)', borderRadius: 2 }} />
                                  </div>
                                  <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#a0aec0' }}>{effPct}%</span>
                                </div>
                              </td>
                              <td style={{ padding: '11px 10px', fontFamily: 'Inter', fontSize: 12, color: '#a0aec0' }}>{streak.longest}d</td>
                              <td style={{ padding: '11px 10px' }}>
                                {status === 'DOWN' && <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 700, color: '#ef4444', border: '1px solid #ef444440', borderRadius: 4, padding: '3px 7px' }}>DOWN</span>}
                                {status === 'RECORD' && <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 700, color: '#000000', background: '#c9a84c', borderRadius: 4, padding: '3px 7px' }}>🏆 RECORD</span>}
                                {status === 'ACTIVE' && <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#22c55e', border: '1px solid #22c55e40', borderRadius: 4, padding: '3px 7px' }}>ACTIVE</span>}
                              </td>
                              <td style={{ padding: '11px 10px' }}>
                                {doneToday || failedToday ? (
                                  <button onClick={() => undoHabit(h.id)} style={{ fontFamily: 'Inter', fontSize: 10, color: '#a0aec0', border: '1px solid #333', borderRadius: 5, padding: '4px 9px', background: 'transparent', cursor: 'pointer' }}>UNDO</button>
                                ) : (
                                  <div style={{ display: 'flex', gap: 5 }}>
                                    <button onClick={() => logHabit(h.id)} style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 700, color: 'white', background: 'linear-gradient(135deg, #c9a84c, #c9a84c)', border: 'none', borderRadius: 5, padding: '4px 9px', cursor: 'pointer' }}>DONE</button>
                                    <button onClick={() => failHabit(h.id)} style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, color: '#ef4444', background: 'transparent', border: '1px solid #ef444440', borderRadius: 5, padding: '4px 9px', cursor: 'pointer' }}>FAIL</button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #111' }}>
                    <div style={{ display: 'flex', gap: 14, fontFamily: 'Inter', fontSize: 9, color: '#a0aec0' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: 2, background: '#c9a84c' }} />RECORD</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: 2, background: '#22c55e' }} />ACTIVE</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: 2, background: '#ef4444' }} />DOWN</span>
                    </div>
                    <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0aec0' }}>{filteredHabits.length} / {habits.length} SHOWN</span>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Habit Modal */}
      {showHabitModal && (
        <Modal title={editHabit ? 'Edit Habit' : 'New Habit'} onClose={() => { setShowHabitModal(false); setEditHabit(null) }}>
          <div className="space-y-4">
            <div className="grid grid-cols-[72px_1fr] gap-3">
              <div><label className={cls.label}>Icon</label><input value={habitForm.icon} onChange={e => setHabitForm({ ...habitForm, icon: e.target.value })} className={cls.input + ' text-center text-xl'} maxLength={2} /></div>
              <div><label className={cls.label}>Habit Name</label><input value={habitForm.name} onChange={e => setHabitForm({ ...habitForm, name: e.target.value })} onKeyDown={e => e.key === 'Enter' && saveHabit()} autoFocus placeholder="e.g. Cold Shower" className={cls.input} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={cls.label}>Category</label>
                <select value={habitForm.category} onChange={e => setHabitForm({ ...habitForm, category: e.target.value })} className={cls.input}>
                  {['Health', 'Fitness', 'Business', 'Mind', 'Soul', 'Other'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div><label className={cls.label}>Frequency</label>
                <select value={habitForm.target} onChange={e => setHabitForm({ ...habitForm, target: e.target.value })} className={cls.input}>
                  <option>Daily</option><option>Weekdays</option><option>Weekends</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveHabit} style={{ background: '#c9a84c', color: '#000000', borderRadius: 8 }} className="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">Save</button>
              <button onClick={() => { setShowHabitModal(false); setEditHabit(null) }} style={{ border: '1px solid #1a2440', color: '#a0aec0', borderRadius: 8 }} className="px-4 py-2.5 text-[10px] uppercase tracking-widest hover:border-[#444] transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Content Modal */}
      {showContentModal && (
        <Modal title="Add Content Entry" onClose={() => setShowContentModal(false)}>
          <div className="space-y-4">
            <div><label className={cls.label}>Title</label><input value={contentForm.title} onChange={e => setContentForm({ ...contentForm, title: e.target.value })} autoFocus placeholder="Book, video, lesson title..." className={cls.input} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={cls.label}>Category</label>
                <select value={contentForm.category} onChange={e => setContentForm({ ...contentForm, category: e.target.value })} className={cls.input}>
                  {['Sales', 'Psychology', 'Business', 'Theology', 'Fitness', 'Relationships', 'Door-to-Door', 'Other'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div><label className={cls.label}>Date</label><input type="date" value={contentForm.date} onChange={e => setContentForm({ ...contentForm, date: e.target.value })} className={cls.input} /></div>
            </div>
            <div><label className={cls.label}>Key Takeaway</label><textarea value={contentForm.takeaway} onChange={e => setContentForm({ ...contentForm, takeaway: e.target.value })} rows={3} placeholder="Main lesson..." className={cls.input + ' resize-none'} /></div>
            <div className="flex gap-2 pt-1">
              <button onClick={addContent} style={{ background: '#c9a84c', color: '#000000', borderRadius: 8 }} className="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">Save</button>
              <button onClick={() => setShowContentModal(false)} style={{ border: '1px solid #1a2440', color: '#a0aec0', borderRadius: 8 }} className="px-4 py-2.5 text-[10px] uppercase tracking-widest hover:border-[#444] transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Morning Log Modal */}
      {showMorningModal && (
        <Modal title="Log Morning Check-In" onClose={() => setShowMorningModal(false)}>
          <div className="space-y-4">
            <div><label className={cls.label}>Sleep Hours</label><input type="number" step="0.5" min="0" max="12" value={morningForm.sleep} onChange={e => setMorningForm({ ...morningForm, sleep: e.target.value })} placeholder="7.5" className={cls.warInput} autoFocus /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={cls.label}>Energy (1–10)</label><input type="number" min="1" max="10" value={morningForm.energy} onChange={e => setMorningForm({ ...morningForm, energy: e.target.value })} placeholder="8" className={cls.warInput} /></div>
              <div><label className={cls.label}>Mood (1–10)</label><input type="number" min="1" max="10" value={morningForm.mood} onChange={e => setMorningForm({ ...morningForm, mood: e.target.value })} placeholder="7" className={cls.warInput} /></div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveMorningLog} style={{ background: 'linear-gradient(135deg, #c9a84c, #c9a84c)', color: 'white', borderRadius: 8 }} className="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">Log Morning</button>
              <button onClick={() => setShowMorningModal(false)} style={{ border: '1px solid #1a2440', color: '#a0aec0', borderRadius: 8 }} className="px-4 py-2.5 text-[10px] uppercase tracking-widest hover:border-[#444] transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Evening Log Modal */}
      {showEveningModal && (
        <Modal title="Log Evening Check-In" onClose={() => setShowEveningModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={cls.label}>Stress (1–10)</label><input type="number" min="1" max="10" value={eveningForm.stress} onChange={e => setEveningForm({ ...eveningForm, stress: e.target.value })} placeholder="3" className={cls.warInput} autoFocus /></div>
              <div><label className={cls.label}>Work Output (1–10)</label><input type="number" min="1" max="10" value={eveningForm.work} onChange={e => setEveningForm({ ...eveningForm, work: e.target.value })} placeholder="8" className={cls.warInput} /></div>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="training" checked={eveningForm.training} onChange={e => setEveningForm({ ...eveningForm, training: e.target.checked })} style={{ accentColor: '#c9a84c', width: 16, height: 16 }} />
              <label htmlFor="training" style={{ fontFamily: 'Inter', fontSize: 12, color: '#d1d5db', cursor: 'pointer' }}>Trained today</label>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveEveningLog} style={{ background: 'linear-gradient(135deg, #3b82f6, #c9a84c)', color: 'white', borderRadius: 8 }} className="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">Log Evening</button>
              <button onClick={() => setShowEveningModal(false)} style={{ border: '1px solid #1a2440', color: '#a0aec0', borderRadius: 8 }} className="px-4 py-2.5 text-[10px] uppercase tracking-widest hover:border-[#444] transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
