import { useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import { fmtShort } from '../utils'

const CATEGORIES = ['Sales Psychology','Human Behavior','Theology','Business Frameworks','Fitness Science','Relationships','Door-to-Door','Reading People','Other']

const cls = {
  input: "w-full bg-[#06060f] border border-[#1a1a2e] px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#f59e0b] transition-colors",
  label: "block text-[9px] font-mono uppercase tracking-widest text-[#444] mb-1.5",
}

async function formatWithAI(rawNotes, source) {
  const apiKey = localStorage.getItem('anthropic_key') || import.meta.env.VITE_ANTHROPIC_API_KEY || ''
  if (!apiKey) throw new Error('No API key — set it in Growth Feed → API Key')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `You are a knowledge management system. Format these raw notes into a clean knowledge card.

Source: "${source}"
Raw notes: "${rawNotes}"

Return ONLY valid JSON (no other text):
{
  "title": "Concise title (max 8 words)",
  "keyPrinciple": "The single most important insight in one sentence",
  "bullets": ["Insight 1", "Insight 2", "Insight 3", "Insight 4"],
  "tags": ["tag1", "tag2", "tag3"],
  "category": "one of: Sales Psychology|Human Behavior|Theology|Business Frameworks|Fitness Science|Relationships|Door-to-Door|Reading People|Other"
}`
      }]
    })
  })
  const data = await res.json()
  const text = data.content[0].text.trim()
  return JSON.parse(text.startsWith('{') ? text : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
}

export default function Mind() {
  const [entries, setEntries] = useLocalStorage('marko_mind', [])
  const [activeCat, setActiveCat] = useState('All')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', summary: '', source: '', date: new Date().toISOString().split('T')[0], category: CATEGORIES[0], keyPrinciple: '', note: '' })

  // AI Knowledge Card Builder state
  const [aiMode, setAiMode] = useState(false)
  const [rawNotes, setRawNotes] = useState('')
  const [rawSource, setRawSource] = useState('')
  const [aiFormatting, setAiFormatting] = useState(false)
  const [aiError, setAiError] = useState('')

  // Contextual Card Retrieval state
  const [showContextSearch, setShowContextSearch] = useState(false)
  const [contextQuery, setContextQuery] = useState('')
  const [contextResult, setContextResult] = useState(null)
  const [contextSearching, setContextSearching] = useState(false)
  const [contextError, setContextError] = useState('')

  const handleAIFormat = async () => {
    if (!rawNotes.trim()) return
    setAiFormatting(true)
    setAiError('')
    try {
      const result = await formatWithAI(rawNotes, rawSource)
      setForm(f => ({
        ...f,
        title: result.title || f.title,
        keyPrinciple: result.keyPrinciple || f.keyPrinciple,
        category: result.category || f.category,
        summary: rawNotes,
        source: rawSource,
      }))
      window._pendingBullets = result.bullets || []
      window._pendingTags = result.tags || []
      setAiMode(false)
    } catch(err) {
      setAiError(err.message || 'AI formatting failed')
    } finally { setAiFormatting(false) }
  }

  const handleContextSearch = async () => {
    if (!contextQuery.trim() || entries.length === 0) return
    setContextSearching(true)
    setContextError('')
    setContextResult(null)
    const apiKey = localStorage.getItem('anthropic_key') || import.meta.env.VITE_ANTHROPIC_API_KEY || ''
    if (!apiKey) { setContextError('No API key set'); setContextSearching(false); return }
    try {
      const entryList = entries.slice(0, 30).map((e, i) => `[${i}] "${e.title}" (${e.category}): ${e.keyPrinciple || e.summary || ''}. ${(e.bullets || []).join('. ')}`).join('\n')
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001', max_tokens: 100,
          messages: [{ role: 'user', content: `I'm struggling with: "${contextQuery}"\n\nWhich of these knowledge cards is most relevant?\n\n${entryList}\n\nReturn ONLY the index number of the most relevant card (e.g. just "3"). No other text.` }]
        })
      })
      const data = await res.json()
      const idx = parseInt(data.content[0].text.trim())
      if (!isNaN(idx) && entries[idx]) setContextResult(entries[idx])
      else setContextError('No relevant card found')
    } catch(err) { setContextError(err.message || 'Search failed') }
    finally { setContextSearching(false) }
  }

  const addEntry = () => {
    if (!form.title.trim()) return
    setEntries([{
      ...form,
      id: Date.now(),
      bullets: window._pendingBullets || [],
      tags: window._pendingTags || [],
    }, ...entries])
    window._pendingBullets = []
    window._pendingTags = []
    setForm({ title: '', summary: '', source: '', date: new Date().toISOString().split('T')[0], category: CATEGORIES[0], keyPrinciple: '', note: '' })
    setShowModal(false)
    setAiMode(false)
    setRawNotes('')
    setRawSource('')
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
    <div className="h-full flex flex-col" style={{ background: '#06060f' }}>
      {/* Header */}
      <div style={{ background: '#06060f', borderBottom: '1px solid #1a1a2e', padding: '20px 32px', flexShrink: 0, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, color: '#4b5563', letterSpacing: '0.12em', textTransform: 'uppercase' }}>KNOWLEDGE ACQUISITION ACTIVE</span>
        </div>
        <h1 style={{
          fontFamily: '"Bebas Neue",cursive', fontSize: 64, fontWeight: 400, lineHeight: 0.9, fontStyle: 'italic', letterSpacing: '0.02em',
          background: 'linear-gradient(180deg,#facc15 0%,#f59e0b 60%,#f97316 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0
        }}>
          MIND
        </h1>
        <p style={{ fontFamily: 'Inter', fontSize: 10, color: '#4b5563', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>KNOWLEDGE BASE // LEARNING VAULT</p>
        {/* Add Entry button */}
        <button
          onClick={() => setShowModal(true)}
          style={{ position: 'absolute', right: 32, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, fontFamily: 'Inter', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer' }}
        >
          <Plus size={11} strokeWidth={2.5} /> Add Entry
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ padding: '8px 32px', borderBottom: '1px solid #1a1a2e', display: 'flex', gap: 20, flexWrap: 'wrap', flexShrink: 0 }}>
        <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Total: <span style={{ color: '#6b7280' }}>{total}</span>
        </span>
        <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          This month: <span style={{ color: '#6b7280' }}>{monthCount}</span>
        </span>
        <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Top: <span style={{ color: '#f59e0b' }}>{topCat}</span>
        </span>
        {lastEntry && (
          <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Last: <span style={{ color: '#6b7280' }}>{fmtShort(lastEntry.date)}</span>
          </span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: categories */}
        <div style={{ width: 208, borderRight: '1px solid #1a1a2e', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto', background: '#0b0b16' }}>
          <button
            onClick={() => setActiveCat('All')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 20px', textAlign: 'left',
              borderBottom: '1px solid #1a1a2e',
              borderLeft: activeCat === 'All' ? '2px solid #f59e0b' : '2px solid transparent',
              background: activeCat === 'All' ? 'rgba(245,158,11,0.08)' : 'transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: activeCat === 'All' ? 'white' : '#4b5563' }}>All</span>
            <span style={{ fontFamily: 'Inter', fontSize: 9, background: '#06060f', padding: '2px 6px', color: '#4b5563' }}>{total}</span>
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px', textAlign: 'left',
                borderBottom: '1px solid #1a1a2e',
                borderLeft: activeCat === cat ? '2px solid #f59e0b' : '2px solid transparent',
                background: activeCat === cat ? 'rgba(245,158,11,0.08)' : 'transparent',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (activeCat !== cat) e.currentTarget.querySelector('span').style.color = '#6b7280' }}
              onMouseLeave={e => { if (activeCat !== cat) e.currentTarget.querySelector('span').style.color = '#4b5563' }}
            >
              <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1.3, color: activeCat === cat ? 'white' : '#4b5563' }}>{cat}</span>
              {counts[cat] > 0 && <span style={{ fontFamily: 'Inter', fontSize: 9, background: '#06060f', padding: '2px 6px', color: '#4b5563', flexShrink: 0, marginLeft: 4 }}>{counts[cat]}</span>}
            </button>
          ))}
        </div>

        {/* Right panel: entries */}
        <div className="flex-1 overflow-auto flex flex-col">
          <div style={{ padding: '12px 24px', borderBottom: '1px solid #1a1a2e', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search entries..."
                style={{ width: '100%', background: '#06060f', border: '1px solid #1a1a2e', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontSize: 14, color: '#888', outline: 'none', fontFamily: 'Inter', borderRadius: 8, boxSizing: 'border-box' }}
                onFocus={e => e.currentTarget.style.borderColor = '#f59e0b'}
                onBlur={e => e.currentTarget.style.borderColor = '#1a1a2e'}
              />
            </div>
          </div>

          {/* Contextual Search Panel */}
          <div style={{ margin: '12px 24px 0', background: '#0b0b16', border: '1px solid #1a1a2e', borderRadius: 10, flexShrink: 0 }}>
            <button onClick={() => setShowContextSearch(!showContextSearch)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer' }}>
              <span style={{ fontSize: 14 }}>🧠</span>
              <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Find Relevant Card</span>
              <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#4b5563', marginLeft: 'auto' }}>Describe a problem you're facing</span>
            </button>
            {showContextSearch && (
              <div style={{ padding: '0 16px 16px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input value={contextQuery} onChange={e => setContextQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleContextSearch()}
                    placeholder="e.g. I'm struggling with staying consistent..."
                    style={{ flex: 1, background: '#06060f', border: '1px solid #1a1a2e', borderRadius: 6, padding: '8px 12px', fontFamily: 'Inter', fontSize: 12, color: 'white', outline: 'none' }} />
                  <button onClick={handleContextSearch} disabled={contextSearching}
                    style={{ padding: '8px 14px', background: contextSearching ? '#1a1a2e' : '#f59e0b', color: contextSearching ? '#4b5563' : '#000', border: 'none', borderRadius: 6, cursor: contextSearching ? 'not-allowed' : 'pointer', fontFamily: 'Inter', fontSize: 11, fontWeight: 700 }}>
                    {contextSearching ? '...' : 'Find'}
                  </button>
                </div>
                {contextError && <p style={{ fontFamily: 'Inter', fontSize: 11, color: '#ef4444', margin: '0 0 8px' }}>{contextError}</p>}
                {contextResult && (
                  <div style={{ background: '#06060f', border: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>MOST RELEVANT — {contextResult.category}</div>
                    <div style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 6 }}>{contextResult.title}</div>
                    {contextResult.source && <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#4b5563', marginBottom: 8 }}>Source: {contextResult.source}</div>}
                    {contextResult.keyPrinciple && <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#d1d5db', margin: 0 }}>{contextResult.keyPrinciple}</p>}
                    {contextResult.bullets && contextResult.bullets.length > 0 && (
                      <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none' }}>
                        {contextResult.bullets.map((b, i) => (
                          <li key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, fontFamily: 'Inter', fontSize: 12, color: '#d1d5db' }}>
                            <span style={{ color: '#f59e0b' }}>→</span><span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {filtered.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 192, fontFamily: 'Inter', fontSize: 10, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.12em' }}>No entries</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.map(entry => (
                  <div
                    key={entry.id}
                    style={{ background: '#0b0b16', border: '1px solid #1a1a2e', borderRadius: 8, padding: 16 }}
                    className="group"
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 12px rgba(245,158,11,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontFamily: 'Inter', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f59e0b' }}>{entry.category}</span>
                          <span style={{ fontFamily: 'Inter', fontSize: 8, color: '#4b5563' }}>{fmtShort(entry.date)}</span>
                        </div>
                        <h3 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: 'white', margin: 0 }}>{entry.title}</h3>
                      </div>
                      <button
                        onClick={() => del(entry.id)}
                        style={{ color: '#2a2a2a', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 2 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#f59e0b'}
                        onMouseLeave={e => e.currentTarget.style.color = '#2a2a2a'}
                      >
                        <X size={12} />
                      </button>
                    </div>
                    {entry.keyPrinciple && (
                      <div style={{ display: 'inline-block', marginBottom: 8, fontFamily: 'Inter', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', padding: '2px 6px', borderRadius: 4 }}>{entry.keyPrinciple}</div>
                    )}
                    {entry.bullets && entry.bullets.length > 0 && (
                      <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none' }}>
                        {entry.bullets.map((b, i) => (
                          <li key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, fontFamily: 'Inter', fontSize: 12, color: '#d1d5db' }}>
                            <span style={{ color: '#f59e0b', flexShrink: 0 }}>→</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {entry.tags && entry.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {entry.tags.map(tag => (
                          <span key={tag} style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 4, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {entry.summary && <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#6b7280', lineHeight: 1.6, margin: '0 0 4px' }}>{entry.summary}</p>}
                    {entry.note && <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#4b5563', lineHeight: 1.6, fontStyle: 'italic', borderLeft: '2px solid rgba(245,158,11,0.25)', paddingLeft: 8, marginTop: 8, marginBottom: 0 }}>{entry.note}</p>}
                    {entry.source && <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#4b5563', marginTop: 8 }}>Source: {entry.source}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <Modal title="New Entry" onClose={() => { setShowModal(false); setAiMode(false); setRawNotes(''); setRawSource(''); setAiError('') }}>
          <div className="space-y-4">
            {/* AI / Manual toggle */}
            <div style={{ display: 'flex', gap: 1, marginBottom: 16, background: '#06060f', borderRadius: 8, padding: 4, border: '1px solid #1a1a2e' }}>
              {[['raw', 'Manual'], ['ai', 'AI Format ✨']].map(([mode, label]) => (
                <button key={mode} onClick={() => { setAiMode(mode === 'ai'); setAiError('') }}
                  style={{ flex: 1, padding: '7px', fontFamily: 'Inter', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', borderRadius: 6, transition: 'all 0.15s',
                    background: (mode === 'ai') === aiMode ? '#f59e0b' : 'transparent',
                    color: (mode === 'ai') === aiMode ? '#000' : '#4b5563'
                  }}>{label}</button>
              ))}
            </div>

            {aiMode ? (
              <div className="space-y-4">
                <div>
                  <label style={{ fontFamily: 'Inter', fontSize: 9, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>Raw Notes / Takeaways</label>
                  <textarea value={rawNotes} onChange={e => setRawNotes(e.target.value)} rows={6}
                    placeholder="Paste your raw notes, takeaways, or summary from any video, book, or podcast..."
                    style={{ width: '100%', background: '#06060f', border: '1px solid #1a1a2e', borderRadius: 8, padding: '10px 12px', fontFamily: 'Inter', fontSize: 13, color: 'white', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontFamily: 'Inter', fontSize: 9, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>Source</label>
                  <input value={rawSource} onChange={e => setRawSource(e.target.value)} placeholder="Book title, video name, podcast episode..."
                    style={{ width: '100%', background: '#06060f', border: '1px solid #1a1a2e', borderRadius: 8, padding: '8px 12px', fontFamily: 'Inter', fontSize: 13, color: 'white', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                {aiError && <p style={{ fontFamily: 'Inter', fontSize: 11, color: '#ef4444', margin: 0 }}>{aiError}</p>}
                <button onClick={handleAIFormat} disabled={aiFormatting || !rawNotes.trim()}
                  style={{ width: '100%', padding: '11px', background: aiFormatting ? '#1a1a2e' : '#f59e0b', color: aiFormatting ? '#4b5563' : '#000', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', border: 'none', borderRadius: 8, cursor: aiFormatting ? 'not-allowed' : 'pointer', fontFamily: 'Inter' }}>
                  {aiFormatting ? 'Formatting...' : '✨ Format with AI'}
                </button>
              </div>
            ) : (
              <>
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
                <div><label className={cls.label}>Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={cls.input} /></div>
                <div className="flex gap-2 pt-1">
                  <button onClick={addEntry} style={{ flex: 1, padding: '10px 0', background: '#f59e0b', color: '#000', fontFamily: 'Inter', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Save Entry</button>
                  <button onClick={() => { setShowModal(false); setAiMode(false); setRawNotes(''); setRawSource(''); setAiError('') }} style={{ padding: '10px 16px', background: 'transparent', color: '#4b5563', fontFamily: 'Inter', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', border: '1px solid #1a1a2e', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
