import { useState } from 'react'
import { Plus, Pencil, X } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { calcStreak, today, fmtShort, daysSinceStart } from '../utils'

const CARD = { background: '#111018', border: '1px solid #1e1b2e', borderRadius: 12, padding: 20 }
const CONTENT_CATS = ['All', 'Sales', 'Psychology', 'Business', 'Theology', 'Fitness', 'Relationships', 'Door-to-Door', 'Other']
const CAT_COLORS = {
  Sales: '#3b82f6', Psychology: '#8b5cf6', Business: '#f59e0b', Theology: '#10b981',
  Fitness: '#ef4444', Relationships: '#ec4899', 'Door-to-Door': '#f97316', Other: '#6b7280',
}

const cls = {
  input: "w-full bg-[#0a0a0f] border border-[#1e1b2e] px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#7c3aed] transition-colors rounded-lg",
  label: "block text-[9px] font-mono uppercase tracking-widest text-[#555] mb-1.5",
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

  const habitStats = habits.map((h, i) => {
    const s = calcStreak(h.logs)
    return { ...h, best: s.longest, current: s.current, streak: s }
  })

  const topHabits = [...habitStats].sort((a, b) => b.best - a.best).filter(h => h.best > 0)
  const longestEver = topHabits[0]?.best || 0
  const activeStreaks = habits.filter(h => calcStreak(h.logs).current > 0).length
  const perfectDays = habits.length === 0 ? 0 : (() => {
    const days = [...new Set(habits.flatMap(h => h.logs.filter(d => d >= thisMonthStart)))]
    return days.filter(d => habits.every(h => h.logs.includes(d))).length
  })()

  const streakChartData = habitStats.map(h => ({
    name: (h.icon ? `${h.icon} ` : '') + h.name.substring(0, 8),
    Record: h.best,
    Current: h.current,
  }))

  const LABEL = { fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }
  const BUBBLE_COLORS = ['#7c3aed', '#8b5cf6', '#6d28d9', '#a78bfa', '#4c1d95']

  return (
    <div className="h-full flex flex-col" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <div className="px-6 py-4 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid #1e1b2e' }}>
        <div>
          <h1 style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: 700, color: 'white', letterSpacing: '0.06em' }}>THE RECORD</h1>
          <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#6b7280', marginTop: 2 }}>{dayName}, {dateLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            LIVE · LOCAL SAVE
          </div>
          <button
            onClick={() => { setHabitForm({ name: '', icon: '🎯', category: 'Health', target: 'Daily' }); setEditHabit(null); setShowHabitModal(true) }}
            style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={12} /> Add Habit
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* 3-Panel Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Panel 1: Streak Overview */}
          <div style={CARD}>
            <div style={LABEL}>Streak Overview</div>
            {habits.length === 0 ? (
              <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#333', textAlign: 'center', padding: '32px 0' }}>Add habits to see chart</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={streakChartData} barGap={2} barCategoryGap="35%">
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} width={20} />
                  <Tooltip
                    contentStyle={{ background: '#111018', border: '1px solid #1e1b2e', borderRadius: 8, fontFamily: 'Inter', fontSize: 11 }}
                    labelStyle={{ color: '#8b5cf6' }} itemStyle={{ color: '#fff' }}
                    cursor={{ fill: 'rgba(124,58,237,0.05)' }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10, fontFamily: 'Inter', color: '#6b7280' }} />
                  <Bar dataKey="Record" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Current" fill="#22c55e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Panel 2: All-Time Records */}
          <div style={CARD}>
            <div style={LABEL}>All-Time Records</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'center', minHeight: 140 }}>
              {topHabits.length === 0 ? (
                <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#333', textAlign: 'center' }}>No records yet</div>
              ) : topHabits.slice(0, 5).map((h, i) => {
                const sizes = [76, 66, 58, 50, 44]
                const sz = sizes[i] || 44
                const col = BUBBLE_COLORS[i]
                return (
                  <div key={h.id} style={{
                    width: sz, height: sz, borderRadius: '50%',
                    border: `2px solid ${col}`,
                    background: `${col}22`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <div style={{ fontFamily: 'Inter', fontSize: sz > 58 ? 18 : sz > 48 ? 14 : 12, fontWeight: 800, color: 'white', lineHeight: 1 }}>{h.best}</div>
                    <div style={{ fontFamily: 'Inter', fontSize: 7, color: '#6b7280', textAlign: 'center', padding: '1px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: sz - 8 }}>{h.name}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Panel 3: Today's Status */}
          <div style={CARD}>
            <div style={LABEL}>Today's Status</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {habits.length === 0 ? (
                <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#333' }}>No habits yet</div>
              ) : habits.slice(0, 5).map(h => {
                const done = h.logs.includes(todayStr)
                const failed = (h.fails || []).includes(todayStr)
                const barColor = done ? '#22c55e' : failed ? '#ef4444' : '#7c3aed'
                return (
                  <div key={h.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Inter', fontSize: 12, color: done ? 'white' : '#6b7280', marginBottom: 5 }}>
                      <span>{h.icon} {h.name}</span>
                      <span style={{ color: done ? '#22c55e' : failed ? '#ef4444' : '#555', fontSize: 11, fontWeight: 700 }}>
                        {done ? '✓' : failed ? '✗' : '—'}
                      </span>
                    </div>
                    <div style={{ height: 4, background: '#1e1b2e', borderRadius: 2 }}>
                      <div style={{ width: done ? '100%' : '0%', height: 4, background: barColor, borderRadius: 2, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 18, paddingTop: 14, borderTop: '1px solid #1e1b2e' }}>
              {[
                { label: 'Active', value: activeStreaks },
                { label: 'Longest', value: `${longestEver}d` },
                { label: 'Perfect Mo', value: perfectDays },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: 800, color: 'white', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontFamily: 'Inter', fontSize: 10, color: '#6b7280', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Streak Table */}
        {habits.length > 0 && (
          <div style={CARD}>
            <div style={LABEL}>Streak Table</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e1b2e' }}>
                    {['HABIT', 'STREAK', 'PROGRESS VS BEST', 'BEST EVER', 'STATUS', 'ACTIONS'].map(h => (
                      <th key={h} style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left', padding: '0 12px 10px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {habits.map(h => {
                    const streak = calcStreak(h.logs)
                    const pctVal = streak.longest > 0 ? Math.min(100, Math.round((streak.current / streak.longest) * 100)) : 0
                    const done = h.logs.includes(todayStr)
                    const failed = (h.fails || []).includes(todayStr)
                    return (
                      <tr key={h.id} style={{ borderBottom: '1px solid #1e1b2e' }}>
                        <td style={{ padding: '11px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Inter', fontSize: 13, color: 'white' }}>
                            <span>{h.icon}</span>
                            <span>{h.name}</span>
                            <button
                              onClick={() => { setHabitForm({ name: h.name, icon: h.icon || '🎯', category: h.category || 'Health', target: h.target || 'Daily' }); setEditHabit(h); setShowHabitModal(true) }}
                              style={{ color: '#444', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                            ><Pencil size={10} /></button>
                          </div>
                        </td>
                        <td style={{ padding: '11px 12px' }}>
                          <span style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: 800, color: streak.current > 0 ? '#8b5cf6' : '#444', lineHeight: 1 }}>{streak.current}</span>
                        </td>
                        <td style={{ padding: '11px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 80, height: 4, background: '#1e1b2e', borderRadius: 2, flexShrink: 0 }}>
                              <div style={{ width: `${pctVal}%`, height: 4, background: '#7c3aed', borderRadius: 2 }} />
                            </div>
                            <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#6b7280' }}>{pctVal}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '11px 12px', fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: '#8b5cf6' }}>{streak.longest}</td>
                        <td style={{ padding: '11px 12px' }}>
                          <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, color: done ? '#22c55e' : failed ? '#ef4444' : '#6b7280' }}>
                            {done ? '✓ Done' : failed ? '✗ Failed' : '⏳ Pending'}
                          </span>
                        </td>
                        <td style={{ padding: '11px 12px' }}>
                          {done || failed ? (
                            <button
                              onClick={() => undoHabit(h.id)}
                              style={{ fontFamily: 'Inter', fontSize: 11, color: '#6b7280', border: '1px solid #1e1b2e', borderRadius: 6, padding: '4px 10px', background: 'transparent', cursor: 'pointer' }}
                            >Undo</button>
                          ) : (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => logHabit(h.id)}
                                style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, color: 'white', background: '#16a34a', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                              >Done</button>
                              <button
                                onClick={() => failHabit(h.id)}
                                style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, color: '#ef4444', background: 'transparent', border: '1px solid #ef4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                              >Fail</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Content Library */}
        <div style={CARD}>
          <div className="flex items-center justify-between mb-4">
            <div style={LABEL}>Content Library</div>
            <div className="flex items-center gap-3">
              <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#6b7280' }}>
                <span style={{ color: '#8b5cf6' }}>{content.length}</span> total · <span style={{ color: '#8b5cf6' }}>{content.filter(c => c.date >= thisWeekStart).length}</span> this week
              </div>
              <button
                onClick={() => setShowContentModal(true)}
                style={{ background: 'transparent', color: '#7c3aed', border: '1px solid #7c3aed', borderRadius: 8, padding: '4px 12px', fontFamily: 'Inter', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Plus size={11} /> Add Entry
              </button>
            </div>
          </div>

          <div className="flex gap-1.5 flex-wrap mb-4">
            {CONTENT_CATS.map(cat => {
              const isActive = contentCat === cat
              const color = cat === 'All' ? '#7c3aed' : (CAT_COLORS[cat] || '#6b7280')
              return (
                <button
                  key={cat}
                  onClick={() => setContentCat(cat)}
                  style={{
                    background: isActive ? color : '#1e1b2e',
                    color: isActive ? 'white' : '#6b7280',
                    fontFamily: 'Inter', fontSize: 11, fontWeight: isActive ? 600 : 400,
                    padding: '4px 12px', borderRadius: 9999, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {cat}
                </button>
              )
            })}
          </div>

          {filteredContent.length === 0 ? (
            <div style={{ background: '#0a0a0f', borderRadius: 8, padding: '28px', textAlign: 'center', fontFamily: 'Inter', fontSize: 12, color: '#333' }}>
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
                      background: '#0a0a0f', borderRadius: 10, borderLeft: `3px solid ${color}`,
                      padding: '12px 14px', marginBottom: 10, breakInside: 'avoid',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 12px ${color}26` }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ background: color, fontFamily: 'Inter', fontSize: 10, fontWeight: 700, color: 'white', padding: '2px 8px', borderRadius: 9999 }}>
                        {c.category}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#444' }}>{fmtShort(c.date)}</span>
                        <button onClick={() => deleteContent(c.id)} style={{ color: '#333', background: 'none', border: 'none', cursor: 'pointer', opacity: 0 }} className="group-hover:opacity-100 hover:text-red-400 transition-all">
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                    <div className="line-clamp-2" style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 4 }}>{c.title}</div>
                    {c.takeaway && (
                      <div className="line-clamp-3" style={{ fontFamily: 'Inter', fontSize: 12, color: '#888', fontStyle: 'italic' }}>{c.takeaway}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
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
              <button onClick={saveHabit} style={{ background: '#7c3aed', color: 'white', borderRadius: 8 }} className="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">Save</button>
              <button onClick={() => { setShowHabitModal(false); setEditHabit(null) }} style={{ border: '1px solid #1e1b2e', color: '#555', borderRadius: 8 }} className="px-4 py-2.5 text-[10px] uppercase tracking-widest hover:border-[#444] transition-colors">Cancel</button>
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
              <button onClick={addContent} style={{ background: '#7c3aed', color: 'white', borderRadius: 8 }} className="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">Save</button>
              <button onClick={() => setShowContentModal(false)} style={{ border: '1px solid #1e1b2e', color: '#555', borderRadius: 8 }} className="px-4 py-2.5 text-[10px] uppercase tracking-widest hover:border-[#444] transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
