import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { ChevronLeft, Plus, Trash2, GripVertical, X, Check } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { today } from '../utils'

// ─── Design tokens ────────────────────────────────────────────────────────────
const GOLD   = '#fbbf24'
const BG     = '#030311'
const Q_BG   = '#000000'
const CARD   = '#0d0d28'
const BORDER = '#1d1d4a'
const MUTED  = '#64748b'
const TEXT2  = '#94a3b8'

// ─── Question types ───────────────────────────────────────────────────────────
const T = {
  SINGLE:  'single',
  MULTI:   'multi',
  SLIDER:  'slider',
  NUMERIC: 'numeric',
  TEXT:    'text',
  BINARY:  'binary',
}

// ─── Morning questions (24 total) ─────────────────────────────────────────────
const DEFAULT_MORNING = [
  // Sleep
  { id: 'ms1',  category: 'Sleep',          text: 'How many hours did you sleep?',                                    type: T.NUMERIC, min: 4,  max: 12,    step: 0.5, required: true },
  { id: 'ms2',  category: 'Sleep',          text: 'How would you rate your sleep quality?',                           type: T.SLIDER,  required: true },
  { id: 'ms3',  category: 'Sleep',          text: 'What time did you wake up?',                                       type: T.SINGLE,  options: ['Before 6am','6am','6:30am','7am','7:30am','8am','After 8am'], required: true },
  { id: 'ms4',  category: 'Sleep',          text: 'Did you wake up before your alarm or after?',                      type: T.SINGLE,  options: ['Before','With alarm','After','No alarm'], required: true },
  { id: 'ms5',  category: 'Sleep',          text: 'How rested do you feel right now?',                                type: T.SLIDER,  required: true },
  // Body & Energy
  { id: 'me6',  category: 'Body & Energy',  text: 'How is your energy level right now?',                              type: T.SLIDER,  required: true },
  { id: 'me7',  category: 'Body & Energy',  text: 'Any physical soreness or pain today?',                             type: T.SINGLE,  options: ['None','Mild','Moderate','Significant'], required: true },
  { id: 'me8',  category: 'Body & Energy',  text: 'Are you training today?',                                          type: T.BINARY,  required: true },
  { id: 'me9',  category: 'Body & Energy',  text: 'What are you training?',                                           type: T.SINGLE,  options: ['Weights','Boxing','Both','Cardio only','Rest day / active recovery'], showIf: a => a['me8'] === 'YES', required: false },
  { id: 'me10', category: 'Body & Energy',  text: 'How is your hunger level right now?',                              type: T.SINGLE,  options: ['Not hungry','Slightly hungry','Very hungry','Already ate'], required: true },
  // Mind & Mood
  { id: 'mm11', category: 'Mind & Mood',    text: 'How is your mood right now?',                                      type: T.SINGLE,  options: ['Excellent','Good','Neutral','Low','Very low'], required: true },
  { id: 'mm12', category: 'Mind & Mood',    text: 'How clear does your mind feel?',                                   type: T.SLIDER,  required: true },
  { id: 'mm13', category: 'Mind & Mood',    text: 'What is your stress level?',                                       type: T.SLIDER,  required: true },
  { id: 'mm14', category: 'Mind & Mood',    text: 'Do you feel motivated today?',                                     type: T.SINGLE,  options: ['Very motivated','Motivated','Neutral','Unmotivated','Fighting it'], required: true },
  { id: 'mm15', category: 'Mind & Mood',    text: 'Did you have any notable dreams?',                                 type: T.BINARY,  required: true },
  { id: 'mm15b',category: 'Mind & Mood',    text: 'Describe your dream briefly.',                                     type: T.TEXT,    showIf: a => a['mm15'] === 'YES', required: false },
  // Intentions
  { id: 'mi16', category: 'Intentions',     text: 'What is your single most important task today?',                   type: T.TEXT,    required: true },
  { id: 'mi17', category: 'Intentions',     text: 'What is your one word intention for today?',                       type: T.TEXT,    placeholder: 'Focus, Execute, Discipline, Recover...', required: true },
  { id: 'mi18', category: 'Intentions',     text: 'How committed are you to having a great day?',                     type: T.SLIDER,  required: true },
  { id: 'mi19', category: 'Intentions',     text: 'Is there anything that could get in the way of your day?',         type: T.SINGLE,  options: ['Nothing','Low energy','Distractions','External obligations','Uncertainty','Other'], required: true },
  { id: 'mi20', category: 'Intentions',     text: 'What are you grateful for this morning?',                          type: T.TEXT,    required: false },
  // Business
  { id: 'mb21', category: 'Business',       text: 'Do you have any sales calls today?',                               type: T.BINARY,  required: true },
  { id: 'mb21b',category: 'Business',       text: 'How many sales calls?',                                            type: T.NUMERIC, min: 0, max: 20, step: 1, showIf: a => a['mb21'] === 'YES', required: false },
  { id: 'mb22', category: 'Business',       text: 'What is your outreach goal for today?',                            type: T.SINGLE,  options: ['0','5–10','10–20','20–50','50+'], required: true },
  { id: 'mb23', category: 'Business',       text: 'How confident do you feel about today\'s business execution?',     type: T.SLIDER,  required: true },
  // Mindset
  { id: 'mk24', category: 'Mindset',        text: 'Pick the statement that best describes how you feel entering today.', type: T.SINGLE, options: ['I am ready to attack the day','I will do what needs to be done','I am showing up regardless of how I feel','Today is going to be a challenge','I am not feeling it today'], required: true },
]

// ─── Evening questions (34 total) ─────────────────────────────────────────────
const DEFAULT_EVENING = [
  // Daily Execution
  { id: 'ed1',  category: 'Daily Execution',    text: 'How would you rate today overall?',                              type: T.SLIDER,  required: true },
  { id: 'ed2',  category: 'Daily Execution',    text: 'Did you complete your most important task from this morning?',   type: T.BINARY,  required: true },
  { id: 'ed2b', category: 'Daily Execution',    text: "Why wasn't it completed?",                                       type: T.SINGLE,  options: ['Ran out of time','Got distracted','It wasn\'t clear enough','Something came up','I avoided it'], showIf: a => a['ed2'] === 'NO', required: false },
  { id: 'ed3',  category: 'Daily Execution',    text: 'How many hours did you actually work today?',                    type: T.SINGLE,  options: ['Less than 2','2–4','4–6','6–8','8–10','More than 10'], required: true },
  { id: 'ed4',  category: 'Daily Execution',    text: 'How focused were you during work?',                              type: T.SLIDER,  required: true },
  { id: 'ed5',  category: 'Daily Execution',    text: 'Did you do deep focused work or mostly reactive tasks?',         type: T.SINGLE,  options: ['Mostly deep work','Mix of both','Mostly reactive','Barely worked'], required: true },
  { id: 'ed6',  category: 'Daily Execution',    text: 'What percentage of your to-do list did you complete?',           type: T.SINGLE,  options: ['0–25%','25–50%','50–75%','75–100%','100%'], required: true },
  // Non-Negotiables
  { id: 'en7',  category: 'Non-Negotiables',    text: 'Did you complete all your non-negotiables today?',               type: T.BINARY,  required: true },
  { id: 'en7b', category: 'Non-Negotiables',    text: 'Which ones did you miss?',                                       type: T.MULTI,   options: ['No PMO','Cold Shower','Prayer','Training','Other'], showIf: a => a['en7'] === 'NO', required: false },
  { id: 'en8',  category: 'Non-Negotiables',    text: 'Did you take a cold shower?',                                    type: T.BINARY,  required: true },
  { id: 'en9',  category: 'Non-Negotiables',    text: 'Did you pray or have a moment of reflection?',                   type: T.BINARY,  required: true },
  // Body & Nutrition
  { id: 'eb10', category: 'Body & Nutrition',   text: 'Did you train today?',                                           type: T.BINARY,  required: true },
  { id: 'eb11', category: 'Body & Nutrition',   text: 'How was the training session?',                                  type: T.SINGLE,  options: ['Exceptional','Good','Average','Below average','Just showed up'], showIf: a => a['eb10'] === 'YES', required: false },
  { id: 'eb12', category: 'Body & Nutrition',   text: 'Did you hit your calorie target today?',                         type: T.SINGLE,  options: ['Under by a lot','Slightly under','Hit it','Slightly over','Over by a lot'], required: true },
  { id: 'eb13', category: 'Body & Nutrition',   text: 'Did you hit your protein target?',                               type: T.SINGLE,  options: ['Under by a lot','Slightly under','Hit it','Slightly over'], required: true },
  { id: 'eb14', category: 'Body & Nutrition',   text: 'How clean was your diet today?',                                 type: T.SLIDER,  required: true },
  { id: 'eb15', category: 'Body & Nutrition',   text: 'Did you eat any junk food or binge?',                            type: T.BINARY,  required: true },
  { id: 'eb15b',category: 'Body & Nutrition',   text: 'How bad was it?',                                                type: T.SINGLE,  options: ['Small slip','Moderate','Full binge'], showIf: a => a['eb15'] === 'YES', required: false },
  { id: 'eb16', category: 'Body & Nutrition',   text: 'How many steps did you take today?',                             type: T.NUMERIC, min: 0, max: 30000, step: 500, required: true },
  { id: 'eb17', category: 'Body & Nutrition',   text: 'How is your energy level ending the day?',                       type: T.SLIDER,  required: true },
  // Mind & Mood
  { id: 'em18', category: 'Mind & Mood',        text: 'How was your mood throughout the day?',                          type: T.SINGLE,  options: ['Excellent','Good','Neutral','Fluctuated','Low','Very low'], required: true },
  { id: 'em19', category: 'Mind & Mood',        text: 'Did you experience any anxiety or stress today?',                type: T.SLIDER,  required: true },
  { id: 'em20', category: 'Mind & Mood',        text: 'How in control did you feel today?',                             type: T.SLIDER,  required: true },
  { id: 'em21', category: 'Mind & Mood',        text: 'Did you do anything for your mental state today?',               type: T.MULTI,   options: ['Read','Meditated','Journaled','Walked','None','Other'], required: true },
  // Business
  { id: 'eb22', category: 'Business',           text: 'How many sales calls did you conduct today?',                    type: T.NUMERIC, min: 0, max: 20, step: 1, required: true },
  { id: 'eb23', category: 'Business',           text: 'How many appointments were booked today?',                       type: T.NUMERIC, min: 0, max: 20, step: 1, required: true },
  { id: 'eb24', category: 'Business',           text: 'Did you do outreach today?',                                     type: T.BINARY,  required: true },
  { id: 'eb24b',category: 'Business',           text: 'How heavy was your outreach?',                                   type: T.SINGLE,  options: ['Light','Moderate','Heavy'], showIf: a => a['eb24'] === 'YES', required: false },
  { id: 'eb25', category: 'Business',           text: 'How would you rate your business execution today?',               type: T.SLIDER,  required: true },
  { id: 'eb26', category: 'Business',           text: 'What was your biggest business win today?',                      type: T.TEXT,    required: false },
  // Knowledge & Growth
  { id: 'ek27', category: 'Knowledge & Growth', text: 'Did you learn something today?',                                 type: T.BINARY,  required: true },
  { id: 'ek28', category: 'Knowledge & Growth', text: 'What did you learn from?',                                       type: T.SINGLE,  options: ['YouTube video','Book','Podcast','Mentor','Experience','Other'], showIf: a => a['ek27'] === 'YES', required: false },
  { id: 'ek29', category: 'Knowledge & Growth', text: 'Did you add anything to your Arsenal today?',                    type: T.BINARY,  required: true },
  // Reflection
  { id: 'er30', category: 'Reflection',         text: 'What was the best moment of today?',                             type: T.TEXT,    required: false },
  { id: 'er31', category: 'Reflection',         text: 'What would you do differently if you could repeat today?',       type: T.TEXT,    required: false },
  { id: 'er32', category: 'Reflection',         text: 'What is one thing you want to carry into tomorrow?',             type: T.TEXT,    required: false },
  { id: 'er33', category: 'Reflection',         text: 'How proud are you of how you showed up today?',                  type: T.SLIDER,  required: true },
  { id: 'er34', category: 'Reflection',         text: 'Pick the statement that best describes today.',                  type: T.SINGLE,  options: ['I dominated today','I did what I had to do','I showed up but underperformed','I wasted today','Today was out of my control'], required: true },
]

// ─── AI summary ───────────────────────────────────────────────────────────────
async function generateSummary(tab, answers) {
  const apiKey = localStorage.getItem('anthropic_key') || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANTHROPIC_API_KEY) || ''
  if (!apiKey) {
    return tab === 'evening'
      ? 'Day logged. Review your patterns in Life Cycles.'
      : 'Morning check-in complete. Attack the day.'
  }

  const allQs = [...DEFAULT_MORNING, ...DEFAULT_EVENING]
  const lines = Object.entries(answers)
    .map(([id, val]) => {
      const q = allQs.find(q => q.id === id)
      if (!q) return null
      return `${q.text}: ${Array.isArray(val) ? val.join(', ') : val}`
    })
    .filter(Boolean)
    .join('\n')

  const prompt = tab === 'evening'
    ? `Based on this evening check-in data, write ONE punchy sentence (max 20 words) summarizing the day and noting a key pattern or tomorrow's focus. No fluff, direct tone like a coach:\n\n${lines}`
    : `Based on this morning check-in, write ONE punchy sentence (max 15 words) as a motivating mission statement for the day. Direct, no fluff:\n\n${lines}`

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
    return data.content?.[0]?.text?.trim() || 'Day logged successfully.'
  } catch {
    return 'Day logged successfully.'
  }
}

// ─── Data sync ────────────────────────────────────────────────────────────────
function syncToSections(tab, answers, dateStr) {
  const dailyRaw = localStorage.getItem('marko_daily')
  const daily = dailyRaw ? JSON.parse(dailyRaw) : { logs: {} }
  if (!daily.logs) daily.logs = {}
  if (!daily.logs[dateStr]) daily.logs[dateStr] = {}

  if (tab === 'morning') {
    if (answers['ms2'] != null) daily.logs[dateStr].sleep = answers['ms2']
  }
  if (tab === 'evening') {
    if (answers['eb16'] != null) daily.logs[dateStr].steps      = answers['eb16']
    if (answers['ed4']  != null) daily.logs[dateStr].workOutput  = answers['ed4']
    if (answers['eb14'] != null) daily.logs[dateStr].dietQuality = answers['eb14']

    if (answers['eb10'] === 'YES') {
      const bodyRaw  = localStorage.getItem('marko_body')
      const bodyData = bodyRaw ? JSON.parse(bodyRaw) : {}
      const sessions = bodyData.liftSessions || []
      const alreadyLogged = sessions.some(s => s.date === dateStr)
      if (!alreadyLogged) {
        bodyData.liftSessions = [
          ...sessions,
          {
            id: Date.now(),
            date: dateStr,
            sets: [],
            note: 'Logged via evening check-in',
            sessionQuality: answers['eb11'] || 'Good',
          },
        ]
        localStorage.setItem('marko_body', JSON.stringify(bodyData))
      }
    }
  }

  localStorage.setItem('marko_daily', JSON.stringify(daily))
}

// ─── Inline CSS block ─────────────────────────────────────────────────────────
const STYLES = `
  @keyframes slideInForward {
    from { transform: translateX(60px); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
  @keyframes slideInBack {
    from { transform: translateX(-60px); opacity: 0; }
    to   { transform: translateX(0);     opacity: 1; }
  }
  .slide-in-forward { animation: slideInForward 0.25s ease-out forwards; }
  .slide-in-back    { animation: slideInBack    0.25s ease-out forwards; }

  .checkin-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 4px;
    background: #1d1d4a;
    outline: none;
    border-radius: 2px;
    cursor: pointer;
  }
  .checkin-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #fbbf24;
    cursor: pointer;
    box-shadow: 0 0 16px rgba(251,191,36,0.6);
  }
  .checkin-slider::-moz-range-thumb {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #fbbf24;
    cursor: pointer;
    border: none;
    box-shadow: 0 0 16px rgba(251,191,36,0.6);
  }

  .ci-pill {
    border-radius: 100px;
    padding: 10px 20px;
    font-size: 13px;
    font-family: Inter, sans-serif;
    cursor: pointer;
    border: 1px solid #1a2440;
    background: #0d0d28;
    color: #fff;
    transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.1s;
    white-space: nowrap;
  }
  .ci-pill:hover { border-color: #fbbf24; }
  .ci-pill.selected {
    background: #fbbf24;
    border-color: #fbbf24;
    color: #000;
    font-weight: 700;
  }

  .ci-btn-gold {
    background: #fbbf24;
    color: #000;
    font-weight: 700;
    font-family: Inter, sans-serif;
    border: none;
    border-radius: 10px;
    padding: 14px 40px;
    font-size: 15px;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s;
  }
  .ci-btn-gold:hover  { opacity: 0.9; transform: scale(1.02); }
  .ci-btn-gold:active { transform: scale(0.98); }
  .ci-btn-gold:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }

  .ci-btn-muted {
    background: transparent;
    color: #64748b;
    font-family: Inter, sans-serif;
    border: 1px solid #1d1d4a;
    border-radius: 10px;
    padding: 14px 40px;
    font-size: 15px;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .ci-btn-muted:hover { border-color: #64748b; }

  .ci-textarea {
    background: transparent;
    border: none;
    border-bottom: 1px solid #1d1d4a;
    color: #fff;
    font-family: Inter, sans-serif;
    font-size: 20px;
    width: 100%;
    max-width: 480px;
    outline: none;
    resize: none;
    text-align: center;
    padding: 8px 0;
    caret-color: #fbbf24;
    transition: border-color 0.15s;
  }
  .ci-textarea::placeholder { color: #334155; }
  .ci-textarea:focus { border-bottom-color: #fbbf24; }

  .ci-input {
    background: transparent;
    border: none;
    border-bottom: 1px solid #1d1d4a;
    color: #fff;
    font-family: '"Orbitron", sans-serif';
    font-size: 24px;
    width: 100%;
    max-width: 360px;
    outline: none;
    text-align: center;
    padding: 8px 0;
    caret-color: #fbbf24;
    transition: border-color 0.15s;
  }
  .ci-input::placeholder { color: #334155; }
  .ci-input:focus { border-bottom-color: #fbbf24; }

  .edit-row:hover { background: rgba(255,255,255,0.03); }
  .edit-row[draggable]:active { opacity: 0.5; }
`

// ─── Answer type renderers ────────────────────────────────────────────────────

function SingleAnswer({ q, value, onChange, onAutoAdvance }) {
  const select = (opt) => {
    onChange(opt)
    setTimeout(onAutoAdvance, 160)
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 560, margin: '0 auto' }}>
      {q.options.map(opt => (
        <button
          key={opt}
          className={`ci-pill${value === opt ? ' selected' : ''}`}
          onClick={() => select(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function MultiAnswer({ q, value = [], onChange, onContinue }) {
  const toggle = (opt) => {
    const current = Array.isArray(value) ? value : []
    if (current.includes(opt)) {
      onChange(current.filter(v => v !== opt))
    } else {
      onChange([...current, opt])
    }
  }
  const hasSelection = Array.isArray(value) && value.length > 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 560 }}>
        {q.options.map(opt => (
          <button
            key={opt}
            className={`ci-pill${Array.isArray(value) && value.includes(opt) ? ' selected' : ''}`}
            onClick={() => toggle(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
      <button
        className="ci-btn-gold"
        onClick={onContinue}
        disabled={!hasSelection}
        style={{ opacity: hasSelection ? 1 : 0.4 }}
      >
        Continue →
      </button>
    </div>
  )
}

function SliderAnswer({ q, value, onChange, onAutoAdvance }) {
  const displayVal = value != null ? value : 5
  const handleChange = (e) => onChange(Number(e.target.value))
  const handleRelease = () => setTimeout(onAutoAdvance, 300)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: '100%', maxWidth: 400 }}>
      <div style={{
        fontFamily: '"Orbitron", sans-serif',
        fontSize: 96,
        fontWeight: 900,
        color: GOLD,
        lineHeight: 1,
        filter: 'drop-shadow(0 0 24px rgba(251,191,36,0.5))',
        minWidth: 120,
        textAlign: 'center',
      }}>
        {displayVal}
      </div>
      <div style={{ width: '100%', position: 'relative' }}>
        <input
          type="range"
          className="checkin-slider"
          min={1}
          max={10}
          step={1}
          value={displayVal}
          onChange={handleChange}
          onMouseUp={handleRelease}
          onTouchEnd={handleRelease}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, color: MUTED }}>
          <span>1</span>
          <span>10</span>
        </div>
      </div>
    </div>
  )
}

function NumericAnswer({ q, value, onChange, onContinue }) {
  const min  = q.min  ?? 0
  const max  = q.max  ?? 100
  const step = q.step ?? 1
  const displayVal = value != null ? value : min

  const decrement = () => onChange(Math.max(min, +(displayVal - step).toFixed(2)))
  const increment = () => onChange(Math.min(max, +(displayVal + step).toFixed(2)))

  const btnStyle = {
    width: 48, height: 48,
    borderRadius: '50%',
    background: CARD,
    border: `1px solid ${GOLD}`,
    color: GOLD,
    fontSize: 24,
    fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    flexShrink: 0,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <button style={btnStyle} onClick={decrement}>−</button>
        <div style={{
          fontFamily: '"Orbitron", sans-serif',
          fontSize: 72,
          fontWeight: 900,
          color: GOLD,
          minWidth: 140,
          textAlign: 'center',
          lineHeight: 1,
          filter: 'drop-shadow(0 0 16px rgba(251,191,36,0.4))',
        }}>
          {displayVal}
        </div>
        <button style={btnStyle} onClick={increment}>+</button>
      </div>
      <button className="ci-btn-gold" onClick={onContinue}>
        Continue →
      </button>
    </div>
  )
}

function TextAnswer({ q, value = '', onChange, onContinue, onSkip }) {
  const isMultiLine = !q.placeholder || q.text.toLowerCase().includes('describe') || q.text.toLowerCase().includes('grateful') || q.text.toLowerCase().includes('moment') || q.text.toLowerCase().includes('differently') || q.text.toLowerCase().includes('carry') || q.text.toLowerCase().includes('win')
  const isEmpty     = !value || value.trim() === ''
  const isDisabled  = q.required && isEmpty

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: '100%' }}>
      {isMultiLine ? (
        <textarea
          className="ci-textarea"
          rows={3}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={q.placeholder || 'Type here...'}
          autoFocus
        />
      ) : (
        <input
          className="ci-textarea"
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={q.placeholder || 'Type here...'}
          autoFocus
          style={{ fontSize: 24 }}
          onKeyDown={e => { if (e.key === 'Enter' && !isDisabled) onContinue() }}
        />
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        {!q.required && isEmpty ? (
          <button className="ci-btn-muted" onClick={onSkip}>Skip →</button>
        ) : (
          <button className="ci-btn-gold" onClick={onContinue} disabled={isDisabled}>
            Continue →
          </button>
        )}
      </div>
    </div>
  )
}

function BinaryAnswer({ q, value, onChange, onAutoAdvance }) {
  const [flash, setFlash] = useState(null)

  const pick = (choice) => {
    setFlash(choice)
    onChange(choice)
    setTimeout(() => {
      onAutoAdvance()
    }, 140)
  }

  const yesActive = flash === 'YES' || value === 'YES'
  const noActive  = flash === 'NO'  || value === 'NO'

  const base = {
    width: 160, height: 64,
    borderRadius: 12,
    border: `1px solid #1a2440`,
    background: CARD,
    fontFamily: '"Orbitron", sans-serif',
    fontSize: 18,
    fontWeight: 900,
    cursor: 'pointer',
    letterSpacing: '0.08em',
    transition: 'background 0.12s, color 0.12s, border-color 0.12s, transform 0.1s',
  }

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      <button
        style={{
          ...base,
          background: yesActive ? GOLD : CARD,
          borderColor: yesActive ? GOLD : '#1a2440',
          color: yesActive ? '#000' : '#fff',
          transform: yesActive ? 'scale(1.05)' : 'scale(1)',
        }}
        onClick={() => pick('YES')}
      >
        YES
      </button>
      <button
        style={{
          ...base,
          background: noActive ? '#ef4444' : CARD,
          borderColor: noActive ? '#ef4444' : '#1a2440',
          color: noActive ? '#fff' : '#fff',
          transform: noActive ? 'scale(1.05)' : 'scale(1)',
        }}
        onClick={() => pick('NO')}
      >
        NO
      </button>
    </div>
  )
}

// ─── Edit mode ────────────────────────────────────────────────────────────────

function EditModeView({ morningQs, setMorningQs, eveningQs, setEveningQs, onBack }) {
  const [editTab, setEditTab]     = useState('morning')
  const [showAdd, setShowAdd]     = useState(false)
  const [dragIdx, setDragIdx]     = useState(null)
  const [addForm, setAddForm]     = useState({ text: '', type: T.SINGLE, options: '', category: '', required: true })

  const qs    = editTab === 'morning' ? morningQs : eveningQs
  const setQs = editTab === 'morning' ? setMorningQs : setEveningQs

  const handleDelete = (id) => setQs(prev => prev.filter(q => q.id !== id))

  const handleDragStart = (idx) => setDragIdx(idx)
  const handleDragOver  = (e)   => e.preventDefault()
  const handleDrop      = (idx) => {
    if (dragIdx === null || dragIdx === idx) return
    const arr  = [...qs]
    const item = arr.splice(dragIdx, 1)[0]
    arr.splice(idx, 0, item)
    setQs(arr)
    setDragIdx(null)
  }

  const handleAdd = () => {
    if (!addForm.text.trim()) return
    const newQ = {
      id: `custom_${Date.now()}`,
      category: addForm.category || 'Custom',
      text: addForm.text.trim(),
      type: addForm.type,
      required: addForm.required,
      ...(addForm.options && [T.SINGLE, T.MULTI].includes(addForm.type)
        ? { options: addForm.options.split(',').map(s => s.trim()).filter(Boolean) }
        : {}),
    }
    setQs(prev => [...prev, newQ])
    setShowAdd(false)
    setAddForm({ text: '', type: T.SINGLE, options: '', category: '', required: true })
  }

  const inputStyle = {
    background: '#0d0d28', border: `1px solid ${BORDER}`, borderRadius: 8,
    color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: 14, padding: '10px 14px',
    outline: 'none', width: '100%', boxSizing: 'border-box',
  }
  const labelStyle = { fontFamily: 'Inter, sans-serif', fontSize: 11, color: TEXT2, marginBottom: 4, display: 'block' }

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '0 0 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 0' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: TEXT2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Inter, sans-serif', fontSize: 14 }}
        >
          <ChevronLeft size={16} /> Back
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: '"Orbitron", sans-serif', fontSize: 14, color: GOLD, letterSpacing: '0.1em' }}>
          EDIT QUESTIONS
        </span>
        <div style={{ flex: 1 }} />
      </div>

      {/* Tab switch */}
      <div style={{ display: 'flex', gap: 0, margin: '20px 20px 0', borderRadius: 10, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
        {['morning', 'evening'].map(t => (
          <button
            key={t}
            onClick={() => setEditTab(t)}
            style={{
              flex: 1, padding: '12px 0',
              background: editTab === t ? CARD : 'transparent',
              border: 'none',
              color: editTab === t ? '#fff' : MUTED,
              fontFamily: '"Orbitron", sans-serif',
              fontSize: 11,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {t === 'morning' ? '☀️ Morning' : '🌙 Evening'}
          </button>
        ))}
      </div>

      {/* Question list */}
      <div style={{ margin: '16px 20px 0' }}>
        {qs.map((q, idx) => (
          <div
            key={q.id}
            className="edit-row"
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(idx)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 8px', borderRadius: 8,
              borderBottom: `1px solid rgba(29,29,74,0.5)`,
              cursor: 'grab',
            }}
          >
            <GripVertical size={16} color={MUTED} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {q.text}
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: MUTED, marginTop: 2 }}>
                {q.category} · {q.type}{q.required ? '' : ' · optional'}
              </div>
            </div>
            <button
              onClick={() => handleDelete(q.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4, flexShrink: 0, display: 'flex' }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Add question button */}
      <div style={{ margin: '20px 20px 0' }}>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            width: '100%', padding: '14px 0',
            background: 'transparent', border: `1px dashed ${BORDER}`,
            borderRadius: 10, color: TEXT2,
            fontFamily: 'Inter, sans-serif', fontSize: 14,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Plus size={16} /> Add Question
        </button>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
        }}>
          <div style={{ background: '#0d0d28', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <span style={{ fontFamily: '"Orbitron", sans-serif', fontSize: 14, color: GOLD }}>ADD QUESTION</span>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Question text *</label>
                <input style={inputStyle} value={addForm.text} onChange={e => setAddForm(f => ({ ...f, text: e.target.value }))} placeholder="Ask something..." />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <input style={inputStyle} value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Sleep, Business..." />
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  value={addForm.type}
                  onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))}
                >
                  {Object.entries(T).map(([k, v]) => (
                    <option key={v} value={v}>{k}</option>
                  ))}
                </select>
              </div>
              {[T.SINGLE, T.MULTI].includes(addForm.type) && (
                <div>
                  <label style={labelStyle}>Options (comma-separated)</label>
                  <input style={inputStyle} value={addForm.options} onChange={e => setAddForm(f => ({ ...f, options: e.target.value }))} placeholder="Option 1, Option 2, Option 3" />
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => setAddForm(f => ({ ...f, required: !f.required }))}
                  style={{
                    width: 32, height: 32, borderRadius: 6,
                    background: addForm.required ? GOLD : 'transparent',
                    border: `1px solid ${addForm.required ? GOLD : BORDER}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {addForm.required && <Check size={14} color="#000" />}
                </button>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: TEXT2 }}>Required</span>
              </div>
              <button
                className="ci-btn-gold"
                onClick={handleAdd}
                disabled={!addForm.text.trim()}
                style={{ marginTop: 8 }}
              >
                Save Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab select view ──────────────────────────────────────────────────────────

function TabSelectView({ checkInData, onStart, onEditMode }) {
  const todayStr    = today()
  const morningDone = !!checkInData?.morning?.[todayStr]
  const eveningDone = !!checkInData?.evening?.[todayStr]

  const cardBase = {
    flex: 1, minWidth: 260,
    background: CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 20,
    padding: 32,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
    position: 'relative',
    boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
  }

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{ background: BG, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 20px 80px' }}>
      {/* Title */}
      <div style={{
        fontFamily: '"Orbitron", sans-serif',
        fontSize: 32,
        fontWeight: 900,
        background: 'linear-gradient(90deg, #a855f7, #06b6d4)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: '0.12em',
        marginBottom: 8,
      }}>
        CHECK-IN
      </div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: MUTED, marginBottom: 48 }}>
        {dateLabel}
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 640 }}>
        {/* Morning */}
        <div style={{ ...cardBase, borderColor: morningDone ? GOLD : BORDER }}>
          <div style={{ fontSize: 40 }}>☀️</div>
          <div style={{ fontFamily: '"Orbitron", sans-serif', fontSize: 16, color: GOLD, letterSpacing: '0.1em' }}>MORNING</div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: MUTED, textAlign: 'center' }}>
            {DEFAULT_MORNING.length} questions · Sleep, Energy, Intentions
          </div>
          {morningDone ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(251,191,36,0.12)', border: `1px solid ${GOLD}`,
              borderRadius: 100, padding: '6px 14px',
              fontFamily: 'Inter, sans-serif', fontSize: 12, color: GOLD, fontWeight: 600,
            }}>
              <Check size={12} /> Completed
            </div>
          ) : (
            <button className="ci-btn-gold" onClick={() => onStart('morning')}>
              Start →
            </button>
          )}
        </div>

        {/* Evening */}
        <div style={{ ...cardBase, borderColor: eveningDone ? '#818cf8' : BORDER }}>
          <div style={{ fontSize: 40 }}>🌙</div>
          <div style={{ fontFamily: '"Orbitron", sans-serif', fontSize: 16, color: '#818cf8', letterSpacing: '0.1em' }}>EVENING</div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: MUTED, textAlign: 'center' }}>
            {DEFAULT_EVENING.length} questions · Execution, Nutrition, Reflection
          </div>
          {eveningDone ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(129,140,248,0.12)', border: '1px solid #818cf8',
              borderRadius: 100, padding: '6px 14px',
              fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#818cf8', fontWeight: 600,
            }}>
              <Check size={12} /> Completed
            </div>
          ) : (
            <button
              onClick={() => onStart('evening')}
              style={{
                background: '#818cf8', color: '#000', fontWeight: 700,
                fontFamily: 'Inter, sans-serif', border: 'none',
                borderRadius: 10, padding: '14px 40px', fontSize: 15, cursor: 'pointer',
              }}
            >
              Start →
            </button>
          )}
        </div>
      </div>

      {/* Edit toggle */}
      <button
        onClick={onEditMode}
        style={{
          marginTop: 48, background: 'transparent', border: `1px solid ${BORDER}`,
          borderRadius: 8, padding: '8px 18px',
          fontFamily: 'Inter, sans-serif', fontSize: 12, color: MUTED,
          cursor: 'pointer',
        }}
      >
        Edit Questions
      </button>
    </div>
  )
}

// ─── Question view ────────────────────────────────────────────────────────────

function QuestionView({ tab, qIndex, activeQs, answers, slideDir, onAnswer, onNext, onPrev, onSkip }) {
  const q = activeQs[qIndex]
  if (!q) return null

  const value = answers[q.id]

  const handleAnswer = (val) => onAnswer(q.id, val)

  const progress = ((qIndex + 1) / activeQs.length) * 100

  return (
    <div style={{ background: Q_BG, minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Progress bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#1a1a2e', zIndex: 10 }}>
        <div style={{ height: '100%', background: GOLD, width: `${progress}%`, transition: 'width 0.35s ease', borderRadius: 2 }} />
      </div>

      {/* Top bar */}
      <div style={{
        height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', flexShrink: 0, marginTop: 3,
      }}>
        <button
          onClick={onPrev}
          style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}
        >
          <ChevronLeft size={22} color={MUTED} />
        </button>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: MUTED, letterSpacing: '0.06em' }}>
          Q {qIndex + 1} of {activeQs.length}
        </span>
        {!q.required ? (
          <button
            onClick={onSkip}
            style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: '0.04em' }}
          >
            SKIP
          </button>
        ) : (
          <div style={{ width: 48 }} />
        )}
      </div>

      {/* Question area — animated */}
      <div
        key={`${tab}-${qIndex}`}
        className={slideDir === 'forward' ? 'slide-in-forward' : 'slide-in-back'}
        style={{
          flex: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '20px 24px 48px',
          gap: 40,
        }}
      >
        {/* Category */}
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: 600, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.14em', textAlign: 'center' }}>
          {q.category}
        </div>

        {/* Question text */}
        <div style={{
          fontFamily: '"Orbitron", sans-serif',
          fontSize: 'clamp(18px, 4vw, 28px)',
          fontWeight: 900,
          color: '#fff',
          maxWidth: 600,
          textAlign: 'center',
          lineHeight: 1.3,
        }}>
          {q.text}
        </div>

        {/* Answer area */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          {q.type === T.SINGLE && (
            <SingleAnswer q={q} value={value} onChange={v => handleAnswer(v)} onAutoAdvance={onNext} />
          )}
          {q.type === T.MULTI && (
            <MultiAnswer q={q} value={value} onChange={v => handleAnswer(v)} onContinue={onNext} />
          )}
          {q.type === T.SLIDER && (
            <SliderAnswer q={q} value={value} onChange={v => handleAnswer(v)} onAutoAdvance={onNext} />
          )}
          {q.type === T.NUMERIC && (
            <NumericAnswer q={q} value={value} onChange={v => handleAnswer(v)} onContinue={onNext} />
          )}
          {q.type === T.TEXT && (
            <TextAnswer q={q} value={value || ''} onChange={v => handleAnswer(v)} onContinue={onNext} onSkip={onSkip} />
          )}
          {q.type === T.BINARY && (
            <BinaryAnswer q={q} value={value} onChange={v => handleAnswer(v)} onAutoAdvance={onNext} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Complete view ────────────────────────────────────────────────────────────

function CompleteView({ tab, answers, checkInData, aiSummary, aiLoading, onDone }) {
  const allDays = new Set([
    ...Object.keys(checkInData.morning || {}),
    ...Object.keys(checkInData.evening || {}),
  ])
  const dayCount = allDays.size

  const dayLabel = String(dayCount).padStart(3, '0')

  // Stats
  const overallScore = tab === 'evening' ? answers['ed1'] : answers['mi18']
  const nonNegs      = tab === 'evening' ? answers['en7'] : null
  const callCount    = tab === 'evening' ? answers['eb22'] : answers['mb21b']

  const statPillStyle = {
    background: CARD, border: `1px solid ${BORDER}`,
    borderRadius: 12, padding: '12px 20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    minWidth: 96,
  }

  return (
    <div style={{
      background: BG, minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px',
      gap: 32,
    }}>
      {/* Day number */}
      <div>
        <div style={{
          fontFamily: '"Orbitron", sans-serif',
          fontSize: 'clamp(56px, 16vw, 96px)',
          fontWeight: 900,
          color: GOLD,
          lineHeight: 1,
          textAlign: 'center',
          filter: 'drop-shadow(0 0 32px rgba(251,191,36,0.5))',
          letterSpacing: '0.06em',
        }}>
          DAY {dayLabel}
        </div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 6 }}>
          {tab === 'morning' ? '☀️ Morning check-in complete' : '🌙 Evening check-in complete'}
        </div>
      </div>

      {/* AI summary */}
      <div style={{ maxWidth: 440, textAlign: 'center' }}>
        {aiLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              border: `2px solid ${BORDER}`, borderTopColor: GOLD,
              animation: 'spin 0.7s linear infinite',
            }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: MUTED, fontStyle: 'italic' }}>Generating insight...</span>
          </div>
        ) : (
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, color: TEXT2, fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>
            "{aiSummary}"
          </p>
        )}
      </div>

      {/* Stat pills */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {overallScore != null && (
          <div style={statPillStyle}>
            <span style={{ fontFamily: '"Orbitron", sans-serif', fontSize: 22, color: GOLD, fontWeight: 900 }}>
              {overallScore}<span style={{ fontSize: 12, color: MUTED }}>/10</span>
            </span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {tab === 'evening' ? 'Overall' : 'Committed'}
            </span>
          </div>
        )}
        {tab === 'evening' && (
          <div style={statPillStyle}>
            <span style={{ fontSize: 22, color: nonNegs === 'YES' ? '#22c55e' : '#ef4444' }}>
              {nonNegs === 'YES' ? '✓' : '✗'}
            </span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Non-Negs
            </span>
          </div>
        )}
        {callCount != null && (
          <div style={statPillStyle}>
            <span style={{ fontFamily: '"Orbitron", sans-serif', fontSize: 22, color: '#818cf8', fontWeight: 900 }}>
              {callCount}
            </span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Calls
            </span>
          </div>
        )}
      </div>

      {/* Done button */}
      <button className="ci-btn-gold" onClick={onDone} style={{ padding: '16px 60px', fontSize: 16 }}>
        Done
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CheckIn() {
  const [morningQs, setMorningQs] = useLocalStorage('marko_checkin_morning_qs', DEFAULT_MORNING)
  const [eveningQs, setEveningQs] = useLocalStorage('marko_checkin_evening_qs', DEFAULT_EVENING)
  const [checkInData, setCheckInData] = useLocalStorage('marko_checkin', {})

  const [tab,        setTab]        = useState('morning')
  const [phase,      setPhase]      = useState('tab_select')
  const [qIndex,     setQIndex]     = useState(0)
  const [answers,    setAnswers]    = useState({})
  const [slideDir,   setSlideDir]   = useState('forward')
  const [slideKey,   setSlideKey]   = useState(0)
  const [editMode,   setEditMode]   = useState(false)
  const [aiSummary,  setAiSummary]  = useState('')
  const [aiLoading,  setAiLoading]  = useState(false)

  const todayStr = today()

  // Active questions filtered by showIf
  const activeQs = useMemo(
    () => (tab === 'morning' ? morningQs : eveningQs).filter(q => !q.showIf || q.showIf(answers)),
    [tab, morningQs, eveningQs, answers]
  )

  const onAnswer = useCallback((id, val) => {
    setAnswers(prev => ({ ...prev, [id]: val }))
  }, [])

  const goNext = useCallback(() => {
    if (qIndex >= activeQs.length - 1) {
      completeCheckIn()
      return
    }
    setSlideDir('forward')
    setSlideKey(k => k + 1)
    setQIndex(i => i + 1)
  }, [qIndex, activeQs.length])

  const goPrev = useCallback(() => {
    if (qIndex === 0) {
      setPhase('tab_select')
      return
    }
    setSlideDir('back')
    setSlideKey(k => k + 1)
    setQIndex(i => i - 1)
  }, [qIndex])

  const skipQ = useCallback(() => {
    goNext()
  }, [goNext])

  async function completeCheckIn() {
    // Save data
    const saved = {
      answers,
      completedAt: new Date().toISOString(),
    }
    setCheckInData(prev => ({
      ...prev,
      [tab]: {
        ...(prev[tab] || {}),
        [todayStr]: saved,
      },
    }))

    // Sync cross-section
    syncToSections(tab, answers, todayStr)

    // Switch to complete phase
    setPhase('complete')

    // Generate AI summary
    setAiLoading(true)
    try {
      const summary = await generateSummary(tab, answers)
      setAiSummary(summary)
    } finally {
      setAiLoading(false)
    }
  }

  function startTab(selectedTab) {
    const existing = checkInData?.[selectedTab]?.[todayStr]?.answers || {}
    setTab(selectedTab)
    setAnswers(existing)
    setQIndex(0)
    setSlideDir('forward')
    setSlideKey(k => k + 1)
    setPhase('questions')
  }

  function handleDone() {
    setPhase('tab_select')
    setQIndex(0)
    setAnswers({})
    setAiSummary('')
  }

  return (
    <>
      <style>{STYLES}</style>

      {editMode && (
        <EditModeView
          morningQs={morningQs}
          setMorningQs={setMorningQs}
          eveningQs={eveningQs}
          setEveningQs={setEveningQs}
          onBack={() => setEditMode(false)}
        />
      )}

      {!editMode && phase === 'tab_select' && (
        <TabSelectView
          checkInData={checkInData}
          onStart={startTab}
          onEditMode={() => setEditMode(true)}
        />
      )}

      {!editMode && phase === 'questions' && (
        <QuestionView
          key={slideKey}
          tab={tab}
          qIndex={qIndex}
          activeQs={activeQs}
          answers={answers}
          slideDir={slideDir}
          onAnswer={onAnswer}
          onNext={goNext}
          onPrev={goPrev}
          onSkip={skipQ}
        />
      )}

      {!editMode && phase === 'complete' && (
        <CompleteView
          tab={tab}
          answers={answers}
          checkInData={checkInData}
          aiSummary={aiSummary}
          aiLoading={aiLoading}
          onDone={handleDone}
        />
      )}
    </>
  )
}
