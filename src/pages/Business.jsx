import { useState } from 'react'
import { Plus, X, ChevronDown } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { today, fmtShort } from '../utils'

// ─── Design tokens ───────────────────────────────────────────────────────────
const BG         = '#020609'
const SURF       = '#040810'
const CARD_BG    = '#080e1a'
const CARD_BORDER= '#1e3050'
const GOLD       = '#f0c040'
const CYAN       = '#22d3ee'
const BLUE       = '#4d9fff'
const GREEN      = '#1ad9a0'
const PURPLE     = '#8b5cf6'
const PINK       = '#e879f9'
const RED        = '#f43f5e'
const TEXT2      = '#a0bcdf'
const MUTED      = '#7a95c0'

const STATUSES = ['Lead', 'Appointment Set', 'No Show', 'Closed', 'Lost']

const STATUS_COLOR = {
  Lead:              { color: '#7a95c0', border: '#3a5580' },
  'Appointment Set': { color: '#4d9fff', border: '#1a4a8a' },
  'No Show':         { color: '#ff5555', border: '#7a1a1a' },
  Closed:            { color: '#1ad9a0', border: '#0a5540' },
  Lost:              { color: '#a0bcdf', border: '#3a5070' },
}

const LABEL_STYLE = {
  fontFamily: 'Inter, sans-serif',
  fontSize: 9,
  fontWeight: 600,
  color: TEXT2,
  textTransform: 'uppercase',
  letterSpacing: '0.3em',
}

const HEADING_STYLE = (color, size = 40) => ({
  fontFamily: '"Orbitron", "Space Grotesk", sans-serif',
  fontSize: size,
  fontWeight: 900,
  color,
  lineHeight: 1,
  textTransform: 'uppercase',
})

const INPUT_STYLE = {
  width: '100%',
  background: BG,
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: 6,
  padding: '8px 12px',
  fontFamily: 'Inter, sans-serif',
  fontSize: 13,
  color: 'white',
  outline: 'none',
  boxSizing: 'border-box',
}

const CHART_TT = {
  contentStyle: { background: SURF, border: `1px solid ${CARD_BORDER}`, borderRadius: 6, fontSize: 11, fontFamily: 'Inter' },
  labelStyle:   { color: TEXT2 },
  itemStyle:    { color: '#fff' },
}

// ─── Week helpers ─────────────────────────────────────────────────────────────
function getWeekBounds() {
  const now = new Date()
  const dow = now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  sun.setHours(23, 59, 59, 999)
  return { mon, sun }
}

function getWeekDates() {
  const { mon } = getWeekBounds()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

function isThisWeek(dateStr) {
  const { mon, sun } = getWeekBounds()
  const d = new Date(dateStr + 'T12:00:00')
  return d >= mon && d <= sun
}

function fmtWeekLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
}

function fmtWeekRange() {
  const dates = getWeekDates()
  const f = d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${f(dates[0])} – ${f(dates[6])}`
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Business() {
  const [data, setData]       = useLocalStorage('marko_business', { deals: [], lessons: [], revenueHistory: [] })
  const [setterData, setSetterData] = useLocalStorage('marko_setter', { weeklyData: {} })

  const [showApptModal, setShowApptModal] = useState(false)
  const [hoveredRow, setHoveredRow]       = useState(null)

  // form states
  const [apptForm, setApptForm] = useState({ prospect: '', gym: '', date: today(), status: 'Appointment Set' })
  const [setterForm, setSetterForm] = useState({ sms: '', calls: '', appts: '' })

  // ─── Derived data ──────────────────────────────────────────────────────────
  const deals          = data.deals          || []
  const lessons        = data.lessons        || []
  const revenueHistory = data.revenueHistory || []

  // Month revenue
  const now        = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthRevenue = revenueHistory
    .filter(r => r.date >= monthStart)
    .reduce((s, r) => s + (r.amount || 0), 0)

  // Stat block calcs
  const thisWeekDeals = deals.filter(d => isThisWeek(d.date))

  const apptsThisWeek = thisWeekDeals.filter(d => d.status === 'Appointment Set').length

  const salesCallsThisWeek = thisWeekDeals.filter(d =>
    ['Appointment Set', 'No Show', 'Closed', 'Lost'].includes(d.status)
  ).length

  const totalCalls = deals.filter(d =>
    ['Appointment Set', 'No Show', 'Closed', 'Lost'].includes(d.status)
  )
  const showed = totalCalls.filter(d => d.status !== 'No Show')
  const showRate = totalCalls.length > 0 ? Math.round((showed.length / totalCalls.length) * 100) : 0

  const closedDeals = deals.filter(d => d.status === 'Closed')
  const lostDeals   = deals.filter(d => d.status === 'Lost')
  const closeRate   = (closedDeals.length + lostDeals.length) > 0
    ? Math.round((closedDeals.length / (closedDeals.length + lostDeals.length)) * 100)
    : 0

  const totalClosedCount = closedDeals.length

  // Recent 20 deals sorted by date desc
  const recentDeals = [...deals]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 20)

  // ─── Deal CRUD ─────────────────────────────────────────────────────────────
  const addDeal = () => {
    if (!apptForm.prospect.trim()) return
    const newDeal = {
      id: Date.now(),
      prospect: apptForm.prospect.trim(),
      gym: apptForm.gym.trim(),
      date: apptForm.date || today(),
      status: apptForm.status,
      value: 0,
    }
    setData(d => ({ ...d, deals: [newDeal, ...(d.deals || [])] }))
    setApptForm({ prospect: '', gym: '', date: today(), status: 'Appointment Set' })
    setShowApptModal(false)
  }

  const updateDealStatus = (id, status) => {
    const todayStr = today()
    const deal = deals.find(d => d.id === id)
    const updatedDeals = deals.map(d => d.id === id ? { ...d, status } : d)
    let updatedHistory = [...revenueHistory]
    if (status === 'Closed' && deal) {
      updatedHistory = [...updatedHistory, { date: todayStr, amount: parseFloat(deal.value) || 0 }]
    }
    setData(d => ({ ...d, deals: updatedDeals, revenueHistory: updatedHistory }))
  }

  const deleteDeal = id => setData(d => ({ ...d, deals: (d.deals || []).filter(x => x.id !== id) }))

  // ─── Lesson CRUD (preserved, not displayed) ────────────────────────────────
  const addLesson = (lf) => {
    if (!lf.title?.trim()) return
    const todayStr = today()
    setData(d => ({ ...d, lessons: [{ ...lf, id: Date.now(), date: todayStr }, ...(d.lessons || [])] }))
  }
  const deleteLesson = id => setData(d => ({ ...d, lessons: (d.lessons || []).filter(l => l.id !== id) }))
  void addLesson; void deleteLesson  // suppress unused warnings

  // ─── Setter tracker ────────────────────────────────────────────────────────
  const weekDates    = getWeekDates()
  const weeklyData   = setterData.weeklyData || {}
  const todayStr     = today()
  const todayEntry   = weeklyData[todayStr] || { sms: 0, calls: 0, appts: 0 }

  const saveSetterDay = () => {
    const sms   = parseInt(setterForm.sms)   || 0
    const calls = parseInt(setterForm.calls) || 0
    const appts = parseInt(setterForm.appts) || 0
    setSetterData(d => ({
      ...d,
      weeklyData: {
        ...(d.weeklyData || {}),
        [todayStr]: { sms, calls, appts },
      },
    }))
    setSetterForm({ sms: '', calls: '', appts: '' })
  }

  const weekChartData = weekDates.map(ds => {
    const entry = weeklyData[ds] || { sms: 0, calls: 0, appts: 0 }
    return {
      day: fmtWeekLabel(ds),
      SMS: Math.round((entry.sms || 0) / 10),
      Calls: entry.calls || 0,
      Appts: entry.appts || 0,
    }
  })

  const weekTotals = weekDates.reduce(
    (acc, ds) => {
      const e = weeklyData[ds] || {}
      return { sms: acc.sms + (e.sms || 0), calls: acc.calls + (e.calls || 0), appts: acc.appts + (e.appts || 0) }
    },
    { sms: 0, calls: 0, appts: 0 }
  )

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: BG, minHeight: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>

      {/* ── TOP BAR ────────────────────────────────────────────────────────── */}
      <div style={{
        background: SURF,
        borderBottom: `1px solid ${CARD_BORDER}`,
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: TEXT2 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
          </span>
          <span style={{
            ...HEADING_STYLE('white', 22),
            letterSpacing: '0.08em',
            background: 'linear-gradient(135deg, #4d9fff, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>BUSINESS</span>
        </div>
        <div style={{
          background: `${GOLD}22`,
          border: `1px solid ${GOLD}55`,
          borderRadius: 20,
          padding: '3px 12px',
          fontFamily: '"Orbitron", "Space Grotesk", sans-serif',
          fontSize: 13,
          fontWeight: 900,
          color: GOLD,
          letterSpacing: '0.05em',
        }}>
          {totalClosedCount} CLOSED
        </div>
      </div>

      {/* ── 4 STAT BLOCKS ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, flexShrink: 0 }}>
        {[
          {
            label: 'APPOINTMENTS',
            value: apptsThisWeek,
            suffix: '',
            color: GREEN,
            delta: 'goal: 10/wk',
          },
          {
            label: 'SALES CALLS',
            value: salesCallsThisWeek,
            suffix: '',
            color: BLUE,
            delta: 'conducted this week',
          },
          {
            label: 'SHOW RATE',
            value: showRate,
            suffix: '%',
            color: GOLD,
            delta: 'target: 70%+',
          },
          {
            label: 'CLOSE RATE',
            value: closeRate,
            suffix: '%',
            color: PURPLE,
            delta: 'target: 30%+',
          },
        ].map(stat => (
          <div key={stat.label} style={{
            background: '#080e1a',
            border: `1px solid ${CARD_BORDER}`,
            borderTop: `2px solid ${stat.color}`,
            padding: '16px 20px',
          }}>
            <div style={{ ...LABEL_STYLE, marginBottom: 8 }}>{stat.label}</div>
            <div style={{
              fontFamily: '"Orbitron", "Space Grotesk", sans-serif',
              fontSize: 44,
              fontWeight: 900,
              color: stat.color,
              lineHeight: 1,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}>
              {stat.value}{stat.suffix}
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: TEXT2 }}>
              {stat.delta}
            </div>
          </div>
        ))}
      </div>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── APPOINTMENTS TABLE ─────────────────────────────────────────── */}
        <div>
          {/* Table header bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={LABEL_STYLE}>RECENT APPOINTMENTS</span>
            <button
              onClick={() => setShowApptModal(true)}
              style={{
                background: 'transparent',
                border: `1px solid ${BLUE}`,
                borderRadius: 6,
                padding: '5px 12px',
                fontFamily: 'Inter, sans-serif',
                fontSize: 10,
                fontWeight: 600,
                color: BLUE,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
              onMouseEnter={e => e.currentTarget.style.background = `${BLUE}18`}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Plus size={11} strokeWidth={2.5} /> ADD APPOINTMENT
            </button>
          </div>

          {/* Table */}
          <div style={{
            background: '#080e1a',
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            {/* Table head */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 120px 140px 36px',
              padding: '10px 16px',
              borderBottom: `1px solid ${CARD_BORDER}`,
            }}>
              {['NAME', 'GYM', 'DATE', 'STATUS', ''].map(col => (
                <div key={col} style={{ ...LABEL_STYLE, marginBottom: 0 }}>{col}</div>
              ))}
            </div>

            {recentDeals.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', fontFamily: 'Inter, sans-serif', fontSize: 12, color: TEXT2 }}>
                No appointments yet — add one above
              </div>
            ) : (
              recentDeals.map(deal => {
                const sc = STATUS_COLOR[deal.status] || STATUS_COLOR['Lead']
                const isHovered = hoveredRow === deal.id
                return (
                  <div
                    key={deal.id}
                    onMouseEnter={() => setHoveredRow(deal.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 120px 140px 36px',
                      padding: '10px 16px',
                      borderBottom: `1px solid ${CARD_BORDER}`,
                      alignItems: 'center',
                      background: isHovered ? `${CARD_BORDER}80` : 'transparent',
                      transition: 'background 0.1s',
                      boxShadow: isHovered ? `inset 0 0 0 1px ${sc.border}` : 'none',
                    }}
                  >
                    {/* Name */}
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                      {deal.prospect}
                    </div>

                    {/* Gym */}
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: TEXT2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                      {deal.gym || '—'}
                    </div>

                    {/* Date */}
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: TEXT2 }}>
                      {fmtShort(deal.date)}
                    </div>

                    {/* Status dropdown styled as pill */}
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                      <select
                        value={deal.status}
                        onChange={e => updateDealStatus(deal.id, e.target.value)}
                        style={{
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          background: `${sc.color}18`,
                          border: `1px solid ${sc.border}`,
                          borderRadius: 20,
                          padding: '3px 24px 3px 10px',
                          fontFamily: 'Inter, sans-serif',
                          fontSize: 10,
                          fontWeight: 600,
                          color: sc.color,
                          cursor: 'pointer',
                          outline: 'none',
                          letterSpacing: '0.04em',
                          boxShadow: `0 0 8px ${sc.color}33`,
                        }}
                      >
                        {STATUSES.map(s => <option key={s} value={s} style={{ background: SURF, color: 'white' }}>{s}</option>)}
                      </select>
                      <ChevronDown size={10} style={{ position: 'absolute', right: 7, color: sc.color, pointerEvents: 'none' }} />
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => deleteDeal(deal.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: TEXT2,
                        opacity: isHovered ? 1 : 0,
                        transition: 'opacity 0.1s, color 0.1s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 4,
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = RED}
                      onMouseLeave={e => e.currentTarget.style.color = TEXT2}
                    >
                      <X size={13} />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── SETTER PERFORMANCE TRACKER ─────────────────────────────────── */}
        <div style={{
          background: '#080e1a',
          border: `1px solid ${CARD_BORDER}`,
          borderRadius: 10,
          padding: '20px',
        }}>
          {/* Tracker header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ ...LABEL_STYLE, color: BLUE }}>SETTER — BILAL</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: TEXT2 }}>{fmtWeekRange()}</span>
          </div>

          {/* Today's log inputs */}
          <div style={{
            background: BG,
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: 8,
            padding: '14px 16px',
            marginBottom: 20,
          }}>
            <div style={{ ...LABEL_STYLE, marginBottom: 12 }}>
              LOG TODAY — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'flex-end' }}>
              {[
                { key: 'sms',   label: 'SMS SENT',    placeholder: todayEntry.sms || '0'   },
                { key: 'calls', label: 'CALLS MADE',  placeholder: todayEntry.calls || '0' },
                { key: 'appts', label: 'APPTS BOOKED', placeholder: todayEntry.appts || '0' },
              ].map(field => (
                <div key={field.key}>
                  <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>{field.label}</div>
                  <input
                    type="number"
                    min="0"
                    value={setterForm[field.key]}
                    onChange={e => setSetterForm(f => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={String(field.placeholder)}
                    style={{ ...INPUT_STYLE, fontSize: 16, fontWeight: 600, textAlign: 'center' }}
                  />
                </div>
              ))}
              <button
                onClick={saveSetterDay}
                style={{
                  background: BLUE,
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'white',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Save Today
              </button>
            </div>
          </div>

          {/* Bar chart */}
          <div style={{ marginBottom: 16 }}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weekChartData} barGap={3} barCategoryGap="30%">
                <XAxis
                  dataKey="day"
                  tick={{ fill: TEXT2, fontSize: 9, fontFamily: 'Inter', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: TEXT2, fontSize: 9, fontFamily: 'Inter' }}
                  axisLine={false}
                  tickLine={false}
                  width={24}
                />
                <Tooltip
                  {...CHART_TT}
                  formatter={(value, name) => {
                    if (name === 'SMS') return [value * 10, 'SMS Sent']
                    return [value, name]
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 9, fontFamily: 'Inter', color: TEXT2, paddingTop: 8 }}
                  formatter={(value) => {
                    if (value === 'SMS') return 'SMS (÷10)'
                    return value
                  }}
                />
                <Bar dataKey="SMS"   fill={BLUE}  radius={[3, 3, 0, 0]} />
                <Bar dataKey="Calls" fill={GOLD}  radius={[3, 3, 0, 0]} />
                <Bar dataKey="Appts" fill={GREEN} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Week totals footer */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
            borderTop: `1px solid ${CARD_BORDER}`,
            paddingTop: 14,
          }}>
            {[
              { label: 'SMS TOTAL', value: weekTotals.sms,   color: BLUE  },
              { label: 'CALLS TOTAL', value: weekTotals.calls, color: GOLD  },
              { label: 'APPTS TOTAL', value: weekTotals.appts, color: GREEN },
            ].map(t => (
              <div key={t.label} style={{ textAlign: 'center' }}>
                <div style={{ ...LABEL_STYLE, marginBottom: 4 }}>{t.label}</div>
                <div style={{
                  fontFamily: '"Orbitron", "Space Grotesk", sans-serif',
                  fontSize: 31,
                  fontWeight: 900,
                  color: t.color,
                  lineHeight: 1,
                  textTransform: 'uppercase',
                }}>{t.value}</div>
              </div>
            ))}
          </div>
        </div>

      </div>{/* end main content */}

      {/* ── ADD APPOINTMENT MODAL ──────────────────────────────────────────── */}
      {showApptModal && (
        <Modal title="Add Appointment" onClose={() => setShowApptModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>PROSPECT NAME</div>
              <input
                autoFocus
                value={apptForm.prospect}
                onChange={e => setApptForm(f => ({ ...f, prospect: e.target.value }))}
                placeholder="John Smith"
                style={INPUT_STYLE}
                onKeyDown={e => e.key === 'Enter' && addDeal()}
              />
            </div>
            <div>
              <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>GYM</div>
              <input
                value={apptForm.gym}
                onChange={e => setApptForm(f => ({ ...f, gym: e.target.value }))}
                placeholder="Elite Fitness"
                style={INPUT_STYLE}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>DATE</div>
                <input
                  type="date"
                  value={apptForm.date}
                  onChange={e => setApptForm(f => ({ ...f, date: e.target.value }))}
                  style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
                />
              </div>
              <div>
                <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>STATUS</div>
                <select
                  value={apptForm.status}
                  onChange={e => setApptForm(f => ({ ...f, status: e.target.value }))}
                  style={{ ...INPUT_STYLE, cursor: 'pointer' }}
                >
                  {STATUSES.map(s => <option key={s} value={s} style={{ background: SURF }}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button
                onClick={addDeal}
                style={{
                  flex: 1,
                  background: BLUE,
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 0',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'white',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Save
              </button>
              <button
                onClick={() => setShowApptModal(false)}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  border: `1px solid ${CARD_BORDER}`,
                  borderRadius: 6,
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 10,
                  color: TEXT2,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}
