import { useMemo } from 'react'
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
  fontSize: 8, fontWeight: 700,
  color: MUTED, letterSpacing: '0.28em',
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

  // 7-day averages from marko_checkin + diet history
  const avg7 = useMemo(() => {
    const vals = { energy: [], sleep: [], calories: [], protein: [] }
    for (let i = 0; i < 7; i++) {
      const ds = daysAgo(i)
      const ma = checkInData?.morning?.[ds]?.answers || {}
      if (ma['me6'] != null) vals.energy.push(+ma['me6'])
      if (ma['ms2'] != null) vals.sleep.push(+ma['ms2'])
      const dh = (dietData.history || []).find(h => h.date === ds)
      if (dh?.calories) vals.calories.push(dh.calories)
      if (dh?.protein)  vals.protein.push(dh.protein)
    }
    const avg  = arr => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null
    const avgI = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null
    return {
      energy:   avg(vals.energy),
      sleep:    avg(vals.sleep),
      calories: avgI(vals.calories),
      protein:  avgI(vals.protein),
      days: Math.max(vals.energy.length, vals.sleep.length, vals.calories.length),
    }
  }, [checkInData, dietData])

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
              fontFamily: '"Orbitron", monospace', fontSize: 6, fontWeight: 700,
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {energy !== null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Inter', fontSize: 11, color: MUTED }}>Energy</span>
                    <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 24, color: GOLD, textShadow: '0 0 14px rgba(240,192,64,0.5)' }}>
                      {energy}<span style={{ fontSize: 11, color: DARK }}>  /10</span>
                    </span>
                  </div>
                )}
                {word && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Inter', fontSize: 11, color: MUTED }}>Word</span>
                    <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 9, fontWeight: 700, color: CYAN, textShadow: '0 0 12px rgba(34,211,238,0.5)', letterSpacing: '0.1em' }}>
                      {word.toUpperCase()}
                    </span>
                  </div>
                )}
                {mit && (
                  <div style={{ marginTop: 6, paddingTop: 10, borderTop: '1px solid rgba(99,102,241,0.1)' }}>
                    <div style={{ ...LABEL_STYLE, fontSize: 7, marginBottom: 6 }}>TODAY'S MIT</div>
                    <div style={{ fontFamily: 'Inter', fontSize: 12, color: TEXT1, fontStyle: 'italic', lineHeight: 1.55 }}>"{mit}"</div>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {overall !== null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Inter', fontSize: 11, color: MUTED }}>Overall</span>
                    <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 24, color: VIOLET, textShadow: '0 0 14px rgba(167,139,250,0.5)' }}>
                      {overall}<span style={{ fontSize: 11, color: DARK }}>/10</span>
                    </span>
                  </div>
                )}
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
                  <span style={{ fontFamily: 'Inter', fontSize: 9, color: value !== null ? color : MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label}</span>
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
            {(() => {
              const calTarget = dietData.targets?.calories || 2400
              const proTarget = dietData.targets?.protein  || 200
              const items7 = [
                { label: 'Sleep',    value: avg7.sleep,    color: VIOLET, max: 10,        unit: 'hrs',  fmt: v => v },
                { label: 'Energy',   value: avg7.energy,   color: GOLD,   max: 10,        unit: '/10',  fmt: v => v },
                { label: 'Calories', value: avg7.calories, color: CYAN,   max: calTarget, unit: 'kcal', fmt: v => v?.toLocaleString() },
                { label: 'Protein',  value: avg7.protein,  color: GREEN,  max: proTarget, unit: 'g',    fmt: v => v },
              ]
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {items7.map(({ label, value, color, max, unit, fmt }) => (
                    <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 6px 8px', borderRadius: 12, background: value !== null ? `${color}0C` : 'rgba(8,12,26,0.5)', border: `2px solid ${value !== null ? color + '50' : 'rgba(30,41,80,0.5)'}` }}>
                      {/* Mini ring */}
                      <div style={{ position: 'relative', width: 64, height: 64 }}>
                        <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(20,30,60,0.8)" strokeWidth={5} />
                          {value !== null && (
                            <circle cx="32" cy="32" r="24" fill="none" stroke={color} strokeWidth={5}
                              strokeDasharray={2 * Math.PI * 24}
                              strokeDashoffset={2 * Math.PI * 24 * (1 - Math.min(1, value / max))}
                              strokeLinecap="round" />
                          )}
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
                          <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: max > 100 ? 13 : 16, color: value !== null ? color : MUTED, lineHeight: 1, textShadow: value !== null ? `0 0 14px ${color}` : 'none' }}>
                            {value !== null ? fmt(value) : '—'}
                          </span>
                          {value !== null && <span style={{ fontFamily: 'Inter', fontSize: 7, color, opacity: 0.8, marginTop: 1 }}>{unit}</span>}
                        </div>
                      </div>
                      <span style={{ fontFamily: 'Inter', fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'center' }}>{label}</span>
                    </div>
                  ))}
                </div>
              )
            })()}
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(99,102,241,0.06)', borderRadius: 8, border: '2px solid rgba(99,102,241,0.3)' }}>
              <span style={{ fontFamily: 'Inter', fontSize: 11, color: TEXT2 }}>
                Based on <span style={{ color: INDIGO, fontWeight: 700 }}>{avg7.days}</span> check-ins in the last 7 days.
                {avg7.energy && avg7.energy >= 7 ? ' Energy is high — push harder today.' : avg7.energy && avg7.energy < 5 ? ' Energy is low — prioritize recovery.' : ''}
                {avg7.calories ? ` Avg ${avg7.calories?.toLocaleString()} kcal · ${avg7.protein ?? '—'}g protein.` : ''}
              </span>
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
              fontFamily: '"Orbitron", monospace', fontSize: 6, fontWeight: 700,
              color: winStreak > 0 ? GOLD : DARK, letterSpacing: '0.15em', textAlign: 'center',
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

        {/* ── TODAY'S FOCUS ── */}
        {(mit || word) && (
          <div className="fade-up delay-4" style={{
            ...GLASS,
            border: '2px solid rgba(240,192,64,0.6)',
            borderLeft: `5px solid ${GOLD}`,
            borderRadius: '0 16px 16px 0',
            padding: '16px 18px',
            boxShadow: '0 0 60px rgba(240,192,64,0.15), inset 0 0 30px rgba(240,192,64,0.04)',
          }}>
            <div style={{ ...LABEL_STYLE, color: GOLD, marginBottom: 12, textShadow: '0 0 12px rgba(240,192,64,0.4)' }}>
              Today's Focus
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {word && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontFamily: 'Inter', fontSize: 9, color: DARK, minWidth: 40, letterSpacing: '0.1em', textTransform: 'uppercase' }}>WORD</span>
                  <span style={{ fontFamily: '"Orbitron", monospace', fontWeight: 900, fontSize: 18, color: CYAN, letterSpacing: '0.08em', textShadow: '0 0 18px rgba(34,211,238,0.55)' }}>
                    {word.toUpperCase()}
                  </span>
                </div>
              )}
              {mit && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <span style={{ fontFamily: 'Inter', fontSize: 9, color: DARK, minWidth: 40, marginTop: 2, letterSpacing: '0.1em', textTransform: 'uppercase' }}>MIT</span>
                  <span style={{ fontFamily: 'Inter', fontSize: 13, color: TEXT1, lineHeight: 1.6, fontWeight: 500 }}>{mit}</span>
                </div>
              )}
            </div>
          </div>
        )}

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

        {/* ── LATEST JOURNAL ── */}
        {latestJournal && (
          <div className="fade-up delay-6" style={{
            ...GLASS,
            border: `2px solid ${latestJournal.isWin ? 'rgba(240,192,64,0.62)' : 'rgba(255,85,85,0.55)'}`,
            borderLeft: `5px solid ${latestJournal.isWin ? GOLD : RED}`,
            borderRadius: '0 16px 16px 0',
            padding: '16px 18px',
            boxShadow: `0 0 50px ${latestJournal.isWin ? 'rgba(240,192,64,0.12)' : 'rgba(255,85,85,0.1)'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ ...LABEL_STYLE }}>Latest Journal</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontFamily: 'Inter', fontSize: 9, color: DARK }}>{latestJournal.date}</span>
                <span style={{
                  padding: '3px 9px', borderRadius: 5,
                  background: latestJournal.isWin ? 'rgba(240,192,64,0.14)' : 'rgba(255,85,85,0.12)',
                  border: `1px solid ${latestJournal.isWin ? 'rgba(240,192,64,0.4)' : 'rgba(255,85,85,0.35)'}`,
                  fontFamily: '"Orbitron", monospace', fontSize: 7, fontWeight: 700,
                  color: latestJournal.isWin ? GOLD : RED,
                  letterSpacing: '0.05em',
                }}>{latestJournal.isWin ? 'WIN' : 'LOSS'}</span>
              </div>
            </div>
            <p style={{ fontFamily: 'Inter', fontSize: 12, color: TEXT2, lineHeight: 1.7, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {latestJournal.aiReflection || latestJournal.manualNote || '—'}
            </p>
            <button
              onClick={() => onNavigate?.('journal')}
              style={{ marginTop: 10, background: 'none', border: 'none', color: MUTED, fontSize: 10, fontFamily: 'Inter', cursor: 'pointer', padding: 0, transition: 'color 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = INDIGO }}
              onMouseLeave={e => { e.currentTarget.style.color = MUTED }}
            >
              View all entries →
            </button>
          </div>
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
