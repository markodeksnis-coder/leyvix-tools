import { useState, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { getWinRatePoints, getWinDaySettings } from '../utils/winLoss'
import WinDaySettings from '../components/WinDaySettings'
import { Settings2, Plus, X } from 'lucide-react'

// ─── Metric definitions ────────────────────────────────────────────────────────
const DEFAULT_METRICS = [
  // Wellbeing
  { id: 'daily_rating',  name: 'Day Rating',      unit: '/10',    maxVal: 10,    color: '#f0c040', icon: '⚡', group: 'Wellbeing' },
  { id: 'energy',        name: 'Energy',           unit: '/10',    maxVal: 10,    color: '#22d3ee', icon: '🔋', group: 'Wellbeing' },
  { id: 'stress',        name: 'Stress',           unit: '/10',    maxVal: 10,    color: '#f43f5e', icon: '🧠', group: 'Wellbeing' },
  { id: 'pride',         name: 'Pride Score',      unit: '/10',    maxVal: 10,    color: '#c084fc', icon: '🏆', group: 'Wellbeing' },
  // Recovery
  { id: 'sleep_hours',   name: 'Sleep Hours',      unit: 'hrs',    maxVal: 10,    color: '#8b5cf6', icon: '🌙', group: 'Recovery' },
  { id: 'sleep_quality', name: 'Sleep Quality',    unit: '/10',    maxVal: 10,    color: '#a78bfa', icon: '😴', group: 'Recovery' },
  // Body
  { id: 'steps',         name: 'Steps',            unit: '',       maxVal: 15000, color: '#1ad9a0', icon: '👟', group: 'Body' },
  { id: 'trained',       name: 'Trained',          unit: 'binary', maxVal: 1,     color: '#2dd4bf', icon: '🏋️', group: 'Body' },
  // Nutrition
  { id: 'calories',      name: 'Calories',         unit: 'kcal',   maxVal: 3500,  color: '#fb923c', icon: '🍽️', group: 'Nutrition' },
  { id: 'protein',       name: 'Protein',          unit: 'g',      maxVal: 250,   color: '#f97316', icon: '🥩', group: 'Nutrition' },
  { id: 'diet_quality',  name: 'Diet Quality',     unit: '/10',    maxVal: 10,    color: '#34d399', icon: '🥗', group: 'Nutrition' },
  // Work
  { id: 'biz_hours',     name: 'Hours Worked',     unit: 'hrs',    maxVal: 16,    color: '#818cf8', icon: '💼', group: 'Work' },
  { id: 'work_output',   name: 'Focus Score',      unit: '/10',    maxVal: 10,    color: '#6366f1', icon: '🎯', group: 'Work' },
  // Business
  { id: 'sales_calls',   name: 'Sales Calls',      unit: '',       maxVal: 20,    color: '#e879f9', icon: '📞', group: 'Business' },
  { id: 'meetings',      name: 'Meetings Booked',  unit: '',       maxVal: 10,    color: '#d946ef', icon: '📅', group: 'Business' },
  // Habits
  { id: 'prayed',        name: 'Prayed',           unit: 'binary', maxVal: 1,     color: '#fbbf24', icon: '🙏', group: 'Habits' },
  { id: 'read_bible',    name: 'Read Bible',       unit: 'binary', maxVal: 1,     color: '#f472b6', icon: '📖', group: 'Habits' },
  { id: 'meditated',     name: 'Meditated',        unit: 'binary', maxVal: 1,     color: '#60a5fa', icon: '🧘', group: 'Habits' },
  { id: 'reading',       name: 'Read',             unit: 'binary', maxVal: 1,     color: '#4ade80', icon: '📚', group: 'Habits' },
]

const GROUP_ORDER = ['Wellbeing', 'Recovery', 'Body', 'Nutrition', 'Work', 'Business', 'Habits']
const GROUP_COLORS = {
  Wellbeing: '#f0c040', Recovery: '#8b5cf6', Body: '#1ad9a0',
  Nutrition: '#fb923c', Work: '#818cf8', Business: '#e879f9', Habits: '#60a5fa',
}

// ─── Metric value resolver ─────────────────────────────────────────────────────
function getMetricValue(metricId, dateStr, dailyData, bodyData, dietData) {
  const log = dailyData.logs?.[dateStr]
  switch (metricId) {
    case 'daily_rating':  return log?.dailyRating  ?? null
    case 'energy':        return log?.energy        ?? null
    case 'stress':        return log?.stress        ?? null
    case 'pride':         return log?.pride         ?? null
    case 'sleep_hours':   return log?.sleepHours    ?? null
    case 'sleep_quality': return log?.sleep         ?? null
    case 'steps':         return log?.steps         ?? null
    case 'diet_quality':  return log?.dietQuality   ?? null
    case 'biz_hours':     return log?.bizHours      ?? null
    case 'work_output':   return log?.workOutput    ?? null
    case 'sales_calls':   return log?.salesCalls    ?? null
    case 'meetings':      return log?.meetingsBooked ?? null
    case 'prayed':        return log?.prayed        ?? null
    case 'read_bible':    return log?.readBible     ?? null
    case 'meditated':     return log?.meditated     ?? null
    case 'reading':       return log?.mentalRead    ?? null
    case 'trained': {
      const hit = [...(bodyData.workouts || []), ...(bodyData.liftSessions || [])].some(w => w.date === dateStr)
      if (hit) return 1
      if (log?.dailyRating != null || log?.steps != null || log?.dietQuality != null) return 0
      return null
    }
    case 'calories': {
      const h = (dietData.history || []).find(h => h.date === dateStr)
      return (h?.calories > 0 ? h.calories : null)
    }
    case 'protein': {
      const h = (dietData.history || []).find(h => h.date === dateStr)
      return (h?.protein > 0 ? h.protein : null)
    }
    default: return null
  }
}

// ─── Stats computation ─────────────────────────────────────────────────────────
function computeStats(points) {
  const valid = points.filter(p => p.value !== null)
  if (valid.length < 3) return null
  const values = valid.map(p => p.value)
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const high = Math.max(...values)
  const low  = Math.min(...values)

  let currentStreak = 0
  for (let i = valid.length - 1; i >= 0; i--) {
    if (valid[i].value >= mean) currentStreak++
    else break
  }

  const cycles = []
  let run = 0
  for (const p of valid) {
    if (p.value >= mean) { run++ }
    else { if (run > 0) cycles.push(run); run = 0 }
  }
  const avgCycle = cycles.length > 0 ? cycles.reduce((s, c) => s + c, 0) / cycles.length : 0
  return { mean, high, low, currentStreak, avgCycle, cycleCount: cycles.length }
}

function generateInsight(metricName, stats) {
  if (!stats) return { text: 'Log at least 3 days to detect your pattern.', type: 'neutral' }
  const { currentStreak, avgCycle, cycleCount } = stats
  if (currentStreak === 0)
    return { text: `Currently below average for ${metricName}. Start a new high streak today.`, type: 'warning' }
  if (cycleCount < 2 || avgCycle === 0)
    return { text: `${currentStreak} day${currentStreak !== 1 ? 's' : ''} above average. Keep logging to detect your cycle.`, type: 'positive' }
  const daysLeft = Math.round(avgCycle - currentStreak)
  if (daysLeft <= 1 && daysLeft >= 0)
    return { text: `Day ${currentStreak} of a high run — your historical drop point is ~day ${Math.round(avgCycle)}. Stay locked in.`, type: 'warning' }
  if (currentStreak > avgCycle * 1.2)
    return { text: `New record — broke your avg cycle of ${avgCycle.toFixed(1)}d. Day ${currentStreak} and still climbing.`, type: 'positive' }
  return { text: `Avg cycle: ${avgCycle.toFixed(1)} high days. Day ${currentStreak} — ~${daysLeft} day${daysLeft !== 1 ? 's' : ''} until historical drop point.`, type: 'positive' }
}

// ─── Oscillation graph ─────────────────────────────────────────────────────────
function OscillationGraph({ points, mean, metricId, color }) {
  const valid = points.filter(p => p.value !== null)
  if (valid.length < 3) {
    return (
      <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 22, opacity: 0.25 }}>〜</span>
        <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#334155', letterSpacing: '0.1em' }}>LOG 3+ DAYS TO UNLOCK</span>
      </div>
    )
  }

  const values = valid.map(p => p.value)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || 1
  const domainMin = Math.max(0, minVal - range * 0.2)
  const domainMax = maxVal + range * 0.2

  return (
    <ResponsiveContainer width="100%" height={130}>
      <AreaChart data={points} margin={{ top: 6, right: 12, bottom: 0, left: 12 }}>
        <defs>
          <linearGradient id={`g-${metricId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.32} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" tick={{ fill: '#334155', fontSize: 8, fontFamily: 'Inter' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis domain={[domainMin, domainMax]} hide />
        <Tooltip
          contentStyle={{ background: 'rgba(3,4,16,0.97)', border: `1px solid ${color}40`, borderRadius: 10, fontSize: 11, fontFamily: 'Inter', boxShadow: `0 0 24px ${color}25` }}
          labelStyle={{ color: '#64748b', marginBottom: 3 }}
          itemStyle={{ color }}
          formatter={v => [v !== null ? (Number.isInteger(v) ? v : v.toFixed(1)) : '—', '']}
        />
        <ReferenceLine y={mean} stroke={color} strokeDasharray="4 3" strokeWidth={1.5} strokeOpacity={0.7} />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5}
          fill={`url(#g-${metricId})`}
          dot={{ fill: color, r: 3, strokeWidth: 0 }}
          activeDot={{ fill: color, r: 5, strokeWidth: 2, stroke: 'rgba(255,255,255,0.3)' }}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ metric, points, mean, stats, onDelete }) {
  const insight = generateInsight(metric.name, stats)
  const c = metric.color || '#6366f1'
  const avg = stats?.mean ?? null
  const high = stats?.high ?? null
  const low  = stats?.low  ?? null
  const streak = stats?.currentStreak ?? 0
  const isBinary = metric.unit === 'binary'
  const insightC = insight.type === 'warning' ? '#f43f5e' : insight.type === 'positive' ? '#1ad9a0' : '#6366f1'

  const fmt = (v) => {
    if (v === null) return '—'
    if (isBinary) return `${Math.round(v * 100)}%`
    if (metric.unit === '' || metric.unit === 'kcal' || metric.unit === 'g') return Number.isInteger(v) ? v : v.toFixed(0)
    return Number.isInteger(v) ? v : v.toFixed(1)
  }
  const unitLabel = isBinary ? '' : metric.unit

  return (
    <div style={{
      background: 'rgba(4,6,20,0.65)',
      backdropFilter: 'blur(40px)',
      WebkitBackdropFilter: 'blur(40px)',
      border: `1px solid ${c}35`,
      borderRadius: 18,
      overflow: 'hidden',
      boxShadow: `0 0 40px ${c}10, 0 4px 32px rgba(0,0,0,0.6), inset 0 1px 0 ${c}12`,
      transition: 'border-color 0.25s, box-shadow 0.25s',
      position: 'relative',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${c}70`; e.currentTarget.style.boxShadow = `0 0 70px ${c}20, 0 8px 40px rgba(0,0,0,0.65), inset 0 1px 0 ${c}20` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = `${c}35`; e.currentTarget.style.boxShadow = `0 0 40px ${c}10, 0 4px 32px rgba(0,0,0,0.6), inset 0 1px 0 ${c}12` }}
    >
      {/* Glow top line */}
      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${c}CC, ${c}, ${c}CC, transparent)`, boxShadow: `0 0 12px ${c}80` }} />

      {/* Header row */}
      <div style={{ padding: '16px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${c}16`, border: `1px solid ${c}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
          }}>
            {metric.icon}
          </div>
          <div>
            <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.92)', letterSpacing: '0.08em' }}>
              {metric.name.toUpperCase()}
            </div>
            {streak > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#1ad9a0', boxShadow: '0 0 5px #1ad9a0' }} />
                <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#1ad9a0', fontWeight: 600, letterSpacing: '0.05em' }}>{streak}d above avg</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 30, lineHeight: 1, color: c, filter: `drop-shadow(0 0 10px ${c}70)` }}>
              {fmt(avg)}<span style={{ fontSize: 13, opacity: 0.7 }}>{unitLabel}</span>
            </div>
            <div style={{ fontFamily: 'Inter', fontSize: 8, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em' }}>30d avg</div>
          </div>
          {onDelete && (
            <button onClick={onDelete} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(239,68,68,0.25)', background: 'transparent', borderRadius: 6, cursor: 'pointer', padding: 0 }}>
              <X size={11} color="#f43f5e" />
            </button>
          )}
        </div>
      </div>

      {/* High / Low stat row */}
      <div style={{ display: 'flex', gap: 8, padding: '0 18px 12px' }}>
        {[{ l: 'BEST', v: high, c2: '#1ad9a0' }, { l: 'LOW', v: low, c2: '#f43f5e' }].map(({ l, v, c2 }) => (
          <div key={l} style={{ flex: 1, padding: '8px 10px', background: `${c2}0A`, border: `1px solid ${c2}25`, borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 20, color: c2, lineHeight: 1 }}>{fmt(v)}<span style={{ fontSize: 10, opacity: 0.7 }}>{unitLabel}</span></div>
            <div style={{ fontFamily: 'Inter', fontSize: 8, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ padding: '0 4px' }}>
        <OscillationGraph points={points} mean={mean ?? 0} metricId={metric.id} color={c} />
      </div>

      {/* Insight */}
      <div style={{ margin: '8px 14px 14px', padding: '10px 14px', background: `${insightC}0A`, border: `1px solid ${insightC}35`, borderLeft: `3px solid ${insightC}`, borderRadius: '0 8px 8px 0' }}>
        <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#94a3b8', lineHeight: 1.55 }}>{insight.text}</span>
      </div>
    </div>
  )
}

// ─── Avg stat tile ──────────────────────────────────────────────────────────────
function AvgTile({ icon, label, value, unit, sub, color }) {
  return (
    <div style={{
      padding: '18px 16px', borderRadius: 16,
      background: `${color}08`,
      backdropFilter: 'blur(32px)',
      border: `1px solid ${color}30`,
      boxShadow: `0 0 40px ${color}0C, inset 0 1px 0 ${color}10`,
      display: 'flex', flexDirection: 'column', gap: 6,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}80, transparent)` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label}</span>
      </div>
      <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 36, lineHeight: 1, color, filter: `drop-shadow(0 0 14px ${color}70)` }}>
        {value}<span style={{ fontSize: 16, opacity: 0.6, marginLeft: 2 }}>{unit}</span>
      </div>
      {sub && <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#334155' }}>{sub}</div>}
    </div>
  )
}

// ─── Group header ──────────────────────────────────────────────────────────────
function GroupHeader({ name, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '32px 0 16px', gridColumn: '1 / -1' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}` }} />
      <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 10, fontWeight: 700, color, letterSpacing: '0.2em', textTransform: 'uppercase', textShadow: `0 0 16px ${color}80` }}>
        {name}
      </span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${color}40, transparent)` }} />
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function LifeCycles() {
  const [dailyData, setDailyData] = useLocalStorage('marko_daily', { logs: {} })
  const [bodyData]  = useLocalStorage('marko_body',  { workouts: [], liftSessions: [] })
  const [dietData]  = useLocalStorage('marko_diet',  { targets: {}, history: [] })
  const [cyclesConfig, setCyclesConfig] = useLocalStorage('marko_cycles_config', { customMetrics: [], customLogs: {} })

  const [showAddMetric, setShowAddMetric] = useState(false)
  const [newMetricName, setNewMetricName] = useState('')
  const [newMetricMax, setNewMetricMax] = useState('10')
  const [showWinSettings, setShowWinSettings] = useState(false)

  const winSettings   = getWinDaySettings()
  const winRatePoints = getWinRatePoints(winSettings, dailyData, bodyData, dietData)
  const winDaysCount  = winRatePoints.filter(p => p.value === 1).length
  const totalDays     = winRatePoints.filter(p => p.value !== null).length
  const winRatePct    = totalDays > 0 ? Math.round(winDaysCount / totalDays * 100) : 0

  const last30Days = useMemo(() => {
    const days = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      days.push({ dateStr: ds, label: `${d.getMonth() + 1}/${d.getDate()}` })
    }
    return days
  }, [])

  const allMetrics = [...DEFAULT_METRICS, ...(cyclesConfig.customMetrics || [])]

  const metricData = useMemo(() => {
    return allMetrics.map(metric => {
      const points = last30Days.map(({ dateStr, label }) => {
        const isDefault = DEFAULT_METRICS.find(m => m.id === metric.id)
        const value = isDefault
          ? getMetricValue(metric.id, dateStr, dailyData, bodyData, dietData)
          : (cyclesConfig.customLogs?.[metric.id]?.[dateStr] ?? null)
        return { date: dateStr, label, value }
      })
      const stats = computeStats(points)
      return { metric, points, stats, mean: stats?.mean ?? 0 }
    })
  }, [allMetrics, last30Days, dailyData, bodyData, dietData, cyclesConfig])

  // 30-day averages for the dashboard tiles
  const avgStats = useMemo(() => {
    const avg30 = (metricId) => {
      const d = metricData.find(m => m.metric.id === metricId)
      if (!d) return null
      const valid = d.points.filter(p => p.value !== null).map(p => p.value)
      return valid.length > 0 ? valid.reduce((s, v) => s + v, 0) / valid.length : null
    }
    const count30 = (metricId) => {
      const d = metricData.find(m => m.metric.id === metricId)
      if (!d) return null
      return d.points.filter(p => p.value === 1).length
    }
    // Workout streak from today backwards
    let workoutStreak = 0
    for (let i = 0; i < 90; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      const trained = [...(bodyData.workouts || []), ...(bodyData.liftSessions || [])].some(w => w.date === ds)
      if (trained) workoutStreak++
      else if (i > 0) break
    }
    return {
      bizHours:   avg30('biz_hours'),
      calories:   avg30('calories'),
      protein:    avg30('protein'),
      steps:      avg30('steps'),
      salesCalls: avg30('sales_calls'),
      meetings:   avg30('meetings'),
      trainedDays: count30('trained'),
      workoutStreak,
    }
  }, [metricData, bodyData])

  const fmt = (v, dec = 1) => v === null ? '—' : (dec === 0 ? Math.round(v) : parseFloat(v.toFixed(dec)))

  const addCustomMetric = () => {
    if (!newMetricName.trim()) return
    const id = `custom_${Date.now()}`
    const colors = ['#f0c040','#22d3ee','#8b5cf6','#1ad9a0','#fb923c','#e879f9']
    const color = colors[Math.floor(cyclesConfig.customMetrics?.length ?? 0) % colors.length]
    setCyclesConfig(c => ({ ...c, customMetrics: [...(c.customMetrics || []), { id, name: newMetricName.trim(), unit: '', maxVal: parseFloat(newMetricMax) || 10, color, icon: '📊', group: 'Custom' }] }))
    setNewMetricName(''); setNewMetricMax('10'); setShowAddMetric(false)
  }

  const deleteCustomMetric = (id) => {
    setCyclesConfig(c => ({ ...c, customMetrics: (c.customMetrics || []).filter(m => m.id !== id) }))
  }

  // Group the metrics
  const grouped = useMemo(() => {
    const groups = {}
    for (const order of [...GROUP_ORDER, 'Custom']) groups[order] = []
    for (const d of metricData) {
      const g = d.metric.group || 'Custom'
      if (!groups[g]) groups[g] = []
      groups[g].push(d)
    }
    return groups
  }, [metricData])

  return (
    <div style={{ background: 'transparent', minHeight: '100%' }}>

      {/* ── HEADER ── */}
      <div style={{
        borderBottom: '1px solid rgba(34,211,238,0.25)',
        padding: '22px 36px 18px',
        position: 'relative', overflow: 'hidden',
        background: 'rgba(2,4,16,0.7)',
        backdropFilter: 'blur(40px)',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, #22d3ee 20%, #8b5cf6 60%, #e879f9 85%, transparent)', boxShadow: '0 0 14px rgba(34,211,238,0.5)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 8px #22d3ee' }} />
              <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#475569', letterSpacing: '0.16em', textTransform: 'uppercase' }}>PATTERN ENGINE · 30D</span>
            </div>
            <h1 style={{
              fontFamily: '"Orbitron", monospace', fontSize: 44, fontWeight: 900, lineHeight: 0.9,
              margin: 0, letterSpacing: '0.02em',
              background: 'linear-gradient(135deg, #22d3ee 0%, #8b5cf6 55%, #e879f9 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>LIFE CYCLES</h1>
            <p style={{ fontFamily: 'Inter', fontSize: 9, color: '#334155', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 6 }}>TRACK YOUR OSCILLATIONS · RAISE YOUR FLOOR</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowWinSettings(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: 'rgba(240,192,64,0.07)', color: '#f0c040', border: '1px solid rgba(240,192,64,0.22)', borderRadius: 10, fontFamily: 'Inter', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.2s' }}>
              <Settings2 size={12} /> Win Config
            </button>
            <button onClick={() => setShowAddMetric(!showAddMetric)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 16px', background: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(139,92,246,0.1))', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 10, fontFamily: 'Inter', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', boxShadow: '0 0 16px rgba(34,211,238,0.15)', transition: 'all 0.2s' }}>
              <Plus size={12} /> Custom
            </button>
          </div>
        </div>
        {showAddMetric && (
          <div style={{ maxWidth: 1200, margin: '14px auto 0', padding: '14px 18px', background: 'rgba(4,6,20,0.8)', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 14, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Inter', fontSize: 8, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Metric Name</div>
              <input value={newMetricName} onChange={e => setNewMetricName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomMetric()} placeholder="e.g. Morning Energy"
                style={{ width: '100%', padding: '8px 12px', fontFamily: 'Inter', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div style={{ width: 110 }}>
              <div style={{ fontFamily: 'Inter', fontSize: 8, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Max Value</div>
              <input value={newMetricMax} onChange={e => setNewMetricMax(e.target.value)} type="number" style={{ width: '100%', padding: '8px 12px', fontFamily: 'Inter', fontSize: 13 }} />
            </div>
            <button onClick={addCustomMetric} style={{ padding: '8px 18px', background: 'linear-gradient(135deg, #22d3ee, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'Inter', fontSize: 11, fontWeight: 700 }}>Add</button>
            <button onClick={() => setShowAddMetric(false)} style={{ padding: '8px 14px', border: '1px solid rgba(99,102,241,0.2)', background: 'transparent', color: '#475569', borderRadius: 8, cursor: 'pointer', fontFamily: 'Inter', fontSize: 11 }}>Cancel</button>
          </div>
        )}
      </div>

      <div style={{ padding: '24px 36px', maxWidth: 1200, margin: '0 auto' }}>

        {/* ── AVERAGES DASHBOARD ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 9, fontWeight: 700, color: '#6366f1', letterSpacing: '0.2em', textTransform: 'uppercase' }}>30-DAY AVERAGES</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(99,102,241,0.4), transparent)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
            <AvgTile icon="💼" label="Work Hours" value={fmt(avgStats.bizHours)} unit="hrs" sub="avg per day" color="#818cf8" />
            <AvgTile icon="🍽️" label="Calories" value={fmt(avgStats.calories, 0)} unit="kcal" sub="avg per day" color="#fb923c" />
            <AvgTile icon="🥩" label="Protein" value={fmt(avgStats.protein, 0)} unit="g" sub="avg per day" color="#f97316" />
            <AvgTile icon="👟" label="Steps" value={avgStats.steps !== null ? fmt(avgStats.steps, 0).toLocaleString?.() ?? fmt(avgStats.steps,0) : '—'} unit="" sub="avg per day" color="#1ad9a0" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <AvgTile icon="📞" label="Sales Calls" value={fmt(avgStats.salesCalls)} unit="" sub="avg per day" color="#e879f9" />
            <AvgTile icon="📅" label="Meetings" value={fmt(avgStats.meetings)} unit="" sub="avg booked/day" color="#d946ef" />
            <AvgTile icon="🏋️" label="Workout Days" value={avgStats.trainedDays ?? '—'} unit="/30" sub="sessions this month" color="#2dd4bf" />
            <AvgTile icon="🔥" label="Win Rate" value={`${winRatePct}`} unit="%" sub={`${winDaysCount} of ${totalDays} days`} color="#f0c040" />
          </div>
        </div>

        {/* ── WIN RATE OSCILLATION ── */}
        <div style={{
          background: 'rgba(4,6,18,0.7)', backdropFilter: 'blur(40px)',
          border: '1px solid rgba(240,192,64,0.35)', borderRadius: 20,
          overflow: 'hidden', marginBottom: 12,
          boxShadow: '0 0 50px rgba(240,192,64,0.1), 0 4px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(240,192,64,0.08)',
        }}>
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #f0c040CC, #fb923c, transparent)', boxShadow: '0 0 12px rgba(240,192,64,0.45)' }} />
          <div style={{ padding: '18px 22px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(240,192,64,0.12)', border: '1px solid rgba(240,192,64,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏆</div>
              <div>
                <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 12, fontWeight: 700, color: 'white', letterSpacing: '0.06em' }}>DAILY WIN RATE</div>
                <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#475569', marginTop: 2 }}>{winDaysCount} wins · {totalDays} days logged</div>
              </div>
            </div>
            <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 44, color: '#f0c040', lineHeight: 1, filter: 'drop-shadow(0 0 16px rgba(240,192,64,0.6))' }}>
              {winRatePct}<span style={{ fontSize: 20 }}>%</span>
            </div>
          </div>
          <div style={{ padding: '0 6px' }}>
            <OscillationGraph points={winRatePoints} mean={0.5} metricId="win_rate" color="#f0c040" />
          </div>
          <div style={{ margin: '6px 14px 14px', padding: '10px 14px', background: 'rgba(240,192,64,0.07)', border: '1px solid rgba(240,192,64,0.25)', borderLeft: '3px solid #f0c040', borderRadius: '0 8px 8px 0' }}>
            <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#94a3b8', lineHeight: 1.55 }}>
              {totalDays < 3 ? 'Log at least 3 days to detect your win pattern.' :
                winRatePct >= 80 ? `Winning ${winRatePct}% of days. Elite consistency. Protect the streak.` :
                winRatePct >= 60 ? `Winning ${winRatePct}% of days. ${totalDays - winDaysCount} loss days to reclaim.` :
                `Winning ${winRatePct}% of days. Loss days are outpacing wins. Start a new run today.`}
            </span>
          </div>
        </div>

        {/* ── GROUPED METRIC CARDS ── */}
        {[...GROUP_ORDER, 'Custom'].map(groupName => {
          const items = grouped[groupName]
          if (!items || items.length === 0) return null
          const gColor = GROUP_COLORS[groupName] || '#6366f1'
          return (
            <div key={groupName}>
              <GroupHeader name={groupName} color={gColor} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, paddingBottom: 8 }}>
                {items.map(({ metric, points, stats, mean }) => (
                  <MetricCard
                    key={metric.id}
                    metric={metric}
                    points={points}
                    mean={mean}
                    stats={stats}
                    onDelete={!DEFAULT_METRICS.find(m => m.id === metric.id) ? () => deleteCustomMetric(metric.id) : null}
                  />
                ))}
              </div>
            </div>
          )
        })}

        <div style={{ height: 40 }} />
      </div>

      {showWinSettings && (
        <WinDaySettings onClose={() => setShowWinSettings(false)} dailyData={dailyData} bodyData={bodyData} dietData={dietData} />
      )}
    </div>
  )
}
