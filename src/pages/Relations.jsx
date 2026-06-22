import { useState } from 'react'
import { Plus, Search, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import { fmtShort } from '../utils'

const TYPES = ['Friend','Mentor','Family','Business','God','Other']
const ENERGY = ['builds','neutral','drains']
const BEH_CATS = ['Body Language','Persuasion','Status','Emotion','Other']

const TYPE_COLORS = {
  Friend: 'text-[#22d3ee] border-[#22d3ee]/30',
  Mentor: 'text-[#f0c040] border-[#f0c040]/30',
  Family: 'text-[#1ad9a0] border-[#1ad9a0]/30',
  Business: 'text-[#4d9fff] border-[#4d9fff]/30',
  God: 'text-[#e879f9] border-[#e879f9]/30',
  Other: 'text-[#a0bcdf] border-[#444]/30',
}

const ENERGY_ICON = { builds: '⚡', neutral: '⚪', drains: '🔻' }

const cls = {
  input: "w-full bg-[#040810] border border-[#1e3050] px-3 py-2 text-sm text-white placeholder-[#a0bcdf] focus:outline-none focus:border-[#f43f5e] transition-colors",
  label: "block text-[9px] font-mono uppercase tracking-widest text-[#a0bcdf] mb-1.5",
}

export default function Relations() {
  const [data, setData] = useLocalStorage('marko_relations', { people: [], behaviorNotes: [] })
  const [search, setSearch] = useState('')
  const [behSearch, setBehSearch] = useState('')
  const [behCat, setBehCat] = useState('All')
  const [expanded, setExpanded] = useState({})
  const [showPersonModal, setShowPersonModal] = useState(false)
  const [showBehModal, setShowBehModal] = useState(false)
  const [pf, setPf] = useState({ name: '', type: 'Friend', energyRating: 'builds', notes: '' })
  const [bf, setBf] = useState({ observation: '', detail: '', category: 'Persuasion' })
  const [newPsyNote, setNewPsyNote] = useState({})

  const people = data.people || []
  const behaviorNotes = data.behaviorNotes || []

  const builders = people.filter(p => p.energyRating === 'builds').length
  const drainers = people.filter(p => p.energyRating === 'drains').length

  const filteredPeople = people.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.notes?.toLowerCase().includes(search.toLowerCase()))

  const filteredBeh = behaviorNotes.filter(n => {
    const matchCat = behCat === 'All' || n.category === behCat
    const q = behSearch.toLowerCase()
    const matchSearch = !q || n.observation.toLowerCase().includes(q) || n.detail?.toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  const addPerson = () => {
    if (!pf.name.trim()) return
    setData(d => ({ ...d, people: [...(d.people || []), { ...pf, id: Date.now(), lastContact: new Date().toISOString().split('T')[0], psychologyNotes: [] }] }))
    setPf({ name: '', type: 'Friend', energyRating: 'builds', notes: '' })
    setShowPersonModal(false)
  }

  const deletePerson = id => setData(d => ({ ...d, people: (d.people || []).filter(p => p.id !== id) }))

  const addPsyNote = (personId) => {
    const note = newPsyNote[personId]?.trim()
    if (!note) return
    setData(d => ({
      ...d,
      people: (d.people || []).map(p => p.id === personId
        ? { ...p, psychologyNotes: [...(p.psychologyNotes || []), { id: Date.now(), note, date: new Date().toISOString().split('T')[0] }] }
        : p)
    }))
    setNewPsyNote(n => ({ ...n, [personId]: '' }))
  }

  const addBehNote = () => {
    if (!bf.observation.trim()) return
    setData(d => ({ ...d, behaviorNotes: [{ ...bf, id: Date.now(), date: new Date().toISOString().split('T')[0] }, ...(d.behaviorNotes || [])] }))
    setBf({ observation: '', detail: '', category: 'Persuasion' })
    setShowBehModal(false)
  }

  const deleteBeh = id => setData(d => ({ ...d, behaviorNotes: (d.behaviorNotes || []).filter(n => n.id !== id) }))

  const daysSince = (dateStr) => {
    if (!dateStr) return null
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  }

  return (
    <div className="h-full flex flex-col" style={{ background: '#020609' }}>
      {/* Header */}
      <div style={{ background: '#020609', borderBottom: '1px solid #1e3050', padding: '20px 32px', flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, color: '#a0bcdf', letterSpacing: '0.12em', textTransform: 'uppercase' }}>NETWORK INTELLIGENCE ACTIVE</span>
          </div>
          <h1 style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 64, fontWeight: 400, lineHeight: 0.9, fontStyle: 'italic', letterSpacing: '0.02em', background: 'linear-gradient(135deg, #f43f5e, #db2777)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
            RELATIONS
          </h1>
          <p style={{ fontFamily: 'Inter', fontSize: 10, color: '#a0bcdf', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>PEOPLE · PSYCHOLOGY · NETWORK MAP</p>
        </div>
        <div style={{ marginTop: 16 }}>
          <button onClick={() => setShowPersonModal(true)} style={{ background: 'linear-gradient(135deg, #f43f5e, #db2777)', color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={11} strokeWidth={2.5} /> Add Person
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ padding: '8px 32px', borderBottom: '1px solid #1e3050', display: 'flex', gap: 24, flexShrink: 0 }}>
        <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.1em' }}>People: <span style={{ color: '#a0bcdf' }}>{people.length}</span></span>
        <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Builders: <span style={{ fontFamily: '"Orbitron", sans-serif', fontWeight: 900, color: '#1ad9a0' }}>{builders}</span></span>
        <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Drainers: <span style={{ fontFamily: '"Orbitron", sans-serif', fontWeight: 900, color: '#f43f5e' }}>{drainers}</span></span>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-10">
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#a0bcdf' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people..." style={{ width: '100%', background: '#040810', border: '1px solid #1e3050', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontFamily: 'Inter', fontSize: 14, color: '#d1d5db', outline: 'none' }} className="focus:border-[#f43f5e] transition-colors placeholder-[#a0bcdf]" />
        </div>

        {/* People grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredPeople.map(p => {
            const lastContact = p.lastContact || p.lastInteraction
            const days = daysSince(lastContact)
            const isExpanded = expanded[p.id]
            const healthScore = days !== null ? Math.max(0, 100 - days * 5) : 50
            const healthColor = healthScore > 60 ? '#16a34a' : healthScore > 30 ? '#f0c040' : '#f0c040'

            const energyBorderLeft = p.energyRating === 'builds'
              ? '3px solid #22c55e'
              : p.energyRating === 'drains'
                ? '3px solid #ff5555'
                : '3px solid #7a95c0'

            return (
              <div key={p.id} style={{ background: '#080e1a', border: '1px solid #1e3050', borderLeft: energyBorderLeft, borderRadius: 8 }} className="transition-all">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold">{p.name}</span>
                        <span className="text-[8px] font-mono uppercase tracking-widest">{ENERGY_ICON[p.energyRating]}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[8px] font-mono uppercase tracking-widest border px-1.5 py-0.5 ${TYPE_COLORS[p.type] || TYPE_COLORS.Other}`}>{p.type}</span>
                        {days !== null && (
                          <span className="text-[9px] font-mono" style={{ color: days > 14 ? '#f0c040' : '#a0bcdf' }}>
                            {days === 0 ? 'today' : `${days}d ago`}
                          </span>
                        )}
                        <span className="text-[9px] font-mono" style={{ color: healthColor }}>{healthScore}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setExpanded(e => ({ ...e, [p.id]: !e[p.id] }))} style={{ color: '#a0bcdf', background: 'none', border: 'none', cursor: 'pointer' }} className="hover:text-[#a0bcdf] transition-colors">
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      <button onClick={() => deletePerson(p.id)} style={{ color: '#a0bcdf', background: 'none', border: 'none', cursor: 'pointer' }} className="hover:text-[#f43f5e] transition-colors"><X size={12} /></button>
                    </div>
                  </div>
                  {p.notes && <p className="text-xs text-[#a0bcdf] leading-relaxed line-clamp-2">{p.notes}</p>}
                </div>

                {isExpanded && (
                  <div style={{ borderTop: '1px solid #1e3050' }} className="px-4 pb-4 pt-3 space-y-3">
                    {p.notes && (
                      <div>
                        <div className="text-[8px] font-mono uppercase tracking-widest mb-1" style={{ color: '#a0bcdf' }}>Notes</div>
                        <p className="text-xs text-[#a0bcdf] leading-relaxed">{p.notes}</p>
                      </div>
                    )}
                    {(p.psychologyNotes || []).length > 0 && (
                      <div>
                        <div className="text-[8px] font-mono uppercase tracking-widest mb-1" style={{ color: '#a0bcdf' }}>Psychology</div>
                        <div className="space-y-1">
                          {(p.psychologyNotes || []).map(n => (
                            <div key={n.id} className="text-xs text-[#a0bcdf] pl-2 py-0.5" style={{ borderLeft: '2px solid #3a2050' }}>
                              <span>{n.note}</span>
                              <span className="text-[9px] font-mono ml-2" style={{ color: '#a0bcdf' }}>{fmtShort(n.date)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-[8px] font-mono uppercase tracking-widest mb-1.5" style={{ color: '#a0bcdf' }}>Add Psychology Note</div>
                      <div className="flex gap-2">
                        <input
                          value={newPsyNote[p.id] || ''}
                          onChange={e => setNewPsyNote(n => ({ ...n, [p.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && addPsyNote(p.id)}
                          placeholder="Observation..."
                          style={{ flex: 1, background: '#040810', border: '1px solid #1e3050', padding: '6px 8px', fontSize: 12, color: 'white', outline: 'none' }}
                          className="focus:border-[#f43f5e] transition-colors placeholder-[#a0bcdf]"
                        />
                        <button onClick={() => addPsyNote(p.id)} style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #f43f5e, #db2777)', color: 'white', fontFamily: 'Inter', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', border: 'none' }}>Add</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Human Behavior Notes */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Human Behavior Notes</span>
            <button onClick={() => setShowBehModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1px solid #1e3050', background: 'transparent', color: '#a0bcdf', fontFamily: 'Inter', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#f43f5e'; e.currentTarget.style.color = 'white' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e3050'; e.currentTarget.style.color = '#a0bcdf' }}
            >
              <Plus size={9} /> Add Note
            </button>
          </div>
          <div className="flex gap-1 flex-wrap mb-3">
            {['All', ...BEH_CATS].map(cat => (
              <button key={cat} onClick={() => setBehCat(cat)}
                style={{
                  padding: '4px 12px',
                  fontFamily: 'Inter',
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  border: behCat === cat ? '1px solid rgba(244,63,94,0.3)' : '1px solid #1e3050',
                  background: behCat === cat ? 'rgba(244,63,94,0.12)' : 'transparent',
                  color: behCat === cat ? '#f43f5e' : '#a0bcdf',
                  transition: 'all 0.15s',
                }}>
                {cat}
              </button>
            ))}
          </div>
          <div className="relative mb-3">
            <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#a0bcdf' }} />
            <input value={behSearch} onChange={e => setBehSearch(e.target.value)} placeholder="Search observations..." style={{ width: '100%', background: '#040810', border: '1px solid #1e3050', paddingLeft: 32, paddingRight: 12, paddingTop: 6, paddingBottom: 6, fontFamily: 'Inter', fontSize: 14, color: '#d1d5db', outline: 'none' }} className="focus:border-[#f43f5e] transition-colors placeholder-[#a0bcdf]" />
          </div>
          <div className="space-y-2">
            {filteredBeh.map(n => (
              <div key={n.id} style={{ background: '#080e1a', border: '1px solid #1e3050', padding: 16, borderRadius: 8 }} className="group transition-all">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: 'Inter', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f43f5e' }}>{n.category}</span>
                    <span style={{ fontFamily: 'Inter', fontSize: 8, color: '#a0bcdf' }}>{fmtShort(n.date)}</span>
                  </div>
                  <button onClick={() => deleteBeh(n.id)} style={{ color: '#a0bcdf', background: 'none', border: 'none', cursor: 'pointer' }} className="opacity-0 group-hover:opacity-100 hover:text-[#f43f5e] transition-all"><X size={11} /></button>
                </div>
                <div className="text-sm font-semibold text-white mb-1">{n.observation}</div>
                {n.detail && <p className="text-xs text-[#a0bcdf] leading-relaxed">{n.detail}</p>}
              </div>
            ))}
            {filteredBeh.length === 0 && (
              <div style={{ background: '#020609', border: '1px solid #1e3050', padding: 24, textAlign: 'center', fontFamily: 'Inter', fontSize: 10, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: 8 }}>No observations yet</div>
            )}
          </div>
        </section>
      </div>

      {showPersonModal && (
        <Modal title="Add Person" onClose={() => setShowPersonModal(false)}>
          <div className="space-y-4">
            <div><label className={cls.label}>Name</label><input value={pf.name} onChange={e => setPf({ ...pf, name: e.target.value })} autoFocus placeholder="Full name" className={cls.input} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={cls.label}>Type</label>
                <select value={pf.type} onChange={e => setPf({ ...pf, type: e.target.value })} className={cls.input}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div><label className={cls.label}>Energy</label>
                <select value={pf.energyRating} onChange={e => setPf({ ...pf, energyRating: e.target.value })} className={cls.input}>
                  {ENERGY.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
            </div>
            <div><label className={cls.label}>Notes</label><textarea value={pf.notes} onChange={e => setPf({ ...pf, notes: e.target.value })} rows={3} placeholder="Who is this person..." className={cls.input + " resize-none"} /></div>
            <div className="flex gap-2 pt-1">
              <button onClick={addPerson} style={{ background: 'linear-gradient(135deg, #f43f5e, #db2777)', color: 'white', borderRadius: 8 }} className="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">Save</button>
              <button onClick={() => setShowPersonModal(false)} style={{ border: '1px solid #1e3050', color: '#a0bcdf', borderRadius: 8 }} className="px-4 py-2.5 text-[10px] uppercase tracking-widest hover:border-[#444] transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {showBehModal && (
        <Modal title="Add Behavior Note" onClose={() => setShowBehModal(false)}>
          <div className="space-y-4">
            <div><label className={cls.label}>Category</label>
              <select value={bf.category} onChange={e => setBf({ ...bf, category: e.target.value })} className={cls.input}>
                {BEH_CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label className={cls.label}>Observation (headline)</label><input value={bf.observation} onChange={e => setBf({ ...bf, observation: e.target.value })} autoFocus placeholder="What did you notice?" className={cls.input} /></div>
            <div><label className={cls.label}>Detail</label><textarea value={bf.detail} onChange={e => setBf({ ...bf, detail: e.target.value })} rows={4} placeholder="Explain the pattern..." className={cls.input + " resize-none"} /></div>
            <div className="flex gap-2 pt-1">
              <button onClick={addBehNote} style={{ background: 'linear-gradient(135deg, #f43f5e, #db2777)', color: 'white', borderRadius: 8 }} className="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">Save</button>
              <button onClick={() => setShowBehModal(false)} style={{ border: '1px solid #1e3050', color: '#a0bcdf', borderRadius: 8 }} className="px-4 py-2.5 text-[10px] uppercase tracking-widest hover:border-[#444] transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
