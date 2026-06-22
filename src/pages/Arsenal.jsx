import { useState } from 'react'
import { Plus, Search, X, Zap } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Modal from '../components/Modal'
import { fmtShort } from '../utils'

// ─── Design tokens ───────────────────────────────────────────────────────────
const BG          = '#030311'
const SURF        = '#09091f'
const CARD_BORDER = '#1d1d4a'
const GOLD        = '#fbbf24'
const BLUE        = '#3b82f6'
const GREEN       = '#10b981'
const PURPLE      = '#8b5cf6'
const RED         = '#ef4444'
const TEXT2       = '#64748b'
const MUTED       = '#1d1d4a'

const CATEGORIES = [
  'Sales Psychology',
  'Human Behavior',
  'Theology',
  'Business Frameworks',
  'Fitness Science',
  'Relationships',
  'Door-to-Door',
  'Reading People',
  'Other',
]

const CAT_COLOR = {
  'Sales Psychology':    BLUE,
  'Fitness Science':     GOLD,
  'Human Behavior':      PURPLE,
  'Business Frameworks': GREEN,
}
const catColor = cat => CAT_COLOR[cat] || TEXT2

// ─── Shared style helpers ─────────────────────────────────────────────────────
const labelStyle = {
  display: 'block',
  fontFamily: 'Inter, sans-serif',
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: '0.3em',
  textTransform: 'uppercase',
  color: TEXT2,
  marginBottom: 6,
}

const inputStyle = {
  width: '100%',
  background: BG,
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: 6,
  padding: '8px 12px',
  fontFamily: 'Inter, sans-serif',
  fontSize: 13,
  color: 'white',
  outline: 'none',
  boxSizing: 'border-box',
}

// ─── AI helpers ───────────────────────────────────────────────────────────────
async function formatWithAI(rawNotes, source) {
  const apiKey = localStorage.getItem('anthropic_key') || import.meta.env.VITE_ANTHROPIC_API_KEY || ''
  if (!apiKey) throw new Error('No API key set')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey, 'anthropic-version': '2023-06-01',
      'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001', max_tokens: 600,
      messages: [{ role: 'user', content: `You are a knowledge management system. Format these raw notes into a clean knowledge card.\n\nSource: "${source}"\nRaw notes: "${rawNotes}"\n\nReturn ONLY valid JSON:\n{\n  "title": "Concise title (max 8 words)",\n  "keyPrinciple": "The single most important insight in one sentence",\n  "bullets": ["Insight 1", "Insight 2", "Insight 3", "Insight 4"],\n  "tags": ["tag1", "tag2", "tag3"],\n  "category": "one of: Sales Psychology|Human Behavior|Theology|Business Frameworks|Fitness Science|Relationships|Door-to-Door|Reading People|Other"\n}` }]
    })
  })
  const data = await res.json()
  const text = data.content[0].text.trim()
  return JSON.parse(text.startsWith('{') ? text : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Arsenal() {
  // Same localStorage key as Mind.jsx — preserves all existing cards
  const [entries, setEntries] = useLocalStorage('marko_mind', [])

  // Sidebar / filter state
  const [activeCat, setActiveCat]   = useState('All')
  const [search, setSearch]         = useState('')

  // Modal / form state
  const [showModal, setShowModal]   = useState(false)
  const [modalTab, setModalTab]     = useState('MANUAL') // 'MANUAL' | 'AI'
  const [form, setForm]             = useState({
    title: '', summary: '', source: '',
    date: new Date().toISOString().split('T')[0],
    category: CATEGORIES[0], keyPrinciple: '', note: '',
  })

  // AI Format state
  const [rawNotes, setRawNotes]     = useState('')
  const [rawSource, setRawSource]   = useState('')
  const [aiLoading, setAiLoading]   = useState(false)
  const [aiError, setAiError]       = useState('')

  // Context search state
  const [contextQuery, setContextQuery]       = useState('')
  const [contextResult, setContextResult]     = useState(null)
  const [contextSearching, setContextSearching] = useState(false)
  const [contextError, setContextError]       = useState('')

  // ── Derived values ──────────────────────────────────────────────────────────
  const thisMonth  = new Date().toISOString().slice(0, 7)
  const monthCount = entries.filter(e => e.date?.startsWith(thisMonth)).length
  const total      = entries.length

  const counts = CATEGORIES.reduce((acc, c) => {
    acc[c] = entries.filter(e => e.category === c).length
    return acc
  }, {})

  const filtered = entries.filter(e => {
    const matchCat    = activeCat === 'All' || e.category === activeCat
    const q           = search.toLowerCase()
    const matchSearch = !q ||
      e.title?.toLowerCase().includes(q) ||
      e.summary?.toLowerCase().includes(q) ||
      e.keyPrinciple?.toLowerCase().includes(q) ||
      e.tags?.some(t => t.toLowerCase().includes(q))
    return matchCat && matchSearch
  })

  // ── Context search ──────────────────────────────────────────────────────────
  const handleContextSearch = async () => {
    if (!contextQuery.trim() || entries.length === 0) return
    setContextSearching(true)
    setContextError('')
    setContextResult(null)
    const apiKey = localStorage.getItem('anthropic_key') || import.meta.env.VITE_ANTHROPIC_API_KEY || ''
    if (!apiKey) { setContextError('No API key set'); setContextSearching(false); return }
    try {
      const entryList = entries.slice(0, 30).map((e, i) =>
        `[${i}] "${e.title}" (${e.category}): ${e.keyPrinciple || e.summary || ''}. ${(e.bullets || []).join('. ')}`
      ).join('\n')
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey, 'anthropic-version': '2023-06-01',
          'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001', max_tokens: 100,
          messages: [{ role: 'user', content: `I'm struggling with: "${contextQuery}"\n\nWhich of these knowledge cards is most relevant?\n\n${entryList}\n\nReturn ONLY the index number of the most relevant card (e.g. just "3"). No other text.` }]
        })
      })
      const data  = await res.json()
      const idx   = parseInt(data.content[0].text.trim())
      if (!isNaN(idx) && entries[idx]) setContextResult(entries[idx])
      else setContextError('No relevant card found')
    } catch (err) {
      setContextError(err.message || 'Search failed')
    } finally {
      setContextSearching(false)
    }
  }

  // ── AI format handler ───────────────────────────────────────────────────────
  const handleAIFormat = async () => {
    if (!rawNotes.trim()) return
    setAiLoading(true)
    setAiError('')
    try {
      const result = await formatWithAI(rawNotes, rawSource)
      window._pendingBullets = result.bullets || []
      window._pendingTags    = result.tags    || []
      setForm(f => ({
        ...f,
        title:        result.title        || f.title,
        keyPrinciple: result.keyPrinciple || f.keyPrinciple,
        category:     result.category     || f.category,
        summary:      rawNotes,
        source:       rawSource,
      }))
      setModalTab('MANUAL')
    } catch (err) {
      setAiError(err.message || 'AI formatting failed')
    } finally {
      setAiLoading(false)
    }
  }

  // ── Add card ────────────────────────────────────────────────────────────────
  const addEntry = () => {
    if (!form.title.trim()) return
    setEntries([{
      ...form,
      id:      Date.now(),
      bullets: window._pendingBullets || [],
      tags:    window._pendingTags    || [],
    }, ...entries])
    window._pendingBullets = []
    window._pendingTags    = []
    setForm({ title: '', summary: '', source: '', date: new Date().toISOString().split('T')[0], category: CATEGORIES[0], keyPrinciple: '', note: '' })
    setShowModal(false)
    setModalTab('MANUAL')
    setRawNotes('')
    setRawSource('')
    setAiError('')
  }

  const closeModal = () => {
    setShowModal(false)
    setModalTab('MANUAL')
    setRawNotes('')
    setRawSource('')
    setAiError('')
  }

  const del = id => setEntries(entries.filter(e => e.id !== id))

  // ── Formatted date for TopBar ────────────────────────────────────────────────
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: BG, fontFamily: 'Inter, sans-serif' }}>

      {/* ── TopBar ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: SURF,
        borderBottom: `1px solid ${CARD_BORDER}`,
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        position: 'relative',
      }}>
        {/* Left: date + title */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: TEXT2, letterSpacing: '0.3em', textTransform: 'uppercase' }}>{todayLabel}</span>
          <span style={{
            fontFamily: '"Orbitron", "Space Grotesk", sans-serif',
            fontSize: 22, fontWeight: 900, color: 'white',
            textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1,
          }}>ARSENAL</span>
        </div>

        {/* Right: stat pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: `rgba(201,168,76,0.08)`, border: `1px solid rgba(201,168,76,0.25)`, borderRadius: 20 }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: TEXT2, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Cards</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: GOLD }}>{total}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: `rgba(59,130,246,0.08)`, border: `1px solid rgba(59,130,246,0.25)`, borderRadius: 20 }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: TEXT2, textTransform: 'uppercase', letterSpacing: '0.2em' }}>This Month</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: BLUE }}>{monthCount}</span>
          </div>
        </div>

        {/* Add Card button */}
        <button
          onClick={() => setShowModal(true)}
          style={{
            position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px',
            background: 'transparent', border: `1px solid ${GOLD}`,
            borderRadius: 6, color: GOLD,
            fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.15em',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `rgba(201,168,76,0.1)` }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <Plus size={11} strokeWidth={2.5} />
          ADD CARD
        </button>
      </div>

      {/* ── Context search bar ────────────────────────────────────────────── */}
      <div style={{
        background: SURF,
        borderBottom: `1px solid ${CARD_BORDER}`,
        padding: '10px 20px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 8, padding: '0 12px', overflow: 'hidden' }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>🧠</span>
          <input
            value={contextQuery}
            onChange={e => setContextQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleContextSearch()}
            placeholder="Describe a problem to find the most relevant card..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'white',
              padding: '10px 0',
            }}
          />
          <button
            onClick={handleContextSearch}
            disabled={contextSearching}
            style={{
              padding: '5px 14px', background: contextSearching ? MUTED : BLUE,
              color: 'white', border: 'none', borderRadius: 6,
              fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.15em',
              cursor: contextSearching ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s', flexShrink: 0,
            }}
          >
            {contextSearching ? 'Searching...' : 'FIND'}
          </button>
        </div>

        {/* Context result */}
        {(contextResult || contextError) && (
          <div style={{ marginTop: 10 }}>
            {contextError && (
              <p style={{ fontSize: 11, color: RED, margin: 0, padding: '8px 0' }}>{contextError}</p>
            )}
            {contextResult && (
              <div style={{
                background: SURF,
                border: `1px solid rgba(59,130,246,0.35)`,
                borderLeft: `3px solid ${BLUE}`,
                borderRadius: 8,
                padding: 14,
                boxShadow: `0 0 16px rgba(59,130,246,0.12)`,
              }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.25em', marginBottom: 6 }}>
                  MOST RELEVANT — {contextResult.category}
                </div>
                <div style={{ fontFamily: '"Orbitron", "Space Grotesk", sans-serif', fontSize: 17, fontWeight: 700, color: 'white', marginBottom: 6 }}>{contextResult.title}</div>
                {contextResult.keyPrinciple && (
                  <p style={{ fontSize: 12, color: '#d1d5db', margin: '0 0 8px', fontStyle: 'italic' }}>{contextResult.keyPrinciple}</p>
                )}
                {contextResult.bullets?.length > 0 && (
                  <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none' }}>
                    {contextResult.bullets.map((b, i) => (
                      <li key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 12, color: '#d1d5db' }}>
                        <span style={{ color: GOLD, flexShrink: 0 }}>→</span><span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {contextResult.source && (
                  <div style={{ fontSize: 9, color: MUTED, marginTop: 8 }}>{contextResult.source}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Main body: sidebar + grid ──────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{
          width: 200, flexShrink: 0,
          borderRight: `1px solid ${CARD_BORDER}`,
          background: SURF,
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* All */}
          <SidebarItem
            label="All"
            count={total}
            active={activeCat === 'All'}
            onClick={() => setActiveCat('All')}
          />
          {CATEGORIES.map(cat => (
            <SidebarItem
              key={cat}
              label={cat}
              count={counts[cat] || 0}
              active={activeCat === cat}
              onClick={() => setActiveCat(cat)}
            />
          ))}
        </div>

        {/* Card area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Search bar */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${CARD_BORDER}`, flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: TEXT2, pointerEvents: 'none' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search cards..."
                style={{
                  ...inputStyle,
                  paddingLeft: 32, paddingRight: 12,
                  paddingTop: 8, paddingBottom: 8,
                  fontSize: 13, borderRadius: 7,
                }}
                onFocus={e => e.currentTarget.style.borderColor = GOLD}
                onBlur={e => e.currentTarget.style.borderColor = CARD_BORDER}
              />
            </div>
          </div>

          {/* Cards grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {filtered.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: TEXT2, textTransform: 'uppercase', letterSpacing: '0.25em' }}>
                  {search || activeCat !== 'All' ? 'No matching cards' : 'No cards yet — add your first'}
                </span>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 12,
              }}>
                {filtered.map(entry => (
                  <KnowledgeCard key={entry.id} entry={entry} onDelete={del} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Card Modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <Modal title="New Knowledge Card" onClose={closeModal}>
          {/* Tab toggle */}
          <div style={{
            display: 'flex', gap: 2, marginBottom: 18,
            background: BG, borderRadius: 8, padding: 4,
            border: `1px solid ${CARD_BORDER}`,
          }}>
            {[['MANUAL', 'MANUAL'], ['AI', 'AI FORMAT ✨']].map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => { setModalTab(tab); setAiError('') }}
                style={{
                  flex: 1, padding: '7px 0',
                  background: modalTab === tab ? GOLD : 'transparent',
                  color: modalTab === tab ? '#000' : TEXT2,
                  fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  border: 'none', borderRadius: 6, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >{label}</button>
            ))}
          </div>

          {modalTab === 'AI' ? (
            /* AI Format tab */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Raw Notes / Takeaways</label>
                <textarea
                  value={rawNotes}
                  onChange={e => setRawNotes(e.target.value)}
                  rows={6}
                  placeholder="Paste your raw notes, takeaways, or summary from any video, book, or podcast..."
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                />
              </div>
              <div>
                <label style={labelStyle}>Source</label>
                <input
                  value={rawSource}
                  onChange={e => setRawSource(e.target.value)}
                  placeholder="Book title, video name, podcast episode..."
                  style={inputStyle}
                />
              </div>
              {aiError && (
                <p style={{ fontSize: 11, color: RED, margin: 0 }}>{aiError}</p>
              )}
              <button
                onClick={handleAIFormat}
                disabled={aiLoading || !rawNotes.trim()}
                style={{
                  width: '100%', padding: 11,
                  background: aiLoading || !rawNotes.trim() ? MUTED : GOLD,
                  color: aiLoading || !rawNotes.trim() ? TEXT2 : '#000',
                  fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.15em',
                  border: 'none', borderRadius: 8,
                  cursor: aiLoading || !rawNotes.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {aiLoading ? 'Formatting...' : '✨ Format with AI'}
              </button>
            </div>
          ) : (
            /* Manual tab */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Title</label>
                <input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  autoFocus
                  placeholder="Principle or concept..."
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Key Principle</label>
                <input
                  value={form.keyPrinciple}
                  onChange={e => setForm({ ...form, keyPrinciple: e.target.value })}
                  placeholder="The single most important insight..."
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Summary</label>
                <textarea
                  value={form.summary}
                  onChange={e => setForm({ ...form, summary: e.target.value })}
                  rows={3}
                  placeholder="What does this mean and why does it matter?"
                  style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
                />
              </div>
              <div>
                <label style={labelStyle}>Personal Note</label>
                <textarea
                  value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                  rows={2}
                  placeholder="Your take on this..."
                  style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Source</label>
                  <input
                    value={form.source}
                    onChange={e => setForm({ ...form, source: e.target.value })}
                    placeholder="Book, person, podcast..."
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button
                  onClick={addEntry}
                  disabled={!form.title.trim()}
                  style={{
                    flex: 1, padding: '10px 0',
                    background: form.title.trim() ? GOLD : MUTED,
                    color: form.title.trim() ? '#000' : TEXT2,
                    fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.15em',
                    border: 'none', borderRadius: 8,
                    cursor: form.title.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s',
                  }}
                >Save Card</button>
                <button
                  onClick={closeModal}
                  style={{
                    padding: '10px 16px',
                    background: 'transparent', color: TEXT2,
                    fontFamily: 'Inter, sans-serif', fontSize: 10,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    border: `1px solid ${CARD_BORDER}`, borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >Cancel</button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

// ─── Sidebar item ─────────────────────────────────────────────────────────────
function SidebarItem({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 16px', textAlign: 'left',
        borderBottom: `1px solid ${CARD_BORDER}`,
        borderLeft: active ? `2px solid ${GOLD}` : '2px solid transparent',
        background: active ? `rgba(201,168,76,0.06)` : 'transparent',
        cursor: 'pointer', transition: 'all 0.15s',
        outline: 'none',
      }}
    >
      <span style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: 10, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1.3,
        color: active ? 'white' : TEXT2,
        transition: 'color 0.15s',
      }}>{label}</span>
      {count > 0 && (
        <span style={{
          fontFamily: 'Inter, sans-serif', fontSize: 9,
          color: active ? GOLD : TEXT2,
          background: active ? `rgba(201,168,76,0.1)` : `rgba(74,90,122,0.15)`,
          border: `1px solid ${active ? 'rgba(201,168,76,0.25)' : 'transparent'}`,
          borderRadius: 10, padding: '1px 7px',
          flexShrink: 0, marginLeft: 4, transition: 'all 0.15s',
        }}>{count}</span>
      )}
    </button>
  )
}

// ─── Knowledge Card ───────────────────────────────────────────────────────────
function KnowledgeCard({ entry, onDelete }) {
  const color = catColor(entry.category)

  return (
    <div
      style={{
        background: SURF,
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: 10,
        padding: 14,
        display: 'flex', flexDirection: 'column', gap: 0,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        position: 'relative',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = CARD_BORDER
      }}
    >
      {/* Top row: category pill + date + delete */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 8, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.12em',
            color: color,
            background: `${color}14`,
            border: `1px solid ${color}40`,
            borderRadius: 10, padding: '2px 7px',
          }}>{entry.category}</span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 8, color: TEXT2 }}>
            {fmtShort(entry.date)}
          </span>
        </div>
        <button
          onClick={() => onDelete(entry.id)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: MUTED, padding: 2, lineHeight: 1,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = RED}
          onMouseLeave={e => e.currentTarget.style.color = MUTED}
        >
          <X size={12} />
        </button>
      </div>

      {/* Title */}
      <div style={{
        fontFamily: '"Orbitron", "Space Grotesk", sans-serif',
        fontSize: 16, fontWeight: 700,
        color: 'white', lineHeight: 1.2, marginBottom: 6,
      }}>{entry.title}</div>

      {/* Key Principle */}
      {entry.keyPrinciple && (
        <div style={{
          borderLeft: `2px solid ${GOLD}`,
          paddingLeft: 8, marginTop: 2, marginBottom: 8,
          fontStyle: 'italic', fontSize: 11, color: TEXT2, lineHeight: 1.5,
        }}>{entry.keyPrinciple}</div>
      )}

      {/* Bullets */}
      {entry.bullets?.length > 0 && (
        <ul style={{ margin: '4px 0 8px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {entry.bullets.slice(0, 4).map((b, i) => (
            <li key={i} style={{ display: 'flex', gap: 8, fontSize: 10, color: TEXT2, lineHeight: 1.5 }}>
              <span style={{ color: GOLD, flexShrink: 0 }}>→</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Summary (if no bullets) */}
      {!entry.bullets?.length && entry.summary && (
        <p style={{ fontSize: 11, color: TEXT2, lineHeight: 1.6, margin: '0 0 8px' }}>{entry.summary}</p>
      )}

      {/* Note */}
      {entry.note && (
        <p style={{
          fontSize: 11, color: TEXT2, lineHeight: 1.5,
          fontStyle: 'italic',
          borderLeft: `2px solid rgba(201,168,76,0.2)`,
          paddingLeft: 8, margin: '0 0 8px',
        }}>{entry.note}</p>
      )}

      {/* Tags */}
      {entry.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 'auto', paddingTop: 6 }}>
          {entry.tags.map(tag => (
            <span key={tag} style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 8, fontWeight: 600,
              color: MUTED,
              background: `rgba(42,58,90,0.35)`,
              border: `1px solid rgba(42,58,90,0.6)`,
              borderRadius: 8, padding: '2px 6px',
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>{tag}</span>
          ))}
        </div>
      )}

      {/* Source */}
      {entry.source && (
        <div style={{ fontSize: 8, color: MUTED, marginTop: 8, fontFamily: 'Inter, sans-serif' }}>
          {entry.source}
        </div>
      )}
    </div>
  )
}
