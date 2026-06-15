import { useState } from 'react'
import { Plus, Trophy, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Heatmap from '../components/Heatmap'
import Modal from '../components/Modal'
import { calcStreak, today, fmtShort, daysAgoLabel } from '../utils'

const CONTENT_CATEGORIES = ['All', 'Sales', 'Psychology', 'Business', 'Theology', 'Fitness', 'Relationships', 'Door-to-Door', 'Other']

const cls = {
  input: "w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#555] transition-colors",
  label: "block text-[10px] font-mono uppercase tracking-widest text-[#555] mb-1.5",
  primary: "flex-1 py-2.5 bg-[#facc15] text-black text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-300 transition-colors",
  secondary: "px-4 py-2.5 border border-[#2a2a2a] text-[#666] text-[10px] uppercase tracking-widest hover:border-[#555] hover:text-neutral-300 transition-colors",
}

export default function Record() {
  const [habits, setHabits] = useLocalStorage('marko_habits', [])
  const [content, setContent] = useLocalStorage('marko_content', [])
  const [contentCat, setContentCat] = useState('All')
  const [contentModal, setContentModal] = useState(false)
  const [contentForm, setContentForm] = useState({ title: '', category: 'Sales', date: today(), takeaway: '' })
  const [expandedHeatmaps, setExpandedHeatmaps] = useState({})

  const todayStr = today()

  const logHabit = (id) => {
    setHabits(habits.map(h => {
      if (h.id !== id) return h
      const logs = h.logs.includes(todayStr) ? h.logs : [...h.logs, todayStr]
      const fails = h.fails.filter(f => f !== todayStr)
      return { ...h, logs, fails }
    }))
  }

  const failHabit = (id) => {
    setHabits(habits.map(h => {
      if (h.id !== id) return h
      const fails = h.fails.includes(todayStr) ? h.fails : [...h.fails, todayStr]
      const logs = h.logs.filter(l => l !== todayStr)
      return { ...h, logs, fails }
    }))
  }

  const undoHabit = (id) => {
    setHabits(habits.map(h => {
      if (h.id !== id) return h
      return { ...h, logs: h.logs.filter(l => l !== todayStr), fails: h.fails.filter(f => f !== todayStr) }
    }))
  }

  const addContent = () => {
    if (!contentForm.title.trim()) return
    setContent([{ ...contentForm, id: Date.now() }, ...content])
    setContentForm({ title: '', category: 'Sales', date: today(), takeaway: '' })
    setContentModal(false)
  }

  const filteredContent = contentCat === 'All' ? content : content.filter(c => c.category === contentCat)

  const catCounts = CONTENT_CATEGORIES.slice(1).reduce((acc, c) => {
    acc[c] = content.filter(e => e.category === c).length
    return acc
  }, {})

  // Trophies
  const trophies = buildTrophies(habits, content)

  return (
    <div className="h-full flex flex-col overflow-auto">
      <div className="px-8 py-6 border-b border-[#1f1f1f] shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase">The Record</h1>
            <p className="text-[10px] font-mono text-[#555] mt-0.5 uppercase tracking-widest">Every day. No exceptions.</p>
          </div>
          <div className="text-[10px] font-mono text-[#333] uppercase tracking-widest">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-10">
        {/* ── Active Streaks ── */}
        <section>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#555] mb-4">Active Streaks</div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {habits.map(habit => {
              const s = calcStreak(habit.logs)
              const isLoggedToday = habit.logs.includes(todayStr)
              const isFailedToday = habit.fails.includes(todayStr)
              const isRecord = s.current > 0 && s.current === s.longest
              const isBroken = isFailedToday || (!isLoggedToday && !isFailedToday && s.lastBroken === todayStr)

              let borderCls = 'border-[#1f1f1f]'
              if (isRecord && isLoggedToday) borderCls = 'border-[#facc15]/60'
              else if (isLoggedToday) borderCls = 'border-green-800/50'
              else if (isBroken || isFailedToday) borderCls = 'border-red-900/50'

              return (
                <div key={habit.id} className={`bg-[#111] border p-4 flex flex-col gap-3 ${borderCls}`}>
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#666]">{habit.name}</span>
                    {isRecord && isLoggedToday && (
                      <span className="text-[8px] font-mono uppercase tracking-widest text-[#facc15] border border-[#facc15]/30 px-1 py-0.5">RECORD</span>
                    )}
                  </div>

                  <div>
                    <div className={`text-5xl font-mono font-black leading-none ${
                      isRecord && isLoggedToday ? 'text-[#facc15]' :
                      isLoggedToday ? 'text-green-400' :
                      isFailedToday ? 'text-red-500' : 'text-white'
                    }`}>
                      {s.current}
                    </div>
                    <div className="text-[9px] font-mono text-[#444] mt-0.5 uppercase tracking-widest">day streak</div>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[9px] font-mono">
                    <div><span className="text-[#444]">Best: </span><span className="text-[#888]">{s.longest}</span></div>
                    <div><span className="text-[#444]">Week: </span><span className="text-[#888]">{s.weekCount}</span></div>
                    <div><span className="text-[#444]">Broke: </span><span className="text-[#888]">{s.lastBroken ? fmtShort(s.lastBroken) : 'Never'}</span></div>
                    <div><span className="text-[#444]">Month: </span><span className="text-[#888]">{s.monthCount}</span></div>
                  </div>

                  <div className="flex gap-1.5 mt-auto">
                    {isLoggedToday ? (
                      <>
                        <div className="flex-1 py-1.5 text-center text-[9px] font-mono uppercase tracking-widest text-green-600 border border-green-900/50">✓ Done</div>
                        <button onClick={() => undoHabit(habit.id)} className="px-2 py-1.5 text-[9px] font-mono uppercase text-[#555] border border-[#222] hover:text-[#888] transition-colors">Undo</button>
                      </>
                    ) : isFailedToday ? (
                      <>
                        <div className="flex-1 py-1.5 text-center text-[9px] font-mono uppercase tracking-widest text-red-700 border border-red-900/50">✗ Failed</div>
                        <button onClick={() => undoHabit(habit.id)} className="px-2 py-1.5 text-[9px] font-mono uppercase text-[#555] border border-[#222] hover:text-[#888] transition-colors">Undo</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => logHabit(habit.id)} className="flex-1 py-1.5 bg-[#facc15] text-black text-[9px] font-bold uppercase tracking-widest hover:bg-yellow-300 transition-colors">
                          Log Today
                        </button>
                        <button onClick={() => failHabit(habit.id)} className="px-2.5 py-1.5 border border-red-900/50 text-red-700 text-[9px] font-mono uppercase hover:border-red-700 transition-colors">
                          Failed
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Heatmaps ── */}
        <section>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#555] mb-4">365-Day Heatmaps</div>
          <div className="space-y-3">
            {habits.map(habit => {
              const isOpen = expandedHeatmaps[habit.id] !== false // default open
              return (
                <div key={habit.id} className="bg-[#111] border border-[#1f1f1f]">
                  <button
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#141414] transition-colors"
                    onClick={() => setExpandedHeatmaps(p => ({ ...p, [habit.id]: !isOpen }))}
                  >
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#666]">{habit.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-mono text-[#444]">{habit.logs.length} days logged</span>
                      {isOpen ? <ChevronUp size={11} className="text-[#444]" /> : <ChevronDown size={11} className="text-[#444]" />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3">
                      <Heatmap logs={habit.logs} fails={habit.fails} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Content Library ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#555]">Content Library</span>
              <span className="ml-3 text-[9px] font-mono text-[#444]">{content.length} total entries</span>
            </div>
            <button
              onClick={() => setContentModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#facc15] text-black text-[9px] font-bold uppercase tracking-widest hover:bg-yellow-300 transition-colors"
            >
              <Plus size={10} strokeWidth={2.5} /> Add
            </button>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 overflow-x-auto mb-3">
            {CONTENT_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setContentCat(cat)}
                className={`px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest whitespace-nowrap transition-all shrink-0 ${
                  contentCat === cat
                    ? 'bg-[#facc15] text-black font-bold'
                    : 'text-[#555] border border-transparent hover:border-[#2a2a2a] hover:text-neutral-300'
                }`}
              >
                {cat}{cat !== 'All' && catCounts[cat] > 0 ? ` (${catCounts[cat]})` : ''}
              </button>
            ))}
          </div>

          {filteredContent.length === 0 ? (
            <div className="bg-[#111] border border-[#1f1f1f] p-8 text-center text-[#444] text-xs font-mono">
              No entries in this category yet
            </div>
          ) : (
            <div className="space-y-1">
              {filteredContent.map(entry => (
                <div key={entry.id} className="bg-[#111] border border-[#1f1f1f] px-4 py-3 flex items-start justify-between gap-4 hover:border-[#2a2a2a] transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[8px] font-mono uppercase tracking-widest text-[#facc15] border border-[#facc15]/20 px-1.5 py-0.5 shrink-0">{entry.category}</span>
                      <span className="text-sm font-medium text-neutral-100 truncate">{entry.title}</span>
                    </div>
                    <p className="text-xs text-[#666] leading-relaxed">{entry.takeaway}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-mono text-[#444]">{entry.date}</span>
                    <button
                      onClick={() => setContent(content.filter(c => c.id !== entry.id))}
                      className="text-[#333] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Trophy Wall ── */}
        <section>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#555] mb-4">Trophy Wall</div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {trophies.map((t, i) => (
              <div key={i} className="bg-[#111] border border-[#1f1f1f] p-4">
                <div className="text-xl mb-2">{t.icon}</div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-[#555] mb-1">{t.label}</div>
                <div className="text-2xl font-mono font-black text-[#facc15]">{t.value}</div>
                {t.sub && <div className="text-[9px] font-mono text-[#444] mt-0.5">{t.sub}</div>}
              </div>
            ))}
          </div>
        </section>
      </div>

      {contentModal && (
        <Modal title="Add to Content Library" onClose={() => setContentModal(false)}>
          <div className="space-y-4">
            <div>
              <label className={cls.label}>Title / Source</label>
              <input value={contentForm.title} onChange={e => setContentForm({ ...contentForm, title: e.target.value })} placeholder="Book, video, article, conversation..." className={cls.input} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={cls.label}>Category</label>
                <select value={contentForm.category} onChange={e => setContentForm({ ...contentForm, category: e.target.value })} className={cls.input}>
                  {CONTENT_CATEGORIES.slice(1).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={cls.label}>Date</label>
                <input type="date" value={contentForm.date} onChange={e => setContentForm({ ...contentForm, date: e.target.value })} className={cls.input} />
              </div>
            </div>
            <div>
              <label className={cls.label}>Key Takeaway</label>
              <textarea value={contentForm.takeaway} onChange={e => setContentForm({ ...contentForm, takeaway: e.target.value })} placeholder="The one thing you'll remember in 5 years..." rows={3} className={cls.input + " resize-none"} />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={addContent} className={cls.primary}>Save</button>
              <button onClick={() => setContentModal(false)} className={cls.secondary}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function buildTrophies(habits, content) {
  const trophies = []
  habits.forEach(h => {
    const { longest } = calcStreak(h.logs)
    if (longest > 0) {
      trophies.push({ icon: '🏆', label: `Longest ${h.name}`, value: `${longest}d`, sub: 'all-time record' })
    }
  })
  if (content.length > 0) {
    const now = new Date()
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7)
    const weekStr = weekAgo.toISOString().split('T')[0]
    const weekCount = content.filter(c => c.date >= weekStr).length
    if (weekCount > 0) trophies.push({ icon: '📚', label: 'Content This Week', value: weekCount, sub: 'entries consumed' })
    trophies.push({ icon: '🧠', label: 'Total Knowledge', value: content.length, sub: 'entries logged' })
  }
  return trophies.slice(0, 8)
}
