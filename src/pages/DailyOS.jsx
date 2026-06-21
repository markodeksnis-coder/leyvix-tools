import { useState, useEffect } from 'react'
import { Plus, Trash2, Check } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { today } from '../utils'

const BG = '#030508'
const SURF = '#06090f'
const CARD_BORDER = '#0f1628'
const GOLD = '#c9a84c'
const BLUE = '#3b82f6'
const GREEN = '#10b981'
const RED = '#ef4444'
const TEXT2 = '#4a5a7a'
const MUTED = '#2a3a5a'

const LBL = {
  fontFamily: 'Inter',
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: '0.3em',
  textTransform: 'uppercase',
  color: TEXT2,
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

function priorityColor(p) {
  if (p === 'HIGH') return RED
  if (p === 'LOW') return MUTED
  return GOLD
}

export default function DailyOS() {
  const [data, setData] = useLocalStorage('marko_daily', {
    nonNegotiables: DEFAULT_NON_NEGS,
    taskTemplates: DEFAULT_TASKS,
    logs: {},
  })
  const [newNNText, setNewNNText] = useState('')
  const [newTaskText, setNewTaskText] = useState('')
  const [newOneTimeText, setNewOneTimeText] = useState('')
  const [showManage, setShowManage] = useState(false)

  const todayStr = today()

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
  const totalCount = todayItems.length
  const scorePercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  // Streak: count consecutive days where all non-negotiables were checked
  const streak = (() => {
    let count = 0
    const d = new Date()
    // start from yesterday so today doesn't break streak if still in progress
    d.setDate(d.getDate() - 1)
    for (let i = 0; i < 365; i++) {
      const ds = d.toISOString().split('T')[0]
      const log = data.logs[ds]
      if (!log) break
      const nns = (log.items || []).filter(item => item.isNonNeg)
      if (nns.length === 0) break
      if (nns.every(item => item.checked)) {
        count++
        d.setDate(d.getDate() - 1)
      } else {
        break
      }
    }
    return count
  })()

  const toggleItem = (id) => {
    setData(d => ({
      ...d,
      logs: {
        ...d.logs,
        [todayStr]: {
          ...d.logs[todayStr],
          items: (d.logs[todayStr]?.items || []).map(i => i.id === id ? { ...i, checked: !i.checked } : i),
        },
      },
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
          items: [...(d.logs[todayStr]?.items || []), newItem],
        },
      },
    }))
    setNewOneTimeText('')
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
          items: [...(d.logs[todayStr]?.items || []), { ...item, checked: false, isNonNeg: true }],
        },
      },
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
          items: [...(d.logs[todayStr]?.items || []), { ...item, checked: false, isNonNeg: false }],
        },
      },
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
          items: (d.logs[todayStr]?.items || []).filter(i => !(i.isNonNeg && i.id === id)),
        },
      },
    }))
  }

  const deleteTask = (id) => {
    setData(d => ({
      ...d,
      taskTemplates: (d.taskTemplates || []).filter(t => t.id !== id),
      logs: {
        ...d.logs,
        [todayStr]: {
          items: (d.logs[todayStr]?.items || []).filter(i => !(!i.isNonNeg && i.id === id)),
        },
      },
    }))
  }

  // Last 7 days for weekly pattern
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const ds = d.toISOString().split('T')[0]
    const log = data.logs[ds]
    const items = log?.items || []
    const done = items.filter(item => item.checked).length
    const total = items.length
    const pct = total > 0 ? Math.round((done / total) * 100) : null
    const dayAbbr = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
    return { ds, dayAbbr, pct, isToday: ds === todayStr }
  })

  const hasWeeklyData = last7.some(d => d.pct !== null)

  const progressWidth = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  }).toUpperCase()

  return (
    <div style={{ background: BG, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Top Progress Bar */}
      <div style={{ height: 3, background: CARD_BORDER, flexShrink: 0 }}>
        <div style={{
          height: 3,
          background: GOLD,
          width: `${progressWidth}%`,
          transition: 'width 0.15s',
        }} />
      </div>

      {/* TopBar */}
      <div style={{
        background: SURF,
        borderBottom: `1px solid ${CARD_BORDER}`,
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        {/* Left: date + title */}
        <div>
          <div style={{ ...LBL, marginBottom: 2 }}>{dateLabel}</div>
          <div style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontSize: 22,
            fontWeight: 900,
            color: 'white',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}>
            DAILY OPS
          </div>
        </div>

        {/* Right: pills */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Streak pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: `${GOLD}18`,
            border: `1px solid ${GOLD}40`,
            borderRadius: 20,
            padding: '4px 10px',
          }}>
            <span style={{ fontSize: 10, color: GOLD }}>🔥</span>
            <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: GOLD }}>
              {streak}d
            </span>
            <span style={{ ...LBL, fontSize: 8, letterSpacing: '0.2em', marginBottom: 0, color: `${GOLD}99` }}>streak</span>
          </div>
          {/* Score pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: `${BLUE}18`,
            border: `1px solid ${BLUE}40`,
            borderRadius: 20,
            padding: '4px 10px',
          }}>
            <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: 14, fontWeight: 900, color: BLUE }}>
              {scorePercent}%
            </span>
            <span style={{ ...LBL, fontSize: 8, letterSpacing: '0.2em', marginBottom: 0, color: `${BLUE}99` }}>score</span>
          </div>
        </div>
      </div>

      {/* Manage Lists Panel */}
      {showManage && (
        <div style={{
          background: SURF,
          borderBottom: `1px solid ${CARD_BORDER}`,
          padding: '16px 20px',
          flexShrink: 0,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Non-negotiables management */}
            <div style={{ background: BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 10, padding: 14 }}>
              <div style={{ ...LBL, marginBottom: 10 }}>Non-Negotiables</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {(data.nonNegotiables || []).map(n => (
                  <div key={n.id} className="group" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 10px',
                    background: SURF,
                    border: `1px solid ${CARD_BORDER}`,
                    borderLeft: `2px solid ${RED}`,
                    borderRadius: 6,
                  }}>
                    <span style={{ fontFamily: 'Inter', fontSize: 12, color: 'white' }}>{n.title}</span>
                    <button
                      onClick={() => deleteNonNeg(n.id)}
                      style={{ color: TEXT2, background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
                      className="group-hover:!text-red-400 transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={newNNText}
                  onChange={e => setNewNNText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addNonNeg()}
                  placeholder="Add non-negotiable..."
                  style={{
                    flex: 1, background: SURF, border: `1px solid ${CARD_BORDER}`,
                    borderRadius: 6, padding: '6px 10px',
                    fontFamily: 'Inter', fontSize: 12, color: 'white', outline: 'none',
                  }}
                />
                <button onClick={addNonNeg} style={{
                  padding: '6px 10px', background: RED, color: 'white',
                  border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex',
                }}>
                  <Plus size={13} />
                </button>
              </div>
            </div>

            {/* Task templates management */}
            <div style={{ background: BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 10, padding: 14 }}>
              <div style={{ ...LBL, marginBottom: 10 }}>Task Templates</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {(data.taskTemplates || []).map(t => (
                  <div key={t.id} className="group" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 10px',
                    background: SURF,
                    border: `1px solid ${CARD_BORDER}`,
                    borderLeft: `2px solid ${GOLD}`,
                    borderRadius: 6,
                  }}>
                    <span style={{ fontFamily: 'Inter', fontSize: 12, color: 'white' }}>{t.title}</span>
                    <button
                      onClick={() => deleteTask(t.id)}
                      style={{ color: TEXT2, background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
                      className="group-hover:!text-red-400 transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={newTaskText}
                  onChange={e => setNewTaskText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTaskTemplate()}
                  placeholder="Add daily task..."
                  style={{
                    flex: 1, background: SURF, border: `1px solid ${CARD_BORDER}`,
                    borderRadius: 6, padding: '6px 10px',
                    fontFamily: 'Inter', fontSize: 12, color: 'white', outline: 'none',
                  }}
                />
                <button onClick={addTaskTemplate} style={{
                  padding: '6px 10px', background: GOLD, color: '#000',
                  border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex',
                }}>
                  <Plus size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>

        {/* Two-column checklist */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

          {/* Left — Non-Negotiables */}
          <div>
            {/* Column header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={LBL}>Non-Negotiables</span>
                <span style={{
                  fontFamily: 'Inter', fontSize: 8, fontWeight: 700,
                  color: RED, border: `1px solid ${RED}`, borderRadius: 10,
                  padding: '2px 6px', letterSpacing: '0.15em', textTransform: 'uppercase',
                }}>
                  CANNOT SKIP
                </span>
              </div>
              <button
                onClick={() => setShowManage(v => !v)}
                style={{
                  fontFamily: 'Inter', fontSize: 10, color: TEXT2,
                  background: 'none', border: 'none', cursor: 'pointer',
                  textDecoration: 'underline', padding: 0,
                }}
              >
                {showManage ? 'Close' : 'Manage'}
              </button>
            </div>

            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {nonNegItems.length === 0 ? (
                <div style={{ fontFamily: 'Inter', fontSize: 12, color: TEXT2, padding: '12px 0' }}>
                  No non-negotiables configured.
                </div>
              ) : nonNegItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: SURF,
                    border: `1px solid ${CARD_BORDER}`,
                    borderLeft: `2px solid ${RED}`,
                    borderRadius: 8,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                    border: `2px solid ${RED}`,
                    background: item.checked ? RED : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    {item.checked && <Check size={11} strokeWidth={3} color="white" />}
                  </div>
                  {/* Title */}
                  <span style={{
                    fontFamily: 'Inter', fontSize: 13, flex: 1,
                    color: item.checked ? TEXT2 : 'white',
                    textDecoration: item.checked ? 'line-through' : 'none',
                    transition: 'all 0.15s',
                  }}>
                    {item.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right — Daily Tasks */}
          <div>
            {/* Column header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={LBL}>Daily Tasks</span>
            </div>

            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {taskItems.length === 0 ? (
                <div style={{ fontFamily: 'Inter', fontSize: 12, color: TEXT2, padding: '12px 0' }}>
                  No tasks for today.
                </div>
              ) : taskItems.map(item => {
                const priority = item.priority || 'MED'
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: SURF,
                      border: `1px solid ${CARD_BORDER}`,
                      borderLeft: `2px solid ${GOLD}`,
                      borderRadius: 8,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                      border: `2px solid ${GOLD}`,
                      background: item.checked ? GOLD : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                      {item.checked && <Check size={11} strokeWidth={3} color="#000" />}
                    </div>
                    {/* Title */}
                    <span style={{
                      fontFamily: 'Inter', fontSize: 13, flex: 1,
                      color: item.checked ? TEXT2 : 'white',
                      textDecoration: item.checked ? 'line-through' : 'none',
                      transition: 'all 0.15s',
                    }}>
                      {item.title}
                    </span>
                    {/* Priority tag */}
                    <span style={{
                      fontFamily: 'Inter', fontSize: 8, fontWeight: 700,
                      color: priorityColor(priority),
                      border: `1px solid ${priorityColor(priority)}`,
                      borderRadius: 4, padding: '2px 5px',
                      letterSpacing: '0.15em', textTransform: 'uppercase',
                      flexShrink: 0,
                    }}>
                      {priority}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Add one-time task */}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                value={newOneTimeText}
                onChange={e => setNewOneTimeText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addOneTimeTask()}
                placeholder="Add task for today..."
                style={{
                  flex: 1, background: SURF, border: `1px solid ${CARD_BORDER}`,
                  borderRadius: 6, padding: '7px 12px',
                  fontFamily: 'Inter', fontSize: 12, color: 'white', outline: 'none',
                }}
              />
              <button onClick={addOneTimeTask} style={{
                padding: '7px 10px', background: GOLD, color: '#000',
                border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex',
              }}>
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Weekly Pattern */}
        {hasWeeklyData && (
          <div style={{
            background: SURF,
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: 10,
            padding: 16,
          }}>
            <div style={{ ...LBL, marginBottom: 12 }}>7-Day Pattern</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
              {last7.map(day => {
                const squareColor =
                  day.pct === null ? CARD_BORDER
                  : day.pct >= 80 ? GOLD
                  : day.pct >= 50 ? BLUE
                  : RED
                return (
                  <div key={day.ds} style={{ textAlign: 'center' }}>
                    {/* Day abbreviation */}
                    <div style={{
                      fontFamily: 'Inter', fontSize: 8, color: TEXT2,
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                      fontWeight: day.isToday ? 700 : 400,
                      marginBottom: 6,
                    }}>
                      {day.dayAbbr.slice(0, 3)}
                    </div>
                    {/* Color square */}
                    <div style={{
                      height: 36,
                      background: squareColor,
                      borderRadius: 6,
                      border: day.isToday ? `2px solid ${GOLD}` : `1px solid ${CARD_BORDER}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {day.pct !== null && (
                        <span style={{
                          fontFamily: '"Barlow Condensed", sans-serif',
                          fontSize: 14, fontWeight: 900,
                          color: day.pct >= 80 ? '#000' : 'white',
                          lineHeight: 1,
                        }}>
                          {day.pct}%
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
