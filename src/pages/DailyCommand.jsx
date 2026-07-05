import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { today, daysSinceStart, daysAgo } from '../utils'
import { getWinDaySettings, calcDayScore, getWinHistory, computeCurrentWinStreak } from '../utils/winLoss'

const GOLD   = '#f0c040'
const GREEN  = '#10b981'
const RED    = '#ff5555'
const INDIGO = '#818cf8'
const VIOLET = '#a78bfa'
const CYAN   = '#22d3ee'
const PINK   = '#e879f9'
const BLUE   = '#60a5fa'
const TEXT1  = '#e2e8f0'
const TEXT2  = '#94a3b8'
const MUTED  = '#475569'
const DARK   = '#334155'

const CAT_COLORS = { Body: '#2dd4bf', Business: BLUE, Mind: PINK, Daily: INDIGO, Custom: CYAN }

const LABEL_STYLE = {
  fontFamily: '"Orbitron", monospace',
  fontSize: 10, fontWeight: 700,
  color: '#94a3b8', letterSpacing: '0.18em',
  textTransform: 'uppercase',
}

const GLASS = {
  background: 'rgba(6, 9, 22, 0.82)',
  backdropFilter: 'blur(28px)',
  WebkitBackdropFilter: 'blur(28px)',
  border: '2px solid rgba(99,102,241,0.62)',
  borderRadius: 18,
  boxShadow: '0 6px 40px rgba(0,0,0,0.55), 0 0 60px rgba(99,102,241,0.08), inset 0 1px 0 rgba(99,102,241,0.12)',
}

function TopBar({ pct, isWin, scoreColor }) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ height: 5, background: 'rgba(99,102,241,0.1)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg, ${scoreColor}66, ${scoreColor})`,
          borderRadius: 3,
          boxShadow: `0 0 14px ${scoreColor}`,
          transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)',
        }} />
        {/* shimmer */}
        <div className="shimmer-bar" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 3 }} />
      </div>
    </div>
  )
}

export default function DailyCommand({ onNavigate }) {
  const todayStr = today()
  const dayNum   = daysSinceStart()
  const now      = new Date()
  const dateDisplay = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()

  const [dailyData]   = useLocalStorage('marko_daily',   { logs: {} })
  const [bodyData]    = useLocalStorage('marko_body',    { liftSessions: [] })
  const [dietData]    = useLocalStorage('marko_diet',    { history: [] })
  const [checkInData] = useLocalStorage('marko_checkin', {})

  const winSettings  = getWinDaySettings()
  const dayScore     = calcDayScore(todayStr, winSettings, dailyData, bodyData, dietData)
  const winHistory7  = getWinHistory(7,  winSettings, dailyData, bodyData, dietData)
  const winHistory30 = getWinHistory(30, winSettings, dailyData, bodyData, dietData)
  const winStreak    = computeCurrentWinStreak(winHistory30)

  const morningDone    = !!(checkInData?.morning?.[todayStr]?.completed)
  const eveningDone    = !!(checkInData?.evening?.[todayStr]?.completed)
  const morningAnswers = checkInData?.morning?.[todayStr]?.answers || {}
  const eveningAnswers = checkInData?.evening?.[todayStr]?.answers || {}

  const todayLog = (dailyData.logs || {})[todayStr] || {}
  const nonNegs  = (todayLog.items || []).filter(it => it.isNonNeg)

  const goals = JSON.parse(localStorage.getItem('marko_goals') || '[]')
    .filter(g => !g.archived)
    .sort((a, b) => new Date(a.endDate) - new Date(b.endDate))
    .slice(0, 3)

  const journal = JSON.parse(localStorage.getItem('marko_journal') || '[]')
  const latestJournal = [...journal].sort((a, b) => b.date.localeCompare(a.date))[0] || null

  const { pct, isWin, metrics = [] } = dayScore
  const scoreColor = pct >= (winSettings.threshold || 80) ? GOLD : pct >= 50 ? CYAN : RED

  const mit     = morningAnswers['mi16'] || ''
  const word    = morningAnswers['mi17'] || ''
  const energy  = morningAnswers['me6']  ?? null
  const overall = eveningAnswers['ed1']  ?? null

  const MOOD_SCORE = { 'Excellent': 9, 'Good': 7, 'Neutral': 5, 'Low': 3, 'Very low': 1 }

  // Today's pulse metrics from check-in
  const todayPulse = useMemo(() => ({
    energy: morningAnswers['me6']  != null ? +morningAnswers['me6']  : null,
    sleep:  morningAnswers['ms2']  != null ? +morningAnswers['ms2']  : null,
    mood:   morningAnswers['mm11'] != null ? (MOOD_SCORE[morningAnswers['mm11']] ?? null) : null,
    stress: eveningAnswers['em19'] != null ? +eveningAnswers['em19'] : null,
  }), [checkInData]) // eslint-disable-line react-hooks/exhaustive-deps

  // 7-day real averages: sleep hrs (ms1), calories, protein, steps
  const avg7 = useMemo(() => {
    const vals = { sleep: [], calories: [], protein: [], steps: [] }
    for (let i = 0; i < 7; i++) {
      const ds  = daysAgo(i)
      const log = (dailyData.logs || {})[ds]
      if (log?.sleepHours != null) vals.sleep.push(+log.sleepHours)
      const dh = (dietData.history || []).find(h => h.date === ds)
      if (dh?.calories) vals.calories.push(dh.calories)
      if (dh?.protein)  vals.protein.push(dh.protein)
      if (log?.steps != null) vals.steps.push(+log.steps)
    }
    const avgF = arr => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null
    const avgI = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null
    return {
      sleep:    avgF(vals.sleep),
      calories: avgI(vals.calories),
      protein:  avgI(vals.protein),
      steps:    avgI(vals.steps),
      days: Math.max(vals.sleep.length, vals.calories.length, vals.steps.length),
    }
  }, [dietData, dailyData])

  // All-time check-in averages for every key slider metric
  const checkinAvg = useMemo(() => {
    const MOOD_NUM = { 'Excellent': 9, 'Good': 7, 'Neutral': 5, 'Fluctuated': 5, 'Low': 3, 'Very low': 1 }
    const slots = {
      energy:      { vals: [], label: 'Energy',      color: GOLD,   src: 'm', id: 'me6'  },
      sleepQual:   { vals: [], label: 'Sleep Qual',  color: VIOLET, src: 'm', id: 'ms2'  },
      clarity:     { vals: [], label: 'Clarity',     color: CYAN,   src: 'm', id: 'mm12' },
      commitment:  { vals: [], label: 'Motivation',  color: GREEN,  src: 'm', id: 'mi18' },
      mood:        { vals: [], label: 'Mood',        color: PINK,   src: 'm', id: 'mm11', convert: v => MOOD_NUM[v] ?? null },
      stress:      { vals: [], label: 'Stress',      color: RED,    src: 'm', id: 'mm13' },
      dayRating:   { vals: [], label: 'Day Rating',  color: GOLD,   src: 'e', id: 'ed1'  },
      workFocus:   { vals: [], label: 'Work Focus',  color: BLUE,   src: 'e', id: 'ed4'  },
      dietQuality: { vals: [], label: 'Diet Quality',color: GREEN,  src: 'e', id: 'eb14' },
      evenStress:  { vals: [], label: 'Anxiety',     color: RED,    src: 'e', id: 'em19' },
      control:     { vals: [], label: 'Control',     color: CYAN,   src: 'e', id: 'em20' },
      workHoursAvg:{ vals: [], label: 'Work Hours',  color: '#fb923c', src: 'e', id: 'ed3' },
    }
    const mornings = checkInData?.morning || {}
    const evenings  = checkInData?.evening  || {}
    for (const ds of Object.keys(mornings)) {
      const ans = mornings[ds]?.answers || {}
      for (const cfg of Object.values(slots)) {
        if (cfg.src !== 'm') continue
        const raw = ans[cfg.id]
        if (raw == null) continue
        const v = cfg.convert ? cfg.convert(raw) : +raw
        if (v != null && !isNaN(v)) cfg.vals.push(v)
      }
    }
    for (const ds of Object.keys(evenings)) {
      const ans = evenings[ds]?.answers || {}
      for (const cfg of Object.values(slots)) {
        if (cfg.src !== 'e') continue
        const raw = ans[cfg.id]
        if (raw == null) continue
        const v = cfg.convert ? cfg.convert(raw) : +raw
        if (v != null && !isNaN(v)) cfg.vals.push(v)
      }
    }
    const avg = arr => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null
    return Object.fromEntries(
      Object.entries(slots).map(([k, v]) => [k, { ...v, avg: avg(v.vals), count: v.vals.length }])
    )
  }, [checkInData])

  // 30-day trend data for the metrics graph — wellbeing scores (0-10) + lifestyle metrics (normalized to 0-10)
  const norm = (v, max) => v == null ? null : Math.min(10, +((v / max) * 10).toFixed(2))

  const trendData = useMemo(() => {
    const MOOD_NUM = { 'Excellent': 9, 'Good': 7, 'Neutral': 5, 'Fluctuated': 5, 'Low': 3, 'Very low': 1 }
    return Array.from({ length: 30 }, (_, i) => {
      const ds  = daysAgo(29 - i)
      const dt  = new Date(ds + 'T12:00:00')
      const ma  = checkInData?.morning?.[ds]?.answers || {}
      const ea  = checkInData?.evening?.[ds]?.answers  || {}
      const log = (dailyData.logs || {})[ds] || {}
      const diet = (dietData.history || []).find(h => h.date === ds)
      const label = `${dt.getMonth() + 1}/${dt.getDate()}`
      const hasData = Object.keys(ma).length > 0 || Object.keys(ea).length > 0

      const calories = diet?.calories || null
      const protein  = diet?.protein  || null
      const steps     = log.steps != null ? +log.steps : null
      let workoutHours = log.workoutHours != null ? +log.workoutHours : null
      if (workoutHours == null) {
        const trained = [...(bodyData?.liftSessions || []), ...(bodyData?.workouts || [])].some(w => w.date === ds)
        workoutHours = trained ? 1 : null
      }
      const bizHours   = log.bizHours    != null ? +log.bizHours    : null
      const sleepHours = log.sleepHours  != null ? +log.sleepHours  : null

      return {
        date: ds, label,
        energy:      ma['me6']  != null ? +ma['me6']  : null,
        dayRating:   ea['ed1']  != null ? +ea['ed1']  : null,
        dietQuality: ea['eb14'] != null ? +ea['eb14'] : null,
        stress:      ea['em19'] != null ? +ea['em19'] : null,
        mood:        ma['mm11'] != null ? (MOOD_NUM[ma['mm11']] ?? null) : null,
        calories, caloriesNorm: norm(calories, 3000),
        protein,  proteinNorm:  norm(protein, 200),
        steps,    stepsNorm:    norm(steps, 15000),
        workoutHours, workoutNorm: norm(workoutHours, 3),
        bizHours, bizHoursNorm: norm(bizHours, 12),
        sleepHours, sleepNorm: norm(sleepHours, 10),
        hasData,
      }
    })
  }, [checkInData, dailyData, dietData, bodyData])

  const trimmedTrend = useMemo(() => {
    const first = trendData.findIndex(d => d.hasData)
    return first > 0 ? trendData.slice(Math.max(0, first - 1)) : trendData
  }, [trendData])

  // Daily habit tracking — last 7 days
  const habitHistory7 = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const ds  = daysAgo(6 - i)
      const log = (dailyData.logs || {})[ds] || {}
      return {
        date: ds,
        dow: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(ds + 'T12:00:00').getDay()],
        isToday: ds === todayStr,
        read:      log.mentalRead === 1,
        meditated: log.meditated  === 1,
        prayed:    log.prayed     === 1,
        bible:     log.readBible  === 1,
        hasData: Object.keys(log).length > 0,
      }
    })
  }, [dailyData, todayStr])

  // Habit streak risks — streak length looking backwards from yesterday; flag if today not yet done
  const streakRisks = useMemo(() => {
    const items = [
      { key: 'prayed',     label: 'Prayer',  icon: '🙏', todayDone: todayLog.prayed     === 1 },
      { key: 'readBible',  label: 'Bible',   icon: '📖', todayDone: todayLog.readBible  === 1 },
      { key: 'mentalRead', label: 'Reading', icon: '📚', todayDone: todayLog.mentalRead === 1 },
      { key: 'meditated',  label: 'Meditate',icon: '🧘', todayDone: todayLog.meditated  === 1 },
    ]
    const risks = []
    for (const h of items) {
      let streak = 0
      for (let i = 1; i <= 60; i++) {
        const ds = daysAgo(i)
        const log = (dailyData.logs || {})[ds] || {}
        if (log[h.key] === 1) streak++
        else break
      }
      if (streak > 0 && !h.todayDone) risks.push({ ...h, streak })
    }
    let wStreak = 0
    for (let i = 1; i <= 60; i++) {
      const ds = daysAgo(i)
      const trained = [...(bodyData?.liftSessions || []), ...(bodyData?.workouts || [])].some(w => w.date === ds)
      if (trained) wStreak++
      else break
    }
    const todayTrained = [...(bodyData?.liftSessions || []), ...(bodyData?.workouts || [])].some(w => w.date === todayStr)
    if (wStreak > 0 && !todayTrained) risks.push({ key: 'workout', label: 'Training', icon: '💪', streak: wStreak, todayDone: false })
    return risks
  }, [dailyData, bodyData, todayLog, todayStr])

  // Daily brief — yesterday's bottleneck + today's edge
  const dailyBrief = useMemo(() => {
    const yLog = (dailyData.logs || {})[daysAgo(1)] || {}
    const yMetrics = [
      { label: 'Energy',      val: yLog.energy      != null ? +yLog.energy      : null },
      { label: 'Day Rating',  val: yLog.dailyRating != null ? +yLog.dailyRating : null },
      { label: 'Diet Quality',val: yLog.dietQuality != null ? +yLog.dietQuality : null },
      { label: 'Work Focus',  val: yLog.workOutput  != null ? +yLog.workOutput  : null },
      { label: 'Sleep Qual',  val: yLog.sleep       != null ? +yLog.sleep       : null },
    ].filter(m => m.val != null)
    const bottleneck = yMetrics.length > 0 ? yMetrics.reduce((mn, m) => m.val < mn.val ? m : mn) : null
    const edgeCandidates = [
      { label: 'Energy',    val: morningAnswers['me6']  != null ? +morningAnswers['me6']  : null },
      { label: 'Clarity',   val: morningAnswers['mm12'] != null ? +morningAnswers['mm12'] : null },
      { label: 'Commitment',val: morningAnswers['mi18'] != null ? +morningAnswers['mi18'] : null },
    ].filter(m => m.val != null)
    const edge = edgeCandidates.length > 0 ? edgeCandidates.reduce((mx, m) => m.val > mx.val ? m : mx) : null
    return { bottleneck, edge }
  }, [dailyData, morningAnswers])

  const dayLabel = `DAY ${String(dayNum).padStart(3, '0')}`

  return (
    <div style={{ background: 'transparent', minHeight: '100%', overflowY: 'auto' }}>

      {/* ── HERO HEADER ── */}
      <div className="fade-in" style={{
        background: 'rgba(4, 6, 18, 0.94)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderBottom: '2px solid rgba(99,102,241,0.55)',
        boxShadow: '0 4px 40px rgba(99,102,241,0.1)',
        padding: '24px 26px 20px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Top gradient line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,1) 25%, rgba(139,92,246,0.9) 55%, rgba(6,182,212,0.7) 80%, transparent 100%)',
          filter: 'blur(0.5px)',
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          {/* Day + date */}
          <div>
            <div style={{ ...LABEL_STYLE, color: INDIGO, marginBottom: 8, textShadow: '0 0 12px rgba(99,102,241,0.5)' }}>
              MARKO OS — COMMAND CENTER
            </div>
            <div className="text-gold-gradient" style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 900, fontSize: 62, lineHeight: 0.92,
              letterSpacing: '-0.01em',
            }}>
              {dayLabel}
            </div>
            <div style={{ fontFamily: 'Inter', fontSize: 10, color: DARK, marginTop: 8, letterSpacing: '0.12em' }}>
              {dateDisplay}
            </div>
          </div>

          {/* Score badge */}
          <div style={{
            ...GLASS,
            padding: '14px 18px', minWidth: 90,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            border: isWin
              ? '2px solid rgba(240,192,64,0.75)'
              : pct > 0
                ? '2px solid rgba(255,85,85,0.6)'
                : '2px solid rgba(99,102,241,0.45)',
            boxShadow: isWin
              ? '0 0 50px rgba(240,192,64,0.25), 0 0 20px rgba(240,192,64,0.15) inset'
              : pct > 0
                ? '0 0 30px rgba(255,85,85,0.15)'
                : 'none',
          }}>
            <span style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 900, fontSize: 46, lineHeight: 1,
              color: scoreColor,
              textShadow: `0 0 30px ${scoreColor}88`,
            }}>{pct}%</span>
            <div style={{
              fontFamily: '"Orbitron", monospace', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.1em', color: scoreColor,
              textShadow: `0 0 10px ${scoreColor}66`,
            }}>
              {pct === 0 ? 'PENDING' : isWin ? '🏆 WIN' : '📉 LOSS'}
            </div>
          </div>
        </div>

        <TopBar pct={pct} isWin={isWin} scoreColor={scoreColor} />
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── CHECK-IN CARDS ── */}
        <div className="fade-up delay-1" style={{ display: 'flex', gap: 14 }}>

          {/* MORNING */}
          <div style={{
            flex: 1, ...GLASS, padding: '18px 16px',
            position: 'relative', overflow: 'hidden',
            border: morningDone ? '2px solid rgba(240,192,64,0.75)' : '2px solid rgba(99,102,241,0.45)',
            boxShadow: morningDone ? '0 0 60px rgba(240,192,64,0.18), inset 0 1px 0 rgba(240,192,64,0.15)' : '0 0 30px rgba(99,102,241,0.08)',
            transition: 'all 0.3s ease',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 4,
              background: morningDone
                ? 'linear-gradient(90deg, transparent, #f0c040, #fb923c, transparent)'
                : 'linear-gradient(90deg, transparent, rgba(99,102,241,0.8), rgba(139,92,246,0.6), transparent)',
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 22, filter: 'drop-shadow(0 0 8px rgba(240,192,64,0.5))' }}>☀️</span>
              <div>
                <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 9, color: GOLD, letterSpacing: '0.12em', fontWeight: 700, textShadow: '0 0 10px rgba(240,192,64,0.4)' }}>MORNING</div>
                {morningDone && <div style={{ fontFamily: 'Inter', fontSize: 9, color: GREEN, fontWeight: 700, marginTop: 2 }}>✓ COMPLETE</div>}
              </div>
            </div>

            {morningDone ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[
                  { label: 'Energy',   value: morningAnswers['me6']  != null ? `${morningAnswers['me6']}/10` : null,  color: GOLD   },
                  { label: 'Sleep',    value: morningAnswers['ms1']  != null ? `${morningAnswers['ms1']} hrs` : null, color: VIOLET },
                  { label: 'Mood',     value: morningAnswers['mm11'] || null,                                         color: PINK   },
                  { label: 'Stress',   value: morningAnswers['mm13'] != null ? `${morningAnswers['mm13']}/10` : null, color: RED    },
                  { label: 'Clarity',  value: morningAnswers['mm12'] != null ? `${morningAnswers['mm12']}/10` : null, color: CYAN   },
                  { label: 'Commit',   value: morningAnswers['mi18'] != null ? `${morningAnswers['mi18']}/10` : null, color: GREEN  },
                ].filter(r => r.value !== null).map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Inter', fontSize: 11, color: MUTED, fontWeight: 600 }}>{label}</span>
                    <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 18, color, textShadow: `0 0 10px ${color}88` }}>
                      {value}
                    </span>
                  </div>
                ))}
                {word && (
                  <div style={{ marginTop: 4, paddingTop: 8, borderTop: '1px solid rgba(99,102,241,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Inter', fontSize: 10, color: MUTED }}>Word</span>
                    <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 9, fontWeight: 700, color: CYAN, letterSpacing: '0.1em' }}>{word.toUpperCase()}</span>
                  </div>
                )}
                {mit && (
                  <div style={{ paddingTop: 6, borderTop: '1px solid rgba(99,102,241,0.1)' }}>
                    <div style={{ fontFamily: 'Inter', fontSize: 10, color: MUTED, fontWeight: 600, marginBottom: 3 }}>MIT</div>
                    <div style={{ fontFamily: 'Inter', fontSize: 11, color: TEXT1, lineHeight: 1.5 }}>{mit}</div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => onNavigate?.('morning')}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #f0c040, #fb923c)',
                  border: 'none', borderRadius: 10, padding: '12px 0',
                  fontFamily: '"Orbitron", monospace', fontSize: 9, fontWeight: 700,
                  color: '#000', cursor: 'pointer', letterSpacing: '0.1em',
                  boxShadow: '0 4px 24px rgba(240,192,64,0.35), 0 0 50px rgba(240,192,64,0.12)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 36px rgba(240,192,64,0.5), 0 0 80px rgba(240,192,64,0.18)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(240,192,64,0.35), 0 0 50px rgba(240,192,64,0.12)'; }}
              >
                START MORNING →
              </button>
            )}
          </div>

          {/* EVENING */}
          <div style={{
            flex: 1, ...GLASS, padding: '18px 16px',
            position: 'relative', overflow: 'hidden',
            border: eveningDone ? '2px solid rgba(167,139,250,0.75)' : '2px solid rgba(99,102,241,0.45)',
            boxShadow: eveningDone ? '0 0 60px rgba(167,139,250,0.18), inset 0 1px 0 rgba(167,139,250,0.15)' : '0 0 30px rgba(99,102,241,0.08)',
            transition: 'all 0.3s ease',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 4,
              background: eveningDone
                ? 'linear-gradient(90deg, transparent, #8b5cf6, #ec4899, transparent)'
                : 'linear-gradient(90deg, transparent, rgba(99,102,241,0.8), rgba(139,92,246,0.6), transparent)',
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 22, filter: 'drop-shadow(0 0 8px rgba(167,139,250,0.5))' }}>🌙</span>
              <div>
                <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 9, color: VIOLET, letterSpacing: '0.12em', fontWeight: 700, textShadow: '0 0 10px rgba(167,139,250,0.4)' }}>EVENING</div>
                {eveningDone && <div style={{ fontFamily: 'Inter', fontSize: 9, color: GREEN, fontWeight: 700, marginTop: 2 }}>✓ COMPLETE</div>}
              </div>
            </div>

            {eveningDone ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[
                  { label: 'Overall',    value: eveningAnswers['ed1']  != null ? `${eveningAnswers['ed1']}/10`  : null, color: GOLD   },
                  { label: 'Work Hrs',   value: eveningAnswers['ed3']  != null ? `${eveningAnswers['ed3']} hrs` : null, color: '#fb923c' },
                  { label: 'Focus',      value: eveningAnswers['ed4']  != null ? `${eveningAnswers['ed4']}/10`  : null, color: BLUE   },
                  { label: 'Diet',       value: eveningAnswers['eb14'] != null ? `${eveningAnswers['eb14']}/10` : null, color: GREEN  },
                  { label: 'Stress',     value: eveningAnswers['em19'] != null ? `${eveningAnswers['em19']}/10` : null, color: RED    },
                  { label: 'Control',    value: eveningAnswers['em20'] != null ? `${eveningAnswers['em20']}/10` : null, color: CYAN   },
                  { label: 'Biz Exec',   value: eveningAnswers['eb25'] != null ? `${eveningAnswers['eb25']}/10` : null, color: VIOLET },
                  { label: 'Steps',      value: eveningAnswers['eb16'] != null ? eveningAnswers['eb16'].toLocaleString() : null, color: '#34d399' },
                ].filter(r => r.value !== null).map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Inter', fontSize: 11, color: MUTED, fontWeight: 600 }}>{label}</span>
                    <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 18, color, textShadow: `0 0 10px ${color}88` }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <button
                onClick={() => onNavigate?.('evening')}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  border: 'none', borderRadius: 10, padding: '12px 0',
                  fontFamily: '"Orbitron", monospace', fontSize: 9, fontWeight: 700,
                  color: '#fff', cursor: 'pointer', letterSpacing: '0.1em',
                  boxShadow: '0 4px 24px rgba(139,92,246,0.35), 0 0 50px rgba(139,92,246,0.12)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 36px rgba(139,92,246,0.5), 0 0 80px rgba(139,92,246,0.18)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(139,92,246,0.35), 0 0 50px rgba(139,92,246,0.12)'; }}
              >
                START EVENING →
              </button>
            )}
          </div>
        </div>

        {/* ── DAILY BRIEF ── */}
        {(dailyBrief.bottleneck || dailyBrief.edge || streakRisks.length > 0 || mit) && (
          <div className="fade-up delay-2" style={{
            ...GLASS, padding: '18px 20px', position: 'relative', overflow: 'hidden',
            border: '2px solid rgba(34,211,238,0.45)',
            boxShadow: '0 6px 40px rgba(0,0,0,0.55), 0 0 60px rgba(34,211,238,0.08), inset 0 1px 0 rgba(34,211,238,0.12)',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.9), rgba(99,102,241,0.7), transparent)' }} />
            <div style={{ ...LABEL_STYLE, color: CYAN, textShadow: '0 0 12px rgba(34,211,238,0.5)', marginBottom: 14 }}>Daily Brief</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
              {mit && (
                <div style={{ padding: '12px 14px', borderRadius: 12, background: `${GOLD}12`, border: `1px solid ${GOLD}50` }}>
                  <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, color: GOLD, letterSpacing: '0.15em', marginBottom: 6 }}>MIT TODAY</div>
                  <div style={{ fontFamily: 'Inter', fontSize: 12, color: TEXT1, lineHeight: 1.5, fontWeight: 600 }}>{mit}</div>
                </div>
              )}
              {dailyBrief.edge && (
                <div style={{ padding: '12px 14px', borderRadius: 12, background: `${GREEN}10`, border: `1px solid ${GREEN}40` }}>
                  <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, color: GREEN, letterSpacing: '0.15em', marginBottom: 6 }}>TODAY'S EDGE</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 40, color: GREEN, textShadow: `0 0 20px ${GREEN}88` }}>{dailyBrief.edge.val}</span>
                    <span style={{ fontFamily: 'Inter', fontSize: 11, color: GREEN, fontWeight: 700 }}>{dailyBrief.edge.label}</span>
                  </div>
                </div>
              )}
              {dailyBrief.bottleneck && (
                <div style={{ padding: '12px 14px', borderRadius: 12, background: `${RED}0e`, border: `1px solid ${RED}40` }}>
                  <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, color: RED, letterSpacing: '0.15em', marginBottom: 6 }}>YESTERDAY'S GAP</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 40, color: RED, textShadow: '0 0 20px rgba(255,85,85,0.5)' }}>{dailyBrief.bottleneck.val}</span>
                    <span style={{ fontFamily: 'Inter', fontSize: 11, color: RED, fontWeight: 700 }}>{dailyBrief.bottleneck.label}</span>
                  </div>
                </div>
              )}
              {streakRisks.length > 0 && (
                <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.4)' }}>
                  <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, color: '#fb923c', letterSpacing: '0.15em', marginBottom: 8 }}>STREAKS AT RISK</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {streakRisks.map(r => (
                      <div key={r.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#fb923c', fontWeight: 600 }}>{r.icon} {r.label}</span>
                        <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 17, color: '#fb923c' }}>{r.streak}🔥</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TODAY'S PULSE ── */}
        {(todayPulse.energy !== null || todayPulse.sleep !== null || todayPulse.mood !== null) && (
          <div className="fade-up delay-2" style={{ ...GLASS, padding: '18px 20px' }}>
            <div style={{ ...LABEL_STYLE, marginBottom: 14, color: CYAN, textShadow: '0 0 12px rgba(34,211,238,0.4)' }}>
              Today's Pulse
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { label: 'Energy',  value: todayPulse.energy, color: GOLD,   suffix: '/10' },
                { label: 'Sleep',   value: todayPulse.sleep,  color: VIOLET, suffix: '/10' },
                { label: 'Mood',    value: todayPulse.mood,   color: PINK,   suffix: '/10' },
                { label: 'Stress',  value: todayPulse.stress, color: RED,    suffix: '/10' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  padding: '18px 8px 14px', borderRadius: 14,
                  background: value !== null ? `linear-gradient(160deg, ${color}28, ${color}0C)` : 'rgba(10,15,32,0.6)',
                  border: `2px solid ${value !== null ? color+'99' : 'rgba(40,55,100,0.7)'}`,
                  boxShadow: value !== null ? `0 0 40px ${color}30, inset 0 1px 0 ${color}30` : 'none',
                  overflow: 'hidden', position: 'relative',
                }}>
                  <span style={{
                    fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900,
                    fontSize: value !== null ? 54 : 30, lineHeight: 1,
                    color: value !== null ? color : MUTED,
                    textShadow: value !== null ? `0 0 30px ${color}, 0 0 60px ${color}60` : 'none',
                  }}>
                    {value !== null ? value : '—'}
                  </span>
                  <span style={{ fontFamily: 'Inter', fontSize: 12, color: value !== null ? '#e2e8f0' : MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
                  {/* bottom progress bar */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, background: 'rgba(10,15,32,0.8)' }}>
                    <div style={{ height: '100%', width: `${value !== null ? (value/10)*100 : 0}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 2, boxShadow: `0 0 12px ${color}` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 7-DAY INSIGHTS ── */}
        {avg7.days >= 2 && (
          <div className="fade-up delay-2" style={{ ...GLASS, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ ...LABEL_STYLE, color: INDIGO, textShadow: '0 0 12px rgba(99,102,241,0.4)' }}>7-Day Averages</div>
              <button onClick={() => onNavigate?.('insights')} style={{ background: 'none', border: 'none', fontFamily: 'Inter', fontSize: 10, color: MUTED, cursor: 'pointer', padding: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = INDIGO}
                onMouseLeave={e => e.currentTarget.style.color = MUTED}
              >View Insights →</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: 'Sleep',    value: avg7.sleep,    unit: 'hrs',  color: VIOLET, display: v => v },
                { label: 'Calories', value: avg7.calories, unit: 'kcal', color: CYAN,   display: v => v.toLocaleString() },
                { label: 'Protein',  value: avg7.protein,  unit: 'g',    color: GREEN,  display: v => v },
                { label: 'Steps',    value: avg7.steps,    unit: 'steps',color: GOLD,   display: v => v.toLocaleString() },
              ].map(({ label, value, unit, color, display }) => (
                <div key={label} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '18px 10px 14px', borderRadius: 14, gap: 4,
                  background: value !== null ? `${color}12` : 'rgba(8,12,26,0.5)',
                  border: `2px solid ${value !== null ? color + '70' : 'rgba(30,41,80,0.5)'}`,
                  boxShadow: value !== null ? `0 0 30px ${color}20` : 'none',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {value !== null && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
                  )}
                  <span style={{
                    fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900,
                    fontSize: 42, lineHeight: 1,
                    color: value !== null ? color : MUTED,
                    textShadow: value !== null ? `0 0 24px ${color}` : 'none',
                  }}>
                    {value !== null ? display(value) : '—'}
                  </span>
                  <span style={{ fontFamily: 'Inter', fontSize: 11, color: value !== null ? color : MUTED, fontWeight: 700 }}>{unit}</span>
                  <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: value !== null ? '#e2e8f0' : MUTED, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CHECK-IN AVERAGES ── */}
        {Object.values(checkinAvg).some(v => v.avg !== null) && (
          <div className="fade-up delay-2" style={{ ...GLASS, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ ...LABEL_STYLE, color: PINK, textShadow: '0 0 12px rgba(232,121,249,0.4)' }}>All-Time Averages</div>
              <span style={{ fontFamily: 'Inter', fontSize: 9, color: MUTED }}>from all check-ins</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {Object.values(checkinAvg).filter(v => v.avg !== null).map(({ label, avg, color, count }) => (
                <div key={label} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '14px 8px 12px', borderRadius: 12, gap: 4,
                  background: `${color}12`,
                  border: `2px solid ${color}55`,
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
                  <span style={{
                    fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900,
                    fontSize: 36, lineHeight: 1, color,
                    textShadow: `0 0 20px ${color}`,
                  }}>{avg}</span>
                  <span style={{ fontFamily: 'Inter', fontSize: 10, color, fontWeight: 700, opacity: 0.8 }}>/10</span>
                  <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: '#e2e8f0', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
                  <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#64748b', fontWeight: 500 }}>{count} days</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── METRICS TREND GRAPH ── */}
        {trendData.some(d => d.hasData) && (
          <div className="fade-up delay-2" style={{ ...GLASS, padding: '22px 24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ ...LABEL_STYLE, color: CYAN, textShadow: '0 0 12px rgba(34,211,238,0.4)' }}>Metrics Trend</div>
              <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                last {trimmedTrend.length} days
              </span>
            </div>

            {/* Legend — bigger and readable */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
              {[
                { key: 'energy',      label: 'Energy',      color: GOLD   },
                { key: 'dayRating',   label: 'Day Rating',  color: VIOLET },
                { key: 'dietQuality', label: 'Diet Quality',color: GREEN  },
                { key: 'stress',      label: 'Stress',      color: RED    },
                { key: 'mood',        label: 'Mood',        color: PINK   },
                { key: 'caloriesNorm',label: 'Calories',    color: CYAN   },
                { key: 'proteinNorm', label: 'Protein',     color: '#34d399' },
                { key: 'stepsNorm',   label: 'Steps',       color: BLUE   },
                { key: 'workoutNorm', label: 'Workout Hrs', color: '#2dd4bf' },
                { key: 'bizHoursNorm',label: 'Business Hrs',color: '#fb923c' },
                { key: 'sleepNorm',   label: 'Sleep Hrs',   color: '#c084fc' },
              ].map(({ key, label, color }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{
                    width: 24, height: 3, background: color, borderRadius: 2,
                    boxShadow: `0 0 8px ${color}`,
                  }} />
                  <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trimmedTrend} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontFamily: 'Inter', fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(99,102,241,0.2)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 10]}
                  tick={{ fontFamily: 'Inter', fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                  tickLine={false}
                  axisLine={false}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(4,6,18,0.97)', border: '2px solid rgba(99,102,241,0.65)',
                    borderRadius: 12, fontFamily: 'Inter', fontSize: 12, color: TEXT1,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  }}
                  formatter={(v, name, props) => {
                    const p = props.payload
                    if (name === 'Calories')     return [p.calories     != null ? `${p.calories.toLocaleString()} kcal` : '—', name]
                    if (name === 'Protein')      return [p.protein      != null ? `${p.protein} g`                      : '—', name]
                    if (name === 'Steps')        return [p.steps        != null ? `${p.steps.toLocaleString()} steps`   : '—', name]
                    if (name === 'Workout Hrs')  return [p.workoutHours != null ? `${p.workoutHours} hrs`               : '—', name]
                    if (name === 'Business Hrs') return [p.bizHours     != null ? `${p.bizHours} hrs`                   : '—', name]
                    if (name === 'Sleep Hrs')    return [p.sleepHours   != null ? `${p.sleepHours} hrs`                 : '—', name]
                    return [v != null ? `${v} / 10` : '—', name]
                  }}
                  labelStyle={{ color: GOLD, fontWeight: 700, fontSize: 11, marginBottom: 6 }}
                  itemStyle={{ padding: '2px 0', fontWeight: 600 }}
                />
                <Line type="monotone" dataKey="energy"       name="Energy"       stroke={GOLD}          strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: GOLD }}          activeDot={{ r: 6 }} connectNulls />
                <Line type="monotone" dataKey="dayRating"    name="Day Rating"   stroke={VIOLET}        strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: VIOLET }}        activeDot={{ r: 6 }} connectNulls />
                <Line type="monotone" dataKey="dietQuality"  name="Diet Quality" stroke={GREEN}         strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: GREEN }}         activeDot={{ r: 6 }} connectNulls />
                <Line type="monotone" dataKey="stress"       name="Stress"       stroke={RED}           strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: RED }}           activeDot={{ r: 6 }} connectNulls />
                <Line type="monotone" dataKey="mood"         name="Mood"         stroke={PINK}          strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: PINK }}          activeDot={{ r: 6 }} connectNulls />
                <Line type="monotone" dataKey="caloriesNorm" name="Calories"     stroke={CYAN}          strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: CYAN }}          activeDot={{ r: 6 }} connectNulls />
                <Line type="monotone" dataKey="proteinNorm"  name="Protein"      stroke="#34d399"       strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: '#34d399' }}    activeDot={{ r: 6 }} connectNulls />
                <Line type="monotone" dataKey="stepsNorm"    name="Steps"        stroke={BLUE}          strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: BLUE }}          activeDot={{ r: 6 }} connectNulls />
                <Line type="monotone" dataKey="workoutNorm"  name="Workout Hrs"  stroke="#2dd4bf"       strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: '#2dd4bf' }}     activeDot={{ r: 6 }} connectNulls />
                <Line type="monotone" dataKey="bizHoursNorm" name="Business Hrs" stroke="#fb923c"       strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: '#fb923c' }}    activeDot={{ r: 6 }} connectNulls />
                <Line type="monotone" dataKey="sleepNorm"    name="Sleep Hrs"   stroke="#c084fc"       strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: '#c084fc' }}    activeDot={{ r: 6 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── DAILY HABITS ── */}
        {habitHistory7.some(d => d.hasData) && (
          <div className="fade-up delay-2" style={{ ...GLASS, padding: '18px 20px' }}>
            <div style={{ ...LABEL_STYLE, color: GREEN, textShadow: '0 0 12px rgba(16,185,129,0.4)', marginBottom: 14 }}>
              Daily Habits — Last 7 Days
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { key: 'read',      label: 'Read',         color: CYAN   },
                { key: 'meditated', label: 'Meditated',    color: VIOLET },
                { key: 'prayed',    label: 'Prayed',       color: GOLD   },
                { key: 'bible',     label: 'Read Bible',   color: PINK   },
              ].map(({ key, label, color }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: '#e2e8f0',
                    minWidth: 100,
                  }}>{label}</span>
                  <div style={{ display: 'flex', gap: 7, flex: 1 }}>
                    {habitHistory7.map((d, i) => (
                      <div key={i} style={{
                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                      }}>
                        <div style={{
                          width: '100%', aspectRatio: '1', borderRadius: 7,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: !d.hasData
                            ? 'rgba(20,28,52,0.5)'
                            : d[key] ? 'rgba(0,255,100,0.12)' : 'rgba(255,0,60,0.14)',
                          border: d.isToday
                            ? `2px solid ${color}cc`
                            : `1px solid ${!d.hasData ? 'rgba(30,41,80,0.5)' : d[key] ? 'rgba(0,255,100,0.5)' : 'rgba(255,0,60,0.45)'}`,
                          boxShadow: d.hasData ? (d[key] ? '0 0 10px rgba(0,255,100,0.2)' : '0 0 10px rgba(255,0,60,0.2)') : 'none',
                        }}>
                          {d.hasData && (
                            <span style={{
                              fontSize: 13, fontWeight: 900,
                              color: d[key] ? '#00ff64' : '#ff003c',
                              textShadow: d[key] ? '0 0 12px #00ff64' : '0 0 12px #ff003c',
                            }}>
                              {d[key] ? '✓' : '✗'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
                <span style={{ minWidth: 100 }} />
                <div style={{ display: 'flex', gap: 7, flex: 1 }}>
                  {habitHistory7.map((d, i) => (
                    <span key={i} style={{
                      flex: 1, textAlign: 'center', fontFamily: 'Inter', fontSize: 9,
                      fontWeight: d.isToday ? 700 : 400,
                      color: d.isToday ? GOLD : '#64748b',
                    }}>{d.dow}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── WIN METRICS ── */}
        {metrics.length > 0 && (
          <div className="fade-up delay-2" style={{ ...GLASS, padding: '16px 18px' }}>
            <div style={{ ...LABEL_STYLE, marginBottom: 12 }}>Win Metrics Today</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {metrics.map(m => (
                <div key={m.key} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '7px 14px', borderRadius: 9,
                  background: m.pass ? 'rgba(16,185,129,0.09)' : 'rgba(255,85,85,0.08)',
                  border: `1px solid ${m.pass ? 'rgba(16,185,129,0.25)' : 'rgba(255,85,85,0.22)'}`,
                  transition: 'all 0.2s',
                }}>
                  <span style={{ fontSize: 11, color: m.pass ? GREEN : RED }}>{m.pass ? '✓' : '✗'}</span>
                  <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: m.pass ? GREEN : '#ff7777' }}>{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── NON-NEGOTIABLES ── */}
        {nonNegs.length > 0 && (
          <div className="fade-up delay-2" style={{ ...GLASS, padding: '16px 18px' }}>
            <div style={{ ...LABEL_STYLE, marginBottom: 12 }}>Non-Negotiables</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {nonNegs.map(item => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 14px', borderRadius: 9,
                  background: item.checked ? 'rgba(16,185,129,0.09)' : 'rgba(255,85,85,0.08)',
                  border: `1px solid ${item.checked ? 'rgba(16,185,129,0.25)' : 'rgba(255,85,85,0.22)'}`,
                }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                    background: item.checked ? GREEN : 'transparent',
                    border: item.checked ? 'none' : '1px solid rgba(255,85,85,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: item.checked ? `0 0 8px ${GREEN}66` : 'none',
                  }}>
                    {item.checked && <span style={{ fontSize: 9, color: '#000', fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: item.checked ? GREEN : '#ff7777' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STREAK + 7-DAY GRID ── */}
        <div className="fade-up delay-3" style={{ display: 'flex', gap: 14 }}>

          {/* Streak badge */}
          <div style={{
            ...GLASS, padding: '20px 14px', minWidth: 100,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            border: winStreak > 0 ? '2px solid rgba(240,192,64,0.75)' : '2px solid rgba(99,102,241,0.45)',
            background: winStreak > 0
              ? 'linear-gradient(135deg, rgba(240,192,64,0.18), rgba(251,146,60,0.08))'
              : 'rgba(6,9,22,0.82)',
            boxShadow: winStreak > 0 ? '0 0 70px rgba(240,192,64,0.2), 0 0 30px rgba(240,192,64,0.1) inset' : 'none',
          }}>
            <span style={{ fontSize: 20, filter: winStreak > 0 ? 'drop-shadow(0 0 10px rgba(240,192,64,0.6))' : 'grayscale(1)' }}>🔥</span>
            <span style={{
              fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 54, lineHeight: 1,
              color: winStreak > 0 ? GOLD : DARK,
              textShadow: winStreak > 0 ? '0 0 36px rgba(240,192,64,0.7), 0 0 80px rgba(240,192,64,0.3)' : 'none',
            }}>{winStreak}</span>
            <span style={{
              fontFamily: '"Orbitron", monospace', fontSize: 8, fontWeight: 700,
              color: winStreak > 0 ? GOLD : DARK, letterSpacing: '0.1em', textAlign: 'center',
            }}>WIN STREAK</span>
          </div>

          {/* 7-day grid */}
          <div style={{ flex: 1, ...GLASS, padding: '16px 14px' }}>
            <div style={{ ...LABEL_STYLE, marginBottom: 14 }}>Last 7 Days</div>
            <div style={{ display: 'flex', gap: 7 }}>
              {winHistory7.map((d, i) => {
                const dt      = new Date(d.date + 'T12:00:00')
                const dow     = ['S','M','T','W','T','F','S'][dt.getDay()]
                const isToday = d.date === todayStr
                const hasData = d.available > 0
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontFamily: 'Inter', fontSize: 8,
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? GOLD : DARK,
                    }}>{dow}</span>
                    <div style={{
                      width: '100%', aspectRatio: '1', borderRadius: 8,
                      background: !hasData
                        ? 'rgba(20,28,52,0.5)'
                        : d.isWin
                          ? 'linear-gradient(135deg, rgba(240,192,64,0.2), rgba(251,146,60,0.1))'
                          : 'linear-gradient(135deg, rgba(255,85,85,0.15), rgba(239,68,68,0.07))',
                      border: isToday
                        ? `2px solid rgba(240,192,64,0.7)`
                        : `1px solid ${!hasData ? 'rgba(30,41,80,0.5)' : d.isWin ? 'rgba(240,192,64,0.4)' : 'rgba(255,85,85,0.35)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: hasData && d.isWin ? '0 0 14px rgba(240,192,64,0.2)' : hasData ? '0 0 10px rgba(255,85,85,0.1)' : 'none',
                      transition: 'all 0.2s',
                    }}>
                      {hasData && (
                        <span style={{
                          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 13,
                          color: d.isWin ? GOLD : RED,
                          textShadow: d.isWin ? '0 0 10px rgba(240,192,64,0.7)' : 'none',
                        }}>{d.isWin ? 'W' : 'L'}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── ACTIVE GOALS ── */}
        {goals.length > 0 && (
          <div className="fade-up delay-5" style={{ ...GLASS, padding: '16px 18px' }}>
            <div style={{ ...LABEL_STYLE, marginBottom: 16 }}>Active Goals</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {goals.map(goal => {
                const start   = new Date(goal.startDate + 'T00:00:00')
                const end     = new Date(goal.endDate   + 'T00:00:00')
                const total   = Math.max(1, (end - start) / 86400000)
                const elapsed = Math.max(0, (now - start) / 86400000)
                const timePct = Math.min(100, Math.round((elapsed / total) * 100))
                const daysLeft= Math.max(0, Math.ceil((end - now) / 86400000))
                const accent  = CAT_COLORS[goal.category] || INDIGO
                return (
                  <div key={goal.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                      <span style={{ fontFamily: 'Inter', fontSize: 13, color: TEXT1, fontWeight: 600 }}>{goal.title}</span>
                      <span style={{
                        fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 20,
                        color: accent, textShadow: `0 0 12px ${accent}66`,
                      }}>{daysLeft}<span style={{ fontSize: 11, color: DARK, fontWeight: 400 }}>d</span></span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(20,28,52,0.8)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                      <div style={{
                        height: '100%', width: `${timePct}%`,
                        background: `linear-gradient(90deg, ${accent}66, ${accent})`,
                        borderRadius: 3, boxShadow: `0 0 10px ${accent}`,
                        transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                      <span style={{ fontFamily: 'Inter', fontSize: 9, color: DARK }}>{timePct}% elapsed</span>
                      <span style={{ fontFamily: 'Inter', fontSize: 9, color: accent, fontWeight: 600 }}>{daysLeft} days left</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {false && null /* Latest Journal removed */}
        )}

        {/* ── EMPTY STATE ── */}
        {!morningDone && !eveningDone && metrics.length === 0 && nonNegs.length === 0 && goals.length === 0 && !latestJournal && (
          <div className="fade-up delay-2" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 52, marginBottom: 16, filter: 'drop-shadow(0 0 20px rgba(99,102,241,0.4))' }}>🚀</div>
            <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 10, color: INDIGO, letterSpacing: '0.25em', marginBottom: 10, textShadow: '0 0 16px rgba(99,102,241,0.5)' }}>
              SYSTEM READY
            </div>
            <div style={{ fontFamily: 'Inter', fontSize: 13, color: DARK }}>
              Start your morning check-in to activate the command center.
            </div>
          </div>
        )}

        <div style={{ height: 24 }} />
      </div>
    </div>
  )
}
