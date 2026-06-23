import { useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import { fmtShort } from '../utils'

const CATEGORIES = ['Sales Psychology','Human Behavior','Theology','Business Frameworks','Fitness Science','Relationships','Door-to-Door','Reading People','Other']

const cls = {
  input: "w-full bg-[rgba(5,8,20,0.75)] border border-[rgba(99,102,241,0.2)] px-3 py-2 text-sm text-white placeholder-[#a0bcdf] focus:outline-none focus:border-[#e879f9] transition-colors",
  label: "block text-[9px] font-mono uppercase tracking-widest text-[#a0bcdf] mb-1.5",
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
    <div className="h-full flex flex-col" style={{ background: 'rgba(8,12,26,0.65)' }}>
      {/* Header */}
      <div style={{ background: 'rgba(8,12,26,0.65)', borderBottom: '1px solid #162035', padding: '20px 32px', flexShrink: 0, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, color: '#a0bcdf', letterSpacing: '0.12em', textTransform: 'uppercase' }}>KNOWLEDGE ACQUISITION ACTIVE</span>
        </div>
        <h1 style={{
          fontFamily: '"Orbitron", sans-serif', fontWeight: 900, fontSize: 64, lineHeight: 0.9, fontStyle: 'italic', letterSpacing: '0.02em',
          background: 'linear-gradient(135deg, #e879f9, #b8a0ff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0
        }}>
          MIND
        </h1>
        <p style={{ fontFamily: 'Inter', fontSize: 10, color: '#a0bcdf', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>KNOWLEDGE BASE // LEARNING VAULT</p>
        {/* Add Entry button */}
        <button
          onClick={() => setShowModal(true)}
          style={{ position: 'absolute', right: 32, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'linear-gradient(135deg, #e879f9, #a855f7)', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Inter', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', boxShadow: '0 0 16px rgba(232,121,249,0.4)' }}
        >
          <Plus size={11} strokeWidth={2.5} /> Add Entry
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ padding: '8px 32px', borderBottom: '1px solid #162035', display: 'flex', gap: 20, flexWrap: 'wrap', flexShrink: 0 }}>
        <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Total: <span style={{ fontFamily: '"Orbitron", sans-serif', fontWeight: 900, color: '#e879f9' }}>{total}</span>
        </span>
        <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          This month: <span style={{ fontFamily: '"Orbitron", sans-serif', fontWeight: 900, color: '#e879f9' }}>{monthCount}</span>
        </span>
        <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Top: <span style={{ fontFamily: '"Orbitron", sans-serif', fontWeight: 900, color: '#e879f9' }}>{topCat}</span>
        </span>
        {lastEntry && (
          <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Last: <span style={{ color: '#a0bcdf' }}>{fmtShort(lastEntry.date)}</span>
          </span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: categories */}
        <div style={{ width: 208, borderRight: '1px solid #162035', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto', background: 'rgba(8,12,26,0.65)' }}>
          <button
            onClick={() => setActiveCat('All')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 20px', textAlign: 'left',
              borderBottom: '1px solid #162035',
              borderLeft: activeCat === 'All' ? '2px solid #e879f9' : '2px solid transparent',
              background: activeCat === 'All' ? 'rgba(232,121,249,0.08)' : 'transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: activeCat === 'All' ? '#e879f9' : '#a0bcdf' }}>All</span>
            <span style={{ fontFamily: 'Inter', fontSize: 9, background: 'rgba(8,12,26,0.65)', padding: '2px 6px', color: '#a0bcdf' }}>{total}</span>
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px', textAlign: 'left',
                borderBottom: '1px solid rgba(99,102,241,0.18)',
                borderLeft: activeCat === cat ? '2px solid #e879f9' : '2px solid transparent',
                background: activeCat === cat ? 'rgba(232,121,249,0.08)' : 'transparent',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (activeCat !== cat) e.currentTarget.querySelector('span').style.color = '#94a3b8' }}
              onMouseLeave={e => { if (activeCat !== cat) e.currentTarget.querySelector('span').style.color = '#94a3b8' }}
            >
              <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1.3, color: activeCat === cat ? '#e879f9' : '#a0bcdf' }}>{cat}</span>
              {counts[cat] > 0 && <span style={{ fontFamily: 'Inter', fontSize: 9, background: 'rgba(8,12,26,0.65)', padding: '2px 6px', color: '#a0bcdf', flexShrink: 0, marginLeft: 4 }}>{counts[cat]}</span>}
            </button>
          ))}
        </div>

        {/* Right panel: entries */}
        <div className="flex-1 overflow-auto flex flex-col">
          <div style={{ padding: '12px 24px', borderBottom: '1px solid #162035', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a0bcdf' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search entries..."
                style={{ width: '100%', background: 'rgba(8,12,26,0.65)', border: '1px solid rgba(99,102,241,0.18)', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontSize: 14, color: '#a0bcdf', outline: 'none', fontFamily: 'Inter', borderRadius: 8, boxSizing: 'border-box' }}
                onFocus={e => e.currentTarget.style.borderColor = '#e879f9'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.18)'}
              />
            </div>
          </div>

          {/* Contextual Search Panel */}
          <div style={{ margin: '12px 24px 0', background: 'rgba(8,12,26,0.65)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 10, flexShrink: 0 }}>
            <button onClick={() => setShowContextSearch(!showContextSearch)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer' }}>
              <span style={{ fontSize: 14 }}>🧠</span>
              <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, color: '#e879f9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Find Relevant Card</span>
              <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0bcdf', marginLeft: 'auto' }}>Describe a problem you're facing</span>
            </button>
            {showContextSearch && (
              <div style={{ padding: '0 16px 16px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input value={contextQuery} onChange={e => setContextQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleContextSearch()}
                    placeholder="e.g. I'm struggling with staying consistent..."
                    style={{ flex: 1, background: 'rgba(8,12,26,0.65)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 6, padding: '8px 12px', fontFamily: 'Inter', fontSize: 12, color: 'white', outline: 'none' }} />
                  <button onClick={handleContextSearch} disabled={contextSearching}
                    style={{ padding: '8px 14px', background: contextSearching ? '#1e3050' : 'linear-gradient(135deg, #e879f9, #a855f7)', color: contextSearching ? '#a0bcdf' : 'white', border: 'none', borderRadius: 6, cursor: contextSearching ? 'not-allowed' : 'pointer', fontFamily: 'Inter', fontSize: 11, fontWeight: 700, boxShadow: contextSearching ? 'none' : '0 0 16px rgba(232,121,249,0.4)' }}>
                    {contextSearching ? '...' : 'Find'}
                  </button>
                </div>
                {contextError && <p style={{ fontFamily: 'Inter', fontSize: 11, color: '#ff5555', margin: '0 0 8px' }}>{contextError}</p>}
                {contextResult && (
                  <div style={{ background: 'rgba(8,12,26,0.65)', border: '1px solid rgba(232,121,249,0.3)', borderLeft: '3px solid #e879f9', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#e879f9', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>MOST RELEVANT — {contextResult.category}</div>
                    <div style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 6 }}>{contextResult.title}</div>
                    {contextResult.source && <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#a0bcdf', marginBottom: 8 }}>Source: {contextResult.source}</div>}
                    {contextResult.keyPrinciple && <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#d1d5db', margin: 0 }}>{contextResult.keyPrinciple}</p>}
                    {contextResult.bullets && contextResult.bullets.length > 0 && (
                      <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none' }}>
                        {contextResult.bullets.map((b, i) => (
                          <li key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, fontFamily: 'Inter', fontSize: 12, color: '#d1d5db' }}>
                            <span style={{ color: '#e879f9' }}>→</span><span>{b}</span>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 192, fontFamily: 'Inter', fontSize: 10, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.12em' }}>No entries</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.map(entry => (
                  <div
                    key={entry.id}
                    style={{ background: 'linear-gradient(135deg, #080e1a, #0e0818)', border: '1px solid rgba(232,121,249,0.2)', borderRadius: 12, padding: 16 }}
                    className="group"
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 12px rgba(232,121,249,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontFamily: 'Inter', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#e879f9' }}>{entry.category}</span>
                          <span style={{ fontFamily: 'Inter', fontSize: 8, color: '#a0bcdf' }}>{fmtShort(entry.date)}</span>
                        </div>
                        <h3 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: 'white', margin: 0 }}>{entry.title}</h3>
                      </div>
                      <button
                        onClick={() => del(entry.id)}
                        style={{ color: '#1e3050', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 2 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#e879f9'}
                        onMouseLeave={e => e.currentTarget.style.color = '#5a7aaa'}
                      >
                        <X size={12} />
                      </button>
                    </div>
                    {entry.keyPrinciple && (
                      <div style={{ display: 'inline-block', marginBottom: 8, fontFamily: 'Inter', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#e879f9', borderLeft: '3px solid #e879f9', paddingLeft: 8, paddingRight: 6, paddingTop: 2, paddingBottom: 2, borderRadius: 2 }}>{entry.keyPrinciple}</div>
                    )}
                    {entry.bullets && entry.bullets.length > 0 && (
                      <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none' }}>
                        {entry.bullets.map((b, i) => (
                          <li key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, fontFamily: 'Inter', fontSize: 12, color: '#d1d5db' }}>
                            <span style={{ color: '#e879f9', flexShrink: 0 }}>→</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {entry.tags && entry.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {entry.tags.map(tag => (
                          <span key={tag} style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 700, color: '#e879f9', background: 'rgba(232,121,249,0.08)', border: '1px solid rgba(232,121,249,0.2)', borderRadius: 4, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {entry.summary && <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#a0bcdf', lineHeight: 1.6, margin: '0 0 4px' }}>{entry.summary}</p>}
                    {entry.note && <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#a0bcdf', lineHeight: 1.6, fontStyle: 'italic', borderLeft: '2px solid rgba(232,121,249,0.35)', paddingLeft: 8, marginTop: 8, marginBottom: 0 }}>{entry.note}</p>}
                    {entry.source && <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0bcdf', marginTop: 8 }}>Source: {entry.source}</div>}
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
            <div style={{ display: 'flex', gap: 1, marginBottom: 16, background: 'rgba(8,12,26,0.65)', borderRadius: 8, padding: 4, border: '1px solid rgba(99,102,241,0.18)' }}>
              {[['raw', 'Manual'], ['ai', 'AI Format ✨']].map(([mode, label]) => (
                <button key={mode} onClick={() => { setAiMode(mode === 'ai'); setAiError('') }}
                  style={{ flex: 1, padding: '7px', fontFamily: 'Inter', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', borderRadius: 6, transition: 'all 0.15s',
                    background: (mode === 'ai') === aiMode ? 'linear-gradient(135deg, #e879f9, #a855f7)' : 'transparent',
                    color: (mode === 'ai') === aiMode ? 'white' : '#a0bcdf',
                    boxShadow: (mode === 'ai') === aiMode && mode === 'ai' ? '0 0 16px rgba(232,121,249,0.4)' : 'none'
                  }}>{label}</button>
              ))}
            </div>

            {aiMode ? (
              <div className="space-y-4">
                <div>
                  <label style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>Raw Notes / Takeaways</label>
                  <textarea value={rawNotes} onChange={e => setRawNotes(e.target.value)} rows={6}
                    placeholder="Paste your raw notes, takeaways, or summary from any video, book, or podcast..."
                    style={{ width: '100%', background: 'rgba(8,12,26,0.65)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 8, padding: '10px 12px', fontFamily: 'Inter', fontSize: 13, color: 'white', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontFamily: 'Inter', fontSize: 9, color: '#a0bcdf', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>Source</label>
                  <input value={rawSource} onChange={e => setRawSource(e.target.value)} placeholder="Book title, video name, podcast episode..."
                    style={{ width: '100%', background: 'rgba(8,12,26,0.65)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 8, padding: '8px 12px', fontFamily: 'Inter', fontSize: 13, color: 'white', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                {aiError && <p style={{ fontFamily: 'Inter', fontSize: 11, color: '#ff5555', margin: 0 }}>{aiError}</p>}
                <button onClick={handleAIFormat} disabled={aiFormatting || !rawNotes.trim()}
                  style={{ width: '100%', padding: '11px', background: aiFormatting ? '#1e3050' : 'linear-gradient(135deg, #e879f9, #a855f7)', color: aiFormatting ? '#a0bcdf' : 'white', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', border: 'none', borderRadius: 8, cursor: aiFormatting ? 'not-allowed' : 'pointer', fontFamily: 'Inter', boxShadow: aiFormatting ? 'none' : '0 0 16px rgba(232,121,249,0.4)' }}>
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
                  <button onClick={addEntry} style={{ flex: 1, padding: '10px 0', background: 'linear-gradient(135deg, #e879f9, #a855f7)', color: 'white', fontFamily: 'Inter', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', borderRadius: 8, cursor: 'pointer', boxShadow: '0 0 16px rgba(232,121,249,0.4)' }}>Save Entry</button>
                  <button onClick={() => { setShowModal(false); setAiMode(false); setRawNotes(''); setRawSource(''); setAiError('') }} style={{ padding: '10px 16px', background: 'transparent', color: '#a0bcdf', fontFamily: 'Inter', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
