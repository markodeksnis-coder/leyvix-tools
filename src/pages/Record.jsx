import { useState } from 'react'
import { Plus, Pencil, X } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Heatmap from '../components/Heatmap'
import Modal from '../components/Modal'
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

const TROPHY_STYLES = [
  { bg: 'linear-gradient(135deg, #78350f, #92400e)', border: '#f59e0b', shadow: '0 0 24px rgba(245,158,11,0.4)', numColor: '#facc15', medal: '🥇' },
  { bg: 'linear-gradient(135deg, #1e293b, #334155)', border: '#94a3b8', shadow: '0 0 16px rgba(148,163,184,0.2)', numColor: '#e2e8f0', medal: '🥈' },
  { bg: 'linear-gradient(135deg, #431407, #7c2d12)', border: '#f97316', shadow: '0 0 16px rgba(249,115,22,0.2)', numColor: '#fb923c', medal: '🥉' },
]

const SectionHeader = ({ children }) => (
  <div className="font-display text-white" style={{ fontSize: 22, borderLeft: '2px solid #dc2626', paddingLeft: 12 }}>
    {children}
  </div>
)

const cls = {
  input: "w-full bg-[#080808] border border-[#2a2a2a] px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#dc2626] transition-colors",
  label: "block text-[9px] font-mono uppercase tracking-widest text-[#444] mb-1.5",
}

export default function Record() {
  const [habits, setHabits] = useLocalStorage('marko_habits', [])
  const [content, setContent] = useLocalStorage('marko_content', [])
  const [contentCat, setContentCat] = useState('All')
  const [collapsedHeatmaps, setCollapsedHeatmaps] = useState({})
  const [showContentModal, setShowContentModal] = useState(false)
  const [showHabitModal, setShowHabitModal] = useState(false)
  const [editHabit, setEditHabit] = useState(null)
  const [habitForm, setHabitForm] = useState({ name: '', icon: '🎯', category: 'Health', target: 'Daily' })
  const [contentForm, setContentForm] = useState({ title: '', category: 'Sales', date: today(), takeaway: '' })

  const todayStr = today()
  const dayNum = daysSinceStart()
  const now = new Date()
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' })
  const dateLabel = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

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

  const toggleHeatmap = id => setCollapsedHeatmaps(p => ({ ...p, [id]: !p[id] }))

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

  const trophies = habits.map(h => {
    const s = calcStreak(h.logs)
    return { name: h.name, icon: h.icon || '🎯', best: s.longest }
  }).filter(t => t.best > 0).sort((a, b) => b.best - a.best)

  const thisWeekStart = (() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0]
  })()
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-5 border-b border-[#2a2a2a] shrink-0">
        <h1 className="font-display text-white" style={{ fontSize: 28 }}>{dayName}, {dateLabel}</h1>
        <p style={{ fontFamily: 'Inter', fontSize: 13, color: '#dc2626', marginTop: 2 }}>Day {dayNum} of the war.</p>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-10">

        {/* Active Streaks */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionHeader>Active Streaks</SectionHeader>
            <button
              onClick={() => { setHabitForm({ name: '', icon: '🎯', category: 'Health', target: 'Daily' }); setEditHabit(null); setShowHabitModal(true) }}
              className="flex items-center gap-1 px-3 py-1.5 border border-[#2a2a2a] text-[#444] text-[9px] uppercase tracking-widest hover:border-[#dc2626] hover:text-white transition-colors"
            >
              <Plus size={9} /> Add Habit
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {habits.map(h => {
              const streak = calcStreak(h.logs)
              const doneToday = h.logs.includes(todayStr)
              const failedToday = (h.fails || []).includes(todayStr)
              const isRecord = streak.current > 0 && streak.current === streak.longest && streak.current > 1
              const numColor = (failedToday || streak.current === 0) ? '#ef4444' : isRecord ? '#facc15' : '#ffffff'
              const numShadow = isRecord ? '0 0 20px rgba(250,204,21,0.6)' : 'none'
              const topBorderColor = isRecord ? '#facc15' : failedToday ? '#dc2626' : streak.current > 0 ? '#16a34a' : '#333'
              const badge = failedToday ? '💀' : isRecord ? '👑' : streak.current > 7 ? '🔥' : ''
              const expanded = !collapsedHeatmaps[h.id]
              const lastFail = [...(h.fails || [])].sort().at(-1)

              return (
                <div
                  key={h.id}
                  style={{ background: '#111111', border: '1px solid #222222', borderTop: `3px solid ${topBorderColor}` }}
                  className="p-4 transition-all"
                >
                  {/* Name row — click to toggle heatmap */}
                  <div className="flex items-start justify-between mb-2">
                    <button
                      onClick={() => toggleHeatmap(h.id)}
                      className="text-left flex-1 pr-1 hover:opacity-80 transition-opacity"
                      style={{ fontFamily: 'Inter', fontSize: 12, color: '#888', lineHeight: 1.3 }}
                    >
                      {h.icon} {h.name}
                    </button>
                    <button
                      onClick={() => { setHabitForm({ name: h.name, icon: h.icon || '🎯', category: h.category || 'Health', target: h.target || 'Daily' }); setEditHabit(h); setShowHabitModal(true) }}
                      className="text-[#333] hover:text-[#666] transition-colors shrink-0"
                    >
                      <Pencil size={10} />
                    </button>
                  </div>

                  {/* Big streak number */}
                  <div className="flex items-end gap-1">
                    <span
                      className="font-display select-none"
                      style={{ fontSize: 96, color: numColor, lineHeight: 1, textShadow: numShadow }}
                    >
                      {streak.current}
                    </span>
                    {badge && <span className="text-2xl mb-1 leading-none">{badge}</span>}
                  </div>

                  {/* DAY STREAK label */}
                  <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#555555', marginTop: -4, marginBottom: 8 }}>
                    DAY STREAK
                  </div>

                  {/* BEST + BROKE */}
                  <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#555555', marginBottom: 10 }} className="space-y-0.5">
                    <div>BEST <span style={{ color: 'white' }}>{streak.longest}d</span></div>
                    <div>BROKE {lastFail ? fmtShort(lastFail) : '—'}</div>
                  </div>

                  {/* Action buttons */}
                  {doneToday ? (
                    <div className="flex items-center gap-2">
                      <div
                        style={{ background: '#166534', fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: 'white', padding: '6px 0', flex: 1, textAlign: 'center' }}
                      >
                        ✓ LOGGED
                      </div>
                      <button onClick={() => undoHabit(h.id)} style={{ fontFamily: 'Inter', fontSize: 10, color: '#333' }} className="hover:text-[#555] transition-colors">UNDO</button>
                    </div>
                  ) : failedToday ? (
                    <div className="flex items-center gap-2">
                      <div
                        style={{ border: '1px solid #dc2626', fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: '#dc2626', padding: '6px 0', flex: 1, textAlign: 'center' }}
                      >
                        ✗ FAILED
                      </div>
                      <button onClick={() => undoHabit(h.id)} style={{ fontFamily: 'Inter', fontSize: 10, color: '#333' }} className="hover:text-[#555] transition-colors">UNDO</button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => logHabit(h.id)}
                        style={{ background: '#16a34a', fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: 'white' }}
                        className="flex-1 py-1.5 hover:opacity-90 transition-opacity"
                      >
                        ✓ Done
                      </button>
                      <button
                        onClick={() => failHabit(h.id)}
                        style={{ border: '1px solid #dc2626', color: '#dc2626', fontFamily: 'Inter', fontSize: 12, fontWeight: 700 }}
                        className="flex-1 py-1.5 hover:bg-[#dc2626]/10 transition-colors"
                      >
                        ✗ Fail
                      </button>
                    </div>
                  )}

                  {/* Collapsible heatmap (default expanded) */}
                  {expanded && (
                    <div className="mt-3 pt-3 border-t border-[#1a1a1a] overflow-x-auto">
                      <Heatmap logs={h.logs} fails={h.fails || []} />
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
            <button onClick={() => setShowContentModal(true)} className="flex items-center gap-1 px-3 py-1.5 border border-[#2a2a2a] text-[#444] text-[9px] uppercase tracking-widest hover:border-[#dc2626] hover:text-white transition-colors">
              <Plus size={9} /> Add Entry
            </button>
          </div>
          <div className="flex gap-4 mb-3 flex-wrap" style={{ fontFamily: 'Inter', fontSize: 11, color: '#444' }}>
            <span>Total <span style={{ color: '#666' }}>{content.length}</span></span>
            <span>This week <span style={{ color: '#666' }}>{content.filter(c => c.date >= thisWeekStart).length}</span></span>
            <span>This month <span style={{ color: '#666' }}>{content.filter(c => c.date >= thisMonthStart).length}</span></span>
          </div>
          <div className="flex gap-1 overflow-x-auto mb-3 pb-1">
            {CONTENT_CATS.map(cat => (
              <button key={cat} onClick={() => setContentCat(cat)}
                className={`px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest whitespace-nowrap shrink-0 transition-all ${contentCat === cat ? 'bg-[#dc2626] text-white' : 'border border-[#2a2a2a] text-[#444] hover:border-[#dc2626] hover:text-white'}`}>
                {cat}
              </button>
            ))}
          </div>
          {filteredContent.length === 0 ? (
            <div className="p-8 text-center" style={{ background: '#111', fontFamily: 'Inter', fontSize: 12, color: '#333' }}>No entries yet</div>
          ) : (
            <div className="space-y-2">
              {filteredContent.map(c => {
                const color = CAT_COLORS[c.category] || '#6b7280'
                return (
                  <div
                    key={c.id}
                    style={{ background: '#111111', borderLeft: `3px solid ${color}` }}
                    className="p-4 group transition-all hover:bg-[#161616] cursor-default"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span style={{ background: color, fontFamily: 'Inter', fontSize: 10, fontWeight: 600, color: 'white', padding: '2px 8px', borderRadius: 9999 }}>
                            {c.category}
                          </span>
                        </div>
                        <div style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 4 }}>
                          {c.title}
                        </div>
                        {c.takeaway && (
                          <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#aaaaaa', fontStyle: 'italic' }}>
                            {c.takeaway}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#444' }}>{fmtShort(c.date)}</span>
                        <button onClick={() => deleteContent(c.id)} className="text-[#333] hover:text-[#dc2626] opacity-0 group-hover:opacity-100 transition-all">
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Trophy Wall */}
        {trophies.length > 0 && (
          <section>
            <div className="mb-4">
              <SectionHeader>Trophy Wall</SectionHeader>
            </div>

            {/* Top 3 — big cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {trophies.slice(0, 3).map((t, i) => {
                const ts = TROPHY_STYLES[i]
                return (
                  <div
                    key={t.name}
                    style={{ background: ts.bg, border: `1px solid ${ts.border}`, boxShadow: ts.shadow }}
                    className="p-5 relative overflow-hidden"
                  >
                    {/* Shine overlay */}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 60%)', pointerEvents: 'none' }} />
                    <div className="text-4xl mb-2">{ts.medal}</div>
                    <div className="font-display" style={{ fontSize: 18, color: ts.numColor }}>{t.icon} {t.name}</div>
                    <div className="font-display" style={{ fontSize: 72, color: ts.numColor, lineHeight: 1 }}>{t.best}</div>
                    <div style={{ fontFamily: 'Inter', fontSize: 10, color: '#888', marginTop: 4 }}>ALL-TIME RECORD</div>
                  </div>
                )
              })}
            </div>

            {/* Rest — smaller grid */}
            {trophies.length > 3 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {trophies.slice(3).map(t => (
                  <div key={t.name} style={{ background: '#111111', border: '1px solid #222222' }} className="p-4">
                    <div className="text-2xl mb-1">🏆</div>
                    <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#888' }}>{t.icon} {t.name}</div>
                    <div className="font-display" style={{ fontSize: 48, color: 'white', lineHeight: 1 }}>{t.best}</div>
                    <div style={{ fontFamily: 'Inter', fontSize: 10, color: '#555', marginTop: 2 }}>ALL-TIME RECORD</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {showHabitModal && (
        <Modal title={editHabit ? 'Edit Habit' : 'New Habit'} onClose={() => { setShowHabitModal(false); setEditHabit(null) }}>
          <div className="space-y-4">
            <div className="grid grid-cols-[72px_1fr] gap-3">
              <div><label className={cls.label}>Icon</label><input value={habitForm.icon} onChange={e => setHabitForm({ ...habitForm, icon: e.target.value })} className={cls.input + " text-center text-xl"} maxLength={2} /></div>
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
              <button onClick={saveHabit} className="flex-1 py-2.5 bg-[#dc2626] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 transition-colors">Save</button>
              <button onClick={() => { setShowHabitModal(false); setEditHabit(null) }} className="px-4 py-2.5 border border-[#2a2a2a] text-[#444] text-[10px] uppercase tracking-widest hover:border-[#666] transition-colors">Cancel</button>
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
            <div><label className={cls.label}>Key Takeaway</label><textarea value={contentForm.takeaway} onChange={e => setContentForm({ ...contentForm, takeaway: e.target.value })} rows={3} placeholder="Main lesson..." className={cls.input + " resize-none"} /></div>
            <div className="flex gap-2 pt-1">
              <button onClick={addContent} className="flex-1 py-2.5 bg-[#dc2626] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 transition-colors">Save</button>
              <button onClick={() => setShowContentModal(false)} className="px-4 py-2.5 border border-[#2a2a2a] text-[#444] text-[10px] uppercase tracking-widest hover:border-[#666] transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
