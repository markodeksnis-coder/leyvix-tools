import { useState } from 'react'
import { Plus, Search, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import { fmtShort } from '../utils'

const TYPES = ['Friend','Mentor','Family','Business','God','Other']
const ENERGY = ['builds','neutral','drains']
const BEH_CATS = ['Body Language','Persuasion','Status','Emotion','Other']

const TYPE_COLORS = {
  Friend: 'text-blue-400 border-blue-400/30',
  Mentor: 'text-[#facc15] border-[#facc15]/30',
  Family: 'text-green-400 border-green-400/30',
  Business: 'text-orange-400 border-orange-400/30',
  God: 'text-purple-400 border-purple-400/30',
  Other: 'text-[#666] border-[#444]/30',
}

const ENERGY_ICON = { builds: '⚡', neutral: '⚪', drains: '🔻' }

const cls = {
  input: "w-full bg-[#080808] border border-[#2a2a2a] px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#dc2626] transition-colors",
  label: "block text-[9px] font-mono uppercase tracking-widest text-[#444] mb-1.5",
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
    <div className="h-full flex flex-col">
      <div className="px-8 py-5 border-b border-[#2a2a2a] shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-tight">Relations</h1>
          <p className="text-[10px] font-mono text-[#444] mt-0.5 uppercase tracking-widest">Inner circle management</p>
        </div>
        <button onClick={() => setShowPersonModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#dc2626] text-white text-[9px] font-bold uppercase tracking-widest hover:bg-red-500 transition-colors">
          <Plus size={11} strokeWidth={2.5} /> Add Person
        </button>
      </div>

      {/* Stats row */}
      <div className="px-8 py-2 border-b border-[#2a2a2a] flex gap-6 text-[9px] font-mono text-[#333] uppercase tracking-widest shrink-0">
        <span>People: <span className="text-[#666]">{people.length}</span></span>
        <span>Builders: <span className="text-[#16a34a]">{builders}</span></span>
        <span>Drainers: <span className="text-[#dc2626]">{drainers}</span></span>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-10">
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#333]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people..." className="w-full bg-[#141414] border border-[#2a2a2a] pl-8 pr-3 py-2 text-sm text-[#888] placeholder-[#333] focus:outline-none focus:border-[#dc2626]" />
        </div>

        {/* People grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredPeople.map(p => {
            const lastContact = p.lastContact || p.lastInteraction
            const days = daysSince(lastContact)
            const isExpanded = expanded[p.id]
            const healthScore = days !== null ? Math.max(0, 100 - days * 5) : 50
            const healthColor = healthScore > 60 ? '#16a34a' : healthScore > 30 ? '#facc15' : '#dc2626'

            return (
              <div key={p.id} className="bg-[#0f0f0f] border border-[#2a2a2a] hover:shadow-[0_0_12px_rgba(220,38,38,0.1)] transition-all">
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
                          <span className={`text-[9px] font-mono ${days > 14 ? 'text-[#dc2626]' : 'text-[#333]'}`}>
                            {days === 0 ? 'today' : `${days}d ago`}
                          </span>
                        )}
                        <span className="text-[9px] font-mono" style={{ color: healthColor }}>{healthScore}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setExpanded(e => ({ ...e, [p.id]: !e[p.id] }))} className="text-[#333] hover:text-[#888] transition-colors">
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      <button onClick={() => deletePerson(p.id)} className="text-[#222] hover:text-[#dc2626] transition-colors"><X size={12} /></button>
                    </div>
                  </div>
                  {p.notes && <p className="text-xs text-[#555] leading-relaxed line-clamp-2">{p.notes}</p>}
                </div>

                {isExpanded && (
                  <div className="border-t border-[#2a2a2a] px-4 pb-4 pt-3 space-y-3">
                    {p.notes && (
                      <div>
                        <div className="text-[8px] font-mono uppercase tracking-widest text-[#333] mb-1">Notes</div>
                        <p className="text-xs text-[#666] leading-relaxed">{p.notes}</p>
                      </div>
                    )}
                    {(p.psychologyNotes || []).length > 0 && (
                      <div>
                        <div className="text-[8px] font-mono uppercase tracking-widest text-[#333] mb-1">Psychology</div>
                        <div className="space-y-1">
                          {(p.psychologyNotes || []).map(n => (
                            <div key={n.id} className="text-xs text-[#555] border-l-2 border-[#dc2626]/30 pl-2 py-0.5">
                              <span>{n.note}</span>
                              <span className="text-[9px] font-mono text-[#333] ml-2">{fmtShort(n.date)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-[8px] font-mono uppercase tracking-widest text-[#333] mb-1.5">Add Psychology Note</div>
                      <div className="flex gap-2">
                        <input
                          value={newPsyNote[p.id] || ''}
                          onChange={e => setNewPsyNote(n => ({ ...n, [p.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && addPsyNote(p.id)}
                          placeholder="Observation..."
                          className="flex-1 bg-[#141414] border border-[#2a2a2a] px-2 py-1.5 text-xs text-white placeholder-[#333] focus:outline-none focus:border-[#dc2626]"
                        />
                        <button onClick={() => addPsyNote(p.id)} className="px-3 py-1.5 bg-[#dc2626]/20 border border-[#dc2626]/30 text-[#dc2626] text-[9px] font-mono uppercase tracking-widest hover:bg-[#dc2626]/30 transition-colors">Add</button>
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
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#444]">Human Behavior Notes</span>
            <button onClick={() => setShowBehModal(true)} className="flex items-center gap-1 px-3 py-1.5 border border-[#2a2a2a] text-[#444] text-[9px] uppercase tracking-widest hover:border-[#dc2626] hover:text-white transition-colors">
              <Plus size={9} /> Add Note
            </button>
          </div>
          <div className="flex gap-1 flex-wrap mb-3">
            {['All', ...BEH_CATS].map(cat => (
              <button key={cat} onClick={() => setBehCat(cat)}
                className={`px-3 py-1 text-[9px] font-mono uppercase tracking-widest transition-all ${behCat === cat ? 'bg-[#dc2626] text-white' : 'border border-[#2a2a2a] text-[#444] hover:border-[#dc2626] hover:text-white'}`}>
                {cat}
              </button>
            ))}
          </div>
          <div className="relative mb-3">
            <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#333]" />
            <input value={behSearch} onChange={e => setBehSearch(e.target.value)} placeholder="Search observations..." className="w-full bg-[#141414] border border-[#2a2a2a] pl-8 pr-3 py-1.5 text-sm text-[#888] placeholder-[#333] focus:outline-none focus:border-[#dc2626]" />
          </div>
          <div className="space-y-2">
            {filteredBeh.map(n => (
              <div key={n.id} className="bg-[#0f0f0f] border border-[#2a2a2a] p-4 group hover:shadow-[0_0_12px_rgba(220,38,38,0.1)] transition-all">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-mono uppercase tracking-widest text-[#dc2626]">{n.category}</span>
                    <span className="text-[8px] font-mono text-[#333]">{fmtShort(n.date)}</span>
                  </div>
                  <button onClick={() => deleteBeh(n.id)} className="text-[#222] hover:text-[#dc2626] opacity-0 group-hover:opacity-100 transition-all"><X size={11} /></button>
                </div>
                <div className="text-sm font-semibold text-white mb-1">{n.observation}</div>
                {n.detail && <p className="text-xs text-[#555] leading-relaxed">{n.detail}</p>}
              </div>
            ))}
            {filteredBeh.length === 0 && (
              <div className="bg-[#0f0f0f] border border-[#2a2a2a] p-6 text-center text-[#333] text-[10px] font-mono uppercase tracking-widest">No observations yet</div>
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
              <button onClick={addPerson} className="flex-1 py-2.5 bg-[#dc2626] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 transition-colors">Save</button>
              <button onClick={() => setShowPersonModal(false)} className="px-4 py-2.5 border border-[#2a2a2a] text-[#444] text-[10px] uppercase tracking-widest hover:border-[#666] transition-colors">Cancel</button>
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
              <button onClick={addBehNote} className="flex-1 py-2.5 bg-[#dc2626] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 transition-colors">Save</button>
              <button onClick={() => setShowBehModal(false)} className="px-4 py-2.5 border border-[#2a2a2a] text-[#444] text-[10px] uppercase tracking-widest hover:border-[#666] transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
