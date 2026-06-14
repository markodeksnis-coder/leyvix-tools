import { useState } from 'react'
import { Plus, BookOpen, ChevronDown, X } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'

const CATEGORIES = ['Sales Psychology', 'Human Behavior', 'Theology', 'Business', 'Fitness Science', 'Relationships']

const cls = {
  input: "w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm text-neutral-100 placeholder-neutral-700 focus:outline-none focus:border-neutral-500 transition-colors",
  label: "block text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-1.5",
  btnPrimary: "flex-1 py-2.5 bg-white text-black text-[10px] font-semibold uppercase tracking-widest hover:bg-neutral-200 transition-colors",
  btnSecondary: "px-4 py-2.5 border border-[#2a2a2a] text-neutral-600 text-[10px] uppercase tracking-widest hover:border-neutral-600 hover:text-neutral-300 transition-colors",
}

export default function Mind() {
  const [entries, setEntries] = useLocalStorage('mind_entries', [])
  const [activeCategory, setActiveCategory] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', summary: '', source: '', category: CATEGORIES[0] })

  const categories = ['All', ...CATEGORIES]
  const filtered = activeCategory === 'All' ? entries : entries.filter(e => e.category === activeCategory)

  const addEntry = () => {
    if (!form.title.trim()) return
    setEntries([{ ...form, id: Date.now(), createdAt: new Date().toISOString() }, ...entries])
    setForm({ title: '', summary: '', source: '', category: CATEGORIES[0] })
    setShowModal(false)
  }

  const deleteEntry = (id) => setEntries(entries.filter(e => e.id !== id))

  const counts = CATEGORIES.reduce((acc, c) => {
    acc[c] = entries.filter(e => e.category === c).length
    return acc
  }, {})

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-6 border-b border-[#1f1f1f] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Mind</h1>
          <p className="text-[10px] font-mono text-neutral-600 mt-0.5 uppercase tracking-widest">
            {entries.length} entries · {CATEGORIES.length} categories
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] font-semibold uppercase tracking-widest hover:bg-neutral-200 transition-colors"
        >
          <Plus size={12} strokeWidth={2.5} />
          Add Entry
        </button>
      </div>

      {/* Category tabs */}
      <div className="px-8 py-3 border-b border-[#1f1f1f] flex gap-1 overflow-x-auto shrink-0">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest whitespace-nowrap transition-all ${
              activeCategory === cat
                ? 'bg-white text-black font-semibold'
                : 'text-neutral-600 hover:text-neutral-300 border border-transparent hover:border-[#2a2a2a]'
            }`}
          >
            {cat}
            {cat !== 'All' && counts[cat] > 0 && (
              <span className="ml-1.5 text-[9px]">({counts[cat]})</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <BookOpen size={28} className="text-neutral-800" strokeWidth={1} />
            <div className="text-center">
              <p className="text-neutral-500 text-sm">No entries yet</p>
              <p className="text-neutral-700 text-xs mt-1 font-mono">Knowledge compounds. Start capturing.</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-[#2a2a2a] text-neutral-500 text-[10px] uppercase tracking-widest hover:border-neutral-600 hover:text-neutral-300 transition-colors"
            >
              <Plus size={11} /> Add First Entry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(entry => (
              <EntryCard key={entry.id} entry={entry} onDelete={() => deleteEntry(entry.id)} />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <Modal title="New Entry" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className={cls.label}>Category</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className={cls.input}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={cls.label}>Title</label>
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Principle, concept, or insight..."
                className={cls.input}
                autoFocus
              />
            </div>
            <div>
              <label className={cls.label}>Summary</label>
              <textarea
                value={form.summary}
                onChange={e => setForm({ ...form, summary: e.target.value })}
                placeholder="The core idea in your own words..."
                rows={4}
                className={cls.input + " resize-none"}
              />
            </div>
            <div>
              <label className={cls.label}>Source</label>
              <input
                value={form.source}
                onChange={e => setForm({ ...form, source: e.target.value })}
                placeholder="Book, person, experience..."
                className={cls.input}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={addEntry} className={cls.btnPrimary}>Save Entry</button>
              <button onClick={() => setShowModal(false)} className={cls.btnSecondary}>Cancel</button>
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
    <div className="bg-[#111] border border-[#1f1f1f] hover:border-[#282828] transition-colors group">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-700 pt-0.5">
            {entry.category}
          </span>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onDelete} className="text-neutral-800 hover:text-red-500 transition-colors">
              <X size={12} />
            </button>
            <button onClick={() => setExpanded(!expanded)} className="text-neutral-700 hover:text-neutral-400 transition-colors">
              <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        <h3 className="text-sm font-medium text-neutral-100 leading-snug">{entry.title}</h3>
        {entry.summary && (
          <p className={`text-xs text-neutral-500 mt-2 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
            {entry.summary}
          </p>
        )}
      </div>
      {entry.source && (
        <div className="px-4 py-2.5 border-t border-[#171717]">
          <span className="text-[9px] font-mono text-neutral-700 uppercase tracking-widest">Source: </span>
          <span className="text-[9px] font-mono text-neutral-600">{entry.source}</span>
        </div>
      )}
    </div>
  )
}
