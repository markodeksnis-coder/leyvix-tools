import { useState } from 'react'
import { Plus, Users, Brain, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'

const TYPES = ['Friend', 'Mentor', 'Family', 'God', 'Colleague', 'Prospect']

const TYPE_COLOR = {
  Friend:    { text: '#60a5fa', border: '#1e3a5f', bg: '#0a1929' },
  Mentor:    { text: '#fbbf24', border: '#5c4a1a', bg: '#1c1500' },
  Family:    { text: '#34d399', border: '#1a4a38', bg: '#001f14' },
  God:       { text: '#a78bfa', border: '#3b2d6b', bg: '#12082a' },
  Colleague: { text: '#9ca3af', border: '#2a2a2a', bg: '#111' },
  Prospect:  { text: '#f87171', border: '#5c1a1a', bg: '#1f0000' },
}

const cls = {
  input: "w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm text-neutral-100 placeholder-neutral-700 focus:outline-none focus:border-neutral-500 transition-colors",
  label: "block text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-1.5",
  btnPrimary: "flex-1 py-2.5 bg-white text-black text-[10px] font-semibold uppercase tracking-widest hover:bg-neutral-200 transition-colors",
  btnSecondary: "px-4 py-2.5 border border-[#2a2a2a] text-neutral-600 text-[10px] uppercase tracking-widest hover:border-neutral-600 hover:text-neutral-300 transition-colors",
}

export default function Relations() {
  const [people, setPeople] = useLocalStorage('relations_people', [])
  const [psyNotes, setPsyNotes] = useLocalStorage('relations_psy_notes', [])
  const [showPersonModal, setShowPersonModal] = useState(false)
  const [showPsyModal, setShowPsyModal] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [personForm, setPersonForm] = useState({ name: '', type: 'Friend', lastInteraction: today(), notes: '' })
  const [psyForm, setPsyForm] = useState({ title: '', content: '' })

  const addPerson = () => {
    if (!personForm.name.trim()) return
    setPeople([...people, { ...personForm, id: Date.now() }])
    setPersonForm({ name: '', type: 'Friend', lastInteraction: today(), notes: '' })
    setShowPersonModal(false)
  }

  const addPsyNote = () => {
    if (!psyForm.title.trim()) return
    setPsyNotes([{ ...psyForm, id: Date.now(), date: new Date().toISOString() }, ...psyNotes])
    setPsyForm({ title: '', content: '' })
    setShowPsyModal(false)
  }

  const updateNotes = (id, notes) => setPeople(people.map(p => p.id === id ? { ...p, notes } : p))
  const deletePerson = (id) => setPeople(people.filter(p => p.id !== id))
  const deletePsyNote = (id) => setPsyNotes(psyNotes.filter(n => n.id !== id))

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-6 border-b border-[#1f1f1f] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Relations</h1>
          <p className="text-[10px] font-mono text-neutral-600 mt-0.5 uppercase tracking-widest">
            {people.length} people in orbit
          </p>
        </div>
        <button
          onClick={() => { setPersonForm({ name: '', type: 'Friend', lastInteraction: today(), notes: '' }); setShowPersonModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] font-semibold uppercase tracking-widest hover:bg-neutral-200 transition-colors"
        >
          <Plus size={11} strokeWidth={2.5} /> Add Person
        </button>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-8">
        {/* People grid */}
        <div>
          {people.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <Users size={28} className="text-neutral-800" strokeWidth={1} />
              <p className="text-neutral-600 text-sm">No one added yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {people.map(person => (
                <PersonCard
                  key={person.id}
                  person={person}
                  expanded={expandedId === person.id}
                  onToggle={() => setExpandedId(expandedId === person.id ? null : person.id)}
                  onUpdateNotes={(n) => updateNotes(person.id, n)}
                  onDelete={() => deletePerson(person.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Psychology Notes */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain size={13} className="text-neutral-700" strokeWidth={1.5} />
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-600">Psychology Notes</span>
            </div>
            <button
              onClick={() => { setPsyForm({ title: '', content: '' }); setShowPsyModal(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#2a2a2a] text-neutral-600 text-[10px] uppercase tracking-widest hover:border-neutral-600 hover:text-neutral-300 transition-colors"
            >
              <Plus size={10} /> Add
            </button>
          </div>
          <div className="space-y-2">
            {psyNotes.length === 0 ? (
              <div className="bg-[#111] border border-[#1f1f1f] p-6 text-center text-neutral-700 text-[10px] font-mono uppercase tracking-widest">
                Observations on human nature go here
              </div>
            ) : (
              psyNotes.map(note => (
                <div key={note.id} className="bg-[#111] border border-[#1f1f1f] p-4 hover:border-[#282828] transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium">{note.title}</h4>
                      {note.content && <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">{note.content}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] font-mono text-neutral-700">{note.date.slice(0, 10)}</span>
                      <button onClick={() => deletePsyNote(note.id)} className="text-neutral-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <X size={12} />
                      </button>
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
            <div>
              <label className={cls.label}>Name</label>
              <input value={personForm.name} onChange={e => setPersonForm({ ...personForm, name: e.target.value })} placeholder="Full name" className={cls.input} autoFocus />
            </div>
            <div>
              <label className={cls.label}>Relationship Type</label>
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map(t => {
                  const c = TYPE_COLOR[t] || TYPE_COLOR.Colleague
                  return (
                    <button
                      key={t}
                      onClick={() => setPersonForm({ ...personForm, type: t })}
                      className="px-3 py-1.5 text-[10px] uppercase tracking-widest border transition-colors"
                      style={personForm.type === t
                        ? { color: c.text, borderColor: c.border, background: c.bg }
                        : { color: '#555', borderColor: '#2a2a2a', background: 'transparent' }
                      }
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className={cls.label}>Last Interaction</label>
              <input type="date" value={personForm.lastInteraction} onChange={e => setPersonForm({ ...personForm, lastInteraction: e.target.value })} className={cls.input} />
            </div>
            <div>
              <label className={cls.label}>Notes</label>
              <textarea value={personForm.notes} onChange={e => setPersonForm({ ...personForm, notes: e.target.value })} placeholder="What matters to them? How can you serve them?" rows={3} className={cls.input + " resize-none"} />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={addPerson} className={cls.btnPrimary}>Add Person</button>
              <button onClick={() => setShowPersonModal(false)} className={cls.btnSecondary}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {showPsyModal && (
        <Modal title="Psychology Note" onClose={() => setShowPsyModal(false)}>
          <div className="space-y-4">
            <div>
              <label className={cls.label}>Observation</label>
              <input value={psyForm.title} onChange={e => setPsyForm({ ...psyForm, title: e.target.value })} placeholder="What did you notice?" className={cls.input} autoFocus />
            </div>
            <div>
              <label className={cls.label}>Detail</label>
              <textarea value={psyForm.content} onChange={e => setPsyForm({ ...psyForm, content: e.target.value })} placeholder="Expand on the pattern..." rows={4} className={cls.input + " resize-none"} />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={addPsyNote} className={cls.btnPrimary}>Save Note</button>
              <button onClick={() => setShowPsyModal(false)} className={cls.btnSecondary}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function PersonCard({ person, expanded, onToggle, onUpdateNotes, onDelete }) {
  const c = TYPE_COLOR[person.type] || TYPE_COLOR.Colleague
  const daysSince = Math.floor((Date.now() - new Date(person.lastInteraction)) / 86400000)
  const daysLabel = daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : `${daysSince}d ago`

  return (
    <div className="bg-[#111] border border-[#1f1f1f] hover:border-[#282828] transition-colors">
      <div className="p-4 cursor-pointer select-none" onClick={onToggle}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-sm font-semibold">{person.name}</span>
              <span
                className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 border"
                style={{ color: c.text, borderColor: c.border, background: c.bg }}
              >
                {person.type}
              </span>
            </div>
            <div className="text-[10px] font-mono text-neutral-700">{daysLabel}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <button onClick={e => { e.stopPropagation(); onDelete() }} className="text-neutral-800 hover:text-red-500 transition-colors">
              <X size={12} />
            </button>
            {expanded ? <ChevronUp size={13} className="text-neutral-600" /> : <ChevronDown size={13} className="text-neutral-600" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#171717] p-4">
          <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-700 mb-2">Notes</div>
          <textarea
            value={person.notes || ''}
            onChange={e => onUpdateNotes(e.target.value)}
            placeholder="What do you know? What do they need? What was your last conversation?"
            rows={4}
            className="w-full bg-[#0a0a0a] border border-[#1f1f1f] px-3 py-2 text-xs text-neutral-400 placeholder-neutral-800 focus:outline-none focus:border-[#2a2a2a] resize-none transition-colors"
          />
        </div>
      )}
    </div>
  )
}

function today() { return new Date().toISOString().split('T')[0] }
