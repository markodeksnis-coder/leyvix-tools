import { useState } from 'react'
import { Plus, ChevronDown, X } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const GOAL = 10000
const STAGES = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']

const STAGE_STYLE = {
  Lead:        { color: '#9ca3af', border: '#2a2a2a', bg: '#111' },
  Qualified:   { color: '#60a5fa', border: '#1e3a5f', bg: '#0a1929' },
  Proposal:    { color: '#fbbf24', border: '#5c4a1a', bg: '#1c1500' },
  Negotiation: { color: '#fb923c', border: '#5c2e1a', bg: '#1f0c00' },
  Won:         { color: '#34d399', border: '#1a4a38', bg: '#001f14' },
  Lost:        { color: '#4b5563', border: '#222', bg: '#0d0d0d' },
}

const cls = {
  input: "w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm text-neutral-100 placeholder-neutral-700 focus:outline-none focus:border-neutral-500 transition-colors font-mono",
  label: "block text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-1.5",
  btnPrimary: "flex-1 py-2.5 bg-white text-black text-[10px] font-semibold uppercase tracking-widest hover:bg-neutral-200 transition-colors",
  btnSecondary: "px-4 py-2.5 border border-[#2a2a2a] text-neutral-600 text-[10px] uppercase tracking-widest hover:border-neutral-600 hover:text-neutral-300 transition-colors",
}

const CHART_TOOLTIP = {
  contentStyle: { background: '#151515', border: '1px solid #2a2a2a', borderRadius: 0, fontSize: 11, fontFamily: 'monospace' },
  labelStyle: { color: '#666' },
  itemStyle: { color: '#e8e8e8' },
}

export default function Business() {
  const [deals, setDeals] = useLocalStorage('business_deals', [])
  const [revenueHistory, setRevenueHistory] = useLocalStorage('business_revenue_history', [])
  const [showDealModal, setShowDealModal] = useState(false)
  const [dealForm, setDealForm] = useState({ name: '', value: '', stage: 'Lead', closeDate: '' })

  const addDeal = () => {
    if (!dealForm.name.trim()) return
    setDeals([{ ...dealForm, id: Date.now(), createdAt: new Date().toISOString() }, ...deals])
    setDealForm({ name: '', value: '', stage: 'Lead', closeDate: '' })
    setShowDealModal(false)
  }

  const updateStage = (id, stage) => {
    const deal = deals.find(d => d.id === id)
    if (!deal) return
    if (stage === 'Won' && deal.stage !== 'Won' && deal.value) {
      setRevenueHistory(prev => [
        ...prev,
        { date: today(), amount: parseFloat(deal.value) || 0, dealName: deal.name, id: Date.now() }
      ])
    }
    setDeals(deals.map(d => d.id === id ? { ...d, stage } : d))
  }

  const deleteDeal = (id) => setDeals(deals.filter(d => d.id !== id))

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const monthRevenue = revenueHistory.filter(r => r.date >= monthStart).reduce((s, r) => s + r.amount, 0)
  const gap = Math.max(0, GOAL - monthRevenue)
  const openDeals = deals.filter(d => !['Won', 'Lost'].includes(d.stage))
  const pipeline = openDeals.reduce((s, d) => s + (parseFloat(d.value) || 0), 0)
  const wonDeals = deals.filter(d => d.stage === 'Won').length
  const closedDeals = deals.filter(d => ['Won', 'Lost'].includes(d.stage)).length
  const closeRate = closedDeals > 0 ? Math.round((wonDeals / closedDeals) * 100) : 0
  const goalPct = Math.min(100, Math.round((monthRevenue / GOAL) * 100))
  const chartData = getLast30Days(revenueHistory)

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-6 border-b border-[#1f1f1f] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Business</h1>
          <p className="text-[10px] font-mono text-neutral-600 mt-0.5 uppercase tracking-widest">Revenue command center</p>
        </div>
        <button
          onClick={() => { setDealForm({ name: '', value: '', stage: 'Lead', closeDate: '' }); setShowDealModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] font-semibold uppercase tracking-widest hover:bg-neutral-200 transition-colors"
        >
          <Plus size={11} strokeWidth={2.5} /> Add Deal
        </button>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <KPICard label="Revenue MTD" value={`$${monthRevenue.toLocaleString()}`} sub="this month" accent />
          <KPICard
            label="Gap to $10k"
            value={gap === 0 ? '✓ DONE' : `-$${gap.toLocaleString()}`}
            sub={`${goalPct}% complete`}
            highlight={gap === 0}
          />
          <KPICard label="Pipeline" value={`$${pipeline.toLocaleString()}`} sub={`${openDeals.length} open deals`} />
          <KPICard label="Close Rate" value={`${closeRate}%`} sub={`${wonDeals}/${closedDeals} closed`} />
          <KPICard label="All-Time Won" value={`${wonDeals}`} sub={`${deals.length} total deals`} />
        </div>

        {/* Goal progress */}
        <div className="bg-[#111] border border-[#1f1f1f] px-5 py-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-600">Monthly Goal Progress</span>
            <span className="text-[10px] font-mono text-neutral-500">${monthRevenue.toLocaleString()} / $10,000</span>
          </div>
          <div className="h-px bg-[#1f1f1f]">
            <div
              className={`h-px transition-all duration-500 ${goalPct >= 100 ? 'bg-green-400' : 'bg-white'}`}
              style={{ width: `${goalPct}%` }}
            />
          </div>
        </div>

        {/* Revenue chart */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-3">30-Day Cumulative Revenue</div>
          <div className="bg-[#111] border border-[#1f1f1f] p-4">
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fill: '#444', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fill: '#444', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={45} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                <Tooltip {...CHART_TOOLTIP} formatter={v => [`$${v.toLocaleString()}`, 'Cumulative']} />
                <Line type="monotone" dataKey="cumulative" stroke="#ffffff" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Deals */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-3">Pipeline</div>
          {deals.length === 0 ? (
            <div className="bg-[#111] border border-[#1f1f1f] p-8 text-center text-neutral-700 text-xs font-mono">
              No deals added yet
            </div>
          ) : (
            <div className="space-y-1">
              {deals.map(deal => (
                <DealRow key={deal.id} deal={deal} onStageChange={s => updateStage(deal.id, s)} onDelete={() => deleteDeal(deal.id)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showDealModal && (
        <Modal title="New Deal" onClose={() => setShowDealModal(false)}>
          <div className="space-y-4">
            <div>
              <label className={cls.label}>Deal / Client Name</label>
              <input value={dealForm.name} onChange={e => setDealForm({ ...dealForm, name: e.target.value })} placeholder="Company or person..." className={cls.input} autoFocus />
            </div>
            <div>
              <label className={cls.label}>Value ($)</label>
              <input type="number" value={dealForm.value} onChange={e => setDealForm({ ...dealForm, value: e.target.value })} placeholder="5000" className={cls.input} />
            </div>
            <div>
              <label className={cls.label}>Stage</label>
              <select value={dealForm.stage} onChange={e => setDealForm({ ...dealForm, stage: e.target.value })} className={cls.input}>
                {STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={cls.label}>Expected Close Date</label>
              <input type="date" value={dealForm.closeDate} onChange={e => setDealForm({ ...dealForm, closeDate: e.target.value })} className={cls.input} />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={addDeal} className={cls.btnPrimary}>Add Deal</button>
              <button onClick={() => setShowDealModal(false)} className={cls.btnSecondary}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function KPICard({ label, value, sub, accent, highlight }) {
  return (
    <div className={`bg-[#111] border p-4 ${accent ? 'border-neutral-700' : 'border-[#1f1f1f]'}`}>
      <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-700 mb-2">{label}</div>
      <div className={`text-xl font-mono font-bold ${highlight ? 'text-green-400' : accent ? 'text-white' : 'text-neutral-300'}`}>
        {value}
      </div>
      <div className="text-[9px] font-mono text-neutral-700 mt-1">{sub}</div>
    </div>
  )
}

function DealRow({ deal, onStageChange, onDelete }) {
  const [open, setOpen] = useState(false)
  const s = STAGE_STYLE[deal.stage] || STAGE_STYLE.Lead

  return (
    <div className="bg-[#111] border border-[#1f1f1f] px-4 py-3 flex items-center justify-between hover:border-[#282828] transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-medium truncate">{deal.name}</span>
        {deal.value && (
          <span className="text-xs font-mono text-neutral-500 shrink-0">${parseFloat(deal.value).toLocaleString()}</span>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {deal.closeDate && (
          <span className="text-[9px] font-mono text-neutral-700 hidden md:block">{deal.closeDate}</span>
        )}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest px-2 py-1 border transition-colors"
            style={{ color: s.color, borderColor: s.border, background: s.bg }}
          >
            {deal.stage}
            <ChevronDown size={9} />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-0.5 bg-[#191919] border border-[#2a2a2a] z-20 min-w-max shadow-xl">
              {STAGES.map(stage => {
                const ss = STAGE_STYLE[stage]
                return (
                  <button
                    key={stage}
                    onClick={() => { onStageChange(stage); setOpen(false) }}
                    className="block w-full text-left px-4 py-2 text-[10px] font-mono uppercase tracking-widest hover:bg-[#222] transition-colors"
                    style={{ color: ss.color }}
                  >
                    {stage}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <button onClick={onDelete} className="text-neutral-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
          <X size={12} />
        </button>
      </div>
    </div>
  )
}

function getLast30Days(history) {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  let cumulative = 0
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    const date = d.toISOString().split('T')[0]
    const dayAmt = history.filter(r => r.date === date).reduce((s, r) => s + r.amount, 0)
    if (date >= monthStart) cumulative += dayAmt
    return { date: date.slice(5), cumulative }
  })
}

function today() { return new Date().toISOString().split('T')[0] }
