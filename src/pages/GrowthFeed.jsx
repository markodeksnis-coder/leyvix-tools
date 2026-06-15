import { useState } from 'react'
import { Plus, ChevronDown, ChevronUp, Play, Zap, Key } from 'lucide-react'
import Modal from '../components/Modal'
import { today, fmtShort } from '../utils'
import feedData from '../data/growthFeedData.json'

const PILLAR_COLORS = {
  Mindset: '#8b5cf6',
  Business: '#f59e0b',
  'Social Skills': '#3b82f6',
  Style: '#ec4899',
  Health: '#16a34a',
}

const PILLARS = ['Mindset', 'Business', 'Social Skills', 'Style', 'Health']
const FILTER_LABELS = ['ALL', 'MINDSET', 'BUSINESS', 'SOCIAL SKILLS', 'STYLE', 'HEALTH']

const INITIAL_VIDEOS = feedData.map(v => ({
  ...v,
  date_added: v.date_added || today(),
  user_rating: null,
  watched: false,
}))

function extractVideoId(url) {
  const patterns = [/[?&]v=([^&\s]+)/, /youtu\.be\/([^?&\s]+)/, /embed\/([^?&\s]+)/]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return url.trim()
}

const SubHeader = ({ children }) => (
  <div className="font-display text-white" style={{ fontSize: 20, borderLeft: '2px solid #dc2626', paddingLeft: 12 }}>
    {children}
  </div>
)

const cls = {
  input: "w-full bg-[#080808] border border-[#2a2a2a] px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#dc2626] transition-colors",
  label: "block text-[9px] font-mono uppercase tracking-widest text-[#444] mb-1.5",
}

function VideoCard({ video, onWatch, onRate, ratingOpen }) {
  const color = PILLAR_COLORS[video.pillar] || '#6b7280'

  return (
    <div
      style={{ background: '#111111', border: '1px solid #222222', borderRadius: 4 }}
      className="flex flex-col overflow-hidden transition-all hover:shadow-[0_0_12px_rgba(220,38,38,0.15)]"
    >
      {/* Thumbnail — 16:9 */}
      <div className="relative group/thumb overflow-hidden" style={{ paddingTop: '56.25%' }}>
        <img
          src={`https://img.youtube.com/vi/${video.video_id}/maxresdefault.jpg`}
          alt={video.title}
          className="absolute inset-0 w-full h-full object-cover transition-all duration-200 group-hover/thumb:brightness-110"
          onError={e => { e.target.src = `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg` }}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity bg-black/30">
          <div style={{ background: '#dc2626', borderRadius: '50%', padding: 12 }}>
            <Play size={20} fill="white" color="white" />
          </div>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Pillar badge */}
        <div>
          <span style={{ background: color, fontFamily: 'Inter', fontSize: 10, fontWeight: 700, color: 'white', padding: '2px 8px', borderRadius: 9999 }}>
            {video.pillar}
          </span>
        </div>

        {/* Title + date */}
        <div className="flex items-start justify-between gap-2">
          <div
            className="line-clamp-2"
            style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 700, color: 'white' }}
          >
            {video.title}
          </div>
          <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#444', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {fmtShort(video.date_added)}
          </div>
        </div>

        {/* Channel */}
        <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#666' }}>{video.channel}</div>

        {/* Action area */}
        <div className="mt-auto pt-1 flex flex-col gap-2">
          {video.watched ? (
            <div style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: '#facc15' }}>
              ✓ WATCHED — {video.user_rating}/10
            </div>
          ) : ratingOpen ? (
            <div>
              <div style={{ fontFamily: 'Inter', fontSize: 10, color: '#555', marginBottom: 6 }}>Rate it:</div>
              <div className="flex gap-1 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => onRate(video.id, n)}
                    style={{ width: 26, height: 26, border: '1px solid #333', fontFamily: 'Inter', fontSize: 11, color: '#666' }}
                    className="flex items-center justify-center hover:border-[#dc2626] hover:text-[#dc2626] hover:bg-[#dc2626]/10 transition-colors"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => onWatch(video.id, true)}
                style={{ background: '#dc2626', fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: 'white' }}
                className="w-full py-2 hover:opacity-90 transition-opacity"
              >
                ▶ WATCH
              </button>
              <button
                onClick={() => onWatch(video.id, false)}
                style={{ border: '1px solid #2a2a2a', fontFamily: 'Inter', fontSize: 11, color: '#444' }}
                className="w-full py-1.5 hover:border-[#555] hover:text-[#888] transition-colors"
              >
                Rate It
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

async function fetchVideoDrop() {
  const apiKey = localStorage.getItem('anthropic_key') || import.meta.env.VITE_ANTHROPIC_API_KEY || ''
  if (!apiKey) throw new Error('No API key — add your key in the Coach section settings')
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
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a growth content curator. Recommend 3 specific, real YouTube videos for a high-performance self-improvement platform covering pillars: Mindset, Business, Social Skills, Style, Health.

Choose well-known creators (Alex Hormozi, Andrew Huberman, Charlie Morgan, Ryan Holiday, GQ, RSD, etc). Pick 3 different pillars.

Return ONLY a valid JSON array with exactly 3 objects, each with:
- title: exact video title
- channel: creator/channel name
- youtube_url: https://www.youtube.com/watch?v=VIDEO_ID
- video_id: the YouTube video ID only
- pillar: one of "Mindset", "Business", "Social Skills", "Style", "Health"

Return only the JSON array. No other text.`,
      }],
    }),
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody?.error?.message || `API ${res.status}`)
  }
  const data = await res.json()
  const text = data.content[0].text.trim()
  const jsonStr = text.startsWith('[') ? text : text.slice(text.indexOf('['), text.lastIndexOf(']') + 1)
  return JSON.parse(jsonStr)
}

export default function GrowthFeed() {
  const [videos, setVideos] = useState(INITIAL_VIDEOS)
  const [filter, setFilter] = useState('ALL')
  const [showWatched, setShowWatched] = useState(false)
  const [ratingOpen, setRatingOpen] = useState(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ youtube_url: '', title: '', channel: '', pillar: 'Mindset' })
  const [dropping, setDropping] = useState(false)
  const [dropError, setDropError] = useState('')
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [keyInput, setKeyInput] = useState('')

  const handleWatch = (id, openTab) => {
    if (openTab) {
      const v = videos.find(v => v.id === id)
      if (v) window.open(v.youtube_url, '_blank', 'noopener,noreferrer')
    }
    setRatingOpen(prev => { const s = new Set(prev); s.add(id); return s })
  }

  const handleRate = (id, rating) => {
    setVideos(vs => vs.map(v => v.id !== id ? v : { ...v, user_rating: rating, watched: true }))
    setRatingOpen(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  const handleAddVideo = () => {
    const { youtube_url, title, channel, pillar } = addForm
    if (!title.trim() || !youtube_url.trim()) return
    const video_id = extractVideoId(youtube_url.trim())
    const fullUrl = youtube_url.includes('http') ? youtube_url.trim() : `https://www.youtube.com/watch?v=${video_id}`
    setVideos(vs => [...vs, {
      id: Date.now().toString(), title: title.trim(), channel: channel.trim(),
      pillar, youtube_url: fullUrl, video_id, date_added: today(), user_rating: null, watched: false,
    }])
    setAddForm({ youtube_url: '', title: '', channel: '', pillar: 'Mindset' })
    setShowAddModal(false)
  }

  const handleSaveKey = () => {
    const k = keyInput.trim()
    if (k) { localStorage.setItem('anthropic_key', k); setDropError('') }
    setShowKeyModal(false)
    setKeyInput('')
  }

  const handleDrop = async () => {
    setDropping(true)
    setDropError('')
    try {
      const newVids = await fetchVideoDrop()
      setVideos(vs => [...vs, ...newVids.map(v => ({
        ...v,
        id: Date.now().toString() + Math.random(),
        date_added: today(),
        user_rating: null,
        watched: false,
      }))])
    } catch (e) {
      setDropError(e.message || 'Drop failed — try again')
    } finally {
      setDropping(false)
    }
  }

  const matchesPillar = v => filter === 'ALL' || v.pillar.toUpperCase() === filter
  const unwatched = videos.filter(v => !v.watched && matchesPillar(v))
  const watched = videos.filter(v => v.watched && matchesPillar(v))

  // Stats
  const totalWatched = videos.filter(v => v.watched).length
  const rated = videos.filter(v => v.user_rating !== null)
  const avgRating = rated.length > 0 ? (rated.reduce((s, v) => s + v.user_rating, 0) / rated.length).toFixed(1) : '—'
  const pillarCounts = videos.filter(v => v.watched).reduce((acc, v) => { acc[v.pillar] = (acc[v.pillar] || 0) + 1; return acc }, {})
  const topPillar = Object.entries(pillarCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
  const now = new Date()
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0)
  const thisWeek = videos.filter(v => new Date(v.date_added + 'T00:00:00') >= weekStart).length

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <div className="px-8 py-5 border-b border-[#2a2a2a] shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-white" style={{ fontSize: 28 }}>GROWTH FEED</h1>
            <p style={{ fontFamily: 'Inter', fontSize: 13, color: '#888', marginTop: 2 }}>Everything you consume. Rated. Tracked. Building you.</p>
          </div>
          <div className="flex items-center gap-2">
            {dropError && <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#dc2626' }}>{dropError}</span>}
            <button
              onClick={handleDrop}
              disabled={dropping}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] uppercase tracking-widest transition-colors disabled:opacity-40"
              style={{ background: dropping ? '#1a1a1a' : '#dc2626', color: 'white', border: '1px solid #dc2626' }}
            >
              <Zap size={9} fill={dropping ? 'none' : 'white'} />
              {dropping ? 'Dropping...' : 'Drop 3 Videos'}
            </button>
            <button
              onClick={() => { setKeyInput(localStorage.getItem('anthropic_key') || ''); setShowKeyModal(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#2a2a2a] text-[#444] text-[9px] uppercase tracking-widest hover:border-[#dc2626] hover:text-white transition-colors"
            >
              <Key size={9} /> API Key
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#2a2a2a] text-[#444] text-[9px] uppercase tracking-widest hover:border-[#dc2626] hover:text-white transition-colors"
            >
              <Plus size={9} /> Add Video
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-6">

        {/* Stats bar */}
        <div className="flex gap-8 flex-wrap pb-5 border-b border-[#1a1a1a]">
          {[
            { label: 'Total Watched', value: totalWatched },
            { label: 'Avg Rating', value: avgRating },
            { label: 'Top Pillar', value: topPillar },
            { label: 'This Week', value: thisWeek },
          ].map(s => (
            <div key={s.label}>
              <div className="font-display text-white" style={{ fontSize: 32, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#666', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_LABELS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={filter === f
                ? { background: '#dc2626', color: 'white', fontFamily: 'Inter', fontSize: 10, fontWeight: 600, padding: '5px 12px' }
                : { border: '1px solid #2a2a2a', color: '#555', fontFamily: 'Inter', fontSize: 10, padding: '5px 12px' }
              }
              className="transition-all hover:border-[#dc2626] hover:text-white"
            >
              {f}
            </button>
          ))}
        </div>

        {/* Current Drop */}
        <section>
          <div className="mb-4">
            <SubHeader>Current Drop</SubHeader>
          </div>
          {unwatched.length === 0 ? (
            <div style={{ background: '#111', fontFamily: 'Inter', fontSize: 12, color: '#333', padding: '32px', textAlign: 'center' }}>
              {filter !== 'ALL' ? `No unwatched videos in ${filter.toLowerCase()}` : 'All caught up — add more videos above'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {unwatched.map(v => (
                <VideoCard key={v.id} video={v} onWatch={handleWatch} onRate={handleRate} ratingOpen={ratingOpen.has(v.id)} />
              ))}
            </div>
          )}
        </section>

        {/* Divider */}
        <div style={{ height: 1, background: '#222' }} />

        {/* Watched */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <SubHeader>Watched ({videos.filter(v => v.watched).length})</SubHeader>
            <button
              onClick={() => setShowWatched(!showWatched)}
              className="flex items-center gap-1 text-[#444] hover:text-[#888] transition-colors"
              style={{ fontFamily: 'Inter', fontSize: 11 }}
            >
              {showWatched ? <><ChevronUp size={13} /> Collapse</> : <><ChevronDown size={13} /> Expand</>}
            </button>
          </div>
          {showWatched && (
            watched.length === 0 ? (
              <div style={{ background: '#111', fontFamily: 'Inter', fontSize: 12, color: '#333', padding: '32px', textAlign: 'center' }}>
                No watched videos{filter !== 'ALL' ? ' in this category' : ''} yet
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" style={{ opacity: 0.6 }}>
                {watched.map(v => (
                  <VideoCard key={v.id} video={v} onWatch={handleWatch} onRate={handleRate} ratingOpen={ratingOpen.has(v.id)} />
                ))}
              </div>
            )
          )}
        </section>

      </div>

      {/* Add Video Modal */}
      {showAddModal && (
        <Modal title="Add Video to Feed" onClose={() => setShowAddModal(false)}>
          <div className="space-y-4">
            <div>
              <label className={cls.label}>YouTube URL</label>
              <input value={addForm.youtube_url} onChange={e => setAddForm({ ...addForm, youtube_url: e.target.value })} autoFocus placeholder="https://www.youtube.com/watch?v=..." className={cls.input} />
            </div>
            <div>
              <label className={cls.label}>Title</label>
              <input value={addForm.title} onChange={e => setAddForm({ ...addForm, title: e.target.value })} placeholder="Video title" className={cls.input} />
            </div>
            <div>
              <label className={cls.label}>Channel</label>
              <input value={addForm.channel} onChange={e => setAddForm({ ...addForm, channel: e.target.value })} placeholder="Creator / channel name" className={cls.input} />
            </div>
            <div>
              <label className={cls.label}>Pillar</label>
              <select value={addForm.pillar} onChange={e => setAddForm({ ...addForm, pillar: e.target.value })} className={cls.input}>
                {PILLARS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleAddVideo} className="flex-1 py-2.5 bg-[#dc2626] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 transition-colors">Add to Feed</button>
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2.5 border border-[#2a2a2a] text-[#444] text-[10px] uppercase tracking-widest hover:border-[#666] transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* API Key Modal */}
      {showKeyModal && (
        <Modal title="Set Anthropic API Key" onClose={() => setShowKeyModal(false)}>
          <div className="space-y-4">
            <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#666' }}>
              Paste your key from <span style={{ color: '#dc2626' }}>console.anthropic.com</span>. Saved to your browser only.
            </p>
            <div>
              <label className={cls.label}>API Key</label>
              <input
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                autoFocus
                placeholder="sk-ant-api03-..."
                className={cls.input}
                type="password"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleSaveKey} className="flex-1 py-2.5 bg-[#dc2626] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 transition-colors">Save Key</button>
              <button onClick={() => setShowKeyModal(false)} className="px-4 py-2.5 border border-[#2a2a2a] text-[#444] text-[10px] uppercase tracking-widest hover:border-[#666] transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
