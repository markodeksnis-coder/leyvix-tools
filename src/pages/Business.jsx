import { useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { fmtShort } from '../utils'

const CARD = { background: '#0d1427', border: '1px solid #1a2440', borderRadius: 12, padding: 20 }
const STATUSES = ['Lead', 'Appointment Set', 'No Show', 'Closed', 'Lost']
const STATUS_COLORS = {
  Lead: { color: '#a0aec0', border: '#a0aec04d' },
  'Appointment Set': { color: '#3b82f6', border: '#3b82f64d' },
  'No Show': { color: '#c9a84c', border: '#c9a84c4d' },
  Closed: { color: '#22c55e', border: '#22c55e4d' },
  Lost: { color: '#ef4444', border: '#ef44444d' },
}
const LESSON_CATS = ['Sales Call', 'Outreach', 'Client', 'Strategy', 'Other']
const CHART_TT = {
  contentStyle: { background: '#0d1427', border: '1px solid #1a2440', borderRadius: 8, fontSize: 11, fontFamily: 'Inter' },
  labelStyle: { color: '#a0aec0' },
  itemStyle: { color: '#fff' },
}

const cls = {
  input: "w-full bg-[#000000] border border-[#1a2440] px-3 py-2 text-sm text-white placeholder-[#a0aec0] focus:outline-none focus:border-[#c9a84c] transition-colors rounded-lg",
  label: "block text-[9px] font-mono uppercase tracking-widest text-[#a0aec0] mb-1.5",
}

const LABEL = { fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }

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

  const revenueColor = monthRevenue >= 10000 ? '#c9a84c' : monthRevenue >= 5000 ? 'white' : '#c9a84c'

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
    setData(d => ({ ...d, deals: [{ ...df, id: Date.now(), date: today, value: parseFloat(df.value) || 0 }, ...deals] }))
    setDf({ prospect: '', status: 'Lead', value: '' })
    setShowDealModal(false)
  }

  const updateDealStatus = (id, status) => {
    const today = new Date().toISOString().split('T')[0]
    const deal = deals.find(d => d.id === id)
    const updatedDeals = deals.map(d => d.id === id ? { ...d, status } : d)
    let updatedHistory = [...revenueHistory]
    if (status === 'Closed' && deal) updatedHistory = [...updatedHistory, { date: today, amount: parseFloat(deal.value) || 0 }]
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
    <div className="h-full flex flex-col" style={{ background: '#000000' }}>
      {/* Header */}
      <div style={{ background: '#000000', borderBottom: '1px solid #1a2440', padding: '20px 32px', flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, color: '#a0aec0', letterSpacing: '0.12em', textTransform: 'uppercase' }}>REVENUE COMMAND ACTIVE</span>
          </div>
          <h1 style={{ fontFamily: '"Bebas Neue",cursive', fontSize: 64, fontWeight: 400, lineHeight: 0.9, fontStyle: 'italic', letterSpacing: '0.02em', background: 'linear-gradient(180deg,#c9a84c 0%,#c9a84c 60%,#c9a84c 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
            BUSINESS
          </h1>
          <p style={{ fontFamily: 'Inter', fontSize: 10, color: '#a0aec0', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>REVENUE · PIPELINE · LESSONS VAULT</p>
        </div>
        <div className="flex gap-2" style={{ marginTop: 16 }}>
          <button onClick={() => setShowLessonModal(true)}
            style={{ background: 'transparent', color: '#a0aec0', border: '1px solid #1a2440', borderRadius: 8, padding: '6px 12px', fontFamily: 'Inter', fontSize: 11, cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a84c'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#1a2440'}
          >+ Lesson</button>
          <button onClick={() => setShowDealModal(true)}
            style={{ background: '#c9a84c', color: '#000', border: 'none', borderRadius: 8, padding: '6px 14px', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          ><Plus size={12} strokeWidth={2.5} /> Add Deal</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div style={{ ...CARD, border: monthRevenue >= 10000 ? '1px solid #c9a84c40' : '1px solid #1a2440' }}>
            <div style={LABEL}>Revenue MTD</div>
            <div style={{ fontFamily: '"Bebas Neue",cursive', fontSize: 36, fontWeight: 400, color: revenueColor, lineHeight: 1 }}>${monthRevenue.toLocaleString()}</div>
            <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#a0aec0', marginTop: 4 }}>/ $10,000 goal</div>
            <div style={{ marginTop: 8, height: 4, background: '#1a2440', borderRadius: 2 }}>
              <div style={{ height: 4, background: monthRevenue >= 10000 ? '#c9a84c' : '#c9a84c', borderRadius: 2, width: `${Math.min(100, (monthRevenue / 10000) * 100)}%`, transition: 'width 0.3s' }} />
            </div>
          </div>
          {[
            { label: 'Gap to $10k', value: gap === 0 ? 'DONE' : `$${gap.toLocaleString()}`, color: gap === 0 ? '#22c55e' : '#ef4444' },
            { label: 'Pipeline', value: `$${pipeline.toLocaleString()}`, sub: `${openDeals.length} open deals`, color: 'white' },
            { label: 'Close Rate', value: `${closeRate}%`, color: 'white' },
            { label: 'Show Rate', value: `${showRate}%`, color: 'white' },
          ].map(k => (
            <div key={k.label} style={CARD}>
              <div style={LABEL}>{k.label}</div>
              <div style={{ fontFamily: '"Bebas Neue",cursive', fontSize: 36, fontWeight: 400, color: k.color, lineHeight: 1 }}>{k.value}</div>
              {k.sub && <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#a0aec0', marginTop: 4 }}>{k.sub}</div>}
            </div>
          ))}
        </div>

        {/* Chart + Deals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div style={CARD}>
            <div style={LABEL}>30-Day Cumulative Revenue</div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={chart30}>
                <XAxis dataKey="date" tick={{ fill: '#a0aec0', fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} interval={6} />
                <YAxis tick={{ fill: '#a0aec0', fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} width={36} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...CHART_TT} formatter={v => [`$${v.toLocaleString()}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#c9a84c" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={CARD}>
            <div style={LABEL}>Active Deals</div>
            {deals.length === 0 ? (
              <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#a0aec0', textAlign: 'center', padding: '24px 0' }}>No deals yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {deals.slice(0, 8).map(d => {
                  const sc = STATUS_COLORS[d.status] || { color: '#a0aec0', border: '#a0aec040' }
                  return (
                    <div key={d.id} className="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors" style={{}}
                      onMouseEnter={e => e.currentTarget.style.background = '#000000'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 500, color: '#d1d5db', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.prospect}</div>
                        <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#a0aec0' }}>${parseFloat(d.value || 0).toLocaleString()} · {fmtShort(d.date)}</div>
                      </div>
                      <select
                        value={d.status}
                        onChange={e => updateDealStatus(d.id, e.target.value)}
                        style={{ fontFamily: 'Inter', fontSize: 10, color: sc.color, border: `1px solid ${sc.border}`, background: '#000000', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', outline: 'none' }}
                      >
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                      <button onClick={() => deleteDeal(d.id)} style={{ color: '#a0aec0', background: 'none', border: 'none', cursor: 'pointer', opacity: 0 }} className="group-hover:opacity-100 hover:text-red-400 transition-all"><X size={12} /></button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Lessons */}
        <div style={CARD}>
          <div className="flex items-center justify-between mb-4">
            <div style={LABEL}>Lessons Learned</div>
          </div>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <Search size={12} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }} />
            <input
              value={lessonSearch}
              onChange={e => setLessonSearch(e.target.value)}
              placeholder="Search lessons..."
              style={{ width: '100%', background: '#000000', border: '1px solid #1a2440', borderRadius: 8, paddingLeft: 36, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontFamily: 'Inter', fontSize: 13, color: '#d1d5db', outline: 'none' }}
            />
          </div>
          {filteredLessons.length === 0 ? (
            <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#a0aec0', textAlign: 'center', padding: '24px 0' }}>No lessons logged yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredLessons.map(l => (
                <div key={l.id} className="group" style={{ background: '#000000', border: '1px solid #1a2440', borderRadius: 8, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <div>
                      <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 700, color: '#c9a84c', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 8 }}>{l.category}</span>
                      <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#a0aec0' }}>{fmtShort(l.date)}</span>
                    </div>
                    <button onClick={() => deleteLesson(l.id)} style={{ color: '#a0aec0', background: 'none', border: 'none', cursor: 'pointer', opacity: 0, flexShrink: 0 }} className="group-hover:opacity-100 hover:text-red-400 transition-all"><X size={12} /></button>
                  </div>
                  <div style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 6 }}>{l.title}</div>
                  {l.what && <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#a0aec0', marginBottom: 4 }}><span style={{ color: '#a0aec0', textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.06em' }}>What happened: </span>{l.what}</p>}
                  {l.learned && <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#a0aec0', borderLeft: '2px solid #c9a84c40', paddingLeft: 10, marginTop: 6 }}>{l.learned}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
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
              <button onClick={addDeal} style={{ background: '#c9a84c', color: '#000', borderRadius: 8 }} className="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">Save</button>
              <button onClick={() => setShowDealModal(false)} style={{ border: '1px solid #1a2440', color: '#a0aec0', borderRadius: 8 }} className="px-4 py-2.5 text-[10px] uppercase tracking-widest hover:border-[#444] transition-colors">Cancel</button>
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
            <div><label className={cls.label}>Situation</label><textarea value={lf.what} onChange={e => setLf({ ...lf, what: e.target.value })} rows={2} placeholder="What actually happened..." className={cls.input + ' resize-none'} /></div>
            <div><label className={cls.label}>What You Learned</label><textarea value={lf.learned} onChange={e => setLf({ ...lf, learned: e.target.value })} rows={3} placeholder="The lesson. Be specific." className={cls.input + ' resize-none'} /></div>
            <div className="flex gap-2 pt-1">
              <button onClick={addLesson} style={{ background: '#c9a84c', color: '#000', borderRadius: 8 }} className="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">Save</button>
              <button onClick={() => setShowLessonModal(false)} style={{ border: '1px solid #1a2440', color: '#a0aec0', borderRadius: 8 }} className="px-4 py-2.5 text-[10px] uppercase tracking-widest hover:border-[#444] transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
