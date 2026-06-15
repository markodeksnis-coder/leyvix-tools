import { useState } from 'react'
import { Plus, ChevronDown, ChevronUp, Pencil, Trophy, X } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Heatmap from '../components/Heatmap'
import Modal from '../components/Modal'
import { calcStreak, today, fmtShort, daysSinceStart } from '../utils'

const CONTENT_CATS = ['All','Sales','Psychology','Business','Theology','Fitness','Relationships','Door-to-Door','Other']

const cls = {
  input: "w-full bg-[#080808] border border-[#2a2a2a] px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#dc2626] transition-colors",
  label: "block text-[9px] font-mono uppercase tracking-widest text-[#444] mb-1.5",
}

export default function Record() {
  const [habits, setHabits] = useLocalStorage('marko_habits', [])
  const [content, setContent] = useLocalStorage('marko_content', [])
  const [contentCat, setContentCat] = useState('All')
  const [expandedHeatmaps, setExpandedHeatmaps] = useState({})
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
    return { name: h.name, best: s.longest }
  }).filter(t => t.best > 0).sort((a, b) => b.best - a.best)

  const thisWeekStart = (() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0]
  })()
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-5 border-b border-[#2a2a2a] shrink-0">
        <h1 className="text-xl font-bold uppercase tracking-tight">{dayName}, {dateLabel}</h1>
        <p className="text-[10px] font-mono text-[#dc2626] mt-0.5 uppercase tracking-widest">Day {dayNum} of the war.</p>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-10">

        {/* Streak Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#444]">Active Streaks</span>
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
              const numColor = streak.current === 0 ? '#dc2626' : isRecord ? '#facc15' : 'white'
              const borderCls = failedToday ? 'border-[#dc2626]/50' : isRecord ? 'border-[#facc15]/40' : 'border-[#2a2a2a]'
              const badge = failedToday ? '💀' : isRecord ? '👑' : streak.current > 7 ? '🔥' : ''
              const expanded = expandedHeatmaps[h.id]

              return (
                <div key={h.id} className={`bg-[#0f0f0f] border ${borderCls} p-4 transition-all hover:shadow-[0_0_12px_rgba(220,38,38,0.15)]`}>
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-[#444] leading-tight pr-1">{h.name}</span>
                    <button
                      onClick={() => { setHabitForm({ name: h.name, icon: h.icon || '🎯', category: h.category || 'Health', target: h.target || 'Daily' }); setEditHabit(h); setShowHabitModal(true) }}
                      className="text-[#222] hover:text-[#666] transition-colors shrink-0"
                    ><Pencil size={10} /></button>
                  </div>
                  <div className="flex items-end gap-1 my-1">
                    <span className="font-mono font-black select-none" style={{ fontSize: 64, color: numColor, lineHeight: 1 }}>{streak.current}</span>
                    {badge && <span className="text-xl mb-1 leading-none">{badge}</span>}
                  </div>
                  <div className="text-[9px] font-mono text-[#333] mb-3 space-y-0.5">
                    <div>BEST: <span className="text-[#555]">{streak.longest}d</span></div>
                    <div>WK: {streak.weekCount} · MO: {streak.monthCount}</div>
                  </div>
                  {doneToday || failedToday ? (
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-mono uppercase tracking-widest ${doneToday ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                        {doneToday ? '✓ DONE' : '✗ FAILED'}
                      </span>
                      <button onClick={() => undoHabit(h.id)} className="text-[9px] font-mono text-[#333] hover:text-[#666] uppercase tracking-widest transition-colors">UNDO</button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <button onClick={() => logHabit(h.id)} className="flex-1 py-1.5 bg-[#16a34a]/20 border border-[#16a34a]/30 text-[#16a34a] text-[8px] font-mono uppercase tracking-widest hover:bg-[#16a34a]/30 transition-colors">✓ Done</button>
                      <button onClick={() => failHabit(h.id)} className="flex-1 py-1.5 border border-red-900/40 text-red-700 text-[8px] font-mono uppercase tracking-widest hover:border-[#dc2626] hover:text-[#dc2626] transition-colors">✗ Fail</button>
                    </div>
                  )}
                  <button
                    onClick={() => setExpandedHeatmaps(p => ({ ...p, [h.id]: !p[h.id] }))}
                    className="w-full flex items-center justify-center gap-1 text-[8px] font-mono text-[#222] hover:text-[#444] uppercase tracking-widest transition-colors mt-2 pt-2 border-t border-[#141414]"
                  >
                    {expanded ? <ChevronUp size={9} /> : <ChevronDown size={9} />} Heatmap
                  </button>
                  {expanded && (
                    <div className="mt-3 overflow-x-auto">
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
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#444]">Content Library</span>
            <button onClick={() => setShowContentModal(true)} className="flex items-center gap-1 px-3 py-1.5 border border-[#2a2a2a] text-[#444] text-[9px] uppercase tracking-widest hover:border-[#dc2626] hover:text-white transition-colors">
              <Plus size={9} /> Add Entry
            </button>
          </div>
          <div className="flex gap-4 mb-3 text-[9px] font-mono text-[#333] uppercase tracking-widest flex-wrap">
            <span>Total: <span className="text-[#666]">{content.length}</span></span>
            <span>This week: <span className="text-[#666]">{content.filter(c => c.date >= thisWeekStart).length}</span></span>
            <span>This month: <span className="text-[#666]">{content.filter(c => c.date >= thisMonthStart).length}</span></span>
          </div>
          <div className="flex gap-1 overflow-x-auto mb-3 pb-1">
            {CONTENT_CATS.map(cat => (
              <button key={cat} onClick={() => setContentCat(cat)}
                className={`px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest whitespace-nowrap shrink-0 transition-all ${
                  contentCat === cat ? 'bg-[#dc2626] text-white' : 'border border-[#2a2a2a] text-[#444] hover:border-[#dc2626] hover:text-white'
                }`}>
                {cat}
              </button>
            ))}
          </div>
          {filteredContent.length === 0 ? (
            <div className="bg-[#0f0f0f] border border-[#2a2a2a] p-8 text-center text-[#333] text-[10px] font-mono uppercase tracking-widest">No entries yet</div>
          ) : (
            <div className="bg-[#0f0f0f] border border-[#2a2a2a]">
              <div className="grid grid-cols-[90px_110px_1fr_1fr_28px] gap-3 px-4 py-2 border-b border-[#2a2a2a] text-[8px] font-mono uppercase tracking-widest text-[#333]">
                <span>Date</span><span>Category</span><span>Title</span><span>Takeaway</span><span></span>
              </div>
              {filteredContent.map(c => (
                <div key={c.id} className="grid grid-cols-[90px_110px_1fr_1fr_28px] gap-3 px-4 py-3 border-b border-[#141414] hover:bg-[#141414] transition-colors items-start group">
                  <span className="text-[9px] font-mono text-[#333]">{fmtShort(c.date)}</span>
                  <span className="text-[9px] font-mono text-[#dc2626] uppercase tracking-widest">{c.category}</span>
                  <span className="text-sm text-[#999] font-medium">{c.title}</span>
                  <span className="text-xs text-[#555] leading-relaxed">{c.takeaway}</span>
                  <button onClick={() => deleteContent(c.id)} className="text-[#222] hover:text-[#dc2626] opacity-0 group-hover:opacity-100 transition-all mt-0.5"><X size={11} /></button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Trophy Wall */}
        {trophies.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={12} className="text-[#facc15]" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#444]">Trophy Wall</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {trophies.map(t => (
                <div key={t.name} className="bg-[#0f0f0f] border border-[#facc15]/20 p-4 hover:border-[#facc15]/50 transition-colors">
                  <div className="text-[9px] font-mono uppercase tracking-widest text-[#444] mb-1">{t.name}</div>
                  <div className="text-4xl font-mono font-black text-[#facc15]">{t.best}</div>
                  <div className="text-[9px] font-mono text-[#333] mt-1">day best streak</div>
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
              <div><label className={cls.label}>Icon</label><input value={habitForm.icon} onChange={e => setHabitForm({ ...habitForm, icon: e.target.value })} className={cls.input + " text-center text-xl"} maxLength={2} /></div>
              <div><label className={cls.label}>Habit Name</label><input value={habitForm.name} onChange={e => setHabitForm({ ...habitForm, name: e.target.value })} onKeyDown={e => e.key === 'Enter' && saveHabit()} autoFocus placeholder="e.g. Cold Shower" className={cls.input} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={cls.label}>Category</label>
                <select value={habitForm.category} onChange={e => setHabitForm({ ...habitForm, category: e.target.value })} className={cls.input}>
                  {['Health','Fitness','Business','Mind','Soul','Other'].map(c => <option key={c}>{c}</option>)}
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
                  {['Sales','Psychology','Business','Theology','Fitness','Relationships','Door-to-Door','Other'].map(c => <option key={c}>{c}</option>)}
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
