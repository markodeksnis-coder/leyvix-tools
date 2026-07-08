import { useState, useMemo, useEffect } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { today } from '../utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getWinHistory, computeCurrentWinStreak, computeLongestWinStreak, computeCurrentLossStreak, getWinDaySettings } from '../utils/winLoss'
import { Trophy } from 'lucide-react'
import WeeklyReview from '../components/WeeklyReview'

// ─── Design tokens ────────────────────────────────────────────────────────────
const GOLD   = '#f0c040'
const INDIGO = '#818cf8'
const VIOLET = '#a78bfa'
const CYAN   = '#22d3ee'
const TEAL   = '#2dd4bf'
const GREEN  = '#10b981'
const RED    = '#ff5555'
const PINK   = '#e879f9'
const BLUE   = '#60a5fa'
const TEXT1  = '#e2e8f0'
const TEXT2  = '#94a3b8'
const MUTED  = '#64748b'
const DARK   = '#334155'

const WIN_GOLD  = GOLD
const LOSS_RED  = RED

const CARD_STYLE = {
  background: 'rgba(8,12,26,0.65)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(99,102,241,0.18)',
  borderRadius: 16,
}

const LABEL_STYLE = {
  fontFamily: '"Orbitron", monospace',
  fontSize: 9,
  fontWeight: 700,
  color: MUTED,
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
  marginBottom: 12,
}

const TOOLTIP_PROPS = {
  contentStyle: {
    background: 'rgba(8,12,26,0.9)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 8,
    fontSize: 10,
    fontFamily: 'Inter, sans-serif',
    color: TEXT2,
  },
  labelStyle: { color: TEXT2 },
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
      padding: '5px 12px',
      fontFamily: '"Orbitron", monospace',
      fontSize: 10,
      fontWeight: 700,
      color,
      letterSpacing: '0.08em',
    }}>
      {children}
    </div>
  )
}

function StatBlock({ accent, label, value, delta, valueFontOverride }) {
  return (
    <div style={{
      ...CARD_STYLE,
      borderTop: `2px solid ${accent}`,
      padding: '18px 16px 14px',
      flex: 1,
      minWidth: 0,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* subtle glow behind value */}
      <div style={{
        position: 'absolute',
        top: -20,
        right: -20,
        width: 80,
        height: 80,
        background: `${accent}14`,
        borderRadius: '50%',
        filter: 'blur(20px)',
        pointerEvents: 'none',
      }} />
      <div style={{ ...LABEL_STYLE, marginBottom: 8 }}>{label}</div>
      <div style={{
        fontFamily: valueFontOverride ?? '"Barlow Condensed", sans-serif',
        fontWeight: 900,
        fontSize: 48,
        lineHeight: 1,
        color: accent,
        textShadow: `0 0 24px ${accent}55`,
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
      ...CARD_STYLE,
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 230,
    }}>
      <div style={{ ...LABEL_STYLE }}>{title}</div>
      <div style={{ flex: 1, minHeight: 120 }}>
        {children}
      </div>
      <div style={{
        marginTop: 10,
        fontFamily: 'Inter, sans-serif',
        fontSize: 10,
        color: MUTED,
        letterSpacing: '0.04em',
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
      fontFamily: '"Orbitron", monospace',
      fontSize: 9,
      color: MUTED,
      letterSpacing: '0.2em',
    }}>
      START LOGGING TO SEE DATA
    </div>
  )
}

function TrophyCard({ label, value, unit, date, accent = GOLD }) {
  if (value === null || value === undefined || value === 0) return null
  return (
    <div style={{
      ...CARD_STYLE,
      borderTop: `2px solid ${accent}`,
      padding: 18,
      position: 'relative',
      minWidth: 0,
      overflow: 'hidden',
    }}>
      {/* glow */}
      <div style={{
        position: 'absolute',
        top: -10,
        right: -10,
        width: 60,
        height: 60,
        background: `${accent}18`,
        borderRadius: '50%',
        filter: 'blur(16px)',
        pointerEvents: 'none',
      }} />
      <Trophy size={13} color={accent} style={{ position: 'absolute', top: 14, right: 14, opacity: 0.8 }} />
      <div style={{ ...LABEL_STYLE, marginBottom: 8, color: MUTED }}>{label}</div>
      <div style={{
        fontFamily: '"Barlow Condensed", sans-serif',
        fontWeight: 900,
        fontSize: 38,
        color: accent,
        lineHeight: 1,
        textShadow: `0 0 20px ${accent}44`,
      }}>
        {value}{unit ? <span style={{ fontSize: 16, marginLeft: 4, color: MUTED }}>{unit}</span> : null}
      </div>
      {date && (
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: MUTED, marginTop: 6 }}>{date}</div>
      )}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function Record() {
  // ── View toggle ─────────────────────────────────────────────────────────────
  const [view, setView] = useState('dashboard')

  // ── Weekly review modal state ────────────────────────────────────────────────
  const [showWeeklyReview, setShowWeeklyReview] = useState(false)

  // ── PR celebration state ─────────────────────────────────────────────────────
  const [celebrating, setCelebrating] = useState(null) // { name, value, unit }

  // ── Heatmap hover state ──────────────────────────────────────────────────────
  const [heatmapTooltip, setHeatmapTooltip] = useState(null) // { x, y, ds, score, isWin }

  // ── localStorage reads ──────────────────────────────────────────────────────
  const [dailyData] = useLocalStorage('marko_daily', { logs: {}, nonNegotiables: [], taskTemplates: [] })
  const [bodyData]  = useLocalStorage('marko_body',  { currentWeight: null, weightHistory: [], prs: {} })
  const [dietData]  = useLocalStorage('marko_diet',  { targets: { calories: 2000, protein: 150 }, history: [] })
  const [bizData]   = useLocalStorage('marko_business', { deals: [], revenueHistory: [] })

  // ── Win/Loss state ──────────────────────────────────────────────────────────
  const [hoveredDay, setHoveredDay] = useState(null)

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

  // ── Win streak computations ─────────────────────────────────────────────────
  const winSettings      = getWinDaySettings()
  const winHistory30     = getWinHistory(30, winSettings, dailyData, bodyData, dietData)
  const winStreak        = computeCurrentWinStreak(winHistory30)
  const longestWinStreak = computeLongestWinStreak(winSettings, dailyData, bodyData, dietData)
  const lossStreak       = computeCurrentLossStreak(winHistory30)

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

  // ── Weekly Review banner logic ──────────────────────────────────────────────
  const isSunday = new Date().getDay() === 0
  const weeklyReviews = JSON.parse(localStorage.getItem('marko_weekly_review') || '[]')
  const thisMonday = (() => { const d = new Date(); const dow = d.getDay(); d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1)); return d.toISOString().split('T')[0] })()
  const reviewDoneThisWeek = weeklyReviews.some(r => r.weekStartDate === thisMonday)
  const showWeeklyBanner = isSunday && !reviewDoneThisWeek

  // ── Goals widget ────────────────────────────────────────────────────────────
  const rawGoals = JSON.parse(localStorage.getItem('marko_goals') || '[]')
  const activeGoals = rawGoals.filter(g => !g.archived).sort((a, b) => new Date(a.endDate) - new Date(b.endDate))

  // ── Journal / Reflection preview ────────────────────────────────────────────
  const journal = JSON.parse(localStorage.getItem('marko_journal') || '[]')
  const lastJournalEntry = [...journal].sort((a, b) => b.date.localeCompare(a.date))[0] || null

  // ── Records view computations ───────────────────────────────────────────────
  const prs = bodyData.prs || {}
  const lowestWeight = weightHistory.length > 0
    ? Math.min(...weightHistory.map(w => parseFloat(w.weight)).filter(v => !isNaN(v)))
    : null

  const highestProtein = dietHistory.length > 0
    ? Math.max(...dietHistory.map(h => parseFloat(h.protein) || 0))
    : null

  const highestCalAccuracy = dietHistory.length > 0
    ? Math.max(...dietHistory.map(h => {
        const c = parseFloat(h.calories) || 0
        return c > 0 ? Math.round(Math.min(c, calTarget) / calTarget * 100) : 0
      }))
    : null

  const allDates = Object.keys(logs).sort()

  const highestDayScore = (() => {
    let max = 0; let maxDate = null
    for (const [ds, log] of Object.entries(logs)) {
      if (!log?.items?.length) continue
      const pct = Math.round(log.items.filter(i => i.checked).length / log.items.length * 100)
      if (pct > max) { max = pct; maxDate = ds }
    }
    return { value: max, date: maxDate }
  })()

  const mostTasksDay = (() => {
    let max = 0; let maxDate = null
    for (const [ds, log] of Object.entries(logs)) {
      const tasks = (log?.items || []).filter(i => !i.isNonNeg && i.checked).length
      if (tasks > max) { max = tasks; maxDate = ds }
    }
    return { value: max, date: maxDate }
  })()

  const longestNNStreak = (() => {
    let longest = 0, current = 0, prevDate = null
    for (const ds of allDates) {
      const log = logs[ds]; if (!log?.items) { current = 0; prevDate = null; continue }
      const nn = log.items.filter(i => i.isNonNeg)
      const allDone = nn.length > 0 && nn.every(i => i.checked)
      if (allDone) {
        if (prevDate) {
          const diff = Math.round((new Date(ds + 'T12:00:00') - new Date(prevDate + 'T12:00:00')) / 86400000)
          current = diff === 1 ? current + 1 : 1
        } else current = 1
        if (current > longest) longest = current
      } else current = 0
      prevDate = ds
    }
    return longest
  })()

  const bizDeals = bizData.deals || []
  const maxCallsDay = (() => {
    const byDate = {}
    bizDeals.forEach(d => { byDate[d.date] = (byDate[d.date] || 0) + 1 })
    return Math.max(0, ...Object.values(byDate))
  })()
  const maxApptDay = (() => {
    const apptDeals = bizDeals.filter(d => d.status === 'Appointment Set')
    const byDate = {}
    apptDeals.forEach(d => { byDate[d.date] = (byDate[d.date] || 0) + 1 })
    return Math.max(0, ...Object.values(byDate))
  })()

  const longestWinStreakVal = computeLongestWinStreak(winSettings, dailyData, bodyData, dietData)

  // ── PR celebration effect ────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('marko_records_cache') || '{}')
      const current = {
        bench: prs.bench || 0,
        squat: prs.squat || 0,
        deadlift: prs.deadlift || 0,
        winStreak: longestWinStreakVal,
        dayScore: highestDayScore.value,
        protein: highestProtein || 0,
      }
      const newRecord = Object.entries(current).find(([k, v]) => v > (cached[k] || 0))
      if (newRecord) {
        const nameMap = { bench: 'Bench Press PR', squat: 'Squat PR', deadlift: 'Deadlift PR', winStreak: 'Win Streak', dayScore: 'Day Score', protein: 'Protein Intake' }
        const unitMap = { bench: 'kg', squat: 'kg', deadlift: 'kg', winStreak: 'd', dayScore: '%', protein: 'g' }
        setCelebrating({ name: nameMap[newRecord[0]], value: newRecord[1], unit: unitMap[newRecord[0]] })
        localStorage.setItem('marko_records_cache', JSON.stringify(current))
        setTimeout(() => setCelebrating(null), 3000)
      } else {
        localStorage.setItem('marko_records_cache', JSON.stringify(current))
      }
    } catch {}
  }, [prs.bench, prs.squat, prs.deadlift, longestWinStreakVal, highestDayScore.value, highestProtein])

  // ── Heatmap computations ─────────────────────────────────────────────────────
  const checkinData = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('marko_checkin') || '{}') } catch { return {} }
  }, [])
  const morningCheckins = checkinData.morning || {}
  const eveningCheckins = checkinData.evening || {}

  function getDayScore(ds) {
    const m = morningCheckins[ds]?.answers
    const e = eveningCheckins[ds]?.answers
    if (m?.me6 != null && e?.ed1 != null) return (m.me6 + e.ed1) / 2
    if (e?.ed1 != null) return e.ed1
    if (m?.me6 != null) return m.me6
    return null
  }

  function scoreToColor(s) {
    if (s === null) return '#080e1a'
    if (s <= 3) return '#7f1d1d'
    if (s <= 5) return 'rgba(239,68,68,0.5)'
    if (s <= 7) return '#92740a'
    if (s <= 8) return '#f0c040'
    return '#1ad9a0'
  }

  const year = now.getFullYear()
  const yearStart = new Date(year, 0, 1)

  const { heatmapGrid, monthLabels } = useMemo(() => {
    const startOffset = yearStart.getDay() === 0 ? 6 : yearStart.getDay() - 1
    const gridStart = new Date(yearStart)
    gridStart.setDate(gridStart.getDate() - startOffset)

    // Build 53 weeks
    const weeks = []
    const mLabels = [] // { col, label }
    let lastMonth = -1

    for (let col = 0; col < 53; col++) {
      const week = []
      for (let row = 0; row < 7; row++) {
        const d = new Date(gridStart)
        d.setDate(d.getDate() + col * 7 + row)
        const ds = d.toISOString().split('T')[0]
        const inYear = d.getFullYear() === year
        week.push({ ds, inYear, d: new Date(d) })

        if (inYear && row === 0) {
          const m = d.getMonth()
          if (m !== lastMonth) {
            mLabels.push({ col, label: d.toLocaleString('en-US', { month: 'short' }) })
            lastMonth = m
          }
        }
      }
      weeks.push(week)
    }
    return { heatmapGrid: weeks, monthLabels: mLabels }
  }, [year])

  // DOW averages for heatmap insights
  const { bestDow, worstDow, longestHighStreak, patternInsight } = useMemo(() => {
    const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dowScores = [0, 1, 2, 3, 4, 5, 6].map(dow => {
      const scores = []
      const d = new Date(yearStart)
      while (d.getFullYear() === year) {
        if (d.getDay() === dow) {
          const ds = d.toISOString().split('T')[0]
          const s = getDayScore(ds)
          if (s !== null) scores.push(s)
        }
        d.setDate(d.getDate() + 1)
      }
      return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    })

    const nonZero = dowScores.filter(s => s > 0)
    const bestDowIdx = dowScores.indexOf(Math.max(...dowScores))
    const worstDowIdx = nonZero.length > 0
      ? dowScores.indexOf(Math.min(...nonZero))
      : 0
    const bestDow = DOW_NAMES[bestDowIdx]
    const worstDow = DOW_NAMES[worstDowIdx]

    // Longest streak of days above 7
    let longestHighStreak = 0
    let curHigh = 0
    const yearEnd = new Date(year, 11, 31)
    const d2 = new Date(yearStart)
    while (d2 <= yearEnd) {
      const ds = d2.toISOString().split('T')[0]
      const s = getDayScore(ds)
      if (s !== null && s > 7) {
        curHigh++
        if (curHigh > longestHighStreak) longestHighStreak = curHigh
      } else {
        curHigh = 0
      }
      d2.setDate(d2.getDate() + 1)
    }

    // Pattern insight
    let patternInsight = 'Keep logging to reveal patterns.'
    if (nonZero.length > 0) {
      const best = DOW_NAMES[bestDowIdx]
      const worst = DOW_NAMES[worstDowIdx]
      patternInsight = `Your highest energy is on ${best}s. Watch out for ${worst}s — your lowest average.`
    }

    return { bestDow, worstDow, longestHighStreak, patternInsight }
  }, [heatmapGrid])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: 'transparent',
      minHeight: '100%',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
    }}>
      {/* ── Page Header ── */}
      <div style={{
        ...CARD_STYLE,
        borderRadius: 0,
        borderLeft: 'none',
        borderRight: 'none',
        borderTop: 'none',
        borderBottom: '1px solid rgba(99,102,241,0.18)',
        background: 'rgba(8,12,26,0.80)',
        padding: '0 20px 0',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* top accent line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${GOLD}, ${VIOLET}, transparent)`,
        }} />

        <div style={{ paddingTop: 16, paddingBottom: 12, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ ...LABEL_STYLE, marginBottom: 0 }}>{dateDisplay}</div>
            <div style={{
              fontFamily: '"Orbitron", monospace',
              fontWeight: 900,
              fontSize: 26,
              textTransform: 'uppercase',
              color: GOLD,
              textShadow: `0 0 32px ${GOLD}66`,
              letterSpacing: '0.12em',
              lineHeight: 1,
            }}>
              RECORD
            </div>
            {/* View toggle */}
            <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
              {['dashboard', 'records', 'heatmap'].map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: view === v ? `2px solid ${GOLD}` : '2px solid transparent',
                    padding: '3px 0',
                    fontFamily: '"Orbitron", monospace',
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.2em',
                    color: view === v ? GOLD : MUTED,
                    cursor: 'pointer',
                    transition: 'color 0.15s, border-color 0.15s',
                  }}
                >
                  {v === 'dashboard' ? 'DASHBOARD' : v === 'records' ? 'RECORDS' : 'HEATMAP'}
                </button>
              ))}
            </div>
          </div>

          {/* Right: pills */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingBottom: 28 }}>
            <Pill color={GOLD}>🔥 {streak}d</Pill>
            <Pill color={CYAN}>{todayTotal > 0 ? `${todayPct}%` : '—'}</Pill>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* DASHBOARD VIEW                                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {view === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 14px 24px' }}>
          {/* Weekly Review Banner */}
          {showWeeklyBanner && (
            <div className="fade-up delay-0" style={{
              ...CARD_STYLE,
              borderLeft: `3px solid ${GOLD}`,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: `linear-gradient(135deg, rgba(240,192,64,0.08), rgba(240,192,64,0.03))`,
            }}>
              <div>
                <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 11, color: GOLD, letterSpacing: '0.12em', marginBottom: 4 }}>WEEKLY REVIEW READY</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: TEXT2 }}>Sunday review session — 10-15 minutes</div>
              </div>
              <button onClick={() => setShowWeeklyReview(true)} style={{
                padding: '9px 20px',
                background: `linear-gradient(135deg, ${GOLD}, #fb923c)`,
                color: '#000',
                border: 'none',
                borderRadius: 8,
                fontFamily: '"Orbitron", monospace',
                fontSize: 9,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                cursor: 'pointer',
              }}>
                Begin Review
              </button>
            </div>
          )}

          {/* ── 5 Stat Blocks ── */}
          <div className="fade-up delay-1" style={{ display: 'flex', gap: 10 }}>
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
              accent={VIOLET}
              label="CALORIES TODAY"
              value={caloriesToday > 0 ? caloriesToday : '—'}
              delta={`target: ${calTarget}kcal`}
            />
            <StatBlock
              accent={GOLD}
              label="WIN STREAK"
              value={winStreak}
              delta={`best: ${longestWinStreak}d`}
              valueFontOverride="'Barlow Condensed', sans-serif"
            />
          </div>

          {/* ── 30-Day Win Calendar ── */}
          <div className="fade-up delay-2" style={{
            ...CARD_STYLE,
            padding: '18px 20px',
          }}>
            <div style={{ ...LABEL_STYLE }}>30-DAY WIN CALENDAR</div>

            {/* Calendar grid + tooltip wrapper */}
            <div style={{ position: 'relative' }}>
              {/* Squares */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {winHistory30.map((day) => {
                  const isToday = day.date === todayStr
                  const hasData = day.available > 0

                  let bgColor
                  if (!hasData) {
                    bgColor = 'rgba(99,102,241,0.06)'
                  } else if (day.isWin) {
                    bgColor = WIN_GOLD
                  } else {
                    bgColor = 'rgba(255,85,85,0.6)'
                  }

                  return (
                    <div
                      key={day.date}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: bgColor,
                        border: isToday
                          ? `2px solid ${GOLD}`
                          : hasData && day.isWin
                            ? '1px solid rgba(240,192,64,0.3)'
                            : hasData
                              ? '1px solid rgba(255,85,85,0.25)'
                              : '1px solid rgba(99,102,241,0.12)',
                        cursor: 'default',
                        flexShrink: 0,
                        transition: 'opacity 0.1s',
                        boxShadow: isToday ? `0 0 8px ${GOLD}55` : hasData && day.isWin ? `0 0 6px ${GOLD}22` : 'none',
                      }}
                    />
                  )
                })}
              </div>

              {/* Hover tooltip */}
              {hoveredDay && (
                <div style={{
                  position: 'absolute',
                  top: 36,
                  left: 0,
                  zIndex: 10,
                  background: 'rgba(8,12,26,0.95)',
                  border: `1px solid ${hoveredDay.available > 0 && hoveredDay.isWin ? WIN_GOLD + '55' : hoveredDay.available > 0 ? LOSS_RED + '44' : 'rgba(99,102,241,0.2)'}`,
                  borderRadius: 10,
                  padding: '10px 14px',
                  pointerEvents: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  minWidth: 130,
                  backdropFilter: 'blur(12px)',
                }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: TEXT2, letterSpacing: '0.05em' }}>
                    {hoveredDay.date}
                  </div>
                  {hoveredDay.available > 0 ? (
                    <>
                      <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 20, color: hoveredDay.isWin ? WIN_GOLD : LOSS_RED, letterSpacing: '0.05em', textShadow: hoveredDay.isWin ? `0 0 12px ${WIN_GOLD}55` : `0 0 12px ${LOSS_RED}44` }}>
                        {hoveredDay.isWin ? 'WIN' : 'LOSS'}
                      </div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: MUTED }}>
                        {hoveredDay.pct}% score ({hoveredDay.passed}/{hoveredDay.available})
                      </div>
                    </>
                  ) : (
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: MUTED, letterSpacing: '0.05em' }}>
                      NO DATA
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Below calendar: Best Win Streak + Loss Streak */}
            <div style={{
              display: 'flex',
              gap: 24,
              marginTop: hoveredDay ? 62 : 16,
              alignItems: 'center',
              transition: 'margin-top 0.1s',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ ...LABEL_STYLE, marginBottom: 0 }}>BEST WIN STREAK</div>
                <div style={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 900,
                  fontSize: 52,
                  lineHeight: 1,
                  color: WIN_GOLD,
                  textShadow: `0 0 28px ${WIN_GOLD}66`,
                }}>
                  {longestWinStreak}d
                </div>
              </div>

              {lossStreak > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ ...LABEL_STYLE, marginBottom: 0 }}>LOSS STREAK</div>
                  <div style={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontWeight: 900,
                    fontSize: 52,
                    lineHeight: 1,
                    color: LOSS_RED,
                    textShadow: `0 0 28px ${LOSS_RED}55`,
                  }}>
                    {lossStreak}d
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── 2×2 Graph Grid ── */}
          <div className="fade-up delay-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

            {/* Graph 1: Weight — 14 days */}
            <GraphBox
              title="WEIGHT — 14 DAYS"
              footer={weightHasData ? `${firstWeightDate ?? '—'} → ${lastWeightDate ?? '—'}` : 'no data'}
            >
              {weightHasData ? (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={weightData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                      <XAxis dataKey="day" tick={{ fill: MUTED, fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: MUTED, fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                      <Tooltip {...TOOLTIP_PROPS} />
                      <Bar dataKey="weight" radius={[3, 3, 0, 0]}>
                        {weightData.map((entry, i) => (
                          <Cell key={i} fill={entry.isToday ? GOLD : CYAN} fillOpacity={entry.isToday ? 1 : 0.75} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 26, color: CYAN, marginTop: 4, textShadow: `0 0 16px ${CYAN}44` }}>
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
              footer={callsHasData ? `${monthStartStr} → ${todayStr}` : 'no data'}
            >
              {callsHasData ? (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={callsData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                      <XAxis dataKey="day" tick={{ fill: MUTED, fontSize: 8, fontFamily: 'Inter' }} axisLine={false} tickLine={false} interval={4} />
                      <YAxis tick={{ fill: MUTED, fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip {...TOOLTIP_PROPS} />
                      <Bar dataKey="count" fill={GREEN} radius={[3, 3, 0, 0]} fillOpacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 26, color: GREEN, marginTop: 4, textShadow: `0 0 16px ${GREEN}44` }}>
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
              footer={proteinHasData ? `${firstProteinDate ?? '—'} → ${lastProteinDate ?? '—'}` : 'no data'}
            >
              {proteinHasData ? (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={proteinData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                      <XAxis dataKey="day" tick={{ fill: MUTED, fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: MUTED, fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                      <Tooltip {...TOOLTIP_PROPS} />
                      <Bar dataKey="protein" fill={VIOLET} radius={[3, 3, 0, 0]} fillOpacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 26, color: VIOLET, marginTop: 4, textShadow: `0 0 16px ${VIOLET}44` }}>
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
              footer={scoreHasData ? `${firstScoreDate ?? '—'} → ${lastScoreDate ?? '—'}` : 'no data'}
            >
              {scoreHasData ? (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={scoreData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                      <XAxis dataKey="day" tick={{ fill: MUTED, fontSize: 8, fontFamily: 'Inter' }} axisLine={false} tickLine={false} interval={6} />
                      <YAxis tick={{ fill: MUTED, fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                      <Tooltip {...TOOLTIP_PROPS} />
                      <Bar dataKey="score" radius={[3, 3, 0, 0]}>
                        {scoreData.map((entry, i) => (
                          <Cell key={i} fill={GOLD} fillOpacity={entry.opacity * 0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 26, color: GOLD, marginTop: 4, textShadow: `0 0 16px ${GOLD}44` }}>
                    avg {scoreAvg}%
                  </div>
                </>
              ) : (
                <EmptyState />
              )}
            </GraphBox>

          </div>

          {/* ── Goals Widget ── */}
          {activeGoals.length > 0 && (
            <div className="fade-up delay-4" style={{ ...CARD_STYLE, padding: 18 }}>
              <div style={{ ...LABEL_STYLE }}>ACTIVE GOALS</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {activeGoals.slice(0, 2).map(g => {
                  const total = (new Date(g.endDate) - new Date(g.startDate)) / 86400000
                  const elapsed = (new Date() - new Date(g.startDate)) / 86400000
                  const pct = Math.min(100, Math.max(0, Math.round(elapsed / total * 100)))
                  const daysLeft = Math.ceil((new Date(g.endDate) - new Date()) / 86400000)
                  return (
                    <div key={g.id} style={{
                      flex: 1,
                      background: 'rgba(5,8,20,0.75)',
                      border: '1px solid rgba(99,102,241,0.18)',
                      borderRadius: 10,
                      padding: 14,
                    }}>
                      <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 15, color: TEXT1, marginBottom: 4 }}>{g.title}</div>
                      <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, color: GOLD, marginBottom: 10, letterSpacing: '0.15em' }}>{daysLeft > 0 ? `${daysLeft} DAYS LEFT` : 'OVERDUE'}</div>
                      <div style={{ height: 4, background: 'rgba(99,102,241,0.15)', borderRadius: 2, position: 'relative' }}>
                        <div style={{ height: 4, background: `linear-gradient(90deg, ${GOLD}, #fb923c)`, borderRadius: 2, width: `${pct}%`, boxShadow: `0 0 8px ${GOLD}44` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Latest Reflection ── */}
          {lastJournalEntry && (
            <div className="fade-up delay-5" style={{
              ...CARD_STYLE,
              padding: 18,
              borderLeft: `3px solid ${lastJournalEntry.isWin ? GOLD : RED}`,
              background: lastJournalEntry.isWin
                ? 'rgba(240,192,64,0.05)'
                : 'rgba(255,85,85,0.05)',
              border: lastJournalEntry.isWin
                ? '1px solid rgba(240,192,64,0.3)'
                : '1px solid rgba(255,85,85,0.25)',
            }}>
              <div style={{ ...LABEL_STYLE }}>LATEST REFLECTION</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 20, color: GOLD, textShadow: `0 0 12px ${GOLD}44` }}>DAY {String(lastJournalEntry.dayNumber).padStart(3, '0')}</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: TEXT2 }}>{lastJournalEntry.date}</span>
                <span style={{
                  fontFamily: '"Orbitron", monospace',
                  fontSize: 8,
                  fontWeight: 700,
                  color: lastJournalEntry.isWin ? '#000' : '#fff',
                  background: lastJournalEntry.isWin ? GOLD : RED,
                  borderRadius: 5,
                  padding: '3px 9px',
                  letterSpacing: '0.12em',
                }}>{lastJournalEntry.isWin ? 'WIN' : 'LOSS'}</span>
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: TEXT2, lineHeight: 1.65, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {lastJournalEntry.aiReflection}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* RECORDS VIEW                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {view === 'records' && (
        <div style={{ padding: '18px 14px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Body Records */}
          <div className="fade-up delay-0">
            <div style={{ ...LABEL_STYLE }}>BODY RECORDS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <TrophyCard label="Bench Press PR" value={prs.bench} unit="kg" accent={GOLD} />
              <TrophyCard label="Squat PR" value={prs.squat} unit="kg" accent={GOLD} />
              <TrophyCard label="Deadlift PR" value={prs.deadlift} unit="kg" accent={GOLD} />
              <TrophyCard label="Lowest Weight" value={lowestWeight} unit="kg" accent={CYAN} />
              <TrophyCard label="Highest Single Protein" value={highestProtein} unit="g" accent={TEAL} />
              <TrophyCard label="Best Calorie Accuracy" value={highestCalAccuracy} unit="%" accent={GREEN} />
            </div>
          </div>
          {/* Streak Records */}
          <div className="fade-up delay-1">
            <div style={{ ...LABEL_STYLE }}>STREAK RECORDS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <TrophyCard label="Longest Win Streak" value={longestWinStreakVal} unit="d" accent={GOLD} />
              <TrophyCard label="Longest Non-Neg Streak" value={longestNNStreak} unit="d" accent={VIOLET} />
              <TrophyCard label="Longest Day Streak" value={longestStreak} unit="d" accent={CYAN} />
            </div>
          </div>
          {/* Daily Performance */}
          <div className="fade-up delay-2">
            <div style={{ ...LABEL_STYLE }}>DAILY PERFORMANCE</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <TrophyCard label="Highest Day Score" value={highestDayScore.value > 0 ? highestDayScore.value : null} unit="%" date={highestDayScore.date} accent={GOLD} />
              <TrophyCard label="Most Tasks Done" value={mostTasksDay.value > 0 ? mostTasksDay.value : null} unit=" tasks" date={mostTasksDay.date} accent={GOLD} />
            </div>
          </div>
          {/* Business */}
          <div className="fade-up delay-3">
            <div style={{ ...LABEL_STYLE }}>BUSINESS RECORDS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <TrophyCard label="Most Appts in One Day" value={maxApptDay > 0 ? maxApptDay : null} accent={BLUE} />
              <TrophyCard label="Most Calls in One Day" value={maxCallsDay > 0 ? maxCallsDay : null} accent={BLUE} />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* HEATMAP VIEW                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {view === 'heatmap' && (
        <div style={{ padding: '18px 14px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="fade-up delay-0" style={{ ...LABEL_STYLE }}>{year} MOOD &amp; ENERGY HEATMAP</div>

          {/* Heatmap container */}
          <div className="fade-up delay-1" style={{ ...CARD_STYLE, padding: 18, position: 'relative', overflowX: 'auto' }}>
            {/* Month labels row */}
            <div style={{ display: 'flex', marginBottom: 6, position: 'relative', height: 14 }}>
              {monthLabels.map(({ col, label }) => (
                <div
                  key={`${col}-${label}`}
                  style={{
                    position: 'absolute',
                    left: col * 12,
                    fontFamily: '"Orbitron", monospace',
                    fontSize: 8,
                    color: MUTED,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                  }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Grid: 7 rows × 53 cols */}
            <div style={{ display: 'flex', gap: 2 }}>
              {heatmapGrid.map((week, col) => (
                <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {week.map(({ ds, inYear }, row) => {
                    const s = inYear ? getDayScore(ds) : null
                    const color = inYear ? scoreToColor(s) : 'transparent'
                    const dayLog = logs[ds]
                    const hasWinData = dayLog?.items?.length > 0
                    const isWinDay = hasWinData
                      ? winHistory30.find(w => w.date === ds)?.isWin
                      : undefined

                    return (
                      <div
                        key={ds}
                        title={inYear ? ds : undefined}
                        onMouseEnter={inYear ? (e) => {
                          setHeatmapTooltip({ ds, score: s, isWin: isWinDay })
                        } : undefined}
                        onMouseLeave={inYear ? () => setHeatmapTooltip(null) : undefined}
                        style={{
                          width: 10,
                          height: 10,
                          background: color,
                          borderRadius: 2,
                          cursor: inYear ? 'default' : 'default',
                          flexShrink: 0,
                          opacity: inYear ? 1 : 0,
                        }}
                      />
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Tooltip */}
            {heatmapTooltip && (
              <div style={{
                position: 'fixed',
                bottom: 80,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 100,
                background: 'rgba(8,12,26,0.95)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 10,
                padding: '10px 16px',
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                minWidth: 150,
                backdropFilter: 'blur(16px)',
              }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: TEXT2 }}>{heatmapTooltip.ds}</div>
                <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 22, color: heatmapTooltip.score !== null ? scoreToColor(heatmapTooltip.score) : MUTED }}>
                  {heatmapTooltip.score !== null ? `Score: ${heatmapTooltip.score.toFixed(1)}` : 'No data'}
                </div>
                {heatmapTooltip.isWin !== undefined && (
                  <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, fontWeight: 700, color: heatmapTooltip.isWin ? WIN_GOLD : LOSS_RED, letterSpacing: '0.15em' }}>
                    {heatmapTooltip.isWin ? 'WIN' : 'LOSS'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Color legend */}
          <div className="fade-up delay-2" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', paddingLeft: 4 }}>
            {[
              { color: 'rgba(99,102,241,0.06)', label: 'No data' },
              { color: '#7f1d1d', label: '1-3' },
              { color: 'rgba(239,68,68,0.5)', label: '4-5' },
              { color: '#92740a', label: '6-7' },
              { color: '#f0c040', label: '8' },
              { color: '#1ad9a0', label: '9-10' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, background: color, borderRadius: 2, border: '1px solid rgba(99,102,241,0.18)' }} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, color: MUTED }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Insight blocks */}
          <div className="fade-up delay-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            <div style={{ ...CARD_STYLE, padding: 18, borderTop: `2px solid ${GREEN}` }}>
              <div style={{ ...LABEL_STYLE, color: GREEN }}>BEST DAY OF WEEK</div>
              <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 40, color: GREEN, textShadow: `0 0 20px ${GREEN}44` }}>{bestDow}</div>
            </div>
            <div style={{ ...CARD_STYLE, padding: 18, borderTop: `2px solid ${RED}` }}>
              <div style={{ ...LABEL_STYLE, color: RED }}>WORST DAY OF WEEK</div>
              <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 40, color: RED, textShadow: `0 0 20px ${RED}44` }}>{worstDow}</div>
            </div>
            <div style={{ ...CARD_STYLE, padding: 18, borderTop: `2px solid ${GOLD}` }}>
              <div style={{ ...LABEL_STYLE, color: GOLD }}>LONGEST HIGH STREAK</div>
              <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 40, color: GOLD, textShadow: `0 0 20px ${GOLD}44` }}>{longestHighStreak}d</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: MUTED, marginTop: 4 }}>consecutive days above 7</div>
            </div>
            <div style={{ ...CARD_STYLE, padding: 18 }}>
              <div style={{ ...LABEL_STYLE }}>PATTERN</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: TEXT1, lineHeight: 1.6 }}>{patternInsight}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── PR Celebration Overlay ── */}
      {celebrating && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9000,
          background: 'rgba(5,8,20,0.97)',
          backdropFilter: 'blur(24px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
        }}>
          {/* accent ring */}
          <div style={{
            position: 'absolute',
            width: 280,
            height: 280,
            borderRadius: '50%',
            border: `1px solid ${GOLD}33`,
            boxShadow: `0 0 80px ${GOLD}22`,
          }} />
          <Trophy size={72} color={GOLD} style={{ filter: `drop-shadow(0 0 20px ${GOLD}88)` }} />
          <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 44, color: TEXT1, letterSpacing: '0.05em', textAlign: 'center', padding: '0 32px' }}>{celebrating.name}</div>
          <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 80, color: GOLD, lineHeight: 1, textShadow: `0 0 40px ${GOLD}88` }}>{celebrating.value}{celebrating.unit}</div>
          <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 14, color: GOLD, letterSpacing: '0.25em', textShadow: `0 0 24px ${GOLD}99` }}>NEW PERSONAL RECORD</div>
        </div>
      )}

      {/* ── Weekly Review Modal ── */}
      {showWeeklyReview && (
        <WeeklyReview
          onClose={() => setShowWeeklyReview(false)}
          dailyData={dailyData}
          bodyData={bodyData}
          dietData={dietData}
        />
      )}
    </div>
  )
}
