import { useState, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { today, DATA_START_DATE } from '../utils'

const LINKED_METRICS = [
  { key: '',               label: '— None —'                },
  { key: 'energy',        label: 'Energy (0-10)',    unit: '/10'   },
  { key: 'dailyRating',   label: 'Day Rating (0-10)', unit: '/10'  },
  { key: 'bizHours',      label: 'Business Hours',   unit: 'hrs'   },
  { key: 'salesCalls',    label: 'Sales Calls',      unit: '/day'  },
  { key: 'meetingsBooked',label: 'Meetings Booked',  unit: '/day'  },
  { key: 'steps',         label: 'Steps',            unit: 'steps' },
  { key: 'sleepHours',    label: 'Sleep Hours',      unit: 'hrs'   },
  { key: 'workOutput',    label: 'Work Focus (0-10)', unit: '/10'  },
  { key: 'dietQuality',   label: 'Diet Quality (0-10)',unit: '/10' },
]

// ── Color constants ────────────────────────────────────────────────────────────
const GOLD   = '#f0c040'
const GREEN  = '#1ad9a0'
const CYAN   = '#22d3ee'
const VIOLET = '#8b5cf6'
const PINK   = '#e879f9'
const RED    = '#ff5555'
const TEXT2  = '#94a3b8'
const MUTED  = '#475569'
const BORDER = 'rgba(99,102,241,0.18)'
const BG     = 'transparent'

const CATEGORIES = ['Body', 'Business', 'Mind', 'Daily', 'Custom']

const CATEGORY_COLORS = {
  Body:     GREEN,
  Business: CYAN,
  Mind:     VIOLET,
  Daily:    GOLD,
  Custom:   PINK,
}

// ── Helpers ────────────────────────────────────────────────────────────────────
let _nextId = Date.now()
const uid = () => ++_nextId

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function emptyGoal() {
  const start = today()
  const end = addDays(start, 90)
  return {
    title: '',
    category: 'Body',
    target: '',
    startDate: start,
    endDate: end,
    milestones: [],
    tasks: [],
    archived: false,
    linkedMetric: '',
    metricTarget: null,
  }
}

function emptyMilestone() {
  return { id: uid(), date: today(), description: '', achieved: false }
}

function emptyTask() {
  return { id: uid(), text: '', frequency: 'daily', completed: false }
}

// ── Timeline math ──────────────────────────────────────────────────────────────
function calcTimeline(goal) {
  const start = new Date(goal.startDate + 'T00:00:00')
  const end   = new Date(goal.endDate + 'T00:00:00')
  const now   = new Date()

  const totalMs   = end - start
  const elapsedMs = now - start

  const pct      = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100))
  const daysLeft = Math.ceil((end - now) / 86400000)

  const milestonePositions = (goal.milestones || []).map(m => {
    const mDate = new Date(m.date + 'T00:00:00')
    const mPct  = Math.min(100, Math.max(0, ((mDate - start) / totalMs) * 100))
    return { ...m, pct: mPct }
  })

  const nowStr   = now.toISOString().split('T')[0]
  const upcoming = milestonePositions
    .filter(m => !m.achieved && m.date >= nowStr)
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  return { pct, daysLeft, milestonePositions, upcomingId: upcoming?.id ?? null }
}

// ── Metric auto-progress ───────────────────────────────────────────────────────
function getMetricProgress(goal, dailyData) {
  if (!goal.linkedMetric || goal.metricTarget == null || !dailyData?.logs) return null
  const logs = dailyData.logs
  const now  = new Date()
  const vals = []
  for (let i = 0; i < 30; i++) {
    const d  = new Date(now)
    d.setDate(d.getDate() - i)
    const ds = d.toISOString().split('T')[0]
    if (ds < DATA_START_DATE) continue // skip dates before data start
    const v = (logs[ds] || {})[goal.linkedMetric]
    if (v != null) vals.push(+v)
  }
  if (!vals.length) return null
  const avg        = vals.reduce((a, b) => a + b, 0) / vals.length
  const pct        = Math.min(100, (avg / goal.metricTarget) * 100)
  const metricInfo = LINKED_METRICS.find(m => m.key === goal.linkedMetric)
  return { avg, pct, metricInfo, n: vals.length }
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ label, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 8px' }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: color, boxShadow: `0 0 10px ${color}`,
        flexShrink: 0,
      }} />
      <span style={{
        fontFamily: '"Orbitron", monospace',
        fontSize: 10, fontWeight: 700, color,
        letterSpacing: '0.2em', textTransform: 'uppercase',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${color}40, transparent)` }} />
    </div>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusLabel({ daysLeft, color }) {
  if (daysLeft > 0) {
    return (
      <div style={{
        background: `${color}18`,
        border: `1px solid ${color}40`,
        borderRadius: 10,
        padding: '8px 14px',
        textAlign: 'center',
        lineHeight: 1,
      }}>
        <div style={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 900,
          fontSize: 32,
          color,
          filter: `drop-shadow(0 0 10px ${color}70)`,
          lineHeight: 1,
        }}>
          {daysLeft}
        </div>
        <div style={{
          fontSize: 8,
          letterSpacing: '0.15em',
          color: MUTED,
          fontFamily: 'Inter, sans-serif',
          marginTop: 4,
        }}>
          DAYS LEFT
        </div>
      </div>
    )
  }
  if (daysLeft === 0) {
    return (
      <div style={{
        background: `${GREEN}18`,
        border: `1px solid ${GREEN}50`,
        borderRadius: 10,
        padding: '8px 14px',
        fontFamily: '"Barlow Condensed", sans-serif',
        fontWeight: 900,
        fontSize: 18,
        color: GREEN,
        filter: `drop-shadow(0 0 8px ${GREEN}70)`,
        textAlign: 'center',
      }}>
        TODAY
      </div>
    )
  }
  return (
    <div style={{
      background: `${RED}18`,
      border: `1px solid ${RED}50`,
      borderRadius: 10,
      padding: '8px 14px',
      fontFamily: '"Barlow Condensed", sans-serif',
      fontWeight: 900,
      fontSize: 18,
      color: RED,
      textAlign: 'center',
    }}>
      OVERDUE
    </div>
  )
}

// ── Progress bar with milestone dots ──────────────────────────────────────────
function TimelineBar({ pct, milestonePositions, upcomingId, color }) {
  return (
    <div style={{ position: 'relative', height: 24, display: 'flex', alignItems: 'center' }}>
      {/* Track */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0,
        height: 6,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 3,
        overflow: 'visible',
      }}>
        {/* Fill */}
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: 3,
          boxShadow: `0 0 10px ${color}80`,
          transition: 'width 0.5s ease',
        }} />
      </div>

      {/* Milestone dots */}
      {milestonePositions.map(m => {
        const isUpcoming = m.id === upcomingId
        return (
          <div
            key={m.id}
            title={`${m.date} — ${m.description}`}
            style={{
              position: 'absolute',
              left: `${m.pct}%`,
              transform: 'translateX(-50%)',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: m.achieved ? GREEN : GOLD,
              border: `2px solid rgba(4,6,20,0.8)`,
              zIndex: 2,
              cursor: 'default',
              boxShadow: isUpcoming
                ? `0 0 0 3px ${GOLD}55, 0 0 8px 2px ${GOLD}88`
                : m.achieved ? `0 0 6px ${GREEN}80` : 'none',
              animation: isUpcoming ? 'goalPulse 1.8s ease-in-out infinite' : 'none',
            }}
          />
        )
      })}
    </div>
  )
}

// ── Goal Card ──────────────────────────────────────────────────────────────────
function GoalCard({ goal, onEdit, onArchive, onToggleTask, dailyData }) {
  const { pct, daysLeft, milestonePositions, upcomingId } = calcTimeline(goal)
  const color          = CATEGORY_COLORS[goal.category] || CATEGORY_COLORS.Custom
  const tasks          = goal.tasks || []
  const metricProgress = getMetricProgress(goal, dailyData)

  return (
    <div style={{
      background: 'rgba(4,6,20,0.65)',
      backdropFilter: 'blur(40px)',
      WebkitBackdropFilter: 'blur(40px)',
      border: `1px solid ${color}35`,
      borderRadius: 18,
      overflow: 'hidden',
      boxShadow: `0 0 40px ${color}10, 0 4px 32px rgba(0,0,0,0.6), inset 0 1px 0 ${color}12`,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top glow hairline */}
      <div style={{
        height: 1,
        background: `linear-gradient(90deg, transparent, ${color}CC, ${color}, ${color}CC, transparent)`,
        boxShadow: `0 0 12px ${color}80`,
      }} />

      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Top row: title + status badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Category tag */}
            <span style={{
              display: 'inline-block',
              fontSize: 9,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color,
              border: `1px solid ${color}44`,
              borderRadius: 4,
              padding: '1px 6px',
              marginBottom: 7,
              background: `${color}12`,
            }}>
              {goal.category}
            </span>

            <div style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 900,
              fontSize: 20,
              color: '#fff',
              lineHeight: 1.2,
              wordBreak: 'break-word',
            }}>
              {goal.title}
            </div>

            {goal.target && (
              <div style={{ fontSize: 12, color: TEXT2, marginTop: 3, fontFamily: 'Inter, sans-serif' }}>
                {goal.target}
              </div>
            )}

            {/* Linked metric progress */}
            {metricProgress && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 9,
                    color: MUTED,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}>
                    {metricProgress.n}d avg · {metricProgress.metricInfo?.label || goal.linkedMetric}
                  </span>
                  <span style={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontWeight: 900,
                    fontSize: 18,
                    color: metricProgress.pct >= 100 ? GREEN : color,
                    filter: `drop-shadow(0 0 8px ${color}60)`,
                  }}>
                    {metricProgress.avg.toFixed(1)}
                    <span style={{ fontSize: 9, color: MUTED, fontWeight: 400 }}>
                      {' '}/ {goal.metricTarget}{metricProgress.metricInfo?.unit}
                    </span>
                  </span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${metricProgress.pct}%`,
                    borderRadius: 3,
                    background: metricProgress.pct >= 100 ? GREEN : color,
                    boxShadow: `0 0 10px ${color}80`,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 9,
                  color: MUTED,
                  textAlign: 'right',
                  marginTop: 3,
                }}>
                  {Math.round(metricProgress.pct)}% of target
                </div>
              </div>
            )}
          </div>

          {/* Days remaining */}
          <div style={{ flexShrink: 0 }}>
            <StatusLabel daysLeft={daysLeft} color={color} />
          </div>
        </div>

        {/* Timeline bar */}
        <TimelineBar
          pct={pct}
          milestonePositions={milestonePositions}
          upcomingId={upcomingId}
          color={color}
        />

        {/* Date labels */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          color: MUTED,
          fontFamily: 'Inter, sans-serif',
          marginTop: -2,
        }}>
          <span>{goal.startDate}</span>
          <span style={{
            color,
            fontWeight: 700,
            filter: `drop-shadow(0 0 6px ${color}50)`,
          }}>
            {Math.round(pct)}% elapsed
          </span>
          <span>{goal.endDate}</span>
        </div>

        {/* Milestones list */}
        {goal.milestones?.length > 0 && (
          <>
            <SectionHeader label="Milestones" color={color} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {goal.milestones.map(m => (
                <div key={m.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  fontFamily: 'Inter, sans-serif',
                  color: m.achieved ? GREEN : TEXT2,
                }}>
                  {/* Glowing checkbox circle */}
                  <div style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    border: `2px solid ${m.achieved ? GREEN : `${color}55`}`,
                    background: m.achieved ? `${GREEN}20` : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: m.achieved ? `0 0 8px ${GREEN}60` : 'none',
                  }}>
                    {m.achieved && (
                      <div style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: GREEN,
                        boxShadow: `0 0 6px ${GREEN}`,
                      }} />
                    )}
                  </div>
                  <span style={{ flex: 1 }}>{m.description}</span>
                  <span style={{ color: MUTED, fontSize: 10 }}>{m.date}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Tasks */}
        {tasks.length > 0 && (
          <>
            <SectionHeader label="Tasks" color={color} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {tasks.map(task => (
                <label key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={!!task.completed}
                    onChange={() => onToggleTask(goal.id, task.id)}
                    style={{ accentColor: color, width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{
                    fontSize: 13,
                    fontFamily: 'Inter, sans-serif',
                    color: task.completed ? MUTED : '#e2e8f0',
                    textDecoration: task.completed ? 'line-through' : 'none',
                    flex: 1,
                  }}>
                    {task.text}
                  </span>
                  <span style={{
                    fontSize: 9,
                    fontFamily: 'Inter, sans-serif',
                    color: task.frequency === 'daily' ? CYAN : VIOLET,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {task.frequency}
                  </span>
                </label>
              ))}
            </div>
          </>
        )}

        {/* Action buttons */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginTop: 6,
          paddingTop: 12,
          borderTop: `1px solid ${color}15`,
        }}>
          <button
            onClick={() => onEdit(goal)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: `${color}10`,
              border: `1px solid ${color}35`,
              borderRadius: 8,
              color,
              fontSize: 11,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              padding: '6px 13px',
              cursor: 'pointer',
              letterSpacing: '0.05em',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${color}20`
              e.currentTarget.style.boxShadow = `0 0 14px ${color}30`
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = `${color}10`
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <PencilIcon size={12} /> Edit
          </button>
          <button
            onClick={() => onArchive(goal.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: 'transparent',
              border: `1px solid ${MUTED}40`,
              borderRadius: 8,
              color: MUTED,
              fontSize: 11,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              padding: '6px 13px',
              cursor: 'pointer',
              letterSpacing: '0.05em',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = MUTED
              e.currentTarget.style.color = '#e2e8f0'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = `${MUTED}40`
              e.currentTarget.style.color = MUTED
            }}
          >
            <ArchiveIcon size={12} /> Archive
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tiny SVG icons ─────────────────────────────────────────────────────────────
function PencilIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function ArchiveIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  )
}

function XIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function TrashIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

// ── Shared input style factory ─────────────────────────────────────────────────
const inputStyle = (accentColor = BORDER) => ({
  width: '100%',
  background: 'rgba(4,6,20,0.8)',
  border: `1px solid ${accentColor}35`,
  borderRadius: 8,
  padding: '9px 12px',
  fontSize: 14,
  color: '#fff',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
  colorScheme: 'dark',
  transition: 'border-color 0.2s',
})

const labelStyle = {
  display: 'block',
  fontSize: 9,
  fontFamily: '"Orbitron", monospace',
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: MUTED,
  marginBottom: 6,
}

// ── Add/Edit modal ─────────────────────────────────────────────────────────────
function GoalModal({ goal, onSave, onClose }) {
  const [form, setForm] = useState(() =>
    goal
      ? {
          title:        goal.title,
          category:     goal.category,
          target:       goal.target,
          startDate:    goal.startDate,
          endDate:      goal.endDate,
          milestones:   goal.milestones.map(m => ({ ...m })),
          tasks:        goal.tasks.map(t => ({ ...t })),
          archived:     goal.archived,
          linkedMetric: goal.linkedMetric || '',
          metricTarget: goal.metricTarget ?? null,
        }
      : emptyGoal()
  )

  const setField = (field, value) => setForm(f => ({ ...f, [field]: value }))

  // Milestones
  const addMilestone    = () => setForm(f => ({ ...f, milestones: [...f.milestones, emptyMilestone()] }))
  const updateMilestone = (id, field, value) =>
    setForm(f => ({ ...f, milestones: f.milestones.map(m => m.id === id ? { ...m, [field]: value } : m) }))
  const deleteMilestone = id =>
    setForm(f => ({ ...f, milestones: f.milestones.filter(m => m.id !== id) }))

  // Tasks
  const addTask    = () => setForm(f => ({ ...f, tasks: [...f.tasks, emptyTask()] }))
  const updateTask = (id, field, value) =>
    setForm(f => ({ ...f, tasks: f.tasks.map(t => t.id === id ? { ...t, [field]: value } : t) }))
  const deleteTask = id =>
    setForm(f => ({ ...f, tasks: f.tasks.filter(t => t.id !== id) }))

  const handleSave = () => {
    if (!form.title.trim()) return
    onSave(form)
  }

  const color = CATEGORY_COLORS[form.category] || CATEGORY_COLORS.Custom

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.80)',
        backdropFilter: 'blur(8px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'rgba(4,6,20,0.92)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        border: `1px solid ${color}40`,
        borderRadius: 18,
        boxShadow: `0 0 60px ${color}18, 0 8px 48px rgba(0,0,0,0.8)`,
        width: '100%',
        maxWidth: 520,
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Modal top glow hairline */}
        <div style={{
          height: 1,
          background: `linear-gradient(90deg, transparent, ${color}CC, ${color}, ${color}CC, transparent)`,
          boxShadow: `0 0 12px ${color}80`,
          flexShrink: 0,
        }} />

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              fontFamily: '"Orbitron", monospace',
              fontWeight: 900,
              fontSize: 16,
              color,
              letterSpacing: '0.12em',
              filter: `drop-shadow(0 0 10px ${color}60)`,
            }}>
              {goal ? 'EDIT GOAL' : 'NEW GOAL'}
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 4, lineHeight: 1 }}
              onMouseEnter={e => { e.currentTarget.style.color = '#e2e8f0' }}
              onMouseLeave={e => { e.currentTarget.style.color = MUTED }}
            >
              <XIcon size={18} />
            </button>
          </div>

          {/* Title */}
          <div>
            <label style={labelStyle}>Title *</label>
            <input
              type="text"
              placeholder="e.g. Reach 78kg body weight"
              value={form.title}
              onChange={e => setField('title', e.target.value)}
              style={{ ...inputStyle(color), borderColor: `${color}40` }}
              onFocus={e => { e.currentTarget.style.borderColor = color }}
              onBlur={e => { e.currentTarget.style.borderColor = `${color}40` }}
            />
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category</label>
            <select
              value={form.category}
              onChange={e => setField('category', e.target.value)}
              style={{ ...inputStyle(color), borderColor: `${color}40` }}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Target description */}
          <div>
            <label style={labelStyle}>Target description</label>
            <input
              type="text"
              placeholder="What does success look like?"
              value={form.target}
              onChange={e => setField('target', e.target.value)}
              style={{ ...inputStyle(color), borderColor: `${color}30` }}
              onFocus={e => { e.currentTarget.style.borderColor = color }}
              onBlur={e => { e.currentTarget.style.borderColor = `${color}30` }}
            />
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => setField('startDate', e.target.value)}
                style={{ ...inputStyle(color), borderColor: `${color}30`, fontSize: 13 }}
              />
            </div>
            <div>
              <label style={labelStyle}>End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => setField('endDate', e.target.value)}
                style={{ ...inputStyle(color), borderColor: `${color}30`, fontSize: 13 }}
              />
            </div>
          </div>

          {/* Linked Metric */}
          <div style={{ display: 'grid', gridTemplateColumns: form.linkedMetric ? '1fr 1fr' : '1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Link to Daily Metric</label>
              <select
                value={form.linkedMetric}
                onChange={e => {
                  setField('linkedMetric', e.target.value)
                  if (!e.target.value) setField('metricTarget', null)
                }}
                style={{ ...inputStyle(color), borderColor: `${color}30`, fontSize: 13 }}
              >
                {LINKED_METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            {form.linkedMetric && (
              <div>
                <label style={labelStyle}>
                  Target Value ({LINKED_METRICS.find(m => m.key === form.linkedMetric)?.unit || ''})
                </label>
                <input
                  type="number"
                  placeholder="e.g. 8"
                  value={form.metricTarget ?? ''}
                  onChange={e => setField('metricTarget', e.target.value ? +e.target.value : null)}
                  style={{ ...inputStyle(color), borderColor: `${color}30`, fontSize: 13 }}
                />
              </div>
            )}
          </div>

          {/* Milestones */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={labelStyle}>Milestones</label>
              <button
                onClick={addMilestone}
                style={{
                  background: `${GOLD}15`,
                  border: `1px solid ${GOLD}44`,
                  borderRadius: 7,
                  color: GOLD,
                  fontSize: 11,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 700,
                  padding: '4px 11px',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${GOLD}25`; e.currentTarget.style.boxShadow = `0 0 10px ${GOLD}30` }}
                onMouseLeave={e => { e.currentTarget.style.background = `${GOLD}15`; e.currentTarget.style.boxShadow = 'none' }}
              >
                + Add Milestone
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.milestones.map(m => (
                <div key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="date"
                    value={m.date}
                    onChange={e => updateMilestone(m.id, 'date', e.target.value)}
                    style={{
                      background: 'rgba(4,6,20,0.8)',
                      border: `1px solid ${MUTED}40`,
                      borderRadius: 7,
                      padding: '7px 8px',
                      fontSize: 12,
                      color: '#fff',
                      fontFamily: 'Inter, sans-serif',
                      outline: 'none',
                      width: 130,
                      flexShrink: 0,
                      colorScheme: 'dark',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={m.description}
                    onChange={e => updateMilestone(m.id, 'description', e.target.value)}
                    style={{
                      flex: 1,
                      background: 'rgba(4,6,20,0.8)',
                      border: `1px solid ${MUTED}40`,
                      borderRadius: 7,
                      padding: '7px 10px',
                      fontSize: 12,
                      color: '#fff',
                      fontFamily: 'Inter, sans-serif',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => deleteMilestone(m.id)}
                    style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 4, lineHeight: 1, flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.color = RED }}
                    onMouseLeave={e => { e.currentTarget.style.color = MUTED }}
                  >
                    <TrashIcon size={13} />
                  </button>
                </div>
              ))}
              {form.milestones.length === 0 && (
                <div style={{ fontSize: 12, color: MUTED, fontFamily: 'Inter, sans-serif', fontStyle: 'italic' }}>
                  No milestones yet.
                </div>
              )}
            </div>
          </div>

          {/* Tasks */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={labelStyle}>Tasks</label>
              <button
                onClick={addTask}
                style={{
                  background: `${CYAN}15`,
                  border: `1px solid ${CYAN}44`,
                  borderRadius: 7,
                  color: CYAN,
                  fontSize: 11,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 700,
                  padding: '4px 11px',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${CYAN}25`; e.currentTarget.style.boxShadow = `0 0 10px ${CYAN}30` }}
                onMouseLeave={e => { e.currentTarget.style.background = `${CYAN}15`; e.currentTarget.style.boxShadow = 'none' }}
              >
                + Add Task
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.tasks.map(t => (
                <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Task description"
                    value={t.text}
                    onChange={e => updateTask(t.id, 'text', e.target.value)}
                    style={{
                      flex: 1,
                      background: 'rgba(4,6,20,0.8)',
                      border: `1px solid ${MUTED}40`,
                      borderRadius: 7,
                      padding: '7px 10px',
                      fontSize: 12,
                      color: '#fff',
                      fontFamily: 'Inter, sans-serif',
                      outline: 'none',
                    }}
                  />
                  <select
                    value={t.frequency}
                    onChange={e => updateTask(t.id, 'frequency', e.target.value)}
                    style={{
                      background: 'rgba(4,6,20,0.8)',
                      border: `1px solid ${MUTED}40`,
                      borderRadius: 7,
                      padding: '7px 8px',
                      fontSize: 12,
                      color: '#fff',
                      fontFamily: 'Inter, sans-serif',
                      outline: 'none',
                      width: 82,
                      flexShrink: 0,
                    }}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                  <button
                    onClick={() => deleteTask(t.id)}
                    style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 4, lineHeight: 1, flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.color = RED }}
                    onMouseLeave={e => { e.currentTarget.style.color = MUTED }}
                  >
                    <TrashIcon size={13} />
                  </button>
                </div>
              ))}
              {form.tasks.length === 0 && (
                <div style={{ fontSize: 12, color: MUTED, fontFamily: 'Inter, sans-serif', fontStyle: 'italic' }}>
                  No tasks yet.
                </div>
              )}
            </div>
          </div>

          {/* Save / Cancel */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                background: 'transparent',
                border: `1px solid ${MUTED}50`,
                borderRadius: 10,
                color: TEXT2,
                fontSize: 14,
                fontFamily: 'Inter, sans-serif',
                padding: '11px 0',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = MUTED; e.currentTarget.style.color = '#e2e8f0' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = `${MUTED}50`; e.currentTarget.style.color = TEXT2 }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.title.trim()}
              style={{
                flex: 1,
                background: form.title.trim()
                  ? `linear-gradient(135deg, ${color}, ${color}cc)`
                  : `${color}33`,
                border: 'none',
                borderRadius: 10,
                color: form.title.trim() ? '#0d0b06' : `${color}88`,
                fontSize: 14,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                padding: '11px 0',
                cursor: form.title.trim() ? 'pointer' : 'not-allowed',
                boxShadow: form.title.trim() ? `0 0 20px ${color}40` : 'none',
                transition: 'all 0.2s',
                letterSpacing: '0.04em',
              }}
            >
              {goal ? 'Save Changes' : 'Create Goal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Goals() {
  const [goals, setGoals]   = useLocalStorage('marko_goals', [])
  const [dailyData]         = useLocalStorage('marko_daily', { logs: {} })
  const [activeFilter, setActiveFilter] = useState('All')
  const [showModal, setShowModal]       = useState(false)
  const [editingGoal, setEditingGoal]   = useState(null)

  const activeGoals = useMemo(
    () => (goals || []).filter(g => !g.archived),
    [goals]
  )

  const filteredGoals = useMemo(
    () =>
      activeFilter === 'All'
        ? activeGoals
        : activeGoals.filter(g => g.category === activeFilter),
    [activeGoals, activeFilter]
  )

  const openAdd  = () => { setEditingGoal(null); setShowModal(true) }
  const openEdit = goal => { setEditingGoal(goal); setShowModal(true) }

  const handleSave = formData => {
    if (editingGoal) {
      setGoals(prev => (prev || []).map(g => g.id === editingGoal.id ? { ...g, ...formData } : g))
    } else {
      const newGoal = { ...formData, id: uid(), archived: false }
      setGoals(prev => [...(prev || []), newGoal])
    }
    setShowModal(false)
    setEditingGoal(null)
  }

  const handleArchive = goalId => {
    setGoals(prev => (prev || []).map(g => g.id === goalId ? { ...g, archived: true } : g))
  }

  const handleToggleTask = (goalId, taskId) => {
    setGoals(prev =>
      (prev || []).map(g =>
        g.id !== goalId
          ? g
          : { ...g, tasks: (g.tasks || []).map(t => t.id === taskId ? { ...t, completed: !t.completed } : t) }
      )
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '32px 28px 60px', boxSizing: 'border-box' }}>
      {/* Pulse keyframe injection */}
      <style>{`
        @keyframes goalPulse {
          0%, 100% { box-shadow: 0 0 0 3px #f0c04055, 0 0 8px 2px #f0c04066; }
          50%       { box-shadow: 0 0 0 5px #f0c04033, 0 0 14px 4px #f0c04099; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 16 }}>
        <div>
          <h1 style={{
            fontFamily: '"Orbitron", monospace',
            fontSize: 44,
            fontWeight: 900,
            background: 'linear-gradient(135deg, #f0c040 0%, #e879f9 55%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '0.02em',
            margin: 0,
            lineHeight: 1,
          }}>
            GOALS
          </h1>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 11,
            letterSpacing: '0.16em',
            color: MUTED,
            margin: '10px 0 0',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            SET TARGETS · TRACK MILESTONES · COMPOUND DAILY
          </p>
        </div>

        {/* Add Goal button — gradient glow style */}
        <button
          onClick={openAdd}
          style={{
            background: 'linear-gradient(135deg, #f0c040 0%, #e879f9 100%)',
            border: 'none',
            borderRadius: 10,
            color: '#0d0b06',
            fontSize: 13,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 800,
            padding: '11px 20px',
            cursor: 'pointer',
            flexShrink: 0,
            letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
            marginTop: 4,
            boxShadow: '0 0 24px #f0c04040, 0 4px 16px rgba(0,0,0,0.4)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = '0 0 36px #f0c04060, 0 4px 20px rgba(0,0,0,0.5)'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = '0 0 24px #f0c04040, 0 4px 16px rgba(0,0,0,0.4)'
            e.currentTarget.style.transform = 'none'
          }}
        >
          + Add Goal
        </button>
      </div>

      {/* ── Category filter ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {['All', ...CATEGORIES].map(cat => {
          const isActive = activeFilter === cat
          const color    = cat === 'All' ? GOLD : (CATEGORY_COLORS[cat] || CATEGORY_COLORS.Custom)
          return (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              style={{
                background: isActive ? `${color}22` : 'transparent',
                border: `1px solid ${isActive ? color : `${MUTED}50`}`,
                borderRadius: 20,
                color: isActive ? color : MUTED,
                fontSize: 11,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '5px 15px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: isActive ? `0 0 12px ${color}30` : 'none',
              }}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {/* ── Goals grid / empty state ── */}
      {filteredGoals.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 320,
          gap: 12,
        }}>
          <div style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 900,
            fontSize: 28,
            color: `${MUTED}60`,
            letterSpacing: '0.12em',
          }}>
            NO ACTIVE GOALS
          </div>
          <div style={{ fontSize: 13, color: MUTED, fontFamily: 'Inter, sans-serif' }}>
            Set your first target to start tracking progress
          </div>
          <button
            onClick={openAdd}
            style={{
              marginTop: 8,
              background: `${GOLD}15`,
              border: `1px solid ${GOLD}50`,
              borderRadius: 10,
              color: GOLD,
              fontSize: 13,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              padding: '10px 22px',
              cursor: 'pointer',
              letterSpacing: '0.05em',
              boxShadow: `0 0 16px ${GOLD}20`,
            }}
          >
            + Add Goal
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 18,
        }}>
          {filteredGoals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={openEdit}
              onArchive={handleArchive}
              onToggleTask={handleToggleTask}
              dailyData={dailyData}
            />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <GoalModal
          goal={editingGoal}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingGoal(null) }}
        />
      )}
    </div>
  )
}
