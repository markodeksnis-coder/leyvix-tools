import { useState } from 'react'
import { Plus, Star, User, Pencil, Trash2, X } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'

const cls = {
  input: "w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm text-neutral-100 placeholder-neutral-700 focus:outline-none focus:border-neutral-500 transition-colors",
  label: "block text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-1.5",
  btnPrimary: "flex-1 py-2.5 bg-white text-black text-[10px] font-semibold uppercase tracking-widest hover:bg-neutral-200 transition-colors",
  btnSecondary: "px-4 py-2.5 border border-[#2a2a2a] text-neutral-600 text-[10px] uppercase tracking-widest hover:border-neutral-600 hover:text-neutral-300 transition-colors",
}

const DEFAULT_VALUES = ['Integrity', 'Excellence', 'Faith', 'Discipline', 'Brotherhood']

export default function Soul() {
  const [prayers, setPrayers] = useLocalStorage('soul_prayers', [])
  const [values, setValues] = useLocalStorage('soul_values', DEFAULT_VALUES)
  const [identity, setIdentity] = useLocalStorage('soul_identity', '')

  const [showPrayerModal, setShowPrayerModal] = useState(false)
  const [prayerForm, setPrayerForm] = useState({ content: '', date: today() })
  const [editingValueIdx, setEditingValueIdx] = useState(null)
  const [editingValueText, setEditingValueText] = useState('')
  const [addingValue, setAddingValue] = useState(false)
  const [newValueText, setNewValueText] = useState('')
  const [identityEditing, setIdentityEditing] = useState(false)
  const [identityDraft, setIdentityDraft] = useState('')

  const addPrayer = () => {
    if (!prayerForm.content.trim()) return
    setPrayers([{ ...prayerForm, id: Date.now() }, ...prayers])
    setPrayerForm({ content: '', date: today() })
    setShowPrayerModal(false)
  }

  const deletePrayer = (id) => setPrayers(prayers.filter(p => p.id !== id))

  const startEditValue = (idx) => {
    setEditingValueIdx(idx)
    setEditingValueText(values[idx])
  }

  const saveEditValue = () => {
    if (editingValueText.trim()) {
      const v = [...values]
      v[editingValueIdx] = editingValueText.trim()
      setValues(v)
    }
    setEditingValueIdx(null)
  }

  const addValue = () => {
    if (!newValueText.trim()) return
    setValues([...values, newValueText.trim()])
    setNewValueText('')
    setAddingValue(false)
  }

  const removeValue = (idx) => setValues(values.filter((_, i) => i !== idx))

  const startEditIdentity = () => {
    setIdentityDraft(identity)
    setIdentityEditing(true)
  }

  const saveIdentity = () => {
    setIdentity(identityDraft)
    setIdentityEditing(false)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-6 border-b border-[#1f1f1f] shrink-0">
        <h1 className="text-xl font-semibold tracking-tight">Soul</h1>
        <p className="text-[10px] font-mono text-neutral-600 mt-0.5 uppercase tracking-widest">Inner architecture</p>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-10">
        {/* Prayer Log */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-neutral-700 text-sm leading-none">✝</span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-600">Prayer Log</span>
            </div>
            <button
              onClick={() => { setPrayerForm({ content: '', date: today() }); setShowPrayerModal(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#2a2a2a] text-neutral-600 text-[10px] uppercase tracking-widest hover:border-neutral-600 hover:text-neutral-300 transition-colors"
            >
              <Plus size={10} /> Add
            </button>
          </div>

          {prayers.length === 0 ? (
            <div className="bg-[#111] border border-[#1f1f1f] p-6 text-center text-neutral-700 text-[10px] font-mono uppercase tracking-widest">
              Start your prayer log
            </div>
          ) : (
            <div className="space-y-2">
              {prayers.map(prayer => (
                <div key={prayer.id} className="bg-[#111] border border-[#1f1f1f] p-4 hover:border-[#282828] transition-colors group">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm text-neutral-300 leading-relaxed flex-1 whitespace-pre-wrap">{prayer.content}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] font-mono text-neutral-700">{prayer.date}</span>
                      <button onClick={() => deletePrayer(prayer.id)} className="text-neutral-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Core Values */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star size={12} className="text-neutral-700" strokeWidth={1.5} />
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-600">Core Values</span>
            </div>
            {!addingValue && (
              <button
                onClick={() => { setNewValueText(''); setAddingValue(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#2a2a2a] text-neutral-600 text-[10px] uppercase tracking-widest hover:border-neutral-600 hover:text-neutral-300 transition-colors"
              >
                <Plus size={10} /> Add
              </button>
            )}
          </div>

          <div className="space-y-1">
            {values.map((value, idx) => (
              <div key={idx} className="bg-[#111] border border-[#1f1f1f] px-4 py-3 flex items-center justify-between group hover:border-[#282828] transition-colors">
                {editingValueIdx === idx ? (
                  <input
                    value={editingValueText}
                    onChange={e => setEditingValueText(e.target.value)}
                    onBlur={saveEditValue}
                    onKeyDown={e => { if (e.key === 'Enter') saveEditValue(); if (e.key === 'Escape') setEditingValueIdx(null) }}
                    autoFocus
                    className="flex-1 bg-transparent text-sm text-white focus:outline-none"
                  />
                ) : (
                  <span className="text-sm font-medium flex-1">{value}</span>
                )}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEditValue(idx)} className="text-neutral-700 hover:text-neutral-300 transition-colors">
                    <Pencil size={11} />
                  </button>
                  <button onClick={() => removeValue(idx)} className="text-neutral-800 hover:text-red-500 transition-colors">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}

            {addingValue && (
              <div className="bg-[#111] border border-neutral-600 px-4 py-3 flex items-center gap-2">
                <input
                  value={newValueText}
                  onChange={e => setNewValueText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addValue(); if (e.key === 'Escape') setAddingValue(false) }}
                  placeholder="Enter value..."
                  autoFocus
                  className="flex-1 bg-transparent text-sm focus:outline-none text-white placeholder-neutral-700"
                />
                <button onClick={addValue} className="text-[10px] font-semibold bg-white text-black px-3 py-1 hover:bg-neutral-200 transition-colors uppercase tracking-widest">
                  Add
                </button>
                <button onClick={() => setAddingValue(false)} className="text-neutral-700 hover:text-neutral-400">
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Identity Statement */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User size={12} className="text-neutral-700" strokeWidth={1.5} />
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-600">Identity Statement</span>
            </div>
            {!identityEditing && (
              <button onClick={startEditIdentity} className="text-neutral-700 hover:text-neutral-400 transition-colors">
                <Pencil size={13} />
              </button>
            )}
          </div>

          {identityEditing ? (
            <div>
              <textarea
                value={identityDraft}
                onChange={e => setIdentityDraft(e.target.value)}
                placeholder="I am a man built for greatness. I am becoming..."
                rows={8}
                autoFocus
                className={cls.input + " resize-none text-sm leading-relaxed"}
              />
              <div className="flex gap-2 mt-2">
                <button onClick={saveIdentity} className="px-5 py-2 bg-white text-black text-[10px] font-semibold uppercase tracking-widest hover:bg-neutral-200 transition-colors">
                  Save
                </button>
                <button onClick={() => setIdentityEditing(false)} className="px-5 py-2 border border-[#2a2a2a] text-neutral-600 text-[10px] uppercase tracking-widest hover:border-neutral-600 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={startEditIdentity}
              className="bg-[#111] border border-[#1f1f1f] p-6 cursor-pointer hover:border-[#282828] transition-colors min-h-[140px]"
            >
              {identity ? (
                <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{identity}</p>
              ) : (
                <p className="text-neutral-700 text-sm italic">Click to write your identity statement — who you are and who you are becoming.</p>
              )}
            </div>
          )}
        </section>
      </div>

      {showPrayerModal && (
        <Modal title="Prayer Entry" onClose={() => setShowPrayerModal(false)}>
          <div className="space-y-4">
            <div>
              <label className={cls.label}>Date</label>
              <input type="date" value={prayerForm.date} onChange={e => setPrayerForm({ ...prayerForm, date: e.target.value })} className={cls.input} />
            </div>
            <div>
              <label className={cls.label}>Prayer / Reflection</label>
              <textarea
                value={prayerForm.content}
                onChange={e => setPrayerForm({ ...prayerForm, content: e.target.value })}
                placeholder="What are you praying about? What is God saying to you?"
                rows={6}
                autoFocus
                className={cls.input + " resize-none"}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={addPrayer} className={cls.btnPrimary}>Save Prayer</button>
              <button onClick={() => setShowPrayerModal(false)} className={cls.btnSecondary}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function today() { return new Date().toISOString().split('T')[0] }
