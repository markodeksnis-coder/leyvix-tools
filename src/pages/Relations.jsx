import { useState } from 'react'
import { Plus, Search, ChevronDown, ChevronUp, X, Brain } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import { daysAgoLabel, fmtShort } from '../utils'

const TYPES = ['Friend', 'Mentor', 'Family', 'Business', 'God']
const ENERGY = ['builds', 'neutral', 'drains']
const TYPE_STYLE = {
  Friend:   { text: '#60a5fa', border: '#1e3a5f', bg: '#0a1929' },
  Mentor:   { text: '#facc15', border: '#5c4a1a', bg: '#1c1500' },
  Family:   { text: '#34d399', border: '#1a4a38', bg: '#001f14' },
  Business: { text: '#fb923c', border: '#5c2e1a', bg: '#1f0c00' },
  God:      { text: '#a78bfa', border: '#3b2d6b', bg: '#12082a' },
}
const ENERGY_STYLE = { builds: 'text-green-500', neutral: 'text-[#666]', drains: 'text-red-500' }

const cls = {
  input: "w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#555] transition-colors",
  label: "block text-[10px] font-mono uppercase tracking-widest text-[#555] mb-1.5",
  primary: "flex-1 py-2.5 bg-[#facc15] text-black text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-300 transition-colors",
  secondary: "px-4 py-2.5 border border-[#2a2a2a] text-[#666] text-[10px] uppercase tracking-widest hover:border-[#555] hover:text-neutral-300 transition-colors",
}

export default function Relations() {
  const [data, setData] = useLocalStorage('marko_relations', { people: [], behaviorNotes: [] })
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [showPersonModal, setShowPersonModal] = useState(false)
  const [showBehaviorModal, setShowBehaviorModal] = useState(false)
  const [pf, setPf] = useState({ name: '', type: 'Friend', lastInteraction: new Date().toISOString().split('T')[0], energyRating: 'builds', notes: '' })
  const [bf, setBf] = useState({ observation: '', detail: '' })

  const people = data.people || []
  const behaviorNotes = data.behaviorNotes || []

  const addPerson = () => {
    if (!pf.name.trim()) return
    setData(d => ({ ...d, people: [...(d.people || []), { ...pf, id: Date.now(), psychologyNotes: [] }] }))
    setPf({ name: '', type: 'Friend', lastInteraction: new Date().toISOString().split('T')[0], energyRating: 'builds', notes: '' })
    setShowPersonModal(false)
  }

  const addBehavior = () => {
    if (!bf.observation.trim()) return
    setData(d => ({ ...d, behaviorNotes: [{ ...bf, id: Date.now(), date: new Date().toISOString().split('T')[0] }, ...(d.behaviorNotes || [])] }))
    setBf({ observation: '', detail: '' })
    setShowBehaviorModal(false)
  }

  const updatePerson = (id, updates) => setData(d => ({ ...d, people: (d.people || []).map(p => p.id === id ? { ...p, ...updates } : p) }))
  const deletePerson = (id) => setData(d => ({ ...d, people: (d.people || []).filter(p => p.id !== id) }))
  const deleteBehavior = (id) => setData(d => ({ ...d, behaviorNotes: (d.behaviorNotes || []).filter(n => n.id !== id) }))
  const addPsyNote = (personId, note) => {
    setData(d => ({ ...d, people: (d.people || []).map(p => p.id === personId ? { ...p, psychologyNotes: [{ id: Date.now(), note, date: new Date().toISOString().split('T')[0] }, ...(p.psychologyNotes || [])] } : p) }))
  }

  const filteredPeople = people.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
  const filteredBehavior = behaviorNotes.filter(n => !search || n.observation.toLowerCase().includes(search.toLowerCase()) || n.detail?.toLowerCase().includes(search.toLowerCase()))

  // Health scores: 100 - days since last interaction * 5 (capped 0-100)
  const healthScore = (p) => Math.max(0, 100 - Math.floor((Date.now() - new Date(p.lastInteraction + 'T12:00:00')) / 86400000) * 5)

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-6 border-b border-[#1f1f1f] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight uppercase">Relations</h1>
          <p className="text-[10px] font-mono text-[#555] mt-0.5 uppercase tracking-widest">{people.length} people · relationship intelligence</p>
        </div>
        <button onClick={() => setShowPersonModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-[#facc15] text-black text-[9px] font-bold uppercase tracking-widest hover:bg-yellow-300 transition-colors">
          <Plus size={10} strokeWidth={2.5} /> Add Person
        </button>
      </div>

      <div className="px-8 py-3 border-b border-[#1f1f1f] shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people or notes..." className="w-full bg-[#111] border border-[#1f1f1f] pl-8 pr-3 py-2 text-sm text-neutral-300 placeholder-[#444] focus:outline-none focus:border-[#2a2a2a]" />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-8">
        {/* People */}
        <div>
          {filteredPeople.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <p className="text-[#444] text-sm">No people added yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredPeople.map(person => {
                const isExpanded = expandedId === person.id
                const ts = TYPE_STYLE[person.type] || TYPE_STYLE.Friend
                const score = healthScore(person)
                return (
                  <div key={person.id} className="bg-[#111] border border-[#1f1f1f] hover:border-[#2a2a2a] transition-colors">
                    <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : person.id)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-semibold">{person.name}</span>
                            <span className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 border shrink-0" style={{ color: ts.text, borderColor: ts.border, background: ts.bg }}>{person.type}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[9px] font-mono">
                            <span className="text-[#444]">{daysAgoLabel(person.lastInteraction)}</span>
                            <span className={ENERGY_STYLE[person.energyRating]}>{person.energyRating}</span>
                            <span className={score > 60 ? 'text-green-600' : score > 30 ? 'text-[#facc15]' : 'text-red-600'}>health: {score}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={e => { e.stopPropagation(); deletePerson(person.id) }} className="text-[#333] hover:text-red-500 transition-colors"><X size={11} /></button>
                          {isExpanded ? <ChevronUp size={12} className="text-[#444]" /> : <ChevronDown size={12} className="text-[#444]" />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-[#171717] p-4 space-y-3">
                        <div>
                          <label className="block text-[9px] font-mono uppercase tracking-widest text-[#444] mb-1">Last Interaction</label>
                          <input type="date" value={person.lastInteraction} onChange={e => updatePerson(person.id, { lastInteraction: e.target.value })} className="bg-[#0a0a0a] border border-[#1f1f1f] px-2 py-1.5 text-xs font-mono text-neutral-400 focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono uppercase tracking-widest text-[#444] mb-1">Notes</label>
                          <textarea value={person.notes || ''} onChange={e => updatePerson(person.id, { notes: e.target.value })} rows={3} placeholder="What matters to them? Last conversation? Patterns?" className="w-full bg-[#0a0a0a] border border-[#1f1f1f] px-3 py-2 text-xs text-neutral-400 placeholder-[#333] focus:outline-none focus:border-[#2a2a2a] resize-none" />
                        </div>
                        <div>
                          <div className="text-[9px] font-mono uppercase tracking-widest text-[#444] mb-1.5">Psychology Notes</div>
                          {(person.psychologyNotes || []).map(pn => (
                            <div key={pn.id} className="text-xs text-[#666] bg-[#0d0d0d] border border-[#1a1a1a] px-3 py-2 mb-1.5">
                              <span className="text-[8px] font-mono text-[#333] float-right">{pn.date}</span>
                              {pn.note}
                            </div>
                          ))}
                          <AddPsyNote onAdd={(note) => addPsyNote(person.id, note)} />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Human Behavior Notes */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain size={13} className="text-[#555]" strokeWidth={1.5} />
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#555]">Human Behavior Notes</span>
            </div>
            <button onClick={() => setShowBehaviorModal(true)} className="flex items-center gap-1 px-3 py-1.5 border border-[#2a2a2a] text-[#555] text-[9px] uppercase tracking-widest hover:border-[#555] hover:text-neutral-300 transition-colors">
              <Plus size={9} /> Add
            </button>
          </div>
          <div className="space-y-2">
            {filteredBehavior.length === 0 ? (
              <div className="bg-[#111] border border-[#1f1f1f] p-6 text-center text-[#333] text-[10px] font-mono uppercase tracking-widest">Patterns and observations go here</div>
            ) : (
              filteredBehavior.map(note => (
                <div key={note.id} className="bg-[#111] border border-[#1f1f1f] p-4 hover:border-[#2a2a2a] transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold mb-1">{note.observation}</h4>
                      {note.detail && <p className="text-xs text-[#666] leading-relaxed">{note.detail}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[8px] font-mono text-[#333]">{note.date}</span>
                      <button onClick={() => deleteBehavior(note.id)} className="text-[#333] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><X size={11} /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showPersonModal && (
        <Modal title="Add Person" onClose={() => setShowPersonModal(false)}>
          <div className="space-y-4">
            <div><label className={cls.label}>Name</label><input value={pf.name} onChange={e => setPf({ ...pf, name: e.target.value })} placeholder="Full name" className={cls.input} autoFocus /></div>
            <div>
              <label className={cls.label}>Type</label>
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map(t => { const ts = TYPE_STYLE[t]; return (
                  <button key={t} onClick={() => setPf({ ...pf, type: t })} className="px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest border transition-colors" style={pf.type === t ? { color: ts.text, borderColor: ts.border, background: ts.bg } : { color: '#555', borderColor: '#2a2a2a', background: 'transparent' }}>{t}</button>
                )})}
              </div>
            </div>
            <div>
              <label className={cls.label}>Energy Rating</label>
              <div className="flex gap-2">
                {ENERGY.map(e => <button key={e} onClick={() => setPf({ ...pf, energyRating: e })} className={`px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest border transition-colors ${pf.energyRating === e ? 'border-white text-white' : 'border-[#2a2a2a] text-[#555]'}`}>{e}</button>)}
              </div>
            </div>
            <div><label className={cls.label}>Last Interaction</label><input type="date" value={pf.lastInteraction} onChange={e => setPf({ ...pf, lastInteraction: e.target.value })} className={cls.input} /></div>
            <div><label className={cls.label}>Notes</label><textarea value={pf.notes} onChange={e => setPf({ ...pf, notes: e.target.value })} rows={3} placeholder="What do you know? What matters to them?" className={cls.input + " resize-none"} /></div>
            <div className="flex gap-2 pt-1"><button onClick={addPerson} className={cls.primary}>Add Person</button><button onClick={() => setShowPersonModal(false)} className={cls.secondary}>Cancel</button></div>
          </div>
        </Modal>
      )}

      {showBehaviorModal && (
        <Modal title="Human Behavior Note" onClose={() => setShowBehaviorModal(false)}>
          <div className="space-y-4">
            <div><label className={cls.label}>Observation</label><input value={bf.observation} onChange={e => setBf({ ...bf, observation: e.target.value })} placeholder="What pattern did you notice?" className={cls.input} autoFocus /></div>
            <div><label className={cls.label}>Detail</label><textarea value={bf.detail} onChange={e => setBf({ ...bf, detail: e.target.value })} placeholder="Expand on the pattern and what it means..." rows={4} className={cls.input + " resize-none"} /></div>
            <div className="flex gap-2 pt-1"><button onClick={addBehavior} className={cls.primary}>Save Note</button><button onClick={() => setShowBehaviorModal(false)} className={cls.secondary}>Cancel</button></div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function AddPsyNote({ onAdd }) {
  const [val, setVal] = useState('')
  const [active, setActive] = useState(false)
  if (!active) return (
    <button onClick={() => setActive(true)} className="text-[9px] font-mono text-[#444] hover:text-[#666] uppercase tracking-widest transition-colors">+ Add note</button>
  )
  return (
    <div className="flex gap-2">
      <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal(''); setActive(false) }; if (e.key === 'Escape') setActive(false) }} placeholder="Observation about this person..." autoFocus className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] px-2 py-1.5 text-[10px] text-neutral-400 placeholder-[#333] focus:outline-none" />
      <button onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(''); setActive(false) } }} className="text-[9px] font-mono text-[#facc15] px-2 uppercase">Add</button>
    </div>
  )
}
