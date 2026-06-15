import { useState } from 'react'
import { Plus, Search, BookOpen, X, ChevronDown } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import { fmtShort } from '../utils'

const CATEGORIES = ['Sales Psychology', 'Human Behavior', 'Theology', 'Business Frameworks', 'Fitness Science', 'Relationships', 'Door-to-Door', 'Reading People']

const cls = {
  input: "w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#555] transition-colors",
  label: "block text-[10px] font-mono uppercase tracking-widest text-[#555] mb-1.5",
  primary: "flex-1 py-2.5 bg-[#facc15] text-black text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-300 transition-colors",
  secondary: "px-4 py-2.5 border border-[#2a2a2a] text-[#666] text-[10px] uppercase tracking-widest hover:border-[#555] hover:text-neutral-300 transition-colors",
}

export default function Mind() {
  const [entries, setEntries] = useLocalStorage('marko_mind', [])
  const [activeCat, setActiveCat] = useState('All')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', summary: '', source: '', date: new Date().toISOString().split('T')[0], category: CATEGORIES[0], keyPrinciple: '' })

  const addEntry = () => {
    if (!form.title.trim()) return
    setEntries([{ ...form, id: Date.now() }, ...entries])
    setForm({ title: '', summary: '', source: '', date: new Date().toISOString().split('T')[0], category: CATEGORIES[0], keyPrinciple: '' })
    setShowModal(false)
  }

  const del = (id) => setEntries(entries.filter(e => e.id !== id))

  const filtered = entries.filter(e => {
    const matchCat = activeCat === 'All' || e.category === activeCat
    const q = search.toLowerCase()
    const matchSearch = !q || e.title.toLowerCase().includes(q) || e.summary?.toLowerCase().includes(q) || e.source?.toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  const counts = CATEGORIES.reduce((a, c) => { a[c] = entries.filter(e => e.category === c).length; return a }, {})

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-6 border-b border-[#1f1f1f] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight uppercase">Mind</h1>
          <p className="text-[10px] font-mono text-[#555] mt-0.5 uppercase tracking-widest">{entries.length} entries · {CATEGORIES.length} categories</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#facc15] text-black text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-300 transition-colors">
          <Plus size={11} strokeWidth={2.5} /> Add Entry
        </button>
      </div>

      {/* Search + Category tabs */}
      <div className="px-8 py-3 border-b border-[#1f1f1f] space-y-2 shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search entries..."
            className="w-full bg-[#111] border border-[#1f1f1f] pl-8 pr-3 py-2 text-sm text-neutral-300 placeholder-[#444] focus:outline-none focus:border-[#2a2a2a]"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {['All', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest whitespace-nowrap shrink-0 transition-all ${
                activeCat === cat
                  ? 'bg-[#facc15] text-black font-bold'
                  : 'text-[#555] border border-transparent hover:border-[#2a2a2a] hover:text-neutral-300'
              }`}
            >
              {cat}{cat !== 'All' && counts[cat] ? ` (${counts[cat]})` : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <BookOpen size={28} className="text-[#222]" strokeWidth={1} />
            <p className="text-[#555] text-sm">{search ? 'No results' : 'No entries yet'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(entry => <EntryCard key={entry.id} entry={entry} onDelete={() => del(entry.id)} />)}
          </div>
        )}
      </div>

      {showModal && (
        <Modal title="New Entry" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className={cls.label}>Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={cls.input}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={cls.label}>Title</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Principle or concept..." className={cls.input} autoFocus />
            </div>
            <div>
              <label className={cls.label}>Summary (2-3 sentences)</label>
              <textarea value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} placeholder="What does this mean and why does it matter?" rows={4} className={cls.input + " resize-none"} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={cls.label}>Source</label>
                <input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="Book, person, experience..." className={cls.input} />
              </div>
              <div>
                <label className={cls.label}>Key Principle Tag</label>
                <input value={form.keyPrinciple} onChange={e => setForm({ ...form, keyPrinciple: e.target.value })} placeholder="Short tag..." className={cls.input} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={addEntry} className={cls.primary}>Save Entry</button>
              <button onClick={() => setShowModal(false)} className={cls.secondary}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function EntryCard({ entry, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-[#111] border border-[#1f1f1f] hover:border-[#2a2a2a] transition-colors group">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-[9px] font-mono uppercase tracking-widest text-[#555]">{entry.category}</span>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onDelete} className="text-[#333] hover:text-red-500 transition-colors"><X size={11} /></button>
            <button onClick={() => setExpanded(!expanded)} className="text-[#444] hover:text-neutral-400">
              <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        <h3 className="text-sm font-semibold text-white leading-snug">{entry.title}</h3>
        {entry.keyPrinciple && (
          <span className="inline-block mt-1.5 text-[9px] font-mono uppercase tracking-widest text-[#facc15] border border-[#facc15]/20 px-1.5 py-0.5">
            {entry.keyPrinciple}
          </span>
        )}
        {entry.summary && (
          <p className={`text-xs text-[#666] mt-2 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>{entry.summary}</p>
        )}
      </div>
      {(entry.source || entry.date) && (
        <div className="px-4 py-2.5 border-t border-[#171717] flex items-center justify-between">
          <span className="text-[9px] font-mono text-[#444]">{entry.source}</span>
          <span className="text-[9px] font-mono text-[#333]">{fmtShort(entry.date)}</span>
        </div>
      )}
    </div>
  )
}
