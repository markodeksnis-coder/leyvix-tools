import { useState } from 'react'
import { Plus, Pencil, X, Sparkles, Trophy, Search } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { calcStreak, today, fmtShort, daysSinceStart } from '../utils'

const CARD = { background: '#0d0d0d', border: '1px solid #262626', borderRadius: 10, padding: 20 }
const LABEL = { fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: 'white', letterSpacing: '0.04em' }
const SUBLABEL = { fontFamily: 'Inter', fontSize: 9, color: '#555', letterSpacing: '0.08em', marginTop: 2 }

const CONTENT_CATS = ['All', 'Sales', 'Psychology', 'Business', 'Theology', 'Fitness', 'Relationships', 'Door-to-Door', 'Other']
const CAT_COLORS = {
  Sales: '#3b82f6', Psychology: '#8b5cf6', Business: '#f59e0b', Theology: '#10b981',
  Fitness: '#ef4444', Relationships: '#ec4899', 'Door-to-Door': '#f97316', Other: '#6b7280',
}
const BAR_PALETTE = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#ec4899', '#f97316', '#22c55e']
const PODIUM = [
  { stroke: '#facc15', glow: 'rgba(250,204,21,0.4)', medal: '🥇', size: 160 },
  { stroke: '#94a3b8', glow: 'rgba(148,163,184,0.3)', medal: '🥈', size: 140 },
  { stroke: '#f97316', glow: 'rgba(249,115,22,0.3)', medal: '🥉', size: 140 },
]

const cls = {
  input: "w-full bg-[#0a0a0a] border border-[#262626] px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#f59e0b] transition-colors rounded-lg",
  label: "block text-[9px] font-mono uppercase tracking-widest text-[#555] mb-1.5",
}

function ProgressRing({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const r = 14
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={36} height={36} viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
      <circle cx={18} cy={18} r={r} fill="none" stroke="#1a1a1a" strokeWidth={3} />
      <circle
        cx={18} cy={18} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={`${dash.toFixed(2)} ${circ.toFixed(2)}`}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
      />
      <text x={18} y={18} textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize={9} fontFamily="Inter" fontWeight="700">
        {pct}%
      </text>
    </svg>
  )
}

function Sparkline({ logs, fails }) {
  const logSet = new Set(logs)
  const failSet = new Set(fails || [])
  const dots = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const ds = d.toISOString().split('T')[0]
    dots.push(logSet.has(ds) ? 'done' : failSet.has(ds) ? 'failed' : 'missed')
  }
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center', overflow: 'hidden' }}>
      {dots.map((status, i) => (
        <div key={i} style={{
          width: 3, height: 10, borderRadius: 1.5, flexShrink: 0,
          background: status === 'done' ? '#22c55e' : status === 'failed' ? '#ef4444' : '#1a1a1a',
        }} />
      ))}
    </div>
  )
}

const SectionHeader = ({ children }) => (
  <div className="font-display text-white" style={{ fontSize: 22, borderLeft: '2px solid #f59e0b', paddingLeft: 12 }}>
    {children}
  </div>
)

export default function Record() {
  const [view, setView] = useState('dashboard')
  const [habits, setHabits] = useLocalStorage('marko_habits', [])
  const [content, setContent] = useLocalStorage('marko_content', [])
  const [contentCat, setContentCat] = useState('All')
  const [habitSearch, setHabitSearch] = useState('')
  const [showContentModal, setShowContentModal] = useState(false)
  const [showHabitModal, setShowHabitModal] = useState(false)
  const [editHabit, setEditHabit] = useState(null)
  const [habitForm, setHabitForm] = useState({ name: '', icon: '🎯', category: 'Health', target: 'Daily' })
  const [contentForm, setContentForm] = useState({ title: '', category: 'Sales', date: today(), takeaway: '' })

  const todayStr = today()
  const dayNum = daysSinceStart()
  const now = new Date()
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const dateLabel = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()

  const logHabit = id => setHabits(habits.map(h => h.id !== id ? h : {
    ...h,
    logs: h.logs.includes(todayStr) ? h.logs : [...h.logs, todayStr],
    fails: (h.fails || []).filter(f => f !== todayStr),
  }))

  const failHabit = id => {
    if (!window.confirm('Mark as failed today?')) return
    setHabits(habits.map(h => h.id !== id ? h : {
      ...h,
      fails: (h.fails || []).includes(todayStr) ? (h.fails || []) : [...(h.fails || []), todayStr],
      logs: h.logs.filter(l => l !== todayStr),
    }))
  }

  const undoHabit = id => setHabits(habits.map(h => h.id !== id ? h : {
    ...h,
    logs: h.logs.filter(l => l !== todayStr),
    fails: (h.fails || []).filter(f => f !== todayStr),
  }))

  const saveHabit = () => {
    if (!habitForm.name.trim()) return
    if (editHabit) {
      setHabits(habits.map(h => h.id === editHabit.id ? { ...h, name: habitForm.name, icon: habitForm.icon, category: habitForm.category } : h))
    } else {
      setHabits([...habits, { id: Date.now().toString(), name: habitForm.name, icon: habitForm.icon || '🎯', category: habitForm.category, target: habitForm.target, logs: [], fails: [] }])
    }
    setHabitForm({ name: '', icon: '🎯', category: 'Health', target: 'Daily' })
    setEditHabit(null)
    setShowHabitModal(false)
  }

  const addContent = () => {
    if (!contentForm.title.trim()) return
    setContent([{ ...contentForm, id: Date.now() }, ...content])
    setContentForm({ title: '', category: 'Sales', date: today(), takeaway: '' })
    setShowContentModal(false)
  }

  const deleteContent = id => setContent(content.filter(c => c.id !== id))
  const filteredContent = content.filter(c => contentCat === 'All' || c.category === contentCat)

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
    Current: h.current,
    Best: h.best,
  }))

  const filteredHabits = habits.filter(h => !habitSearch || h.name.toLowerCase().includes(habitSearch.toLowerCase()))

  const trophies = habits.map((h, i) => {
    const s = calcStreak(h.logs)
    return { name: h.name, icon: h.icon || '🎯', best: s.longest, current: s.current, color: BAR_PALETTE[i % BAR_PALETTE.length] }
  }).filter(t => t.best > 0).sort((a, b) => b.best - a.best)

  const chartData = trophies.map(t => ({ name: `${t.icon} ${t.name}`, value: t.best, fill: t.color }))
  const longestEver = trophies[0]?.best || 0

  return (
    <div className="h-full flex flex-col overflow-auto" style={{ background: '#0a0a0a' }}>
      <div className="px-8 py-7" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display" style={{ fontSize: 46, color: '#f59e0b', lineHeight: 1, letterSpacing: '0.02em' }}>THE RECORD</h1>
            <p style={{ fontFamily: 'Inter', fontSize: 11, color: '#555', letterSpacing: '0.1em', marginTop: 6 }}>
              PERSONAL HABIT &amp; STREAK OPERATING SYSTEM // WAR-ROOM LEDGER
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
              LIVE TRANSMISSION
            </div>
            <div style={{ fontFamily: 'Inter', fontSize: 10, color: '#444', marginTop: 4, letterSpacing: '0.05em' }}>LOCAL SAVE · ENGRAVED</div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1.5">
          {[{ id: 'dashboard', label: 'Dashboard' }, { id: 'warroom', label: 'War Room Ledger' }].map(t => {
            const isActive = view === t.id
            return (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                style={{
                  background: isActive ? '#f59e0b' : 'transparent',
                  color: isActive ? '#0a0a0a' : '#888',
                  border: isActive ? 'none' : '1px solid #262626',
                  fontFamily: 'Inter', fontSize: 11, fontWeight: isActive ? 700 : 400,
                  padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                  letterSpacing: '0.04em', transition: 'all 0.15s',
                }}
              >{t.label}</button>
            )
          })}
        </div>

        {view === 'dashboard' ? (
          <>
            {/* Active Streaks */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <SectionHeader>Active Streaks</SectionHeader>
                <button
                  onClick={() => { setHabitForm({ name: '', icon: '🎯', category: 'Health', target: 'Daily' }); setEditHabit(null); setShowHabitModal(true) }}
                  style={{ border: '1px solid #262626', color: '#555', fontFamily: 'Inter' }}
                  className="flex items-center gap-1 px-3 py-1 text-[9px] uppercase tracking-widest hover:text-white hover:border-[#f59e0b] transition-colors"
                >
                  <Plus size={9} /> Add Habit
                </button>
              </div>
              {habits.length === 0 ? (
                <div style={{ background: '#0d0d0d', border: '1px solid #262626', borderRadius: 10, padding: '32px', textAlign: 'center', fontFamily: 'Inter', fontSize: 12, color: '#333' }}>
                  No habits yet
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {habits.map(h => {
                    const streak = calcStreak(h.logs)
                    const doneToday = h.logs.includes(todayStr)
                    const failedToday = (h.fails || []).includes(todayStr)
                    const isRecord = streak.current > 0 && streak.current === streak.longest && streak.current > 1
                    const numColor = (failedToday || streak.current === 0) ? '#ef4444' : isRecord ? '#facc15' : '#ffffff'
                    const numShadow = isRecord ? '0 0 12px rgba(250,204,21,0.5)' : 'none'
                    const barColor = isRecord ? '#facc15' : failedToday ? '#ef4444' : streak.current > 0 ? '#22c55e' : '#262626'
                    const ringColor = isRecord ? '#facc15' : failedToday ? '#ef4444' : '#22c55e'
                    const badge = failedToday ? '💀' : isRecord ? '👑' : streak.current > 7 ? '🔥' : ''

                    return (
                      <div
                        key={h.id}
                        style={{
                          background: '#0d0d0d',
                          border: '1px solid #262626',
                          borderLeft: `3px solid ${barColor}`,
                          borderRadius: 10,
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          boxShadow: isRecord ? '0 0 16px rgba(245,158,11,0.2)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {h.icon} {h.name}
                          </span>
                          <button
                            onClick={() => { setHabitForm({ name: h.name, icon: h.icon || '🎯', category: h.category || 'Health', target: h.target || 'Daily' }); setEditHabit(h); setShowHabitModal(true) }}
                            style={{ color: '#444', flexShrink: 0, marginLeft: 4 }}
                            className="hover:text-[#888] transition-colors"
                          ><Pencil size={10} /></button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, lineHeight: 1 }}>
                          <span className="font-display" style={{ fontSize: 48, color: numColor, lineHeight: 1, textShadow: numShadow }}>
                            {streak.current}
                          </span>
                          {badge && <span style={{ fontSize: 16 }}>{badge}</span>}
                        </div>

                        <div style={{ fontFamily: 'Inter', fontSize: 10, color: '#555' }}>
                          BEST {streak.longest}d · WK {streak.weekCount} / MO {streak.monthCount}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ProgressRing value={streak.current} max={Math.max(1, streak.longest)} color={ringColor} />
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <Sparkline logs={h.logs} fails={h.fails || []} />
                          </div>
                        </div>

                        {doneToday ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1, height: 28, background: '#166534', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: 'white' }}>
                              ✓ LOGGED
                            </div>
                            <button onClick={() => undoHabit(h.id)} style={{ fontFamily: 'Inter', fontSize: 9, color: '#333' }} className="hover:text-[#555] transition-colors">UNDO</button>
                          </div>
                        ) : failedToday ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1, height: 28, border: '1px solid #ef4444', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: '#ef4444' }}>
                              ✗ FAILED
                            </div>
                            <button onClick={() => undoHabit(h.id)} style={{ fontFamily: 'Inter', fontSize: 9, color: '#333' }} className="hover:text-[#555] transition-colors">UNDO</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => logHabit(h.id)}
                              style={{ flex: 1, height: 28, background: '#16a34a', borderRadius: 6, fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: 'white', cursor: 'pointer' }}
                              className="hover:opacity-90 transition-opacity"
                            >✓ Done</button>
                            <button
                              onClick={() => failHabit(h.id)}
                              style={{ flex: 1, height: 28, border: '1px solid #ef4444', borderRadius: 6, color: '#ef4444', fontFamily: 'Inter', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'transparent' }}
                              className="hover:bg-[#ef4444]/10 transition-colors"
                            >✗ Fail</button>
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
                <div className="mb-6">
                  <SectionHeader>Trophy Wall</SectionHeader>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 24, marginBottom: 32 }}>
                  {[
                    trophies[1] ? { t: trophies[1], p: PODIUM[1] } : null,
                    { t: trophies[0], p: PODIUM[0] },
                    trophies[2] ? { t: trophies[2], p: PODIUM[2] } : null,
                  ].map((item, i) => {
                    if (!item) return <div key={i} style={{ width: 140 }} />
                    const { t, p } = item
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: p.size, height: p.size, borderRadius: '50%',
                          border: `8px solid ${p.stroke}`,
                          boxShadow: `0 0 24px ${p.glow}`,
                          background: '#0d0d0d',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                        }}>
                          <div style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 700, color: '#999', textAlign: 'center', padding: '0 12px', maxWidth: p.size - 24, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.name.toUpperCase()}
                          </div>
                          <div className="font-display" style={{ fontSize: p.size === 160 ? 40 : 36, color: p.stroke, lineHeight: 1 }}>
                            {t.best}
                          </div>
                          <div style={{ fontFamily: 'Inter', fontSize: 10, color: '#666' }}>days</div>
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
                        <XAxis
                          dataKey="name" angle={-45} textAnchor="end" interval={0}
                          tick={{ fill: '#666', fontSize: 11, fontFamily: 'Inter' }}
                          axisLine={{ stroke: '#262626' }} tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: '#666', fontSize: 11, fontFamily: 'Inter' }}
                          axisLine={{ stroke: '#262626' }} tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{ background: '#0d0d0d', border: '1px solid #262626', borderRadius: 8, fontSize: 12, fontFamily: 'Inter' }}
                          labelStyle={{ color: '#888' }} itemStyle={{ color: '#fff' }}
                          cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: '#888', fontFamily: 'Inter' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Habits Tracked', value: habits.length },
                    { label: 'Longest Streak Ever', value: `${longestEver}d` },
                    { label: 'Active Streaks', value: activeStreaks },
                    { label: 'Perfect Days (Mo)', value: perfectDays },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="font-display" style={{ fontSize: 28, color: '#f59e0b', lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#666', marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Content Library */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <SectionHeader>Content Library</SectionHeader>
                <button
                  onClick={() => setShowContentModal(true)}
                  style={{ border: '1px solid #262626', color: '#555', fontFamily: 'Inter' }}
                  className="flex items-center gap-1 px-3 py-1 text-[9px] uppercase tracking-widest hover:text-white hover:border-[#f59e0b] transition-colors"
                >
                  <Plus size={9} /> Add Entry
                </button>
              </div>

              <div className="flex gap-4 mb-3" style={{ fontFamily: 'Inter', fontSize: 11, color: '#444' }}>
                <span>Total <span style={{ color: '#666' }}>{content.length}</span></span>
                <span>This week <span style={{ color: '#666' }}>{content.filter(c => c.date >= thisWeekStart).length}</span></span>
                <span>This month <span style={{ color: '#666' }}>{content.filter(c => c.date >= thisMonthStart).length}</span></span>
              </div>

              <div className="flex gap-1.5 flex-wrap mb-4">
                {CONTENT_CATS.map(cat => {
                  const isActive = contentCat === cat
                  const color = cat === 'All' ? '#f59e0b' : (CAT_COLORS[cat] || '#6b7280')
                  return (
                    <button
                      key={cat}
                      onClick={() => setContentCat(cat)}
                      style={{
                        background: isActive ? color : '#1a1a1a',
                        color: isActive ? (cat === 'All' ? '#0a0a0a' : 'white') : '#555',
                        fontFamily: 'Inter', fontSize: 11, fontWeight: isActive ? 600 : 400,
                        padding: '4px 12px', borderRadius: 9999, border: 'none', cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {cat}
                    </button>
                  )
                })}
              </div>

              {filteredContent.length === 0 ? (
                <div style={{ background: '#0d0d0d', border: '1px solid #262626', borderRadius: 10, padding: '32px', textAlign: 'center', fontFamily: 'Inter', fontSize: 12, color: '#333' }}>
                  No entries yet
                </div>
              ) : (
                <div style={{ columnCount: 2, columnGap: 12 }}>
                  {filteredContent.map(c => {
                    const color = CAT_COLORS[c.category] || '#6b7280'
                    return (
                      <div
                        key={c.id}
                        className="group"
                        style={{
                          background: '#0d0d0d', border: '1px solid #262626', borderRadius: 10, borderLeft: `4px solid ${color}`,
                          padding: '12px 14px', marginBottom: 10, breakInside: 'avoid',
                          transition: 'box-shadow 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 16px ${color}26` }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ background: color, fontFamily: 'Inter', fontSize: 10, fontWeight: 700, color: 'white', padding: '2px 8px', borderRadius: 9999 }}>
                            {c.category}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#444' }}>{fmtShort(c.date)}</span>
                            <button onClick={() => deleteContent(c.id)} style={{ color: '#333' }} className="hover:text-[#ef4444] opacity-0 group-hover:opacity-100 transition-all">
                              <X size={11} />
                            </button>
                          </div>
                        </div>
                        <div className="line-clamp-2" style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 4 }}>
                          {c.title}
                        </div>
                        {c.takeaway && (
                          <div className="line-clamp-3" style={{ fontFamily: 'Inter', fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>
                            {c.takeaway}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            {/* 3-Panel Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Panel 1: Today's Status */}
              <div style={CARD}>
                <div className="flex items-center justify-between">
                  <div style={LABEL}>TODAY'S STATUS</div>
                  <Sparkles size={14} color="#f59e0b" />
                </div>
                <div style={SUBLABEL}>{dayName}, {dateLabel}</div>

                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { label: 'MISSION DONE', value: `${doneCount}/${habits.length}`, pct: missionPct, color: '#f59e0b' },
                    { label: 'ACTIVE STREAKS', value: `${activeStreaks}/${habits.length}`, pct: activePct, color: '#f59e0b' },
                    { label: 'FAILED TODAY', value: `${failedCount}/${habits.length}`, pct: failedPct, color: '#ef4444' },
                  ].map(row => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between" style={{ fontFamily: 'Inter', fontSize: 10, color: '#888', letterSpacing: '0.05em', marginBottom: 6 }}>
                        <span>{row.label}</span>
                        <span style={{ color: 'white', fontWeight: 700 }}>{row.value}</span>
                      </div>
                      <div style={{ height: 4, background: '#1a1a1a', borderRadius: 2 }}>
                        <div style={{ width: `${row.pct}%`, height: 4, background: row.color, borderRadius: 2, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  ))}
                  {habits.length === 0 && <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#333' }}>No habits yet</div>}
                </div>

                <div style={{ display: 'flex', gap: 24, marginTop: 24, paddingTop: 16, borderTop: '1px solid #1a1a1a' }}>
                  {[
                    { label: 'BEST EVER', value: bestEver },
                    { label: 'PERFECT DAYS', value: perfectDays },
                    { label: 'HABITS', value: habits.length },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="font-display" style={{ fontSize: 26, color: '#f59e0b', lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#555', marginTop: 4, letterSpacing: '0.05em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Panel 2: All-Time Records */}
              <div style={CARD}>
                <div className="flex items-center justify-between">
                  <div style={LABEL}>ALL-TIME RECORDS</div>
                  <Trophy size={14} color="#f59e0b" />
                </div>
                <div style={SUBLABEL}>PERSONAL BESTS / PERPETUAL</div>

                {topHabits.length === 0 ? (
                  <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#333', textAlign: 'center', padding: '48px 0' }}>No records yet</div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
                    <div style={{ position: 'relative', width: 150, height: 150, flexShrink: 0 }}>
                      <div style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                        width: 92, height: 92, borderRadius: '50%',
                        border: '3px solid #f59e0b', boxShadow: '0 0 24px rgba(245,158,11,0.35)',
                        background: '#0d0d0d',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div className="font-display" style={{ fontSize: 30, color: '#f59e0b', lineHeight: 1 }}>{topHabits[0].best}</div>
                        <div style={{ fontFamily: 'Inter', fontSize: 7, color: '#888', textTransform: 'uppercase', textAlign: 'center', padding: '0 6px' }}>{topHabits[0].name}</div>
                      </div>
                      {[
                        { top: 0, left: 0 }, { top: 0, right: 0 },
                        { bottom: 0, left: 0 }, { bottom: 0, right: 0 },
                      ].map((pos, i) => {
                        const h = topHabits[i + 1]
                        if (!h) return null
                        return (
                          <div key={h.id} style={{
                            position: 'absolute', ...pos,
                            width: 52, height: 52, borderRadius: '50%',
                            border: '2px solid #3a3a3a', background: '#0d0d0d',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <span className="font-display" style={{ fontSize: 17, color: '#d4d4d4' }}>{h.best}</span>
                          </div>
                        )
                      })}
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 11, minWidth: 0 }}>
                      {topHabits.slice(0, 5).map((h, i) => (
                        <div key={h.id} className="flex items-center justify-between gap-2">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }}>
                            <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#555', flexShrink: 0 }}>#{String(i + 1).padStart(2, '0')}</span>
                            <span style={{ flexShrink: 0 }}>{h.icon}</span>
                            <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name.toUpperCase()}</span>
                          </div>
                          <span style={{ fontFamily: 'Inter', fontSize: 12, color: '#f59e0b', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
                            {h.best} <span style={{ color: '#555', fontWeight: 400, fontSize: 9 }}>DAYS</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Panel 3: Streak Overview */}
              <div style={CARD}>
                <div className="flex items-center justify-between">
                  <div style={LABEL}>STREAK OVERVIEW</div>
                  <div style={{ display: 'flex', gap: 10, fontFamily: 'Inter', fontSize: 9, color: '#888' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, background: '#f59e0b', borderRadius: 2 }} /> CURRENT</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, background: '#92580a', borderRadius: 2 }} /> BEST</span>
                  </div>
                </div>
                <div style={SUBLABEL}>CURRENT VS BEST / ALL HABITS</div>
                {habits.length === 0 ? (
                  <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#333', textAlign: 'center', padding: '48px 0' }}>Add habits to see chart</div>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={streakChartData} margin={{ top: 16, right: 0, bottom: 0, left: 0 }} barGap={2} barCategoryGap="30%">
                      <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 8, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#444', fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} width={22} />
                      <Tooltip
                        contentStyle={{ background: '#0d0d0d', border: '1px solid #262626', borderRadius: 8, fontFamily: 'Inter', fontSize: 11 }}
                        labelStyle={{ color: '#f59e0b' }} itemStyle={{ color: '#fff' }}
                        cursor={{ fill: 'rgba(245,158,11,0.04)' }}
                      />
                      <Bar dataKey="Current" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="Best" fill="#7a4d0a" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Streak Ledger */}
            <div style={CARD}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div style={LABEL}>STREAK LEDGER</div>
                  <div style={SUBLABEL}>LIVE STATUS · {habits.length} HABITS ENGRAVED</div>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ position: 'relative' }}>
                    <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
                    <input
                      value={habitSearch}
                      onChange={e => setHabitSearch(e.target.value)}
                      placeholder="SEARCH HABITS..."
                      style={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: 6, padding: '7px 10px 7px 30px', fontFamily: 'Inter', fontSize: 11, color: 'white', width: 170, outline: 'none' }}
                    />
                  </div>
                  <button
                    onClick={() => { setHabitForm({ name: '', icon: '🎯', category: 'Health', target: 'Daily' }); setEditHabit(null); setShowHabitModal(true) }}
                    style={{ background: '#f59e0b', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '7px 12px', fontFamily: 'Inter', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                  >
                    <Plus size={11} /> REGISTER NEW HABIT
                  </button>
                </div>
              </div>

              {habits.length === 0 ? (
                <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#333', textAlign: 'center', padding: '32px 0' }}>No habits registered yet</div>
              ) : (
                <>
                  <div style={{ overflowX: 'auto', marginTop: 16 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #262626' }}>
                          {['HABIT IDENTITY', 'CURRENT', 'EFFICIENCY', 'BEST EVER', 'STATUS', 'COMMAND'].map(h => (
                            <th key={h} style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left', padding: '0 12px 10px', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHabits.map((h, i) => {
                          const streak = calcStreak(h.logs)
                          const failedToday = (h.fails || []).includes(todayStr)
                          const doneToday = h.logs.includes(todayStr)
                          const isRecord = streak.current > 0 && streak.current === streak.longest
                          const status = (failedToday || streak.current === 0) ? 'DOWN' : isRecord ? 'RECORD' : 'OPERATIONAL'
                          const effPct = streak.longest > 0 ? Math.min(100, Math.round((streak.current / streak.longest) * 100)) : 0
                          return (
                            <tr key={h.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                              <td style={{ padding: '12px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#444' }}>{String(i + 1).padStart(2, '0')}</span>
                                  <span>{h.icon}</span>
                                  <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: 'white' }}>{h.name.toUpperCase()}</span>
                                  <button
                                    onClick={() => { setHabitForm({ name: h.name, icon: h.icon || '🎯', category: h.category || 'Health', target: h.target || 'Daily' }); setEditHabit(h); setShowHabitModal(true) }}
                                    style={{ color: '#444', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                                  ><Pencil size={10} /></button>
                                </div>
                              </td>
                              <td style={{ padding: '12px' }}>
                                <span className="font-display" style={{ fontSize: 20, color: '#f59e0b' }}>{String(streak.current).padStart(2, '0')}</span>
                                <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#555' }}> D</span>
                              </td>
                              <td style={{ padding: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 80, height: 4, background: '#1a1a1a', borderRadius: 2, flexShrink: 0 }}>
                                    <div style={{ width: `${effPct}%`, height: 4, background: '#f59e0b', borderRadius: 2 }} />
                                  </div>
                                  <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#888' }}>{effPct}%</span>
                                </div>
                              </td>
                              <td style={{ padding: '12px', fontFamily: 'Inter', fontSize: 13, color: '#d4d4d4' }}>{streak.longest} D</td>
                              <td style={{ padding: '12px' }}>
                                {status === 'DOWN' && (
                                  <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 700, color: '#ef4444', border: '1px solid #ef444450', borderRadius: 4, padding: '3px 8px' }}>DOWN</span>
                                )}
                                {status === 'RECORD' && (
                                  <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 700, color: '#0a0a0a', background: '#f59e0b', borderRadius: 4, padding: '3px 8px' }}>🏆 RECORD</span>
                                )}
                                {status === 'OPERATIONAL' && (
                                  <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, color: '#888', border: '1px solid #333', borderRadius: 4, padding: '3px 8px' }}>OPERATIONAL</span>
                                )}
                              </td>
                              <td style={{ padding: '12px' }}>
                                {doneToday || failedToday ? (
                                  <button onClick={() => undoHabit(h.id)} style={{ fontFamily: 'Inter', fontSize: 11, color: '#888', border: '1px solid #333', borderRadius: 6, padding: '4px 10px', background: 'transparent', cursor: 'pointer' }}>UNDO</button>
                                ) : (
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button onClick={() => logHabit(h.id)} style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: '#0a0a0a', background: '#f59e0b', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>DONE</button>
                                    <button onClick={() => failHabit(h.id)} style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, color: '#ef4444', background: 'transparent', border: '1px solid #ef444450', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>FAIL</button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #1a1a1a' }}>
                    <div style={{ display: 'flex', gap: 16, fontFamily: 'Inter', fontSize: 10, color: '#555' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#f59e0b' }} />RECORD</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#555' }} />ACTIVE</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#ef4444' }} />FAILED</span>
                    </div>
                    <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#555' }}>{filteredHabits.length} / {habits.length} SHOWN</span>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

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
              <button onClick={saveHabit} style={{ background: '#f59e0b', color: '#0a0a0a', borderRadius: 8 }} className="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">Save</button>
              <button onClick={() => { setShowHabitModal(false); setEditHabit(null) }} style={{ border: '1px solid #262626', color: '#555', borderRadius: 8 }} className="px-4 py-2.5 text-[10px] uppercase tracking-widest hover:border-[#444] transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

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
              <button onClick={addContent} style={{ background: '#f59e0b', color: '#0a0a0a', borderRadius: 8 }} className="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">Save</button>
              <button onClick={() => setShowContentModal(false)} style={{ border: '1px solid #262626', color: '#555', borderRadius: 8 }} className="px-4 py-2.5 text-[10px] uppercase tracking-widest hover:border-[#444] transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
