import { useState, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { getWinRatePoints, getWinDaySettings } from '../utils/winLoss'
import WinDaySettings from '../components/WinDaySettings'
import { Settings2 } from 'lucide-react'

const DEFAULT_METRICS = [
  { id: 'diet_quality', name: 'Diet Quality', unit: '%', maxVal: 100 },
  { id: 'gym_session', name: 'Gym Session', unit: 'binary', maxVal: 1 },
  { id: 'sleep_quality', name: 'Sleep Quality', unit: '/10', maxVal: 10 },
  { id: 'steps', name: 'Steps', unit: 'steps', maxVal: 15000 },
  { id: 'cold_shower', name: 'Cold Shower', unit: 'binary', maxVal: 1 },
  { id: 'work_output', name: 'Work Output', unit: '/10', maxVal: 10 },
  { id: 'reading', name: 'Reading / Learning', unit: 'binary', maxVal: 1 },
  { id: 'daily_score', name: 'Daily Score', unit: '%', maxVal: 100 },
]

function getMetricValue(metricId, dateStr, dailyData, bodyData, dietData) {
  const log = dailyData.logs?.[dateStr]
  const items = log?.items || []
  switch (metricId) {
    case 'diet_quality': {
      const h = (dietData.history || []).find(h => h.date === dateStr)
      if (!h) return null
      const cT = dietData.targets?.calories || 2400
      const pT = dietData.targets?.protein || 200
      return Math.round(((Math.min(h.calories, cT) / cT) + (Math.min(h.protein, pT) / pT)) / 2 * 100)
    }
    case 'gym_session': {
      const t = [...(bodyData.workouts || []), ...(bodyData.liftSessions || [])].some(w => w.date === dateStr)
      return log ? (t ? 1 : 0) : null
    }
    case 'sleep_quality':
      return log?.sleep ?? null
    case 'steps':
      return log?.steps ?? null
    case 'cold_shower': {
      const item = items.find(i => i.isNonNeg && /cold shower/i.test(i.title))
      return item != null ? (item.checked ? 1 : 0) : null
    }
    case 'work_output':
      return log?.workOutput ?? null
    case 'reading': {
      const item = items.find(i => !i.isNonNeg && /read|learn/i.test(i.title))
      return item != null ? (item.checked ? 1 : 0) : null
    }
    case 'daily_score': {
      if (!log || !items.length) return null
      return Math.round(items.filter(i => i.checked).length / items.length * 100)
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

function OscillationGraph({ points, mean, metricId }) {
  const valid = points.filter(p => p.value !== null)
  if (valid.length < 7) {
    return (
      <div style={{
        height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter', fontSize: 11, color: '#a0bcdf', fontStyle: 'italic'
      }}>
        Not enough data yet. Keep logging daily.
      </div>
    )
  }

  const values = valid.map(p => p.value)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || 1

  const domainMin = Math.max(0, minVal - range * 0.1)
  const domainMax = maxVal + range * 0.1
  const domainRange = domainMax - domainMin || 1
  const meanYPct = Math.round((1 - (mean - domainMin) / domainRange) * 100)
  const clampedMeanYPct = Math.max(5, Math.min(95, meanYPct))

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`wave-${metricId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset={`${clampedMeanYPct}%`} stopColor="#1ad9a0" />
            <stop offset={`${clampedMeanYPct}%`} stopColor="#ff5555" />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" hide />
        <YAxis domain={[domainMin, domainMax]} hide />
        <Tooltip
          contentStyle={{ background: '#040810', border: '1px solid #1e3050', fontSize: 10, fontFamily: 'Inter', boxShadow: '0 0 20px rgba(34,211,238,0.1)' }}
          labelStyle={{ color: '#a0bcdf' }}
          formatter={(v) => [v !== null ? (Number.isInteger(v) ? v : v.toFixed(1)) : '—', '']}
        />
        <ReferenceLine y={mean} stroke="#a0bcdf" strokeDasharray="4 3" strokeWidth={1} strokeOpacity={0.5} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={`url(#wave-${metricId})`}
          strokeWidth={2.5}
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function MetricCard({ metric, points, mean, stats, onEdit, onDelete }) {
  const insight = generateInsight(metric.name, stats)
  const high = stats?.high ?? null
  const low = stats?.low ?? null

  return (
    <div style={{ background: 'linear-gradient(135deg, #080e1a 0%, #040810 100%)', border: '1px solid #1e3050', borderRadius: 12, overflow: 'hidden', marginBottom: 12, boxShadow: '0 0 0 1px rgba(34,211,238,0.06)' }}>
      <div style={{ padding: '14px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 24, letterSpacing: '0.04em', lineHeight: 1, background: 'linear-gradient(135deg, #22d3ee, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {metric.name.toUpperCase()}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            {high !== null && (
              <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#1ad9a0', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 4, padding: '2px 8px' }}>
                HIGH {Number.isInteger(high) ? high : high.toFixed(1)}{metric.unit !== 'binary' && metric.unit !== 'steps' ? metric.unit : ''}
              </span>
            )}
            {low !== null && (
              <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#ff5555', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 4, padding: '2px 8px' }}>
                LOW {Number.isInteger(low) ? low : low.toFixed(1)}{metric.unit !== 'binary' && metric.unit !== 'steps' ? metric.unit : ''}
              </span>
            )}
            {stats && (
              <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#a0bcdf' }}>
                avg {Number.isInteger(stats.mean) ? stats.mean : stats.mean.toFixed(1)}{metric.unit !== 'binary' && metric.unit !== 'steps' ? metric.unit : ''}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {onEdit && (
            <button onClick={onEdit} style={{ padding: '4px 10px', border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.08)', color: '#b8a0ff', fontFamily: 'Inter', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', borderRadius: 4 }}>
              Edit
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} style={{ padding: '4px 10px', border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ff5555', fontFamily: 'Inter', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', borderRadius: 4 }}>
              Delete
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '0 4px' }}>
        <OscillationGraph points={points} mean={mean ?? 0} metricId={metric.id} />
      </div>

      <div style={{
        margin: '8px 16px 16px',
        padding: '10px 14px',
        background: 'linear-gradient(135deg, #080e1a, #090918)',
        borderLeft: `3px solid ${insight.type === 'warning' ? '#f43f5e' : insight.type === 'positive' ? '#1ad9a0' : '#8b5cf6'}`,
        borderRadius: '0 6px 6px 0',
      }}>
        <span style={{ fontFamily: 'Inter', fontSize: 11, color: 'white', lineHeight: 1.5 }}>{insight.text}</span>
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
    <div style={{ background: '#080e1a', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ background: '#080e1a', borderBottom: '1px solid #162035', padding: '20px 32px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{
              fontFamily: '"Orbitron",sans-serif', fontSize: 64, fontWeight: 900, lineHeight: 0.9,
              fontStyle: 'italic', letterSpacing: '0.02em', margin: 0,
              background: 'linear-gradient(135deg, #22d3ee 0%, #8b5cf6 60%, #e879f9 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
            }}>
              LIFE CYCLES
            </h1>
            <p style={{
              fontFamily: 'Inter', fontSize: 10, color: '#a0bcdf', letterSpacing: '0.14em',
              textTransform: 'uppercase', marginTop: 4
            }}>
              TRACK YOUR OSCILLATIONS · RAISE YOUR FLOOR
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={() => setShowWinSettings(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                background: 'rgba(240,192,64,0.1)', color: '#f0c040',
                border: '1px solid rgba(240,192,64,0.3)', borderRadius: 8,
                fontFamily: 'Inter', fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
              }}
            >
              <Settings2 size={13} />
              Win Settings
            </button>
            <button
              onClick={() => setShowAddMetric(!showAddMetric)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                background: 'linear-gradient(135deg, #22d3ee, #8b5cf6)',
                color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'Inter', fontSize: 11,
                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
                boxShadow: '0 0 20px rgba(34,211,238,0.35)'
              }}
            >
              + Add Metric
            </button>
          </div>
        </div>

        {/* Add metric panel */}
        {showAddMetric && (
          <div style={{
            marginTop: 16, padding: '16px', background: 'linear-gradient(135deg, #080e1a, #040810)', border: '1px solid rgba(34,211,238,0.2)',
            borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-end', boxShadow: '0 0 20px rgba(34,211,238,0.06)'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                Metric Name
              </div>
              <input
                value={newMetricName}
                onChange={e => setNewMetricName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomMetric()}
                placeholder="e.g. Morning Energy"
                style={{
                  width: '100%', background: '#020609', border: '1px solid #1e3050', borderRadius: 6,
                  padding: '8px 12px', fontFamily: 'Inter', fontSize: 13, color: 'white', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ width: 120 }}>
              <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                Max Value
              </div>
              <input
                value={newMetricMax}
                onChange={e => setNewMetricMax(e.target.value)}
                type="number"
                style={{
                  width: '100%', background: '#020609', border: '1px solid #1e3050', borderRadius: 6,
                  padding: '8px 12px', fontFamily: 'Inter', fontSize: 13, color: 'white', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              onClick={addCustomMetric}
              style={{ padding: '8px 18px', background: 'linear-gradient(135deg, #22d3ee, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'Inter', fontSize: 11, fontWeight: 700, boxShadow: '0 0 12px rgba(34,211,238,0.3)' }}
            >
              Add
            </button>
            <button
              onClick={() => setShowAddMetric(false)}
              style={{ padding: '8px 14px', border: '1px solid #1e3050', background: 'transparent', color: '#a0bcdf', borderRadius: 6, cursor: 'pointer', fontFamily: 'Inter', fontSize: 11 }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #162035' }}>
        {[
          { label: 'Current Avg Floor', value: avgFloor !== 0 ? String(avgFloor) : '—', color: '#22d3ee' },
          { label: 'Longest Active Streak', value: longestStreak > 0 ? `${longestStreak}d` : '—', color: '#1ad9a0' },
          { label: 'Metrics Tracked', value: allMetrics.length, color: '#8b5cf6' },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: '16px 24px', borderRight: i < 2 ? '1px solid #162035' : 'none', background: 'linear-gradient(135deg, #080e1a, #040810)' }}>
            <div style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              {s.label}
            </div>
            <div style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 40, color: s.color, lineHeight: 1 }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Metric graphs */}
      <div style={{ padding: '24px 32px' }}>
        {/* Daily Win Rate — always first */}
        <div style={{ background: 'linear-gradient(135deg, #080e1a 0%, #040810 100%)', border: '1px solid rgba(240,192,64,0.3)', borderRadius: 12, overflow: 'hidden', marginBottom: 12, boxShadow: '0 0 0 1px rgba(240,192,64,0.08)' }}>
          <div style={{ padding: '14px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 24, letterSpacing: '0.04em', lineHeight: 1, background: 'linear-gradient(135deg, #f0c040, #f0c040)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                DAILY WIN RATE
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#f0c040', background: 'rgba(240,192,64,0.08)', border: '1px solid rgba(240,192,64,0.2)', borderRadius: 4, padding: '2px 8px' }}>
                  {winRatePct}% — {winDaysCount}/{totalDays} days
                </span>
              </div>
            </div>
          </div>
          <div style={{ padding: '0 4px' }}>
            <OscillationGraph points={winRatePoints} mean={0.5} metricId="daily_win_rate" />
          </div>
          <div style={{ margin: '8px 16px 16px', padding: '10px 14px', background: 'linear-gradient(135deg, #080e1a, #090918)', borderLeft: '3px solid #f0c040', borderRadius: '0 6px 6px 0' }}>
            <span style={{ fontFamily: 'Inter', fontSize: 11, color: 'white', lineHeight: 1.5 }}>
              {totalDays < 3 ? 'Log at least 3 days to detect your win pattern.' :
                winRatePct >= 80 ? `You are winning ${winRatePct}% of days. Elite consistency. Protect the streak.` :
                winRatePct >= 60 ? `You are winning ${winRatePct}% of days. Good, but there are ${totalDays - winDaysCount} loss days to reclaim.` :
                `You are winning ${winRatePct}% of days. Your loss days outnumber your wins. Start a new run today.`}
            </span>
          </div>
        </div>

        {metricData.map(({ metric, points, stats, mean }) => {
          const isCustom = !DEFAULT_METRICS.find(m => m.id === metric.id)
          return (
            <div key={metric.id}>
              <MetricCard
                metric={metric}
                points={points}
                mean={mean}
                stats={stats}
                onEdit={isCustom ? () => setEditingMetric(metric) : null}
                onDelete={isCustom ? () => deleteCustomMetric(metric.id) : null}
              />
              {/* Custom metric log input */}
              {isCustom && (
                <div style={{
                  marginTop: -6, marginBottom: 12, padding: '10px 20px', background: 'linear-gradient(135deg, #080e1a, #040810)',
                  border: '1px solid #1e3050', borderTop: 'none', borderRadius: '0 0 12px 12px',
                  display: 'flex', gap: 8, alignItems: 'center'
                }}>
                  <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#a0bcdf' }}>Log today's value:</span>
                  <input
                    type="number"
                    value={customLogInputs[metric.id] || ''}
                    onChange={e => setCustomLogInputs(prev => ({ ...prev, [metric.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && logCustomValue(metric.id)}
                    placeholder={`0–${metric.maxVal}`}
                    style={{
                      width: 80, background: '#020609', border: '1px solid #1e3050', borderRadius: 6,
                      padding: '5px 10px', fontFamily: 'Inter', fontSize: 12, color: 'white', outline: 'none'
                    }}
                  />
                  <button
                    onClick={() => logCustomValue(metric.id)}
                    style={{ padding: '5px 14px', background: 'linear-gradient(135deg, #22d3ee, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 6, fontFamily: 'Inter', fontSize: 11, fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 10px rgba(34,211,238,0.3)' }}
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          )
        })}
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
