import { useState } from 'react'
import { Plus, Star, User, Pencil, Trash2, X, Archive } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import { calcStreak, today } from '../utils'

const cls = {
  input: "w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#555] transition-colors",
  label: "block text-[10px] font-mono uppercase tracking-widest text-[#555] mb-1.5",
  primary: "flex-1 py-2.5 bg-[#facc15] text-black text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-300 transition-colors",
  secondary: "px-4 py-2.5 border border-[#2a2a2a] text-[#666] text-[10px] uppercase tracking-widest hover:border-[#555] hover:text-neutral-300 transition-colors",
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

  const prayerStreak = calcStreak(prayers.map(p => p.date))

  const addPrayer = () => {
    if (!pf.content.trim()) return
    setData(d => ({ ...d, prayers: [{ ...pf, id: Date.now() }, ...(d.prayers || [])] }))
    setPf({ content: '', date: today() })
    setShowPrayerModal(false)
  }

  const deletePrayer = id => setData(d => ({ ...d, prayers: prayers.filter(p => p.id !== id) }))

  const startEditVal = (idx) => {
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
    // Archive old if different
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

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-6 border-b border-[#1f1f1f] shrink-0">
        <h1 className="text-xl font-bold tracking-tight uppercase">Soul</h1>
        <p className="text-[10px] font-mono text-[#555] mt-0.5 uppercase tracking-widest">Inner architecture</p>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-10">
        {/* Prayer Log */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-[#555] text-sm">✝</span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#555]">Prayer Log</span>
              {prayerStreak.current > 0 && (
                <span className="text-[9px] font-mono text-[#facc15] border border-[#facc15]/20 px-1.5 py-0.5 uppercase tracking-widest">
                  {prayerStreak.current}d streak
                </span>
              )}
            </div>
            <button onClick={() => { setPf({ content: '', date: today() }); setShowPrayerModal(true) }} className="flex items-center gap-1 px-3 py-1.5 border border-[#2a2a2a] text-[#555] text-[9px] uppercase tracking-widest hover:border-[#555] hover:text-neutral-300 transition-colors">
              <Plus size={9} /> Add
            </button>
          </div>
          {prayers.length === 0 ? (
            <div className="bg-[#111] border border-[#1f1f1f] p-6 text-center text-[#333] text-[10px] font-mono uppercase tracking-widest">Start your prayer log</div>
          ) : (
            <div className="space-y-2">
              {prayers.map(prayer => (
                <div key={prayer.id} className="bg-[#111] border border-[#1f1f1f] p-4 hover:border-[#2a2a2a] transition-colors group">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm text-neutral-300 leading-relaxed flex-1 whitespace-pre-wrap">{prayer.content}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[8px] font-mono text-[#333]">{prayer.date}</span>
                      <button onClick={() => deletePrayer(prayer.id)} className="text-[#333] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><X size={11} /></button>
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
              <Star size={12} className="text-[#555]" strokeWidth={1.5} />
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#555]">Core Values</span>
            </div>
            {!addingVal && (
              <button onClick={() => { setNewVal({ value: '', description: '' }); setAddingVal(true) }} className="flex items-center gap-1 px-3 py-1.5 border border-[#2a2a2a] text-[#555] text-[9px] uppercase tracking-widest hover:border-[#555] hover:text-neutral-300 transition-colors">
                <Plus size={9} /> Add
              </button>
            )}
          </div>
          <div className="space-y-1">
            {values.map((val, idx) => (
              <div key={val.id || idx} className="bg-[#111] border border-[#1f1f1f] px-4 py-3 hover:border-[#2a2a2a] transition-colors group">
                {editingValIdx === idx ? (
                  <div className="space-y-2">
                    <input value={editingValText} onChange={e => setEditingValText(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveVal()} autoFocus className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none" />
                    <input value={editingValDesc} onChange={e => setEditingValDesc(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveVal(); if (e.key === 'Escape') setEditingValIdx(null) }} placeholder="One-line description..." className="w-full bg-transparent text-xs text-[#666] focus:outline-none" />
                    <div className="flex gap-2">
                      <button onClick={saveVal} className="text-[8px] font-mono uppercase tracking-widest text-[#facc15] border border-[#facc15]/30 px-2 py-1 hover:bg-[#facc15]/10 transition-colors">Save</button>
                      <button onClick={() => setEditingValIdx(null)} className="text-[8px] font-mono uppercase text-[#444] hover:text-[#666]">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <span className="text-sm font-semibold">{val.value}</span>
                      {val.description && <p className="text-xs text-[#555] mt-0.5">{val.description}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEditVal(idx)} className="text-[#444] hover:text-neutral-300 transition-colors"><Pencil size={11} /></button>
                      <button onClick={() => deleteVal(idx)} className="text-[#333] hover:text-red-500 transition-colors"><Trash2 size={11} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {addingVal && (
              <div className="bg-[#111] border border-[#facc15]/30 px-4 py-3 space-y-2">
                <input value={newVal.value} onChange={e => setNewVal({ ...newVal, value: e.target.value })} onKeyDown={e => { if (e.key === 'Escape') setAddingVal(false) }} placeholder="Value name..." autoFocus className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none placeholder-[#444]" />
                <input value={newVal.description} onChange={e => setNewVal({ ...newVal, description: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') addVal(); if (e.key === 'Escape') setAddingVal(false) }} placeholder="One-line description..." className="w-full bg-transparent text-xs text-[#666] focus:outline-none placeholder-[#333]" />
                <div className="flex gap-2">
                  <button onClick={addVal} className="text-[8px] font-mono uppercase tracking-widest bg-[#facc15] text-black px-3 py-1 font-bold hover:bg-yellow-300 transition-colors">Add</button>
                  <button onClick={() => setAddingVal(false)} className="text-[8px] font-mono uppercase text-[#444] hover:text-[#666]"><X size={11} /></button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Identity Statement */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User size={12} className="text-[#555]" strokeWidth={1.5} />
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#555]">Who I Am Becoming</span>
            </div>
            <div className="flex items-center gap-2">
              {(data.identityArchive || []).length > 0 && (
                <button onClick={() => setShowArchive(!showArchive)} className="flex items-center gap-1 text-[#444] hover:text-[#666] transition-colors text-[9px] font-mono uppercase tracking-widest">
                  <Archive size={10} /> Archive ({(data.identityArchive || []).length})
                </button>
              )}
              {!editingIdentity && (
                <button onClick={startEditIdentity} className="text-[#444] hover:text-neutral-300 transition-colors"><Pencil size={13} /></button>
              )}
            </div>
          </div>

          {editingIdentity ? (
            <div>
              <textarea value={identityDraft} onChange={e => setIdentityDraft(e.target.value)} placeholder="I am a man of God, built for impact..." rows={8} autoFocus className={cls.input + " resize-none text-sm leading-relaxed"} />
              <div className="flex gap-2 mt-2">
                <button onClick={saveIdentity} className="px-5 py-2 bg-[#facc15] text-black text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-300 transition-colors">Save</button>
                <button onClick={() => setEditingIdentity(false)} className="px-5 py-2 border border-[#2a2a2a] text-[#666] text-[10px] uppercase tracking-widest hover:border-[#555] transition-colors">Cancel</button>
              </div>
            </div>
          ) : (
            <div onClick={startEditIdentity} className="bg-[#111] border border-[#1f1f1f] p-6 cursor-pointer hover:border-[#2a2a2a] transition-colors min-h-[160px]">
              {data.identity ? (
                <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{data.identity}</p>
              ) : (
                <p className="text-[#333] text-sm italic">Click to write your identity statement — who you are and who you are becoming.</p>
              )}
            </div>
          )}

          {showArchive && (data.identityArchive || []).length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-[9px] font-mono uppercase tracking-widest text-[#444] mb-2">Past Versions — Who I Was</div>
              {(data.identityArchive || []).map(arch => (
                <div key={arch.id} className="bg-[#0d0d0d] border border-[#1a1a1a] p-4">
                  <div className="text-[8px] font-mono text-[#333] mb-2 uppercase tracking-widest">{arch.date}</div>
                  <p className="text-xs text-[#444] leading-relaxed whitespace-pre-wrap">{arch.content}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showPrayerModal && (
        <Modal title="Prayer Entry" onClose={() => setShowPrayerModal(false)}>
          <div className="space-y-4">
            <div><label className={cls.label}>Date</label><input type="date" value={pf.date} onChange={e => setPf({ ...pf, date: e.target.value })} className={cls.input} /></div>
            <div><label className={cls.label}>Prayer / Reflection</label><textarea value={pf.content} onChange={e => setPf({ ...pf, content: e.target.value })} placeholder="What are you praying about? What is God saying?" rows={6} autoFocus className={cls.input + " resize-none"} /></div>
            <div className="flex gap-2 pt-1"><button onClick={addPrayer} className={cls.primary}>Save</button><button onClick={() => setShowPrayerModal(false)} className={cls.secondary}>Cancel</button></div>
          </div>
        </Modal>
      )}
    </div>
  )
}
