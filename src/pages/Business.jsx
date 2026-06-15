import { useState } from 'react'
import { Plus, X, ChevronDown } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { fmtShort, daysAgoLabel } from '../utils'

const GOAL = 10000
const STATUSES = ['Lead', 'Appointment Set', 'No Show', 'Closed', 'Lost']
const STATUS_STYLE = {
  Lead:              { color: '#9ca3af', border: '#2a2a2a', bg: '#111' },
  'Appointment Set': { color: '#60a5fa', border: '#1e3a5f', bg: '#0a1929' },
  'No Show':         { color: '#fb923c', border: '#5c2e1a', bg: '#1f0c00' },
  Closed:            { color: '#34d399', border: '#1a4a38', bg: '#001f14' },
  Lost:              { color: '#4b5563', border: '#1a1a1a', bg: '#0d0d0d' },
}
const CHART_TT = { contentStyle: { background: '#151515', border: '1px solid #2a2a2a', borderRadius: 0, fontSize: 11, fontFamily: 'monospace' }, labelStyle: { color: '#666' }, itemStyle: { color: '#e8e8e8' } }

const cls = {
  input: "w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#555] font-mono transition-colors",
  label: "block text-[10px] font-mono uppercase tracking-widest text-[#555] mb-1.5",
  primary: "flex-1 py-2.5 bg-[#facc15] text-black text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-300 transition-colors",
  secondary: "px-4 py-2.5 border border-[#2a2a2a] text-[#666] text-[10px] uppercase tracking-widest hover:border-[#555] hover:text-neutral-300 transition-colors",
}

export default function Business() {
  const [data, setData] = useLocalStorage('marko_business', { deals: [], lessons: [], revenueHistory: [] })
  const [modals, setModals] = useState({})
  const om = k => setModals(m => ({ ...m, [k]: true }))
  const cm = k => setModals(m => ({ ...m, [k]: false }))
  const [df, setDf] = useState({ prospect: '', status: 'Lead', value: '', date: new Date().toISOString().split('T')[0] })
  const [lf, setLf] = useState({ title: '', what: '', learned: '', date: new Date().toISOString().split('T')[0] })

  const deals = data.deals || []
  const lessons = data.lessons || []

  const addDeal = () => {
    if (!df.prospect.trim()) return
    const deal = { ...df, id: Date.now(), value: parseFloat(df.value) || 0 }
    const newDeals = [deal, ...deals]
    let newRevHist = [...(data.revenueHistory || [])]
    if (deal.status === 'Closed' && deal.value) newRevHist.push({ date: deal.date, amount: deal.value, dealId: deal.id })
    setData(d => ({ ...d, deals: newDeals, revenueHistory: newRevHist }))
    setDf({ prospect: '', status: 'Lead', value: '', date: new Date().toISOString().split('T')[0] })
    cm('deal')
  }

  const updateStatus = (id, status) => {
    const deal = deals.find(d => d.id === id)
    if (!deal) return
    let newRevHist = [...(data.revenueHistory || [])]
    if (status === 'Closed' && deal.status !== 'Closed' && deal.value) {
      newRevHist.push({ date: new Date().toISOString().split('T')[0], amount: deal.value, dealId: id })
    }
    setData(d => ({ ...d, deals: deals.map(d => d.id === id ? { ...d, status } : d), revenueHistory: newRevHist }))
  }

  const addLesson = () => {
    if (!lf.title.trim()) return
    setData(d => ({ ...d, lessons: [{ ...lf, id: Date.now() }, ...(d.lessons || [])] }))
    setLf({ title: '', what: '', learned: '', date: new Date().toISOString().split('T')[0] })
    cm('lesson')
  }

  const deleteDeal = id => setData(d => ({ ...d, deals: deals.filter(x => x.id !== id) }))
  const deleteLesson = id => setData(d => ({ ...d, lessons: lessons.filter(x => x.id !== id) }))

  // Metrics
  const today = new Date()
  const ms = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const monthRevenue = (data.revenueHistory || []).filter(r => r.date >= ms).reduce((s, r) => s + (r.amount || 0), 0)
  const gap = Math.max(0, GOAL - monthRevenue)
  const goalPct = Math.min(100, Math.round((monthRevenue / GOAL) * 100))
  const closedDeals = deals.filter(d => ['Closed', 'Lost'].includes(d.status))
  const wonDeals = deals.filter(d => d.status === 'Closed')
  const closeRate = closedDeals.length > 0 ? Math.round((wonDeals.length / closedDeals.length) * 100) : 0
  const appointments = deals.filter(d => ['Appointment Set', 'No Show', 'Closed', 'Lost'].includes(d.status))
  const showed = deals.filter(d => !['Appointment Set'].includes(d.status) && d.status !== 'Lead')
  const showRate = appointments.length > 0 ? Math.round(((appointments.length - deals.filter(d => d.status === 'No Show').length) / appointments.length) * 100) : 0
  const pipeline = deals.filter(d => !['Closed', 'Lost'].includes(d.status)).reduce((s, d) => s + (d.value || 0), 0)

  const chartData = (() => {
    let cum = 0
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i))
      const ds = d.toISOString().split('T')[0]
      const dayAmt = (data.revenueHistory || []).filter(r => r.date === ds).reduce((s, r) => s + (r.amount || 0), 0)
      if (ds >= ms) cum += dayAmt
      return { date: ds.slice(5), cumulative: cum }
    })
  })()

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-6 border-b border-[#1f1f1f] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight uppercase">Business</h1>
          <p className="text-[10px] font-mono text-[#555] mt-0.5 uppercase tracking-widest">Revenue command center</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => om('lesson')} className="px-3 py-1.5 border border-[#2a2a2a] text-[#666] text-[9px] uppercase tracking-widest hover:border-[#555] hover:text-neutral-300 transition-colors">Add Lesson</button>
          <button onClick={() => om('deal')} className="flex items-center gap-1.5 px-4 py-2 bg-[#facc15] text-black text-[9px] font-bold uppercase tracking-widest hover:bg-yellow-300 transition-colors">
            <Plus size={10} strokeWidth={2.5} /> Add Deal
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <KPICard label="Revenue MTD" value={`$${monthRevenue.toLocaleString()}`} sub="this month" gold />
          <KPICard label="Gap to $10k" value={gap === 0 ? '✓ HIT' : `-$${gap.toLocaleString()}`} sub={`${goalPct}% complete`} green={gap === 0} />
          <KPICard label="Pipeline" value={`$${pipeline.toLocaleString()}`} sub={`${deals.filter(d => !['Closed','Lost'].includes(d.status)).length} open deals`} />
          <KPICard label="Close Rate" value={`${closeRate}%`} sub={`${wonDeals.length}/${closedDeals.length} closed`} />
          <KPICard label="Show Rate" value={`${showRate}%`} sub={`${appointments.length} appointments`} />
        </div>

        {/* Goal progress bar */}
        <div className="bg-[#111] border border-[#1f1f1f] px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#555]">Monthly Goal — $10,000</span>
            <span className="text-[10px] font-mono text-[#444]">${monthRevenue.toLocaleString()} / $10,000</span>
          </div>
          <div className="h-px bg-[#1a1a1a]">
            <div className={`h-px transition-all duration-500 ${goalPct >= 100 ? 'bg-green-400' : 'bg-[#facc15]'}`} style={{ width: `${goalPct}%` }} />
          </div>
        </div>

        {/* Revenue chart */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#555] mb-3">30-Day Cumulative Revenue</div>
          <div className="bg-[#111] border border-[#1f1f1f] p-4">
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fill: '#444', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fill: '#444', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={48} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                <Tooltip {...CHART_TT} formatter={v => [`$${v.toLocaleString()}`, 'Cumulative']} />
                <Line type="monotone" dataKey="cumulative" stroke="#facc15" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Deals */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#555] mb-3">Deals</div>
          {deals.length === 0 ? (
            <div className="bg-[#111] border border-[#1f1f1f] p-8 text-center text-[#444] text-xs font-mono">No deals yet</div>
          ) : (
            <div className="space-y-1">
              {deals.map(deal => <DealRow key={deal.id} deal={deal} onStatusChange={s => updateStatus(deal.id, s)} onDelete={() => deleteDeal(deal.id)} />)}
            </div>
          )}
        </div>

        {/* Lessons Learned */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#555] mb-3">Lessons Learned</div>
          {lessons.length === 0 ? (
            <div className="bg-[#111] border border-[#1f1f1f] p-6 text-center text-[#444] text-xs font-mono">Every loss is a lesson. Start logging.</div>
          ) : (
            <div className="space-y-2">
              {lessons.map(lesson => (
                <div key={lesson.id} className="bg-[#111] border border-[#1f1f1f] p-4 hover:border-[#2a2a2a] transition-colors group">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="text-sm font-semibold">{lesson.title}</h4>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[8px] font-mono text-[#333]">{lesson.date}</span>
                      <button onClick={() => deleteLesson(lesson.id)} className="text-[#333] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><X size={11} /></button>
                    </div>
                  </div>
                  {lesson.what && <p className="text-xs text-[#555] mb-1"><span className="text-[#666] font-mono uppercase text-[9px]">What happened: </span>{lesson.what}</p>}
                  {lesson.learned && <p className="text-xs text-[#facc15]/80"><span className="text-[#666] font-mono uppercase text-[9px]">Learned: </span>{lesson.learned}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modals.deal && (
        <Modal title="New Deal" onClose={() => cm('deal')}>
          <div className="space-y-4">
            <div><label className={cls.label}>Prospect Name</label><input value={df.prospect} onChange={e => setDf({ ...df, prospect: e.target.value })} placeholder="Family name or company" className={cls.input} autoFocus /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={cls.label}>Value ($)</label><input type="number" value={df.value} onChange={e => setDf({ ...df, value: e.target.value })} placeholder="3000" className={cls.input} /></div>
              <div><label className={cls.label}>Date</label><input type="date" value={df.date} onChange={e => setDf({ ...df, date: e.target.value })} className={cls.input} /></div>
            </div>
            <div><label className={cls.label}>Status</label><select value={df.status} onChange={e => setDf({ ...df, status: e.target.value })} className={cls.input}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="flex gap-2 pt-1"><button onClick={addDeal} className={cls.primary}>Add Deal</button><button onClick={() => cm('deal')} className={cls.secondary}>Cancel</button></div>
          </div>
        </Modal>
      )}

      {modals.lesson && (
        <Modal title="Lessons Learned" onClose={() => cm('lesson')}>
          <div className="space-y-4">
            <div><label className={cls.label}>Title</label><input value={lf.title} onChange={e => setLf({ ...lf, title: e.target.value })} placeholder="What this lesson is about..." className={cls.input} autoFocus /></div>
            <div><label className={cls.label}>What Happened</label><textarea value={lf.what} onChange={e => setLf({ ...lf, what: e.target.value })} placeholder="Describe the situation..." rows={3} className={cls.input + " resize-none"} /></div>
            <div><label className={cls.label}>What You Learned</label><textarea value={lf.learned} onChange={e => setLf({ ...lf, learned: e.target.value })} placeholder="What will you do differently?" rows={3} className={cls.input + " resize-none"} /></div>
            <div><label className={cls.label}>Date</label><input type="date" value={lf.date} onChange={e => setLf({ ...lf, date: e.target.value })} className={cls.input} /></div>
            <div className="flex gap-2 pt-1"><button onClick={addLesson} className={cls.primary}>Save Lesson</button><button onClick={() => cm('lesson')} className={cls.secondary}>Cancel</button></div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function KPICard({ label, value, sub, gold, green }) {
  return (
    <div className={`bg-[#111] border p-4 ${gold ? 'border-[#facc15]/30' : 'border-[#1f1f1f]'}`}>
      <div className="text-[9px] font-mono uppercase tracking-widest text-[#555] mb-2">{label}</div>
      <div className={`text-xl font-mono font-black ${green ? 'text-green-400' : gold ? 'text-[#facc15]' : 'text-white'}`}>{value}</div>
      <div className="text-[9px] font-mono text-[#444] mt-1">{sub}</div>
    </div>
  )
}

function DealRow({ deal, onStatusChange, onDelete }) {
  const [open, setOpen] = useState(false)
  const s = STATUS_STYLE[deal.status] || STATUS_STYLE.Lead
  return (
    <div className="bg-[#111] border border-[#1f1f1f] px-4 py-3 flex items-center justify-between hover:border-[#2a2a2a] transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-medium truncate">{deal.prospect}</span>
        {deal.value > 0 && <span className="text-xs font-mono text-[#555] shrink-0">${deal.value.toLocaleString()}</span>}
        <span className="text-[9px] font-mono text-[#333] shrink-0">{fmtShort(deal.date)}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative">
          <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-[8px] font-mono uppercase tracking-widest px-2 py-1 border" style={{ color: s.color, borderColor: s.border, background: s.bg }}>
            {deal.status} <ChevronDown size={8} />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-0.5 bg-[#191919] border border-[#2a2a2a] z-20 min-w-max shadow-xl">
              {STATUSES.map(st => (
                <button key={st} onClick={() => { onStatusChange(st); setOpen(false) }} className="block w-full text-left px-4 py-2 text-[9px] font-mono uppercase tracking-widest hover:bg-[#222]" style={{ color: STATUS_STYLE[st].color }}>{st}</button>
              ))}
            </div>
          )}
        </div>
        <button onClick={onDelete} className="text-[#333] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><X size={11} /></button>
      </div>
    </div>
  )
}
