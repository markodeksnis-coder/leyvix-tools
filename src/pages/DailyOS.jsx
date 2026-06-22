import { useState, useEffect } from 'react'
import { Plus, Trash2, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import { today } from '../utils'
import { calcDayScore, getWinDaySettings, getWinHistory, computeCurrentWinStreak } from '../utils/winLoss'

const BG = '#030311'
const CARD = { background: 'linear-gradient(135deg, #0d0d28 0%, #0a0a24 100%)', border: '1px solid #1d1d4a', borderRadius: 12, padding: 20, boxShadow: '0 0 0 1px rgba(139,92,246,0.08)' }
const LBL = { fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }

function ProgressRing({ done, total, size = 148 }) {
  const sw = 11
  const r = (size - sw * 2) / 2
  const circ = 2 * Math.PI * r
  const pct = total > 0 ? done / total : 0
  const offset = circ * (1 - pct)
  const color = pct >= 0.9 ? '#22c55e' : pct >= 0.7 ? '#fbbf24' : pct >= 0.5 ? '#fbbf24' : '#ef4444'
  const label = pct >= 0.9 ? 'ELITE' : pct >= 0.7 ? 'SOLID' : pct >= 0.5 ? 'ACCEPTABLE' : pct > 0 ? 'REPORT FOR DUTY' : 'NOT STARTED'
  const cx = size / 2, cy = size / 2
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(139,92,246,0.2)" strokeWidth={sw} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 44, color, lineHeight: 1, filter: 'drop-shadow(0 0 8px currentColor)' }}>{done}</span>
          <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#94a3b8' }}>/ {total}</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 20, color, letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontFamily: 'Inter', fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{Math.round(pct * 100)}% complete</div>
      </div>
    </div>
  )
}

const DEFAULT_NON_NEGS = [
  { id: 1, title: 'No PMO' },
  { id: 2, title: 'Cold Shower' },
  { id: 3, title: 'Prayer' },
  { id: 4, title: 'Training' },
]

const DEFAULT_TASKS = [
  { id: 101, title: 'Review goals' },
  { id: 102, title: 'Read / Learn (30 min)' },
  { id: 103, title: 'Sales outreach' },
]

export default function DailyOS() {
  const [data, setData] = useLocalStorage('marko_daily', {
    nonNegotiables: DEFAULT_NON_NEGS,
    taskTemplates: DEFAULT_TASKS,
    logs: {}
  })
  const [showWeekly, setShowWeekly] = useState(false)
  const [newNNText, setNewNNText] = useState('')
  const [newTaskText, setNewTaskText] = useState('')
  const [newOneTimeText, setNewOneTimeText] = useState('')
  const [showManage, setShowManage] = useState(false)

  const [bodyData] = useLocalStorage('marko_body', { liftSessions: [], workouts: [] })
  const [dietData] = useLocalStorage('marko_diet', { targets: {}, history: [] })

  const todayStr = today()

  const winSettings = getWinDaySettings()
  const todayResult = calcDayScore(todayStr, winSettings, data, bodyData, dietData)
  const winHistory30 = getWinHistory(30, winSettings, data, bodyData, dietData)
  const currentWinStreak = computeCurrentWinStreak(winHistory30)

  const todayLog = data.logs[todayStr] || {}
  const [sleepInput, setSleepInput] = useState(String(todayLog.sleep || ''))
  const [stepsInput, setStepsInput] = useState(String(todayLog.steps || ''))
  const [workInput, setWorkInput] = useState(String(todayLog.workOutput || ''))

  useEffect(() => {
    const log = data.logs[todayStr] || {}
    setSleepInput(log.sleep != null ? String(log.sleep) : '')
    setStepsInput(log.steps != null ? String(log.steps) : '')
    setWorkInput(log.workOutput != null ? String(log.workOutput) : '')
  }, [todayStr])

  // Initialize today's log from templates if it doesn't exist
  useEffect(() => {
    if (!data.logs[todayStr]) {
      const items = [
        ...(data.nonNegotiables || []).map(n => ({ id: n.id, title: n.title, checked: false, isNonNeg: true })),
        ...(data.taskTemplates || []).map(t => ({ id: t.id, title: t.title, checked: false, isNonNeg: false })),
      ]
      if (items.length > 0) {
        setData(d => ({ ...d, logs: { ...d.logs, [todayStr]: { items } } }))
      }
    }
  }, [todayStr, data.nonNegotiables, data.taskTemplates])

  const todayItems = data.logs[todayStr]?.items || []
  const nonNegItems = todayItems.filter(i => i.isNonNeg)
  const taskItems = todayItems.filter(i => !i.isNonNeg)
  const checkedCount = todayItems.filter(i => i.checked).length
  const nnDone = nonNegItems.filter(i => i.checked).length
  const score = todayItems.length > 0 ? Math.round((checkedCount / todayItems.length) * 10) : 0
  const nnFailed = nonNegItems.some(i => !i.checked)

  const toggleItem = (id) => {
    setData(d => ({
      ...d,
      logs: {
        ...d.logs,
        [todayStr]: {
          ...d.logs[todayStr],
          items: (d.logs[todayStr]?.items || []).map(i => i.id === id ? { ...i, checked: !i.checked } : i)
        }
      }
    }))
  }

  const addOneTimeTask = () => {
    if (!newOneTimeText.trim()) return
    const newItem = { id: Date.now(), title: newOneTimeText.trim(), checked: false, isNonNeg: false }
    setData(d => ({
      ...d,
      logs: {
        ...d.logs,
        [todayStr]: {
          items: [...(d.logs[todayStr]?.items || []), newItem]
        }
      }
    }))
    setNewOneTimeText('')
  }

  const saveDailyStats = () => {
    const updates = {}
    if (sleepInput.trim()) updates.sleep = Math.min(10, Math.max(1, parseFloat(sleepInput)))
    if (stepsInput.trim()) updates.steps = parseInt(stepsInput)
    if (workInput.trim()) updates.workOutput = Math.min(10, Math.max(1, parseFloat(workInput)))
    if (Object.keys(updates).length === 0) return
    setData(d => ({
      ...d,
      logs: {
        ...d.logs,
        [todayStr]: { ...(d.logs[todayStr] || {}), ...updates }
      }
    }))
  }

  const addNonNeg = () => {
    if (!newNNText.trim()) return
    const item = { id: Date.now(), title: newNNText.trim() }
    setData(d => ({
      ...d,
      nonNegotiables: [...(d.nonNegotiables || []), item],
      logs: {
        ...d.logs,
        [todayStr]: {
          items: [...(d.logs[todayStr]?.items || []), { ...item, checked: false, isNonNeg: true }]
        }
      }
    }))
    setNewNNText('')
  }

  const addTaskTemplate = () => {
    if (!newTaskText.trim()) return
    const item = { id: Date.now(), title: newTaskText.trim() }
    setData(d => ({
      ...d,
      taskTemplates: [...(d.taskTemplates || []), item],
      logs: {
        ...d.logs,
        [todayStr]: {
          items: [...(d.logs[todayStr]?.items || []), { ...item, checked: false, isNonNeg: false }]
        }
      }
    }))
    setNewTaskText('')
  }

  const deleteNonNeg = (id) => {
    setData(d => ({
      ...d,
      nonNegotiables: (d.nonNegotiables || []).filter(n => n.id !== id),
      logs: {
        ...d.logs,
        [todayStr]: {
          items: (d.logs[todayStr]?.items || []).filter(i => !(i.isNonNeg && i.id === id))
        }
      }
    }))
  }

  const deleteTask = (id) => {
    setData(d => ({
      ...d,
      taskTemplates: (d.taskTemplates || []).filter(t => t.id !== id),
      logs: {
        ...d.logs,
        [todayStr]: {
          items: (d.logs[todayStr]?.items || []).filter(i => !(!i.isNonNeg && i.id === id))
        }
      }
    }))
  }

  // Weekly view - last 7 days
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const ds = d.toISOString().split('T')[0]
    const log = data.logs[ds]
    const items = log?.items || []
    const done = items.filter(i => i.checked).length
    const total = items.length
    const pct = total > 0 ? Math.round((done / total) * 100) : null
    const nnFail = items.filter(i => i.isNonNeg && !i.checked).length > 0
    const label = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
    return { ds, label, done, total, pct, nnFail, isToday: ds === todayStr }
  })

  const scoreColor = score >= 9 ? '#22c55e' : score >= 7 ? '#fbbf24' : score >= 5 ? '#fbbf24' : '#ef4444'
  const scoreLabel = score >= 9 ? 'ELITE' : score >= 7 ? 'SOLID' : score >= 5 ? 'ACCEPTABLE' : 'BELOW PAR'

  return (
    <div className="h-full flex flex-col" style={{ background: BG }}>
      {/* Header */}
      <div style={{ background: BG, borderBottom: '1px solid #1d1d4a', padding: '20px 32px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: nnFailed ? '#ef4444' : '#22c55e' }} />
              <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {nnFailed ? 'NON-NEGOTIABLES PENDING' : 'NON-NEGOTIABLES CLEAR'}
              </span>
            </div>
            <h1 style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 64, fontWeight: 400, lineHeight: 0.9, fontStyle: 'italic', letterSpacing: '0.02em', background: 'linear-gradient(135deg, #8b5cf6 0%, #22d3ee 50%, #fbbf24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>DAILY OPS</h1>
            <p style={{ fontFamily: 'Inter', fontSize: 10, color: '#94a3b8', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>ACCOUNTABILITY LAYER // NON-NEGOTIABLES & DAILY TASKS</p>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
            {currentWinStreak > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)',
                borderRadius: 999, padding: '5px 10px',
              }}>
                <span style={{ fontSize: 13 }}>🔥</span>
                <span style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 900, fontSize: 18, color: '#c9a84c', lineHeight: 1 }}>
                  {currentWinStreak}
                </span>
                <span style={{ fontFamily: 'Inter', fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>STREAK</span>
              </div>
            )}
            <button onClick={() => setShowManage(!showManage)} style={{ padding: '7px 14px', border: '1px solid #1d1d4a', color: '#94a3b8', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', background: 'transparent', cursor: 'pointer', fontFamily: 'Inter' }}>
              {showManage ? 'Close' : 'Manage Lists'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto" style={{ padding: '24px 32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* WIN/LOSS Badge */}
          {todayResult.available > 0 && (
            <div style={{
              margin: '0 32px 0',
              padding: '14px 20px',
              borderRadius: 12,
              background: todayResult.isWin ? '#c9a84c' : '#ef4444',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 28,
                  color: todayResult.isWin ? '#000' : '#fff', letterSpacing: '0.05em',
                }}>
                  {todayResult.isWin ? 'WIN DAY' : 'LOSS DAY'}
                </span>
                <span style={{
                  fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 28,
                  color: todayResult.isWin ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)',
                }}>
                  {todayResult.pct}%
                </span>
              </div>
              {!todayResult.isWin && (() => {
                const needed = Math.ceil((winSettings.threshold / 100) * todayResult.available) - todayResult.passed
                return needed > 0 ? (
                  <span style={{ fontFamily: 'Inter', fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                    Complete {needed} more to flip to WIN
                  </span>
                ) : null
              })()}
              {todayResult.isWin && (
                <span style={{ fontFamily: 'Inter', fontSize: 11, color: 'rgba(0,0,0,0.6)', fontWeight: 600 }}>
                  {todayResult.passed}/{todayResult.available} metrics hit
                </span>
              )}
            </div>
          )}

          {/* Score + stats */}
          <div style={{ ...CARD, display: 'flex', alignItems: 'center', gap: 40 }}>
            <ProgressRing done={checkedCount} total={todayItems.length} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Inter', fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'Inter', fontSize: 12, color: '#d1d5db' }}>Non-Negotiables</span>
                  <span style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 18, color: nnDone === nonNegItems.length && nonNegItems.length > 0 ? '#22c55e' : '#ef4444' }}>
                    {nnDone} / {nonNegItems.length}
                  </span>
                </div>
                <div style={{ height: 3, background: '#1d1d4a', borderRadius: 2 }}>
                  <div style={{ height: 3, background: '#ef4444', borderRadius: 2, width: `${nonNegItems.length > 0 ? (nnDone / nonNegItems.length) * 100 : 0}%`, transition: 'width 0.4s' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontFamily: 'Inter', fontSize: 12, color: '#d1d5db' }}>Daily Tasks</span>
                  <span style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 18, color: '#fbbf24' }}>
                    {taskItems.filter(i => i.checked).length} / {taskItems.length}
                  </span>
                </div>
                <div style={{ height: 3, background: 'rgba(251,191,36,0.15)', borderRadius: 2 }}>
                  <div style={{ height: 3, background: '#fbbf24', borderRadius: 2, width: `${taskItems.length > 0 ? (taskItems.filter(i => i.checked).length / taskItems.length) * 100 : 0}%`, transition: 'width 0.4s' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Daily Stats */}
          <div style={CARD}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#3b82f6' }} />
              <span style={{ fontFamily:'Inter', fontSize:12, fontWeight:700, color:'white', textTransform:'uppercase', letterSpacing:'0.08em' }}>Daily Stats</span>
              <span style={{ fontFamily:'Inter', fontSize:9, color:'#94a3b8', marginLeft:'auto' }}>Optional · feeds Life Cycles section</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              {/* Sleep Quality */}
              <div>
                <div style={{ fontFamily:'Inter', fontSize:9, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>Sleep Quality /10</div>
                <input type="number" min="1" max="10" step="0.5"
                  value={sleepInput} onChange={e => setSleepInput(e.target.value)}
                  placeholder={data.logs[todayStr]?.sleep ? String(data.logs[todayStr].sleep) : '—'}
                  style={{ width:'100%', background: '#030311', border:'1px solid #1d1d4a', borderRadius:6, padding:'8px 12px', fontFamily:'Inter', fontSize:14, color:'white', outline:'none', boxSizing:'border-box' }} />
                {data.logs[todayStr]?.sleep && <div style={{ fontFamily:'Inter', fontSize:9, color:'#3b82f6', marginTop:4 }}>Logged: {data.logs[todayStr].sleep}/10</div>}
              </div>
              {/* Steps */}
              <div>
                <div style={{ fontFamily:'Inter', fontSize:9, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>Steps Today</div>
                <input type="number" min="0"
                  value={stepsInput} onChange={e => setStepsInput(e.target.value)}
                  placeholder={data.logs[todayStr]?.steps ? String(data.logs[todayStr].steps) : '—'}
                  style={{ width:'100%', background: '#030311', border:'1px solid #1d1d4a', borderRadius:6, padding:'8px 12px', fontFamily:'Inter', fontSize:14, color:'white', outline:'none', boxSizing:'border-box' }} />
                {data.logs[todayStr]?.steps && <div style={{ fontFamily:'Inter', fontSize:9, color:'#fbbf24', marginTop:4 }}>Logged: {data.logs[todayStr].steps.toLocaleString()}</div>}
              </div>
              {/* Work Output */}
              <div>
                <div style={{ fontFamily:'Inter', fontSize:9, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>Work Output /10</div>
                <input type="number" min="1" max="10" step="0.5"
                  value={workInput} onChange={e => setWorkInput(e.target.value)}
                  placeholder={data.logs[todayStr]?.workOutput ? String(data.logs[todayStr].workOutput) : '—'}
                  style={{ width:'100%', background: '#030311', border:'1px solid #1d1d4a', borderRadius:6, padding:'8px 12px', fontFamily:'Inter', fontSize:14, color:'white', outline:'none', boxSizing:'border-box' }} />
                {data.logs[todayStr]?.workOutput && <div style={{ fontFamily:'Inter', fontSize:9, color:'#10b981', marginTop:4 }}>Logged: {data.logs[todayStr].workOutput}/10</div>}
              </div>
            </div>
            <button onClick={saveDailyStats}
              style={{ marginTop:14, width:'100%', padding:'9px', background:'linear-gradient(135deg, #8b5cf6, #6d28d9)', color:'white', border:'none', borderRadius:8, fontFamily:'Inter', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', cursor:'pointer', boxShadow:'0 0 20px rgba(139,92,246,0.4)' }}>
              Save Daily Stats
            </button>
          </div>

          {/* Manage lists panel */}
          {showManage && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Non-negotiables management */}
              <div style={CARD}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                  <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Non-Negotiables</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {(data.nonNegotiables || []).map(n => (
                    <div key={n.id} className="group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#030311', border: '1px solid #ef444420', borderLeft: '3px solid #ef4444', borderRadius: 8 }}>
                      <span style={{ fontFamily: 'Inter', fontSize: 12, color: 'white' }}>{n.title}</span>
                      <button onClick={() => deleteNonNeg(n.id)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', opacity: 0 }} className="group-hover:opacity-100 hover:!text-red-400 transition-all"><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={newNNText} onChange={e => setNewNNText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNonNeg()} placeholder="Add non-negotiable..." style={{ flex: 1, background: '#030311', border: '1px solid #1d1d4a', borderRadius: 6, padding: '7px 12px', fontFamily: 'Inter', fontSize: 12, color: 'white', outline: 'none' }} />
                  <button onClick={addNonNeg} style={{ padding: '7px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}><Plus size={13} /></button>
                </div>
              </div>

              {/* Task templates */}
              <div style={CARD}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24' }} />
                  <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Daily Task Templates</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {(data.taskTemplates || []).map(t => (
                    <div key={t.id} className="group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#030311', border: '1px solid #1d1d4a', borderRadius: 8 }}>
                      <span style={{ fontFamily: 'Inter', fontSize: 12, color: '#d1d5db' }}>{t.title}</span>
                      <button onClick={() => deleteTask(t.id)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', opacity: 0 }} className="group-hover:opacity-100 hover:!text-red-400 transition-all"><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={newTaskText} onChange={e => setNewTaskText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTaskTemplate()} placeholder="Add daily task..." style={{ flex: 1, background: '#030311', border: '1px solid #1d1d4a', borderRadius: 6, padding: '7px 12px', fontFamily: 'Inter', fontSize: 12, color: 'white', outline: 'none' }} />
                  <button onClick={addTaskTemplate} style={{ padding: '7px 12px', background: '#fbbf24', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer' }}><Plus size={13} /></button>
                </div>
              </div>
            </div>
          )}

          {/* Non-negotiables — full width */}
          <div style={CARD}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: nnFailed ? '#ef4444' : '#8b5cf6' }} />
                <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Non-Negotiables</span>
              </div>
              <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(26,36,64,0.3)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 4, padding: '3px 8px' }}>CANNOT SKIP</span>
            </div>
            {nonNegItems.length === 0 ? (
              <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>Open "Manage Lists" to add non-negotiables</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {nonNegItems.map(item => (
                  <button key={item.id} onClick={() => toggleItem(item.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                      background: item.checked ? 'rgba(34,197,94,0.05)' : 'rgba(26,36,64,0.3)',
                      border: `1px solid ${item.checked ? 'rgba(34,197,94,0.15)' : 'rgba(26,36,64,0.3)'}`,
                      borderLeft: `3px solid ${item.checked ? '#22c55e' : '#ef4444'}`,
                      borderRadius: 8, cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${item.checked ? '#22c55e' : '#ef4444'}`, background: item.checked ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                      {item.checked && <Check size={13} strokeWidth={3} color="white" />}
                    </div>
                    <span style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: item.checked ? '#94a3b8' : 'white', textDecoration: item.checked ? 'line-through' : 'none', transition: 'all 0.15s', flex: 1 }}>{item.title}</span>
                    {item.checked && <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>✓ Done</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Daily tasks — full width */}
          <div style={CARD}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24' }} />
              <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Daily Tasks</span>
            </div>
            {taskItems.length === 0 ? (
              <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>No tasks yet — open "Manage Lists" to add recurring tasks</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {taskItems.map(item => (
                  <button key={item.id} onClick={() => toggleItem(item.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                      background: '#030311',
                      border: `1px solid ${item.checked ? 'rgba(34,197,94,0.12)' : '#1d1d4a'}`,
                      borderLeft: `3px solid ${item.checked ? '#22c55e' : '#fbbf24'}`,
                      borderRadius: 8, cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: 5, border: item.checked ? '2px solid #22c55e' : '1px solid rgba(139,92,246,0.3)', background: item.checked ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                      {item.checked && <Check size={11} strokeWidth={3} color="white" />}
                    </div>
                    <span style={{ fontFamily: 'Inter', fontSize: 13, color: item.checked ? '#94a3b8' : '#d1d5db', textDecoration: item.checked ? 'line-through' : 'none', transition: 'all 0.15s', flex: 1 }}>{item.title}</span>
                  </button>
                ))}
              </div>
            )}
            {/* Add one-time task */}
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <input value={newOneTimeText} onChange={e => setNewOneTimeText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addOneTimeTask()} placeholder="Add task for today..."
                style={{ flex: 1, background: '#030311', border: '1px solid #1d1d4a', borderRadius: 6, padding: '8px 12px', fontFamily: 'Inter', fontSize: 12, color: 'white', outline: 'none' }} />
              <button onClick={addOneTimeTask} style={{ padding: '8px 12px', background: '#fbbf24', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer' }}><Plus size={14} /></button>
            </div>
          </div>

          {/* Only show weekly section if there are logs for any of the last 7 days */}
          {last7.some(d => d.pct !== null) && (
            <div style={CARD}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
                <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.08em' }}>7-Day Pattern</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                {last7.map(day => {
                  const pctColor = day.pct === null ? '#1d1d4a' : day.pct >= 90 ? '#22c55e' : day.pct >= 70 ? '#fbbf24' : day.pct >= 50 ? '#fbbf24' : '#ef4444'
                  return (
                    <div key={day.ds} style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Inter', fontSize: 9, color: day.isToday ? '#fbbf24' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontWeight: day.isToday ? 700 : 400 }}>{day.label}</div>
                      <div style={{ height: 72, background: '#030311', border: `1px solid ${day.isToday ? '#fbbf2430' : '#1d1d4a'}`, borderRadius: 8, position: 'relative', overflow: 'hidden' }}>
                        {day.pct !== null && (
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${day.pct}%`, background: pctColor, opacity: 0.25 }} />
                        )}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                          <div style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 20, color: day.pct !== null ? pctColor : '#1d1d4a', lineHeight: 1 }}>
                            {day.pct !== null ? `${day.pct}%` : '—'}
                          </div>
                          {day.nnFail && <div style={{ fontFamily: 'Inter', fontSize: 6, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>NN FAIL</div>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
