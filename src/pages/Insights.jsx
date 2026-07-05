import { useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { daysAgo, DATA_START_DATE } from '../utils'
import { getWinDaySettings, getWinHistory } from '../utils/winLoss'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine
} from 'recharts'

const GOLD   = '#f0c040'
const CYAN   = '#22d3ee'
const VIOLET = '#8b5cf6'
const GREEN  = '#1ad9a0'
const RED    = '#f43f5e'
const PINK   = '#e879f9'
const ORANGE = '#fb923c'
const BLUE   = '#818cf8'
const TEXT2  = '#94a3b8'

const CHART_TT = {
  contentStyle: {
    background: 'rgba(3,4,16,0.97)', border: '1px solid rgba(240,192,64,0.2)',
    borderRadius: 10, fontSize: 11, fontFamily: 'Inter', boxShadow: '0 0 24px rgba(240,192,64,0.15)',
  },
  labelStyle: { color: '#64748b', marginBottom: 3 },
  itemStyle: { color: '#e2e8f0' },
}

const MOOD_SCORE = { 'Excellent': 9, 'Good': 7, 'Neutral': 5, 'Low': 3, 'Very low': 1 }

function pearson(xs, ys) {
  if (xs.length < 3) return null
  const n = xs.length
  const mx = xs.reduce((a, b) => a + b) / n
  const my = ys.reduce((a, b) => a + b) / n
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0)
  const dx = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0))
  const dy = Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0))
  if (!dx || !dy) return null
  return num / (dx * dy)
}

// ─── GlowCard ────────────────────────────────────────────────────────────────
function GlowCard({ color = GOLD, children, extraStyle = {} }) {
  return (
    <div style={{
      background: 'rgba(4,6,20,0.65)',
      backdropFilter: 'blur(40px)',
      WebkitBackdropFilter: 'blur(40px)',
      border: `1px solid ${color}35`,
      borderRadius: 18,
      overflow: 'hidden',
      boxShadow: `0 0 40px ${color}10, 0 4px 32px rgba(0,0,0,0.6), inset 0 1px 0 ${color}12`,
      ...extraStyle,
    }}>
      <div style={{
        height: 1,
        background: `linear-gradient(90deg, transparent, ${color}CC, ${color}, ${color}CC, transparent)`,
        boxShadow: `0 0 12px ${color}80`,
      }} />
      <div style={{ padding: '20px 24px' }}>{children}</div>
    </div>
  )
}

// ─── Section header ──────────────────────────────────────────────────────────
function SectionHeader({ color, children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}` }} />
      <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 10, fontWeight: 700, color, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${color}40, transparent)` }} />
      {right && (
        <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{right}</span>
      )}
    </div>
  )
}

// ─── Stat tile ───────────────────────────────────────────────────────────────
function StatTile({ label, value, max = 10, color, delta, pctMode }) {
  const hasValue = value != null && value > 0
  const displayVal = hasValue ? (pctMode ? Math.round(value) : value.toFixed(1)) : null
  return (
    <div style={{
      padding: '18px 16px', borderRadius: 16,
      background: `${color}08`, backdropFilter: 'blur(32px)',
      border: `1px solid ${color}30`,
      boxShadow: `0 0 40px ${color}0C, inset 0 1px 0 ${color}10`,
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}80, transparent)` }} />
      <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 9, fontWeight: 700, color, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 40, color, filter: `drop-shadow(0 0 14px ${color}70)`, lineHeight: 1 }}>
        {displayVal !== null ? displayVal : '—'}
        {displayVal !== null && (
          <span style={{ fontSize: 15, opacity: 0.55, marginLeft: 2 }}>{pctMode ? '%' : `/${max}`}</span>
        )}
      </div>
      {delta !== undefined && delta !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontFamily: 'Inter', fontSize: 10, fontWeight: 700,
            color: delta >= 0 ? GREEN : RED,
            filter: `drop-shadow(0 0 6px ${delta >= 0 ? GREEN : RED}80)`,
          }}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}
          </span>
          <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#475569' }}>vs prior 7d</span>
        </div>
      )}
    </div>
  )
}

// ─── Recovery circle gauge ───────────────────────────────────────────────────
function RecoveryGauge({ value }) {
  const color = GREEN
  const size = 120, r = 44, cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  const safeVal = isNaN(value) ? 0 : value
  const pct = Math.min(1, safeVal / 100)
  const offset = circ * (1 - pct)
  const stateLabel = safeVal >= 85 ? 'PRIMED' : safeVal >= 70 ? 'CHARGED' : safeVal >= 50 ? 'STABLE' : safeVal > 0 ? 'DEGRADED' : 'NO DATA'
  const stateColor = safeVal >= 85 ? GREEN : safeVal >= 70 ? CYAN : safeVal >= 50 ? VIOLET : safeVal > 0 ? RED : '#334155'
  return (
    <div style={{
      padding: '16px', borderRadius: 16,
      background: `${color}08`, backdropFilter: 'blur(32px)',
      border: `1px solid ${color}30`,
      boxShadow: `0 0 40px ${color}0C, inset 0 1px 0 ${color}10`,
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}80, transparent)` }} />
      <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 9, fontWeight: 700, color, letterSpacing: '0.15em', textTransform: 'uppercase', alignSelf: 'flex-start' }}>RECOVERY</div>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={`${color}15`} strokeWidth={9} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={9}
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${color}80)` }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 38, color, filter: `drop-shadow(0 0 14px ${color}70)`, lineHeight: 1 }}>
            {safeVal === 0 ? '—' : Math.round(safeVal)}
          </span>
          {safeVal > 0 && <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#475569' }}>%</span>}
        </div>
      </div>
      <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, fontWeight: 700, color: stateColor, letterSpacing: '0.12em', filter: safeVal > 0 ? `drop-shadow(0 0 8px ${stateColor}80)` : 'none' }}>
        {stateLabel}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Insights() {
  const [checkInData] = useLocalStorage('marko_checkin', {})
  const [dailyData]   = useLocalStorage('marko_daily',   { logs: {} })
  const [bodyData]    = useLocalStorage('marko_body',    { liftSessions: [], workouts: [] })
  const [diet]        = useLocalStorage('marko_diet',    { targets: { calories: 2800 }, history: [] })

  const winSettings = getWinDaySettings()

  const dayCount = (() => {
    const start = localStorage.getItem('marko_app_start')
    if (!start) return 1
    return Math.max(1, Math.floor((Date.now() - new Date(start).getTime()) / 86400000) + 1)
  })()

  // Build checkLogs from marko_checkin
  const checkLogs = useMemo(() => {
    const result = {}
    Object.entries(checkInData.morning || {}).forEach(([ds, data]) => {
      if (!data?.answers) return
      const a = data.answers
      result[ds] = result[ds] || {}
      result[ds].morning = {
        energy: a['me6']  != null ? +a['me6']  : null,
        sleep:  a['ms2']  != null ? +a['ms2']  : null,
        mood:   a['mm11'] != null ? (MOOD_SCORE[a['mm11']] ?? 5) : null,
      }
    })
    Object.entries(checkInData.evening || {}).forEach(([ds, data]) => {
      if (!data?.answers) return
      const a = data.answers
      result[ds] = result[ds] || {}
      result[ds].evening = { stress: a['em19'] != null ? +a['em19'] : null }
    })
    return result
  }, [checkInData])

  // 30-day trend (filtered by DATA_START_DATE)
  const trend30 = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const ds = daysAgo(29 - i)
      if (ds < DATA_START_DATE) return null
      const log = checkLogs[ds] || {}
      const m = log.morning || {}
      const e = log.evening || {}
      return {
        date: ds.slice(5),
        energy: m.energy ?? null,
        mood:   m.mood   ?? null,
        sleep:  m.sleep  ?? null,
        stress: e.stress ?? null,
      }
    }).filter(d => d !== null && (d.energy != null || d.mood != null || d.sleep != null))
  }, [checkLogs])

  // 7-day pulse with deltas vs prior 7 (filtered by DATA_START_DATE)
  const pulse7 = useMemo(() => {
    const days7 = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i)).filter(ds => ds >= DATA_START_DATE)
    const prev7 = Array.from({ length: 7 }, (_, i) => daysAgo(13 - i)).filter(ds => ds >= DATA_START_DATE)
    const vals = { energy: [], mood: [], sleep: [], stress: [] }
    const prev = { energy: [], mood: [], sleep: [] }
    days7.forEach(ds => {
      const m = checkLogs[ds]?.morning || {}
      const e = checkLogs[ds]?.evening || {}
      if (m.energy != null) vals.energy.push(+m.energy)
      if (m.mood   != null) vals.mood.push(+m.mood)
      if (m.sleep  != null) vals.sleep.push(+m.sleep)
      if (e.stress != null) vals.stress.push(+e.stress)
    })
    prev7.forEach(ds => {
      const m = checkLogs[ds]?.morning || {}
      if (m.energy != null) prev.energy.push(+m.energy)
      if (m.mood   != null) prev.mood.push(+m.mood)
      if (m.sleep  != null) prev.sleep.push(+m.sleep)
    })
    const avg  = arr => arr.length ? arr.reduce((a, b) => a + b) / arr.length : 0
    const pavg = arr => arr.length ? arr.reduce((a, b) => a + b) / arr.length : null
    const recovery = (() => {
      const energyAvg = vals.energy.length ? avg(vals.energy) : null
      const sleepAvg  = vals.sleep.length  ? avg(vals.sleep)  : null
      if (energyAvg === null && sleepAvg === null) return 0
      const components = []
      if (energyAvg !== null) components.push(energyAvg / 10)
      if (sleepAvg  !== null) components.push(sleepAvg  / 10)
      return Math.round(components.reduce((a, b) => a + b) / components.length * 100)
    })()
    return {
      energy: avg(vals.energy), mood: avg(vals.mood),
      sleep: avg(vals.sleep), stress: avg(vals.stress), recovery,
      deltas: {
        energy: pavg(prev.energy) !== null ? avg(vals.energy) - pavg(prev.energy) : null,
        mood:   pavg(prev.mood)   !== null ? avg(vals.mood)   - pavg(prev.mood)   : null,
        sleep:  pavg(prev.sleep)  !== null ? avg(vals.sleep)  - pavg(prev.sleep)  : null,
      }
    }
  }, [checkLogs])

  // Win/Loss split analysis
  const winLossAnalysis = useMemo(() => {
    const history = getWinHistory(30, winSettings, dailyData, bodyData, diet)
    const logs = dailyData.logs || {}
    const winDays  = history.filter(d => d.isWin  && d.available > 0).map(d => d.date)
    const lossDays = history.filter(d => !d.isWin && d.available > 0).map(d => d.date)

    const METRICS = [
      { key: 'energy',      label: 'Energy',      color: GOLD,   invert: false },
      { key: 'dailyRating', label: 'Day Rating',  color: VIOLET, invert: false },
      { key: 'sleepHours',  label: 'Sleep Hours', color: CYAN,   invert: false },
      { key: 'dietQuality', label: 'Diet Quality',color: GREEN,  invert: false },
      { key: 'workOutput',  label: 'Work Focus',  color: BLUE,   invert: false },
      { key: 'stress',      label: 'Stress',      color: RED,    invert: true  },
      { key: 'bizHours',    label: 'Biz Hours',   color: ORANGE, invert: false },
      { key: 'salesCalls',  label: 'Sales Calls', color: PINK,   invert: false },
    ]

    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null

    const results = METRICS.map(m => {
      const winVals  = winDays.map(ds  => { const v = (logs[ds]  || {})[m.key]; return v != null ? +v : null }).filter(v => v != null)
      const lossVals = lossDays.map(ds => { const v = (logs[ds] || {})[m.key]; return v != null ? +v : null }).filter(v => v != null)
      const winAvg   = avg(winVals)
      const lossAvg  = avg(lossVals)
      const rawGap   = winAvg != null && lossAvg != null ? winAvg - lossAvg : null
      const gap      = m.invert && rawGap != null ? -rawGap : rawGap
      return { ...m, winAvg, lossAvg, gap, n: winVals.length + lossVals.length }
    }).filter(m => m.winAvg != null && m.lossAvg != null && m.n >= 3)

    let bottleneck = null
    if (results.length > 0) {
      const sorted = [...results].filter(m => m.gap != null).sort((a, b) => b.gap - a.gap)
      if (sorted.length > 0 && sorted[0].gap > 0) bottleneck = sorted[0]
    }

    return { results, bottleneck, winCount: winDays.length, lossCount: lossDays.length }
  }, [dailyData, bodyData, diet])

  // Weekly comparison (filtered by DATA_START_DATE)
  const weeklyComparison = useMemo(() => {
    const thisWeek = Array.from({ length: 7 }, (_, i) => daysAgo(i)).filter(ds => ds >= DATA_START_DATE)
    const lastWeek = Array.from({ length: 7 }, (_, i) => daysAgo(7 + i)).filter(ds => ds >= DATA_START_DATE)
    const logs = dailyData.logs || {}
    const METRICS = [
      { key: 'energy',      label: 'Energy',     color: GOLD   },
      { key: 'dailyRating', label: 'Day Rating', color: VIOLET },
      { key: 'dietQuality', label: 'Diet',       color: GREEN  },
      { key: 'workOutput',  label: 'Work Focus', color: BLUE   },
    ]
    const weekAvg = (days, key) => {
      const vals = days.map(ds => { const v = (logs[ds] || {})[key]; return v != null ? +v : null }).filter(v => v != null)
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    }
    return METRICS.map(m => ({
      ...m,
      thisWeek: weekAvg(thisWeek, m.key),
      lastWeek: weekAvg(lastWeek, m.key),
    })).filter(m => m.thisWeek != null || m.lastWeek != null)
  }, [dailyData])

  // Correlations (filtered by DATA_START_DATE)
  const correlations = useMemo(() => {
    const logs = dailyData.logs || {}
    const entries = Object.entries(logs).filter(([ds]) => ds >= DATA_START_DATE)
    const pairs = []
    const getPairs = (keyA, keyB) => entries
      .map(([, log]) => ({ a: log[keyA] != null ? +log[keyA] : null, b: log[keyB] != null ? +log[keyB] : null }))
      .filter(x => x.a != null && x.b != null)

    const tryAdd = (keyA, keyB, title, subtitle, color) => {
      const data = getPairs(keyA, keyB)
      if (data.length < 4) return
      const r = pearson(data.map(x => x.a), data.map(x => x.b))
      if (r !== null) pairs.push({ title, subtitle, r, confidence: Math.round(Math.abs(r) * 100), n: data.length, color })
    }

    tryAdd('sleepHours', 'energy',      'SLEEP HOURS → ENERGY',      'Longer sleep correlates with higher morning energy.', GOLD)
    tryAdd('sleepHours', 'dailyRating', 'SLEEP HOURS → DAY RATING',  'Sleep duration predicts how you rate your overall day.', VIOLET)
    tryAdd('stress',     'dailyRating', 'STRESS → DAY RATING',       'High stress days tend to score lower overall.', RED)
    tryAdd('bizHours',   'salesCalls',  'BIZ HOURS → SALES CALLS',   'Time in business vs prospecting output correlation.', BLUE)
    tryAdd('energy',     'salesCalls',  'ENERGY → SALES CALLS',      'Higher energy mornings and prospecting activity link.', PINK)
    tryAdd('energy',     'workOutput',  'ENERGY → WORK FOCUS',       'Morning energy predicting work output quality.', CYAN)

    return pairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
  }, [dailyData])

  // Diet compliance (filtered by DATA_START_DATE)
  const dietTrend = useMemo(() => {
    const target = diet.targets?.calories || 2800
    return Array.from({ length: 14 }, (_, i) => {
      const ds = daysAgo(13 - i)
      if (ds < DATA_START_DATE) return null
      const h = diet.history?.find(x => x.date === ds)
      return { date: ds.slice(5), pct: h ? Math.round((h.calories / target) * 100) : 0 }
    }).filter(d => d !== null)
  }, [diet])

  const hasLogs = Object.keys(checkLogs).length > 0 || Object.keys(dailyData.logs || {}).length > 0

  return (
    <div style={{ background: 'transparent', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── HEADER ── */}
      <div style={{
        borderBottom: '1px solid rgba(240,192,64,0.25)',
        padding: '22px 36px 18px',
        background: 'rgba(2,4,16,0.7)',
        backdropFilter: 'blur(40px)',
        position: 'relative', overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, #f0c040 20%, #e879f9 60%, #22d3ee 85%, transparent)', boxShadow: '0 0 14px rgba(240,192,64,0.5)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD, boxShadow: `0 0 8px ${GOLD}` }} />
              <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#475569', letterSpacing: '0.16em', textTransform: 'uppercase' }}>PATTERN INTELLIGENCE · 7D</span>
            </div>
            <h1 style={{ fontFamily: '"Orbitron", monospace', fontSize: 44, fontWeight: 900, lineHeight: 0.9, margin: 0, letterSpacing: '0.02em', background: 'linear-gradient(135deg, #f0c040 0%, #e879f9 55%, #22d3ee 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>INSIGHTS</h1>
            <p style={{ fontFamily: 'Inter', fontSize: 9, color: '#334155', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 6 }}>DECODE YOUR PATTERNS · FIND YOUR EDGE</p>
          </div>
          <div style={{ background: 'rgba(240,192,64,0.07)', border: '1px solid rgba(240,192,64,0.22)', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 32, color: GOLD, filter: `drop-shadow(0 0 14px ${GOLD}80)`, lineHeight: 1 }}>{dayCount}</span>
            <span style={{ fontFamily: 'Inter', fontSize: 8, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1.4 }}>DAYS<br/>ENGRAVED</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* No data state */}
        {!hasLogs && (
          <GlowCard color={VIOLET}>
            <div style={{ textAlign: 'center', padding: '32px 20px' }}>
              <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 28, color: VIOLET, letterSpacing: '0.04em', marginBottom: 10, filter: `drop-shadow(0 0 20px ${VIOLET}60)` }}>NO DATA YET</div>
              <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#475569', lineHeight: 1.6 }}>Complete morning and evening check-ins to unlock pattern detection.</p>
            </div>
          </GlowCard>
        )}

        {/* ── 7-DAY PULSE ── */}
        <GlowCard color={GOLD}>
          <SectionHeader color={GOLD} right="CURRENT VS PRIOR 7-DAY BASELINE">7-DAY PULSE</SectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            <StatTile label="ENERGY"     value={pulse7.energy} color={GOLD}   delta={pulse7.deltas.energy} />
            <StatTile label="MOOD"       value={pulse7.mood}   color={CYAN}   delta={pulse7.deltas.mood}   />
            <StatTile label="SLEEP QUAL" value={pulse7.sleep}  color={VIOLET} delta={pulse7.deltas.sleep}  />
            <StatTile label="STRESS"     value={pulse7.stress} color={RED}    />
            <RecoveryGauge value={pulse7.recovery} />
          </div>
        </GlowCard>

        {/* ── PERFORMANCE BOTTLENECK ── */}
        {winLossAnalysis.bottleneck && (() => {
          const bn = winLossAnalysis.bottleneck
          return (
            <div style={{
              background: 'rgba(4,6,20,0.65)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
              border: `1px solid ${RED}50`, borderRadius: 18, overflow: 'hidden',
              boxShadow: `0 0 60px ${RED}18, 0 4px 32px rgba(0,0,0,0.6), inset 0 1px 0 ${RED}15`,
            }}>
              <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${RED}CC, ${RED}, ${RED}CC, transparent)`, boxShadow: `0 0 12px ${RED}80` }} />
              <div style={{ padding: '20px 24px' }}>
                <SectionHeader color={RED}>PERFORMANCE BOTTLENECK</SectionHeader>
                <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#e2e8f0', fontWeight: 600, marginBottom: 20, lineHeight: 1.5 }}>
                  <span style={{ color: bn.color, fontWeight: 700 }}>{bn.label}</span> is your biggest differentiator between wins and losses
                </div>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                  <div style={{ padding: '14px 22px', borderRadius: 14, background: `${GOLD}0A`, border: `1px solid ${GOLD}30`, textAlign: 'center' }}>
                    <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 54, color: GOLD, filter: `drop-shadow(0 0 22px ${GOLD}60)`, lineHeight: 1 }}>{bn.winAvg?.toFixed(1)}</div>
                    <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, color: GOLD, fontWeight: 700, letterSpacing: '0.12em', marginTop: 5 }}>WIN DAYS</div>
                  </div>
                  <div style={{ fontSize: 22, color: '#1e293b', fontWeight: 900 }}>vs</div>
                  <div style={{ padding: '14px 22px', borderRadius: 14, background: `${RED}0A`, border: `1px solid ${RED}30`, textAlign: 'center' }}>
                    <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 54, color: RED, filter: `drop-shadow(0 0 22px ${RED}60)`, lineHeight: 1 }}>{bn.lossAvg?.toFixed(1)}</div>
                    <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, color: RED, fontWeight: 700, letterSpacing: '0.12em', marginTop: 5 }}>LOSS DAYS</div>
                  </div>
                  <div style={{ flex: 1, paddingLeft: 8 }}>
                    <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 34, color: RED, filter: `drop-shadow(0 0 16px ${RED}60)`, lineHeight: 1 }}>
                      +{bn.gap?.toFixed(1)} gap
                    </div>
                    <div style={{ fontFamily: 'Inter', fontSize: 10, color: '#334155', marginTop: 6 }}>
                      {winLossAnalysis.winCount}W / {winLossAnalysis.lossCount}L tracked days
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── WIN VS LOSS DAY ANALYSIS ── */}
        {winLossAnalysis.results.length > 0 && (
          <GlowCard color={GOLD}>
            <SectionHeader color={GOLD} right={`${winLossAnalysis.winCount}W · ${winLossAnalysis.lossCount}L ANALYZED`}>WIN VS LOSS DAY ANALYSIS</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {winLossAnalysis.results.map(m => {
                const maxVal = Math.max(m.winAvg || 0, m.lossAvg || 0, 1)
                const winPct  = ((m.winAvg  || 0) / maxVal) * 100
                const lossPct = ((m.lossAvg || 0) / maxVal) * 100
                const isTop = winLossAnalysis.bottleneck?.key === m.key
                return (
                  <div key={m.key} style={{
                    padding: '12px 16px', borderRadius: 14,
                    background: isTop ? `${RED}0A` : `${m.color}06`,
                    border: `1px solid ${isTop ? RED + '40' : m.color + '20'}`,
                    boxShadow: isTop ? `0 0 30px ${RED}10` : 'none',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isTop && <div style={{ width: 5, height: 5, borderRadius: '50%', background: RED, boxShadow: `0 0 8px ${RED}` }} />}
                        <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 9, fontWeight: 700, color: isTop ? RED : m.color, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                          {m.label}
                        </span>
                      </div>
                      <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 16, color: m.gap != null && m.gap > 0.05 ? GREEN : '#334155' }}>
                        {m.gap != null ? (m.gap > 0.05 ? `+${m.gap.toFixed(1)}` : m.gap.toFixed(1)) : '—'}
                      </span>
                    </div>
                    {[
                      { label: 'WIN',  pct: winPct,  val: m.winAvg,  color: GREEN },
                      { label: 'LOSS', pct: lossPct, val: m.lossAvg, color: RED   },
                    ].map(row => (
                      <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                        <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, fontWeight: 700, color: row.color, width: 30, letterSpacing: '0.08em' }}>{row.label}</span>
                        <div style={{ flex: 1, height: 5, background: 'rgba(15,25,60,0.8)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${row.pct}%`, background: row.color, borderRadius: 3, boxShadow: `0 0 8px ${row.color}88`, transition: 'width 0.6s ease' }} />
                        </div>
                        <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 17, color: row.color, width: 36, textAlign: 'right', filter: `drop-shadow(0 0 6px ${row.color}70)` }}>
                          {row.val?.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </GlowCard>
        )}

        {/* ── WEEKLY COMPARISON ── */}
        {weeklyComparison.length > 0 && (
          <GlowCard color={CYAN}>
            <SectionHeader color={CYAN} right="THIS WEEK VS LAST WEEK">WEEKLY COMPARISON</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {weeklyComparison.map(m => {
                const delta = m.thisWeek != null && m.lastWeek != null ? m.thisWeek - m.lastWeek : null
                const isUp = delta != null && delta > 0
                return (
                  <div key={m.key} style={{
                    padding: '16px 18px', borderRadius: 14,
                    background: `${m.color}08`, backdropFilter: 'blur(32px)',
                    border: `1px solid ${m.color}30`,
                    boxShadow: `0 0 30px ${m.color}0A, inset 0 1px 0 ${m.color}10`,
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${m.color}80, transparent)` }} />
                    <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 9, fontWeight: 700, color: m.color, letterSpacing: '0.15em', marginBottom: 8 }}>{m.label}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 38, color: m.color, filter: `drop-shadow(0 0 14px ${m.color}60)` }}>
                        {m.thisWeek != null ? m.thisWeek.toFixed(1) : '—'}
                      </span>
                      {delta != null && (
                        <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 700, color: isUp ? GREEN : RED, filter: `drop-shadow(0 0 8px ${isUp ? GREEN : RED}80)` }}>
                          {isUp ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#475569' }}>
                      Last week: <span style={{ color: TEXT2, fontWeight: 600 }}>{m.lastWeek != null ? m.lastWeek.toFixed(1) : '—'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </GlowCard>
        )}

        {/* ── 30-DAY TRENDS ── */}
        <GlowCard color={VIOLET}>
          <SectionHeader color={VIOLET} right="ENERGY · MOOD · SLEEP · STRESS">30-DAY TRENDS</SectionHeader>
          {trend30.length < 3 ? (
            <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#475569', textAlign: 'center', padding: '40px 0' }}>Log more days to see trends.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trend30} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    {[['ins_gE', GOLD], ['ins_gM', CYAN], ['ins_gS', VIOLET], ['ins_gSt', RED]].map(([id, c]) => (
                      <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={c} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={c} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#334155', fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis domain={[0, 10]} tick={{ fill: '#334155', fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} width={20} />
                  <Tooltip {...CHART_TT} />
                  <Area type="monotone" dataKey="energy" stroke={GOLD}   fill="url(#ins_gE)"  strokeWidth={2.5} dot={false} connectNulls />
                  <Area type="monotone" dataKey="mood"   stroke={CYAN}   fill="url(#ins_gM)"  strokeWidth={2.5} dot={false} connectNulls />
                  <Area type="monotone" dataKey="sleep"  stroke={VIOLET} fill="url(#ins_gS)"  strokeWidth={2.5} dot={false} connectNulls />
                  <Area type="monotone" dataKey="stress" stroke={RED}    fill="url(#ins_gSt)" strokeWidth={2.5} dot={false} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
                {[['ENERGY', GOLD], ['MOOD', CYAN], ['SLEEP QUAL', VIOLET], ['STRESS', RED]].map(([l, c]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 20, height: 2, background: c, borderRadius: 1, boxShadow: `0 0 5px ${c}80` }} />
                    <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, color: c, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{l}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </GlowCard>

        {/* ── CORRELATIONS ── */}
        {correlations.length > 0 && (
          <GlowCard color={BLUE}>
            <SectionHeader color={BLUE} right="AUTO-MINED FROM YOUR LOGS">CORRELATIONS DETECTED</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {correlations.map((c, i) => {
                const isMuted = Math.abs(c.r) < 0.3
                const corrColor = isMuted ? '#334155' : c.r > 0 ? GREEN : RED
                const borderColor = isMuted ? 'rgba(30,41,59,0.8)' : c.r > 0 ? `${GREEN}35` : `${RED}35`
                const bgGlow = isMuted ? 'transparent' : c.r > 0 ? `${GREEN}08` : `${RED}08`
                return (
                  <div key={i} style={{
                    padding: '16px 18px', borderRadius: 14,
                    background: bgGlow,
                    border: `1px solid ${borderColor}`,
                    boxShadow: isMuted ? 'none' : `0 0 30px ${corrColor}10`,
                    position: 'relative', overflow: 'hidden',
                  }}>
                    {!isMuted && (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${corrColor}80, transparent)` }} />
                    )}
                    <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 9, fontWeight: 700, color: isMuted ? '#334155' : c.color, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{c.title}</div>
                    <p style={{ fontFamily: 'Inter', fontSize: 11, color: '#475569', marginBottom: 14, lineHeight: 1.5 }}>{c.subtitle}</p>
                    <div style={{ display: 'flex', gap: 18, marginBottom: 12 }}>
                      {[
                        { label: 'EFFECT',     value: `r = ${c.r.toFixed(2)}`, color: corrColor },
                        { label: 'CONFIDENCE', value: `${c.confidence}%`,      color: isMuted ? '#475569' : 'white' },
                        { label: 'SAMPLE',     value: `n=${c.n}`,              color: '#475569' },
                      ].map(m => (
                        <div key={m.label}>
                          <div style={{ fontFamily: 'Inter', fontSize: 8, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{m.label}</div>
                          <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 16, color: m.color }}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ height: 5, background: 'rgba(10,14,30,0.8)', borderRadius: 3, border: `1px solid ${corrColor}20`, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', background: corrColor, borderRadius: 3,
                        width: `${c.confidence}%`,
                        boxShadow: isMuted ? 'none' : `0 0 10px ${corrColor}`,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </GlowCard>
        )}

        {/* ── NUTRITION COMPLIANCE ── */}
        {diet.history?.length > 3 && (
          <GlowCard color={GREEN}>
            <SectionHeader color={GREEN} right="LAST 14 DAYS">NUTRITION COMPLIANCE</SectionHeader>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={dietTrend} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="date" tick={{ fill: '#334155', fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} interval={2} />
                <YAxis domain={[0, 120]} hide />
                <Tooltip {...CHART_TT} formatter={v => [`${v}%`, 'Calories']} />
                <ReferenceLine y={100} stroke={GREEN} strokeDasharray="4 3" strokeWidth={1} opacity={0.5} />
                <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                  {dietTrend.map((d, i) => (
                    <Cell key={i} fill={d.pct >= 90 && d.pct <= 110 ? GREEN : d.pct > 110 ? RED : '#1e3a5f'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, color: '#334155', textAlign: 'right', marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Target: {diet.targets?.calories || 2800} kcal/day
            </div>
          </GlowCard>
        )}

        <div style={{ height: 24 }} />
      </div>
    </div>
  )
}
