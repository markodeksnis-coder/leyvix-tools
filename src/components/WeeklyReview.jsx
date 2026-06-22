import { useState, useMemo, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { calcDayScore, getWinDaySettings } from '../utils/winLoss'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const BG     = '#030311'
const CARD   = '#0d0d28'
const BORDER = '#1d1d4a'
const GOLD   = '#c9a84c'
const RED    = '#ef4444'
const GREEN  = '#10b981'
const BLUE   = '#3b82f6'
const MUTED  = '#64748b'
const TEXT2  = '#94a3b8'
const NAVY   = '#0d0d28'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getISOWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    )
  )
}

function getWeekDates() {
  const today = new Date()
  const dow = today.getDay()
  const mon = new Date(today)
  mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
  mon.setHours(0, 0, 0, 0)
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates // Mon → Sun
}

function getPrevWeekDates() {
  const dates = getWeekDates()
  return dates.map((ds) => {
    const d = new Date(ds + 'T12:00:00')
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  })
}

function fmtDate(ds) {
  if (!ds) return '—'
  return new Date(ds + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── AI summary ────────────────────────────────────────────────────────────────

async function generateWeeklySummary(weekData, q1, q2, q3) {
  const apiKey =
    localStorage.getItem('anthropic_key') ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANTHROPIC_API_KEY) ||
    ''

  if (!apiKey) {
    return `Week ${weekData.weekNumber}: ${weekData.wins} wins, ${weekData.losses} losses. Avg score ${weekData.weeklyScoreAvg}%.`
  }

  const prompt = `Weekly performance data: ${weekData.wins} WIN days, ${weekData.losses} LOSS days, avg score ${weekData.weeklyScoreAvg}%. What worked: "${q1}". What failed: "${q2}". Commitment: "${q3}". Write ONE punchy sentence (max 20 words) summarizing this week like a direct coach. No fluff.`

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
        max_tokens: 80,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    return data.content?.[0]?.text?.trim() || `Week ${weekData.weekNumber} logged.`
  } catch {
    return `Week ${weekData.weekNumber}: ${weekData.wins} wins, ${weekData.losses} losses.`
  }
}

// ─── Compute week data ─────────────────────────────────────────────────────────

function computeWeekData(weekDates, prevWeekDates, settings, dailyData, bodyData, dietData) {
  // Score each day
  const dayScores = weekDates.map((ds) => ({
    date: ds,
    ...calcDayScore(ds, settings, dailyData, bodyData, dietData),
  }))
  const prevDayScores = prevWeekDates.map((ds) => ({
    date: ds,
    ...calcDayScore(ds, settings, dailyData, bodyData, dietData),
  }))

  const daysWithData     = dayScores.filter((d) => d.available > 0)
  const prevDaysWithData = prevDayScores.filter((d) => d.available > 0)

  const wins   = daysWithData.filter((d) => d.isWin).length
  const losses = daysWithData.filter((d) => !d.isWin).length

  // Best / worst day
  const sorted = [...daysWithData].sort((a, b) => b.pct - a.pct)
  const bestDay  = sorted[0]  || null
  const worstDay = sorted[sorted.length - 1] || null

  const weeklyScoreAvg =
    daysWithData.length > 0
      ? Math.round(daysWithData.reduce((s, d) => s + d.pct, 0) / daysWithData.length)
      : 0

  const prevWeeklyScoreAvg =
    prevDaysWithData.length > 0
      ? Math.round(prevDaysWithData.reduce((s, d) => s + d.pct, 0) / prevDaysWithData.length)
      : 0

  // Gym sessions
  const liftSessions = bodyData?.liftSessions || []
  const gymThisWeek  = liftSessions.filter((s) => weekDates.includes(s.date)).length
  const gymPrevWeek  = liftSessions.filter((s) => prevWeekDates.includes(s.date)).length

  // Steps
  const logs = dailyData?.logs || {}
  const stepsThisWeek = weekDates
    .map((ds) => logs[ds]?.steps)
    .filter((v) => v != null)
  const stepsPrevWeek = prevWeekDates
    .map((ds) => logs[ds]?.steps)
    .filter((v) => v != null)

  const avgStepsThis =
    stepsThisWeek.length > 0
      ? Math.round(stepsThisWeek.reduce((s, v) => s + v, 0) / stepsThisWeek.length)
      : null
  const avgStepsPrev =
    stepsPrevWeek.length > 0
      ? Math.round(stepsPrevWeek.reduce((s, v) => s + v, 0) / stepsPrevWeek.length)
      : null

  // Weight change (first vs last reading this week)
  const weightHistory = bodyData?.weightHistory || []
  const weekWeights = weekDates
    .map((ds) => weightHistory.find((w) => w.date === ds))
    .filter(Boolean)
    .map((w) => parseFloat(w.weight))
    .filter((v) => !isNaN(v))

  const weightStart = weekWeights[0]  ?? null
  const weightEnd   = weekWeights[weekWeights.length - 1] ?? null
  const weightDelta =
    weightStart != null && weightEnd != null
      ? Math.round((weightEnd - weightStart) * 10) / 10
      : null

  // Week meta
  const weekNumber    = getISOWeek(new Date(weekDates[0] + 'T12:00:00'))
  const weekStartDate = weekDates[0]
  const weekEndDate   = weekDates[6]

  return {
    weekNumber,
    weekStartDate,
    weekEndDate,
    wins,
    losses,
    bestDayDate:  bestDay?.date  || null,
    bestDayPct:   bestDay?.pct   ?? null,
    worstDayDate: worstDay?.date || null,
    worstDayPct:  worstDay?.pct  ?? null,
    weeklyScoreAvg,
    prevWeekScoreAvg: prevWeeklyScoreAvg,
    gymThisWeek,
    gymPrevWeek,
    avgStepsThis,
    avgStepsPrev,
    weightDelta,
    dayScores,  // full array for bar chart
  }
}

// ─── Delta arrow ───────────────────────────────────────────────────────────────

function DeltaArrow({ current, prev, unit = '', suffix = '', higherIsBetter = true }) {
  if (current == null || prev == null) return <span style={{ color: MUTED, fontSize: 12 }}>—</span>
  const diff = current - prev
  const improved = higherIsBetter ? diff > 0 : diff < 0
  const neutral  = diff === 0

  const color = neutral ? MUTED : improved ? GREEN : RED
  const Icon  = neutral ? Minus : improved ? ArrowUp : ArrowDown
  const sign  = diff > 0 ? '+' : ''

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color, fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
      <Icon size={12} />
      {sign}{diff}{unit} vs prev week{suffix ? ` (${suffix})` : ''}
    </span>
  )
}

// ─── 7-day bar chart (pure CSS divs) ──────────────────────────────────────────

function WeekBarChart({ dayScores }) {
  const maxPct = Math.max(...dayScores.map((d) => d.pct), 1)

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 96, padding: '0 4px' }}>
      {dayScores.map((day, i) => {
        const hasData = day.available > 0
        const barColor = !hasData ? NAVY : day.isWin ? GOLD : RED
        const barHeight = hasData ? Math.max(6, Math.round((day.pct / 100) * 88)) : 6

        return (
          <div
            key={day.date}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 32,
                height: barHeight,
                background: barColor,
                borderRadius: '2px 2px 0 0',
                transition: 'height 0.3s ease',
                opacity: hasData ? 1 : 0.3,
                position: 'relative',
              }}
              title={hasData ? `${day.pct}%` : 'no data'}
            />
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 10,
                color: TEXT2,
                letterSpacing: '0.02em',
              }}
            >
              {DAY_LABELS[i]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Comparison row ────────────────────────────────────────────────────────────

function CompareRow({ label, thisVal, prevVal, unit = '', higherIsBetter = true, formatFn }) {
  const fmt = formatFn || ((v) => (v != null ? `${v}${unit}` : '—'))
  const diff = thisVal != null && prevVal != null ? thisVal - prevVal : null
  const improved  = diff != null && (higherIsBetter ? diff > 0 : diff < 0)
  const worsened  = diff != null && (higherIsBetter ? diff < 0 : diff > 0)
  const arrowColor = improved ? GREEN : worsened ? RED : MUTED

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: TEXT2 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 20, color: '#fff' }}>
          {fmt(thisVal)}
        </span>
        {diff != null && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              color: arrowColor,
              fontSize: 12,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {improved ? <ArrowUp size={11} /> : worsened ? <ArrowDown size={11} /> : <Minus size={11} />}
            {diff > 0 ? '+' : ''}{diff}{unit}
          </span>
        )}
        {diff == null && prevVal != null && (
          <span style={{ color: MUTED, fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
            prev {fmt(prevVal)}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Part 1: Data Summary ──────────────────────────────────────────────────────

function DataSummaryScreen({ weekData, onNext }) {
  const { wins, losses, bestDayDate, bestDayPct, worstDayDate, worstDayPct } = weekData

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '24px 24px 16px', flexShrink: 0 }}>
        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: 11,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: MUTED,
            marginBottom: 4,
          }}
        >
          WEEK {weekData.weekNumber} · {fmtDate(weekData.weekStartDate)} — {fmtDate(weekData.weekEndDate)}
        </div>
        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: 28,
            letterSpacing: '0.1em',
            color: '#fff',
            textTransform: 'uppercase',
          }}
        >
          WEEKLY REVIEW
        </div>
      </div>

      {/* W / L display */}
      <div
        style={{
          padding: '0 24px 20px',
          display: 'flex',
          alignItems: 'baseline',
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: 80,
            lineHeight: 1,
            color: GOLD,
            filter: 'drop-shadow(0 0 20px rgba(201,168,76,0.5))',
          }}
        >
          {wins}W
        </div>
        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: 80,
            lineHeight: 1,
            color: RED,
            filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.4))',
          }}
        >
          {losses}L
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900,
              fontSize: 40,
              lineHeight: 1,
              color: weekData.weeklyScoreAvg >= 80 ? GREEN : weekData.weeklyScoreAvg >= 60 ? GOLD : RED,
            }}
          >
            {weekData.weeklyScoreAvg}%
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: MUTED, letterSpacing: '0.08em' }}>
            AVG SCORE
          </div>
          <DeltaArrow
            current={weekData.weeklyScoreAvg}
            prev={weekData.prevWeekScoreAvg}
            unit="%"
          />
        </div>
      </div>

      {/* 7-day bar chart */}
      <div style={{ padding: '0 24px 20px', flexShrink: 0 }}>
        <div
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: '16px 16px 12px',
          }}
        >
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: MUTED,
              marginBottom: 12,
            }}
          >
            7-DAY BREAKDOWN
          </div>
          <WeekBarChart dayScores={weekData.dayScores} />
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Inter, sans-serif', fontSize: 10, color: TEXT2 }}>
              <div style={{ width: 10, height: 10, background: GOLD, borderRadius: 2 }} /> WIN
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Inter, sans-serif', fontSize: 10, color: TEXT2 }}>
              <div style={{ width: 10, height: 10, background: RED, borderRadius: 2 }} /> LOSS
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Inter, sans-serif', fontSize: 10, color: TEXT2 }}>
              <div style={{ width: 10, height: 10, background: NAVY, border: `1px solid ${BORDER}`, borderRadius: 2 }} /> NO DATA
            </div>
          </div>
        </div>
      </div>

      {/* Best / Worst */}
      <div style={{ padding: '0 24px 16px', display: 'flex', gap: 12, flexShrink: 0 }}>
        <div
          style={{
            flex: 1,
            background: CARD,
            border: `1px solid ${GREEN}40`,
            borderTop: `2px solid ${GREEN}`,
            borderRadius: 10,
            padding: '12px 14px',
          }}
        >
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: 600, letterSpacing: '0.2em', color: GREEN, textTransform: 'uppercase', marginBottom: 6 }}>
            BEST DAY
          </div>
          {bestDayDate ? (
            <>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 26, color: GREEN }}>
                {bestDayPct}%
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: TEXT2, marginTop: 2 }}>
                {fmtDate(bestDayDate)}
              </div>
            </>
          ) : (
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: MUTED }}>No data</div>
          )}
        </div>
        <div
          style={{
            flex: 1,
            background: CARD,
            border: `1px solid ${RED}40`,
            borderTop: `2px solid ${RED}`,
            borderRadius: 10,
            padding: '12px 14px',
          }}
        >
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: 600, letterSpacing: '0.2em', color: RED, textTransform: 'uppercase', marginBottom: 6 }}>
            WORST DAY
          </div>
          {worstDayDate ? (
            <>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 26, color: RED }}>
                {worstDayPct}%
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: TEXT2, marginTop: 2 }}>
                {fmtDate(worstDayDate)}
              </div>
            </>
          ) : (
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: MUTED }}>No data</div>
          )}
        </div>
      </div>

      {/* Comparisons */}
      <div style={{ padding: '0 24px 24px', flexShrink: 0 }}>
        <div
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: '16px 16px 8px',
          }}
        >
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: MUTED,
              marginBottom: 4,
            }}
          >
            VS PREVIOUS WEEK
          </div>
          <CompareRow
            label="Weekly Score Avg"
            thisVal={weekData.weeklyScoreAvg}
            prevVal={weekData.prevWeekScoreAvg}
            unit="%"
          />
          <CompareRow
            label="Gym Sessions"
            thisVal={weekData.gymThisWeek}
            prevVal={weekData.gymPrevWeek}
            unit=" sessions"
          />
          <CompareRow
            label="Avg Daily Steps"
            thisVal={weekData.avgStepsThis}
            prevVal={weekData.avgStepsPrev}
            unit=" steps"
            formatFn={(v) => (v != null ? v.toLocaleString() : '—')}
          />
          {weekData.weightDelta != null && (
            <CompareRow
              label="Weight Change"
              thisVal={weekData.weightDelta}
              prevVal={0}
              unit=" kg"
              higherIsBetter={false}
            />
          )}
        </div>
      </div>

      {/* Next button */}
      <div style={{ flexGrow: 1 }} />
      <div style={{ padding: '0 24px 24px', flexShrink: 0 }}>
        <button
          onClick={onNext}
          style={{
            width: '100%',
            padding: '16px 0',
            background: GOLD,
            border: 'none',
            borderRadius: 12,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: 18,
            letterSpacing: '0.12em',
            color: '#000',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'opacity 0.15s, transform 0.1s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
        >
          NEXT: REFLECTION <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}

// ─── Part 2: Reflection questions ─────────────────────────────────────────────

const REFLECTION_QUESTIONS = [
  {
    id: 'q1',
    label: 'Question 1 of 3',
    text: 'What worked well this week?',
    placeholder: 'What habits, decisions, or actions drove your best days?',
  },
  {
    id: 'q2',
    label: 'Question 2 of 3',
    text: 'What fell short or failed this week?',
    placeholder: 'Be honest. What held you back or went wrong?',
  },
  {
    id: 'q3',
    label: 'Question 3 of 3',
    text: 'What ONE thing are you committed to fixing next week?',
    placeholder: 'One specific, actionable commitment. No vague intentions.',
  },
]

function ReflectionScreen({ qIdx, answers, setAnswers, onNext, onPrev, slideDir }) {
  const q     = REFLECTION_QUESTIONS[qIdx]
  const value = answers[q.id] || ''
  const isEmpty = !value.trim()

  const isLast = qIdx === REFLECTION_QUESTIONS.length - 1

  return (
    <div
      key={`q-${qIdx}`}
      className={slideDir === 'forward' ? 'slide-in-forward' : 'slide-in-back'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '32px 24px 24px',
      }}
    >
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32, justifyContent: 'center' }}>
        {REFLECTION_QUESTIONS.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === qIdx ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i <= qIdx ? GOLD : BORDER,
              transition: 'width 0.2s ease, background 0.2s ease',
            }}
          />
        ))}
      </div>

      {/* Question label */}
      <div
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: GOLD,
          marginBottom: 16,
          textAlign: 'center',
        }}
      >
        {q.label}
      </div>

      {/* Question text */}
      <div
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 900,
          fontSize: 'clamp(22px, 5vw, 32px)',
          color: '#fff',
          textAlign: 'center',
          lineHeight: 1.2,
          marginBottom: 40,
        }}
      >
        {q.text}
      </div>

      {/* Textarea */}
      <textarea
        autoFocus
        rows={5}
        value={value}
        onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
        placeholder={q.placeholder}
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          color: '#fff',
          fontFamily: 'Inter, sans-serif',
          fontSize: 15,
          lineHeight: 1.6,
          padding: '16px 18px',
          resize: 'none',
          outline: 'none',
          width: '100%',
          caretColor: GOLD,
          transition: 'border-color 0.15s',
          flex: 1,
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = GOLD)}
        onBlur={(e) => (e.currentTarget.style.borderColor = BORDER)}
      />

      {/* Nav buttons */}
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button
          onClick={onPrev}
          style={{
            flex: '0 0 auto',
            padding: '14px 20px',
            background: 'transparent',
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            color: MUTED,
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'border-color 0.15s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.borderColor = MUTED)}
          onMouseOut={(e) => (e.currentTarget.style.borderColor = BORDER)}
        >
          <ChevronLeft size={16} /> Back
        </button>
        <button
          onClick={onNext}
          disabled={isEmpty}
          style={{
            flex: 1,
            padding: '14px 0',
            background: isEmpty ? `${GOLD}40` : GOLD,
            border: 'none',
            borderRadius: 12,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: 18,
            letterSpacing: '0.1em',
            color: isEmpty ? '#666' : '#000',
            cursor: isEmpty ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {isLast ? 'COMPLETE' : 'NEXT →'}
        </button>
      </div>
    </div>
  )
}

// ─── Part 3: Completion screen ─────────────────────────────────────────────────

function CompletionScreen({ weekData, answers, aiSummary, aiLoading, onClose }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '40px 28px',
        gap: 28,
        textAlign: 'center',
      }}
    >
      {/* Week number */}
      <div>
        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: 72,
            lineHeight: 1,
            color: GOLD,
            filter: 'drop-shadow(0 0 28px rgba(201,168,76,0.6))',
            letterSpacing: '0.06em',
          }}
        >
          WEEK {String(weekData.weekNumber).padStart(2, '0')}
        </div>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
            color: MUTED,
            marginTop: 6,
            letterSpacing: '0.1em',
          }}
        >
          {weekData.wins}W — {weekData.losses}L · Avg {weekData.weeklyScoreAvg}%
        </div>
      </div>

      {/* AI summary */}
      <div
        style={{
          maxWidth: 380,
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: '16px 20px',
          width: '100%',
        }}
      >
        {aiLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                border: `2px solid ${BORDER}`,
                borderTopColor: GOLD,
                animation: 'wr-spin 0.7s linear infinite',
              }}
            />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: MUTED, fontStyle: 'italic' }}>
              Generating insight...
            </span>
          </div>
        ) : (
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 15,
              color: TEXT2,
              fontStyle: 'italic',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            "{aiSummary}"
          </p>
        )}
      </div>

      {/* Commitment */}
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: `${GOLD}12`,
          border: `1px solid ${GOLD}50`,
          borderRadius: 12,
          padding: '16px 20px',
        }}
      >
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: GOLD,
            marginBottom: 8,
          }}
        >
          YOUR COMMITMENT
        </div>
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            color: '#fff',
            lineHeight: 1.5,
            margin: 0,
            fontStyle: 'italic',
          }}
        >
          "{answers.q3}"
        </p>
      </div>

      {/* Done button */}
      <button
        onClick={onClose}
        style={{
          padding: '16px 56px',
          background: GREEN,
          border: 'none',
          borderRadius: 12,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 900,
          fontSize: 18,
          letterSpacing: '0.12em',
          color: '#fff',
          cursor: 'pointer',
          transition: 'opacity 0.15s, transform 0.1s',
        }}
        onMouseOver={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scale(1.02)' }}
        onMouseOut={(e)  => { e.currentTarget.style.opacity = '1';   e.currentTarget.style.transform = 'scale(1)' }}
      >
        REVIEW COMPLETE ✓
      </button>

      <style>{`@keyframes wr-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Main WeeklyReview component ───────────────────────────────────────────────

export default function WeeklyReview({ onClose, dailyData, bodyData, dietData }) {
  // Phase: 'summary' | 'reflection' | 'complete'
  const [phase,    setPhase]    = useState('summary')
  const [qIdx,     setQIdx]     = useState(0)
  const [slideDir, setSlideDir] = useState('forward')
  const [answers,  setAnswers]  = useState({ q1: '', q2: '', q3: '' })
  const [aiSummary, setAiSummary] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // Read existing weekly reviews
  const [weeklyReviews, setWeeklyReviews] = useState(() => {
    try {
      const raw = localStorage.getItem('marko_weekly_review')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  const settings = useMemo(() => getWinDaySettings(), [])

  // Dates
  const weekDates     = useMemo(() => getWeekDates(), [])
  const prevWeekDates = useMemo(() => getPrevWeekDates(), [])

  // Compute all week data up front
  const weekData = useMemo(
    () =>
      computeWeekData(
        weekDates,
        prevWeekDates,
        settings,
        dailyData  || { logs: {} },
        bodyData   || { weightHistory: [], liftSessions: [] },
        dietData   || { history: [] }
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function handleSummaryNext() {
    setSlideDir('forward')
    setPhase('reflection')
    setQIdx(0)
  }

  function handleReflectionNext() {
    if (qIdx < REFLECTION_QUESTIONS.length - 1) {
      setSlideDir('forward')
      setQIdx((i) => i + 1)
    } else {
      // Complete
      completeReview()
    }
  }

  function handleReflectionPrev() {
    if (qIdx === 0) {
      setSlideDir('back')
      setPhase('summary')
    } else {
      setSlideDir('back')
      setQIdx((i) => i - 1)
    }
  }

  async function completeReview() {
    const now = new Date()
    const reviewObj = {
      id: Date.now(),
      weekStartDate:    weekData.weekStartDate,
      weekEndDate:      weekData.weekEndDate,
      weekNumber:       weekData.weekNumber,
      completedAt:      now.toISOString(),
      q1:               answers.q1,
      q2:               answers.q2,
      q3:               answers.q3,
      aiSummary:        '',
      data: {
        wins:              weekData.wins,
        losses:            weekData.losses,
        bestDayDate:       weekData.bestDayDate,
        bestDayPct:        weekData.bestDayPct,
        worstDayDate:      weekData.worstDayDate,
        worstDayPct:       weekData.worstDayPct,
        weeklyScoreAvg:    weekData.weeklyScoreAvg,
        prevWeekScoreAvg:  weekData.prevWeekScoreAvg,
        gymThisWeek:       weekData.gymThisWeek,
        gymPrevWeek:       weekData.gymPrevWeek,
        avgStepsThis:      weekData.avgStepsThis,
        avgStepsPrev:      weekData.avgStepsPrev,
        weightDelta:       weekData.weightDelta,
      },
    }

    // Switch to complete phase immediately
    setPhase('complete')
    setAiLoading(true)

    // Generate AI summary
    let summary = ''
    try {
      summary = await generateWeeklySummary(weekData, answers.q1, answers.q2, answers.q3)
    } finally {
      reviewObj.aiSummary = summary
      setAiSummary(summary)
      setAiLoading(false)

      // Persist to localStorage
      const updated = [...weeklyReviews, reviewObj]
      setWeeklyReviews(updated)
      localStorage.setItem('marko_weekly_review', JSON.stringify(updated))
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          zIndex: 900,
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 901,
          width: 'min(520px, calc(100vw - 32px))',
          height: 'min(760px, calc(100vh - 40px))',
          background: BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 20,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,168,76,0.1)',
        }}
      >
        {/* Modal top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: `1px solid ${BORDER}`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900,
              fontSize: 13,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: GOLD,
            }}
          >
            {phase === 'summary'    ? 'WEEK IN REVIEW'  :
             phase === 'reflection' ? 'REFLECTION'       :
             'COMPLETE'}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: MUTED,
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              borderRadius: 6,
              transition: 'color 0.15s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseOut={(e)  => (e.currentTarget.style.color = MUTED)}
            aria-label="Close weekly review"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {phase === 'summary' && (
            <div style={{ height: '100%', overflowY: 'auto' }}>
              <DataSummaryScreen weekData={weekData} onNext={handleSummaryNext} />
            </div>
          )}

          {phase === 'reflection' && (
            <div style={{ height: '100%', overflowY: 'auto' }}>
              <ReflectionScreen
                key={qIdx}
                qIdx={qIdx}
                answers={answers}
                setAnswers={setAnswers}
                onNext={handleReflectionNext}
                onPrev={handleReflectionPrev}
                slideDir={slideDir}
              />
            </div>
          )}

          {phase === 'complete' && (
            <div style={{ height: '100%', overflowY: 'auto' }}>
              <CompletionScreen
                weekData={weekData}
                answers={answers}
                aiSummary={aiSummary}
                aiLoading={aiLoading}
                onClose={onClose}
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
