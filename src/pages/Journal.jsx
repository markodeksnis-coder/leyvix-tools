import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp, Edit3, Save, X } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  BG:     '#030311',
  SURF:   '#09091f',
  CARD:   '#0d0d28',
  BORDER: '#1d1d4a',
  GOLD:   '#c9a84c',
  RED:    '#ef4444',
  PURPLE: '#8b5cf6',
  GREEN:  '#10b981',
  TEXT2:  '#94a3b8',
  MUTED:  '#64748b',
  WHITE:  '#ffffff',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function padDay(n) {
  return String(n ?? 0).padStart(3, '0')
}

// Map eveningAnswers keys → readable labels
const ANSWER_LABELS = {
  ed1:  'Day rating',
  ed3:  'Hours worked',
  ed4:  'Focus score',
  eb10: 'Trained today',
  eb12: 'Hit calorie target',
  eb13: 'Hit protein target',
  eb16: 'Steps',
  em18: 'Overall mood',
  er30: 'Best moment',
  er32: "Tomorrow's focus",
}
const ANSWER_KEYS = Object.keys(ANSWER_LABELS)

function formatAnswerValue(key, val) {
  if (val === undefined || val === null || val === '') return null
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  return String(val)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WinBadge({ isWin }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 10px',
      borderRadius: 99,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.08em',
      fontFamily: 'Inter, sans-serif',
      background: isWin ? 'rgba(201,168,76,0.15)' : 'rgba(239,68,68,0.15)',
      color: isWin ? C.GOLD : C.RED,
      border: `1px solid ${isWin ? 'rgba(201,168,76,0.35)' : 'rgba(239,68,68,0.35)'}`,
    }}>
      {isWin ? '★ WIN' : '✕ LOSS'}
    </span>
  )
}

function ScorePill({ pct, isWin }) {
  return (
    <span style={{
      fontFamily: "'Barlow Condensed', sans-serif",
      fontWeight: 900,
      fontSize: 20,
      color: isWin ? C.GOLD : C.RED,
      letterSpacing: '0.02em',
    }}>
      {pct}%
    </span>
  )
}

function CheckInGrid({ answers }) {
  if (!answers || typeof answers !== 'object') return null

  const entries = ANSWER_KEYS
    .map(key => ({ key, label: ANSWER_LABELS[key], value: formatAnswerValue(key, answers[key]) }))
    .filter(e => e.value !== null)

  if (entries.length === 0) return (
    <p style={{ color: C.MUTED, fontSize: 13, fontFamily: 'Inter, sans-serif', margin: 0 }}>
      No check-in data recorded.
    </p>
  )

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px 20px',
    }}>
      {entries.map(({ key, label, value }) => (
        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.1em',
            color: C.MUTED,
            textTransform: 'uppercase',
          }}>
            {label}
          </span>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            fontWeight: 500,
            color: C.TEXT2,
          }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}

function NoteEditor({ note, onSave, onCancel }) {
  const [draft, setDraft] = useState(note || '')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <textarea
        autoFocus
        placeholder="Add a personal note…"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        rows={4}
        style={{
          width: '100%',
          background: 'transparent',
          border: `1px solid ${C.BORDER}`,
          borderRadius: 8,
          padding: 12,
          color: C.WHITE,
          fontFamily: 'Inter, sans-serif',
          fontSize: 13,
          lineHeight: 1.6,
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => { e.target.style.borderColor = C.PURPLE }}
        onBlur={e => { e.target.style.borderColor = C.BORDER }}
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 14px', borderRadius: 6, border: `1px solid ${C.BORDER}`,
            background: 'transparent', color: C.MUTED, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600,
          }}
        >
          <X size={12} /> Cancel
        </button>
        <button
          onClick={() => onSave(draft)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 14px', borderRadius: 6, border: 'none',
            background: C.PURPLE, color: C.WHITE, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700,
          }}
        >
          <Save size={12} /> Save Note
        </button>
      </div>
    </div>
  )
}

function EntryCard({ entry, onSaveNote }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)

  const accentColor = entry.isWin ? C.GOLD : C.RED

  const handleSaveNote = (text) => {
    onSaveNote(entry.id, text)
    setEditing(false)
  }

  return (
    <article style={{
      background: C.CARD,
      border: `1px solid ${C.BORDER}`,
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: 12,
      overflow: 'hidden',
      transition: 'box-shadow 0.2s',
    }}>
      {/* ── Card header (always visible) ── */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 20px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Day number */}
        <div style={{ flexShrink: 0 }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: 32,
            lineHeight: 1,
            color: C.GOLD,
            letterSpacing: '0.04em',
          }}>
            DAY {padDay(entry.dayNumber)}
          </div>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 11,
            color: C.MUTED,
            marginTop: 2,
            letterSpacing: '0.03em',
          }}>
            {formatDate(entry.date)}
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Right side: badge + score + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <WinBadge isWin={entry.isWin} />
          <ScorePill pct={entry.pct} isWin={entry.isWin} />
          <div style={{ color: C.MUTED, display: 'flex', alignItems: 'center' }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {/* ── AI Reflection ── */}
      <div style={{ padding: '0 20px 16px 20px' }}>
        {entry.aiReflection && (
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            lineHeight: 1.75,
            color: C.WHITE,
            margin: 0,
            padding: '14px 16px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 8,
            borderLeft: `2px solid rgba(139,92,246,0.4)`,
          }}>
            {entry.aiReflection}
          </p>
        )}

        {/* Manual note (read-only, if present and not editing) */}
        {entry.manualNote && !editing && (
          <div style={{ marginTop: 12 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}>
              <div style={{ flex: 1, height: 1, background: C.BORDER }} />
              <Edit3 size={11} color={C.MUTED} />
              <span style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 10,
                color: C.MUTED,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                Personal note
              </span>
              <div style={{ flex: 1, height: 1, background: C.BORDER }} />
            </div>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              fontStyle: 'italic',
              color: C.TEXT2,
              lineHeight: 1.65,
              margin: 0,
            }}>
              {entry.manualNote}
            </p>
          </div>
        )}

        {/* Note editor */}
        {editing && (
          <div style={{ marginTop: 12 }}>
            <NoteEditor
              note={entry.manualNote}
              onSave={handleSaveNote}
              onCancel={() => setEditing(false)}
            />
          </div>
        )}

        {/* Action bar */}
        {!editing && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 14,
            paddingTop: 10,
            borderTop: `1px solid ${C.BORDER}`,
          }}>
            <button
              onClick={e => { e.stopPropagation(); setEditing(true) }}
              title={entry.manualNote ? 'Edit note' : 'Add note'}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'transparent', border: `1px solid ${C.BORDER}`,
                borderRadius: 6, padding: '5px 11px', cursor: 'pointer',
                color: C.MUTED, fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
                letterSpacing: '0.05em',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = C.PURPLE; e.currentTarget.style.borderColor = C.PURPLE }}
              onMouseLeave={e => { e.currentTarget.style.color = C.MUTED; e.currentTarget.style.borderColor = C.BORDER }}
            >
              <Edit3 size={11} />
              {entry.manualNote ? 'EDIT NOTE' : 'ADD NOTE'}
            </button>

            <div style={{ flex: 1 }} />

            <button
              onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
              title={expanded ? 'Collapse check-in data' : 'View check-in data'}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'transparent', border: `1px solid ${C.BORDER}`,
                borderRadius: 6, padding: '5px 11px', cursor: 'pointer',
                color: C.MUTED, fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
                letterSpacing: '0.05em',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = C.TEXT2; e.currentTarget.style.borderColor = C.TEXT2 }}
              onMouseLeave={e => { e.currentTarget.style.color = C.MUTED; e.currentTarget.style.borderColor = C.BORDER }}
            >
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {expanded ? 'HIDE DATA' : 'CHECK-IN DATA'}
            </button>
          </div>
        )}
      </div>

      {/* ── Expanded: check-in breakdown ── */}
      {expanded && (
        <div style={{
          margin: '0 20px 20px 20px',
          padding: 16,
          background: C.SURF,
          borderRadius: 8,
          border: `1px solid ${C.BORDER}`,
        }}>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: C.MUTED,
            textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            Evening Check-In · {formatDate(entry.date)}
          </div>
          <CheckInGrid answers={entry.eveningAnswers} />
        </div>
      )}
    </article>
  )
}

function EmptyState() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      minHeight: 320,
      textAlign: 'center',
    }}>
      <div style={{
        width: 72,
        height: 72,
        borderRadius: 20,
        background: 'rgba(139,92,246,0.1)',
        border: `1px solid rgba(139,92,246,0.25)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <BookOpen size={30} color={C.PURPLE} />
      </div>
      <div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 900,
          fontSize: 22,
          letterSpacing: '0.08em',
          color: C.TEXT2,
          marginBottom: 8,
        }}>
          NO REFLECTIONS YET
        </div>
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 13,
          color: C.MUTED,
          lineHeight: 1.6,
          maxWidth: 280,
          margin: 0,
        }}>
          Complete an evening check-in to generate your first entry
        </p>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Journal() {
  const [journal, setJournal] = useLocalStorage('marko_journal', [])

  const sorted = [...journal].sort((a, b) =>
    (b.date ?? '').localeCompare(a.date ?? '')
  )

  const saveNote = (id, note) => {
    setJournal(prev => prev.map(e => e.id === id ? { ...e, manualNote: note } : e))
  }

  return (
    <div style={{ minHeight: '100vh', background: C.BG, padding: '32px 0 80px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px' }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: 36 }}>
          {/* Icon row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 6,
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(139,92,246,0.15)',
              border: `1px solid rgba(139,92,246,0.3)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <BookOpen size={20} color={C.PURPLE} />
            </div>

            {/* Entry count badge */}
            {journal.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 99,
                background: 'rgba(201,168,76,0.1)',
                border: `1px solid rgba(201,168,76,0.25)`,
              }}>
                <span style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.GOLD,
                  letterSpacing: '0.06em',
                }}>
                  {journal.length} {journal.length === 1 ? 'ENTRY' : 'ENTRIES'}
                </span>
              </div>
            )}
          </div>

          {/* Title */}
          <h1 style={{
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 900,
            fontSize: 28,
            letterSpacing: '0.06em',
            margin: '12px 0 4px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #c9a84c 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            REFLECTION FEED
          </h1>

          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
            fontWeight: 600,
            color: C.MUTED,
            letterSpacing: '0.1em',
            margin: 0,
          }}>
            YOUR DAILY JOURNAL · EVENING ENTRIES
          </p>
        </div>

        {/* ── Win / loss summary strip ── */}
        {journal.length > 0 && (
          <div style={{
            display: 'flex',
            gap: 12,
            marginBottom: 28,
          }}>
            {[
              {
                label: 'WIN DAYS',
                value: journal.filter(e => e.isWin).length,
                color: C.GOLD,
                bg: 'rgba(201,168,76,0.08)',
                border: 'rgba(201,168,76,0.2)',
              },
              {
                label: 'LOSS DAYS',
                value: journal.filter(e => !e.isWin).length,
                color: C.RED,
                bg: 'rgba(239,68,68,0.08)',
                border: 'rgba(239,68,68,0.2)',
              },
              {
                label: 'WIN RATE',
                value: `${Math.round((journal.filter(e => e.isWin).length / journal.length) * 100)}%`,
                color: C.PURPLE,
                bg: 'rgba(139,92,246,0.08)',
                border: 'rgba(139,92,246,0.2)',
              },
            ].map(stat => (
              <div key={stat.label} style={{
                flex: 1,
                padding: '12px 16px',
                background: stat.bg,
                border: `1px solid ${stat.border}`,
                borderRadius: 10,
                textAlign: 'center',
              }}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 900,
                  fontSize: 24,
                  color: stat.color,
                  lineHeight: 1,
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: C.MUTED,
                  marginTop: 4,
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Feed ── */}
        {sorted.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sorted.map(entry => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onSaveNote={saveNote}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
