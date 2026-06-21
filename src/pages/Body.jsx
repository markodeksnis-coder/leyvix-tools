import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { pct, fmtShort } from '../utils'

const CARD = { background: '#0d1427', border: '1px solid #1a2440', borderRadius: 12, padding: 20 }
const CHART_TT = {
  contentStyle: { background: '#0d1427', border: '1px solid #1a2440', borderRadius: 8, fontSize: 11, fontFamily: 'Inter' },
  labelStyle: { color: '#a0aec0' },
  itemStyle: { color: '#fff' },
}

const cls = {
  input: "w-full bg-[#000000] border border-[#1a2440] px-3 py-2 text-sm text-white placeholder-[#a0aec0] focus:outline-none focus:border-[#c9a84c] transition-colors rounded-lg",
  label: "block text-[9px] font-mono uppercase tracking-widest text-[#a0aec0] mb-1.5",
  primary: "flex-1 py-2.5 text-white text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity rounded-lg",
  secondary: "px-4 py-2.5 border border-[#1a2440] text-[#a0aec0] text-[10px] uppercase tracking-widest hover:border-[#444] hover:text-white transition-colors rounded-lg",
}

const SectionLabel = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c9a84c' }} />
    <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{children}</span>
  </div>
)

export default function Body() {
  const [tab, setTab] = useState('fitness')
  const [body, setBody] = useLocalStorage('marko_body', {})
  const [diet, setDiet] = useLocalStorage('marko_diet', { targets: { calories: 2800, protein: 220, carbs: 280, fats: 80 }, history: [], supplements: [] })
  const [checkLogs] = useLocalStorage('marko_checklogs', {})

  const [modals, setModals] = useState({})
  const om = k => setModals(m => ({ ...m, [k]: true }))
  const cm = k => setModals(m => ({ ...m, [k]: false }))

  const today = new Date().toISOString().split('T')[0]
  const [wf, setWf] = useState({ date: today, name: '', exercises: [{ name: '', sets: '', reps: '', weight: '' }] })
  const [sf, setSf] = useState({ weight: '', bodyFat: String(body.bodyFat || ''), goalBodyFat: String(body.goalBodyFat || '') })
  const [mf, setMf] = useState({ date: today, calories: '', protein: '', carbs: '', fats: '' })
  const [prf, setPrf] = useState({ exercise: '', weight: '', reps: '', date: today })
  const [lf, setLf] = useState({ lift: '', weight: '', reps: '', feel: 3, date: today })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoEstimate, setPhotoEstimate] = useState(null)
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [photoConfirm, setPhotoConfirm] = useState({ calories: '', protein: '' })

  const todayDiet = diet.history?.find(h => h.date === today) || { calories: 0, protein: 0, carbs: 0, fats: 0 }

  const logWorkout = () => {
    if (!wf.name.trim()) return
    const workout = { ...wf, id: Date.now(), exercises: wf.exercises.filter(e => e.name) }
    setBody(b => ({ ...b, workouts: [workout, ...(b.workouts || [])] }))
    setWf({ date: today, name: '', exercises: [{ name: '', sets: '', reps: '', weight: '' }] })
    cm('workout')
  }

  const updateStats = () => {
    const w = parseFloat(sf.weight)
    const updates = {}
    if (w) {
      updates.currentWeight = w
      const entry = { date: today, weight: w }
      updates.weightHistory = [...(body.weightHistory || []).filter(h => h.date !== today), entry].sort((a, b) => a.date.localeCompare(b.date))
    }
    if (sf.bodyFat) updates.bodyFat = parseFloat(sf.bodyFat)
    if (sf.goalBodyFat) updates.goalBodyFat = parseFloat(sf.goalBodyFat)
    setBody(b => ({ ...b, ...updates }))
    cm('stats')
  }

  const logMeal = () => {
    if (!mf.calories) return
    const history = [...(diet.history || [])]
    const idx = history.findIndex(h => h.date === mf.date)
    if (idx >= 0) {
      history[idx] = {
        ...history[idx],
        calories: (history[idx].calories || 0) + parseFloat(mf.calories || 0),
        protein: (history[idx].protein || 0) + parseFloat(mf.protein || 0),
        carbs: (history[idx].carbs || 0) + parseFloat(mf.carbs || 0),
        fats: (history[idx].fats || 0) + parseFloat(mf.fats || 0),
      }
    } else {
      history.push({ date: mf.date, calories: parseFloat(mf.calories || 0), protein: parseFloat(mf.protein || 0), carbs: parseFloat(mf.carbs || 0), fats: parseFloat(mf.fats || 0) })
    }
    setDiet(d => ({ ...d, history: history.sort((a, b) => a.date.localeCompare(b.date)) }))
    setMf({ date: today, calories: '', protein: '', carbs: '', fats: '' })
    cm('meal')
  }

  const addPR = () => {
    if (!prf.exercise.trim() || !prf.weight) return
    setBody(b => ({ ...b, prs: { ...(b.prs || {}), [prf.exercise]: { weight: parseFloat(prf.weight), reps: parseInt(prf.reps) || 1, date: prf.date } } }))
    setPrf({ exercise: '', weight: '', reps: '', date: today })
    cm('pr')
  }

  const toggleSupp = id => {
    const supps = diet.supplements || []
    setDiet(d => ({
      ...d,
      supplements: supps.map(s => s.id === id ? { ...s, logs: (s.logs || []).includes(today) ? (s.logs || []).filter(l => l !== today) : [...(s.logs || []), today] } : s)
    }))
  }

  const logLiftSession = () => {
    if (!lf.lift.trim() || !lf.weight) return
    const session = { id: Date.now(), date: lf.date, lift: lf.lift.trim(), weight: parseFloat(lf.weight), reps: parseInt(lf.reps) || 1, feel: lf.feel }
    const currentPR = body.prs?.[lf.lift.trim()]
    const updates = { liftSessions: [session, ...(body.liftSessions || [])] }
    if (!currentPR || parseFloat(lf.weight) > currentPR.weight) {
      updates.prs = { ...(body.prs || {}), [lf.lift.trim()]: { weight: parseFloat(lf.weight), reps: parseInt(lf.reps) || 1, date: lf.date } }
    }
    setBody(b => ({ ...b, ...updates }))
    setLf({ lift: '', weight: '', reps: '', feel: 3, date: today })
    cm('lift')
  }

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setPhotoEstimate(null)
    setPhotoError('')
  }

  const handlePhotoAnalyze = async () => {
    if (!photoFile) return
    setPhotoAnalyzing(true)
    setPhotoError('')
    try {
      const est = await analyzePhoto(photoFile)
      setPhotoEstimate(est)
      setPhotoConfirm({ calories: String(est.calories), protein: String(est.protein) })
    } catch(err) {
      setPhotoError(err.message || 'Analysis failed')
    } finally { setPhotoAnalyzing(false) }
  }

  const handlePhotoLog = () => {
    const cals = parseFloat(photoConfirm.calories) || 0
    const prot = parseFloat(photoConfirm.protein) || 0
    const history = [...(diet.history || [])]
    const idx = history.findIndex(h => h.date === today)
    if (idx >= 0) {
      history[idx] = { ...history[idx], calories: (history[idx].calories || 0) + cals, protein: (history[idx].protein || 0) + prot }
    } else {
      history.push({ date: today, calories: cals, protein: prot, carbs: 0, fats: 0 })
    }
    setDiet(d => ({ ...d, history: history.sort((a, b) => a.date.localeCompare(b.date)) }))
    setPhotoFile(null); setPhotoPreview(null); setPhotoEstimate(null); setPhotoConfirm({ calories: '', protein: '' })
    cm('photomeal')
  }

  const weightChart = (body.weightHistory || []).slice(-90).map(w => ({ date: w.date.slice(5), weight: w.weight }))
  const last7Cal = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const ds = d.toISOString().split('T')[0]
    const h = diet.history?.find(x => x.date === ds)
    return { date: ds.slice(5), calories: h?.calories || 0 }
  })
  const avg30 = (() => {
    const d30 = new Date(); d30.setDate(d30.getDate() - 30)
    const recent = (diet.history || []).filter(h => h.date >= d30.toISOString().split('T')[0])
    return recent.length ? Math.round(recent.reduce((s, h) => s + (h.calories || 0), 0) / recent.length) : 0
  })()

  const todayMorning = checkLogs[today]?.morning || {}
  const todayEnergy = parseFloat(todayMorning.energy || 0)
  const prs = body.prs || {}
  const liftNudges = Object.entries(prs).map(([lift, pr]) => {
    const daysSince = pr.date ? Math.floor((Date.now() - new Date(pr.date + 'T12:00:00').getTime()) / 86400000) : 99
    const ready = todayEnergy >= 7 && daysSince >= 14
    const suggested = Math.round(pr.weight * 1.025 / 5) * 5
    return { lift, pr, daysSince, ready, suggested }
  }).filter(x => x.ready)

  const bf = parseFloat(body.bodyFat || 0)
  const goalBf = parseFloat(body.goalBodyFat || 10)
  const bfDiff = bf - goalBf
  const projDays = bfDiff > 0 ? Math.round(bfDiff / 0.5 * 7) : null
  const projDate = projDays ? new Date(Date.now() + projDays * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null

  return (
    <div className="h-full flex flex-col" style={{ background: '#000000' }}>
      {/* Header */}
      <div style={{ background: '#000000', borderBottom: '1px solid #1a2440', padding: '20px 32px', flexShrink: 0, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, color: '#a0aec0', letterSpacing: '0.12em', textTransform: 'uppercase' }}>BIOMETRICS ONLINE</span>
        </div>
        <h1 style={{
          fontFamily: '"Bebas Neue",cursive', fontSize: 64, fontWeight: 400, lineHeight: 0.9, fontStyle: 'italic', letterSpacing: '0.02em',
          background: 'linear-gradient(180deg,#c9a84c 0%,#c9a84c 60%,#c9a84c 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0
        }}>
          BODY
        </h1>
        <p style={{ fontFamily: 'Inter', fontSize: 10, color: '#a0aec0', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>PHYSICAL OPTIMIZATION // PERFORMANCE COMMAND</p>
        {/* Action buttons */}
        <div style={{ position: 'absolute', right: 32, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 8, alignItems: 'center' }}>
          {tab === 'fitness' ? (
            <>
              <button onClick={() => om('stats')} style={{ background: 'transparent', color: '#a0aec0', border: '1px solid #1a2440', borderRadius: 8, padding: '6px 12px', fontFamily: 'Inter', fontSize: 11, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a84c'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1a2440'}
              >Update Stats</button>
              <button onClick={() => om('pr')} style={{ background: 'transparent', color: '#a0aec0', border: '1px solid #1a2440', borderRadius: 8, padding: '6px 12px', fontFamily: 'Inter', fontSize: 11, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a84c'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1a2440'}
              >Log PR</button>
              <button onClick={() => om('workout')} style={{ background: '#c9a84c', color: '#000', border: 'none', borderRadius: 8, padding: '6px 14px', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={12} strokeWidth={2.5} /> Log Workout
              </button>
            </>
          ) : tab === 'diet' ? (
            <>
              <button onClick={() => om('photomeal')} style={{ background: 'transparent', color: '#a0aec0', border: '1px solid #1a2440', borderRadius: 8, padding: '6px 12px', fontFamily: 'Inter', fontSize: 11, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a84c'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1a2440'}
              >📷 Scan Meal</button>
              <button onClick={() => om('meal')} style={{ background: '#c9a84c', color: '#000', border: 'none', borderRadius: 8, padding: '6px 14px', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={12} strokeWidth={2.5} /> Log Meal
              </button>
            </>
          ) : (
            <button onClick={() => om('lift')} style={{ background: '#c9a84c', color: '#000', border: 'none', borderRadius: 8, padding: '6px 14px', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={12} strokeWidth={2.5} /> Log Session
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-3 flex gap-2 shrink-0" style={{ borderBottom: '1px solid #1a2440' }}>
        {['fitness', 'diet', 'lifts'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '5px 16px', borderRadius: 8, fontFamily: 'Inter', fontSize: 12, fontWeight: tab === t ? 600 : 400,
              background: tab === t ? '#c9a84c' : 'transparent',
              color: tab === t ? '#000' : '#a0aec0',
              border: tab === t ? 'none' : '1px solid #1a2440',
              cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s',
            }}
          >{t}</button>
        ))}
      </div>

      <div className="flex-1 overflow-auto px-6 py-5" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {tab === 'fitness' && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Weight', value: body.currentWeight ? `${body.currentWeight}` : '—', unit: body.currentWeight ? 'lbs' : '' },
                { label: 'Body Fat', value: body.bodyFat ? `${body.bodyFat}` : '—', unit: body.bodyFat ? '%' : '' },
                { label: 'Goal BF%', value: body.goalBodyFat || '10', unit: '%' },
                { label: 'Days to Goal', value: projDays ? `${projDays}` : '—', unit: projDays ? 'days' : '', sub: projDate || '' },
              ].map(s => (
                <div key={s.label} style={CARD}>
                  <SectionLabel>{s.label}</SectionLabel>
                  <div style={{ fontFamily: 'Inter', display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontFamily: '"Bebas Neue",cursive', fontSize: 36, fontWeight: 400, color: 'white', lineHeight: 1 }}>{s.value}</span>
                    {s.unit && <span style={{ fontSize: 12, color: '#a0aec0' }}>{s.unit}</span>}
                  </div>
                  {s.sub && <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#c9a84c', marginTop: 4 }}>{s.sub}</div>}
                </div>
              ))}
            </div>

            {/* Weight chart */}
            {weightChart.length > 1 && (
              <div style={CARD}>
                <SectionLabel>Weight Trend (Last 90 Days)</SectionLabel>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={weightChart}>
                    <XAxis dataKey="date" tick={{ fill: '#a0aec0', fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} interval={Math.floor(weightChart.length / 6)} />
                    <YAxis domain={['auto', 'auto']} tick={{ fill: '#a0aec0', fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip {...CHART_TT} formatter={v => [`${v} lbs`, '']} />
                    <Line type="monotone" dataKey="weight" stroke="#c9a84c" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Personal Records Table */}
            {body.prs && Object.keys(body.prs).length > 0 && (
              <div style={CARD}>
                <SectionLabel>Personal Records</SectionLabel>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1a2440' }}>
                      {['EXERCISE', 'WEIGHT', 'REPS', 'DATE'].map(h => (
                        <th key={h} style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left', padding: '0 12px 10px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(body.prs).map(([ex, pr]) => (
                      <tr key={ex} style={{ borderBottom: '1px solid #1a2440' }}>
                        <td style={{ padding: '10px 12px', fontFamily: 'Inter', fontSize: 13, color: 'white', fontWeight: 600 }}>{ex}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'Inter', fontSize: 18, fontWeight: 800, color: '#c9a84c' }}>
                          {pr.weight}<span style={{ fontSize: 11, color: '#a0aec0', marginLeft: 2 }}>lbs</span>
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'Inter', fontSize: 13, color: '#d1d5db' }}>{pr.reps} rep{pr.reps > 1 ? 's' : ''}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'Inter', fontSize: 11, color: '#a0aec0' }}>{fmtShort(pr.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Workouts */}
            <div style={CARD}>
              <SectionLabel>Recent Workouts</SectionLabel>
              {(!body.workouts || body.workouts.length === 0) ? (
                <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#a0aec0', textAlign: 'center', padding: '24px 0' }}>No workouts logged yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(body.workouts || []).slice(0, 8).map(w => (
                    <div key={w.id} style={{ background: '#000000', border: '1px solid #1a2440', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: 'white' }}>{w.name}</span>
                        <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#a0aec0' }}>{fmtShort(w.date)}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(w.exercises || []).map((ex, i) => (
                          <span key={i} style={{ fontFamily: 'Inter', fontSize: 11, color: '#c9a84c', border: '1px solid #1a2440', borderRadius: 4, padding: '2px 8px' }}>
                            {ex.name} {ex.sets}×{ex.reps}{ex.weight ? ` @ ${ex.weight}lbs` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'diet' && (
          <>
            {/* Macro cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Calories', current: todayDiet.calories, target: diet.targets?.calories, unit: 'kcal' },
                { label: 'Protein', current: todayDiet.protein, target: diet.targets?.protein, unit: 'g' },
                { label: 'Carbs', current: todayDiet.carbs, target: diet.targets?.carbs, unit: 'g' },
                { label: 'Fats', current: todayDiet.fats, target: diet.targets?.fats, unit: 'g' },
              ].map(m => {
                const p = pct(m.current || 0, m.target)
                const over = p >= 100
                return (
                  <div key={m.label} style={CARD}>
                    <SectionLabel>{m.label}</SectionLabel>
                    <div style={{ fontFamily: 'Inter', marginBottom: 10 }}>
                      <span style={{ fontFamily: '"Bebas Neue",cursive', fontSize: 36, fontWeight: 400, color: 'white', lineHeight: 1 }}>{m.current || 0}</span>
                      <span style={{ fontSize: 11, color: '#a0aec0', marginLeft: 4 }}>/ {m.target} {m.unit}</span>
                    </div>
                    <div style={{ height: 4, background: '#1a2440', borderRadius: 2 }}>
                      <div style={{ height: 4, background: over ? '#ef4444' : '#c9a84c', borderRadius: 2, width: `${Math.min(100, p)}%`, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontFamily: 'Inter', fontSize: 10, color: over ? '#ef4444' : '#a0aec0', marginTop: 4 }}>{p}%</div>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Calorie chart */}
              <div style={CARD}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c9a84c' }} />
                    <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>7-Day Calories</span>
                  </div>
                  <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#a0aec0' }}>30d avg: <span style={{ color: '#c9a84c' }}>{avg30}</span> kcal</span>
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={last7Cal}>
                    <XAxis dataKey="date" tick={{ fill: '#a0aec0', fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#a0aec0', fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip {...CHART_TT} formatter={v => [`${v} kcal`, '']} />
                    <Bar dataKey="calories" fill="#c9a84c" opacity={0.8} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Supplements */}
              <div style={CARD}>
                <SectionLabel>Supplements Today</SectionLabel>
                {(diet.supplements || []).length === 0 ? (
                  <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#a0aec0', textAlign: 'center', padding: '24px 0' }}>No supplements added</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(diet.supplements || []).map(s => {
                      const done = (s.logs || []).includes(today)
                      return (
                        <button key={s.id} onClick={() => toggleSupp(s.id)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                            background: done ? 'rgba(34,197,94,0.08)' : '#000000',
                            border: `1px solid ${done ? 'rgba(34,197,94,0.3)' : '#1a2440'}`,
                            borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ width: 18, height: 18, borderRadius: 4, background: done ? '#22c55e' : 'transparent', border: `1px solid ${done ? '#22c55e' : '#a0aec0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {done && <Check size={11} strokeWidth={3} color="white" />}
                          </div>
                          <span style={{ fontFamily: 'Inter', fontSize: 13, color: done ? '#22c55e' : '#a0aec0' }}>{s.name}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {tab === 'lifts' && (
          <>
            {/* PR Grid */}
            <div style={CARD}>
              <SectionLabel>Personal Records</SectionLabel>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(prs).map(([lift, pr]) => {
                  const daysSince = pr.date ? Math.floor((Date.now() - new Date(pr.date + 'T12:00:00')) / 86400000) : 0
                  const readiness = Math.min(100, Math.round((daysSince / 14) * 100))
                  return (
                    <div key={lift} style={{ background: '#000000', border: '1px solid #1a2440', borderRadius: 10, padding: 16 }}>
                      <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{lift}</div>
                      <div style={{ fontFamily: '"Bebas Neue",cursive', fontSize: 40, color: 'white', lineHeight: 1 }}>{pr.weight}</div>
                      <div style={{ fontFamily: 'Inter', fontSize: 10, color: '#a0aec0', marginBottom: 8 }}>lbs × {pr.reps} rep{pr.reps > 1 ? 's' : ''}</div>
                      <div style={{ height: 4, background: '#1a2440', borderRadius: 2, marginBottom: 4 }}>
                        <div style={{ height: 4, background: readiness >= 100 ? '#22c55e' : '#c9a84c', borderRadius: 2, width: `${readiness}%` }} />
                      </div>
                      <div style={{ fontFamily: 'Inter', fontSize: 9, color: readiness >= 100 ? '#22c55e' : '#a0aec0' }}>
                        {readiness >= 100 ? 'READY TO ATTEMPT' : `${daysSince}d since PR`}
                      </div>
                    </div>
                  )
                })}
                {Object.keys(prs).length === 0 && (
                  <div style={{ gridColumn: 'span 4', textAlign: 'center', padding: '24px 0', fontFamily: 'Inter', fontSize: 12, color: '#a0aec0' }}>
                    Log a session to set your first PR
                  </div>
                )}
              </div>
            </div>

            {/* AI Nudges */}
            {liftNudges.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {liftNudges.map(n => (
                  <div key={n.lift} style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderLeft: '3px solid #c9a84c', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 18 }}>⚡</span>
                    <div>
                      <div style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: '#c9a84c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>OPERATOR SIGNAL</div>
                      <div style={{ fontFamily: 'Inter', fontSize: 13, color: 'white' }}>
                        Your <strong>{n.lift}</strong> looks ready. Last PR: <strong>{n.pr.weight}lbs</strong> ({n.daysSince} days ago). Energy {todayEnergy}/10. Suggested target: <strong style={{ color: '#c9a84c' }}>{n.suggested}lbs</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Session History */}
            <div style={CARD}>
              <SectionLabel>Recent Sessions</SectionLabel>
              {(!body.liftSessions || body.liftSessions.length === 0) ? (
                <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#a0aec0', textAlign: 'center', padding: '24px 0' }}>No sessions logged yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(body.liftSessions || []).slice(0, 20).map(s => {
                    const feelColor = s.feel >= 4 ? '#22c55e' : s.feel >= 3 ? '#c9a84c' : '#ef4444'
                    const feelLabel = s.feel >= 5 ? 'INCREDIBLE' : s.feel >= 4 ? 'STRONG' : s.feel >= 3 ? 'AVERAGE' : s.feel >= 2 ? 'ROUGH' : 'TERRIBLE'
                    return (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#000000', border: '1px solid #1a2440', borderRadius: 8 }}>
                        <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#a0aec0', width: 52, flexShrink: 0 }}>{fmtShort(s.date)}</div>
                        <div style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: 'white', flex: 1 }}>{s.lift}</div>
                        <div style={{ fontFamily: '"Bebas Neue",cursive', fontSize: 18, color: '#c9a84c' }}>{s.weight}<span style={{ fontSize: 11, color: '#a0aec0', fontFamily: 'Inter', fontWeight: 400 }}>lbs</span></div>
                        <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#a0aec0', width: 50, textAlign: 'center' }}>×{s.reps}</div>
                        <div style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 700, color: feelColor, textTransform: 'uppercase', letterSpacing: '0.08em', width: 60, textAlign: 'right' }}>{feelLabel}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {modals.workout && (
        <Modal title="Log Workout" onClose={() => cm('workout')}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={cls.label}>Name</label><input value={wf.name} onChange={e => setWf({ ...wf, name: e.target.value })} placeholder="Push Day" className={cls.input} autoFocus /></div>
              <div><label className={cls.label}>Date</label><input type="date" value={wf.date} onChange={e => setWf({ ...wf, date: e.target.value })} className={cls.input} /></div>
            </div>
            <div>
              <label className={cls.label}>Exercises</label>
              <div className="space-y-2">
                {wf.exercises.map((ex, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2">
                    <input value={ex.name} onChange={e => setWf(w => ({ ...w, exercises: w.exercises.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))} placeholder="Exercise" className={cls.input + ' col-span-1'} />
                    <input value={ex.sets} onChange={e => setWf(w => ({ ...w, exercises: w.exercises.map((x, j) => j === i ? { ...x, sets: e.target.value } : x) }))} placeholder="Sets" className={cls.input} />
                    <input value={ex.reps} onChange={e => setWf(w => ({ ...w, exercises: w.exercises.map((x, j) => j === i ? { ...x, reps: e.target.value } : x) }))} placeholder="Reps" className={cls.input} />
                    <input value={ex.weight} onChange={e => setWf(w => ({ ...w, exercises: w.exercises.map((x, j) => j === i ? { ...x, weight: e.target.value } : x) }))} placeholder="lbs" className={cls.input} />
                  </div>
                ))}
                <button onClick={() => setWf(w => ({ ...w, exercises: [...w.exercises, { name: '', sets: '', reps: '', weight: '' }] }))} style={{ fontFamily: 'Inter', fontSize: 11, color: '#c9a84c', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add Exercise</button>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={logWorkout} className={cls.primary} style={{ background: '#c9a84c' }}>Save</button>
              <button onClick={() => cm('workout')} className={cls.secondary}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {modals.stats && (
        <Modal title="Update Stats" onClose={() => cm('stats')}>
          <div className="space-y-4">
            <div><label className={cls.label}>Current Weight (lbs)</label><input type="number" value={sf.weight} onChange={e => setSf(s => ({ ...s, weight: e.target.value }))} placeholder={String(body.currentWeight || '185')} className={cls.input} autoFocus /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={cls.label}>Body Fat %</label><input type="number" value={sf.bodyFat} onChange={e => setSf(s => ({ ...s, bodyFat: e.target.value }))} className={cls.input} /></div>
              <div><label className={cls.label}>Goal BF %</label><input type="number" value={sf.goalBodyFat} onChange={e => setSf(s => ({ ...s, goalBodyFat: e.target.value }))} className={cls.input} /></div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={updateStats} className={cls.primary} style={{ background: '#c9a84c' }}>Update</button>
              <button onClick={() => cm('stats')} className={cls.secondary}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {modals.meal && (
        <Modal title="Log Meal" onClose={() => cm('meal')}>
          <div className="space-y-4">
            <div><label className={cls.label}>Date</label><input type="date" value={mf.date} onChange={e => setMf({ ...mf, date: e.target.value })} className={cls.input} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={cls.label}>Calories</label><input type="number" value={mf.calories} onChange={e => setMf({ ...mf, calories: e.target.value })} placeholder="500" className={cls.input} autoFocus /></div>
              <div><label className={cls.label}>Protein (g)</label><input type="number" value={mf.protein} onChange={e => setMf({ ...mf, protein: e.target.value })} placeholder="40" className={cls.input} /></div>
              <div><label className={cls.label}>Carbs (g)</label><input type="number" value={mf.carbs} onChange={e => setMf({ ...mf, carbs: e.target.value })} placeholder="60" className={cls.input} /></div>
              <div><label className={cls.label}>Fats (g)</label><input type="number" value={mf.fats} onChange={e => setMf({ ...mf, fats: e.target.value })} placeholder="15" className={cls.input} /></div>
            </div>
            <p style={{ fontFamily: 'Inter', fontSize: 11, color: '#a0aec0' }}>Adds to existing totals for that day.</p>
            <div className="flex gap-2 pt-1">
              <button onClick={logMeal} className={cls.primary} style={{ background: '#c9a84c' }}>Save</button>
              <button onClick={() => cm('meal')} className={cls.secondary}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {modals.pr && (
        <Modal title="Log Personal Record" onClose={() => cm('pr')}>
          <div className="space-y-4">
            <div><label className={cls.label}>Exercise</label><input value={prf.exercise} onChange={e => setPrf({ ...prf, exercise: e.target.value })} placeholder="Bench Press" className={cls.input} autoFocus /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={cls.label}>Weight (lbs)</label><input type="number" value={prf.weight} onChange={e => setPrf({ ...prf, weight: e.target.value })} placeholder="225" className={cls.input} /></div>
              <div><label className={cls.label}>Reps</label><input type="number" value={prf.reps} onChange={e => setPrf({ ...prf, reps: e.target.value })} placeholder="5" className={cls.input} /></div>
              <div><label className={cls.label}>Date</label><input type="date" value={prf.date} onChange={e => setPrf({ ...prf, date: e.target.value })} className={cls.input} /></div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={addPR} className={cls.primary} style={{ background: '#c9a84c' }}>Save PR</button>
              <button onClick={() => cm('pr')} className={cls.secondary}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {modals.lift && (
        <Modal title="Log Lift Session" onClose={() => cm('lift')}>
          <div className="space-y-4">
            <div>
              <label className={cls.label}>Lift</label>
              <select
                value={['Squat', 'Bench Press', 'Deadlift', 'Overhead Press', ...Object.keys(body.prs || {}).filter(k => !['Squat', 'Bench Press', 'Deadlift', 'Overhead Press'].includes(k))].includes(lf.lift) ? lf.lift : (lf.lift ? '__custom__' : '')}
                onChange={e => {
                  if (e.target.value === '__custom__') setLf(f => ({ ...f, lift: '' }))
                  else setLf(f => ({ ...f, lift: e.target.value }))
                }}
                className={cls.input}
              >
                <option value="">Select a lift…</option>
                {['Squat', 'Bench Press', 'Deadlift', 'Overhead Press', ...Object.keys(body.prs || {}).filter(k => !['Squat', 'Bench Press', 'Deadlift', 'Overhead Press'].includes(k))].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
                <option value="__custom__">Custom…</option>
              </select>
              {(lf.lift === '' || !['Squat', 'Bench Press', 'Deadlift', 'Overhead Press', ...Object.keys(body.prs || {})].includes(lf.lift)) && (
                <input
                  value={lf.lift}
                  onChange={e => setLf(f => ({ ...f, lift: e.target.value }))}
                  placeholder="Enter lift name"
                  className={cls.input}
                  style={{ marginTop: 8 }}
                  autoFocus
                />
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={cls.label}>Weight (lbs)</label><input type="number" value={lf.weight} onChange={e => setLf(f => ({ ...f, weight: e.target.value }))} placeholder="225" className={cls.input} /></div>
              <div><label className={cls.label}>Reps</label><input type="number" value={lf.reps} onChange={e => setLf(f => ({ ...f, reps: e.target.value }))} placeholder="5" className={cls.input} /></div>
              <div><label className={cls.label}>Date</label><input type="date" value={lf.date} onChange={e => setLf(f => ({ ...f, date: e.target.value }))} className={cls.input} /></div>
            </div>
            <div>
              <label className={cls.label}>Feel (1–5)</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setLf(f => ({ ...f, feel: n }))}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${lf.feel === n ? '#c9a84c' : '#1a2440'}`,
                      background: lf.feel === n ? 'rgba(201,168,76,0.15)' : '#000000',
                      color: lf.feel === n ? '#c9a84c' : '#a0aec0',
                      fontFamily: 'Inter', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0aec0' }}>TERRIBLE</span>
                <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0aec0' }}>INCREDIBLE</span>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={logLiftSession} className={cls.primary} style={{ background: '#c9a84c' }}>Save Session</button>
              <button onClick={() => cm('lift')} className={cls.secondary}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {modals.photomeal && (
        <Modal title="Scan Meal Photo" onClose={() => { cm('photomeal'); setPhotoFile(null); setPhotoPreview(null); setPhotoEstimate(null) }}>
          <div className="space-y-4">
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontFamily: 'Inter', fontSize: 11, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Upload meal photo</label>
              <input type="file" accept="image/*" onChange={handlePhotoSelect} style={{ width: '100%', fontFamily: 'Inter', fontSize: 12, color: '#d1d5db' }} />
            </div>
            {photoPreview && (
              <img src={photoPreview} alt="meal" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, border: '1px solid #1a2440' }} />
            )}
            {photoFile && !photoEstimate && (
              <button onClick={handlePhotoAnalyze} disabled={photoAnalyzing}
                style={{ width: '100%', padding: '10px', background: photoAnalyzing ? '#1a2440' : '#c9a84c', color: photoAnalyzing ? '#a0aec0' : '#000', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', border: 'none', borderRadius: 8, cursor: photoAnalyzing ? 'not-allowed' : 'pointer' }}>
                {photoAnalyzing ? 'Analyzing...' : '🔍 Analyze with AI'}
              </button>
            )}
            {photoError && <p style={{ fontFamily: 'Inter', fontSize: 11, color: '#ef4444' }}>{photoError}</p>}
            {photoEstimate && (
              <>
                <div style={{ background: '#000000', border: '1px solid #1a2440', borderRadius: 8, padding: 14 }}>
                  <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#a0aec0', marginBottom: 6 }}>AI DETECTED: {photoEstimate.description}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>Calories</label>
                      <input type="number" value={photoConfirm.calories} onChange={e => setPhotoConfirm(p => ({ ...p, calories: e.target.value }))}
                        style={{ width: '100%', background: '#0d1427', border: '1px solid #1a2440', borderRadius: 6, padding: '8px 12px', fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: '#c9a84c', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>Protein (g)</label>
                      <input type="number" value={photoConfirm.protein} onChange={e => setPhotoConfirm(p => ({ ...p, protein: e.target.value }))}
                        style={{ width: '100%', background: '#0d1427', border: '1px solid #1a2440', borderRadius: 6, padding: '8px 12px', fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: '#c9a84c', outline: 'none' }} />
                    </div>
                  </div>
                </div>
                <button onClick={handlePhotoLog} style={{ width: '100%', padding: '10px', background: '#22c55e', color: '#000', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                  ✓ Log This Meal
                </button>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

async function analyzePhoto(imageFile) {
  const apiKey = localStorage.getItem('anthropic_key') || import.meta.env.VITE_ANTHROPIC_API_KEY || ''
  if (!apiKey) throw new Error('No API key — set it in Growth Feed → API Key')
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async e => {
      const base64 = e.target.result.split(',')[1]
      const mediaType = imageFile.type || 'image/jpeg'
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 200,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
                { type: 'text', text: 'Analyze this meal photo. Estimate the total calories and protein in grams for what you see. Be realistic — don\'t overestimate. Return ONLY valid JSON with no other text: {"calories": 450, "protein": 35, "description": "brief description of what you see"}' }
              ]
            }]
          })
        })
        const data = await res.json()
        const text = data.content[0].text.trim()
        const parsed = JSON.parse(text.startsWith('{') ? text : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
        resolve(parsed)
      } catch(err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsDataURL(imageFile)
  })
}
