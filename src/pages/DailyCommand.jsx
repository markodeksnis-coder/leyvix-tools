import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import Anthropic from '@anthropic-ai/sdk'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { today, daysSinceStart, daysAgo, DATA_START_DATE } from '../utils'
import { getWinDaySettings, calcDayScore, getWinHistory, computeCurrentWinStreak } from '../utils/winLoss'

// ── Color tokens ──────────────────────────────────────────────────────────────
const GOLD   = '#f0c040'
const GREEN  = '#1ad9a0'
const RED    = '#f43f5e'
const BLUE   = '#818cf8'
const VIOLET = '#8b5cf6'
const CYAN   = '#22d3ee'
const PINK   = '#e879f9'
const ORANGE = '#fb923c'
const TEXT1  = '#e2e8f0'
const MUTED  = '#64748b'
const DARK   = '#334155'
const MOOD_NUM = { 'Excellent': 9, 'Good': 7, 'Neutral': 5, 'Fluctuated': 5, 'Low': 3, 'Very low': 1 }

// ── Glass card ────────────────────────────────────────────────────────────────
const glass = (color = BLUE) => ({
  background: 'rgba(4,6,20,0.72)',
  backdropFilter: 'blur(40px)',
  WebkitBackdropFilter: 'blur(40px)',
  border: `1px solid ${color}28`,
  borderRadius: 18,
  overflow: 'hidden',
  boxShadow: `0 0 50px ${color}0A, 0 6px 32px rgba(0,0,0,0.7), inset 0 1px 0 ${color}12`,
})

// ── Glow hairline ─────────────────────────────────────────────────────────────
const GlowLine = ({ color }) => (
  <div style={{
    height: 1,
    background: `linear-gradient(90deg, transparent, ${color}CC 30%, ${color} 50%, ${color}CC 70%, transparent)`,
    boxShadow: `0 0 12px ${color}90, 0 0 24px ${color}30`,
    flexShrink: 0,
  }} />
)

// ── Inline SVG sparkline ──────────────────────────────────────────────────────
function Sparkline({ data, color, w = 72, h = 30 }) {
  const valid = data.filter(v => v != null)
  if (valid.length < 2) return <div style={{ width: w, height: h }} />
  const mn = Math.min(...valid), mx = Math.max(...valid), range = mx - mn || 1
  const toXY = (v, i) => ({ x: (i / (data.length - 1)) * w, y: h - 4 - ((v - mn) / range) * (h - 8) })
  const pts = data.reduce((acc, v, i) => {
    if (v == null) return acc
    const { x, y } = toXY(v, i)
    acc.push(`${acc.length === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    return acc
  }, []).join(' ')
  return (
    <svg width={w} height={h} style={{ overflow: 'visible', flexShrink: 0 }}>
      <path d={pts} fill="none" stroke={color} strokeWidth={2}
        style={{ filter: `drop-shadow(0 0 5px ${color}CC)` }} />
      {valid.length > 0 && (() => {
        const last = data.reduceRight((f, v, i) => f !== null ? f : (v != null ? i : null), null)
        if (last == null) return null
        const { x, y } = toXY(data[last], last)
        return <circle cx={x} cy={y} r={3} fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      })()}
    </svg>
  )
}

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ pct, color, size = 120, label }) {
  const r = (size - 18) / 2, circ = 2 * Math.PI * r, dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ overflow: 'visible', display: 'block' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(15,22,50,0.9)" strokeWidth={10} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ filter: `drop-shadow(0 0 14px ${color}AA)`, transition: 'stroke-dasharray 1.4s cubic-bezier(0.16,1,0.3,1)' }}
      />
      <text x={size/2} y={size/2 - 6} textAnchor="middle" dominantBaseline="middle"
        style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 900, fontSize: 30, fill: color,
          filter: `drop-shadow(0 0 16px ${color}BB)` }}
      >{pct}%</text>
      <text x={size/2} y={size/2 + 14} textAnchor="middle"
        style={{ fontFamily: '"Orbitron",monospace', fontSize: 8, fill: color + '99', letterSpacing: '0.12em' }}
      >{label || 'SCORE'}</text>
    </svg>
  )
}

// ── AI Intel panel ────────────────────────────────────────────────────────────
function AIIntelPanel({ context }) {
  const [apiKey, setApiKey] = useLocalStorage('marko_ai_key', '')
  const [inputKey, setInputKey] = useState('')
  const [briefing, setBriefing] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [messages, setMessages] = useState([])
  const [userInput, setUserInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [currentStream, setCurrentStream] = useState('')
  const chatRef = useRef(null)
  const mountedRef = useRef(true)
  const briefingDoneRef = useRef(false)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const SYS = `You are MARKO INTELLIGENCE — the AI embedded in Marko's personal operating system.
Personality: Military-precise. High-energy. Data-first. Zero fluff. Brutally honest.
Style: Short punchy sentences. Use → for actions. Use ↑↓ for trends. Max 4 sentences per reply.
Current performance data:
${context}`

  const callAI = useCallback(async (userMsg, isBriefing = false) => {
    if (!apiKey) return
    let client
    try { client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true }) }
    catch { return }

    const msgs = isBriefing
      ? [{ role: 'user', content: 'Give me a sharp intel briefing on my performance right now. Key insight + 1 action. Max 3 sentences.' }]
      : [...messages, { role: 'user', content: userMsg }]

    if (isBriefing) {
      setStreaming(true)
      setBriefing('')
      briefingDoneRef.current = false
    } else {
      setChatLoading(true)
      setCurrentStream('')
      setMessages(prev => [...prev, { role: 'user', content: userMsg }])
      setUserInput('')
    }

    try {
      const stream = client.messages.stream({ model: 'claude-haiku-4-5-20251001', max_tokens: 350, system: SYS, messages: msgs })
      let full = ''
      for await (const e of stream) {
        if (!mountedRef.current) break
        if (e.type === 'content_block_delta' && e.delta.type === 'text_delta') {
          full += e.delta.text
          if (isBriefing) setBriefing(full)
          else setCurrentStream(full)
        }
      }
      if (mountedRef.current) {
        if (isBriefing) { briefingDoneRef.current = true }
        else { setMessages(prev => [...prev, { role: 'assistant', content: full }]); setCurrentStream('') }
      }
    } catch (e) {
      if (mountedRef.current) {
        if (isBriefing) setBriefing('⚡ Error connecting. Check your API key in settings.')
        else { setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error.' }]); setCurrentStream('') }
      }
    } finally {
      if (mountedRef.current) { isBriefing ? setStreaming(false) : setChatLoading(false) }
    }
  }, [apiKey, context, messages, SYS])

  useEffect(() => {
    if (apiKey && context && !briefingDoneRef.current && !streaming) callAI(null, true)
  }, [apiKey]) // eslint-disable-line

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages, currentStream])

  if (!apiKey) return (
    <div style={{ ...glass(VIOLET), padding: 0 }}>
      <GlowLine color={VIOLET} />
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 32, filter: `drop-shadow(0 0 16px ${VIOLET})` }}>🤖</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: '"Orbitron",monospace', fontSize: 9, color: VIOLET, letterSpacing: '0.22em', marginBottom: 6 }}>NEURAL INTELLIGENCE — OFFLINE</div>
          <div style={{ fontFamily: 'Inter', fontSize: 12, color: MUTED, marginBottom: 12 }}>Connect your Anthropic API key to activate AI briefings and real-time coaching.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="password" placeholder="sk-ant-api03-..." value={inputKey} onChange={e => setInputKey(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && inputKey.trim()) setApiKey(inputKey.trim()) }}
              style={{ flex: 1, background: 'rgba(8,12,28,0.9)', border: `1px solid ${VIOLET}40`, borderRadius: 9, padding: '9px 14px', fontFamily: 'monospace', fontSize: 12, color: TEXT1, outline: 'none' }} />
            <button onClick={() => { if (inputKey.trim()) setApiKey(inputKey.trim()) }}
              style={{ background: `linear-gradient(135deg,${VIOLET},${PINK})`, border: 'none', borderRadius: 9, padding: '9px 20px', fontFamily: '"Orbitron",monospace', fontSize: 9, fontWeight: 700, color: '#fff', cursor: 'pointer', letterSpacing: '0.1em', boxShadow: `0 4px 24px ${VIOLET}50` }}>
              CONNECT →
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ ...glass(VIOLET), padding: 0, animation: 'ai-pulse 4s ease-in-out infinite' }}>
      <GlowLine color={VIOLET} />
      <div style={{ padding: '18px 22px' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${VIOLET}35,${PINK}20)`, border: `1px solid ${VIOLET}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: `0 0 20px ${VIOLET}35` }}>🤖</div>
            <div>
              <div style={{ fontFamily: '"Orbitron",monospace', fontSize: 9, fontWeight: 700, color: VIOLET, letterSpacing: '0.2em' }}>
                MARKO INTELLIGENCE
                {streaming && <span style={{ marginLeft: 8, color: CYAN, fontSize: 8, animation: 'blink 0.8s infinite' }}>● LIVE</span>}
              </div>
              <div style={{ fontFamily: 'Inter', fontSize: 9, color: MUTED, marginTop: 1 }}>Neural Performance Analysis · Powered by Claude</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <button onClick={() => { setBriefing(''); briefingDoneRef.current = false; callAI(null, true) }} disabled={streaming}
              style={{ background: 'none', border: `1px solid ${VIOLET}30`, borderRadius: 7, padding: '4px 11px', fontFamily: '"Orbitron",monospace', fontSize: 7, color: VIOLET, cursor: 'pointer', letterSpacing: '0.1em', opacity: streaming ? 0.4 : 1 }}>
              ↺ REFRESH
            </button>
            <button onClick={() => { setApiKey(''); setBriefing(''); briefingDoneRef.current = false }}
              style={{ background: 'none', border: `1px solid ${RED}25`, borderRadius: 7, padding: '4px 11px', fontFamily: '"Orbitron",monospace', fontSize: 7, color: RED + '70', cursor: 'pointer', letterSpacing: '0.1em' }}>
              ✕ DISCONNECT
            </button>
          </div>
        </div>

        {/* briefing */}
        {(briefing || streaming) && (
          <div style={{ background: `linear-gradient(135deg,${VIOLET}08,${PINK}05)`, border: `1px solid ${VIOLET}20`, borderRadius: 12, padding: '14px 18px', marginBottom: 14 }}>
            <div style={{ fontFamily: '"Orbitron",monospace', fontSize: 7, color: VIOLET + '80', letterSpacing: '0.18em', marginBottom: 8 }}>INTEL BRIEFING</div>
            <div style={{ fontFamily: 'Inter', fontSize: 13, color: TEXT1, lineHeight: 1.75 }}>
              {briefing || <span style={{ color: MUTED }}>Analyzing...</span>}
              {streaming && <span style={{ display: 'inline-block', width: 2, height: 14, background: VIOLET, marginLeft: 3, verticalAlign: 'middle', animation: 'blink 0.8s infinite' }} />}
            </div>
          </div>
        )}

        {/* chat history */}
        {messages.length > 0 && (
          <div ref={chatRef} style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, paddingRight: 4 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '84%', padding: '9px 14px', borderRadius: 12,
                  background: m.role === 'user' ? `${VIOLET}22` : 'rgba(10,15,34,0.8)',
                  border: `1px solid ${m.role === 'user' ? VIOLET + '45' : 'rgba(40,55,100,0.28)'}`,
                  fontFamily: 'Inter', fontSize: 13, color: TEXT1, lineHeight: 1.65,
                }}>{m.content}</div>
              </div>
            ))}
            {currentStream && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ maxWidth: '84%', padding: '9px 14px', borderRadius: 12, background: 'rgba(10,15,34,0.8)', border: `1px solid rgba(40,55,100,0.28)`, fontFamily: 'Inter', fontSize: 13, color: TEXT1, lineHeight: 1.65 }}>
                  {currentStream}
                  <span style={{ display: 'inline-block', width: 2, height: 12, background: CYAN, marginLeft: 3, verticalAlign: 'middle', animation: 'blink 0.8s infinite' }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* input */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="Ask anything — energy trends, what to focus on, recovery advice..."
            disabled={chatLoading}
            onKeyDown={e => { if (e.key === 'Enter' && userInput.trim() && !chatLoading) callAI(userInput) }}
            style={{ flex: 1, background: 'rgba(6,9,22,0.9)', border: `1px solid ${VIOLET}28`, borderRadius: 11, padding: '11px 16px', fontFamily: 'Inter', fontSize: 13, color: TEXT1, outline: 'none' }} />
          <button onClick={() => { if (userInput.trim() && !chatLoading) callAI(userInput) }} disabled={chatLoading || !userInput.trim()}
            style={{ background: chatLoading ? 'rgba(10,15,32,0.4)' : `linear-gradient(135deg,${VIOLET},${PINK})`, border: 'none', borderRadius: 11, padding: '11px 22px', fontFamily: '"Orbitron",monospace', fontSize: 9, fontWeight: 700, color: chatLoading ? MUTED : '#fff', cursor: chatLoading ? 'default' : 'pointer', letterSpacing: '0.1em', boxShadow: chatLoading ? 'none' : `0 4px 24px ${VIOLET}45`, transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
            {chatLoading ? '···' : 'ASK →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Check-in status dot ───────────────────────────────────────────────────────
function CheckDot({ done, label, color, onClick }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 9, background: done ? `${color}12` : 'rgba(10,15,32,0.5)', border: `1px solid ${done ? color + '40' : 'rgba(40,55,100,0.3)'}`, transition: 'all 0.2s' }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: done ? color : DARK, boxShadow: done ? `0 0 10px ${color}` : 'none', animation: done ? 'none' : 'blink 2s infinite' }} />
      <span style={{ fontFamily: '"Orbitron",monospace', fontSize: 8, fontWeight: 700, color: done ? color : MUTED, letterSpacing: '0.12em' }}>{label}</span>
      {done && <span style={{ fontFamily: 'Inter', fontSize: 9, color: GREEN, fontWeight: 700 }}>✓</span>}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DailyCommand({ onNavigate }) {
  const todayStr = today()
  const dayNum   = daysSinceStart()
  const now      = new Date()

  const [dailyData]   = useLocalStorage('marko_daily',   { logs: {} })
  const [bodyData]    = useLocalStorage('marko_body',    { liftSessions: [] })
  const [dietData]    = useLocalStorage('marko_diet',    { history: [] })
  const [checkInData] = useLocalStorage('marko_checkin', {})

  const winSettings = getWinDaySettings()
  const dayScore    = calcDayScore(todayStr, winSettings, dailyData, bodyData, dietData)
  const winHistory7 = getWinHistory(7,  winSettings, dailyData, bodyData, dietData)
  const winHistory30= getWinHistory(30, winSettings, dailyData, bodyData, dietData)
  const winStreak   = computeCurrentWinStreak(winHistory30)

  const morningDone    = !!(checkInData?.morning?.[todayStr]?.completed)
  const eveningDone    = !!(checkInData?.evening?.[todayStr]?.completed)
  const morningAnswers = checkInData?.morning?.[todayStr]?.answers || {}
  const eveningAnswers = checkInData?.evening?.[todayStr]?.answers || {}
  const todayLog = (dailyData.logs || {})[todayStr] || {}
  const nonNegs  = (todayLog.items || []).filter(it => it.isNonNeg)
  const goals    = JSON.parse(localStorage.getItem('marko_goals') || '[]').filter(g => !g.archived).sort((a,b) => new Date(a.endDate)-new Date(b.endDate)).slice(0,3)

  const { pct, isWin, metrics = [] } = dayScore
  const scoreColor = pct >= (winSettings.threshold || 65) ? GOLD : pct >= 40 ? CYAN : RED

  const mit  = morningAnswers['mi16'] || ''
  const word = morningAnswers['mi17'] || ''

  // Today's pulse
  const todayPulse = useMemo(() => ({
    energy: morningAnswers['me6']  != null ? +morningAnswers['me6']  : null,
    sleep:  morningAnswers['ms2']  != null ? +morningAnswers['ms2']  : null,
    mood:   morningAnswers['mm11'] != null ? (MOOD_NUM[morningAnswers['mm11']] ?? null) : null,
    stress: eveningAnswers['em19'] != null ? +eveningAnswers['em19'] : null,
  }), [checkInData]) // eslint-disable-line

  // 7-day sparklines for each pulse metric
  const sparkData = useMemo(() => {
    const energy = [], mood = [], stress = [], sleep = []
    for (let i = 6; i >= 0; i--) {
      const ds  = daysAgo(i)
      const ma  = checkInData?.morning?.[ds]?.answers || {}
      const ea  = checkInData?.evening?.[ds]?.answers  || {}
      const log = (dailyData.logs || {})[ds] || {}
      energy.push(ma['me6']  != null ? +ma['me6']  : null)
      mood.push(ma['mm11']   != null ? (MOOD_NUM[ma['mm11']] ?? null) : null)
      stress.push(ea['em19'] != null ? +ea['em19'] : null)
      sleep.push(log.sleepHours != null ? +log.sleepHours : null)
    }
    return { energy, mood, stress, sleep }
  }, [checkInData, dailyData])

  // 7-day averages
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
    const avgF = arr => arr.length ? +(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1) : null
    const avgI = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : null
    return { sleep: avgF(vals.sleep), calories: avgI(vals.calories), protein: avgI(vals.protein), steps: avgI(vals.steps), days: Math.max(vals.sleep.length,vals.calories.length,vals.steps.length) }
  }, [dietData, dailyData])

  // All-time check-in averages
  const checkinAvg = useMemo(() => {
    const slots = {
      energy:      { vals:[], label:'Energy',      color:GOLD,   src:'m', id:'me6'  },
      sleepQual:   { vals:[], label:'Sleep Qual',  color:VIOLET, src:'m', id:'ms2'  },
      clarity:     { vals:[], label:'Clarity',     color:CYAN,   src:'m', id:'mm12' },
      commitment:  { vals:[], label:'Motivation',  color:GREEN,  src:'m', id:'mi18' },
      mood:        { vals:[], label:'Mood',        color:PINK,   src:'m', id:'mm11', convert: v => MOOD_NUM[v] ?? null },
      stress:      { vals:[], label:'Stress',      color:RED,    src:'m', id:'mm13' },
      dayRating:   { vals:[], label:'Day Rating',  color:GOLD,   src:'e', id:'ed1'  },
      workFocus:   { vals:[], label:'Work Focus',  color:BLUE,   src:'e', id:'ed4'  },
      dietQuality: { vals:[], label:'Diet Quality',color:GREEN,  src:'e', id:'eb14' },
      evenStress:  { vals:[], label:'Anxiety',     color:RED,    src:'e', id:'em19' },
      control:     { vals:[], label:'Control',     color:CYAN,   src:'e', id:'em20' },
      workHoursAvg:{ vals:[], label:'Work Hours',  color:ORANGE, src:'e', id:'ed3'  },
    }
    const mornings = checkInData?.morning || {}, evenings = checkInData?.evening || {}
    for (const ds of Object.keys(mornings)) {
      const ans = mornings[ds]?.answers || {}
      for (const cfg of Object.values(slots)) {
        if (cfg.src !== 'm') continue
        const raw = ans[cfg.id]; if (raw == null) continue
        const v = cfg.convert ? cfg.convert(raw) : +raw
        if (v != null && !isNaN(v)) cfg.vals.push(v)
      }
    }
    for (const ds of Object.keys(evenings)) {
      const ans = evenings[ds]?.answers || {}
      for (const cfg of Object.values(slots)) {
        if (cfg.src !== 'e') continue
        const raw = ans[cfg.id]; if (raw == null) continue
        const v = cfg.convert ? cfg.convert(raw) : +raw
        if (v != null && !isNaN(v)) cfg.vals.push(v)
      }
    }
    const avg = arr => arr.length ? +(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1) : null
    return Object.fromEntries(Object.entries(slots).map(([k,v])=>[k,{...v,avg:avg(v.vals),count:v.vals.length}]))
  }, [checkInData])

  // 30-day trend
  const norm = (v, mx) => v == null ? null : Math.min(10, +((v/mx)*10).toFixed(2))
  const [activeTab, setActiveTab] = useState('WELLBEING')

  const trendData = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const ds  = daysAgo(29-i)
      const dt  = new Date(ds+'T12:00:00')
      const label = `${dt.getMonth()+1}/${dt.getDate()}`
      if (ds < DATA_START_DATE) return { date:ds, label, hasData:false, energy:null,dayRating:null,dietQuality:null,stress:null,mood:null,caloriesNorm:null,proteinNorm:null,stepsNorm:null,workoutNorm:null,bizHoursNorm:null,sleepNorm:null }
      const ma  = checkInData?.morning?.[ds]?.answers || {}
      const ea  = checkInData?.evening?.[ds]?.answers  || {}
      const log = (dailyData.logs || {})[ds] || {}
      const diet= (dietData.history || []).find(h=>h.date===ds)
      const hasData = Object.keys(ma).length>0 || Object.keys(ea).length>0
      const trained  = [...(bodyData?.liftSessions||[]),...(bodyData?.workouts||[])].some(w=>w.date===ds)
      return {
        date:ds, label, hasData,
        energy:      ma['me6']  != null ? +ma['me6']  : null,
        dayRating:   ea['ed1']  != null ? +ea['ed1']  : null,
        dietQuality: ea['eb14'] != null ? +ea['eb14'] : null,
        stress:      ea['em19'] != null ? +ea['em19'] : null,
        mood:        ma['mm11'] != null ? (MOOD_NUM[ma['mm11']]??null) : null,
        caloriesNorm: norm(diet?.calories||null,3000),
        proteinNorm:  norm(diet?.protein||null,200),
        stepsNorm:    norm(log.steps!=null?+log.steps:null,15000),
        workoutNorm:  trained ? 10 : null,
        bizHoursNorm: norm(log.bizHours!=null?+log.bizHours:null,12),
        sleepNorm:    norm(log.sleepHours!=null?+log.sleepHours:null,10),
        calories:    diet?.calories||null, protein:diet?.protein||null,
        steps:       log.steps!=null?+log.steps:null,
        sleepHours:  log.sleepHours!=null?+log.sleepHours:null,
        bizHours:    log.bizHours!=null?+log.bizHours:null,
        workoutHours: trained?1:null,
      }
    })
  }, [checkInData, dailyData, dietData, bodyData])

  const trimmedTrend = useMemo(() => {
    const first = trendData.findIndex(d=>d.hasData)
    return first > 0 ? trendData.slice(Math.max(0,first-1)) : trendData
  }, [trendData])

  // Habits last 7 days
  const habitHistory7 = useMemo(() => Array.from({length:7},(_,i)=>{
    const ds  = daysAgo(6-i)
    const log = (dailyData.logs||{})[ds]||{}
    return { date:ds, dow:['S','M','T','W','T','F','S'][new Date(ds+'T12:00:00').getDay()], isToday:ds===todayStr, read:log.mentalRead===1, meditated:log.meditated===1, prayed:log.prayed===1, bible:log.readBible===1, hasData:Object.keys(log).length>0 }
  }), [dailyData, todayStr])

  // Habit streaks
  const habitStreaks = useMemo(() => {
    const map = {read:'mentalRead',meditated:'meditated',prayed:'prayed',bible:'readBible'}
    const result = {}
    for (const [key,field] of Object.entries(map)) {
      let streak=0
      for (let i=1;i<=60;i++) {
        const ds=daysAgo(i), log=(dailyData.logs||{})[ds]||{}
        if (log[field]===1) streak++; else break
      }
      result[key]=streak
    }
    return result
  }, [dailyData])

  // Streak risks
  const streakRisks = useMemo(() => {
    const items=[
      {key:'prayed',   label:'Prayer',  todayDone:todayLog.prayed===1    },
      {key:'readBible',label:'Bible',   todayDone:todayLog.readBible===1 },
      {key:'mentalRead',label:'Reading',todayDone:todayLog.mentalRead===1},
      {key:'meditated',label:'Meditate',todayDone:todayLog.meditated===1 },
    ]
    const risks=[]
    for (const h of items) {
      let streak=0
      for (let i=1;i<=60;i++) { const ds=daysAgo(i),log=(dailyData.logs||{})[ds]||{}; if(log[h.key]===1) streak++; else break }
      if (streak>0 && !h.todayDone) risks.push({...h,streak})
    }
    let wStreak=0
    for (let i=1;i<=60;i++){const ds=daysAgo(i),trained=[...(bodyData?.liftSessions||[]),...(bodyData?.workouts||[])].some(w=>w.date===ds);if(trained) wStreak++;else break}
    const todayTrained=[...(bodyData?.liftSessions||[]),...(bodyData?.workouts||[])].some(w=>w.date===todayStr)
    if(wStreak>0&&!todayTrained) risks.push({key:'workout',label:'Training',streak:wStreak,todayDone:false})
    return risks
  }, [dailyData, bodyData, todayLog, todayStr])

  // Daily brief
  const dailyBrief = useMemo(() => {
    const yLog=(dailyData.logs||{})[daysAgo(1)]||{}
    const yMetrics=[
      {label:'Energy',      val:yLog.energy      !=null?+yLog.energy      :null},
      {label:'Day Rating',  val:yLog.dailyRating !=null?+yLog.dailyRating :null},
      {label:'Diet Quality',val:yLog.dietQuality !=null?+yLog.dietQuality :null},
      {label:'Work Focus',  val:yLog.workOutput  !=null?+yLog.workOutput  :null},
      {label:'Sleep Qual',  val:yLog.sleep       !=null?+yLog.sleep       :null},
    ].filter(m=>m.val!=null)
    const bottleneck=yMetrics.length>0?yMetrics.reduce((mn,m)=>m.val<mn.val?m:mn):null
    const edgeCandidates=[
      {label:'Energy',     val:morningAnswers['me6'] !=null?+morningAnswers['me6'] :null},
      {label:'Clarity',    val:morningAnswers['mm12']!=null?+morningAnswers['mm12']:null},
      {label:'Commitment', val:morningAnswers['mi18']!=null?+morningAnswers['mi18']:null},
    ].filter(m=>m.val!=null)
    const edge=edgeCandidates.length>0?edgeCandidates.reduce((mx,m)=>m.val>mx.val?m:mx):null
    return {bottleneck,edge}
  }, [dailyData, morningAnswers])

  // AI context string
  const aiContext = useMemo(() => {
    const lines = [
      `DATE: ${todayStr}`, `DAY NUMBER: ${dayNum}`,
      `MORNING CHECK-IN: ${morningDone?'COMPLETE':'PENDING'}`,
      `EVENING CHECK-IN: ${eveningDone?'COMPLETE':'PENDING'}`,
    ]
    if (todayPulse.energy!=null) lines.push(`ENERGY: ${todayPulse.energy}/10`)
    if (todayPulse.mood!=null)   lines.push(`MOOD: ${todayPulse.mood}/10`)
    if (todayPulse.stress!=null) lines.push(`STRESS: ${todayPulse.stress}/10`)
    if (todayPulse.sleep!=null)  lines.push(`SLEEP QUALITY: ${todayPulse.sleep}/10`)
    lines.push(`WIN SCORE: ${pct}% (${isWin?'WIN':pct===0?'NO DATA':'LOSS'})`)
    lines.push(`WIN STREAK: ${winStreak} days`)
    const w7=winHistory7.filter(d=>d.available>0); const wins7=w7.filter(d=>d.isWin).length
    if(w7.length>0) lines.push(`LAST 7 DAYS: ${wins7}W / ${w7.length-wins7}L`)
    if(mit) lines.push(`MIT TODAY: "${mit}"`)
    if(avg7.sleep)    lines.push(`7-DAY AVG SLEEP: ${avg7.sleep} hrs`)
    if(avg7.steps)    lines.push(`7-DAY AVG STEPS: ${avg7.steps}`)
    if(avg7.calories) lines.push(`7-DAY AVG CALORIES: ${avg7.calories}`)
    const todayH=habitHistory7[6]
    if(todayH?.hasData) lines.push(`HABITS TODAY: Read ${todayH.read?'✓':'✗'} Prayer ${todayH.prayed?'✓':'✗'} Bible ${todayH.bible?'✓':'✗'} Meditate ${todayH.meditated?'✓':'✗'}`)
    const strs=Object.entries(habitStreaks).filter(([,v])=>v>0).map(([k,v])=>`${k}=${v}d🔥`).join(' ')
    if(strs) lines.push(`HABIT STREAKS: ${strs}`)
    const avgs=Object.values(checkinAvg).filter(v=>v.avg!=null).map(v=>`${v.label}=${v.avg}`).join(' ')
    if(avgs) lines.push(`ALL-TIME AVGS: ${avgs}`)
    if(dailyBrief.bottleneck) lines.push(`YESTERDAY WEAKEST: ${dailyBrief.bottleneck.label} ${dailyBrief.bottleneck.val}/10`)
    if(dailyBrief.edge)       lines.push(`TODAY STRONGEST: ${dailyBrief.edge.label} ${dailyBrief.edge.val}/10`)
    if(metrics.length>0)      lines.push(`WIN METRICS: ${metrics.map(m=>`${m.label}${m.pass?'✓':'✗'}`).join(' ')}`)
    if(streakRisks.length>0)  lines.push(`STREAKS AT RISK: ${streakRisks.map(r=>`${r.label}(${r.streak}d)`).join(' ')}`)
    return lines.join('\n')
  }, [todayStr,dayNum,morningDone,eveningDone,todayPulse,pct,isWin,winStreak,winHistory7,mit,avg7,habitHistory7,habitStreaks,checkinAvg,dailyBrief,metrics,streakRisks])

  const dayLabel = `DAY ${String(dayNum).padStart(3,'0')}`
  const dateDisplay = now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}).toUpperCase()

  // Chart tabs
  const CHART_TABS = {
    WELLBEING: [
      {key:'energy',     label:'Energy',     color:GOLD  },
      {key:'dayRating',  label:'Day Rating', color:VIOLET},
      {key:'mood',       label:'Mood',       color:PINK  },
      {key:'stress',     label:'Stress',     color:RED   },
    ],
    BODY: [
      {key:'sleepNorm',    label:'Sleep',    color:'#c084fc'},
      {key:'stepsNorm',    label:'Steps',    color:BLUE     },
      {key:'caloriesNorm', label:'Calories', color:CYAN     },
      {key:'proteinNorm',  label:'Protein',  color:'#34d399'},
    ],
    BUSINESS: [
      {key:'bizHoursNorm', label:'Biz Hours', color:ORANGE   },
      {key:'workoutNorm',  label:'Training',  color:'#2dd4bf'},
      {key:'dietQuality',  label:'Diet',      color:GREEN    },
    ],
  }
  const TAB_COLORS = {WELLBEING:GOLD,BODY:GREEN,BUSINESS:BLUE}
  const activeLines = CHART_TABS[activeTab]
  const tabColor = TAB_COLORS[activeTab]

  const wins7   = winHistory7.filter(d=>d.available>0&&d.isWin).length
  const losses7 = winHistory7.filter(d=>d.available>0&&!d.isWin).length

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background:'transparent', minHeight:'100%', overflowY:'auto', paddingBottom:32 }}>

      {/* ═══════════════════ HERO STRIP ═══════════════════ */}
      <div className="fade-in" style={{
        background: 'rgba(3,4,18,0.96)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        borderBottom: `1px solid ${GOLD}22`,
        boxShadow: `0 4px 60px ${GOLD}06, 0 0 80px rgba(34,211,238,0.04)`,
        padding: '20px 28px 20px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Rainbow top hairline */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:`linear-gradient(90deg, transparent, ${GOLD}CC, ${CYAN}AA, ${VIOLET}88, ${PINK}66, transparent)`, boxShadow:`0 0 16px ${GOLD}60` }} />

        {/* Subtle ambient glow */}
        <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse 80% 200% at 50% -50%, ${GOLD}06, transparent)`, pointerEvents:'none' }} />

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:20 }}>
          {/* Left: Day + date */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:GOLD, boxShadow:`0 0 10px ${GOLD}` }} />
              <span style={{ fontFamily:'"Orbitron",monospace', fontSize:9, fontWeight:700, color:GOLD+'AA', letterSpacing:'0.22em' }}>MARKO OS — COMMAND BRIDGE</span>
            </div>
            <div className="text-gold-gradient" style={{ fontFamily:'"Barlow Condensed",sans-serif', fontWeight:900, fontSize:68, lineHeight:0.9, letterSpacing:'-0.01em', filter:`drop-shadow(0 0 28px ${GOLD}55)` }}>
              {dayLabel}
            </div>
            <div style={{ fontFamily:'Inter', fontSize:10, color:DARK, marginTop:8, letterSpacing:'0.14em' }}>{dateDisplay}</div>
          </div>

          {/* Center: Check-in status */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'center' }}>
            <CheckDot done={morningDone} label="MORNING" color={GOLD}   onClick={()=>onNavigate?.('morning')} />
            <CheckDot done={eveningDone} label="EVENING" color={VIOLET} onClick={()=>onNavigate?.('evening')} />
          </div>

          {/* Right: Score ring + status */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <ScoreRing pct={pct} color={scoreColor} size={118} label={pct===0?'PENDING':isWin?'WIN ★':'LOSS'} />
            {winStreak > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:8, background:`${GOLD}12`, border:`1px solid ${GOLD}35` }}>
                <span style={{ fontSize:12 }}>🔥</span>
                <span style={{ fontFamily:'"Barlow Condensed",sans-serif', fontWeight:900, fontSize:18, color:GOLD, filter:`drop-shadow(0 0 8px ${GOLD})` }}>{winStreak}</span>
                <span style={{ fontFamily:'"Orbitron",monospace', fontSize:7, color:GOLD+'80', letterSpacing:'0.1em' }}>STREAK</span>
              </div>
            )}
          </div>
        </div>

        {/* Score bar */}
        <div style={{ height:3, background:'rgba(10,15,32,0.8)', borderRadius:2, overflow:'hidden', marginTop:18, position:'relative' }}>
          <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${scoreColor}55,${scoreColor})`, borderRadius:2, boxShadow:`0 0 16px ${scoreColor}`, transition:'width 1.4s cubic-bezier(0.16,1,0.3,1)' }} />
        </div>
      </div>

      {/* ═══════════════════ MAIN CONTENT ═══════════════════ */}
      <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>

        {/* ── AI INTEL ── */}
        <div className="fade-up delay-1">
          <AIIntelPanel context={aiContext} />
        </div>

        {/* ── PULSE ROW ── */}
        {(todayPulse.energy!==null||todayPulse.mood!==null||todayPulse.stress!==null||todayPulse.sleep!==null) && (
          <div className="fade-up delay-1" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            {[
              { label:'ENERGY',  value:todayPulse.energy, unit:'/10', color:GOLD,   spark:sparkData.energy,  sublabel:checkinAvg.energy?.avg!=null?`avg ${checkinAvg.energy.avg}`:null },
              { label:'MOOD',    value:todayPulse.mood,   unit:'/10', color:PINK,   spark:sparkData.mood,    sublabel:null },
              { label:'STRESS',  value:todayPulse.stress, unit:'/10', color:RED,    spark:sparkData.stress,  sublabel:todayPulse.stress!=null?(todayPulse.stress<=3?'↓ GREAT':(todayPulse.stress>=7?'↑ HIGH':null)):null },
              { label:'SLEEP',   value:todayPulse.sleep,  unit:'/10', color:VIOLET, spark:sparkData.sleep,   sublabel:null },
            ].map(({label,value,unit,color,spark,sublabel})=>(
              <div key={label} style={{ ...glass(color), padding:0, position:'relative' }}>
                <GlowLine color={value!=null?color:'rgba(30,40,80,0.5)'} />
                <div style={{ padding:'16px 16px 12px', display:'flex', flexDirection:'column', gap:3 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div style={{ fontFamily:'"Orbitron",monospace', fontSize:7, color:color+'99', letterSpacing:'0.18em', marginBottom:5 }}>{label}</div>
                      <div style={{ display:'flex', alignItems:'baseline', gap:3 }}>
                        <span style={{ fontFamily:'"Barlow Condensed",sans-serif', fontWeight:900, fontSize:52, lineHeight:1, color:value!=null?color:DARK, filter:value!=null?`drop-shadow(0 0 22px ${color}AA)`:'none' }}>
                          {value!=null?value:'—'}
                        </span>
                        {value!=null&&unit&&<span style={{ fontFamily:'Inter', fontSize:11, color:color+'80', fontWeight:600, paddingBottom:4 }}>{unit}</span>}
                      </div>
                    </div>
                    {spark&&value!=null&&<div style={{marginTop:4}}><Sparkline data={spark} color={color} w={64} h={28} /></div>}
                  </div>
                  {sublabel&&<div style={{ fontFamily:'Inter', fontSize:9, color:color+'90', fontWeight:600 }}>{sublabel}</div>}
                </div>
                {/* bottom fill bar */}
                <div style={{ height:2, background:'rgba(8,12,26,0.9)', flexShrink:0 }}>
                  {value!=null&&<div style={{ height:'100%', width:`${(value/10)*100}%`, background:`linear-gradient(90deg,${color}44,${color})`, boxShadow:`0 0 8px ${color}`, transition:'width 1.2s cubic-bezier(0.16,1,0.3,1)' }} />}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── MIDDLE BENTO ── */}
        <div className="fade-up delay-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>

          {/* WIN RECORD */}
          <div style={{ ...glass(scoreColor), padding:0, display:'flex', flexDirection:'column' }}>
            <GlowLine color={scoreColor} />
            <div style={{ padding:'18px 18px', display:'flex', flexDirection:'column', alignItems:'center', gap:12, flex:1, justifyContent:'center' }}>
              <div style={{ fontFamily:'"Orbitron",monospace', fontSize:8, color:scoreColor+'99', letterSpacing:'0.18em', alignSelf:'flex-start' }}>WIN RECORD</div>
              <ScoreRing pct={pct} color={scoreColor} size={100} />
              <div style={{ display:'flex', gap:10, width:'100%' }}>
                <div style={{ flex:1, textAlign:'center', padding:'10px 6px', borderRadius:10, background:`${GOLD}10`, border:`1px solid ${GOLD}28` }}>
                  <div style={{ fontFamily:'"Barlow Condensed",sans-serif', fontWeight:900, fontSize:28, color:GOLD, filter:`drop-shadow(0 0 10px ${GOLD}80)` }}>{wins7}</div>
                  <div style={{ fontFamily:'"Orbitron",monospace', fontSize:7, color:GOLD+'80', letterSpacing:'0.1em' }}>WINS 7D</div>
                </div>
                <div style={{ flex:1, textAlign:'center', padding:'10px 6px', borderRadius:10, background:`${RED}0C`, border:`1px solid ${RED}28` }}>
                  <div style={{ fontFamily:'"Barlow Condensed",sans-serif', fontWeight:900, fontSize:28, color:RED, filter:`drop-shadow(0 0 10px ${RED}80)` }}>{losses7}</div>
                  <div style={{ fontFamily:'"Orbitron",monospace', fontSize:7, color:RED+'80', letterSpacing:'0.1em' }}>LOSSES 7D</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:5, width:'100%' }}>
                {winHistory7.map((d,i)=>{
                  const isT=d.date===todayStr, has=d.available>0
                  return (
                    <div key={i} style={{ flex:1, aspectRatio:'1', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center',
                      background:!has?'rgba(15,22,44,0.5)':d.isWin?`${GOLD}18`:`${RED}12`,
                      border:`1px solid ${isT?GOLD+'90':!has?'rgba(25,35,70,0.4)':d.isWin?GOLD+'35':RED+'30'}`,
                      boxShadow:has&&d.isWin?`0 0 10px ${GOLD}18`:has?`0 0 6px ${RED}10`:'none',
                    }}>
                      {has&&<span style={{ fontFamily:'"Barlow Condensed",sans-serif', fontWeight:900, fontSize:11, color:d.isWin?GOLD:RED, filter:d.isWin?`drop-shadow(0 0 6px ${GOLD})`:undefined }}>{d.isWin?'W':'L'}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* HABITS */}
          {habitHistory7.some(d=>d.hasData) && (
            <div style={{ ...glass(GREEN), padding:0 }}>
              <GlowLine color={GREEN} />
              <div style={{ padding:'16px 16px' }}>
                <div style={{ fontFamily:'"Orbitron",monospace', fontSize:8, color:GREEN+'99', letterSpacing:'0.18em', marginBottom:14 }}>DAILY HABITS</div>
                {/* DOW header */}
                <div style={{ display:'flex', gap:5, marginBottom:8, paddingLeft:68 }}>
                  {habitHistory7.map((d,i)=>(
                    <span key={i} style={{ flex:1, textAlign:'center', fontFamily:'"Orbitron",monospace', fontSize:8, color:d.isToday?GOLD:DARK, fontWeight:d.isToday?700:400 }}>{d.dow}</span>
                  ))}
                  <div style={{ width:40 }} />
                </div>
                {[
                  {key:'read',      label:'Read',   color:CYAN  },
                  {key:'meditated', label:'Med',    color:VIOLET},
                  {key:'prayed',    label:'Pray',   color:GOLD  },
                  {key:'bible',     label:'Bible',  color:PINK  },
                ].map(({key,label,color})=>{
                  const streak=habitStreaks[key]||0
                  return (
                    <div key={key} style={{ display:'flex', alignItems:'center', gap:5, marginBottom:7 }}>
                      <span style={{ fontFamily:'Inter', fontSize:10, fontWeight:700, color:TEXT1, width:60, flexShrink:0 }}>{label}</span>
                      <div style={{ display:'flex', gap:5, flex:1 }}>
                        {habitHistory7.map((d,i)=>(
                          <div key={i} style={{
                            flex:1, aspectRatio:'1', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center',
                            background:!d.hasData?'rgba(12,18,40,0.5)':d[key]?`${GREEN}20`:`${RED}15`,
                            border:`1px solid ${d.isToday?color+'AA':!d.hasData?'rgba(22,32,65,0.4)':d[key]?GREEN+'50':RED+'45'}`,
                            boxShadow:d.hasData?(d[key]?`0 0 10px ${GREEN}22`:`0 0 6px ${RED}15`):'none',
                          }}>
                            {d.hasData&&<span style={{ fontSize:12, fontWeight:900, color:d[key]?GREEN:RED, filter:d[key]?`drop-shadow(0 0 7px ${GREEN}CC)`:`drop-shadow(0 0 4px ${RED}88)` }}>{d[key]?'✓':'✗'}</span>}
                          </div>
                        ))}
                      </div>
                      <div style={{ width:40, display:'flex', alignItems:'center', justifyContent:'flex-end', gap:2, flexShrink:0 }}>
                        {streak>0&&<><span style={{ fontFamily:'"Barlow Condensed",sans-serif', fontWeight:900, fontSize:15, color:ORANGE, filter:`drop-shadow(0 0 6px ${ORANGE}80)` }}>{streak}</span><span style={{ fontSize:10 }}>🔥</span></>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* DAILY BRIEF */}
          <div style={{ ...glass(CYAN), padding:0, display:'flex', flexDirection:'column' }}>
            <GlowLine color={CYAN} />
            <div style={{ padding:'16px 16px', display:'flex', flexDirection:'column', gap:10, flex:1 }}>
              <div style={{ fontFamily:'"Orbitron",monospace', fontSize:8, color:CYAN+'99', letterSpacing:'0.18em' }}>DAILY BRIEF</div>

              {mit && (
                <div style={{ padding:'12px 13px', borderRadius:11, background:`${GOLD}0C`, border:`1px solid ${GOLD}28` }}>
                  <div style={{ fontFamily:'"Orbitron",monospace', fontSize:7, color:GOLD, letterSpacing:'0.16em', marginBottom:6 }}>MIT TODAY</div>
                  <div style={{ fontFamily:'Inter', fontSize:12, color:TEXT1, lineHeight:1.55, fontWeight:600 }}>{mit}</div>
                </div>
              )}

              {word && (
                <div style={{ padding:'10px 13px', borderRadius:11, background:`${CYAN}08`, border:`1px solid ${CYAN}28` }}>
                  <div style={{ fontFamily:'"Orbitron",monospace', fontSize:7, color:CYAN, letterSpacing:'0.16em', marginBottom:4 }}>WORD OF DAY</div>
                  <div style={{ fontFamily:'"Orbitron",monospace', fontSize:13, fontWeight:700, color:CYAN, letterSpacing:'0.08em', filter:`drop-shadow(0 0 10px ${CYAN}80)` }}>{word.toUpperCase()}</div>
                </div>
              )}

              {dailyBrief.edge && (
                <div style={{ padding:'11px 13px', borderRadius:11, background:`${GREEN}0A`, border:`1px solid ${GREEN}28`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontFamily:'"Orbitron",monospace', fontSize:7, color:GREEN, letterSpacing:'0.15em', marginBottom:3 }}>TODAY'S EDGE</div>
                    <div style={{ fontFamily:'Inter', fontSize:11, color:GREEN+'CC' }}>{dailyBrief.edge.label}</div>
                  </div>
                  <span style={{ fontFamily:'"Barlow Condensed",sans-serif', fontWeight:900, fontSize:36, color:GREEN, filter:`drop-shadow(0 0 16px ${GREEN}AA)` }}>{dailyBrief.edge.val}</span>
                </div>
              )}

              {dailyBrief.bottleneck && (
                <div style={{ padding:'11px 13px', borderRadius:11, background:`${RED}08`, border:`1px solid ${RED}28`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontFamily:'"Orbitron",monospace', fontSize:7, color:RED, letterSpacing:'0.15em', marginBottom:3 }}>YESTERDAY'S GAP</div>
                    <div style={{ fontFamily:'Inter', fontSize:11, color:RED+'CC' }}>{dailyBrief.bottleneck.label}</div>
                  </div>
                  <span style={{ fontFamily:'"Barlow Condensed",sans-serif', fontWeight:900, fontSize:36, color:RED, filter:`drop-shadow(0 0 16px ${RED}AA)` }}>{dailyBrief.bottleneck.val}</span>
                </div>
              )}

              {streakRisks.length > 0 && (
                <div style={{ padding:'11px 13px', borderRadius:11, background:`${ORANGE}08`, border:`1px solid ${ORANGE}28` }}>
                  <div style={{ fontFamily:'"Orbitron",monospace', fontSize:7, color:ORANGE, letterSpacing:'0.15em', marginBottom:8 }}>STREAKS AT RISK</div>
                  {streakRisks.map(r=>(
                    <div key={r.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontFamily:'Inter', fontSize:11, color:ORANGE+'CC' }}>{r.label}</span>
                      <span style={{ fontFamily:'"Barlow Condensed",sans-serif', fontWeight:900, fontSize:16, color:ORANGE }}>{r.streak}🔥</span>
                    </div>
                  ))}
                </div>
              )}

              {!mit && !dailyBrief.edge && !dailyBrief.bottleneck && !streakRisks.length && (
                <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, opacity:0.5 }}>
                  <div style={{ fontSize:28 }}>📋</div>
                  <div style={{ fontFamily:'Inter', fontSize:11, color:MUTED, textAlign:'center' }}>Complete your morning check-in to populate your daily brief.</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 7-DAY AVERAGES ── */}
        {avg7.days >= 2 && (
          <div className="fade-up delay-2" style={{ ...glass(BLUE), padding:0 }}>
            <GlowLine color={BLUE} />
            <div style={{ padding:'16px 20px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:BLUE, boxShadow:`0 0 8px ${BLUE}` }} />
                  <span style={{ fontFamily:'"Orbitron",monospace', fontSize:9, fontWeight:700, color:BLUE, letterSpacing:'0.18em' }}>7-DAY AVERAGES</span>
                </div>
                <button onClick={()=>onNavigate?.('insights')} style={{ background:'none', border:`1px solid ${BLUE}30`, borderRadius:7, padding:'4px 12px', fontFamily:'"Orbitron",monospace', fontSize:7, color:BLUE+'80', cursor:'pointer', letterSpacing:'0.1em' }}>DEEP INSIGHTS →</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                {[
                  {label:'Sleep',    value:avg7.sleep,    unit:'hrs',  color:VIOLET, display:v=>v                   },
                  {label:'Calories', value:avg7.calories, unit:'kcal', color:CYAN,   display:v=>v.toLocaleString()  },
                  {label:'Protein',  value:avg7.protein,  unit:'g',    color:GREEN,  display:v=>v                   },
                  {label:'Steps',    value:avg7.steps,    unit:'',     color:GOLD,   display:v=>(v>=1000?`${(v/1000).toFixed(1)}k`:v) },
                ].map(({label,value,unit,color,display})=>(
                  <div key={label} style={{ padding:'14px 14px 12px', borderRadius:13, background:value!=null?`${color}0A`:'rgba(8,12,26,0.5)', border:`1px solid ${value!=null?color+'28':'rgba(25,35,70,0.3)'}`, position:'relative', overflow:'hidden' }}>
                    {value!=null&&<div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${color}CC,transparent)` }} />}
                    <div style={{ fontFamily:'"Orbitron",monospace', fontSize:7, color:value!=null?color+'99':DARK, letterSpacing:'0.16em', marginBottom:6 }}>{label}</div>
                    <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                      <span style={{ fontFamily:'"Barlow Condensed",sans-serif', fontWeight:900, fontSize:38, lineHeight:1, color:value!=null?color:DARK, filter:value!=null?`drop-shadow(0 0 16px ${color}90)`:'none' }}>{value!=null?display(value):'—'}</span>
                      {value!=null&&unit&&<span style={{ fontFamily:'Inter', fontSize:11, color:color+'80', fontWeight:600 }}>{unit}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── WIN METRICS + ALL-TIME AVGS ── */}
        <div className="fade-up delay-2" style={{ display:'grid', gridTemplateColumns:metrics.length>0&&Object.values(checkinAvg).some(v=>v.avg!=null)?'auto 1fr':'1fr', gap:14 }}>
          {metrics.length > 0 && (
            <div style={{ ...glass(GOLD), padding:0 }}>
              <GlowLine color={GOLD} />
              <div style={{ padding:'14px 16px' }}>
                <div style={{ fontFamily:'"Orbitron",monospace', fontSize:8, color:GOLD+'99', letterSpacing:'0.18em', marginBottom:12 }}>WIN METRICS</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {metrics.map(m=>(
                    <div key={m.key} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', borderRadius:9, background:m.pass?`${GREEN}0A`:`${RED}08`, border:`1px solid ${m.pass?GREEN+'30':RED+'25'}` }}>
                      <span style={{ fontSize:11, color:m.pass?GREEN:RED, filter:`drop-shadow(0 0 5px ${m.pass?GREEN:RED})` }}>{m.pass?'✓':'✗'}</span>
                      <span style={{ fontFamily:'Inter', fontSize:12, fontWeight:600, color:m.pass?GREEN:RED }}>{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {Object.values(checkinAvg).some(v=>v.avg!=null) && (
            <div style={{ ...glass(PINK), padding:0 }}>
              <GlowLine color={PINK} />
              <div style={{ padding:'14px 16px' }}>
                <div style={{ fontFamily:'"Orbitron",monospace', fontSize:8, color:PINK+'99', letterSpacing:'0.18em', marginBottom:12 }}>ALL-TIME AVERAGES</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))', gap:8 }}>
                  {Object.values(checkinAvg).filter(v=>v.avg!=null).map(({label,avg,color})=>{
                    const isInv=label==='Stress'||label==='Anxiety'
                    const sc=isInv?(avg<=3?GREEN:avg<=5?'#f0c040':RED):(avg>=7.5?GREEN:avg>=5?'#f0c040':RED)
                    const sl=isInv?(avg<=3?'GREAT':avg<=5?'OK':'HIGH'):(avg>=7.5?'STRONG':avg>=5?'GOOD':'LOW')
                    return (
                      <div key={label} style={{ padding:'10px 10px 8px', borderRadius:11, background:`${sc}0A`, border:`1px solid ${sc}28`, position:'relative', overflow:'hidden' }}>
                        <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${sc}CC,transparent)` }} />
                        <span style={{ fontFamily:'"Barlow Condensed",sans-serif', fontWeight:900, fontSize:30, lineHeight:1, color:sc, filter:`drop-shadow(0 0 12px ${sc}90)` }}>{avg}</span>
                        <div style={{ fontFamily:'Inter', fontSize:10, fontWeight:700, color:TEXT1, marginTop:3, lineHeight:1.2 }}>{label}</div>
                        <div style={{ marginTop:5, padding:'2px 7px', borderRadius:5, background:`${sc}18`, border:`1px solid ${sc}35`, display:'inline-block' }}>
                          <span style={{ fontFamily:'"Orbitron",monospace', fontSize:6, fontWeight:700, color:sc, letterSpacing:'0.12em' }}>{sl}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── TREND CHART ── */}
        {trendData.some(d=>d.hasData) && (
          <div className="fade-up delay-3" style={{ ...glass(tabColor), padding:0, transition:'border-color 0.4s' }}>
            <GlowLine color={tabColor} />
            <div style={{ padding:'20px 22px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:tabColor, boxShadow:`0 0 8px ${tabColor}` }} />
                  <span style={{ fontFamily:'"Orbitron",monospace', fontSize:9, fontWeight:700, color:tabColor, letterSpacing:'0.18em' }}>METRICS TREND</span>
                  <span style={{ fontFamily:'Inter', fontSize:10, color:MUTED }}>last {trimmedTrend.length} days</span>
                </div>
                {/* Tab pills */}
                <div style={{ display:'flex', gap:6 }}>
                  {Object.keys(CHART_TABS).map(key=>{
                    const isA=activeTab===key, tc=TAB_COLORS[key]
                    return (
                      <button key={key} onClick={()=>setActiveTab(key)} style={{ background:isA?`${tc}20`:'rgba(8,12,26,0.6)', border:`1px solid ${isA?tc+'70':'rgba(35,50,90,0.4)'}`, borderRadius:8, padding:'5px 14px', fontFamily:'"Orbitron",monospace', fontSize:8, fontWeight:700, color:isA?tc:MUTED, cursor:'pointer', letterSpacing:'0.1em', boxShadow:isA?`0 0 14px ${tc}25`:'none', transition:'all 0.2s' }}>{key}</button>
                    )
                  })}
                </div>
              </div>
              {/* Legend */}
              <div style={{ display:'flex', gap:18, marginBottom:14, justifyContent:'center' }}>
                {activeLines.map(({key,label,color})=>(
                  <div key={key} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:20, height:2.5, background:color, borderRadius:2, boxShadow:`0 0 8px ${color}` }} />
                    <span style={{ fontFamily:'Inter', fontSize:11, fontWeight:700, color:TEXT1 }}>{label}</span>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={trimmedTrend} margin={{top:8,right:12,left:-8,bottom:4}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={`${tabColor}12`} vertical={false} />
                  <XAxis dataKey="label" tick={{fontFamily:'Inter',fontSize:10,fill:'#64748b',fontWeight:600}} tickLine={false} axisLine={{stroke:`${tabColor}22`}} interval="preserveStartEnd" />
                  <YAxis domain={[0,10]} tick={{fontFamily:'Inter',fontSize:10,fill:'#64748b',fontWeight:600}} tickLine={false} axisLine={false} ticks={[0,2,4,6,8,10]} width={26} />
                  <Tooltip contentStyle={{background:'rgba(4,6,18,0.97)',border:`1px solid ${tabColor}35`,borderRadius:12,fontFamily:'Inter',fontSize:12,color:TEXT1,boxShadow:`0 8px 32px rgba(0,0,0,0.5)`}}
                    formatter={(v,name,p)=>{
                      const d=p.payload
                      if(name==='Calories') return [d.calories!=null?`${d.calories.toLocaleString()} kcal`:'—',name]
                      if(name==='Protein')  return [d.protein!=null?`${d.protein}g`:'—',name]
                      if(name==='Steps')    return [d.steps!=null?`${d.steps.toLocaleString()} steps`:'—',name]
                      if(name==='Sleep')    return [d.sleepHours!=null?`${d.sleepHours} hrs`:'—',name]
                      if(name==='Biz Hours') return [d.bizHours!=null?`${d.bizHours} hrs`:'—',name]
                      if(name==='Training') return [d.workoutHours?'Trained ✓':'Rest','Training']
                      return [v!=null?`${v}/10`:'—',name]
                    }}
                    labelStyle={{color:GOLD,fontWeight:700,fontSize:11,marginBottom:6}}
                  />
                  {activeLines.map(({key,label,color})=>(
                    <Line key={key} type="monotone" dataKey={key} name={label} stroke={color} strokeWidth={2.5} dot={{r:3,strokeWidth:0,fill:color}} activeDot={{r:6,style:{filter:`drop-shadow(0 0 8px ${color})`}}} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── NON-NEGS + GOALS ── */}
        {(nonNegs.length>0||goals.length>0) && (
          <div className="fade-up delay-3" style={{ display:'grid', gridTemplateColumns:nonNegs.length>0&&goals.length>0?'1fr 1fr':'1fr', gap:14 }}>
            {nonNegs.length>0&&(
              <div style={{ ...glass(GREEN), padding:0 }}>
                <GlowLine color={GREEN} />
                <div style={{ padding:'14px 16px' }}>
                  <div style={{ fontFamily:'"Orbitron",monospace', fontSize:8, color:GREEN+'99', letterSpacing:'0.18em', marginBottom:12 }}>NON-NEGOTIABLES</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {nonNegs.map(item=>(
                      <div key={item.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:9, background:item.checked?`${GREEN}0A`:`${RED}08`, border:`1px solid ${item.checked?GREEN+'30':RED+'25'}` }}>
                        <div style={{ width:14,height:14,borderRadius:4,background:item.checked?GREEN:'transparent',border:item.checked?'none':`1px solid ${RED}50`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:item.checked?`0 0 8px ${GREEN}66`:'none',flexShrink:0 }}>
                          {item.checked&&<span style={{fontSize:9,color:'#000',fontWeight:900}}>✓</span>}
                        </div>
                        <span style={{ fontFamily:'Inter', fontSize:12, fontWeight:600, color:item.checked?GREEN:RED }}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {goals.length>0&&(
              <div style={{ ...glass(VIOLET), padding:0 }}>
                <GlowLine color={VIOLET} />
                <div style={{ padding:'14px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <div style={{ fontFamily:'"Orbitron",monospace', fontSize:8, color:VIOLET+'99', letterSpacing:'0.18em' }}>ACTIVE GOALS</div>
                    <button onClick={()=>onNavigate?.('goals')} style={{ background:'none', border:`1px solid ${VIOLET}30`, borderRadius:6, padding:'3px 10px', fontFamily:'"Orbitron",monospace', fontSize:7, color:VIOLET+'80', cursor:'pointer', letterSpacing:'0.1em' }}>ALL →</button>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {goals.map(goal=>{
                      const start=new Date(goal.startDate+'T00:00:00'),end=new Date(goal.endDate+'T00:00:00')
                      const total=Math.max(1,(end-start)/86400000),elapsed=Math.max(0,(now-start)/86400000)
                      const timePct=Math.min(100,Math.round((elapsed/total)*100))
                      const daysLeft=Math.max(0,Math.ceil((end-now)/86400000))
                      const accent={Body:'#2dd4bf',Business:PINK,Mind:PINK,Daily:BLUE,Custom:CYAN}[goal.category]||BLUE
                      return (
                        <div key={goal.id}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
                            <span style={{ fontFamily:'Inter', fontSize:12, color:TEXT1, fontWeight:600 }}>{goal.title}</span>
                            <span style={{ fontFamily:'"Barlow Condensed",sans-serif', fontWeight:900, fontSize:18, color:accent, filter:`drop-shadow(0 0 8px ${accent}80)` }}>{daysLeft}<span style={{ fontSize:10, color:DARK, fontWeight:400 }}>d</span></span>
                          </div>
                          <div style={{ height:4, background:'rgba(15,22,50,0.8)', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${timePct}%`, background:`linear-gradient(90deg,${accent}55,${accent})`, borderRadius:3, boxShadow:`0 0 8px ${accent}`, transition:'width 1.2s cubic-bezier(0.16,1,0.3,1)' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!morningDone && !eveningDone && metrics.length===0 && nonNegs.length===0 && goals.length===0 && (
          <div className="fade-up delay-2" style={{ textAlign:'center', padding:'60px 20px' }}>
            <div style={{ fontSize:52, marginBottom:16, filter:`drop-shadow(0 0 24px ${BLUE}60)` }}>🚀</div>
            <div style={{ fontFamily:'"Orbitron",monospace', fontSize:10, color:BLUE, letterSpacing:'0.28em', marginBottom:10, textShadow:`0 0 20px ${BLUE}90` }}>COMMAND BRIDGE READY</div>
            <div style={{ fontFamily:'Inter', fontSize:13, color:DARK }}>Start your morning check-in to initialize the system.</div>
          </div>
        )}
      </div>
    </div>
  )
}
