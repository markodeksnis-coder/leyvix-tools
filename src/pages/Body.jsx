import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { pct, fmtShort } from '../utils'

const CHART_TT = { contentStyle: { background: '#141414', border: '1px solid #2a2a2a', borderRadius: 0, fontSize: 11, fontFamily: 'monospace' }, labelStyle: { color: '#444' }, itemStyle: { color: '#fff' } }

const cls = {
  input: "w-full bg-[#080808] border border-[#2a2a2a] px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#dc2626] font-mono transition-colors",
  label: "block text-[9px] font-mono uppercase tracking-widest text-[#444] mb-1.5",
  primary: "flex-1 py-2.5 bg-[#dc2626] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 transition-colors",
  secondary: "px-4 py-2.5 border border-[#2a2a2a] text-[#444] text-[10px] uppercase tracking-widest hover:border-[#666] hover:text-white transition-colors",
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

  const weightChart = (body.weightHistory || []).slice(-30).map(w => ({ date: w.date.slice(5), weight: w.weight }))
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

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-5 border-b border-[#2a2a2a] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-tight">Body</h1>
          <p className="text-[10px] font-mono text-[#444] mt-0.5 uppercase tracking-widest">Physical optimization system</p>
        </div>
        <div className="flex gap-2">
          {tab === 'fitness' ? (
            <>
              <button onClick={() => om('stats')} className="px-3 py-1.5 border border-[#2a2a2a] text-[#444] text-[9px] uppercase tracking-widest hover:border-[#dc2626] hover:text-white transition-colors">Update Stats</button>
              <button onClick={() => om('pr')} className="px-3 py-1.5 border border-[#2a2a2a] text-[#444] text-[9px] uppercase tracking-widest hover:border-[#dc2626] hover:text-white transition-colors">Log PR</button>
              <button onClick={() => om('workout')} className="flex items-center gap-1.5 px-4 py-2 bg-[#dc2626] text-white text-[9px] font-bold uppercase tracking-widest hover:bg-red-500 transition-colors">
                <Plus size={10} strokeWidth={2.5} /> Log Workout
              </button>
            </>
          ) : (
            <button onClick={() => om('meal')} className="flex items-center gap-1.5 px-4 py-2 bg-[#dc2626] text-white text-[9px] font-bold uppercase tracking-widest hover:bg-red-500 transition-colors">
              <Plus size={10} strokeWidth={2.5} /> Log Meal
            </button>
          )}
        </div>
      </div>

      <div className="px-8 py-3 border-b border-[#2a2a2a] flex gap-1 shrink-0">
        {['fitness', 'diet'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-[9px] font-mono uppercase tracking-widest transition-all ${tab === t ? 'bg-[#dc2626] text-white font-bold' : 'text-[#444] border border-transparent hover:border-[#2a2a2a] hover:text-white'}`}>{t}</button>
        ))}
      </div>

      <div className="flex-1 overflow-auto px-8 py-6">
        {tab === 'fitness' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Weight" value={body.currentWeight ? `${body.currentWeight}` : '—'} unit={body.currentWeight ? 'lbs' : ''} />
              <StatCard label="Body Fat" value={body.bodyFat ? `${body.bodyFat}` : '—'} unit={body.bodyFat ? '%' : ''} />
              <StatCard label="Goal BF%" value={body.goalBodyFat || '10'} unit="%" />
              <StatCard label="Days to Goal" value={projDays ? `${projDays}` : '—'} unit={projDays ? 'days' : ''} sub={projDate || ''} />
            </div>

            {weightChart.length > 1 && (
              <div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-[#444] mb-3">Weight Trend (Last 30 Days)</div>
                <div className="bg-[#0f0f0f] border border-[#2a2a2a] p-4">
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={weightChart}>
                      <XAxis dataKey="date" tick={{ fill: '#333', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                      <YAxis domain={['auto', 'auto']} tick={{ fill: '#333', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={30} />
                      <Tooltip {...CHART_TT} formatter={v => [`${v} lbs`, '']} />
                      <Line type="monotone" dataKey="weight" stroke="#dc2626" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-[#444] mb-3">Last 10 Workouts</div>
              {(!body.workouts || body.workouts.length === 0) ? (
                <div className="bg-[#0f0f0f] border border-[#2a2a2a] p-6 text-center text-[#333] text-xs font-mono">No workouts logged yet</div>
              ) : (
                <div className="space-y-1">
                  {(body.workouts || []).slice(0, 10).map(w => (
                    <div key={w.id} className="bg-[#0f0f0f] border border-[#2a2a2a] p-3 hover:border-[#dc2626]/30 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold">{w.name}</span>
                        <span className="text-[9px] font-mono text-[#333]">{fmtShort(w.date)}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(w.exercises || []).map((ex, i) => (
                          <span key={i} className="text-[9px] font-mono text-[#555] border border-[#1a1a1a] px-1.5 py-0.5">
                            {ex.name} {ex.sets}×{ex.reps}{ex.weight ? ` @ ${ex.weight}lbs` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {body.prs && Object.keys(body.prs).length > 0 && (
              <div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-[#444] mb-3">Personal Records</div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
                  {Object.entries(body.prs).map(([ex, pr]) => (
                    <div key={ex} className="bg-[#0f0f0f] border border-[#2a2a2a] p-3 hover:border-[#dc2626]/30 transition-colors">
                      <div className="text-[9px] font-mono text-[#444] uppercase tracking-widest mb-1">{ex}</div>
                      <div className="text-xl font-mono font-black text-[#dc2626]">{pr.weight}<span className="text-xs text-[#444]">lbs</span></div>
                      <div className="text-[9px] font-mono text-[#333]">{pr.reps} rep{pr.reps > 1 ? 's' : ''} · {fmtShort(pr.date)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
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
                  <div key={m.label} className="bg-[#0f0f0f] border border-[#2a2a2a] p-4">
                    <div className="text-[9px] font-mono uppercase tracking-widest text-[#444] mb-2">{m.label}</div>
                    <div className="font-mono mb-2">
                      <span className="text-2xl font-bold text-white">{m.current || 0}</span>
                      <span className="text-xs text-[#444] ml-1">/ {m.target} {m.unit}</span>
                    </div>
                    <div className="h-0.5 bg-[#1a1a1a]">
                      <div className={`h-0.5 transition-all ${over ? 'bg-[#dc2626]' : 'bg-[#16a34a]'}`} style={{ width: `${Math.min(100, p)}%` }} />
                    </div>
                    <div className={`text-[9px] font-mono mt-1 ${over ? 'text-[#dc2626]' : 'text-[#333]'}`}>{p}%</div>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-[#444]">7-Day Calories</span>
                  <span className="text-[9px] font-mono text-[#333]">30d avg: {avg30} kcal</span>
                </div>
                <div className="bg-[#0f0f0f] border border-[#2a2a2a] p-4">
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={last7Cal}>
                      <XAxis dataKey="date" tick={{ fill: '#333', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#333', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={32} />
                      <Tooltip {...CHART_TT} formatter={v => [`${v} kcal`, '']} />
                      <Bar dataKey="calories" fill="#dc2626" opacity={0.7} radius={0} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-[#444] mb-3">Supplements Today</div>
                <div className="space-y-1">
                  {(diet.supplements || []).map(s => {
                    const done = (s.logs || []).includes(today)
                    return (
                      <button key={s.id} onClick={() => toggleSupp(s.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 border transition-colors ${done ? 'border-[#16a34a]/30 bg-[#16a34a]/10' : 'border-[#2a2a2a] bg-[#0f0f0f] hover:border-[#444]'}`}
                      >
                        <div className={`w-4 h-4 border flex items-center justify-center shrink-0 ${done ? 'bg-[#16a34a] border-[#16a34a]' : 'border-[#333]'}`}>
                          {done && <Check size={10} strokeWidth={3} className="text-white" />}
                        </div>
                        <span className={`text-xs font-mono ${done ? 'text-[#16a34a]' : 'text-[#555]'}`}>{s.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
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
                    <input value={ex.name} onChange={e => setWf(w => ({ ...w, exercises: w.exercises.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))} placeholder="Exercise" className={cls.input + " col-span-1"} />
                    <input value={ex.sets} onChange={e => setWf(w => ({ ...w, exercises: w.exercises.map((x, j) => j === i ? { ...x, sets: e.target.value } : x) }))} placeholder="Sets" className={cls.input} />
                    <input value={ex.reps} onChange={e => setWf(w => ({ ...w, exercises: w.exercises.map((x, j) => j === i ? { ...x, reps: e.target.value } : x) }))} placeholder="Reps" className={cls.input} />
                    <input value={ex.weight} onChange={e => setWf(w => ({ ...w, exercises: w.exercises.map((x, j) => j === i ? { ...x, weight: e.target.value } : x) }))} placeholder="lbs" className={cls.input} />
                  </div>
                ))}
                <button onClick={() => setWf(w => ({ ...w, exercises: [...w.exercises, { name: '', sets: '', reps: '', weight: '' }] }))} className="text-[9px] font-mono text-[#444] uppercase tracking-widest hover:text-[#888] transition-colors">+ Add Exercise</button>
              </div>
            </div>
            <div className="flex gap-2 pt-1"><button onClick={logWorkout} className={cls.primary}>Save</button><button onClick={() => cm('workout')} className={cls.secondary}>Cancel</button></div>
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
            <div className="flex gap-2 pt-1"><button onClick={updateStats} className={cls.primary}>Update</button><button onClick={() => cm('stats')} className={cls.secondary}>Cancel</button></div>
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
            <p className="text-[9px] font-mono text-[#333]">Adds to existing totals for that day.</p>
            <div className="flex gap-2 pt-1"><button onClick={logMeal} className={cls.primary}>Save</button><button onClick={() => cm('meal')} className={cls.secondary}>Cancel</button></div>
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
            <div className="flex gap-2 pt-1"><button onClick={addPR} className={cls.primary}>Save PR</button><button onClick={() => cm('pr')} className={cls.secondary}>Cancel</button></div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function StatCard({ label, value, unit, sub }) {
  return (
    <div className="bg-[#0f0f0f] border border-[#2a2a2a] p-4">
      <div className="text-[9px] font-mono uppercase tracking-widest text-[#444] mb-2">{label}</div>
      <div className="font-mono">
        <span className="text-3xl font-black text-white">{value}</span>
        {unit && <span className="text-sm text-[#444] ml-1">{unit}</span>}
      </div>
      {sub && <div className="text-[9px] font-mono text-[#dc2626] mt-1">{sub}</div>}
    </div>
  )
}
