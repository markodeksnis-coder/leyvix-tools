import { useState } from 'react'
import { Plus, Pencil, X } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { calcStreak, today, fmtShort, daysSinceStart } from '../utils'

const CONTENT_CATS = ['All', 'Sales', 'Psychology', 'Business', 'Theology', 'Fitness', 'Relationships', 'Door-to-Door', 'Other']

const CAT_COLORS = {
  Sales: '#3b82f6',
  Psychology: '#8b5cf6',
  Business: '#f59e0b',
  Theology: '#10b981',
  Fitness: '#ef4444',
  Relationships: '#ec4899',
  'Door-to-Door': '#f97316',
  Other: '#6b7280',
}

const BAR_PALETTE = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#ec4899', '#f97316', '#22c55e']

const PODIUM = [
  { stroke: '#facc15', glow: 'rgba(250,204,21,0.4)', medal: '🥇', size: 160 },
  { stroke: '#94a3b8', glow: 'rgba(148,163,184,0.3)', medal: '🥈', size: 140 },
  { stroke: '#f97316', glow: 'rgba(249,115,22,0.3)', medal: '🥉', size: 140 },
]

function ProgressRing({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const r = 14
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={36} height={36} viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
      <circle cx={18} cy={18} r={r} fill="none" stroke="#2a2520" strokeWidth={3} />
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
          background: status === 'done' ? '#22c55e' : status === 'failed' ? '#ef4444' : '#2a2520',
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

const cls = {
  input: "w-full bg-[#0c0a09] border border-[#2a2520] px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#f59e0b] transition-colors",
  label: "block text-[9px] font-mono uppercase tracking-widest text-[#444] mb-1.5",
}

export default function Record() {
  const [habits, setHabits] = useLocalStorage('marko_habits', [])
  const [content, setContent] = useLocalStorage('marko_content', [])
  const [contentCat, setContentCat] = useState('All')
  const [showContentModal, setShowContentModal] = useState(false)
  const [showHabitModal, setShowHabitModal] = useState(false)
  const [editHabit, setEditHabit] = useState(null)
  const [habitForm, setHabitForm] = useState({ name: '', icon: '🎯', category: 'Health', target: 'Daily' })
  const [contentForm, setContentForm] = useState({ title: '', category: 'Sales', date: today(), takeaway: '' })

  const todayStr = today()
  const dayNum = daysSinceStart()
  const now = new Date()
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const dateLabel = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toUpperCase()

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

  const trophies = habits.map((h, i) => {
    const s = calcStreak(h.logs)
    return { name: h.name, icon: h.icon || '🎯', best: s.longest, current: s.current, color: BAR_PALETTE[i % BAR_PALETTE.length] }
  }).filter(t => t.best > 0).sort((a, b) => b.best - a.best)

  const chartData = trophies.map(t => ({ name: `${t.icon} ${t.name}`, value: t.best, fill: t.color }))
  const longestEver = trophies[0]?.best || 0
  const activeStreaks = habits.filter(h => calcStreak(h.logs).current > 0).length
  const perfectDays = habits.length === 0 ? 0 : (() => {
    const days = [...new Set(habits.flatMap(h => h.logs.filter(d => d >= thisMonthStart)))]
    return days.filter(d => habits.every(h => h.logs.includes(d))).length
  })()

  return (
    <div className="h-full flex flex-col" style={{ background: '#0c0a09' }}>
      {/* Header */}
      <div className="px-6 py-3 shrink-0" style={{ borderBottom: '1px solid #2a2520' }}>
        <h1 style={{ fontFamily: 'Inter', fontSize: 28, fontWeight: 300, color: 'white', letterSpacing: '-0.01em' }}>
          {dayName}, {dateLabel}
        </h1>
        <p style={{ fontFamily: 'Inter', fontSize: 13, color: '#f59e0b', fontStyle: 'italic', marginTop: 2 }}>
          Day {dayNum} of the war.
        </p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Active Streaks */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionHeader>Active Streaks</SectionHeader>
            <button
              onClick={() => { setHabitForm({ name: '', icon: '🎯', category: 'Health', target: 'Daily' }); setEditHabit(null); setShowHabitModal(true) }}
              style={{ border: '1px solid #2a2520', color: '#444', fontFamily: 'Inter' }}
              className="flex items-center gap-1 px-3 py-1 text-[9px] uppercase tracking-widest hover:text-white hover:border-[#f59e0b] transition-colors"
            >
              <Plus size={9} /> Add Habit
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {habits.map(h => {
              const streak = calcStreak(h.logs)
              const doneToday = h.logs.includes(todayStr)
              const failedToday = (h.fails || []).includes(todayStr)
              const isRecord = streak.current > 0 && streak.current === streak.longest && streak.current > 1
              const numColor = (failedToday || streak.current === 0) ? '#ef4444' : isRecord ? '#facc15' : '#ffffff'
              const numShadow = isRecord ? '0 0 12px rgba(250,204,21,0.5)' : 'none'
              const barColor = isRecord ? '#facc15' : failedToday ? '#ef4444' : streak.current > 0 ? '#22c55e' : '#2a2520'
              const ringColor = isRecord ? '#facc15' : failedToday ? '#ef4444' : '#22c55e'
              const badge = failedToday ? '💀' : isRecord ? '👑' : streak.current > 7 ? '🔥' : ''

              return (
                <div
                  key={h.id}
                  style={{
                    background: 'linear-gradient(135deg, #141210 0%, #1a1510 100%)',
                    border: '1px solid #2a2520',
                    borderLeft: `3px solid ${barColor}`,
                    borderRadius: 12,
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    boxShadow: isRecord ? '0 0 16px rgba(245,158,11,0.2)' : 'none',
                  }}
                >
                  {/* Name + edit */}
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

                  {/* Streak number */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, lineHeight: 1 }}>
                    <span className="font-display" style={{ fontSize: 48, color: numColor, lineHeight: 1, textShadow: numShadow }}>
                      {streak.current}
                    </span>
                    {badge && <span style={{ fontSize: 16 }}>{badge}</span>}
                  </div>

                  {/* Stats line */}
                  <div style={{ fontFamily: 'Inter', fontSize: 10, color: '#555' }}>
                    BEST {streak.longest}d · WK {streak.weekCount} / MO {streak.monthCount}
                  </div>

                  {/* Ring + sparkline */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ProgressRing value={streak.current} max={Math.max(1, streak.longest)} color={ringColor} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <Sparkline logs={h.logs} fails={h.fails || []} />
                    </div>
                  </div>

                  {/* Buttons */}
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
        </section>

        {/* Content Library */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionHeader>Content Library</SectionHeader>
            <button
              onClick={() => setShowContentModal(true)}
              style={{ border: '1px solid #2a2520', color: '#444', fontFamily: 'Inter' }}
              className="flex items-center gap-1 px-3 py-1 text-[9px] uppercase tracking-widest hover:text-white hover:border-[#f59e0b] transition-colors"
            >
              <Plus size={9} /> Add Entry
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mb-3" style={{ fontFamily: 'Inter', fontSize: 11, color: '#444' }}>
            <span>Total <span style={{ color: '#666' }}>{content.length}</span></span>
            <span>This week <span style={{ color: '#666' }}>{content.filter(c => c.date >= thisWeekStart).length}</span></span>
            <span>This month <span style={{ color: '#666' }}>{content.filter(c => c.date >= thisMonthStart).length}</span></span>
          </div>

          {/* Filter pills */}
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
                    color: isActive ? (cat === 'All' ? '#0c0a09' : 'white') : '#555',
                    fontFamily: 'Inter', fontSize: 11, fontWeight: isActive ? 600 : 400,
                    padding: '4px 12px', borderRadius: 9999, border: 'none', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#888' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#555' }}
                >
                  {cat}
                </button>
              )
            })}
          </div>

          {/* Masonry card grid */}
          {filteredContent.length === 0 ? (
            <div style={{ background: '#141210', borderRadius: 10, padding: '32px', textAlign: 'center', fontFamily: 'Inter', fontSize: 12, color: '#333' }}>
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
                      background: '#141210', borderRadius: 10, borderLeft: `4px solid ${color}`,
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

        {/* Trophy Wall */}
        {trophies.length > 0 && (
          <section>
            <div className="mb-6">
              <SectionHeader>Trophy Wall</SectionHeader>
            </div>

            {/* Podium */}
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
                      background: '#141210',
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

            {/* Bar chart */}
            {chartData.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 16, right: 16, bottom: 52, left: 0 }}>
                    <XAxis
                      dataKey="name" angle={-45} textAnchor="end" interval={0}
                      tick={{ fill: '#666', fontSize: 11, fontFamily: 'Inter' }}
                      axisLine={{ stroke: '#2a2520' }} tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#666', fontSize: 11, fontFamily: 'Inter' }}
                      axisLine={{ stroke: '#2a2520' }} tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ background: '#141210', border: '1px solid #2a2520', borderRadius: 8, fontSize: 12, fontFamily: 'Inter' }}
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

            {/* Personal bests stat row */}
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
              <button onClick={saveHabit} style={{ background: '#f59e0b', color: '#0c0a09' }} className="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">Save</button>
              <button onClick={() => { setShowHabitModal(false); setEditHabit(null) }} style={{ border: '1px solid #2a2520', color: '#444' }} className="px-4 py-2.5 text-[10px] uppercase tracking-widest hover:border-[#666] transition-colors">Cancel</button>
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
              <button onClick={addContent} style={{ background: '#f59e0b', color: '#0c0a09' }} className="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">Save</button>
              <button onClick={() => setShowContentModal(false)} style={{ border: '1px solid #2a2520', color: '#444' }} className="px-4 py-2.5 text-[10px] uppercase tracking-widest hover:border-[#666] transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
