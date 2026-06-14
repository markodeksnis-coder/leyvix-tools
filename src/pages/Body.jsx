import { useState } from 'react'
import { Plus, Scale, Percent, Dumbbell, Pencil } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'

const WORKOUT_TYPES = ['Push', 'Pull', 'Legs', 'Upper', 'Full Body', 'Cardio', 'Other']

const cls = {
  input: "w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm text-neutral-100 placeholder-neutral-700 focus:outline-none focus:border-neutral-500 transition-colors font-mono",
  label: "block text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-1.5",
  btnPrimary: "flex-1 py-2.5 bg-white text-black text-[10px] font-semibold uppercase tracking-widest hover:bg-neutral-200 transition-colors",
  btnSecondary: "px-4 py-2.5 border border-[#2a2a2a] text-neutral-600 text-[10px] uppercase tracking-widest hover:border-neutral-600 hover:text-neutral-300 transition-colors",
}

const CHART_TOOLTIP = {
  contentStyle: { background: '#151515', border: '1px solid #2a2a2a', borderRadius: 0, fontSize: 11, fontFamily: 'monospace' },
  labelStyle: { color: '#666' },
  itemStyle: { color: '#e8e8e8' },
}

export default function Body() {
  const [tab, setTab] = useState('fitness')
  const [bodyStats, setBodyStats] = useLocalStorage('body_stats', { weight: '', bodyFat: '' })
  const [workouts, setWorkouts] = useLocalStorage('body_workouts', [])
  const [weightHistory, setWeightHistory] = useLocalStorage('body_weight_history', [])
  const [diet, setDiet] = useLocalStorage('body_diet', { targets: { calories: 2500, protein: 200 }, history: [] })

  const [modals, setModals] = useState({ workout: false, weight: false, meal: false, stats: false, targets: false })
  const open = (key) => setModals(m => ({ ...m, [key]: true }))
  const close = (key) => setModals(m => ({ ...m, [key]: false }))

  const [workoutForm, setWorkoutForm] = useState({ name: '', type: 'Push', notes: '' })
  const [weightForm, setWeightForm] = useState({ weight: '', date: today() })
  const [mealForm, setMealForm] = useState({ calories: '', protein: '', date: today() })
  const [statsForm, setStatsForm] = useState({ weight: '', bodyFat: '' })
  const [targetsForm, setTargetsForm] = useState({ calories: 2500, protein: 200 })

  const addWorkout = () => {
    if (!workoutForm.name.trim()) return
    setWorkouts([{ ...workoutForm, id: Date.now(), date: new Date().toISOString() }, ...workouts])
    setWorkoutForm({ name: '', type: 'Push', notes: '' })
    close('workout')
  }

  const logWeight = () => {
    if (!weightForm.weight) return
    const entry = { weight: parseFloat(weightForm.weight), date: weightForm.date, id: Date.now() }
    const merged = [...weightHistory.filter(w => w.date !== weightForm.date), entry]
    merged.sort((a, b) => a.date.localeCompare(b.date))
    setWeightHistory(merged)
    setBodyStats({ ...bodyStats, weight: weightForm.weight })
    setWeightForm({ weight: '', date: today() })
    close('weight')
  }

  const logMeal = () => {
    if (!mealForm.calories) return
    const idx = diet.history.findIndex(h => h.date === mealForm.date)
    let newHistory = [...diet.history]
    if (idx >= 0) {
      newHistory[idx] = {
        ...newHistory[idx],
        calories: (newHistory[idx].calories || 0) + parseFloat(mealForm.calories),
        protein: (newHistory[idx].protein || 0) + parseFloat(mealForm.protein || 0),
      }
    } else {
      newHistory.push({ date: mealForm.date, calories: parseFloat(mealForm.calories), protein: parseFloat(mealForm.protein || 0), id: Date.now() })
    }
    newHistory.sort((a, b) => a.date.localeCompare(b.date))
    setDiet({ ...diet, history: newHistory })
    setMealForm({ calories: '', protein: '', date: today() })
    close('meal')
  }

  const updateStats = () => {
    setBodyStats({ weight: statsForm.weight || bodyStats.weight, bodyFat: statsForm.bodyFat || bodyStats.bodyFat })
    close('stats')
  }

  const updateTargets = () => {
    setDiet({ ...diet, targets: { calories: parseFloat(targetsForm.calories) || 2500, protein: parseFloat(targetsForm.protein) || 200 } })
    close('targets')
  }

  const todayDiet = diet.history.find(h => h.date === today()) || { calories: 0, protein: 0 }
  const last7 = getLast7Days(diet.history)
  const chartWeight = weightHistory.slice(-30).map(w => ({ date: w.date.slice(5), weight: w.weight }))

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-6 border-b border-[#1f1f1f] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Body</h1>
          <p className="text-[10px] font-mono text-neutral-600 mt-0.5 uppercase tracking-widest">Physical optimization</p>
        </div>
        <div className="flex gap-2">
          {tab === 'fitness' && (
            <>
              <button
                onClick={() => { setWeightForm({ weight: '', date: today() }); open('weight') }}
                className="px-3 py-1.5 border border-[#2a2a2a] text-neutral-600 text-[10px] uppercase tracking-widest hover:border-neutral-600 hover:text-neutral-300 transition-colors"
              >
                Log Weight
              </button>
              <button
                onClick={() => { setWorkoutForm({ name: '', type: 'Push', notes: '' }); open('workout') }}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] font-semibold uppercase tracking-widest hover:bg-neutral-200 transition-colors"
              >
                <Plus size={11} strokeWidth={2.5} /> Log Workout
              </button>
            </>
          )}
          {tab === 'diet' && (
            <button
              onClick={() => { setMealForm({ calories: '', protein: '', date: today() }); open('meal') }}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] font-semibold uppercase tracking-widest hover:bg-neutral-200 transition-colors"
            >
              <Plus size={11} strokeWidth={2.5} /> Log Meal
            </button>
          )}
        </div>
      </div>

      <div className="px-8 py-3 border-b border-[#1f1f1f] flex gap-1 shrink-0">
        {['fitness', 'diet'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest transition-all ${
              tab === t ? 'bg-white text-black font-semibold' : 'text-neutral-600 hover:text-neutral-300 border border-transparent hover:border-[#2a2a2a]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto px-8 py-6">
        {tab === 'fitness' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Current Weight"
                value={bodyStats.weight || '—'}
                unit={bodyStats.weight ? 'lbs' : ''}
                icon={<Scale size={13} strokeWidth={1.5} />}
                onClick={() => { setStatsForm({ weight: bodyStats.weight, bodyFat: bodyStats.bodyFat }); open('stats') }}
              />
              <StatCard
                label="Body Fat"
                value={bodyStats.bodyFat || '—'}
                unit={bodyStats.bodyFat ? '%' : ''}
                icon={<Percent size={13} strokeWidth={1.5} />}
                onClick={() => { setStatsForm({ weight: bodyStats.weight, bodyFat: bodyStats.bodyFat }); open('stats') }}
              />
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-3">Recent Workouts</div>
              {workouts.length === 0 ? (
                <div className="bg-[#111] border border-[#1f1f1f] p-8 text-center text-neutral-700 text-xs font-mono">
                  No workouts logged yet
                </div>
              ) : (
                <div className="space-y-1">
                  {workouts.slice(0, 5).map(w => (
                    <div key={w.id} className="bg-[#111] border border-[#1f1f1f] px-4 py-3 flex items-center justify-between hover:border-[#282828] transition-colors">
                      <div className="flex items-center gap-3">
                        <Dumbbell size={13} className="text-neutral-700" strokeWidth={1.5} />
                        <span className="text-sm font-medium">{w.name}</span>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-700 border border-[#222] px-1.5 py-0.5">{w.type}</span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-700">{fmtDate(w.date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {chartWeight.length > 1 && (
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-3">Weight Trend</div>
                <div className="bg-[#111] border border-[#1f1f1f] p-4">
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={chartWeight}>
                      <XAxis dataKey="date" tick={{ fill: '#444', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                      <YAxis domain={['auto', 'auto']} tick={{ fill: '#444', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={32} />
                      <Tooltip {...CHART_TOOLTIP} formatter={v => [`${v} lbs`, '']} />
                      <Line type="monotone" dataKey="weight" stroke="#ffffff" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <MacroCard
                label="Calories Today"
                current={todayDiet.calories}
                target={diet.targets.calories}
                unit="kcal"
                onEdit={() => { setTargetsForm({ calories: diet.targets.calories, protein: diet.targets.protein }); open('targets') }}
              />
              <MacroCard
                label="Protein Today"
                current={todayDiet.protein}
                target={diet.targets.protein}
                unit="g"
                onEdit={() => { setTargetsForm({ calories: diet.targets.calories, protein: diet.targets.protein }); open('targets') }}
              />
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-3">7-Day Calories</div>
              <div className="bg-[#111] border border-[#1f1f1f] p-4">
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={last7}>
                    <XAxis dataKey="date" tick={{ fill: '#444', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#444', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip {...CHART_TOOLTIP} formatter={v => [`${v} kcal`, '']} />
                    <Bar dataKey="calories" fill="#2a2a2a" radius={0} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {modals.workout && (
        <Modal title="Log Workout" onClose={() => close('workout')}>
          <div className="space-y-4">
            <div>
              <label className={cls.label}>Workout Name</label>
              <input value={workoutForm.name} onChange={e => setWorkoutForm({ ...workoutForm, name: e.target.value })} placeholder="Push Day A" className={cls.input} autoFocus />
            </div>
            <div>
              <label className={cls.label}>Type</label>
              <select value={workoutForm.type} onChange={e => setWorkoutForm({ ...workoutForm, type: e.target.value })} className={cls.input}>
                {WORKOUT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={cls.label}>Notes</label>
              <textarea value={workoutForm.notes} onChange={e => setWorkoutForm({ ...workoutForm, notes: e.target.value })} placeholder="PRs, volume, how it felt..." rows={3} className={cls.input + " resize-none"} />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={addWorkout} className={cls.btnPrimary}>Save</button>
              <button onClick={() => close('workout')} className={cls.btnSecondary}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {modals.weight && (
        <Modal title="Log Weight" onClose={() => close('weight')}>
          <div className="space-y-4">
            <div>
              <label className={cls.label}>Weight (lbs)</label>
              <input type="number" value={weightForm.weight} onChange={e => setWeightForm({ ...weightForm, weight: e.target.value })} placeholder="185" className={cls.input} autoFocus />
            </div>
            <div>
              <label className={cls.label}>Date</label>
              <input type="date" value={weightForm.date} onChange={e => setWeightForm({ ...weightForm, date: e.target.value })} className={cls.input} />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={logWeight} className={cls.btnPrimary}>Save</button>
              <button onClick={() => close('weight')} className={cls.btnSecondary}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {modals.meal && (
        <Modal title="Log Meal" onClose={() => close('meal')}>
          <div className="space-y-4">
            <div>
              <label className={cls.label}>Calories</label>
              <input type="number" value={mealForm.calories} onChange={e => setMealForm({ ...mealForm, calories: e.target.value })} placeholder="500" className={cls.input} autoFocus />
            </div>
            <div>
              <label className={cls.label}>Protein (g)</label>
              <input type="number" value={mealForm.protein} onChange={e => setMealForm({ ...mealForm, protein: e.target.value })} placeholder="40" className={cls.input} />
            </div>
            <div>
              <label className={cls.label}>Date</label>
              <input type="date" value={mealForm.date} onChange={e => setMealForm({ ...mealForm, date: e.target.value })} className={cls.input} />
            </div>
            <p className="text-[10px] font-mono text-neutral-700">Logging adds to existing totals for the day.</p>
            <div className="flex gap-2 pt-1">
              <button onClick={logMeal} className={cls.btnPrimary}>Save</button>
              <button onClick={() => close('meal')} className={cls.btnSecondary}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {modals.stats && (
        <Modal title="Update Body Stats" onClose={() => close('stats')}>
          <div className="space-y-4">
            <div>
              <label className={cls.label}>Weight (lbs)</label>
              <input type="number" value={statsForm.weight} onChange={e => setStatsForm({ ...statsForm, weight: e.target.value })} placeholder={bodyStats.weight || '185'} className={cls.input} autoFocus />
            </div>
            <div>
              <label className={cls.label}>Body Fat %</label>
              <input type="number" value={statsForm.bodyFat} onChange={e => setStatsForm({ ...statsForm, bodyFat: e.target.value })} placeholder={bodyStats.bodyFat || '15'} className={cls.input} />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={updateStats} className={cls.btnPrimary}>Update</button>
              <button onClick={() => close('stats')} className={cls.btnSecondary}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {modals.targets && (
        <Modal title="Update Targets" onClose={() => close('targets')}>
          <div className="space-y-4">
            <div>
              <label className={cls.label}>Daily Calories Target</label>
              <input type="number" value={targetsForm.calories} onChange={e => setTargetsForm({ ...targetsForm, calories: e.target.value })} className={cls.input} autoFocus />
            </div>
            <div>
              <label className={cls.label}>Daily Protein Target (g)</label>
              <input type="number" value={targetsForm.protein} onChange={e => setTargetsForm({ ...targetsForm, protein: e.target.value })} className={cls.input} />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={updateTargets} className={cls.btnPrimary}>Save</button>
              <button onClick={() => close('targets')} className={cls.btnSecondary}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function StatCard({ label, value, unit, icon, onClick }) {
  return (
    <div onClick={onClick} className="bg-[#111] border border-[#1f1f1f] p-5 cursor-pointer hover:border-[#282828] transition-colors group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-neutral-700">
          {icon}
          <span className="text-[9px] font-mono uppercase tracking-widest">{label}</span>
        </div>
        <Pencil size={11} className="text-neutral-800 group-hover:text-neutral-600 transition-colors" />
      </div>
      <div className="font-mono">
        <span className="text-3xl font-semibold text-white">{value}</span>
        {unit && <span className="text-sm text-neutral-600 ml-1">{unit}</span>}
      </div>
    </div>
  )
}

function MacroCard({ label, current, target, unit, onEdit }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const over = current > target

  return (
    <div className="bg-[#111] border border-[#1f1f1f] p-5 group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-700">{label}</span>
        <button onClick={onEdit} className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Pencil size={11} className="text-neutral-700 hover:text-neutral-400" />
        </button>
      </div>
      <div className="font-mono mb-3">
        <span className={`text-3xl font-semibold ${over ? 'text-green-400' : 'text-white'}`}>{current}</span>
        <span className="text-sm text-neutral-600 ml-1">/ {target} {unit}</span>
      </div>
      <div className="h-px bg-[#1f1f1f]">
        <div className={`h-px transition-all ${over ? 'bg-green-500' : 'bg-white'}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[9px] font-mono text-neutral-700 mt-1.5">{pct}% of target</div>
    </div>
  )
}

function getLast7Days(history) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const date = d.toISOString().split('T')[0]
    const entry = history.find(h => h.date === date)
    return { date: date.slice(5), calories: entry?.calories || 0 }
  })
}

function today() { return new Date().toISOString().split('T')[0] }
function fmtDate(iso) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
