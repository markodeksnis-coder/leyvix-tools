import { useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { calcStreak, today, daysAgo } from '../utils'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine
} from 'recharts'

const BG = 'transparent'
const SURF = 'rgba(5,8,20,0.75)'
const CARD_BORDER = 'rgba(99,102,241,0.18)'
const TEXT2 = '#94a3b8'
const CARD = { background: 'rgba(8,12,26,0.65)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 12, padding: 20 }
const LBL = { fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }
const CHART_TT = {
  contentStyle: { background: 'rgba(5,8,20,0.75)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 8, fontSize: 11, fontFamily: 'Inter' },
  labelStyle: { color: '#a0bcdf' }, itemStyle: { color: '#fff' },
}

function CircleGauge({ value, max = 10, size = 110, label, color = '#6366f1', delta }) {
  const r = 38, cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(1, (isNaN(value) ? 0 : value) / max)
  const offset = circ * (1 - pct)
  const stateMap = max === 100
    ? (value >= 85 ? ['PRIMED', '#1ad9a0'] : value >= 70 ? ['CHARGED', '#6366f1'] : value >= 50 ? ['STABLE', '#6366f1'] : ['DEGRADED', '#f43f5e'])
    : (value >= 7 ? ['OPERATIONAL', '#1ad9a0'] : value >= 5 ? ['STABLE', '#6366f1'] : ['DEGRADED', '#f43f5e'])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ background: 'rgba(8,12,26,0.65)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 12, padding: '16px 20px', textAlign: 'center', minWidth: 130 }}>
        <div style={{ position: 'relative', width: size, height: size, margin: '0 auto 8px' }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e3050" strokeWidth={7} />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={7}
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
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />
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

export default function Insights() {
  const [checkLogs] = useLocalStorage('marko_checklogs', {})
  const [habits] = useLocalStorage('marko_habits', [])
  const [diet] = useLocalStorage('marko_diet', { targets: { calories: 2800 }, history: [] })

  const todayStr = today()
  const dayCount = (() => {
    const start = localStorage.getItem('marko_app_start')
    if (!start) return 1
    return Math.max(1, Math.floor((Date.now() - new Date(start).getTime()) / 86400000) + 1)
  })()

  // Build last 30 days data
  const trend30 = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const ds = daysAgo(29 - i)
      const log = checkLogs[ds] || {}
      const m = log.morning || {}
      const e = log.evening || {}
      return {
        date: ds.slice(5),
        energy: m.energy ? parseFloat(m.energy) : null,
        mood: m.mood ? parseFloat(m.mood) : null,
        sleep: m.sleep ? parseFloat(m.sleep) : null,
        stress: e.stress ? parseFloat(e.stress) : null,
      }
    }).filter(d => d.energy || d.mood || d.sleep)
  }, [checkLogs])

  // 7-day averages
  const pulse7 = useMemo(() => {
    const days7 = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i))
    const vals = { energy: [], mood: [], sleep: [], stress: [] }
    days7.forEach(ds => {
      const m = checkLogs[ds]?.morning || {}
      const e = checkLogs[ds]?.evening || {}
      if (m.energy) vals.energy.push(+m.energy)
      if (m.mood) vals.mood.push(+m.mood)
      if (m.sleep) vals.sleep.push(+m.sleep)
      if (e.stress) vals.stress.push(+e.stress)
    })
    const avg = arr => arr.length ? arr.reduce((a, b) => a + b) / arr.length : 0
    // prev 7 for delta
    const prev7 = Array.from({ length: 7 }, (_, i) => daysAgo(13 - i))
    const prev = { energy: [], mood: [], sleep: [] }
    prev7.forEach(ds => {
      const m = checkLogs[ds]?.morning || {}
      if (m.energy) prev.energy.push(+m.energy)
      if (m.mood) prev.mood.push(+m.mood)
      if (m.sleep) prev.sleep.push(+m.sleep)
    })
    const pavg = arr => arr.length ? arr.reduce((a, b) => a + b) / arr.length : null
    const recovery = (() => {
      const e = avg(vals.energy), s = avg(vals.sleep)
      if (!e && !s) return 0
      return Math.round(((e / 10) * 0.5 + (s / 10) * 0.5) * 100)
    })()
    return {
      energy: avg(vals.energy),
      mood: avg(vals.mood),
      sleep: avg(vals.sleep),
      stress: avg(vals.stress),
      recovery,
      deltas: {
        energy: pavg(prev.energy) !== null ? avg(vals.energy) - pavg(prev.energy) : null,
        mood: pavg(prev.mood) !== null ? avg(vals.mood) - pavg(prev.mood) : null,
        sleep: pavg(prev.sleep) !== null ? avg(vals.sleep) - pavg(prev.sleep) : null,
      }
    }
  }, [checkLogs])

  // Streak Ledger — King of Fire
  const streakRanking = useMemo(() => {
    return habits
      .map(h => ({ ...h, streak: calcStreak(h.logs || {}) }))
      .sort((a, b) => b.streak.current - a.streak.current)
      .slice(0, 7)
  }, [habits])

  // Correlations
  const correlations = useMemo(() => {
    const pairs = []
    // Sleep → Energy (same day)
    const sleepEnergy = Object.entries(checkLogs)
      .map(([, log]) => ({ s: parseFloat(log.morning?.sleep), e: parseFloat(log.morning?.energy) }))
      .filter(x => !isNaN(x.s) && !isNaN(x.e))
    if (sleepEnergy.length >= 4) {
      const r = pearson(sleepEnergy.map(x => x.s), sleepEnergy.map(x => x.e))
      if (r !== null) pairs.push({ title: 'SLEEP QUALITY → ENERGY', subtitle: `Each +1pt sleep quality shifts energy +${(r * 0.8).toFixed(1)} pts. ${r > 0.6 ? 'Strong link.' : 'Moderate link.'}`, r, confidence: Math.round(Math.abs(r) * 100), n: sleepEnergy.length, color: '#6366f1' })
    }
    // Sleep → Mood
    const sleepMood = Object.entries(checkLogs)
      .map(([, log]) => ({ s: parseFloat(log.morning?.sleep), m: parseFloat(log.morning?.mood) }))
      .filter(x => !isNaN(x.s) && !isNaN(x.m))
    if (sleepMood.length >= 4) {
      const r = pearson(sleepMood.map(x => x.s), sleepMood.map(x => x.m))
      if (r !== null) pairs.push({ title: 'SLEEP QUALITY → MOOD', subtitle: `Each +1pt sleep quality shifts mood +${(r * 0.9).toFixed(1)} pts.`, r, confidence: Math.round(Math.abs(r) * 100), n: sleepMood.length, color: '#4d9fff' })
    }
    // Stress → Mood (inverse)
    const stressMood = Object.entries(checkLogs)
      .filter(([, log]) => log.morning && log.evening)
      .map(([, log]) => ({ s: parseFloat(log.evening?.stress), m: parseFloat(log.morning?.mood) }))
      .filter(x => !isNaN(x.s) && !isNaN(x.m))
    if (stressMood.length >= 4) {
      const r = pearson(stressMood.map(x => x.s), stressMood.map(x => x.m))
      if (r !== null) pairs.push({ title: 'STRESS LOAD → MOOD', subtitle: `High stress days correlate with lower mood.`, r, confidence: Math.round(Math.abs(r) * 100), n: stressMood.length, color: '#f43f5e' })
    }
    return pairs
  }, [checkLogs])

  // Diet compliance trend
  const dietTrend = useMemo(() => {
    const target = diet.targets?.calories || 2800
    return Array.from({ length: 14 }, (_, i) => {
      const ds = daysAgo(13 - i)
      const h = diet.history?.find(x => x.date === ds)
      return { date: ds.slice(5), pct: h ? Math.round((h.calories / target) * 100) : 0 }
    })
  }, [diet])

  const hasLogs = Object.keys(checkLogs).length > 0
  const FLAME_COLORS = ['#6366f1', '#6366f1', '#6366f1', '#6366f1', '#f43f5e', '#e11d48', '#be123c']

  return (
    <div style={{ background: BG, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: BG, borderBottom: `1px solid ${CARD_BORDER}`, padding: '20px 32px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4d9fff' }} />
              <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, color: '#a0bcdf', letterSpacing: '0.12em', textTransform: 'uppercase' }}>PATTERN DETECTION ONLINE</span>
            </div>
            <h1 style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 64, fontWeight: 900, lineHeight: 0.9, letterSpacing: '0.02em', background: 'linear-gradient(135deg, #6366f1, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0, fontStyle: 'italic' }}>INSIGHTS</h1>
            <p style={{ fontFamily: 'Inter', fontSize: 10, color: '#a0bcdf', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>THE WAR ROOM // TRENDS · CORRELATIONS · FORECAST</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ background: SURF, border: `1px solid ${CARD_BORDER}`, borderRadius: 8, padding: '6px 14px', fontFamily: 'Inter', fontSize: 11, fontWeight: 600, color: TEXT2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: '"Orbitron",sans-serif', fontWeight: 900, color: '#6366f1' }}>{dayCount}</span> DAYS ENGRAVED
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {!hasLogs && (
          <div style={{ ...CARD, textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 36, color: '#a0bcdf', letterSpacing: '0.04em', marginBottom: 8 }}>NO DATA YET</div>
            <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#a0bcdf' }}>Log your morning check-ins in The Record → War Room Ledger to unlock pattern detection.</p>
          </div>
        )}

        {/* 7-Day Pulse */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em' }}>⚡ 7-DAY PULSE</span>
            </div>
            <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.1em' }}>CURRENT VS PRIOR 7-DAY BASELINE</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <CircleGauge value={pulse7.energy} label="ENERGY" color="#6366f1" delta={pulse7.deltas.energy} />
            <CircleGauge value={pulse7.mood} label="MOOD" color="#4d9fff" delta={pulse7.deltas.mood} />
            <CircleGauge value={pulse7.sleep} label="SLEEP" color="#4d9fff" delta={pulse7.deltas.sleep} />
            <CircleGauge value={pulse7.recovery} max={100} label="RECOVERY" color="#22c55e" />
          </div>
        </div>

        {/* 30-Day Trends + Streak Ledger */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
          <div style={CARD}>
            <SectionTitle right="ENERGY · MOOD · SLEEP · STRESS">30-DAY TRENDS</SectionTitle>
            {trend30.length < 3 ? (
              <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#a0bcdf', textAlign: 'center', padding: '40px 0' }}>Log more days to see trends.</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trend30} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      {[['gE','#6366f1'],['gM','#4d9fff'],['gS','#4d9fff'],['gSt','#f43f5e']].map(([id,c]) => (
                        <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={c} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={c} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: '#7a95c0', fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} interval={4} />
                    <YAxis domain={[0, 10]} tick={{ fill: '#7a95c0', fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} width={20} />
                    <Tooltip {...CHART_TT} />
                    <Area type="monotone" dataKey="energy" stroke="#6366f1" fill="url(#gE)" strokeWidth={2} dot={false} connectNulls />
                    <Area type="monotone" dataKey="mood" stroke="#4d9fff" fill="url(#gM)" strokeWidth={2} dot={false} connectNulls />
                    <Area type="monotone" dataKey="sleep" stroke="#4d9fff" fill="url(#gS)" strokeWidth={2} dot={false} connectNulls />
                    <Area type="monotone" dataKey="stress" stroke="#f43f5e" fill="url(#gSt)" strokeWidth={2} dot={false} connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                  {[['ENERGY','#6366f1'],['MOOD','#4d9fff'],['SLEEP','#4d9fff'],['STRESS','#f43f5e']].map(([l,c]) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 20, height: 2, background: c, borderRadius: 1 }} />
                      <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div style={CARD}>
            <SectionTitle dot="#6366f1">STREAK LEDGER</SectionTitle>
            <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>KING OF FIRE</div>
            {streakRanking.length === 0 ? (
              <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#a0bcdf', textAlign: 'center', padding: '24px 0' }}>No habits yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {streakRanking.map((h, i) => (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: BG, borderRadius: 8, border: `1px solid ${CARD_BORDER}` }}>
                    <span style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 14, color: FLAME_COLORS[i] || '#a0bcdf', width: 20, textAlign: 'center' }}>#{i + 1}</span>
                    <span style={{ fontFamily: 'Inter', fontSize: 12, color: 'white', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 18, color: FLAME_COLORS[i] || '#a0bcdf' }}>{h.streak.current}</span>
                      <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0bcdf' }}>🔥</span>
                    </div>
                    <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0bcdf' }}>best {h.streak.longest}d</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Correlations */}
        {correlations.length > 0 && (
          <div style={CARD}>
            <SectionTitle dot="#4d9fff" right="AUTO-MINED FROM YOUR DAILY LOGS">CORRELATIONS DETECTED</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
              {correlations.map((c, i) => (
                <div key={i} style={{ background: 'transparent', border: `1px solid ${c.color}20`, borderRadius: 10, padding: 16 }}>
                  <div style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{c.title}</div>
                  <p style={{ fontFamily: 'Inter', fontSize: 11, color: '#a0bcdf', marginBottom: 12 }}>{c.subtitle}</p>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {[
                      { label: 'EFFECT', value: `r = ${c.r.toFixed(2)}`, color: c.color },
                      { label: 'CONFIDENCE', value: `${c.confidence}%`, color: 'white' },
                      { label: 'SAMPLE', value: `n=${c.n}`, color: '#a0bcdf' },
                    ].map(m => (
                      <div key={m.label}>
                        <div style={{ fontFamily: 'Inter', fontSize: 8, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{m.label}</div>
                        <div style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 700, color: m.color }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, height: 4, background: '#1e3050', borderRadius: 2 }}>
                    <div style={{ height: 4, background: c.color, borderRadius: 2, width: `${c.confidence}%` }} />
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
