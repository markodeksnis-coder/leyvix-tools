import { useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { fmtShort } from '../utils'

const STATUSES = ['Lead','Appointment Set','No Show','Closed','Lost']
const STATUS_COLORS = {
  Lead: 'text-[#888] border-[#444]/30',
  'Appointment Set': 'text-blue-400 border-blue-400/30',
  'No Show': 'text-orange-400 border-orange-400/30',
  Closed: 'text-[#16a34a] border-[#16a34a]/30',
  Lost: 'text-[#dc2626] border-[#dc2626]/30',
}
const LESSON_CATS = ['Sales Call','Outreach','Client','Strategy','Other']
const CHART_TT = { contentStyle: { background: '#141414', border: '1px solid #2a2a2a', borderRadius: 0, fontSize: 11, fontFamily: 'monospace' }, labelStyle: { color: '#444' }, itemStyle: { color: '#fff' } }

const cls = {
  input: "w-full bg-[#080808] border border-[#2a2a2a] px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#dc2626] transition-colors",
  label: "block text-[9px] font-mono uppercase tracking-widest text-[#444] mb-1.5",
}

export default function Business() {
  const [data, setData] = useLocalStorage('marko_business', { deals: [], lessons: [], revenueHistory: [] })
  const [showDealModal, setShowDealModal] = useState(false)
  const [showLessonModal, setShowLessonModal] = useState(false)
  const [lessonSearch, setLessonSearch] = useState('')
  const [df, setDf] = useState({ prospect: '', status: 'Lead', value: '' })
  const [lf, setLf] = useState({ title: '', what: '', learned: '', category: 'Sales Call' })

  const deals = data.deals || []
  const lessons = data.lessons || []
  const revenueHistory = data.revenueHistory || []

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthRevenue = revenueHistory.filter(r => r.date >= monthStart).reduce((s, r) => s + (r.amount || 0), 0)
  const gap = Math.max(0, 10000 - monthRevenue)
  const openDeals = deals.filter(d => !['Closed', 'Lost'].includes(d.status))
  const pipeline = openDeals.reduce((s, d) => s + (parseFloat(d.value) || 0), 0)
  const closedDeals = deals.filter(d => ['Closed', 'Lost'].includes(d.status))
  const wonDeals = deals.filter(d => d.status === 'Closed')
  const closeRate = closedDeals.length > 0 ? Math.round((wonDeals.length / closedDeals.length) * 100) : 0
  const appointments = deals.filter(d => d.status !== 'Lead')
  const showed = deals.filter(d => ['Showed', 'Closed', 'Lost'].includes(d.status) || d.status === 'Closed')
  const showRate = appointments.length > 0 ? Math.round((showed.length / appointments.length) * 100) : 0

  const revenueColor = monthRevenue >= 10000 ? '#facc15' : monthRevenue >= 5000 ? 'white' : '#dc2626'

  const chart30 = (() => {
    const acc = []
    let running = 0
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      running += revenueHistory.filter(r => r.date === ds).reduce((s, r) => s + (r.amount || 0), 0)
      acc.push({ date: ds.slice(5), revenue: running })
    }
    return acc
  })()

  const addDeal = () => {
    if (!df.prospect.trim()) return
    const today = new Date().toISOString().split('T')[0]
    const newDeal = { ...df, id: Date.now(), date: today, value: parseFloat(df.value) || 0 }
    setData(d => ({ ...d, deals: [newDeal, ...deals] }))
    setDf({ prospect: '', status: 'Lead', value: '' })
    setShowDealModal(false)
  }

  const updateDealStatus = (id, status) => {
    const today = new Date().toISOString().split('T')[0]
    const deal = deals.find(d => d.id === id)
    const updatedDeals = deals.map(d => d.id === id ? { ...d, status } : d)
    let updatedHistory = [...revenueHistory]
    if (status === 'Closed' && deal) {
      updatedHistory = [...updatedHistory, { date: today, amount: parseFloat(deal.value) || 0 }]
    }
    setData(d => ({ ...d, deals: updatedDeals, revenueHistory: updatedHistory }))
  }

  const deleteDeal = id => setData(d => ({ ...d, deals: deals.filter(x => x.id !== id) }))

  const addLesson = () => {
    if (!lf.title.trim()) return
    const today = new Date().toISOString().split('T')[0]
    setData(d => ({ ...d, lessons: [{ ...lf, id: Date.now(), date: today }, ...(d.lessons || [])] }))
    setLf({ title: '', what: '', learned: '', category: 'Sales Call' })
    setShowLessonModal(false)
  }

  const deleteLesson = id => setData(d => ({ ...d, lessons: (d.lessons || []).filter(l => l.id !== id) }))

  const filteredLessons = lessons.filter(l => {
    const q = lessonSearch.toLowerCase()
    return !q || l.title?.toLowerCase().includes(q) || l.learned?.toLowerCase().includes(q) || l.what?.toLowerCase().includes(q)
  })

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-5 border-b border-[#2a2a2a] shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-tight">Business</h1>
          <p className="text-[10px] font-mono text-[#444] mt-0.5 uppercase tracking-widest">Revenue · Pipeline · Lessons</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowLessonModal(true)} className="px-3 py-1.5 border border-[#2a2a2a] text-[#444] text-[9px] uppercase tracking-widest hover:border-[#dc2626] hover:text-white transition-colors">+ Lesson</button>
          <button onClick={() => setShowDealModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-[#dc2626] text-white text-[9px] font-bold uppercase tracking-widest hover:bg-red-500 transition-colors">
            <Plus size={10} strokeWidth={2.5} /> Add Deal
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-8">
        {/* Big numbers row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-[#0f0f0f] border border-[#2a2a2a] p-4 md:col-span-1">
            <div className="text-[9px] font-mono uppercase tracking-widest text-[#444] mb-1">Revenue MTD</div>
            <div className="font-mono font-black" style={{ fontSize: 36, color: revenueColor, lineHeight: 1 }}>${monthRevenue.toLocaleString()}</div>
            <div className="text-[9px] font-mono text-[#333] mt-1">/ $10,000 goal</div>
            <div className="mt-2 h-0.5 bg-[#1a1a1a]">
              <div className="h-0.5 bg-[#dc2626] transition-all" style={{ width: `${Math.min(100, (monthRevenue / 10000) * 100)}%` }} />
            </div>
          </div>
          {[
            { label: 'Gap to $10k', value: gap === 0 ? 'DONE' : `$${gap.toLocaleString()}`, color: gap === 0 ? '#16a34a' : '#dc2626' },
            { label: 'Pipeline', value: `$${pipeline.toLocaleString()}`, sub: `${openDeals.length} deals` },
            { label: 'Close Rate', value: `${closeRate}%` },
            { label: 'Show Rate', value: `${showRate}%` },
          ].map(k => (
            <div key={k.label} className="bg-[#0f0f0f] border border-[#2a2a2a] p-4">
              <div className="text-[9px] font-mono uppercase tracking-widest text-[#444] mb-1">{k.label}</div>
              <div className="text-2xl font-mono font-black" style={{ color: k.color || 'white' }}>{k.value}</div>
              {k.sub && <div className="text-[9px] font-mono text-[#333] mt-1">{k.sub}</div>}
            </div>
          ))}
        </div>

        {/* Chart + Deals table */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-[#444] mb-3">30-Day Cumulative Revenue</div>
            <div className="bg-[#0f0f0f] border border-[#2a2a2a] p-4">
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={chart30}>
                  <XAxis dataKey="date" tick={{ fill: '#333', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} interval={6} />
                  <YAxis tick={{ fill: '#333', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={36} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip {...CHART_TT} formatter={v => [`$${v.toLocaleString()}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-[#444] mb-3">Active Deals</div>
            <div className="bg-[#0f0f0f] border border-[#2a2a2a]">
              {deals.length === 0 ? (
                <div className="p-6 text-center text-[#333] text-[10px] font-mono uppercase tracking-widest">No deals yet</div>
              ) : (
                <div className="divide-y divide-[#141414]">
                  {deals.slice(0, 8).map(d => (
                    <div key={d.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#141414] transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[#999] truncate">{d.prospect}</div>
                        <div className="text-[9px] font-mono text-[#333]">${parseFloat(d.value || 0).toLocaleString()} · {fmtShort(d.date)}</div>
                      </div>
                      <select
                        value={d.status}
                        onChange={e => updateDealStatus(d.id, e.target.value)}
                        className={`text-[9px] font-mono uppercase tracking-widest border px-2 py-1 bg-[#0f0f0f] focus:outline-none ${STATUS_COLORS[d.status] || 'text-[#666] border-[#333]'}`}
                      >
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                      <button onClick={() => deleteDeal(d.id)} className="text-[#222] hover:text-[#dc2626] opacity-0 group-hover:opacity-100 transition-all"><X size={11} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lessons Learned */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#444]">Lessons Learned</span>
          </div>
          <div className="relative mb-3">
            <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#333]" />
            <input value={lessonSearch} onChange={e => setLessonSearch(e.target.value)} placeholder="Search lessons..." className="w-full bg-[#141414] border border-[#2a2a2a] pl-8 pr-3 py-2 text-sm text-[#888] placeholder-[#333] focus:outline-none focus:border-[#dc2626]" />
          </div>
          {filteredLessons.length === 0 ? (
            <div className="bg-[#0f0f0f] border border-[#2a2a2a] p-6 text-center text-[#333] text-[10px] font-mono uppercase tracking-widest">No lessons logged yet</div>
          ) : (
            <div className="space-y-2">
              {filteredLessons.map(l => (
                <div key={l.id} className="bg-[#0f0f0f] border border-[#2a2a2a] p-4 hover:shadow-[0_0_12px_rgba(220,38,38,0.1)] transition-all group">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[8px] font-mono uppercase tracking-widest text-[#dc2626] mr-2">{l.category}</span>
                      <span className="text-[8px] font-mono text-[#333]">{fmtShort(l.date)}</span>
                    </div>
                    <button onClick={() => deleteLesson(l.id)} className="text-[#222] hover:text-[#dc2626] opacity-0 group-hover:opacity-100 transition-all shrink-0"><X size={11} /></button>
                  </div>
                  <div className="text-sm font-bold text-white mb-2">{l.title}</div>
                  {l.what && <p className="text-xs text-[#444] mb-1"><span className="text-[#333] font-mono uppercase tracking-widest text-[8px]">What happened: </span>{l.what}</p>}
                  {l.learned && <p className="text-xs text-[#666] border-l-2 border-[#dc2626]/40 pl-2 mt-2">{l.learned}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showDealModal && (
        <Modal title="Add Deal" onClose={() => setShowDealModal(false)}>
          <div className="space-y-4">
            <div><label className={cls.label}>Prospect Name</label><input value={df.prospect} onChange={e => setDf({ ...df, prospect: e.target.value })} autoFocus placeholder="Thompson Family" className={cls.input} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={cls.label}>Status</label>
                <select value={df.status} onChange={e => setDf({ ...df, status: e.target.value })} className={cls.input}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div><label className={cls.label}>Deal Value ($)</label><input type="number" value={df.value} onChange={e => setDf({ ...df, value: e.target.value })} placeholder="2500" className={cls.input} /></div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={addDeal} className="flex-1 py-2.5 bg-[#dc2626] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 transition-colors">Save</button>
              <button onClick={() => setShowDealModal(false)} className="px-4 py-2.5 border border-[#2a2a2a] text-[#444] text-[10px] uppercase tracking-widest hover:border-[#666] transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {showLessonModal && (
        <Modal title="Add Lesson" onClose={() => setShowLessonModal(false)}>
          <div className="space-y-4">
            <div><label className={cls.label}>Category</label>
              <select value={lf.category} onChange={e => setLf({ ...lf, category: e.target.value })} className={cls.input}>
                {LESSON_CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label className={cls.label}>Title</label><input value={lf.title} onChange={e => setLf({ ...lf, title: e.target.value })} autoFocus placeholder="What happened?" className={cls.input} /></div>
            <div><label className={cls.label}>Situation</label><textarea value={lf.what} onChange={e => setLf({ ...lf, what: e.target.value })} rows={2} placeholder="What actually happened..." className={cls.input + " resize-none"} /></div>
            <div><label className={cls.label}>What You Learned</label><textarea value={lf.learned} onChange={e => setLf({ ...lf, learned: e.target.value })} rows={3} placeholder="The lesson. Be specific." className={cls.input + " resize-none"} /></div>
            <div className="flex gap-2 pt-1">
              <button onClick={addLesson} className="flex-1 py-2.5 bg-[#dc2626] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 transition-colors">Save</button>
              <button onClick={() => setShowLessonModal(false)} className="px-4 py-2.5 border border-[#2a2a2a] text-[#444] text-[10px] uppercase tracking-widest hover:border-[#666] transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
