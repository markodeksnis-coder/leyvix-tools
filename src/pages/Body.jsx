import { useState, useRef } from 'react'
import { Plus, Check, Camera, Settings as SettingsIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { today as getToday } from '../utils'

// ─── Design tokens ───────────────────────────────────────────────
const BG          = '#030311'
const SURF        = '#09091f'
const CARD_BG     = '#0d0d28'
const CARD_BORDER = '#1d1d4a'
const GOLD        = '#fbbf24'
const CYAN        = '#22d3ee'
const BLUE        = '#3b82f6'
const GREEN       = '#10b981'
const PURPLE      = '#8b5cf6'
const PINK        = '#e879f9'
const RED         = '#f43f5e'
const TEXT2       = '#94a3b8'
const MUTED       = '#64748b'

const HEADING_STYLE = {
  fontFamily: '"Orbitron", "Space Grotesk", sans-serif',
}

const S = {
  sectionLabel: {
    fontFamily: '"Orbitron", "Space Grotesk", sans-serif',
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '0.3em',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  input: {
    width: '100%',
    background: SURF,
    border: `1px solid ${CARD_BORDER}`,
    borderRadius: 6,
    padding: '7px 10px',
    fontFamily: 'Inter',
    fontSize: 13,
    color: 'white',
    outline: 'none',
    boxSizing: 'border-box',
  },
  goldBtn: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    padding: '7px 16px',
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.04em',
    boxShadow: '0 0 16px rgba(16,185,129,0.35)',
  },
  blueBtn: {
    background: BLUE,
    color: 'white',
    border: 'none',
    borderRadius: 6,
    padding: '7px 16px',
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  ghostBtn: {
    background: 'transparent',
    color: TEXT2,
    border: `1px solid ${CARD_BORDER}`,
    borderRadius: 6,
    padding: '5px 12px',
    fontFamily: 'Inter',
    fontSize: 11,
    cursor: 'pointer',
  },
}

// ─── Sub-components ───────────────────────────────────────────────
function SectionLabel({ children, color = GREEN }) {
  return (
    <div style={{ ...S.sectionLabel, color, marginBottom: 12 }}>{children}</div>
  )
}

function Pill({ children, color }) {
  return (
    <span style={{
      background: `${color}18`,
      border: `1px solid ${color}40`,
      color,
      borderRadius: 20,
      padding: '4px 12px',
      fontFamily: 'Inter',
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: '0.04em',
    }}>
      {children}
    </span>
  )
}

function ProgressBar({ label, current, target, unit, color }) {
  const pct = target ? Math.min(100, Math.round((current / target) * 100)) : 0
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: TEXT2, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 6 }}>{label}</div>
      <div style={{ height: 4, background: CARD_BORDER, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: 4, background: color, borderRadius: 2, width: `${pct}%`, transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <span style={{ fontFamily: 'Inter', fontSize: 11, color: 'white', fontWeight: 600 }}>
          {current}<span style={{ color: TEXT2, fontWeight: 400 }}> / {target}{unit}</span>
        </span>
        <span style={{ fontFamily: 'Inter', fontSize: 11, color: pct >= 100 ? GREEN : TEXT2 }}>{pct}%</span>
      </div>
    </div>
  )
}

// ─── Convert any image to JPEG via canvas (handles HEIC, HEIF, etc.) ─────────
function toJpegDataUrl(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1200
      let { naturalWidth: w, naturalHeight: h } = img
      if (w > MAX || h > MAX) {
        const r = Math.min(MAX / w, MAX / h)
        w = Math.round(w * r); h = Math.round(h * r)
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not decode image. Try saving it as a JPEG first.')) }
    img.src = url
  })
}

// ─── analyzePhoto ─────────────────────────────────────────────────
async function analyzePhoto(file) {
  const apiKey = localStorage.getItem('anthropic_key') || import.meta.env.VITE_ANTHROPIC_API_KEY || ''
  if (!apiKey) throw new Error('No API key set')
  const dataUrl = await toJpegDataUrl(file)
  const base64 = dataUrl.split(',')[1]
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey, 'anthropic-version': '2023-06-01',
      'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001', max_tokens: 200,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
        { type: 'text', text: 'Estimate calories and protein for this meal. Return ONLY JSON: {"calories": number, "protein": number}' }
      ]}]
    })
  })
  const data = await res.json()
  if (!res.ok || !data.content?.[0]?.text) {
    throw new Error(data.error?.message || `API error ${res.status}`)
  }
  const text = data.content[0].text.trim()
  return JSON.parse(text.startsWith('{') ? text : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
}

// ─── Main component ───────────────────────────────────────────────
const DEFAULT_LIFTS = ['Bench Press', 'Squat', 'Deadlift', 'Overhead Press']

export default function Body() {
  const todayStr = getToday()

  const [body, setBody] = useLocalStorage('marko_body', {})
  const [diet, setDiet] = useLocalStorage('marko_diet', {
    targets: { calories: 2800, protein: 220 },
    history: [],
    supplements: [],
  })

  // Inline lift log form state: which lift is expanded
  const [openLift, setOpenLift] = useState(null)
  const [liftForm, setLiftForm] = useState({ weight: '', reps: '', feel: 3, date: todayStr })

  // Custom lift log form
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customLiftForm, setCustomLiftForm] = useState({ lift: '', weight: '', reps: '', feel: 3, date: todayStr })

  // Nutrition settings
  const [showNutrSettings, setShowNutrSettings] = useState(false)
  const [nutrTargets, setNutrTargets] = useState({ calories: String(diet.targets?.calories || 2800), protein: String(diet.targets?.protein || 220) })

  // Photo meal log
  const photoInputRef = useRef(null)
  const progressPhotoInputRef = useRef(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoEstimate, setPhotoEstimate] = useState(null)
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [photoConfirm, setPhotoConfirm] = useState({ calories: '', protein: '' })

  // ── Derived data ──────────────────────────────────────────────
  const todayDiet = diet.history?.find(h => h.date === todayStr) || { calories: 0, protein: 0 }
  const prs = body.prs || {}

  const allLifts = [
    ...DEFAULT_LIFTS,
    ...Object.keys(prs).filter(k => !DEFAULT_LIFTS.includes(k)),
  ]

  // AI coach logic: any lift with last session >14 days ago & energy assumed 8
  const assumedEnergy = 8
  const coachNudge = (() => {
    if (allLifts.length === 0 || Object.keys(prs).length === 0) return null
    for (const lift of allLifts) {
      const pr = prs[lift]
      if (!pr) continue
      const daysSince = pr.date
        ? Math.floor((Date.now() - new Date(pr.date + 'T12:00:00').getTime()) / 86400000)
        : 99
      if (daysSince >= 14 && assumedEnergy >= 7) {
        const suggested = Math.round((pr.weight + 2.5) * 2) / 2 // round to .5
        return { lift, pr, daysSince, suggested }
      }
    }
    return null
  })()

  // ── Logic ─────────────────────────────────────────────────────
  const logLiftSession = (liftName, form) => {
    if (!liftName.trim() || !form.weight) return
    const session = {
      id: Date.now(),
      date: form.date || todayStr,
      lift: liftName.trim(),
      weight: parseFloat(form.weight),
      reps: parseInt(form.reps) || 1,
      feel: form.feel,
    }
    const currentPR = prs[liftName.trim()]
    const updates = { liftSessions: [session, ...(body.liftSessions || [])] }
    if (!currentPR || parseFloat(form.weight) > currentPR.weight) {
      updates.prs = {
        ...(body.prs || {}),
        [liftName.trim()]: {
          weight: parseFloat(form.weight),
          reps: parseInt(form.reps) || 1,
          date: form.date || todayStr,
        },
      }
    }
    setBody(b => ({ ...b, ...updates }))
  }

  const addPR = (liftName, weight, reps, date) => {
    if (!liftName.trim() || !weight) return
    setBody(b => ({
      ...b,
      prs: {
        ...(b.prs || {}),
        [liftName.trim()]: { weight: parseFloat(weight), reps: parseInt(reps) || 1, date: date || todayStr },
      },
    }))
  }

  const updateStats = (weight) => {
    if (!weight) return
    const w = parseFloat(weight)
    const entry = { date: todayStr, weight: w }
    setBody(b => ({
      ...b,
      currentWeight: w,
      weightHistory: [...(b.weightHistory || []).filter(h => h.date !== todayStr), entry]
        .sort((a, b) => a.date.localeCompare(b.date)),
    }))
  }

  const logMeal = (calories, protein, carbs = 0, fats = 0, date = todayStr) => {
    if (!calories) return
    const history = [...(diet.history || [])]
    const idx = history.findIndex(h => h.date === date)
    if (idx >= 0) {
      history[idx] = {
        ...history[idx],
        calories: (history[idx].calories || 0) + parseFloat(calories || 0),
        protein: (history[idx].protein || 0) + parseFloat(protein || 0),
        carbs: (history[idx].carbs || 0) + parseFloat(carbs || 0),
        fats: (history[idx].fats || 0) + parseFloat(fats || 0),
      }
    } else {
      history.push({ date, calories: parseFloat(calories || 0), protein: parseFloat(protein || 0), carbs: parseFloat(carbs || 0), fats: parseFloat(fats || 0) })
    }
    setDiet(d => ({ ...d, history: history.sort((a, b2) => a.date.localeCompare(b2.date)) }))
  }

  // ── Inline lift log handlers ──────────────────────────────────
  const handleLiftRowClick = (lift) => {
    if (openLift === lift) {
      setOpenLift(null)
    } else {
      setOpenLift(lift)
      setLiftForm({ weight: '', reps: '', feel: 3, date: todayStr })
    }
  }

  const handleLiftSubmit = (liftName) => {
    logLiftSession(liftName, liftForm)
    setOpenLift(null)
    setLiftForm({ weight: '', reps: '', feel: 3, date: todayStr })
  }

  const handleCustomLiftSubmit = () => {
    if (!customLiftForm.lift.trim() || !customLiftForm.weight) return
    logLiftSession(customLiftForm.lift, customLiftForm)
    setCustomLiftForm({ lift: '', weight: '', reps: '', feel: 3, date: todayStr })
    setShowCustomForm(false)
  }

  // ── Photo meal handlers ───────────────────────────────────────
  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoEstimate(null)
    setPhotoError('')
    setPhotoConfirm({ calories: '', protein: '' })
    try {
      // Convert to JPEG for preview so HEIC/HEIF works in all browsers
      const jpegUrl = await toJpegDataUrl(file)
      setPhotoPreview(jpegUrl)
    } catch {
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handlePhotoAnalyze = async () => {
    if (!photoFile) return
    setPhotoAnalyzing(true)
    setPhotoError('')
    try {
      const est = await analyzePhoto(photoFile)
      setPhotoEstimate(est)
      setPhotoConfirm({ calories: String(est.calories), protein: String(est.protein) })
    } catch (err) {
      setPhotoError(err.message || 'Analysis failed')
    } finally {
      setPhotoAnalyzing(false)
    }
  }

  const handlePhotoLog = () => {
    const cals = parseFloat(photoConfirm.calories) || 0
    const prot = parseFloat(photoConfirm.protein) || 0
    logMeal(cals, prot)
    setPhotoFile(null)
    setPhotoPreview(null)
    setPhotoEstimate(null)
    setPhotoConfirm({ calories: '', protein: '' })
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  // ── Progress photos ───────────────────────────────────────────
  const handleProgressPhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const url = ev.target.result
      const photo = {
        id: Date.now(),
        date: todayStr,
        weight: body.currentWeight || null,
        url,
      }
      setBody(b => ({ ...b, progressPhotos: [photo, ...(b.progressPhotos || [])] }))
    }
    reader.readAsDataURL(file)
  }

  // ── Nutrition targets save ────────────────────────────────────
  const saveNutrTargets = () => {
    setDiet(d => ({
      ...d,
      targets: {
        ...d.targets,
        calories: parseFloat(nutrTargets.calories) || 2800,
        protein: parseFloat(nutrTargets.protein) || 220,
      },
    }))
    setShowNutrSettings(false)
  }

  // ── Date display ──────────────────────────────────────────────
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()
  const proteinPct = Math.round(((todayDiet.protein || 0) / (diet.targets?.protein || 220)) * 100)

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: BG, overflow: 'hidden' }}>

      {/* ── TopBar ── */}
      <div style={{
        background: SURF,
        borderBottom: `1px solid ${CARD_BORDER}`,
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: 'Inter', fontSize: 11, color: TEXT2, letterSpacing: '0.05em' }}>{dateLabel}</span>
          <span style={{
            fontFamily: '"Orbitron", sans-serif',
            fontWeight: 900,
            fontSize: 22,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            background: 'linear-gradient(135deg, #10b981, #22d3ee)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>BODY</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Pill color={CYAN}>{body.currentWeight ? `${body.currentWeight} KG` : '— KG'}</Pill>
          <Pill color={GREEN}>{proteinPct}% PROTEIN</Pill>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 20,
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
      }}>

        {/* ════════════════════════ LEFT COLUMN ════════════════════════ */}
        <div style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Section header */}
          <SectionLabel color={GREEN}>MAIN LIFTS</SectionLabel>

          {/* Lift rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allLifts.map(lift => {
              const pr = prs[lift]
              const isOpen = openLift === lift
              return (
                <div key={lift} style={{
                  background: 'linear-gradient(135deg, #0d0d28 0%, #0a0a20 100%)',
                  border: '1px solid #1d1d4a',
                  boxShadow: '0 0 0 1px rgba(16,185,129,0.08)',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}>
                  {/* Row */}
                  <div
                    onClick={() => handleLiftRowClick(lift)}
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: 'white' }}>{lift}</span>
                    <div style={{ textAlign: 'right' }}>
                      {pr ? (
                        <>
                          <div style={{
                            fontFamily: '"Orbitron", sans-serif',
                            fontSize: 24,
                            fontWeight: 900,
                            color: GREEN,
                            lineHeight: 1,
                          }}>{pr.weight}</div>
                          <div style={{ fontFamily: 'Inter', fontSize: 7, color: TEXT2, textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: 1 }}>PR</div>
                        </>
                      ) : (
                        <div style={{ fontFamily: '"Orbitron", sans-serif', fontSize: 24, fontWeight: 900, color: MUTED }}>—</div>
                      )}
                    </div>
                  </div>

                  {/* Inline log form */}
                  {isOpen && (
                    <div style={{ borderTop: `1px solid ${CARD_BORDER}`, padding: '12px 16px', background: BG }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                        <div>
                          <div style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: TEXT2, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 4 }}>WEIGHT</div>
                          <input
                            type="number"
                            value={liftForm.weight}
                            onChange={e => setLiftForm(f => ({ ...f, weight: e.target.value }))}
                            placeholder={pr ? String(pr.weight) : '0'}
                            style={S.input}
                            autoFocus
                          />
                        </div>
                        <div>
                          <div style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: TEXT2, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 4 }}>REPS</div>
                          <input
                            type="number"
                            value={liftForm.reps}
                            onChange={e => setLiftForm(f => ({ ...f, reps: e.target.value }))}
                            placeholder="5"
                            style={S.input}
                          />
                        </div>
                        <div>
                          <div style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: TEXT2, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 4 }}>DATE</div>
                          <input
                            type="date"
                            value={liftForm.date}
                            onChange={e => setLiftForm(f => ({ ...f, date: e.target.value }))}
                            style={S.input}
                          />
                        </div>
                      </div>

                      {/* Feel rating */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: TEXT2, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 6 }}>FEEL</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[1, 2, 3, 4, 5].map(n => (
                            <button
                              key={n}
                              onClick={() => setLiftForm(f => ({ ...f, feel: n }))}
                              style={{
                                flex: 1,
                                padding: '6px 0',
                                borderRadius: 6,
                                border: `1px solid ${liftForm.feel >= n ? GREEN : CARD_BORDER}`,
                                background: liftForm.feel >= n ? `${GREEN}20` : 'transparent',
                                color: liftForm.feel >= n ? GREEN : TEXT2,
                                fontFamily: 'Inter',
                                fontSize: 14,
                                cursor: 'pointer',
                              }}
                            >★</button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleLiftSubmit(lift)} style={S.goldBtn}>LOG SESSION</button>
                        <button onClick={() => setOpenLift(null)} style={S.ghostBtn}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add custom lift button */}
          <div>
            {!showCustomForm ? (
              <button
                onClick={() => setShowCustomForm(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'transparent', border: `1px dashed ${MUTED}`,
                  borderRadius: 8, padding: '9px 14px', cursor: 'pointer',
                  fontFamily: 'Inter', fontSize: 12, color: TEXT2, width: '100%',
                  justifyContent: 'center',
                }}
              >
                <Plus size={13} strokeWidth={2} /> LOG SESSION
              </button>
            ) : (
              <div style={{
                background: 'linear-gradient(135deg, #0d0d28 0%, #0a0a20 100%)',
                border: '1px solid #1d1d4a',
                boxShadow: '0 0 0 1px rgba(16,185,129,0.08)',
                borderRadius: 8,
                padding: '12px 16px',
              }}>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: TEXT2, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 4 }}>LIFT NAME</div>
                  <input
                    type="text"
                    value={customLiftForm.lift}
                    onChange={e => setCustomLiftForm(f => ({ ...f, lift: e.target.value }))}
                    placeholder="e.g. Romanian Deadlift"
                    style={S.input}
                    autoFocus
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: TEXT2, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 4 }}>WEIGHT</div>
                    <input type="number" value={customLiftForm.weight} onChange={e => setCustomLiftForm(f => ({ ...f, weight: e.target.value }))} placeholder="0" style={S.input} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: TEXT2, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 4 }}>REPS</div>
                    <input type="number" value={customLiftForm.reps} onChange={e => setCustomLiftForm(f => ({ ...f, reps: e.target.value }))} placeholder="5" style={S.input} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: TEXT2, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 4 }}>DATE</div>
                    <input type="date" value={customLiftForm.date} onChange={e => setCustomLiftForm(f => ({ ...f, date: e.target.value }))} style={S.input} />
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: TEXT2, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 6 }}>FEEL</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setCustomLiftForm(f => ({ ...f, feel: n }))}
                        style={{
                          flex: 1, padding: '6px 0', borderRadius: 6,
                          border: `1px solid ${customLiftForm.feel >= n ? GREEN : CARD_BORDER}`,
                          background: customLiftForm.feel >= n ? `${GREEN}20` : 'transparent',
                          color: customLiftForm.feel >= n ? GREEN : TEXT2,
                          fontFamily: 'Inter', fontSize: 14, cursor: 'pointer',
                        }}
                      >★</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleCustomLiftSubmit} style={S.goldBtn}>LOG SESSION</button>
                  <button onClick={() => setShowCustomForm(false)} style={S.ghostBtn}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* AI Coach Card */}
          <div style={{
            background: 'linear-gradient(135deg, #0d0d28 0%, #0a0a20 100%)',
            border: '1px solid #1d1d4a',
            boxShadow: '0 0 0 1px rgba(16,185,129,0.08)',
            borderRadius: 8,
            padding: 14,
            marginTop: 4,
          }}>
            <div style={{ fontFamily: '"Orbitron", "Space Grotesk", sans-serif', fontSize: 8, fontWeight: 600, color: CYAN, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 8 }}>AI COACH</div>
            {coachNudge ? (
              <div style={{ fontFamily: 'Inter', fontSize: 13, color: 'white', lineHeight: 1.5 }}>
                Energy high today. Attempt{' '}
                <span style={{ color: GREEN, fontWeight: 700 }}>{coachNudge.lift}</span>{' '}
                PR — try{' '}
                <span style={{ color: CYAN, fontWeight: 700 }}>{coachNudge.suggested}kg</span>.{' '}
                <span style={{ color: TEXT2, fontSize: 11 }}>Last PR: {coachNudge.pr.weight}kg ({coachNudge.daysSince}d ago)</span>
              </div>
            ) : Object.keys(prs).length === 0 ? (
              <div style={{ fontFamily: 'Inter', fontSize: 13, color: TEXT2 }}>
                Log your first session to get AI coaching.
              </div>
            ) : (
              <div style={{ fontFamily: 'Inter', fontSize: 13, color: TEXT2 }}>
                All lifts are on track. Keep it consistent.
              </div>
            )}
          </div>

        </div>

        {/* ════════════════════════ RIGHT COLUMN ════════════════════════ */}
        <div style={{ flex: '0 0 calc(45% - 16px)', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Section header */}
          <SectionLabel color={PURPLE}>NUTRITION TODAY</SectionLabel>

          {/* Progress bars */}
          <div style={{
            background: 'linear-gradient(135deg, #0d0d28 0%, #0a0a20 100%)',
            border: '1px solid #1d1d4a',
            boxShadow: '0 0 0 1px rgba(16,185,129,0.08)',
            borderRadius: 8,
            padding: '14px 16px',
          }}>
            <ProgressBar
              label="Calories"
              current={Math.round(todayDiet.calories || 0)}
              target={diet.targets?.calories || 2800}
              unit="kcal"
              color={PURPLE}
            />
            <ProgressBar
              label="Protein"
              current={Math.round(todayDiet.protein || 0)}
              target={diet.targets?.protein || 220}
              unit="g"
              color={GREEN}
            />
          </div>

          {/* Photo Meal Log */}
          <div style={{
            background: 'linear-gradient(135deg, #0d0d28 0%, #0a0a20 100%)',
            border: '1px solid #1d1d4a',
            boxShadow: '0 0 0 1px rgba(16,185,129,0.08)',
            borderRadius: 8,
            padding: '14px 16px',
          }}>
            <div style={{ fontFamily: '"Orbitron", "Space Grotesk", sans-serif', fontSize: 9, fontWeight: 600, color: PURPLE, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 10 }}>LOG MEAL</div>

            {!photoPreview ? (
              <div
                onClick={() => photoInputRef.current?.click()}
                style={{
                  border: `2px dashed ${CARD_BORDER}`,
                  borderRadius: 12,
                  padding: '24px',
                  minHeight: 120,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = PURPLE}
                onMouseLeave={e => e.currentTarget.style.borderColor = CARD_BORDER}
              >
                <Camera size={24} color={MUTED} strokeWidth={1.5} />
                <span style={{ fontFamily: 'Inter', fontSize: 12, color: MUTED, textAlign: 'center' }}>
                  Tap to log meal with photo
                </span>
              </div>
            ) : (
              <div>
                <img
                  src={photoPreview}
                  alt="meal"
                  style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8, border: `1px solid ${CARD_BORDER}`, marginBottom: 10 }}
                />
                {!photoEstimate && (
                  <button
                    onClick={handlePhotoAnalyze}
                    disabled={photoAnalyzing}
                    style={{
                      ...S.blueBtn,
                      width: '100%',
                      opacity: photoAnalyzing ? 0.6 : 1,
                      cursor: photoAnalyzing ? 'not-allowed' : 'pointer',
                      marginBottom: photoError ? 8 : 0,
                    }}
                  >
                    {photoAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
                  </button>
                )}
                {photoError && (
                  <div style={{ fontFamily: 'Inter', fontSize: 11, color: RED, marginBottom: 8 }}>{photoError}</div>
                )}
                {photoEstimate && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: TEXT2, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 4 }}>CALORIES</div>
                        <input
                          type="number"
                          value={photoConfirm.calories}
                          onChange={e => setPhotoConfirm(p => ({ ...p, calories: e.target.value }))}
                          style={{ ...S.input, color: CYAN, fontWeight: 700, fontSize: 16 }}
                        />
                      </div>
                      <div>
                        <div style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: TEXT2, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 4 }}>PROTEIN (g)</div>
                        <input
                          type="number"
                          value={photoConfirm.protein}
                          onChange={e => setPhotoConfirm(p => ({ ...p, protein: e.target.value }))}
                          style={{ ...S.input, color: GREEN, fontWeight: 700, fontSize: 16 }}
                        />
                      </div>
                    </div>
                    <button onClick={handlePhotoLog} style={{ ...S.goldBtn, width: '100%' }}>
                      Log This Meal
                    </button>
                  </div>
                )}
                <button
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); setPhotoEstimate(null); setPhotoError(''); if (photoInputRef.current) photoInputRef.current.value = '' }}
                  style={{ ...S.ghostBtn, marginTop: 8, width: '100%' }}
                >
                  Clear
                </button>
              </div>
            )}
            <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }} />
          </div>

          {/* Nutrition Settings (collapsible) */}
          <div style={{
            background: 'linear-gradient(135deg, #0d0d28 0%, #0a0a20 100%)',
            border: '1px solid #1d1d4a',
            boxShadow: '0 0 0 1px rgba(16,185,129,0.08)',
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            <button
              onClick={() => setShowNutrSettings(s => !s)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '10px 16px', background: 'transparent', border: 'none',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SettingsIcon size={13} color={TEXT2} strokeWidth={1.5} />
                <span style={{ fontFamily: 'Inter', fontSize: 11, color: TEXT2 }}>Edit Targets</span>
              </div>
              {showNutrSettings ? <ChevronUp size={13} color={TEXT2} /> : <ChevronDown size={13} color={TEXT2} />}
            </button>
            {showNutrSettings && (
              <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${CARD_BORDER}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: TEXT2, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 4 }}>CALORIES TARGET</div>
                    <input
                      type="number"
                      value={nutrTargets.calories}
                      onChange={e => setNutrTargets(t => ({ ...t, calories: e.target.value }))}
                      style={S.input}
                    />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: TEXT2, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 4 }}>PROTEIN TARGET (g)</div>
                    <input
                      type="number"
                      value={nutrTargets.protein}
                      onChange={e => setNutrTargets(t => ({ ...t, protein: e.target.value }))}
                      style={S.input}
                    />
                  </div>
                </div>
                <button onClick={saveNutrTargets} style={S.goldBtn}>Save</button>
              </div>
            )}
          </div>

          {/* Progress Photos */}
          <div>
            <div style={{ ...S.sectionLabel, color: GREEN, marginBottom: 10 }}>PROGRESS PHOTOS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {/* Upload button */}
              <div
                onClick={() => progressPhotoInputRef.current?.click()}
                style={{
                  aspectRatio: '3/4',
                  background: 'linear-gradient(135deg, #0d0d28 0%, #0a0a20 100%)',
                  border: `1px dashed ${MUTED}`,
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  gap: 4,
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = GREEN}
                onMouseLeave={e => e.currentTarget.style.borderColor = MUTED}
              >
                <Plus size={18} color={MUTED} strokeWidth={1.5} />
                <span style={{ fontFamily: 'Inter', fontSize: 9, color: MUTED }}>ADD</span>
              </div>

              {/* Photo cards */}
              {(body.progressPhotos || []).slice(0, 8).map(photo => (
                <div key={photo.id} style={{ aspectRatio: '3/4', borderRadius: 8, overflow: 'hidden', position: 'relative', border: `1px solid ${CARD_BORDER}` }}>
                  <img
                    src={photo.url}
                    alt={photo.date}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(transparent, rgba(3,5,8,0.85))',
                    padding: '16px 6px 6px',
                  }}>
                    <div style={{ fontFamily: 'Inter', fontSize: 9, color: 'white', fontWeight: 600 }}>
                      {new Date(photo.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    {photo.weight && (
                      <div style={{ fontFamily: 'Inter', fontSize: 8, color: TEXT2 }}>{photo.weight}kg</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <input ref={progressPhotoInputRef} type="file" accept="image/*" onChange={handleProgressPhoto} style={{ display: 'none' }} />
          </div>

        </div>
      </div>
    </div>
  )
}
