import { useState } from 'react'
import { X, Settings2 } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { DEFAULT_WIN_SETTINGS, saveWinDaySettings, getWinHistory, calcDayScore } from '../utils/winLoss'

const WIN  = '#c9a84c'
const LOSS = '#ef4444'
const BG   = '#030311'
const CARD = '#0d0d28'
const BORD = '#1d1d4a'
const TEXT2 = '#94a3b8'

const METRIC_LABELS = {
  calories:  'Calorie Target',
  protein:   'Protein Target',
  steps:     'Step Goal',
  gym:       'Gym Session',
  workHours: 'Work Output (/10)',
  nonNeg:    'Non-Negotiables',
  tasks:     'Daily Tasks (80%)',
}

const HAS_TARGET = { calories: true, protein: true, steps: true, workHours: true }
const TARGET_LABELS = {
  calories:  { label: 'Max calories', unit: 'kcal', min: 1000, max: 5000, step: 100 },
  protein:   { label: 'Min protein',  unit: 'g',    min: 50,   max: 400,  step: 5   },
  steps:     { label: 'Min steps',    unit: 'steps', min: 2000, max: 20000, step: 500 },
  workHours: { label: 'Min score',    unit: '/10',  min: 1,    max: 10,   step: 0.5 },
}

export default function WinDaySettings({ onClose, dailyData, bodyData, dietData }) {
  const [raw, setRaw] = useLocalStorage('marko_winday_settings', DEFAULT_WIN_SETTINGS)
  const settings = {
    threshold: raw.threshold ?? DEFAULT_WIN_SETTINGS.threshold,
    metrics: Object.fromEntries(
      Object.keys(DEFAULT_WIN_SETTINGS.metrics).map(k => [
        k, { ...DEFAULT_WIN_SETTINGS.metrics[k], ...raw.metrics?.[k] }
      ])
    ),
  }
  const [localSettings, setLocalSettings] = useState(settings)
  const [tab, setTab] = useState('settings')

  const save = () => {
    setRaw(localSettings)
    saveWinDaySettings(localSettings)
    onClose()
  }

  const toggleMetric = (key) => {
    setLocalSettings(s => ({
      ...s,
      metrics: { ...s.metrics, [key]: { ...s.metrics[key], enabled: !s.metrics[key].enabled } }
    }))
  }

  const setTarget = (key, val) => {
    setLocalSettings(s => ({
      ...s,
      metrics: { ...s.metrics, [key]: { ...s.metrics[key], target: val } }
    }))
  }

  const history30 = getWinHistory(30, localSettings, dailyData, bodyData, dietData)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(3,3,17,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'linear-gradient(135deg, #0d0d28 0%, #090918 100%)',
        border: `1px solid ${BORD}`,
        borderTop: `2px solid ${WIN}`,
        borderRadius: 16, width: 540, maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        boxShadow: `0 0 60px rgba(201,168,76,0.12), 0 0 120px rgba(3,3,17,0.8)`,
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Settings2 size={16} color={WIN} />
            <span style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 14, color: WIN, letterSpacing: '0.1em' }}>
              WIN DAY SETTINGS
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: TEXT2, cursor: 'pointer', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, padding: '16px 24px 0' }}>
          {[['settings', 'Settings'], ['history', 'Day History']].map(([id, lbl]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '7px 16px', border: 'none', cursor: 'pointer',
              background: tab === id ? `${WIN}18` : 'transparent',
              borderBottom: `2px solid ${tab === id ? WIN : 'transparent'}`,
              color: tab === id ? WIN : TEXT2,
              fontFamily: 'Inter', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              transition: 'all 0.15s',
            }}>{lbl}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {tab === 'settings' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Win threshold */}
              <div style={{ background: BG, border: `1px solid ${BORD}`, borderRadius: 10, padding: 16 }}>
                <div style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 700, color: WIN, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>
                  WIN THRESHOLD
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <input type="range" min={60} max={100} step={5}
                    value={localSettings.threshold}
                    onChange={e => setLocalSettings(s => ({ ...s, threshold: parseInt(e.target.value) }))}
                    className="checkin-slider" style={{ flex: 1 }}
                  />
                  <span style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 900, fontSize: 32, color: WIN, minWidth: 52, textAlign: 'right' }}>
                    {localSettings.threshold}%
                  </span>
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: 10, color: TEXT2, marginTop: 6 }}>
                  A day is a WIN when you hit {localSettings.threshold}% or more of tracked metrics
                </div>
              </div>

              {/* Metrics */}
              <div>
                <div style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 700, color: TEXT2, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
                  TRACKED METRICS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.keys(METRIC_LABELS).map(key => {
                    const m = localSettings.metrics[key]
                    const cfg = TARGET_LABELS[key]
                    return (
                      <div key={key} style={{
                        background: BG, border: `1px solid ${m.enabled ? WIN + '30' : BORD}`,
                        borderRadius: 8, padding: '12px 14px',
                        opacity: m.enabled ? 1 : 0.5, transition: 'all 0.2s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <span style={{ fontFamily: 'Inter', fontSize: 12, color: 'white' }}>{METRIC_LABELS[key]}</span>
                          <button onClick={() => toggleMetric(key)} style={{
                            width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                            background: m.enabled ? WIN : '#1d1d4a',
                            position: 'relative', flexShrink: 0, transition: 'background 0.2s',
                          }}>
                            <div style={{
                              position: 'absolute', top: 3, left: m.enabled ? 18 : 3,
                              width: 14, height: 14, borderRadius: '50%', background: 'white',
                              transition: 'left 0.2s',
                            }} />
                          </button>
                        </div>
                        {m.enabled && HAS_TARGET[key] && (
                          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontFamily: 'Inter', fontSize: 10, color: TEXT2, minWidth: 80 }}>{cfg.label}</span>
                            <input type="range" min={cfg.min} max={cfg.max} step={cfg.step}
                              value={m.target}
                              onChange={e => setTarget(key, parseFloat(e.target.value))}
                              className="checkin-slider" style={{ flex: 1, height: 3 }}
                            />
                            <span style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 900, fontSize: 18, color: WIN, minWidth: 60, textAlign: 'right' }}>
                              {key === 'steps' ? m.target.toLocaleString() : m.target}{cfg.unit !== 'steps' ? ' ' + cfg.unit : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* History tab */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...history30].reverse().map(h => {
                if (h.available === 0) return (
                  <div key={h.date} style={{ padding: '10px 14px', background: BG, border: `1px solid ${BORD}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'Inter', fontSize: 11, color: TEXT2 }}>{h.date}</span>
                    <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#1d1d4a' }}>NO DATA</span>
                  </div>
                )
                const missed = h.metrics.filter(m => !m.pass).map(m => m.label)
                return (
                  <div key={h.date} style={{
                    padding: '10px 14px', background: BG,
                    border: `1px solid ${h.isWin ? WIN + '40' : LOSS + '30'}`,
                    borderLeft: `3px solid ${h.isWin ? WIN : LOSS}`,
                    borderRadius: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'Inter', fontSize: 11, color: 'white' }}>{h.date}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: '"Barlow Condensed",sans-serif', fontWeight: 900, fontSize: 16, color: h.isWin ? WIN : LOSS }}>
                          {h.pct}%
                        </span>
                        <span style={{
                          fontFamily: 'Inter', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                          color: h.isWin ? WIN : LOSS, background: h.isWin ? WIN + '18' : LOSS + '18',
                          border: `1px solid ${h.isWin ? WIN + '40' : LOSS + '40'}`,
                          borderRadius: 4, padding: '2px 8px',
                        }}>{h.isWin ? 'WIN' : 'LOSS'}</span>
                      </div>
                    </div>
                    {!h.isWin && missed.length > 0 && (
                      <div style={{ marginTop: 4, fontFamily: 'Inter', fontSize: 10, color: LOSS + 'cc' }}>
                        Missed: {missed.join(', ')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {tab === 'settings' && (
          <div style={{ padding: '16px 24px', borderTop: `1px solid ${BORD}`, display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: '10px', background: 'transparent', border: `1px solid ${BORD}`,
              color: TEXT2, borderRadius: 8, fontFamily: 'Inter', fontSize: 10,
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
            }}>Cancel</button>
            <button onClick={save} style={{
              flex: 2, padding: '10px', background: `linear-gradient(135deg, ${WIN}, #b8972a)`,
              color: '#000', border: 'none', borderRadius: 8, fontFamily: 'Inter', fontSize: 10,
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
              boxShadow: `0 0 20px ${WIN}40`,
            }}>Save Settings</button>
          </div>
        )}
      </div>
    </div>
  )
}
