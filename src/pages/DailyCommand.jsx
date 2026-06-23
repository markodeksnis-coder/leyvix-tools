import { useLocalStorage } from '../hooks/useLocalStorage'
import { today, daysSinceStart } from '../utils'
import { getWinDaySettings, calcDayScore, getWinHistory, computeCurrentWinStreak } from '../utils/winLoss'

const GOLD   = '#f0c040'
const BG     = '#020609'
const CARD   = '#080e1a'
const BORDER = '#1e3050'
const GREEN  = '#1ad9a0'
const RED    = '#ff5555'
const PURPLE = '#b8a0ff'
const BLUE   = '#4d9fff'
const CYAN   = '#22d3ee'
const PINK   = '#e879f9'
const TEXT2  = '#a0bcdf'
const MUTED  = '#7a95c0'

const LABEL = {
  fontFamily: 'Inter, sans-serif',
  fontSize: 9, fontWeight: 600,
  color: TEXT2, letterSpacing: '0.25em',
  textTransform: 'uppercase',
}

const CAT_COLORS = { Body: GREEN, Business: BLUE, Mind: PINK, Daily: '#a855f7', Custom: CYAN }

function Section({ title, accent, children }) {
  return (
    <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, padding: '14px 16px' }}>
      <div style={{ ...LABEL, color: accent || TEXT2, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

function ProgressBar({ pct, color, height = 4 }) {
  return (
    <div style={{ height, background: BORDER, borderRadius: height / 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: color, borderRadius: height / 2, boxShadow: `0 0 6px ${color}`, transition: 'width 0.6s ease' }} />
    </div>
  )
}

export default function DailyCommand({ onNavigate }) {
  const todayStr = today()
  const dayNum   = daysSinceStart()
  const now      = new Date()
  const dateDisplay = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()

  const [dailyData]  = useLocalStorage('marko_daily',   { logs: {} })
  const [bodyData]   = useLocalStorage('marko_body',    { liftSessions: [] })
  const [dietData]   = useLocalStorage('marko_diet',    { history: [] })
  const [checkInData]= useLocalStorage('marko_checkin', {})

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

  const mit   = morningAnswers['mi16'] || ''
  const word  = morningAnswers['mi17'] || ''
  const energy= morningAnswers['me6']  ?? null
  const overall = eveningAnswers['ed1'] ?? null

  const dayLabel = `DAY ${String(dayNum).padStart(3, '0')}`

  return (
    <div style={{ background: BG, minHeight: '100%', overflowY: 'auto' }}>

      {/* ── HEADER ── */}
      <div style={{ background: '#040810', borderBottom: `1px solid ${BORDER}`, padding: '20px 24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 12 }}>
          <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 52, color: GOLD, lineHeight: 1, textShadow: '0 0 24px rgba(240,192,64,0.5)' }}>
            {dayLabel}
          </span>
          <span style={{ fontFamily: 'Inter', fontSize: 11, color: MUTED, letterSpacing: '0.15em' }}>{dateDisplay}</span>
        </div>

        {/* Score bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 7, background: BORDER, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${scoreColor}cc, ${scoreColor})`, borderRadius: 4, transition: 'width 0.6s ease', boxShadow: `0 0 10px ${scoreColor}` }} />
          </div>
          <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 24, color: scoreColor, minWidth: 54, textAlign: 'right' }}>{pct}%</span>
          <div style={{
            padding: '4px 12px', borderRadius: 6,
            background: isWin ? 'rgba(240,192,64,0.15)' : pct === 0 ? `rgba(30,48,80,0.6)` : 'rgba(255,85,85,0.12)',
            border: `1px solid ${isWin ? 'rgba(240,192,64,0.45)' : pct === 0 ? BORDER : 'rgba(255,85,85,0.4)'}`,
            fontFamily: '"Orbitron", sans-serif', fontSize: 8, fontWeight: 700,
            color: isWin ? GOLD : pct === 0 ? MUTED : RED, letterSpacing: '0.1em',
          }}>
            {pct === 0 ? 'NOT STARTED' : isWin ? 'WIN TRACKING' : 'LOSS TRACKING'}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── CHECK-IN CARDS ── */}
        <div style={{ display: 'flex', gap: 12 }}>
          {/* Morning */}
          <div style={{
            flex: 1, background: CARD, borderRadius: 12, padding: 16,
            border: morningDone ? '1px solid rgba(240,192,64,0.45)' : `1px solid ${BORDER}`,
            borderTop: `3px solid ${morningDone ? GOLD : BORDER}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 22 }}>☀️</span>
              <div>
                <div style={{ fontFamily: '"Orbitron", sans-serif', fontSize: 10, color: GOLD, letterSpacing: '0.1em' }}>MORNING</div>
                {morningDone && <div style={{ fontFamily: 'Inter', fontSize: 9, color: GREEN, fontWeight: 700, marginTop: 1 }}>✓ COMPLETE</div>}
              </div>
            </div>

            {morningDone ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {energy !== null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Inter', fontSize: 11, color: MUTED }}>Energy</span>
                    <span style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 900, fontSize: 20, color: GOLD }}>{energy}<span style={{ fontSize: 11, color: MUTED }}>/10</span></span>
                  </div>
                )}
                {word && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Inter', fontSize: 11, color: MUTED }}>Word</span>
                    <span style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 10, fontWeight: 700, color: CYAN }}>{word.toUpperCase()}</span>
                  </div>
                )}
                {mit && (
                  <div style={{ marginTop: 4, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
                    <div style={{ fontFamily: 'Inter', fontSize: 9, color: MUTED, marginBottom: 4 }}>MIT</div>
                    <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#ffffff', fontStyle: 'italic', lineHeight: 1.4 }}>"{mit}"</div>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => onNavigate?.('morning')} style={{
                width: '100%', background: GOLD, border: 'none', borderRadius: 8,
                padding: '11px 0', fontFamily: '"Orbitron",sans-serif', fontSize: 10,
                fontWeight: 700, color: '#000', cursor: 'pointer', letterSpacing: '0.08em',
              }}>START NOW →</button>
            )}
          </div>

          {/* Evening */}
          <div style={{
            flex: 1, background: CARD, borderRadius: 12, padding: 16,
            border: eveningDone ? '1px solid rgba(184,160,255,0.45)' : `1px solid ${BORDER}`,
            borderTop: `3px solid ${eveningDone ? PURPLE : BORDER}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 22 }}>🌙</span>
              <div>
                <div style={{ fontFamily: '"Orbitron", sans-serif', fontSize: 10, color: PURPLE, letterSpacing: '0.1em' }}>EVENING</div>
                {eveningDone && <div style={{ fontFamily: 'Inter', fontSize: 9, color: GREEN, fontWeight: 700, marginTop: 1 }}>✓ COMPLETE</div>}
              </div>
            </div>

            {eveningDone ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {overall !== null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Inter', fontSize: 11, color: MUTED }}>Overall</span>
                    <span style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 900, fontSize: 20, color: PURPLE }}>{overall}<span style={{ fontSize: 11, color: MUTED }}>/10</span></span>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => onNavigate?.('evening')} style={{
                width: '100%', background: PURPLE, border: 'none', borderRadius: 8,
                padding: '11px 0', fontFamily: '"Orbitron",sans-serif', fontSize: 10,
                fontWeight: 700, color: '#000', cursor: 'pointer', letterSpacing: '0.08em',
              }}>START NOW →</button>
            )}
          </div>
        </div>

        {/* ── WIN METRICS ── */}
        {metrics.length > 0 && (
          <Section title="WIN METRICS TODAY">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {metrics.map(m => (
                <div key={m.key} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 13px', borderRadius: 8,
                  background: m.pass ? 'rgba(26,217,160,0.1)' : 'rgba(255,85,85,0.08)',
                  border: `1px solid ${m.pass ? 'rgba(26,217,160,0.35)' : 'rgba(255,85,85,0.3)'}`,
                }}>
                  <span style={{ fontSize: 12 }}>{m.pass ? '✓' : '✗'}</span>
                  <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: m.pass ? GREEN : '#ff7777' }}>{m.label}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── NON-NEGOTIABLES ── */}
        {nonNegs.length > 0 && (
          <Section title="Non-Negotiables">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {nonNegs.map(item => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '7px 14px', borderRadius: 8,
                  background: item.checked ? 'rgba(26,217,160,0.1)' : 'rgba(255,85,85,0.07)',
                  border: `1px solid ${item.checked ? 'rgba(26,217,160,0.35)' : 'rgba(255,85,85,0.28)'}`,
                }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: 4,
                    background: item.checked ? GREEN : 'transparent',
                    border: item.checked ? 'none' : `1px solid ${RED}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {item.checked && <span style={{ fontSize: 9, color: '#000', fontWeight: 900, lineHeight: 1 }}>✓</span>}
                  </div>
                  <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: item.checked ? GREEN : '#ff7777' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── STREAK + 7-DAY HISTORY ── */}
        <div style={{ display: 'flex', gap: 12 }}>
          {/* Streak badge */}
          <div style={{
            background: 'rgba(240,192,64,0.07)', borderRadius: 12,
            border: '1px solid rgba(240,192,64,0.4)',
            padding: '18px 16px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', minWidth: 90, gap: 2,
          }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>🔥</span>
            <span style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 900, fontSize: 52, color: GOLD, lineHeight: 1, textShadow: '0 0 20px rgba(240,192,64,0.6)' }}>{winStreak}</span>
            <span style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 7, color: GOLD, letterSpacing: '0.15em', textAlign: 'center' }}>WIN STREAK</span>
          </div>

          {/* 7-day mini grid */}
          <div style={{ flex: 1, background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, padding: '14px 14px' }}>
            <div style={{ ...LABEL, marginBottom: 12 }}>LAST 7 DAYS</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {winHistory7.map((day, i) => {
                const d   = new Date(day.date + 'T12:00:00')
                const dow = ['S','M','T','W','T','F','S'][d.getDay()]
                const isToday  = day.date === todayStr
                const hasData  = day.available > 0
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontFamily: 'Inter', fontSize: 8, fontWeight: isToday ? 700 : 400, color: isToday ? GOLD : MUTED }}>{dow}</span>
                    <div style={{
                      width: '100%', aspectRatio: '1', borderRadius: 6,
                      background: !hasData ? `rgba(30,48,80,0.5)` : day.isWin ? 'rgba(240,192,64,0.2)' : 'rgba(255,85,85,0.18)',
                      border: isToday ? `2px solid ${GOLD}` : `1px solid ${!hasData ? BORDER : day.isWin ? 'rgba(240,192,64,0.5)' : 'rgba(255,85,85,0.45)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {hasData && <span style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 900, fontSize: 13, color: day.isWin ? GOLD : RED }}>{day.isWin ? 'W' : 'L'}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── TODAY'S FOCUS ── */}
        {(mit || word) && (
          <div style={{ background: CARD, borderRadius: 12, border: `1px solid rgba(240,192,64,0.35)`, borderLeft: `3px solid ${GOLD}`, padding: '14px 16px' }}>
            <div style={{ ...LABEL, color: GOLD, marginBottom: 10 }}>TODAY'S FOCUS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {word && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'Inter', fontSize: 9, color: MUTED, minWidth: 36 }}>WORD</span>
                  <span style={{ fontFamily: '"Orbitron",sans-serif', fontWeight: 900, fontSize: 18, color: CYAN, letterSpacing: '0.08em' }}>{word.toUpperCase()}</span>
                </div>
              )}
              {mit && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontFamily: 'Inter', fontSize: 9, color: MUTED, minWidth: 36, marginTop: 2 }}>MIT</span>
                  <span style={{ fontFamily: 'Inter', fontSize: 13, color: '#ffffff', lineHeight: 1.5, fontWeight: 500 }}>{mit}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── GOALS ── */}
        {goals.length > 0 && (
          <Section title="Active Goals">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {goals.map(goal => {
                const start = new Date(goal.startDate + 'T00:00:00')
                const end   = new Date(goal.endDate   + 'T00:00:00')
                const total = Math.max(1, (end - start) / 86400000)
                const elapsed = Math.max(0, (now - start) / 86400000)
                const timePct = Math.min(100, Math.round((elapsed / total) * 100))
                const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000))
                const accent = CAT_COLORS[goal.category] || BLUE
                return (
                  <div key={goal.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <span style={{ fontFamily: 'Inter', fontSize: 13, color: '#fff', fontWeight: 600 }}>{goal.title}</span>
                      <span style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 900, fontSize: 18, color: accent }}>{daysLeft}<span style={{ fontSize: 10, color: MUTED, fontWeight: 400 }}>d</span></span>
                    </div>
                    <ProgressBar pct={timePct} color={accent} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                      <span style={{ fontFamily: 'Inter', fontSize: 9, color: MUTED }}>{timePct}% time elapsed</span>
                      <span style={{ fontFamily: 'Inter', fontSize: 9, color: accent, fontWeight: 600 }}>{daysLeft} days remaining</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* ── LATEST JOURNAL ── */}
        {latestJournal && (
          <div style={{
            background: CARD, borderRadius: 12,
            border: `1px solid ${BORDER}`,
            borderLeft: `3px solid ${latestJournal.isWin ? GOLD : RED}`,
            padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ ...LABEL }}>LATEST JOURNAL</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontFamily: 'Inter', fontSize: 9, color: MUTED }}>{latestJournal.date}</span>
                <span style={{
                  padding: '2px 8px', borderRadius: 4,
                  background: latestJournal.isWin ? GOLD : RED,
                  color: latestJournal.isWin ? '#000' : '#fff',
                  fontFamily: 'Inter', fontSize: 9, fontWeight: 900,
                }}>{latestJournal.isWin ? 'WIN' : 'LOSS'}</span>
              </div>
            </div>
            <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#c8d8f0', lineHeight: 1.65, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {latestJournal.aiReflection || latestJournal.manualNote || '—'}
            </p>
            <button onClick={() => onNavigate?.('journal')} style={{ marginTop: 10, background: 'none', border: 'none', color: MUTED, fontSize: 10, fontFamily: 'Inter', cursor: 'pointer', padding: 0 }}>
              View all entries →
            </button>
          </div>
        )}

        {/* ── EMPTY PLACEHOLDER when fresh ── */}
        {!morningDone && !eveningDone && metrics.length === 0 && nonNegs.length === 0 && goals.length === 0 && !latestJournal && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: MUTED, fontFamily: 'Inter', fontSize: 13 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
            Start your morning check-in to activate the command center.
          </div>
        )}

      </div>
    </div>
  )
}
