import { useState, useRef } from 'react'
import { Plus, Check, Camera, Settings as SettingsIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { today as getToday } from '../utils'

// ─── Design tokens ───────────────────────────────────────────────
const GOLD   = '#f0c040'
const INDIGO = '#818cf8'
const VIOLET = '#a78bfa'
const CYAN   = '#22d3ee'
const TEAL   = '#2dd4bf'
const GREEN  = '#10b981'
const RED    = '#ff5555'
const PINK   = '#e879f9'
const BLUE   = '#60a5fa'
const TEXT1  = '#e2e8f0'
const TEXT2  = '#94a3b8'
const MUTED  = '#64748b'
const DARK   = '#334155'

const CARD = {
  background: 'rgba(8,12,26,0.65)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(99,102,241,0.18)',
  borderRadius: 16,
}

const S = {
  sectionLabel: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  input: {
    width: '100%',
    background: 'rgba(5,8,20,0.75)',
    border: '1px solid rgba(99,102,241,0.18)',
    borderRadius: 8,
    padding: '8px 11px',
    fontFamily: 'Inter',
    fontSize: 13,
    color: 'white',
    outline: 'none',
    boxSizing: 'border-box',
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, #2dd4bf, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    padding: '8px 18px',
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.06em',
    boxShadow: '0 4px 20px rgba(45,212,191,0.35)',
  },
  ghostBtn: {
    background: 'rgba(99,102,241,0.08)',
    color: TEXT2,
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 8,
    padding: '7px 14px',
    fontFamily: 'Inter',
    fontSize: 12,
    cursor: 'pointer',
  },
  analyzeBtn: {
    background: 'linear-gradient(135deg, #818cf8, #6366f1)',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    padding: '8px 18px',
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.06em',
    boxShadow: '0 4px 20px rgba(129,140,248,0.35)',
  },
}

// ─── Sub-components ───────────────────────────────────────────────
function SectionLabel({ children, color = TEAL }) {
  return (
    <div style={{ ...S.sectionLabel, color }}>{children}</div>
  )
}

function Pill({ children, color }) {
  return (
    <span style={{
      background: `${color}18`,
      border: `1px solid ${color}50`,
      color,
      borderRadius: 20,
      padding: '4px 13px',
      fontFamily: '"Barlow Condensed", sans-serif',
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: '0.08em',
    }}>
      {children}
    </span>
  )
}

function ProgressBar({ label, current, target, unit, color }) {
  const pct = target ? Math.min(100, Math.round((current / target) * 100)) : 0
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 9, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: 7 }}>{label}</div>
      <div style={{ height: 5, background: 'rgba(99,102,241,0.12)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: 5,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          borderRadius: 3,
          width: `${pct}%`,
          transition: 'width 0.5s ease',
          boxShadow: `0 0 8px ${color}`,
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: 13, color: TEXT1, fontWeight: 700 }}>
          {current}<span style={{ color: TEXT2, fontWeight: 400 }}> / {target}{unit}</span>
        </span>
        <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: 13, color: pct >= 100 ? TEAL : TEXT2, fontWeight: 600 }}>{pct}%</span>
      </div>
    </div>
  )
}

// ─── Convert any image to JPEG (handles HEIC/HEIF via heic2any) ──────────────
async function toJpegDataUrl(file) {
  let blob = file
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif' ||
                 /\.(heic|heif)$/i.test(file.name) || file.type === ''
  if (isHeic) {
    const { default: heic2any } = await import('heic2any')
    const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })
    blob = Array.isArray(result) ? result[0] : result
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
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
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not decode image')) }
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

  // Quick manual meal log
  const [quickLog, setQuickLog] = useState({ calories: '', protein: '', carbs: '', fats: '' })

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
    <div style={{ background: 'transparent', minHeight: '100%', overflowY: 'auto' }}>

      {/* ── Page Header ── */}
      <div style={{ position: 'relative', padding: '20px 24px 16px', overflow: 'hidden' }}>
        {/* Top gradient line */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 2,
          background: 'linear-gradient(90deg, transparent, #2dd4bf, #059669, transparent)',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{
              fontFamily: '"Orbitron", monospace',
              fontSize: 9,
              fontWeight: 700,
              color: MUTED,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
            }}>{dateLabel}</span>
            <span style={{
              fontFamily: '"Orbitron", monospace',
              fontWeight: 900,
              fontSize: 26,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: 'linear-gradient(135deg, #2dd4bf, #059669)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: 'none',
            }}>BODY</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Pill color={CYAN}>{body.currentWeight ? `${body.currentWeight} KG` : '— KG'}</Pill>
            <Pill color={TEAL}>{proteinPct}% PROTEIN</Pill>
          </div>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{
        padding: '0 24px 24px',
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
      }}>

        {/* ════════════════════════ LEFT COLUMN ════════════════════════ */}
        <div style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Main Lifts card */}
          <div className="fade-up delay-1" style={{ ...CARD, padding: '18px 20px' }}>
            <SectionLabel color={TEAL}>MAIN LIFTS</SectionLabel>

            {/* Lift rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allLifts.map(lift => {
                const pr = prs[lift]
                const isOpen = openLift === lift
                return (
                  <div key={lift} style={{
                    background: isOpen ? 'rgba(45,212,191,0.05)' : 'rgba(5,8,20,0.5)',
                    border: isOpen ? '1px solid rgba(45,212,191,0.3)' : '1px solid rgba(99,102,241,0.12)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}>
                    {/* Row */}
                    <div
                      onClick={() => handleLiftRowClick(lift)}
                      style={{
                        padding: '13px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: TEXT1 }}>{lift}</span>
                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        {pr ? (
                          <>
                            <div style={{
                              fontFamily: '"Barlow Condensed", sans-serif',
                              fontSize: 28,
                              fontWeight: 900,
                              color: TEAL,
                              lineHeight: 1,
                              textShadow: `0 0 20px ${TEAL}60`,
                            }}>{pr.weight}</div>
                            <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 7, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.2em' }}>PR</div>
                          </>
                        ) : (
                          <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: 28, fontWeight: 900, color: DARK }}>—</div>
                        )}
                      </div>
                    </div>

                    {/* Inline log form */}
                    {isOpen && (
                      <div style={{ borderTop: '1px solid rgba(99,102,241,0.15)', padding: '14px 16px', background: 'rgba(5,8,20,0.6)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                          <div>
                            <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: 5 }}>WEIGHT</div>
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
                            <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: 5 }}>REPS</div>
                            <input
                              type="number"
                              value={liftForm.reps}
                              onChange={e => setLiftForm(f => ({ ...f, reps: e.target.value }))}
                              placeholder="5"
                              style={S.input}
                            />
                          </div>
                          <div>
                            <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: 5 }}>DATE</div>
                            <input
                              type="date"
                              value={liftForm.date}
                              onChange={e => setLiftForm(f => ({ ...f, date: e.target.value }))}
                              style={S.input}
                            />
                          </div>
                        </div>

                        {/* Feel rating */}
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: 7 }}>FEEL</div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {[1, 2, 3, 4, 5].map(n => (
                              <button
                                key={n}
                                onClick={() => setLiftForm(f => ({ ...f, feel: n }))}
                                style={{
                                  flex: 1,
                                  padding: '7px 0',
                                  borderRadius: 8,
                                  border: `1px solid ${liftForm.feel >= n ? TEAL + '80' : 'rgba(99,102,241,0.15)'}`,
                                  background: liftForm.feel >= n ? `rgba(45,212,191,0.12)` : 'rgba(5,8,20,0.5)',
                                  color: liftForm.feel >= n ? TEAL : MUTED,
                                  fontFamily: 'Inter',
                                  fontSize: 14,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                }}
                              >★</button>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleLiftSubmit(lift)} style={S.primaryBtn}>LOG SESSION</button>
                          <button onClick={() => setOpenLift(null)} style={S.ghostBtn}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Add custom lift button */}
            <div style={{ marginTop: 10 }}>
              {!showCustomForm ? (
                <button
                  onClick={() => setShowCustomForm(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(45,212,191,0.05)',
                    border: '1px dashed rgba(45,212,191,0.25)',
                    borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                    fontFamily: 'Inter', fontSize: 12, color: MUTED, width: '100%',
                    justifyContent: 'center', letterSpacing: '0.04em',
                    transition: 'border-color 0.2s, color 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(45,212,191,0.5)'; e.currentTarget.style.color = TEAL }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(45,212,191,0.25)'; e.currentTarget.style.color = MUTED }}
                >
                  <Plus size={13} strokeWidth={2} /> LOG SESSION
                </button>
              ) : (
                <div style={{
                  background: 'rgba(5,8,20,0.5)',
                  border: '1px solid rgba(45,212,191,0.25)',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: 5 }}>LIFT NAME</div>
                    <input
                      type="text"
                      value={customLiftForm.lift}
                      onChange={e => setCustomLiftForm(f => ({ ...f, lift: e.target.value }))}
                      placeholder="e.g. Romanian Deadlift"
                      style={S.input}
                      autoFocus
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: 5 }}>WEIGHT</div>
                      <input type="number" value={customLiftForm.weight} onChange={e => setCustomLiftForm(f => ({ ...f, weight: e.target.value }))} placeholder="0" style={S.input} />
                    </div>
                    <div>
                      <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: 5 }}>REPS</div>
                      <input type="number" value={customLiftForm.reps} onChange={e => setCustomLiftForm(f => ({ ...f, reps: e.target.value }))} placeholder="5" style={S.input} />
                    </div>
                    <div>
                      <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: 5 }}>DATE</div>
                      <input type="date" value={customLiftForm.date} onChange={e => setCustomLiftForm(f => ({ ...f, date: e.target.value }))} style={S.input} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: 7 }}>FEEL</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          onClick={() => setCustomLiftForm(f => ({ ...f, feel: n }))}
                          style={{
                            flex: 1, padding: '7px 0', borderRadius: 8,
                            border: `1px solid ${customLiftForm.feel >= n ? TEAL + '80' : 'rgba(99,102,241,0.15)'}`,
                            background: customLiftForm.feel >= n ? 'rgba(45,212,191,0.12)' : 'rgba(5,8,20,0.5)',
                            color: customLiftForm.feel >= n ? TEAL : MUTED,
                            fontFamily: 'Inter', fontSize: 14, cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >★</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleCustomLiftSubmit} style={S.primaryBtn}>LOG SESSION</button>
                    <button onClick={() => setShowCustomForm(false)} style={S.ghostBtn}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Coach Card */}
          <div className="fade-up delay-2" style={{ ...CARD, padding: '16px 20px' }}>
            <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 9, fontWeight: 700, color: CYAN, textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: 10 }}>AI COACH</div>
            {coachNudge ? (
              <div style={{ fontFamily: 'Inter', fontSize: 13, color: TEXT1, lineHeight: 1.6 }}>
                Energy high today. Attempt{' '}
                <span style={{ color: TEAL, fontWeight: 700 }}>{coachNudge.lift}</span>{' '}
                PR — try{' '}
                <span style={{ color: CYAN, fontWeight: 700 }}>{coachNudge.suggested}kg</span>.{' '}
                <span style={{ color: TEXT2, fontSize: 11 }}>Last PR: {coachNudge.pr.weight}kg ({coachNudge.daysSince}d ago)</span>
              </div>
            ) : Object.keys(prs).length === 0 ? (
              <div style={{ fontFamily: 'Inter', fontSize: 13, color: TEXT2, lineHeight: 1.6 }}>
                Log your first session to get AI coaching.
              </div>
            ) : (
              <div style={{ fontFamily: 'Inter', fontSize: 13, color: TEXT2, lineHeight: 1.6 }}>
                All lifts are on track. Keep it consistent.
              </div>
            )}
          </div>

        </div>

        {/* ════════════════════════ RIGHT COLUMN ════════════════════════ */}
        <div style={{ flex: '0 0 calc(45% - 16px)', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Nutrition progress card */}
          <div className="fade-up delay-3" style={{ ...CARD, padding: '18px 20px' }}>
            <SectionLabel color={VIOLET}>NUTRITION TODAY</SectionLabel>
            <ProgressBar
              label="Calories"
              current={Math.round(todayDiet.calories || 0)}
              target={diet.targets?.calories || 2800}
              unit="kcal"
              color={VIOLET}
            />
            <ProgressBar
              label="Protein"
              current={Math.round(todayDiet.protein || 0)}
              target={diet.targets?.protein || 220}
              unit="g"
              color={TEAL}
            />

            {/* Quick manual log */}
            <div style={{ borderTop: '1px solid rgba(99,102,241,0.15)', paddingTop: 16, marginTop: 4 }}>
              <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: 10 }}>
                LOG MEAL
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                {[
                  { key: 'calories', label: 'KCAL',    color: VIOLET, placeholder: '600' },
                  { key: 'protein',  label: 'PROTEIN g', color: TEAL,  placeholder: '40' },
                  { key: 'carbs',    label: 'CARBS g',   color: GOLD,  placeholder: '70' },
                  { key: 'fats',     label: 'FATS g',    color: PINK,  placeholder: '15' },
                ].map(({ key, label, color, placeholder }) => (
                  <div key={key}>
                    <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 7, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 5 }}>{label}</div>
                    <input
                      type="number"
                      value={quickLog[key]}
                      onChange={e => setQuickLog(q => ({ ...q, [key]: e.target.value }))}
                      placeholder={placeholder}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          logMeal(quickLog.calories, quickLog.protein, quickLog.carbs, quickLog.fats)
                          setQuickLog({ calories: '', protein: '', carbs: '', fats: '' })
                        }
                      }}
                      style={{
                        ...S.input,
                        borderColor: quickLog[key] ? `${color}70` : 'rgba(99,102,241,0.25)',
                        color: quickLog[key] ? color : TEXT1,
                        fontWeight: 700,
                        fontSize: 15,
                        padding: '8px 10px',
                      }}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  if (!quickLog.calories && !quickLog.protein) return
                  logMeal(quickLog.calories || 0, quickLog.protein || 0, quickLog.carbs || 0, quickLog.fats || 0)
                  setQuickLog({ calories: '', protein: '', carbs: '', fats: '' })
                }}
                style={{
                  ...S.primaryBtn,
                  width: '100%',
                  background: 'linear-gradient(135deg, #a78bfa, #6366f1)',
                  boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                  padding: '11px 0',
                  fontSize: 13,
                }}
              >
                + ADD MEAL
              </button>
            </div>
          </div>

          {/* Photo Meal Log card */}
          <div className="fade-up delay-4" style={{ ...CARD, padding: '18px 20px' }}>
            <SectionLabel color={INDIGO}>LOG MEAL</SectionLabel>

            {!photoPreview ? (
              <div
                onClick={() => photoInputRef.current?.click()}
                style={{
                  border: '2px dashed rgba(99,102,241,0.2)',
                  borderRadius: 12,
                  padding: '28px',
                  minHeight: 120,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(129,140,248,0.5)'; e.currentTarget.style.background = 'rgba(99,102,241,0.04)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; e.currentTarget.style.background = 'transparent' }}
              >
                <Camera size={26} color={MUTED} strokeWidth={1.5} />
                <span style={{ fontFamily: 'Inter', fontSize: 12, color: MUTED, textAlign: 'center' }}>
                  Tap to log meal with photo
                </span>
              </div>
            ) : (
              <div>
                <img
                  src={photoPreview}
                  alt="meal"
                  style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)', marginBottom: 12 }}
                />
                {!photoEstimate && (
                  <button
                    onClick={handlePhotoAnalyze}
                    disabled={photoAnalyzing}
                    style={{
                      ...S.analyzeBtn,
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: 5 }}>CALORIES</div>
                        <input
                          type="number"
                          value={photoConfirm.calories}
                          onChange={e => setPhotoConfirm(p => ({ ...p, calories: e.target.value }))}
                          style={{ ...S.input, color: CYAN, fontWeight: 700, fontSize: 16 }}
                        />
                      </div>
                      <div>
                        <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: 5 }}>PROTEIN (g)</div>
                        <input
                          type="number"
                          value={photoConfirm.protein}
                          onChange={e => setPhotoConfirm(p => ({ ...p, protein: e.target.value }))}
                          style={{ ...S.input, color: TEAL, fontWeight: 700, fontSize: 16 }}
                        />
                      </div>
                    </div>
                    <button onClick={handlePhotoLog} style={{ ...S.primaryBtn, width: '100%' }}>
                      Log This Meal
                    </button>
                  </div>
                )}
                <button
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); setPhotoEstimate(null); setPhotoError(''); if (photoInputRef.current) photoInputRef.current.value = '' }}
                  style={{ ...S.ghostBtn, marginTop: 10, width: '100%' }}
                >
                  Clear
                </button>
              </div>
            )}
            <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }} />
          </div>

          {/* Nutrition Settings (collapsible) */}
          <div className="fade-up delay-5" style={{ ...CARD, overflow: 'hidden' }}>
            <button
              onClick={() => setShowNutrSettings(s => !s)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '12px 20px', background: 'transparent', border: 'none',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SettingsIcon size={13} color={TEXT2} strokeWidth={1.5} />
                <span style={{ fontFamily: 'Inter', fontSize: 12, color: TEXT2, letterSpacing: '0.02em' }}>Edit Targets</span>
              </div>
              {showNutrSettings
                ? <ChevronUp size={13} color={MUTED} />
                : <ChevronDown size={13} color={MUTED} />}
            </button>
            {showNutrSettings && (
              <div style={{ padding: '0 20px 16px', borderTop: '1px solid rgba(99,102,241,0.12)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: 5 }}>CALORIES TARGET</div>
                    <input
                      type="number"
                      value={nutrTargets.calories}
                      onChange={e => setNutrTargets(t => ({ ...t, calories: e.target.value }))}
                      style={S.input}
                    />
                  </div>
                  <div>
                    <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: 5 }}>PROTEIN TARGET (g)</div>
                    <input
                      type="number"
                      value={nutrTargets.protein}
                      onChange={e => setNutrTargets(t => ({ ...t, protein: e.target.value }))}
                      style={S.input}
                    />
                  </div>
                </div>
                <button onClick={saveNutrTargets} style={S.primaryBtn}>Save</button>
              </div>
            )}
          </div>

          {/* Progress Photos */}
          <div className="fade-up delay-6">
            <div style={{ ...S.sectionLabel, color: TEAL, marginBottom: 12 }}>PROGRESS PHOTOS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {/* Upload button */}
              <div
                onClick={() => progressPhotoInputRef.current?.click()}
                style={{
                  aspectRatio: '3/4',
                  background: 'rgba(8,12,26,0.65)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px dashed rgba(45,212,191,0.25)',
                  borderRadius: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  gap: 5,
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(45,212,191,0.55)'; e.currentTarget.style.background = 'rgba(45,212,191,0.05)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(45,212,191,0.25)'; e.currentTarget.style.background = 'rgba(8,12,26,0.65)' }}
              >
                <Plus size={18} color={MUTED} strokeWidth={1.5} />
                <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, color: MUTED, letterSpacing: '0.2em' }}>ADD</span>
              </div>

              {/* Photo cards */}
              {(body.progressPhotos || []).slice(0, 8).map(photo => (
                <div key={photo.id} style={{
                  aspectRatio: '3/4', borderRadius: 10, overflow: 'hidden',
                  position: 'relative', border: '1px solid rgba(99,102,241,0.18)',
                }}>
                  <img
                    src={photo.url}
                    alt={photo.date}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(transparent, rgba(2,4,14,0.9))',
                    padding: '18px 7px 7px',
                  }}>
                    <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: 10, color: TEXT1, fontWeight: 700, letterSpacing: '0.04em' }}>
                      {new Date(photo.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    {photo.weight && (
                      <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: 9, color: TEXT2 }}>{photo.weight}kg</div>
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
