import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { pct, fmtShort } from '../utils'

const CARD = { background: '#111018', border: '1px solid #1e1b2e', borderRadius: 12, padding: 20 }
const CHART_TT = {
  contentStyle: { background: '#111018', border: '1px solid #1e1b2e', borderRadius: 8, fontSize: 11, fontFamily: 'Inter' },
  labelStyle: { color: '#6b7280' },
  itemStyle: { color: '#fff' },
}

const cls = {
  input: "w-full bg-[#0a0a0f] border border-[#1e1b2e] px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#7c3aed] transition-colors rounded-lg",
  label: "block text-[9px] font-mono uppercase tracking-widest text-[#555] mb-1.5",
  primary: "flex-1 py-2.5 text-white text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity rounded-lg",
  secondary: "px-4 py-2.5 border border-[#1e1b2e] text-[#555] text-[10px] uppercase tracking-widest hover:border-[#444] hover:text-white transition-colors rounded-lg",
}

export default function Body() {
  const [tab, setTab] = useState('fitness')
  const [body, setBody] = useLocalStorage('marko_body', {})
  const [diet, setDiet] = useLocalStorage('marko_diet', { targets: { calories: 2800, protein: 220, carbs: 280, fats: 80 }, history: [], supplements: [] })

  const [modals, setModals] = useState({})
  const om = k => setModals(m => ({ ...m, [k]: true }))
  const cm = k => setModals(m => ({ ...m, [k]: false }))

  const today = new Date().toISOString().split('T')[0]
  const [wf, setWf] = useState({ date: today, name: '', exercises: [{ name: '', sets: '', reps: '', weight: '' }] })
  const [sf, setSf] = useState({ weight: '', bodyFat: String(body.bodyFat || ''), goalBodyFat: String(body.goalBodyFat || '') })
  const [mf, setMf] = useState({ date: today, calories: '', protein: '', carbs: '', fats: '' })
  const [prf, setPrf] = useState({ exercise: '', weight: '', reps: '', date: today })

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

  const bf = parseFloat(body.bodyFat || 0)
  const goalBf = parseFloat(body.goalBodyFat || 10)
  const bfDiff = bf - goalBf
  const projDays = bfDiff > 0 ? Math.round(bfDiff / 0.5 * 7) : null
  const projDate = projDays ? new Date(Date.now() + projDays * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null

  const LABEL = { fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }

  return (
    <div className="h-full flex flex-col" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <div className="px-6 py-4 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid #1e1b2e' }}>
        <div>
          <h1 style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: 700, color: 'white', letterSpacing: '0.06em' }}>BODY</h1>
          <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#6b7280', marginTop: 2 }}>Physical optimization system</p>
        </div>
        <div className="flex gap-2">
          {tab === 'fitness' ? (
            <>
              <button onClick={() => om('stats')} style={{ background: 'transparent', color: '#6b7280', border: '1px solid #1e1b2e', borderRadius: 8, padding: '6px 12px', fontFamily: 'Inter', fontSize: 11, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#7c3aed'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1b2e'}
              >Update Stats</button>
              <button onClick={() => om('pr')} style={{ background: 'transparent', color: '#6b7280', border: '1px solid #1e1b2e', borderRadius: 8, padding: '6px 12px', fontFamily: 'Inter', fontSize: 11, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#7c3aed'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1b2e'}
              >Log PR</button>
              <button onClick={() => om('workout')} style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={12} strokeWidth={2.5} /> Log Workout
              </button>
            </>
          ) : (
            <button onClick={() => om('meal')} style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={12} strokeWidth={2.5} /> Log Meal
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-3 flex gap-1 shrink-0" style={{ borderBottom: '1px solid #1e1b2e' }}>
        {['fitness', 'diet'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '5px 14px', borderRadius: 8, fontFamily: 'Inter', fontSize: 12, fontWeight: tab === t ? 600 : 400,
              background: tab === t ? '#7c3aed' : 'transparent',
              color: tab === t ? 'white' : '#6b7280',
              border: 'none', cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s',
            }}
          >{t}</button>
        ))}
      </div>

      <div className="flex-1 overflow-auto px-6 py-5" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {tab === 'fitness' ? (
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
                  <div style={LABEL}>{s.label}</div>
                  <div style={{ fontFamily: 'Inter', display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: 'white', lineHeight: 1 }}>{s.value}</span>
                    {s.unit && <span style={{ fontSize: 12, color: '#6b7280' }}>{s.unit}</span>}
                  </div>
                  {s.sub && <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#8b5cf6', marginTop: 4 }}>{s.sub}</div>}
                </div>
              ))}
            </div>

            {/* Weight chart */}
            {weightChart.length > 1 && (
              <div style={CARD}>
                <div style={LABEL}>Weight Trend (Last 90 Days)</div>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={weightChart}>
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} interval={Math.floor(weightChart.length / 6)} />
                    <YAxis domain={['auto', 'auto']} tick={{ fill: '#6b7280', fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip {...CHART_TT} formatter={v => [`${v} lbs`, '']} />
                    <Line type="monotone" dataKey="weight" stroke="#7c3aed" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Personal Records Table */}
            {body.prs && Object.keys(body.prs).length > 0 && (
              <div style={CARD}>
                <div style={LABEL}>Personal Records</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e1b2e' }}>
                      {['EXERCISE', 'WEIGHT', 'REPS', 'DATE'].map(h => (
                        <th key={h} style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left', padding: '0 12px 10px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(body.prs).map(([ex, pr]) => (
                      <tr key={ex} style={{ borderBottom: '1px solid #1e1b2e' }}>
                        <td style={{ padding: '10px 12px', fontFamily: 'Inter', fontSize: 13, color: 'white', fontWeight: 600 }}>{ex}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'Inter', fontSize: 18, fontWeight: 800, color: '#8b5cf6' }}>
                          {pr.weight}<span style={{ fontSize: 11, color: '#6b7280', marginLeft: 2 }}>lbs</span>
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'Inter', fontSize: 13, color: '#d1d5db' }}>{pr.reps} rep{pr.reps > 1 ? 's' : ''}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'Inter', fontSize: 11, color: '#6b7280' }}>{fmtShort(pr.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Workouts */}
            <div style={CARD}>
              <div style={LABEL}>Recent Workouts</div>
              {(!body.workouts || body.workouts.length === 0) ? (
                <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#333', textAlign: 'center', padding: '24px 0' }}>No workouts logged yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(body.workouts || []).slice(0, 8).map(w => (
                    <div key={w.id} style={{ background: '#0a0a0f', border: '1px solid #1e1b2e', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: 'white' }}>{w.name}</span>
                        <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#6b7280' }}>{fmtShort(w.date)}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(w.exercises || []).map((ex, i) => (
                          <span key={i} style={{ fontFamily: 'Inter', fontSize: 11, color: '#8b5cf6', border: '1px solid #1e1b2e', borderRadius: 4, padding: '2px 8px' }}>
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
        ) : (
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
                    <div style={LABEL}>{m.label}</div>
                    <div style={{ fontFamily: 'Inter', marginBottom: 10 }}>
                      <span style={{ fontSize: 24, fontWeight: 800, color: 'white' }}>{m.current || 0}</span>
                      <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 4 }}>/ {m.target} {m.unit}</span>
                    </div>
                    <div style={{ height: 4, background: '#1e1b2e', borderRadius: 2 }}>
                      <div style={{ height: 4, background: over ? '#ef4444' : '#7c3aed', borderRadius: 2, width: `${Math.min(100, p)}%`, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontFamily: 'Inter', fontSize: 10, color: over ? '#ef4444' : '#6b7280', marginTop: 4 }}>{p}%</div>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Calorie chart */}
              <div style={CARD}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>7-Day Calories</span>
                  <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#6b7280' }}>30d avg: <span style={{ color: '#8b5cf6' }}>{avg30}</span> kcal</span>
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={last7Cal}>
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 9, fontFamily: 'Inter' }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip {...CHART_TT} formatter={v => [`${v} kcal`, '']} />
                    <Bar dataKey="calories" fill="#7c3aed" opacity={0.8} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Supplements */}
              <div style={CARD}>
                <div style={LABEL}>Supplements Today</div>
                {(diet.supplements || []).length === 0 ? (
                  <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#333', textAlign: 'center', padding: '24px 0' }}>No supplements added</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(diet.supplements || []).map(s => {
                      const done = (s.logs || []).includes(today)
                      return (
                        <button key={s.id} onClick={() => toggleSupp(s.id)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                            background: done ? 'rgba(34,197,94,0.08)' : '#0a0a0f',
                            border: `1px solid ${done ? 'rgba(34,197,94,0.3)' : '#1e1b2e'}`,
                            borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ width: 18, height: 18, borderRadius: 4, background: done ? '#22c55e' : 'transparent', border: `1px solid ${done ? '#22c55e' : '#444'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {done && <Check size={11} strokeWidth={3} color="white" />}
                          </div>
                          <span style={{ fontFamily: 'Inter', fontSize: 13, color: done ? '#22c55e' : '#6b7280' }}>{s.name}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
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
                <button onClick={() => setWf(w => ({ ...w, exercises: [...w.exercises, { name: '', sets: '', reps: '', weight: '' }] }))} style={{ fontFamily: 'Inter', fontSize: 11, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add Exercise</button>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={logWorkout} className={cls.primary} style={{ background: '#7c3aed' }}>Save</button>
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
              <button onClick={updateStats} className={cls.primary} style={{ background: '#7c3aed' }}>Update</button>
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
            <p style={{ fontFamily: 'Inter', fontSize: 11, color: '#444' }}>Adds to existing totals for that day.</p>
            <div className="flex gap-2 pt-1">
              <button onClick={logMeal} className={cls.primary} style={{ background: '#7c3aed' }}>Save</button>
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
              <button onClick={addPR} className={cls.primary} style={{ background: '#7c3aed' }}>Save PR</button>
              <button onClick={() => cm('pr')} className={cls.secondary}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
