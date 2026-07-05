import { useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { today, daysAgo } from '../utils'
import { getWinDaySettings, getWinHistory } from '../utils/winLoss'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine
} from 'recharts'

const BG = 'transparent'
const TEXT2 = '#94a3b8'
const GOLD   = '#f0c040'
const GREEN  = '#10b981'
const RED    = '#ff5555'
const VIOLET = '#a78bfa'
const CYAN   = '#22d3ee'
const BLUE   = '#60a5fa'
const PINK   = '#e879f9'
const CARD = {
  background: 'rgba(6,9,22,0.82)', border: '2px solid rgba(99,102,241,0.65)',
  borderRadius: 14, padding: 20,
  boxShadow: '0 6px 40px rgba(0,0,0,0.55), 0 0 60px rgba(99,102,241,0.08), inset 0 1px 0 rgba(99,102,241,0.12)'
}
const CHART_TT = {
  contentStyle: { background: 'rgba(5,8,20,0.75)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 8, fontSize: 11, fontFamily: 'Inter' },
  labelStyle: { color: '#a0bcdf' }, itemStyle: { color: '#fff' },
}

function CircleGauge({ value, max = 10, size = 110, label, color = '#6366f1', delta }) {
  const r = 40, cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(1, (isNaN(value) ? 0 : value) / max)
  const offset = circ * (1 - pct)
  const stateMap = max === 100
    ? (value >= 85 ? ['PRIMED', '#1ad9a0'] : value >= 70 ? ['CHARGED', '#6366f1'] : value >= 50 ? ['STABLE', '#6366f1'] : ['DEGRADED', '#f43f5e'])
    : (value >= 7 ? ['OPERATIONAL', '#1ad9a0'] : value >= 5 ? ['STABLE', '#6366f1'] : ['DEGRADED', '#f43f5e'])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ background: `${color}0C`, border: `2px solid ${color}65`, borderRadius: 12, padding: '16px 20px', textAlign: 'center', minWidth: 130, boxShadow: `0 0 40px ${color}20` }}>
        <div style={{ position: 'relative', width: size, height: size, margin: '0 auto 8px' }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(15,25,60,0.95)" strokeWidth={10} />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={10}
              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 33, color: 'white', lineHeight: 1 }}>
              {isNaN(value) || value === 0 ? '—' : max === 100 ? Math.round(value) : value.toFixed(1)}
            </span>
            <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0bcdf', textTransform: 'uppercase' }}>{max === 100 ? 'pts' : '/10'}</span>
          </div>
        </div>
        <div style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 }}>
          {delta !== undefined && delta !== null && (
            <span style={{ fontFamily: 'Inter', fontSize: 9, color: delta >= 0 ? '#1ad9a0' : '#f43f5e' }}>
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}
            </span>
          )}
          <span style={{ fontFamily: 'Inter', fontSize: 9, color: stateMap[1], textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stateMap[0]}</span>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ dot = '#6366f1', children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: dot, boxShadow: `0 0 10px ${dot}, 0 0 20px ${dot}80` }} />
        <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{children}</span>
      </div>
      {right && <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{right}</span>}
    </div>
  )
}

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

const MOOD_SCORE = { 'Excellent': 9, 'Good': 7, 'Neutral': 5, 'Low': 3, 'Very low': 1 }

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

  // Build checkLogs from marko_checkin (for pulse/trend)
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

  // 30-day trend (from checkin for mood/energy/sleep/stress)
  const trend30 = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const ds = daysAgo(29 - i)
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
    }).filter(d => d.energy != null || d.mood != null || d.sleep != null)
  }, [checkLogs])

  // 7-day pulse with deltas vs prior 7
  const pulse7 = useMemo(() => {
    const days7 = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i))
    const prev7 = Array.from({ length: 7 }, (_, i) => daysAgo(13 - i))
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
      const e = avg(vals.energy), s = avg(vals.sleep)
      if (!e && !s) return 0
      return Math.round(((e / 10) * 0.5 + (s / 10) * 0.5) * 100)
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

  // Win/Loss split analysis — compare metrics on WIN vs LOSS days
  const winLossAnalysis = useMemo(() => {
    const history = getWinHistory(30, winSettings, dailyData, bodyData, diet)
    const logs = dailyData.logs || {}
    const winDays  = history.filter(d => d.isWin  && d.available > 0).map(d => d.date)
    const lossDays = history.filter(d => !d.isWin && d.available > 0).map(d => d.date)

    const METRICS = [
      { key: 'energy',      label: 'Energy',      color: GOLD,        invert: false },
      { key: 'dailyRating', label: 'Day Rating',  color: VIOLET,      invert: false },
      { key: 'sleepHours',  label: 'Sleep Hours', color: CYAN,        invert: false },
      { key: 'dietQuality', label: 'Diet Quality',color: GREEN,       invert: false },
      { key: 'workOutput',  label: 'Work Focus',  color: BLUE,        invert: false },
      { key: 'stress',      label: 'Stress',      color: RED,         invert: true  },
      { key: 'bizHours',    label: 'Biz Hours',   color: '#fb923c',   invert: false },
      { key: 'salesCalls',  label: 'Sales Calls', color: PINK,        invert: false },
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

  // Weekly comparison — this 7 days vs prior 7 days (from marko_daily)
  const weeklyComparison = useMemo(() => {
    const thisWeek = Array.from({ length: 7 }, (_, i) => daysAgo(i))
    const lastWeek = Array.from({ length: 7 }, (_, i) => daysAgo(7 + i))
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

  // Correlations from marko_daily
  const correlations = useMemo(() => {
    const logs = dailyData.logs || {}
    const entries = Object.entries(logs)
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

    tryAdd('sleepHours', 'energy',      'SLEEP HOURS → ENERGY',      `Longer sleep ${true ? 'correlates with higher' : 'impacts'} morning energy.`, GOLD)
    tryAdd('sleepHours', 'dailyRating', 'SLEEP HOURS → DAY RATING',  'Sleep duration predicts how you rate your overall day.', VIOLET)
    tryAdd('stress',     'dailyRating', 'STRESS → DAY RATING',       'High stress days tend to score lower overall.', RED)
    tryAdd('bizHours',   'salesCalls',  'BIZ HOURS → SALES CALLS',   'Time in business vs prospecting output correlation.', BLUE)
    tryAdd('energy',     'salesCalls',  'ENERGY → SALES CALLS',      'Higher energy mornings and prospecting activity link.', PINK)
    tryAdd('energy',     'workOutput',  'ENERGY → WORK FOCUS',       'Morning energy predicting work output quality.', CYAN)

    return pairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
  }, [dailyData])

  // Diet compliance
  const dietTrend = useMemo(() => {
    const target = diet.targets?.calories || 2800
    return Array.from({ length: 14 }, (_, i) => {
      const ds = daysAgo(13 - i)
      const h = diet.history?.find(x => x.date === ds)
      return { date: ds.slice(5), pct: h ? Math.round((h.calories / target) * 100) : 0 }
    })
  }, [diet])

  const hasLogs = Object.keys(checkLogs).length > 0 || Object.keys(dailyData.logs || {}).length > 0

  return (
    <div style={{ background: BG, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'rgba(4,6,18,0.95)', borderBottom: '2px solid rgba(99,102,241,0.6)', boxShadow: '0 4px 40px rgba(99,102,241,0.1)', padding: '20px 32px', flexShrink: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, transparent, rgba(99,102,241,1) 30%, rgba(34,211,238,0.8) 70%, transparent)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4d9fff' }} />
              <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, color: '#a0bcdf', letterSpacing: '0.12em', textTransform: 'uppercase' }}>PATTERN DETECTION ONLINE</span>
            </div>
            <h1 style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 64, fontWeight: 900, lineHeight: 0.9, letterSpacing: '0.02em', background: 'linear-gradient(135deg, #6366f1, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0, fontStyle: 'italic' }}>INSIGHTS</h1>
            <p style={{ fontFamily: 'Inter', fontSize: 10, color: '#a0bcdf', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>THE WAR ROOM // WIN/LOSS ANALYSIS · CORRELATIONS · TRENDS</p>
          </div>
          <div style={{ background: 'rgba(99,102,241,0.12)', border: '2px solid rgba(99,102,241,0.65)', borderRadius: 8, padding: '6px 14px', fontFamily: 'Inter', fontSize: 11, fontWeight: 600, color: TEXT2, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 0 20px rgba(99,102,241,0.2)' }}>
            <span style={{ fontFamily: '"Orbitron",sans-serif', fontWeight: 900, color: '#818cf8', textShadow: '0 0 14px rgba(99,102,241,0.8)' }}>{dayCount}</span> DAYS ENGRAVED
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {!hasLogs && (
          <div style={{ ...CARD, textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 36, color: '#a0bcdf', letterSpacing: '0.04em', marginBottom: 8 }}>NO DATA YET</div>
            <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#a0bcdf' }}>Complete morning and evening check-ins to unlock pattern detection.</p>
          </div>
        )}

        {/* 7-Day Pulse */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em' }}>⚡ 7-DAY PULSE</span>
            <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.1em' }}>CURRENT VS PRIOR 7-DAY BASELINE</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <CircleGauge value={pulse7.energy} label="ENERGY" color="#6366f1" delta={pulse7.deltas.energy} />
            <CircleGauge value={pulse7.mood} label="MOOD" color="#4d9fff" delta={pulse7.deltas.mood} />
            <CircleGauge value={pulse7.sleep} label="SLEEP QUAL" color="#a78bfa" delta={pulse7.deltas.sleep} />
            <CircleGauge value={pulse7.recovery} max={100} label="RECOVERY" color="#22c55e" />
          </div>
        </div>

        {/* Bottleneck Callout */}
        {winLossAnalysis.bottleneck && (
          <div style={{
            ...CARD, padding: '20px 24px',
            border: `2px solid ${winLossAnalysis.bottleneck.color}77`,
            background: `linear-gradient(135deg, ${winLossAnalysis.bottleneck.color}0e, rgba(6,9,22,0.92))`,
            boxShadow: `0 0 60px ${winLossAnalysis.bottleneck.color}15, inset 0 1px 0 ${winLossAnalysis.bottleneck.color}18`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 22 }}>⚡</span>
              <div>
                <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, color: winLossAnalysis.bottleneck.color, letterSpacing: '0.18em', fontWeight: 700 }}>PERFORMANCE BOTTLENECK</div>
                <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#e2e8f0', fontWeight: 700, marginTop: 2 }}>
                  <span style={{ color: winLossAnalysis.bottleneck.color }}>{winLossAnalysis.bottleneck.label}</span> is your biggest differentiator between wins and losses
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 48, color: GOLD, textShadow: `0 0 28px ${GOLD}66` }}>
                  {winLossAnalysis.bottleneck.winAvg?.toFixed(1)}
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: 9, color: GOLD, fontWeight: 700, letterSpacing: '0.1em' }}>WIN DAYS AVG</div>
              </div>
              <div style={{ fontSize: 22, color: '#334155' }}>vs</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 48, color: RED, textShadow: '0 0 28px rgba(255,85,85,0.5)' }}>
                  {winLossAnalysis.bottleneck.lossAvg?.toFixed(1)}
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: 9, color: RED, fontWeight: 700, letterSpacing: '0.1em' }}>LOSS DAYS AVG</div>
              </div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 28, color: winLossAnalysis.bottleneck.color, textShadow: `0 0 20px ${winLossAnalysis.bottleneck.color}66` }}>
                  +{winLossAnalysis.bottleneck.gap?.toFixed(1)} gap
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: 10, color: '#64748b', marginTop: 3 }}>
                  from {winLossAnalysis.winCount}W / {winLossAnalysis.lossCount}L tracked days
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Win/Loss Split Analysis */}
        {winLossAnalysis.results.length > 0 && (
          <div style={CARD}>
            <SectionTitle dot={GOLD} right={`${winLossAnalysis.winCount}W · ${winLossAnalysis.lossCount}L DAYS ANALYZED`}>WIN VS LOSS DAY ANALYSIS</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {winLossAnalysis.results.map(m => {
                const maxVal = Math.max(m.winAvg || 0, m.lossAvg || 0, 1)
                const winPct  = ((m.winAvg  || 0) / maxVal) * 100
                const lossPct = ((m.lossAvg || 0) / maxVal) * 100
                const isTop = winLossAnalysis.bottleneck?.key === m.key
                return (
                  <div key={m.key} style={{
                    padding: '10px 14px', borderRadius: 10,
                    background: isTop ? `${m.color}10` : 'rgba(10,14,30,0.5)',
                    border: `1px solid ${isTop ? m.color + '55' : 'rgba(99,102,241,0.12)'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                      <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: isTop ? m.color : '#e2e8f0' }}>
                        {isTop ? '⚡ ' : ''}{m.label}
                      </span>
                      <span style={{ fontFamily: 'Inter', fontSize: 10, color: m.gap != null && m.gap > 0 ? '#64748b' : '#64748b' }}>
                        {m.gap != null ? (m.gap > 0.05 ? `+${m.gap.toFixed(1)}` : m.gap.toFixed(1)) : '—'} gap
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {[
                        { label: 'WIN',  pct: winPct,  val: m.winAvg,  color: GOLD },
                        { label: 'LOSS', pct: lossPct, val: m.lossAvg, color: RED  },
                      ].map(row => (
                        <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 700, color: row.color, width: 28 }}>{row.label}</span>
                          <div style={{ flex: 1, height: 5, background: 'rgba(20,28,52,0.8)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${row.pct}%`, background: row.color, borderRadius: 3, boxShadow: `0 0 6px ${row.color}88`, transition: 'width 0.6s ease' }} />
                          </div>
                          <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 16, color: row.color, width: 32, textAlign: 'right' }}>{row.val?.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Weekly Comparison */}
        {weeklyComparison.length > 0 && (
          <div style={CARD}>
            <SectionTitle dot={CYAN} right="THIS WEEK VS LAST WEEK">WEEKLY COMPARISON</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {weeklyComparison.map(m => {
                const delta = m.thisWeek != null && m.lastWeek != null ? m.thisWeek - m.lastWeek : null
                const isUp = delta != null && delta > 0
                return (
                  <div key={m.key} style={{ padding: '14px 16px', borderRadius: 12, background: `${m.color}0e`, border: `1px solid ${m.color}40` }}>
                    <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, color: m.color, letterSpacing: '0.15em', marginBottom: 8 }}>{m.label}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 38, color: m.color, textShadow: `0 0 20px ${m.color}55` }}>
                        {m.thisWeek != null ? m.thisWeek.toFixed(1) : '—'}
                      </span>
                      {delta != null && (
                        <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 700, color: isUp ? GREEN : RED }}>
                          {isUp ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: 'Inter', fontSize: 10, color: '#64748b' }}>
                      Last week: <span style={{ color: TEXT2 }}>{m.lastWeek != null ? m.lastWeek.toFixed(1) : '—'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 30-Day Trends */}
        <div style={CARD}>
          <SectionTitle right="ENERGY · MOOD · SLEEP · STRESS">30-DAY TRENDS</SectionTitle>
          {trend30.length < 3 ? (
            <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#a0bcdf', textAlign: 'center', padding: '40px 0' }}>Log more days to see trends.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trend30} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    {[['gE','#6366f1'],['gM','#22d3ee'],['gS','#a78bfa'],['gSt','#f43f5e']].map(([id, c]) => (
                      <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={c} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={c} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#7a95c0', fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis domain={[0, 10]} tick={{ fill: '#7a95c0', fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} width={20} />
                  <Tooltip {...CHART_TT} />
                  <Area type="monotone" dataKey="energy" stroke="#818cf8" fill="url(#gE)" strokeWidth={3} dot={false} connectNulls />
                  <Area type="monotone" dataKey="mood"   stroke="#22d3ee" fill="url(#gM)" strokeWidth={3} dot={false} connectNulls />
                  <Area type="monotone" dataKey="sleep"  stroke="#a78bfa" fill="url(#gS)" strokeWidth={3} dot={false} connectNulls />
                  <Area type="monotone" dataKey="stress" stroke="#f43f5e" fill="url(#gSt)" strokeWidth={3} dot={false} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                {[['ENERGY','#6366f1'],['MOOD','#22d3ee'],['SLEEP QUAL','#a78bfa'],['STRESS','#f43f5e']].map(([l, c]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 20, height: 2, background: c, borderRadius: 1 }} />
                    <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Correlations */}
        {correlations.length > 0 && (
          <div style={CARD}>
            <SectionTitle dot="#4d9fff" right="AUTO-MINED FROM YOUR DAILY LOGS">CORRELATIONS DETECTED</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
              {correlations.map((c, i) => (
                <div key={i} style={{ background: `${c.color}08`, border: `2px solid ${c.color}55`, borderRadius: 10, padding: 16, boxShadow: `0 0 30px ${c.color}10` }}>
                  <div style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{c.title}</div>
                  <p style={{ fontFamily: 'Inter', fontSize: 11, color: '#a0bcdf', marginBottom: 12 }}>{c.subtitle}</p>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {[
                      { label: 'EFFECT',     value: `r = ${c.r.toFixed(2)}`, color: c.color },
                      { label: 'CONFIDENCE', value: `${c.confidence}%`,      color: 'white' },
                      { label: 'SAMPLE',     value: `n=${c.n}`,              color: '#a0bcdf' },
                    ].map(m => (
                      <div key={m.label}>
                        <div style={{ fontFamily: 'Inter', fontSize: 8, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{m.label}</div>
                        <div style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 700, color: m.color }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, height: 6, background: 'rgba(15,25,60,0.9)', borderRadius: 3, border: `1px solid ${c.color}30` }}>
                    <div style={{ height: '100%', background: c.color, borderRadius: 3, width: `${c.confidence}%`, boxShadow: `0 0 10px ${c.color}` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diet compliance */}
        {diet.history?.length > 3 && (
          <div style={CARD}>
            <SectionTitle dot="#22c55e" right="LAST 14 DAYS">NUTRITION COMPLIANCE</SectionTitle>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={dietTrend} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="date" tick={{ fill: '#7a95c0', fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} interval={2} />
                <YAxis domain={[0, 120]} hide />
                <Tooltip {...CHART_TT} formatter={v => [`${v}%`, 'Calories']} />
                <ReferenceLine y={100} stroke="#6366f1" strokeDasharray="3 3" strokeWidth={1} />
                <Bar dataKey="pct" radius={[3, 3, 0, 0]}>
                  {dietTrend.map((d, i) => (
                    <Cell key={i} fill={d.pct >= 90 && d.pct <= 110 ? '#1ad9a0' : d.pct > 110 ? '#ff5555' : '#1e3a5f'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0bcdf', textAlign: 'right', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Target: {diet.targets?.calories || 2800} kcal/day</div>
          </div>
        )}
      </div>
    </div>
  )
}
