import { useLocalStorage } from '../hooks/useLocalStorage'
import { today } from '../utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG          = '#030311'
const SURF        = '#09091f'
const CARD_BG     = '#0d0d28'
const CARD_BORDER = '#1d1d4a'
const GOLD        = '#fbbf24'
const CYAN        = '#22d3ee'
const BLUE        = '#3b82f6'
const GREEN       = '#10b981'
const PURPLE      = '#8b5cf6'
const PINK        = '#e879f9'
const RED         = '#f43f5e'
const TEXT2       = '#94a3b8'
const MUTED       = '#64748b'

const LABEL_STYLE = {
  fontFamily: 'Inter, sans-serif',
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: '0.3em',
  textTransform: 'uppercase',
  color: TEXT2,
}

const HEADING_STYLE = {
  fontFamily: '"Orbitron", "Space Grotesk", sans-serif',
  fontWeight: 700,
  textTransform: 'uppercase',
}

const TOOLTIP_PROPS = {
  contentStyle: {
    background: '#0d0d28',
    border: '1px solid #1d1d4a',
    fontSize: 10,
    fontFamily: 'Inter, sans-serif',
  },
  labelStyle: { color: '#94a3b8' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dateStr(d) {
  return d.toISOString().split('T')[0]
}

function daysAgoDate(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function getWeekStart() {
  const d = new Date()
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function getMonthStart() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Compute consecutive day streak where all nonNeg items are checked
function computeStreak(logs) {
  const todayStr = today()
  let streak = 0
  let d = new Date()

  // Walk backwards from today
  for (let i = 0; i <= 365; i++) {
    const ds = dateStr(d)
    const dayLog = logs[ds]
    if (!dayLog || !dayLog.items || dayLog.items.length === 0) {
      // If today has no log yet, skip (don't break streak on today)
      if (ds === todayStr) {
        d.setDate(d.getDate() - 1)
        continue
      }
      break
    }
    const nonNegItems = dayLog.items.filter(it => it.isNonNeg)
    if (nonNegItems.length === 0) {
      d.setDate(d.getDate() - 1)
      continue
    }
    const allChecked = nonNegItems.every(it => it.checked)
    if (allChecked) {
      streak++
      d.setDate(d.getDate() - 1)
    } else {
      if (ds === todayStr) {
        // Today not complete yet — don't break streak, just skip
        d.setDate(d.getDate() - 1)
        continue
      }
      break
    }
  }
  return streak
}

// Compute longest streak ever
function computeLongestStreak(logs) {
  const entries = Object.entries(logs).sort((a, b) => a[0].localeCompare(b[0]))
  let longest = 0
  let current = 0
  let prevDate = null

  for (const [ds, dayLog] of entries) {
    if (!dayLog || !dayLog.items) { current = 0; prevDate = null; continue }
    const nonNegItems = dayLog.items.filter(it => it.isNonNeg)
    if (nonNegItems.length === 0) { prevDate = ds; continue }
    const allChecked = nonNegItems.every(it => it.checked)

    if (allChecked) {
      if (prevDate) {
        const prev = new Date(prevDate + 'T12:00:00')
        const curr = new Date(ds + 'T12:00:00')
        const diff = Math.round((curr - prev) / 86400000)
        if (diff === 1) {
          current++
        } else {
          current = 1
        }
      } else {
        current = 1
      }
      if (current > longest) longest = current
    } else {
      current = 0
    }
    prevDate = ds
  }
  return longest
}

// Today's checked/total for marko_daily
function computeTodayPct(logs, todayStr) {
  const dayLog = logs[todayStr]
  if (!dayLog || !dayLog.items || dayLog.items.length === 0) return { checked: 0, total: 0, pct: 0 }
  const total = dayLog.items.length
  const checked = dayLog.items.filter(it => it.checked).length
  return { checked, total, pct: total > 0 ? Math.round((checked / total) * 100) : 0 }
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Pill({ children, color }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      background: `${color}18`,
      border: `1px solid ${color}40`,
      borderRadius: 999,
      padding: '4px 10px',
      fontFamily: 'Inter, sans-serif',
      fontSize: 11,
      fontWeight: 700,
      color,
      letterSpacing: '0.05em',
    }}>
      {children}
    </div>
  )
}

function StatBlock({ accent, label, value, delta }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0d0d28 0%, #0a0a24 100%)',
      border: '1px solid #1d1d4a',
      boxShadow: '0 0 0 1px rgba(139,92,246,0.1), inset 0 1px 0 rgba(139,92,246,0.05)',
      borderTop: `2px solid ${accent}`,
      padding: 16,
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ ...LABEL_STYLE, marginBottom: 8 }}>{label}</div>
      <div style={{
        fontFamily: '"Orbitron", "Space Grotesk", sans-serif',
        fontWeight: 900,
        textTransform: 'uppercase',
        fontSize: 40,
        lineHeight: 1,
        color: accent,
        marginBottom: 6,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: 10,
        color: MUTED,
        letterSpacing: '0.05em',
      }}>
        {delta}
      </div>
    </div>
  )
}

function GraphBox({ title, footer, children }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0d0d28 0%, #0a0a24 100%)',
      border: '1px solid #1d1d4a',
      boxShadow: '0 0 0 1px rgba(139,92,246,0.1), inset 0 1px 0 rgba(139,92,246,0.05)',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 220,
    }}>
      <div style={{ ...LABEL_STYLE, marginBottom: 12 }}>{title}</div>
      <div style={{ flex: 1, minHeight: 120 }}>
        {children}
      </div>
      <div style={{
        marginTop: 12,
        fontFamily: 'Inter, sans-serif',
        fontSize: 10,
        color: TEXT2,
      }}>
        {footer}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: 100,
      fontFamily: 'Inter, sans-serif',
      fontSize: 10,
      color: MUTED,
      letterSpacing: '0.1em',
    }}>
      START LOGGING TO SEE DATA
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function Record() {
  // ── localStorage reads ──────────────────────────────────────────────────────
  const [dailyData] = useLocalStorage('marko_daily', { logs: {}, nonNegotiables: [], taskTemplates: [] })
  const [bodyData]  = useLocalStorage('marko_body',  { currentWeight: null, weightHistory: [], prs: {} })
  const [dietData]  = useLocalStorage('marko_diet',  { targets: { calories: 2000, protein: 150 }, history: [] })
  const [bizData]   = useLocalStorage('marko_business', { deals: [], revenueHistory: [] })

  // ── Derived values ──────────────────────────────────────────────────────────
  const todayStr    = today()
  const now         = new Date()
  const dateDisplay = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()

  const logs = dailyData.logs || {}

  // Streak
  const streak        = computeStreak(logs)
  const longestStreak = computeLongestStreak(logs)

  // Today %
  const { checked: todayChecked, total: todayTotal, pct: todayPct } = computeTodayPct(logs, todayStr)

  // Body weight
  const currentWeight   = bodyData.currentWeight ?? null
  const weightHistory   = bodyData.weightHistory  || []

  // Calls this week (deals with status 'Appointment Set' created this week)
  const weekStart       = getWeekStart()
  const callsThisWeek   = (bizData.deals || []).filter(d => {
    if (d.status !== 'Appointment Set') return false
    const dealDate = new Date(d.date + 'T00:00:00')
    return dealDate >= weekStart
  }).length

  // Calories today
  const dietHistory     = dietData.history || []
  const calTarget       = dietData.targets?.calories || 2000
  const proteinTarget   = dietData.targets?.protein  || 150
  const todayDiet       = dietHistory.find(h => h.date === todayStr)
  const caloriesToday   = todayDiet?.calories ?? 0

  // ── Graph 1: Weight — last 14 days ─────────────────────────────────────────
  const weightData = (() => {
    const data = []
    for (let i = 13; i >= 0; i--) {
      const d  = daysAgoDate(i)
      const ds = dateStr(d)
      const entry = weightHistory.find(w => w.date === ds)
      data.push({
        day:    DAY_ABBR[d.getDay()],
        date:   ds,
        weight: entry ? parseFloat(entry.weight) : 0,
        isToday: ds === todayStr,
      })
    }
    return data
  })()
  const weightHasData   = weightData.some(d => d.weight > 0)
  const latestWeight    = currentWeight ?? (weightHasData ? [...weightData].reverse().find(d => d.weight > 0)?.weight : null)
  const firstWeightDate = weightHasData ? weightData.find(d => d.weight > 0)?.date : null
  const lastWeightDate  = weightHasData ? [...weightData].reverse().find(d => d.weight > 0)?.date : null

  // ── Graph 2: Calls — this month ─────────────────────────────────────────────
  const monthStart    = getMonthStart()
  const monthStartStr = dateStr(monthStart)
  const daysInMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const callsData = (() => {
    const data = []
    const deals = bizData.deals || []
    for (let d = 1; d <= daysInMonth; d++) {
      const ds   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const count = deals.filter(deal => deal.date === ds && deal.status === 'Appointment Set').length
      data.push({ day: String(d), date: ds, count })
    }
    return data
  })()
  const callsHasData    = callsData.some(d => d.count > 0)
  const callsMonthTotal = callsData.reduce((s, d) => s + d.count, 0)

  // ── Graph 3: Protein — last 7 days ─────────────────────────────────────────
  const proteinData = (() => {
    const data = []
    for (let i = 6; i >= 0; i--) {
      const d     = daysAgoDate(i)
      const ds    = dateStr(d)
      const entry = dietHistory.find(h => h.date === ds)
      data.push({
        day:     DAY_ABBR[d.getDay()],
        date:    ds,
        protein: entry ? (parseFloat(entry.protein) || 0) : 0,
      })
    }
    return data
  })()
  const proteinHasData = proteinData.some(d => d.protein > 0)
  const proteinVals    = proteinData.map(d => d.protein).filter(v => v > 0)
  const proteinAvg     = proteinVals.length > 0 ? Math.round(proteinVals.reduce((s, v) => s + v, 0) / proteinVals.length) : 0
  const firstProteinDate = proteinData.find(d => d.protein > 0)?.date
  const lastProteinDate  = [...proteinData].reverse().find(d => d.protein > 0)?.date

  // ── Graph 4: Daily Score — last 30 days ────────────────────────────────────
  const scoreData = (() => {
    const data = []
    for (let i = 29; i >= 0; i--) {
      const d   = daysAgoDate(i)
      const ds  = dateStr(d)
      const dayLog = logs[ds]
      let pct = 0
      if (dayLog && dayLog.items && dayLog.items.length > 0) {
        const total   = dayLog.items.length
        const checked = dayLog.items.filter(it => it.checked).length
        pct = Math.round((checked / total) * 100)
      }
      data.push({
        day:      DAY_ABBR[d.getDay()],
        date:     ds,
        score:    pct,
        opacity:  0.2 + (0.8 * (29 - i) / 29), // increases toward today
        isToday:  ds === todayStr,
      })
    }
    return data
  })()
  const scoreHasData  = scoreData.some(d => d.score > 0)
  const scoreVals     = scoreData.map(d => d.score).filter(v => v > 0)
  const scoreAvg      = scoreVals.length > 0 ? Math.round(scoreVals.reduce((s, v) => s + v, 0) / scoreVals.length) : 0
  const firstScoreDate = scoreData.find(d => d.score > 0)?.date
  const lastScoreDate  = [...scoreData].reverse().find(d => d.score > 0)?.date

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: BG,
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
    }}>
      {/* ── TopBar ── */}
      <div style={{
        background: SURF,
        borderBottom: `1px solid ${CARD_BORDER}`,
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{ ...LABEL_STYLE }}>{dateDisplay}</div>
          <div style={{
            fontFamily: '"Orbitron", sans-serif',
            fontWeight: 900,
            fontSize: 22,
            textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #8b5cf6, #22d3ee)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1,
          }}>
            THE RECORD
          </div>
        </div>

        {/* Right: pills */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Pill color={GOLD}>🔥 {streak}d</Pill>
          <Pill color={CYAN}>{todayTotal > 0 ? `${todayPct}%` : '—'}</Pill>
        </div>
      </div>

      {/* ── 4 Stat Blocks ── */}
      <div style={{
        display: 'flex',
        gap: 1,
        flexShrink: 0,
      }}>
        <StatBlock
          accent={GOLD}
          label="DAY STREAK"
          value={streak}
          delta={`longest: ${longestStreak}d`}
        />
        <StatBlock
          accent={CYAN}
          label="BODY WEIGHT"
          value={latestWeight != null ? `${latestWeight}` : '—'}
          delta={latestWeight != null ? 'kg' : '—'}
        />
        <StatBlock
          accent={GREEN}
          label="CALLS BOOKED"
          value={callsThisWeek}
          delta="goal: 10/wk"
        />
        <StatBlock
          accent={PURPLE}
          label="CALORIES TODAY"
          value={caloriesToday > 0 ? caloriesToday : '—'}
          delta={`target: ${calTarget}kcal`}
        />
      </div>

      {/* ── 2×2 Graph Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 1,
        flex: 1,
      }}>

        {/* Graph 1: Weight — 14 days */}
        <GraphBox
          title="WEIGHT — 14 DAYS"
          footer={
            weightHasData
              ? `${firstWeightDate ?? '—'} → ${lastWeightDate ?? '—'}`
              : 'no data'
          }
        >
          {weightHasData ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={weightData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                  <XAxis
                    dataKey="day"
                    tick={{ fill: TEXT2, fontSize: 9, fontFamily: 'Inter' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: TEXT2, fontSize: 9, fontFamily: 'Inter' }}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip {...TOOLTIP_PROPS} />
                  <Bar dataKey="weight" radius={[1, 1, 0, 0]}>
                    {weightData.map((entry, i) => (
                      <Cell key={i} fill={entry.isToday ? GOLD : CYAN} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{
                ...HEADING_STYLE,
                fontSize: 24,
                color: CYAN,
                marginTop: 4,
              }}>
                {latestWeight != null ? `${latestWeight} kg` : '—'}
              </div>
            </>
          ) : (
            <EmptyState />
          )}
        </GraphBox>

        {/* Graph 2: Calls — this month */}
        <GraphBox
          title="CALLS — THIS MONTH"
          footer={
            callsHasData
              ? `${monthStartStr} → ${todayStr}`
              : 'no data'
          }
        >
          {callsHasData ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={callsData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                  <XAxis
                    dataKey="day"
                    tick={{ fill: TEXT2, fontSize: 8, fontFamily: 'Inter' }}
                    axisLine={false}
                    tickLine={false}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fill: TEXT2, fontSize: 9, fontFamily: 'Inter' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip {...TOOLTIP_PROPS} />
                  <Bar dataKey="count" fill={GREEN} radius={[1, 1, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{
                ...HEADING_STYLE,
                fontSize: 24,
                color: GREEN,
                marginTop: 4,
              }}>
                {callsMonthTotal}
              </div>
            </>
          ) : (
            <EmptyState />
          )}
        </GraphBox>

        {/* Graph 3: Protein — last 7 days */}
        <GraphBox
          title="PROTEIN — LAST 7 DAYS"
          footer={
            proteinHasData
              ? `${firstProteinDate ?? '—'} → ${lastProteinDate ?? '—'}`
              : 'no data'
          }
        >
          {proteinHasData ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={proteinData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                  <XAxis
                    dataKey="day"
                    tick={{ fill: TEXT2, fontSize: 9, fontFamily: 'Inter' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: TEXT2, fontSize: 9, fontFamily: 'Inter' }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 'auto']}
                  />
                  <Tooltip {...TOOLTIP_PROPS} />
                  <Bar dataKey="protein" fill={PURPLE} radius={[1, 1, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{
                ...HEADING_STYLE,
                fontSize: 24,
                color: PURPLE,
                marginTop: 4,
              }}>
                avg {proteinAvg}g
              </div>
            </>
          ) : (
            <EmptyState />
          )}
        </GraphBox>

        {/* Graph 4: Daily Score — last 30 days */}
        <GraphBox
          title="DAILY SCORE — LAST 30 DAYS"
          footer={
            scoreHasData
              ? `${firstScoreDate ?? '—'} → ${lastScoreDate ?? '—'}`
              : 'no data'
          }
        >
          {scoreHasData ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={scoreData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                  <XAxis
                    dataKey="day"
                    tick={{ fill: TEXT2, fontSize: 8, fontFamily: 'Inter' }}
                    axisLine={false}
                    tickLine={false}
                    interval={6}
                  />
                  <YAxis
                    tick={{ fill: TEXT2, fontSize: 9, fontFamily: 'Inter' }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip {...TOOLTIP_PROPS} />
                  <Bar dataKey="score" radius={[1, 1, 0, 0]}>
                    {scoreData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={GOLD}
                        fillOpacity={entry.opacity}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{
                ...HEADING_STYLE,
                fontSize: 24,
                color: GOLD,
                marginTop: 4,
              }}>
                avg {scoreAvg}%
              </div>
            </>
          ) : (
            <EmptyState />
          )}
        </GraphBox>

      </div>
    </div>
  )
}
