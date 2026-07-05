import { useState, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { today } from '../utils'

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
const GOLD = '#f0c040'
const BLUE = '#60a5fa'
const GREEN = '#2dd4bf'
const RED = '#ff5555'
const TEXT2 = '#94a3b8'
const MUTED = '#64748b'
const BORDER = 'rgba(99,102,241,0.18)'
const CARD = 'rgba(8,12,26,0.65)'
const BG = 'transparent'

const CATEGORIES = ['Body', 'Business', 'Mind', 'Daily', 'Custom']

const CATEGORY_COLORS = {
  Body: GREEN,
  Business: BLUE,
  Mind: '#e879f9',
  Daily: '#a855f7',
  Custom: '#22d3ee',
}

// ── Input / label class helpers ────────────────────────────────────────────────
const INPUT_CLS = 'w-full rounded-lg px-3 py-2 text-sm text-white placeholder-[#64748b] focus:outline-none transition-colors' // styled inline
  'w-full bg-[#040810] border border-[#1e3050] rounded px-3 py-2 text-sm text-white placeholder-[#7a95c0] focus:outline-none focus:border-[#f0c040] transition-colors'
const LABEL_CLS = 'block text-[9px] font-mono uppercase tracking-widest text-[#a0bcdf] mb-1.5'

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
  const end = new Date(goal.endDate + 'T00:00:00')
  const now = new Date()

  const totalMs = end - start
  const elapsedMs = now - start

  const pct = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100))

  const daysLeft = Math.ceil((end - now) / 86400000)

  const milestonePositions = (goal.milestones || []).map(m => {
    const mDate = new Date(m.date + 'T00:00:00')
    const mPct = Math.min(100, Math.max(0, ((mDate - start) / totalMs) * 100))
    return { ...m, pct: mPct }
  })

  // Find next upcoming milestone (closest future date not yet achieved)
  const nowStr = now.toISOString().split('T')[0]
  const upcoming = milestonePositions
    .filter(m => !m.achieved && m.date >= nowStr)
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  return { pct, daysLeft, milestonePositions, upcomingId: upcoming?.id ?? null }
}

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusLabel({ daysLeft }) {
  if (daysLeft > 0) {
    return (
      <div style={{ textAlign: 'center', lineHeight: 1 }}>
        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: 32,
            color: GOLD,
          }}
        >
          {daysLeft}
        </div>
        <div style={{ fontSize: 9, letterSpacing: '0.1em', color: MUTED, fontFamily: 'Inter, sans-serif' }}>
          DAYS LEFT
        </div>
      </div>
    )
  }
  if (daysLeft === 0) {
    return (
      <div
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 900,
          fontSize: 18,
          color: GREEN,
        }}
      >
        TODAY
      </div>
    )
  }
  // past
  const allAchieved =
    true // we determine this from the parent; for display just show OVERDUE
  return (
    <div
      style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 900,
        fontSize: 18,
        color: RED,
      }}
    >
      OVERDUE
    </div>
  )
}

// ── Progress bar with milestone dots ──────────────────────────────────────────
function TimelineBar({ pct, milestonePositions, upcomingId }) {
  return (
    <div style={{ position: 'relative', height: 24, display: 'flex', alignItems: 'center' }}>
      {/* Track */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: 6,
          background: 'rgba(99,102,241,0.15)',
          borderRadius: 3,
          overflow: 'visible',
        }}
      >
        {/* Fill */}
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: BLUE,
            borderRadius: 3,
            transition: 'width 0.5s ease',
          }}
        />
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
              border: `2px solid ${BG}`,
              zIndex: 2,
              cursor: 'default',
              boxShadow: isUpcoming
                ? `0 0 0 3px ${GOLD}55, 0 0 8px 2px ${GOLD}88`
                : 'none',
              animation: isUpcoming ? 'goalPulse 1.8s ease-in-out infinite' : 'none',
            }}
          />
        )
      })}
    </div>
  )
}

// ── Metric auto-progress ───────────────────────────────────────────────────────
function getMetricProgress(goal, dailyData) {
  if (!goal.linkedMetric || goal.metricTarget == null || !dailyData?.logs) return null
  const logs = dailyData.logs
  const now = new Date()
  const vals = []
  for (let i = 0; i < 30; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const ds = d.toISOString().split('T')[0]
    const v = (logs[ds] || {})[goal.linkedMetric]
    if (v != null) vals.push(+v)
  }
  if (!vals.length) return null
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  const pct = Math.min(100, (avg / goal.metricTarget) * 100)
  const metricInfo = LINKED_METRICS.find(m => m.key === goal.linkedMetric)
  return { avg, pct, metricInfo, n: vals.length }
}

// ── Goal Card ──────────────────────────────────────────────────────────────────
function GoalCard({ goal, onEdit, onArchive, onToggleTask, dailyData }) {
  const { pct, daysLeft, milestonePositions, upcomingId } = calcTimeline(goal)
  const catColor = CATEGORY_COLORS[goal.category] || CATEGORY_COLORS.Custom
  const tasks = goal.tasks || []
  const metricProgress = getMetricProgress(goal, dailyData)

  return (
    <div
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Top row: title + status */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Category tag */}
          <span
            style={{
              display: 'inline-block',
              fontSize: 9,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: catColor,
              border: `1px solid ${catColor}44`,
              borderRadius: 4,
              padding: '1px 6px',
              marginBottom: 6,
            }}
          >
            {goal.category}
          </span>

          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900,
              fontSize: 18,
              color: '#fff',
              lineHeight: 1.2,
              wordBreak: 'break-word',
            }}
          >
            {goal.title}
          </div>

          {goal.target && (
            <div style={{ fontSize: 12, color: TEXT2, marginTop: 2, fontFamily: 'Inter, sans-serif' }}>
              {goal.target}
            </div>
          )}
          {metricProgress && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, color: MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  30d avg — {metricProgress.metricInfo?.label || goal.linkedMetric}
                </span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 17, color: metricProgress.pct >= 100 ? GREEN : catColor }}>
                  {metricProgress.avg.toFixed(1)}
                  <span style={{ fontSize: 9, color: MUTED, fontWeight: 400 }}> / {goal.metricTarget}{metricProgress.metricInfo?.unit}</span>
                </span>
              </div>
              <div style={{ height: 5, background: 'rgba(99,102,241,0.12)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${metricProgress.pct}%`, borderRadius: 3,
                  background: metricProgress.pct >= 100 ? GREEN : `linear-gradient(90deg, ${catColor}88, ${catColor})`,
                  boxShadow: `0 0 8px ${catColor}55`, transition: 'width 0.6s ease',
                }} />
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, color: MUTED, textAlign: 'right', marginTop: 2 }}>
                {Math.round(metricProgress.pct)}% of target · {metricProgress.n}d sample
              </div>
            </div>
          )}
        </div>

        {/* Days remaining */}
        <div style={{ flexShrink: 0 }}>
          <StatusLabel daysLeft={daysLeft} />
        </div>
      </div>

      {/* Timeline bar */}
      <TimelineBar pct={pct} milestonePositions={milestonePositions} upcomingId={upcomingId} />

      {/* Progress label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: MUTED, fontFamily: 'Inter, sans-serif', marginTop: -4 }}>
        <span>{goal.startDate}</span>
        <span style={{ color: BLUE }}>{Math.round(pct)}% elapsed</span>
        <span>{goal.endDate}</span>
      </div>

      {/* Milestones list */}
      {goal.milestones?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.12em', color: MUTED, fontFamily: 'Inter, sans-serif', fontWeight: 700, textTransform: 'uppercase' }}>
            Milestones
          </div>
          {goal.milestones.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontFamily: 'Inter, sans-serif', color: m.achieved ? GREEN : TEXT2 }}>
              <span style={{ fontSize: 8, color: m.achieved ? GREEN : GOLD }}>
                {m.achieved ? '●' : '◦'}
              </span>
              <span style={{ flex: 1 }}>{m.description}</span>
              <span style={{ color: MUTED, fontSize: 10 }}>{m.date}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tasks */}
      {tasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.12em', color: MUTED, fontFamily: 'Inter, sans-serif', fontWeight: 700, textTransform: 'uppercase' }}>
            Tasks
          </div>
          {tasks.map(task => (
            <label
              key={task.id}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}
            >
              <input
                type="checkbox"
                checked={!!task.completed}
                onChange={() => onToggleTask(goal.id, task.id)}
                style={{ accentColor: GOLD, width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontFamily: 'Inter, sans-serif',
                  color: task.completed ? MUTED : '#e2e8f0',
                  textDecoration: task.completed ? 'line-through' : 'none',
                  flex: 1,
                }}
              >
                {task.text}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontFamily: 'Inter, sans-serif',
                  color: task.frequency === 'daily' ? BLUE : '#a855f7',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {task.frequency}
              </span>
            </label>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          onClick={() => onEdit(goal)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: 'transparent',
            border: `1px solid ${BORDER}`,
            borderRadius: 6,
            color: TEXT2,
            fontSize: 12,
            fontFamily: 'Inter, sans-serif',
            padding: '5px 10px',
            cursor: 'pointer',
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.color = GOLD }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT2 }}
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
            border: `1px solid ${BORDER}`,
            borderRadius: 6,
            color: TEXT2,
            fontSize: 12,
            fontFamily: 'Inter, sans-serif',
            padding: '5px 10px',
            cursor: 'pointer',
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = MUTED; e.currentTarget.style.color = '#e2e8f0' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT2 }}
        >
          <ArchiveIcon size={12} /> Archive
        </button>
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

// ── Add/Edit modal ─────────────────────────────────────────────────────────────
function GoalModal({ goal, onSave, onClose }) {
  const [form, setForm] = useState(() =>
    goal
      ? {
          title: goal.title,
          category: goal.category,
          target: goal.target,
          startDate: goal.startDate,
          endDate: goal.endDate,
          milestones: goal.milestones.map(m => ({ ...m })),
          tasks: goal.tasks.map(t => ({ ...t })),
          archived: goal.archived,
          linkedMetric: goal.linkedMetric || '',
          metricTarget: goal.metricTarget ?? null,
        }
      : emptyGoal()
  )

  const setField = (field, value) => setForm(f => ({ ...f, [field]: value }))

  // Milestones
  const addMilestone = () => setForm(f => ({ ...f, milestones: [...f.milestones, emptyMilestone()] }))
  const updateMilestone = (id, field, value) =>
    setForm(f => ({ ...f, milestones: f.milestones.map(m => m.id === id ? { ...m, [field]: value } : m) }))
  const deleteMilestone = id =>
    setForm(f => ({ ...f, milestones: f.milestones.filter(m => m.id !== id) }))

  // Tasks
  const addTask = () => setForm(f => ({ ...f, tasks: [...f.tasks, emptyTask()] }))
  const updateTask = (id, field, value) =>
    setForm(f => ({ ...f, tasks: f.tasks.map(t => t.id === id ? { ...t, [field]: value } : t) }))
  const deleteTask = id =>
    setForm(f => ({ ...f, tasks: f.tasks.filter(t => t.id !== id) }))

  const handleSave = () => {
    if (!form.title.trim()) return
    onSave(form)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900,
              fontSize: 20,
              color: '#fff',
              letterSpacing: '0.04em',
            }}
          >
            {goal ? 'EDIT GOAL' : 'NEW GOAL'}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 4, lineHeight: 1 }}
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Title */}
        <div>
          <label className={LABEL_CLS} style={{ display: 'block', fontSize: 9, fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TEXT2, marginBottom: 6 }}>
            Title *
          </label>
          <input
            type="text"
            placeholder="e.g. Reach 78kg body weight"
            value={form.title}
            onChange={e => setField('title', e.target.value)}
            style={{
              width: '100%',
              background: '#040810',
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: 14,
              color: '#fff',
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Category */}
        <div>
          <label style={{ display: 'block', fontSize: 9, fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TEXT2, marginBottom: 6 }}>
            Category
          </label>
          <select
            value={form.category}
            onChange={e => setField('category', e.target.value)}
            style={{
              width: '100%',
              background: '#040810',
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: 14,
              color: '#fff',
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Target description */}
        <div>
          <label style={{ display: 'block', fontSize: 9, fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TEXT2, marginBottom: 6 }}>
            Target description
          </label>
          <input
            type="text"
            placeholder="What does success look like?"
            value={form.target}
            onChange={e => setField('target', e.target.value)}
            style={{
              width: '100%',
              background: '#040810',
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: 14,
              color: '#fff',
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 9, fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TEXT2, marginBottom: 6 }}>
              Start Date
            </label>
            <input
              type="date"
              value={form.startDate}
              onChange={e => setField('startDate', e.target.value)}
              style={{
                width: '100%',
                background: '#040810',
                border: `1px solid ${BORDER}`,
                borderRadius: 6,
                padding: '8px 10px',
                fontSize: 13,
                color: '#fff',
                fontFamily: 'Inter, sans-serif',
                outline: 'none',
                boxSizing: 'border-box',
                colorScheme: 'dark',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 9, fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TEXT2, marginBottom: 6 }}>
              End Date
            </label>
            <input
              type="date"
              value={form.endDate}
              onChange={e => setField('endDate', e.target.value)}
              style={{
                width: '100%',
                background: '#040810',
                border: `1px solid ${BORDER}`,
                borderRadius: 6,
                padding: '8px 10px',
                fontSize: 13,
                color: '#fff',
                fontFamily: 'Inter, sans-serif',
                outline: 'none',
                boxSizing: 'border-box',
                colorScheme: 'dark',
              }}
            />
          </div>
        </div>

        {/* Linked Metric */}
        <div style={{ display: 'grid', gridTemplateColumns: form.linkedMetric ? '1fr 1fr' : '1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 9, fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TEXT2, marginBottom: 6 }}>
              Link to Daily Metric
            </label>
            <select
              value={form.linkedMetric}
              onChange={e => { setField('linkedMetric', e.target.value); if (!e.target.value) setField('metricTarget', null) }}
              style={{ width: '100%', background: '#040810', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#fff', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
            >
              {LINKED_METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
          {form.linkedMetric && (
            <div>
              <label style={{ display: 'block', fontSize: 9, fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TEXT2, marginBottom: 6 }}>
                Target Value ({LINKED_METRICS.find(m => m.key === form.linkedMetric)?.unit || ''})
              </label>
              <input
                type="number"
                placeholder="e.g. 8"
                value={form.metricTarget ?? ''}
                onChange={e => setField('metricTarget', e.target.value ? +e.target.value : null)}
                style={{ width: '100%', background: '#040810', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#fff', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}
        </div>

        {/* Milestones */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <label style={{ fontSize: 9, fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TEXT2 }}>
              Milestones
            </label>
            <button
              onClick={addMilestone}
              style={{
                background: `${GOLD}18`,
                border: `1px solid ${GOLD}44`,
                borderRadius: 6,
                color: GOLD,
                fontSize: 11,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                padding: '3px 10px',
                cursor: 'pointer',
              }}
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
                    background: '#040810',
                    border: `1px solid ${BORDER}`,
                    borderRadius: 6,
                    padding: '6px 8px',
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
                    background: '#040810',
                    border: `1px solid ${BORDER}`,
                    borderRadius: 6,
                    padding: '6px 10px',
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
            <label style={{ fontSize: 9, fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TEXT2 }}>
              Tasks
            </label>
            <button
              onClick={addTask}
              style={{
                background: `${BLUE}18`,
                border: `1px solid ${BLUE}44`,
                borderRadius: 6,
                color: BLUE,
                fontSize: 11,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                padding: '3px 10px',
                cursor: 'pointer',
              }}
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
                    background: '#040810',
                    border: `1px solid ${BORDER}`,
                    borderRadius: 6,
                    padding: '6px 10px',
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
                    background: '#040810',
                    border: `1px solid ${BORDER}`,
                    borderRadius: 6,
                    padding: '6px 8px',
                    fontSize: 12,
                    color: '#fff',
                    fontFamily: 'Inter, sans-serif',
                    outline: 'none',
                    width: 80,
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

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: 'transparent',
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              color: TEXT2,
              fontSize: 14,
              fontFamily: 'Inter, sans-serif',
              padding: '10px 0',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = MUTED }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.title.trim()}
            style={{
              flex: 1,
              background: form.title.trim() ? GOLD : `${GOLD}55`,
              border: 'none',
              borderRadius: 8,
              color: form.title.trim() ? '#0d0b06' : '#6b5a2a',
              fontSize: 14,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              padding: '10px 0',
              cursor: form.title.trim() ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
            }}
          >
            {goal ? 'Save Changes' : 'Create Goal'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Goals() {
  const [goals, setGoals] = useLocalStorage('marko_goals', [])
  const [dailyData]       = useLocalStorage('marko_daily', { logs: {} })
  const [activeFilter, setActiveFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null) // null = new goal

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

  const openAdd = () => {
    setEditingGoal(null)
    setShowModal(true)
  }

  const openEdit = goal => {
    setEditingGoal(goal)
    setShowModal(true)
  }

  const handleSave = formData => {
    if (editingGoal) {
      setGoals(prev =>
        (prev || []).map(g => g.id === editingGoal.id ? { ...g, ...formData } : g)
      )
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
          : {
              ...g,
              tasks: (g.tasks || []).map(t =>
                t.id === taskId ? { ...t, completed: !t.completed } : t
              ),
            }
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16 }}>
        <div>
          <h1
            style={{
              fontFamily: "'Orbitron', 'Barlow Condensed', sans-serif",
              fontWeight: 900,
              fontStyle: 'italic',
              fontSize: 48,
              margin: 0,
              lineHeight: 1,
              background: `linear-gradient(90deg, ${GOLD} 0%, ${BLUE} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            GOALS &amp; MILESTONES
          </h1>
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 11,
              letterSpacing: '0.14em',
              color: MUTED,
              margin: '8px 0 0',
              textTransform: 'uppercase',
            }}
          >
            SET TARGETS · TRACK MILESTONES · COMPOUND DAILY
          </p>
        </div>

        <button
          onClick={openAdd}
          style={{
            background: GOLD,
            border: 'none',
            borderRadius: 8,
            color: '#0d0b06',
            fontSize: 13,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            padding: '10px 18px',
            cursor: 'pointer',
            flexShrink: 0,
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            marginTop: 6,
          }}
        >
          + Add Goal
        </button>
      </div>

      {/* ── Category filter ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {['All', ...CATEGORIES].map(cat => {
          const isActive = activeFilter === cat
          const color = cat === 'All' ? GOLD : (CATEGORY_COLORS[cat] || CATEGORY_COLORS.Custom)
          return (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              style={{
                background: isActive ? `${color}22` : 'transparent',
                border: `1px solid ${isActive ? color : BORDER}`,
                borderRadius: 20,
                color: isActive ? color : MUTED,
                fontSize: 11,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '5px 14px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {/* ── Goals grid / empty state ── */}
      {filteredGoals.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 320,
            gap: 12,
          }}
        >
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900,
              fontSize: 28,
              color: BORDER,
              letterSpacing: '0.12em',
            }}
          >
            NO ACTIVE GOALS
          </div>
          <div style={{ fontSize: 13, color: MUTED, fontFamily: 'Inter, sans-serif' }}>
            Set your first target to start tracking progress
          </div>
          <button
            onClick={openAdd}
            style={{
              marginTop: 8,
              background: `${GOLD}18`,
              border: `1px solid ${GOLD}55`,
              borderRadius: 8,
              color: GOLD,
              fontSize: 13,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              padding: '9px 20px',
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            + Add Goal
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 18,
          }}
        >
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
