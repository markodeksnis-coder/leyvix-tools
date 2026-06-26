import { useState, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { getWinRatePoints, getWinDaySettings } from '../utils/winLoss'
import WinDaySettings from '../components/WinDaySettings'
import { Settings2 } from 'lucide-react'

const DEFAULT_METRICS = [
  { id: 'diet_quality',  name: 'Diet Quality',       unit: '%',      maxVal: 100,   color: '#f0c040', icon: '🥗' },
  { id: 'gym_session',   name: 'Gym Session',         unit: 'binary', maxVal: 1,     color: '#22d3ee', icon: '🏋️' },
  { id: 'sleep_quality', name: 'Sleep Quality',       unit: '/10',    maxVal: 10,    color: '#8b5cf6', icon: '🌙' },
  { id: 'steps',         name: 'Steps',               unit: 'steps',  maxVal: 15000, color: '#1ad9a0', icon: '👟' },
  { id: 'cold_shower',   name: 'Cold Shower',         unit: 'binary', maxVal: 1,     color: '#3b82f6', icon: '❄️' },
  { id: 'work_output',   name: 'Work Output',         unit: '/10',    maxVal: 10,    color: '#fb923c', icon: '💼' },
  { id: 'reading',       name: 'Reading / Learning',  unit: 'binary', maxVal: 1,     color: '#e879f9', icon: '📖' },
  { id: 'daily_score',   name: 'Daily Score',         unit: '%',      maxVal: 100,   color: '#6366f1', icon: '⚡' },
]

function getMetricValue(metricId, dateStr, dailyData, bodyData, dietData) {
  const log = dailyData.logs?.[dateStr]
  const items = log?.items || []
  switch (metricId) {
    case 'diet_quality': {
      // Primary: calorie/protein compliance from Body page
      const h = (dietData.history || []).find(h => h.date === dateStr)
      if (h) {
        const cT = dietData.targets?.calories || 2400
        const pT = dietData.targets?.protein || 200
        return Math.round(((Math.min(h.calories, cT) / cT) + (Math.min(h.protein, pT) / pT)) / 2 * 100)
      }
      // Fallback: diet quality rating from evening check-in (1-10 → 0-100)
      return log?.dietQuality != null ? Math.round(log.dietQuality * 10) : null
    }
    case 'gym_session': {
      const trained = [...(bodyData.workouts || []), ...(bodyData.liftSessions || [])].some(w => w.date === dateStr)
      if (trained) return 1
      // Fallback: log exists but no workout entry → 0; no log at all → null
      return log != null ? 0 : null
    }
    case 'sleep_quality':
      return log?.sleep ?? null
    case 'steps':
      return log?.steps ?? null
    case 'cold_shower': {
      // Primary: DailyOS non-negotiable item
      const item = items.find(i => i.isNonNeg && /cold shower/i.test(i.title))
      if (item != null) return item.checked ? 1 : 0
      // Fallback: evening check-in answer
      return log?.coldShower ?? null
    }
    case 'work_output':
      return log?.workOutput ?? null
    case 'reading': {
      // Primary: DailyOS task item
      const item = items.find(i => !i.isNonNeg && /read|learn/i.test(i.title))
      if (item != null) return item.checked ? 1 : 0
      // Fallback: evening check-in answer
      return log?.reading ?? null
    }
    case 'daily_score': {
      // Primary: DailyOS checklist completion
      if (items.length > 0) return Math.round(items.filter(i => i.checked).length / items.length * 100)
      // Fallback: overall day rating from evening check-in (1-10 → 0-100)
      return log?.dailyRating != null ? Math.round(log.dailyRating * 10) : null
    }
    default: return null
  }
}

function computeStats(points) {
  const valid = points.filter(p => p.value !== null)
  if (valid.length < 3) return null

  const values = valid.map(p => p.value)
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const high = Math.max(...values)
  const low = Math.min(...values)

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

  const avgCycle = cycles.length > 0
    ? cycles.reduce((s, c) => s + c, 0) / cycles.length
    : 0

  return { mean, high, low, currentStreak, avgCycle, cycleCount: cycles.length }
}

function generateInsight(metricName, stats) {
  if (!stats) return { text: 'Log at least 3 days to detect your pattern.', type: 'neutral' }
  const { mean, high, low, currentStreak, avgCycle, cycleCount } = stats

  if (currentStreak === 0) {
    return { text: `You are currently below your average for ${metricName}. Start a new high streak today.`, type: 'warning' }
  }
  if (cycleCount < 2 || avgCycle === 0) {
    return { text: `${currentStreak} day${currentStreak > 1 ? 's' : ''} above average for ${metricName}. Keep logging to detect your cycle pattern.`, type: 'positive' }
  }
  const daysLeft = Math.round(avgCycle - currentStreak)
  if (daysLeft <= 1 && daysLeft >= 0) {
    return { text: `You have stayed above your floor for ${currentStreak} day${currentStreak > 1 ? 's' : ''} — historically you drop around day ${Math.round(avgCycle)}. Stay locked in today.`, type: 'warning' }
  }
  if (currentStreak > avgCycle * 1.2 && cycleCount >= 2) {
    return { text: `You just broke your average cycle of ${avgCycle.toFixed(1)} days. New record: ${currentStreak} consecutive days above average. Keep going.`, type: 'positive' }
  }
  return { text: `Your average cycle is ${avgCycle.toFixed(1)} high days. You are on day ${currentStreak} — you have approximately ${daysLeft} more day${daysLeft !== 1 ? 's' : ''} before your historical drop point.`, type: 'positive' }
}

function OscillationGraph({ points, mean, metricId, color }) {
  const valid = points.filter(p => p.value !== null)
  if (valid.length < 3) {
    return (
      <div style={{
        height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <div style={{ fontSize: 28, opacity: 0.3 }}>📊</div>
        <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#475569', fontStyle: 'italic' }}>Log 3+ days to unlock chart</span>
      </div>
    )
  }

  const values = valid.map(p => p.value)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || 1
  const domainMin = Math.max(0, minVal - range * 0.15)
  const domainMax = maxVal + range * 0.15

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 16 }}>
        <defs>
          <linearGradient id={`fill-${metricId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.28} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          tick={{ fill: '#475569', fontSize: 9, fontFamily: 'Inter' }}
          axisLine={false} tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis domain={[domainMin, domainMax]} hide />
        <Tooltip
          contentStyle={{ background: 'rgba(5,8,20,0.92)', border: `1px solid ${color}40`, borderRadius: 8, fontSize: 11, fontFamily: 'Inter', boxShadow: `0 0 20px ${color}20` }}
          labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
          itemStyle={{ color }}
          formatter={(v) => [v !== null ? (Number.isInteger(v) ? v : v.toFixed(1)) : '—', '']}
        />
        <ReferenceLine y={mean} stroke={color} strokeDasharray="5 4" strokeWidth={1} strokeOpacity={0.4} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#fill-${metricId})`}
          dot={{ fill: color, r: 3, strokeWidth: 0 }}
          activeDot={{ fill: color, r: 5, strokeWidth: 2, stroke: '#fff' }}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function StatBox({ label, value, unit, color }) {
  const display = value === null ? '—' : Number.isInteger(value) ? value : value.toFixed(1)
  const unitStr = unit === 'binary' || unit === 'steps' ? '' : unit
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      padding: '12px 8px',
      background: 'rgba(5,8,20,0.5)',
      borderRadius: 10,
      border: `1px solid ${color}20`,
    }}>
      <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 28, lineHeight: 1, color, filter: `drop-shadow(0 0 8px ${color}60)` }}>
        {display}{unitStr && <span style={{ fontSize: 14 }}>{unitStr}</span>}
      </span>
      <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
    </div>
  )
}

function MetricCard({ metric, points, mean, stats, onEdit, onDelete }) {
  const insight = generateInsight(metric.name, stats)
  const color = metric.color || '#6366f1'
  const high = stats?.high ?? null
  const low  = stats?.low  ?? null
  const avg  = stats?.mean ?? null

  const insightColor = insight.type === 'warning' ? '#f43f5e' : insight.type === 'positive' ? '#1ad9a0' : '#8b5cf6'

  return (
    <div style={{
      background: 'rgba(8,12,26,0.72)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: `1px solid ${color}22`,
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: `0 0 40px ${color}08, 0 4px 24px rgba(0,0,0,0.4)`,
      transition: 'border-color 0.3s, box-shadow 0.3s',
      position: 'relative',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}50`; e.currentTarget.style.boxShadow = `0 0 60px ${color}18, 0 8px 32px rgba(0,0,0,0.5)` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = `${color}22`; e.currentTarget.style.boxShadow = `0 0 40px ${color}08, 0 4px 24px rgba(0,0,0,0.4)` }}
    >
      {/* Top accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: 0.7 }} />

      {/* Header */}
      <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: `${color}18`, border: `1px solid ${color}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
          }}>
            {metric.icon || '📊'}
          </div>
          <div>
            <div style={{
              fontFamily: '"Orbitron", sans-serif', fontSize: 15, fontWeight: 700,
              letterSpacing: '0.06em', color: 'white', lineHeight: 1,
            }}>
              {metric.name.toUpperCase()}
            </div>
            {stats?.currentStreak > 0 && (
              <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#1ad9a0', boxShadow: '0 0 6px #1ad9a0' }} />
                <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#1ad9a0', fontWeight: 600 }}>
                  {stats.currentStreak}d above average
                </span>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {onEdit && (
            <button onClick={onEdit} style={{ padding: '4px 10px', border: `1px solid ${color}30`, background: `${color}10`, color, fontFamily: 'Inter', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', borderRadius: 6 }}>
              Edit
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} style={{ padding: '4px 10px', border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#f43f5e', fontFamily: 'Inter', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', borderRadius: 6 }}>
              Del
            </button>
          )}
        </div>
      </div>

      {/* Stat row */}
      <div style={{ display: 'flex', gap: 8, padding: '0 24px 16px' }}>
        <StatBox label="High" value={high} unit={metric.unit} color="#1ad9a0" />
        <StatBox label="Avg"  value={avg}  unit={metric.unit} color={color} />
        <StatBox label="Low"  value={low}  unit={metric.unit} color="#f43f5e" />
      </div>

      {/* Chart */}
      <div style={{ padding: '0 8px 8px' }}>
        <OscillationGraph points={points} mean={mean ?? 0} metricId={metric.id} color={color} />
      </div>

      {/* Insight bar */}
      <div style={{
        margin: '0 16px 16px',
        padding: '12px 16px',
        background: `${insightColor}08`,
        border: `1px solid ${insightColor}25`,
        borderLeft: `3px solid ${insightColor}`,
        borderRadius: '0 10px 10px 0',
      }}>
        <span style={{ fontFamily: 'Inter', fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>{insight.text}</span>
      </div>
    </div>
  )
}

export default function LifeCycles() {
  const [dailyData] = useLocalStorage('marko_daily', { logs: {}, nonNegotiables: [], taskTemplates: [] })
  const [bodyData] = useLocalStorage('marko_body', { workouts: [], liftSessions: [] })
  const [dietData] = useLocalStorage('marko_diet', { targets: { calories: 2400, protein: 200 }, history: [] })
  const [cyclesConfig, setCyclesConfig] = useLocalStorage('marko_cycles_config', { customMetrics: [], customLogs: {} })

  const [showAddMetric, setShowAddMetric] = useState(false)
  const [newMetricName, setNewMetricName] = useState('')
  const [newMetricMax, setNewMetricMax] = useState('10')
  const [editingMetric, setEditingMetric] = useState(null)
  const [customLogInputs, setCustomLogInputs] = useState({})
  const [showWinSettings, setShowWinSettings] = useState(false)

  const allMetrics = [...DEFAULT_METRICS, ...(cyclesConfig.customMetrics || [])]

  const winSettings = getWinDaySettings()
  const winRatePoints = getWinRatePoints(winSettings, dailyData, bodyData, dietData)
  const winRateMeta = { id: 'daily_win_rate', name: 'Daily Win Rate', unit: 'binary', maxVal: 1 }
  const winDaysCount = winRatePoints.filter(p => p.value === 1).length
  const totalDays = winRatePoints.filter(p => p.value !== null).length
  const winRatePct = totalDays > 0 ? Math.round(winDaysCount / totalDays * 100) : 0

  const last30Days = useMemo(() => {
    const days = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      days.push({ dateStr: ds, label: `${d.getMonth() + 1}/${d.getDate()}` })
    }
    return days
  }, [])

  const metricData = useMemo(() => {
    return allMetrics.map(metric => {
      const points = last30Days.map(({ dateStr, label }) => {
        let value
        if (DEFAULT_METRICS.find(m => m.id === metric.id)) {
          value = getMetricValue(metric.id, dateStr, dailyData, bodyData, dietData)
        } else {
          value = cyclesConfig.customLogs?.[metric.id]?.[dateStr] ?? null
        }
        return { date: dateStr, label, value }
      })
      const stats = computeStats(points)
      const mean = stats?.mean ?? 0
      return { metric, points, stats, mean }
    })
  }, [allMetrics, last30Days, dailyData, bodyData, dietData, cyclesConfig])

  const activeMetrics = metricData.filter(m => m.stats !== null)
  const avgFloor = activeMetrics.length > 0
    ? Math.round(activeMetrics.reduce((s, m) => s + (m.stats?.low ?? 0), 0) / activeMetrics.length * 10) / 10
    : 0
  const longestStreak = activeMetrics.length > 0
    ? Math.max(...activeMetrics.map(m => m.stats?.currentStreak ?? 0))
    : 0

  const addCustomMetric = () => {
    if (!newMetricName.trim()) return
    const id = `custom_${Date.now()}`
    setCyclesConfig(c => ({
      ...c,
      customMetrics: [...(c.customMetrics || []), { id, name: newMetricName.trim(), unit: '', maxVal: parseFloat(newMetricMax) || 10 }]
    }))
    setNewMetricName(''); setNewMetricMax('10'); setShowAddMetric(false)
  }

  const deleteCustomMetric = (id) => {
    setCyclesConfig(c => ({
      ...c,
      customMetrics: (c.customMetrics || []).filter(m => m.id !== id)
    }))
  }

  const logCustomValue = (metricId) => {
    const val = parseFloat(customLogInputs[metricId])
    if (isNaN(val)) return
    const ds = new Date().toISOString().split('T')[0]
    setCyclesConfig(c => ({
      ...c,
      customLogs: { ...(c.customLogs || {}), [metricId]: { ...(c.customLogs?.[metricId] || {}), [ds]: val } }
    }))
    setCustomLogInputs(prev => ({ ...prev, [metricId]: '' }))
  }

  return (
    <div style={{ background: 'transparent', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(99,102,241,0.12)', padding: '24px 40px 20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #22d3ee 30%, #8b5cf6 60%, transparent)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 8px #22d3ee' }} />
              <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>OSCILLATION TRACKING</span>
            </div>
            <h1 style={{
              fontFamily: '"Orbitron",sans-serif', fontSize: 52, fontWeight: 900, lineHeight: 0.9,
              letterSpacing: '0.02em', margin: 0,
              background: 'linear-gradient(135deg, #22d3ee 0%, #8b5cf6 60%, #e879f9 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
            }}>
              LIFE CYCLES
            </h1>
            <p style={{ fontFamily: 'Inter', fontSize: 10, color: '#64748b', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 6 }}>
              TRACK YOUR PATTERNS · RAISE YOUR FLOOR
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={() => setShowWinSettings(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
                background: 'rgba(240,192,64,0.08)', color: '#f0c040',
                border: '1px solid rgba(240,192,64,0.25)', borderRadius: 10,
                fontFamily: 'Inter', fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Settings2 size={13} /> Win Settings
            </button>
            <button
              onClick={() => setShowAddMetric(!showAddMetric)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
                background: 'linear-gradient(135deg, #22d3ee, #8b5cf6)',
                color: '#fff', border: 'none', borderRadius: 10, fontFamily: 'Inter', fontSize: 11,
                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
                boxShadow: '0 0 24px rgba(34,211,238,0.3)',
              }}
            >
              + Add Metric
            </button>
          </div>
        </div>

        {/* Add metric panel */}
        {showAddMetric && (
          <div style={{
            maxWidth: 1200, margin: '16px auto 0',
            padding: '16px 20px', background: 'rgba(8,12,26,0.8)', border: '1px solid rgba(34,211,238,0.2)',
            borderRadius: 14, display: 'flex', gap: 12, alignItems: 'flex-end',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Metric Name</div>
              <input value={newMetricName} onChange={e => setNewMetricName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomMetric()} placeholder="e.g. Morning Energy"
                style={{ width: '100%', background: 'rgba(5,8,20,0.6)', border: '1px solid rgba(99,102,241,0.22)', borderRadius: 8, padding: '9px 14px', fontFamily: 'Inter', fontSize: 13, color: 'white', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ width: 120 }}>
              <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Max Value</div>
              <input value={newMetricMax} onChange={e => setNewMetricMax(e.target.value)} type="number"
                style={{ width: '100%', background: 'rgba(5,8,20,0.6)', border: '1px solid rgba(99,102,241,0.22)', borderRadius: 8, padding: '9px 14px', fontFamily: 'Inter', fontSize: 13, color: 'white', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <button onClick={addCustomMetric} style={{ padding: '9px 20px', background: 'linear-gradient(135deg, #22d3ee, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'Inter', fontSize: 12, fontWeight: 700 }}>Add</button>
            <button onClick={() => setShowAddMetric(false)} style={{ padding: '9px 16px', border: '1px solid rgba(99,102,241,0.2)', background: 'transparent', color: '#64748b', borderRadius: 8, cursor: 'pointer', fontFamily: 'Inter', fontSize: 12 }}>Cancel</button>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div style={{ padding: '20px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Avg Floor', value: avgFloor !== 0 ? String(avgFloor) : '—', sub: 'across all metrics', color: '#22d3ee' },
            { label: 'Best Streak', value: longestStreak > 0 ? `${longestStreak}d` : '—', sub: 'days above average', color: '#1ad9a0' },
            { label: 'Tracking', value: allMetrics.length, sub: 'active metrics', color: '#8b5cf6' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '20px 24px', borderRadius: 16,
              background: 'rgba(8,12,26,0.6)', backdropFilter: 'blur(16px)',
              border: `1px solid ${s.color}18`,
              textAlign: 'center',
            }}>
              <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 48, color: s.color, lineHeight: 1, filter: `drop-shadow(0 0 16px ${s.color}60)` }}>{s.value}</div>
              <div style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6 }}>{s.label}</div>
              <div style={{ fontFamily: 'Inter', fontSize: 10, color: '#475569', marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

      {/* Daily Win Rate — full width */}
      <div style={{
        background: 'rgba(8,12,26,0.72)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(240,192,64,0.22)', borderRadius: 20,
        overflow: 'hidden', marginBottom: 24,
        boxShadow: '0 0 40px rgba(240,192,64,0.06)',
      }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg, transparent, #f0c040, transparent)', opacity: 0.7 }} />
        <div style={{ padding: '20px 28px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(240,192,64,0.12)', border: '1px solid rgba(240,192,64,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏆</div>
            <div>
              <div style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 15, fontWeight: 700, letterSpacing: '0.06em', color: 'white' }}>DAILY WIN RATE</div>
              <div style={{ fontFamily: 'Inter', fontSize: 10, color: '#94a3b8', marginTop: 3 }}>{winDaysCount} wins out of {totalDays} days logged</div>
            </div>
          </div>
          <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 52, color: '#f0c040', lineHeight: 1, filter: 'drop-shadow(0 0 20px rgba(240,192,64,0.6))' }}>
            {winRatePct}<span style={{ fontSize: 24 }}>%</span>
          </div>
        </div>
        <div style={{ padding: '0 8px 8px' }}>
          <OscillationGraph points={winRatePoints} mean={0.5} metricId="daily_win_rate" color="#f0c040" />
        </div>
        <div style={{ margin: '0 16px 16px', padding: '12px 16px', background: 'rgba(240,192,64,0.06)', border: '1px solid rgba(240,192,64,0.15)', borderLeft: '3px solid #f0c040', borderRadius: '0 10px 10px 0' }}>
          <span style={{ fontFamily: 'Inter', fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>
            {totalDays < 3 ? 'Log at least 3 days to detect your win pattern.' :
              winRatePct >= 80 ? `You are winning ${winRatePct}% of days. Elite consistency. Protect the streak.` :
              winRatePct >= 60 ? `You are winning ${winRatePct}% of days. Good, but there are ${totalDays - winDaysCount} loss days to reclaim.` :
              `You are winning ${winRatePct}% of days. Your loss days outnumber your wins. Start a new run today.`}
          </span>
        </div>
      </div>

      {/* Metric cards — 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, paddingBottom: 40 }}>
        {metricData.map(({ metric, points, stats, mean }) => {
          const isCustom = !DEFAULT_METRICS.find(m => m.id === metric.id)
          return (
            <div key={metric.id} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <MetricCard
                metric={metric}
                points={points}
                mean={mean}
                stats={stats}
                onEdit={isCustom ? () => setEditingMetric(metric) : null}
                onDelete={isCustom ? () => deleteCustomMetric(metric.id) : null}
              />
              {isCustom && (
                <div style={{
                  padding: '10px 20px', background: 'rgba(5,8,20,0.6)',
                  border: '1px solid rgba(99,102,241,0.12)', borderTop: 'none',
                  borderRadius: '0 0 16px 16px', display: 'flex', gap: 10, alignItems: 'center'
                }}>
                  <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#64748b' }}>Log today:</span>
                  <input type="number" value={customLogInputs[metric.id] || ''}
                    onChange={e => setCustomLogInputs(prev => ({ ...prev, [metric.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && logCustomValue(metric.id)}
                    placeholder={`0–${metric.maxVal}`}
                    style={{ width: 80, background: 'transparent', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, padding: '5px 10px', fontFamily: 'Inter', fontSize: 12, color: 'white', outline: 'none' }} />
                  <button onClick={() => logCustomValue(metric.id)}
                    style={{ padding: '5px 14px', background: 'linear-gradient(135deg, #22d3ee, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 6, fontFamily: 'Inter', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    Save
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      </div>

      {showWinSettings && (
        <WinDaySettings
          onClose={() => setShowWinSettings(false)}
          dailyData={dailyData}
          bodyData={bodyData}
          dietData={dietData}
        />
      )}
    </div>
  )
}
