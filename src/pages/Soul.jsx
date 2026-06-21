import { useState } from 'react'
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronUp, Archive } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import { calcStreak, today } from '../utils'

const cls = {
  input: "w-full bg-[#06060f] border border-[#1a1a2e] px-3 py-2 text-sm text-white placeholder-[#4b5563] focus:outline-none focus:border-[#f59e0b] transition-colors",
  label: "block text-[9px] font-mono uppercase tracking-widest text-[#4b5563] mb-1.5",
}

export default function Soul() {
  const [data, setData] = useLocalStorage('marko_soul', { prayers: [], values: [], identity: '', identityArchive: [] })
  const prayers = data.prayers || []
  const values = data.values || []

  const [showPrayerModal, setShowPrayerModal] = useState(false)
  const [pf, setPf] = useState({ content: '', date: today() })
  const [editingValIdx, setEditingValIdx] = useState(null)
  const [editingValText, setEditingValText] = useState('')
  const [editingValDesc, setEditingValDesc] = useState('')
  const [addingVal, setAddingVal] = useState(false)
  const [newVal, setNewVal] = useState({ value: '', description: '' })
  const [editingIdentity, setEditingIdentity] = useState(false)
  const [identityDraft, setIdentityDraft] = useState('')
  const [showArchive, setShowArchive] = useState(false)
  const [showAllPrayers, setShowAllPrayers] = useState(false)

  const prayerStreak = calcStreak(prayers.map(p => p.date))

  const addPrayer = () => {
    if (!pf.content.trim()) return
    setData(d => ({ ...d, prayers: [{ ...pf, id: Date.now() }, ...(d.prayers || [])] }))
    setPf({ content: '', date: today() })
    setShowPrayerModal(false)
  }

  const deletePrayer = id => setData(d => ({ ...d, prayers: (d.prayers || []).filter(p => p.id !== id) }))

  const startEditVal = idx => {
    setEditingValIdx(idx)
    setEditingValText(values[idx].value)
    setEditingValDesc(values[idx].description || '')
  }

  const saveVal = () => {
    if (editingValText.trim()) {
      const v = [...values]
      v[editingValIdx] = { ...v[editingValIdx], value: editingValText.trim(), description: editingValDesc.trim() }
      setData(d => ({ ...d, values: v }))
    }
    setEditingValIdx(null)
  }

  const addVal = () => {
    if (!newVal.value.trim()) return
    setData(d => ({ ...d, values: [...(d.values || []), { ...newVal, id: Date.now() }] }))
    setNewVal({ value: '', description: '' })
    setAddingVal(false)
  }

  const deleteVal = idx => setData(d => ({ ...d, values: values.filter((_, i) => i !== idx) }))

  const startEditIdentity = () => {
    setIdentityDraft(data.identity || '')
    setEditingIdentity(true)
  }

  const saveIdentity = () => {
    if (data.identity && data.identity !== identityDraft) {
      setData(d => ({
        ...d,
        identity: identityDraft,
        identityArchive: [{ id: Date.now(), content: d.identity, date: today() }, ...(d.identityArchive || [])]
      }))
    } else {
      setData(d => ({ ...d, identity: identityDraft }))
    }
    setEditingIdentity(false)
  }

  const displayedPrayers = showAllPrayers ? prayers : prayers.slice(0, 5)

  return (
    <div className="h-full flex flex-col" style={{ background: '#06060f' }}>
      {/* Page Header */}
      <div style={{ background: '#06060f', borderBottom: '1px solid #1a1a2e', padding: '20px 32px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, color: '#4b5563', letterSpacing: '0.12em', textTransform: 'uppercase' }}>SPIRITUAL ALIGNMENT ACTIVE</span>
            </div>
            <h1 style={{ fontFamily: '"Bebas Neue",cursive', fontSize: 64, fontWeight: 400, lineHeight: 0.9, fontStyle: 'italic', letterSpacing: '0.02em', background: 'linear-gradient(180deg,#facc15 0%,#f59e0b 60%,#f97316 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
              SOUL
            </h1>
            <p style={{ fontFamily: 'Inter', fontSize: 10, color: '#4b5563', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>PRAYER · VALUES · IDENTITY PROTOCOL</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => { setPf({ content: '', date: today() }); setShowPrayerModal(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#f59e0b', color: '#000', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}
            >
              <Plus size={9} /> Log Prayer
            </button>
            <button
              onClick={() => { setNewVal({ value: '', description: '' }); setAddingVal(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid #1a1a2e', color: '#4b5563', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer' }}
            >
              <Plus size={9} /> Add Value
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto" style={{ padding: '24px 32px' }}>
        <div className="space-y-10">

          {/* Identity Statement */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div style={{ fontSize: 10, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#f59e0b', fontWeight: 600 }}>Who I Am Becoming</div>
              </div>
              <div className="flex items-center gap-2">
                {(data.identityArchive || []).length > 0 && (
                  <button onClick={() => setShowArchive(!showArchive)} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#4b5563', fontSize: 9, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.12em', background: 'none', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#6b7280'}
                    onMouseLeave={e => e.currentTarget.style.color = '#4b5563'}
                  >
                    <Archive size={10} /> Archive ({(data.identityArchive || []).length})
                  </button>
                )}
                {!editingIdentity && (
                  <button onClick={startEditIdentity} style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = '#4b5563'}
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </div>
            </div>

            {editingIdentity ? (
              <div>
                <textarea
                  value={identityDraft}
                  onChange={e => setIdentityDraft(e.target.value)}
                  placeholder="I am a man of God, built for impact..."
                  rows={8}
                  autoFocus
                  className={cls.input + " resize-none text-sm leading-relaxed"}
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={saveIdentity} style={{ padding: '8px 20px', background: '#f59e0b', color: '#000', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', border: 'none', cursor: 'pointer' }}>Save</button>
                  <button onClick={() => setEditingIdentity(false)} style={{ padding: '8px 20px', border: '1px solid #1a1a2e', color: '#4b5563', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div
                onClick={startEditIdentity}
                style={{ background: '#0b0b16', border: '1px solid #1a1a2e', borderLeft: '3px solid #f59e0b', padding: 24, cursor: 'pointer', minHeight: 160, borderRadius: 12 }}
              >
                {data.identity ? (
                  <p style={{ fontSize: 14, color: '#888', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{data.identity}</p>
                ) : (
                  <p style={{ fontSize: 14, color: '#4b5563', fontStyle: 'italic', margin: 0 }}>Click to write your identity statement — who you are and who you are becoming.</p>
                )}
              </div>
            )}

            {showArchive && (data.identityArchive || []).length > 0 && (
              <div className="mt-4 space-y-2">
                <div style={{ fontSize: 9, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#4b5563', marginBottom: 8 }}>Past Versions</div>
                {(data.identityArchive || []).map(arch => (
                  <div key={arch.id} style={{ background: '#0b0b16', border: '1px solid #1a1a2e', padding: 16, borderRadius: 8 }}>
                    <div style={{ fontSize: 8, fontFamily: 'Inter', color: '#4b5563', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{arch.date}</div>
                    <p style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{arch.content}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Core Values */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div style={{ fontSize: 10, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#f59e0b', fontWeight: 600 }}>Core Values</div>
              {!addingVal && (
                <button onClick={() => { setNewVal({ value: '', description: '' }); setAddingVal(true) }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1px solid #1a1a2e', color: '#4b5563', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', background: 'transparent', cursor: 'pointer' }}>
                  <Plus size={9} /> Add
                </button>
              )}
            </div>
            <div className="space-y-1">
              {values.map((val, idx) => (
                <div
                  key={val.id || idx}
                  style={{ background: '#0b0b16', border: '1px solid #1a1a2e', borderRadius: 8, padding: '12px 16px' }}
                  className="group"
                  onMouseEnter={e => e.currentTarget.style.borderLeftColor = '#f59e0b'}
                  onMouseLeave={e => e.currentTarget.style.borderLeftColor = '#1a1a2e'}
                >
                  {editingValIdx === idx ? (
                    <div className="space-y-2">
                      <input value={editingValText} onChange={e => setEditingValText(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveVal()} autoFocus className="w-full bg-transparent text-sm font-bold text-white focus:outline-none" />
                      <input value={editingValDesc} onChange={e => setEditingValDesc(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveVal(); if (e.key === 'Escape') setEditingValIdx(null) }} placeholder="One-line description..." className="w-full bg-transparent text-xs focus:outline-none" style={{ color: '#4b5563' }} />
                      <div className="flex gap-2">
                        <button onClick={saveVal} style={{ fontSize: 8, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', padding: '4px 8px', background: 'transparent', cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setEditingValIdx(null)} style={{ fontSize: 8, fontFamily: 'Inter', textTransform: 'uppercase', color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <span className="text-sm font-bold text-white">{val.value}</span>
                        {val.description && <p style={{ fontSize: 12, color: '#4b5563', marginTop: 2 }}>{val.description}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEditVal(idx)} style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                          onMouseLeave={e => e.currentTarget.style.color = '#4b5563'}
                        ><Pencil size={11} /></button>
                        <button onClick={() => deleteVal(idx)} style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#f59e0b'}
                          onMouseLeave={e => e.currentTarget.style.color = '#4b5563'}
                        ><Trash2 size={11} /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {addingVal && (
                <div style={{ background: '#0b0b16', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '12px 16px' }} className="space-y-2">
                  <input value={newVal.value} onChange={e => setNewVal({ ...newVal, value: e.target.value })} onKeyDown={e => { if (e.key === 'Escape') setAddingVal(false) }} placeholder="Value name..." autoFocus className="w-full bg-transparent text-sm font-bold text-white focus:outline-none" style={{ placeholder: '#4b5563' }} />
                  <input value={newVal.description} onChange={e => setNewVal({ ...newVal, description: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') addVal(); if (e.key === 'Escape') setAddingVal(false) }} placeholder="One-line description..." className="w-full bg-transparent text-xs focus:outline-none" style={{ color: '#4b5563' }} />
                  <div className="flex gap-2">
                    <button onClick={addVal} style={{ fontSize: 8, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.12em', background: '#f59e0b', color: '#000', padding: '4px 12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Add</button>
                    <button onClick={() => setAddingVal(false)} style={{ fontSize: 8, fontFamily: 'Inter', textTransform: 'uppercase', color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={11} /></button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Prayer Log */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div style={{ fontSize: 10, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#f59e0b', fontWeight: 600 }}>Prayer Log</div>
                {prayerStreak.current > 0 && (
                  <span style={{ fontSize: 9, fontFamily: 'Inter', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.12em', background: 'rgba(245,158,11,0.08)', borderRadius: 4 }}>
                    {prayerStreak.current}d streak
                  </span>
                )}
              </div>
              <button onClick={() => { setPf({ content: '', date: today() }); setShowPrayerModal(true) }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1px solid #1a1a2e', color: '#4b5563', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', background: 'transparent', cursor: 'pointer' }}>
                <Plus size={9} /> Add
              </button>
            </div>
            {prayers.length === 0 ? (
              <div style={{ background: '#0b0b16', border: '1px solid #1a1a2e', padding: 24, textAlign: 'center', color: '#4b5563', fontSize: 10, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.12em', borderRadius: 12 }}>Start your prayer log</div>
            ) : (
              <div className="space-y-2">
                {displayedPrayers.map(prayer => (
                  <div key={prayer.id} style={{ background: '#06060f', border: '1px solid #1a1a2e', padding: 16, borderRadius: 8 }} className="group">
                    <div className="flex items-start justify-between gap-4">
                      <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6, flex: 1, whiteSpace: 'pre-wrap', margin: 0 }}>{prayer.content}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span style={{ fontSize: 8, fontFamily: 'Inter', color: '#4b5563' }}>{prayer.date}</span>
                        <button onClick={() => deletePrayer(prayer.id)} style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }} className="opacity-0 group-hover:opacity-100 transition-all"
                          onMouseEnter={e => e.currentTarget.style.color = '#f59e0b'}
                          onMouseLeave={e => e.currentTarget.style.color = '#4b5563'}
                        ><X size={11} /></button>
                      </div>
                    </div>
                  </div>
                ))}
                {prayers.length > 5 && (
                  <button onClick={() => setShowAllPrayers(!showAllPrayers)} className="w-full flex items-center justify-center gap-1 py-2 transition-colors" style={{ fontSize: 9, fontFamily: 'Inter', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.12em', background: 'none', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#6b7280'}
                    onMouseLeave={e => e.currentTarget.style.color = '#4b5563'}
                  >
                    {showAllPrayers ? <><ChevronUp size={9} /> Show Less</> : <><ChevronDown size={9} /> View All ({prayers.length})</>}
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {showPrayerModal && (
        <Modal title="Prayer Entry" onClose={() => setShowPrayerModal(false)}>
          <div className="space-y-4">
            <div><label className={cls.label}>Date</label><input type="date" value={pf.date} onChange={e => setPf({ ...pf, date: e.target.value })} className={cls.input} /></div>
            <div><label className={cls.label}>Prayer / Reflection</label><textarea value={pf.content} onChange={e => setPf({ ...pf, content: e.target.value })} placeholder="What are you praying about? What is God saying?" rows={6} autoFocus className={cls.input + " resize-none"} /></div>
            <div className="flex gap-2 pt-1">
              <button onClick={addPrayer} style={{ flex: 1, padding: '10px', background: '#f59e0b', color: '#000', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', border: 'none', cursor: 'pointer' }}>Save</button>
              <button onClick={() => setShowPrayerModal(false)} style={{ padding: '10px 16px', border: '1px solid #1a1a2e', color: '#4b5563', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
