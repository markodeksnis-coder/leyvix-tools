import { useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import { fmtShort } from '../utils'

const CATEGORIES = ['Sales Psychology','Human Behavior','Theology','Business Frameworks','Fitness Science','Relationships','Door-to-Door','Reading People','Other']

const cls = {
  input: "w-full bg-[#080808] border border-[#2a2a2a] px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#dc2626] transition-colors",
  label: "block text-[9px] font-mono uppercase tracking-widest text-[#444] mb-1.5",
}

export default function Mind() {
  const [entries, setEntries] = useLocalStorage('marko_mind', [])
  const [activeCat, setActiveCat] = useState('All')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', summary: '', source: '', date: new Date().toISOString().split('T')[0], category: CATEGORIES[0], keyPrinciple: '', note: '' })

  const addEntry = () => {
    if (!form.title.trim()) return
    setEntries([{ ...form, id: Date.now() }, ...entries])
    setForm({ title: '', summary: '', source: '', date: new Date().toISOString().split('T')[0], category: CATEGORIES[0], keyPrinciple: '', note: '' })
    setShowModal(false)
  }

  const del = id => setEntries(entries.filter(e => e.id !== id))

  const counts = CATEGORIES.reduce((a, c) => { a[c] = entries.filter(e => e.category === c).length; return a }, {})
  const total = entries.length

  const filtered = entries.filter(e => {
    const matchCat = activeCat === 'All' || e.category === activeCat
    const q = search.toLowerCase()
    const matchSearch = !q || e.title.toLowerCase().includes(q) || e.summary?.toLowerCase().includes(q) || e.keyPrinciple?.toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthCount = entries.filter(e => e.date?.startsWith(thisMonth)).length
  const topCat = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
  const lastEntry = [...entries].sort((a, b) => b.date > a.date ? 1 : -1)[0]

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-5 border-b border-[#2a2a2a] shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-tight">Mind</h1>
          <p className="text-[10px] font-mono text-[#444] mt-0.5 uppercase tracking-widest">Knowledge Base</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#dc2626] text-white text-[9px] font-bold uppercase tracking-widest hover:bg-red-500 transition-colors">
          <Plus size={11} strokeWidth={2.5} /> Add Entry
        </button>
      </div>

      <div className="px-8 py-2 border-b border-[#2a2a2a] flex gap-5 text-[9px] font-mono text-[#333] uppercase tracking-widest shrink-0 flex-wrap">
        <span>Total: <span className="text-[#666]">{total}</span></span>
        <span>This month: <span className="text-[#666]">{monthCount}</span></span>
        <span>Top: <span className="text-[#dc2626]">{topCat}</span></span>
        {lastEntry && <span>Last: <span className="text-[#666]">{fmtShort(lastEntry.date)}</span></span>}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: categories */}
        <div className="w-52 border-r border-[#2a2a2a] flex flex-col shrink-0 overflow-auto bg-[#080808]">
          <button
            onClick={() => setActiveCat('All')}
            className={`w-full flex items-center justify-between px-5 py-3 text-left border-b border-[#141414] border-l-2 transition-all ${activeCat === 'All' ? 'bg-[#dc2626]/10 border-l-[#dc2626] text-white' : 'text-[#444] hover:text-[#888] hover:bg-[#0f0f0f] border-l-transparent'}`}
          >
            <span className="text-[10px] font-mono uppercase tracking-widest">All</span>
            <span className="text-[9px] font-mono bg-[#141414] px-1.5 py-0.5 text-[#555]">{total}</span>
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`w-full flex items-center justify-between px-5 py-3 text-left border-b border-[#141414] border-l-2 transition-all ${activeCat === cat ? 'bg-[#dc2626]/10 border-l-[#dc2626] text-white' : 'text-[#444] hover:text-[#888] hover:bg-[#0f0f0f] border-l-transparent'}`}
            >
              <span className="text-[10px] font-mono uppercase tracking-widest leading-tight">{cat}</span>
              {counts[cat] > 0 && <span className="text-[9px] font-mono bg-[#141414] px-1.5 py-0.5 text-[#555] shrink-0 ml-1">{counts[cat]}</span>}
            </button>
          ))}
        </div>

        {/* Right panel: entries */}
        <div className="flex-1 overflow-auto flex flex-col">
          <div className="px-6 py-3 border-b border-[#2a2a2a] shrink-0">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#333]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entries..." className="w-full bg-[#141414] border border-[#2a2a2a] pl-8 pr-3 py-2 text-sm text-[#888] placeholder-[#333] focus:outline-none focus:border-[#dc2626]" />
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-[#333] text-[10px] font-mono uppercase tracking-widest">No entries</div>
            ) : (
              <div className="space-y-2">
                {filtered.map(entry => (
                  <div key={entry.id} className="bg-[#0f0f0f] border border-[#2a2a2a] p-4 hover:shadow-[0_0_12px_rgba(220,38,38,0.1)] transition-all group">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[8px] font-mono uppercase tracking-widest text-[#dc2626]">{entry.category}</span>
                          <span className="text-[8px] font-mono text-[#333]">{fmtShort(entry.date)}</span>
                        </div>
                        <h3 className="text-sm font-bold text-white">{entry.title}</h3>
                      </div>
                      <button onClick={() => del(entry.id)} className="text-[#222] hover:text-[#dc2626] opacity-0 group-hover:opacity-100 transition-all shrink-0"><X size={12} /></button>
                    </div>
                    {entry.keyPrinciple && (
                      <div className="inline-block mb-2 text-[8px] font-mono uppercase tracking-widest text-[#dc2626] border border-[#dc2626]/30 px-1.5 py-0.5">{entry.keyPrinciple}</div>
                    )}
                    {entry.summary && <p className="text-xs text-[#555] leading-relaxed mb-1">{entry.summary}</p>}
                    {entry.note && <p className="text-xs text-[#444] leading-relaxed italic border-l-2 border-[#2a2a2a] pl-2 mt-2">{entry.note}</p>}
                    {entry.source && <div className="text-[9px] font-mono text-[#333] mt-2">Source: {entry.source}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <Modal title="New Entry" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div><label className={cls.label}>Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={cls.input}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label className={cls.label}>Title</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus placeholder="Principle or concept..." className={cls.input} /></div>
            <div><label className={cls.label}>Summary</label><textarea value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} rows={3} placeholder="What does this mean and why does it matter?" className={cls.input + " resize-none"} /></div>
            <div><label className={cls.label}>Personal Note</label><textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={2} placeholder="Your take on this..." className={cls.input + " resize-none"} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={cls.label}>Source</label><input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="Book, person..." className={cls.input} /></div>
              <div><label className={cls.label}>Key Principle</label><input value={form.keyPrinciple} onChange={e => setForm({ ...form, keyPrinciple: e.target.value })} placeholder="Short tag..." className={cls.input} /></div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={addEntry} className="flex-1 py-2.5 bg-[#dc2626] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 transition-colors">Save Entry</button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 border border-[#2a2a2a] text-[#444] text-[10px] uppercase tracking-widest hover:border-[#666] transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
