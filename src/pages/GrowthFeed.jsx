import { useState, useRef } from 'react'
import { Plus, ChevronDown, ChevronUp, Play, Zap, Key, BookOpen, Target } from 'lucide-react'
import Modal from '../components/Modal'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { today, fmtShort } from '../utils'
import feedData from '../data/growthFeedData.json'
import curatedVideos from '../data/curatedVideos.json'

const PILLAR_COLORS = {
  Mindset: '#8b5cf6',
  Business: '#f0c040',
  'Social Skills': '#22d3ee',
  Style: '#e879f9',
  Health: '#1ad9a0',
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

// Returns 'YYYY-MM-DD' for start of current week (Sunday)
function getWeekStart() {
  const now = new Date()
  const d = new Date(now)
  d.setDate(now.getDate() - now.getDay())
  return d.toISOString().slice(0, 10)
}

// Returns all YYYY-MM-DD keys for the current week
function getCurrentWeekDays() {
  const start = new Date(getWeekStart() + 'T00:00:00')
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

function classifyCategory(text) {
  const biz = /business|sales|revenue|marketing|startup|entrepreneur|money|profit|client|lead|conversion|funnel|brand/i
  return biz.test(text) ? 'Business' : 'Other'
}

const cls = {
  input: "w-full bg-[rgba(5,8,20,0.75)] border border-[rgba(99,102,241,0.2)] px-3 py-2 text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#8b5cf6] transition-colors rounded-md",
  label: "block text-[9px] font-mono uppercase tracking-widest text-[#4a5a7a] mb-1.5",
}

function VideoCard({ video, onWatch, onRate, ratingOpen }) {
  const color = PILLAR_COLORS[video.pillar] || '#7a95c0'

  return (
    <div
      style={{ background: 'linear-gradient(135deg, #080e1a 0%, #090920 100%)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 12, boxShadow: '0 0 0 1px rgba(139,92,246,0.05)' }}
      className="flex flex-col overflow-hidden transition-all"
    >
      {/* Thumbnail — 16:9 */}
      <div className="relative group/thumb overflow-hidden" style={{ paddingTop: '56.25%', borderBottom: '1px solid rgba(99,102,241,0.18)' }}>
        <img
          src={`https://img.youtube.com/vi/${video.video_id}/maxresdefault.jpg`}
          alt={video.title}
          className="absolute inset-0 w-full h-full object-cover transition-all duration-200 group-hover/thumb:brightness-110"
          onError={e => { e.target.src = `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg` }}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity bg-black/30">
          <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', borderRadius: '50%', padding: 12, boxShadow: '0 0 20px rgba(139,92,246,0.5)' }}>
            <Play size={20} fill="white" color="white" />
          </div>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Pillar badge */}
        <div>
          <span style={{ background: `${color}1a`, border: `1px solid ${color}33`, fontFamily: 'Inter', fontSize: 10, fontWeight: 700, color: color, padding: '2px 8px', borderRadius: 9999 }}>
            {video.pillar}
          </span>
        </div>

        {/* Title + date */}
        <div className="flex items-start justify-between gap-2">
          <div
            className="line-clamp-2"
            style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: 'white' }}
          >
            {video.title}
          </div>
          <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#7a95c0', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {fmtShort(video.date_added)}
          </div>
        </div>

        {/* Channel */}
        <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#7a95c0' }}>{video.channel}</div>

        {/* Why recommended pill */}
        {video.whyRecommended && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 9999, alignSelf: 'flex-start' }}>
            <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#8b5cf6', letterSpacing: '0.02em' }}>
              {video.whyRecommended}
            </span>
          </div>
        )}

        {/* Action area */}
        <div className="mt-auto pt-1 flex flex-col gap-2">
          {video.watched ? (
            <div style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: '#1ad9a0', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', padding: '4px 8px', borderRadius: 4 }}>
              ✓ WATCHED — {video.user_rating}/10
            </div>
          ) : ratingOpen ? (
            <div>
              <div style={{ fontFamily: 'Inter', fontSize: 10, color: '#7a95c0', marginBottom: 6 }}>Rate it:</div>
              <div className="flex gap-1 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => onRate(video.id, n)}
                    style={{ width: 26, height: 26, border: '1px solid rgba(99,102,241,0.18)', fontFamily: 'Inter', fontSize: 11, color: '#7a95c0', background: 'transparent', cursor: 'pointer' }}
                    className="flex items-center justify-center transition-colors"
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.color = '#8b5cf6'; e.currentTarget.style.background = 'rgba(139,92,246,0.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.18)'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent' }}
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
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: 'white', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: 6, boxShadow: '0 0 12px rgba(139,92,246,0.4)' }}
                className="w-full hover:opacity-90 transition-opacity"
              >
                ▶ WATCH
              </button>
              <button
                onClick={() => onWatch(video.id, false)}
                style={{ border: '1px solid rgba(99,102,241,0.18)', fontFamily: 'Inter', fontSize: 11, color: '#7a95c0', background: 'transparent', cursor: 'pointer', padding: '6px', borderRadius: 6 }}
                className="w-full transition-colors"
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.color = '#8b5cf6' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.18)'; e.currentTarget.style.color = '#64748b' }}
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

async function extractVideoMeta(url, title, channel) {
  const apiKey = localStorage.getItem('anthropic_key') || import.meta.env.VITE_ANTHROPIC_API_KEY || ''
  if (!apiKey) throw new Error('No API key set')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001', max_tokens: 200,
      messages: [{ role: 'user', content: `Based on this YouTube video info, extract the topic and tags.
Title: "${title}"
Channel: "${channel}"
URL: "${url}"

Return ONLY valid JSON:
{"topic": "main topic in 1-3 words", "tags": ["tag1", "tag2", "tag3"]}` }]
    })
  })
  const data = await res.json()
  const text = data.content[0].text.trim()
  return JSON.parse(text.startsWith('{') ? text : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
}

async function fetchVideoDrop(existingIds = [], tasteProfile = {}) {
  const apiKey = localStorage.getItem('anthropic_key') || import.meta.env.VITE_ANTHROPIC_API_KEY || ''
  if (!apiKey) throw new Error('No API key — click the API Key button and paste your key')
  const available = curatedVideos.filter(v => !existingIds.includes(v.id))
  const topChannels = Object.entries(tasteProfile.channelAffinities || {}).sort((a,b) => b[1]-a[1]).slice(0,5).map(([k]) => k)
  const topTopics = Object.entries(tasteProfile.topicAffinities || {}).sort((a,b) => b[1]-a[1]).slice(0,8).map(([k]) => k)
  const hasTaste = topChannels.length > 0 || topTopics.length > 0
  const tasteContext = hasTaste
    ? `\n\nUser's taste profile — channels they like: ${topChannels.join(', ') || 'none yet'}. Topics they follow: ${topTopics.join(', ') || 'none yet'}. Prefer videos that match these patterns.`
    : ''
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
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `You are a growth content curator. Pick exactly 3 videos from this list that cover 3 different pillars. Vary the selection.${tasteContext}

Available videos:
${available.map(v => `id:${v.id} | ${v.pillar} | "${v.title}" by ${v.channel}`).join('\n')}

Return ONLY a JSON array of exactly 3 objects with id and reason, like:
[{"id":"c1","reason":"Matches your interest in sales psychology"},{"id":"c7","reason":"Similar to channels you follow"},{"id":"c14","reason":"Aligns with your mindset content"}]
No other text.`,
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
  const items = JSON.parse(jsonStr)
  return items.map(item => {
    const vid = curatedVideos.find(v => v.id === item.id)
    if (!vid) return null
    return { ...vid, whyRecommended: item.reason || '' }
  }).filter(Boolean)
}

function updateTasteAffinities(profile, title, channel, topic, tags) {
  const channelAff = { ...profile.channelAffinities }
  const topicAff = { ...profile.topicAffinities }
  if (channel) channelAff[channel] = (channelAff[channel] || 0) + 1
  if (topic) topicAff[topic] = (topicAff[topic] || 0) + 1
  tags.forEach(t => { topicAff[t] = (topicAff[t] || 0) + 0.5 })
  return { ...profile, channelAffinities: channelAff, topicAffinities: topicAff }
}

// ── Weekly Learning Goal Tracker ──────────────────────────────────────────────
const LEARNING_GOAL_DEFAULT = { weeklyGoalHours: 5, logs: {} }

function WeeklyGoalTracker({ goal, setGoal }) {
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')
  const [showLogModal, setShowLogModal] = useState(false)
  const [logMinutes, setLogMinutes] = useState('')

  const weekDays = getCurrentWeekDays()
  const weekMinutes = weekDays.reduce((sum, day) => sum + ((goal.logs || {})[day] || 0), 0)
  const weekHours = weekMinutes / 60
  const goalHours = goal.weeklyGoalHours || 5
  const progressPct = Math.min(100, (weekHours / goalHours) * 100)
  const remainingHours = Math.max(0, goalHours - weekHours)

  const handleSaveGoal = () => {
    const val = parseFloat(goalInput)
    if (!isNaN(val) && val > 0) {
      setGoal(g => ({ ...g, weeklyGoalHours: val }))
    }
    setEditingGoal(false)
    setGoalInput('')
  }

  const handleLogSession = () => {
    const mins = parseInt(logMinutes, 10)
    if (!isNaN(mins) && mins > 0) {
      const todayKey = today()
      setGoal(g => ({
        ...g,
        logs: { ...(g.logs || {}), [todayKey]: ((g.logs || {})[todayKey] || 0) + mins }
      }))
    }
    setShowLogModal(false)
    setLogMinutes('')
  }

  return (
    <>
      <div style={{ background: 'linear-gradient(135deg, #080e1a 0%, #090920 100%)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 10, padding: 16, boxShadow: '0 0 0 1px rgba(139,92,246,0.05)' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={12} color="#1ad9a0" />
            <span style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#7a95c0', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
              WEEKLY LEARNING GOAL
            </span>
          </div>
          {editingGoal ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                placeholder="hours"
                autoFocus
                style={{ width: 60, background: 'transparent', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 4, padding: '3px 8px', fontFamily: 'Inter', fontSize: 12, color: 'white', outline: 'none' }}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveGoal(); if (e.key === 'Escape') { setEditingGoal(false); setGoalInput('') } }}
              />
              <button onClick={handleSaveGoal} style={{ padding: '3px 10px', background: '#1ad9a0', color: '#000', border: 'none', borderRadius: 4, fontFamily: 'Inter', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Save</button>
              <button onClick={() => { setEditingGoal(false); setGoalInput('') }} style={{ padding: '3px 8px', background: 'transparent', color: '#7a95c0', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 4, fontFamily: 'Inter', fontSize: 10, cursor: 'pointer' }}>Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => { setEditingGoal(true); setGoalInput(String(goalHours)) }}
              style={{ padding: '3px 10px', background: 'transparent', color: '#7a95c0', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 4, fontFamily: 'Inter', fontSize: 9, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              Set Goal
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: '#1e3050', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: '#1ad9a0', borderRadius: 2, transition: 'width 0.4s ease' }} />
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'Inter', fontSize: 12, color: 'white' }}>
            <span style={{ color: '#1ad9a0', fontWeight: 700 }}>{weekHours.toFixed(1)}h</span>
            <span style={{ color: '#7a95c0' }}> / {goalHours}h this week</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {remainingHours > 0 && (
              <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#7a95c0' }}>
                {remainingHours.toFixed(1)}h remaining
              </span>
            )}
            {remainingHours === 0 && (
              <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#1ad9a0', fontWeight: 700 }}>Goal reached!</span>
            )}
            <button
              onClick={() => setShowLogModal(true)}
              style={{ padding: '4px 12px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff', border: 'none', borderRadius: 4, fontFamily: 'Inter', fontSize: 9, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', boxShadow: '0 0 12px rgba(139,92,246,0.4)' }}
            >
              Log Watch Session
            </button>
          </div>
        </div>
      </div>

      {/* Log Session Modal */}
      {showLogModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(3,5,8,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'linear-gradient(135deg, #080e1a 0%, #090920 100%)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 12, padding: 24, minWidth: 300, maxWidth: 360, boxShadow: '0 0 0 1px rgba(139,92,246,0.05)' }}>
            <div style={{ fontFamily: '"Orbitron", "Space Grotesk", sans-serif', fontSize: 16, fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
              Log Watch Session
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#7a95c0', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 6 }}>
                Duration (minutes)
              </label>
              <input
                value={logMinutes}
                onChange={e => setLogMinutes(e.target.value)}
                type="number"
                min="1"
                placeholder="e.g. 30"
                autoFocus
                style={{ width: '100%', background: 'transparent', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 6, padding: '8px 12px', fontFamily: 'Inter', fontSize: 14, color: 'white', outline: 'none', boxSizing: 'border-box' }}
                onKeyDown={e => { if (e.key === 'Enter') handleLogSession() }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleLogSession} style={{ flex: 1, padding: '9px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff', border: 'none', borderRadius: 6, fontFamily: 'Inter', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', boxShadow: '0 0 12px rgba(139,92,246,0.4)' }}>
                Log Session
              </button>
              <button onClick={() => { setShowLogModal(false); setLogMinutes('') }} style={{ padding: '9px 16px', background: 'transparent', border: '1px solid rgba(99,102,241,0.18)', color: '#7a95c0', borderRadius: 6, fontFamily: 'Inter', fontSize: 10, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── What I Learned Today ───────────────────────────────────────────────────────
function LearnLogPanel({ onSave }) {
  const [open, setOpen] = useState(false)
  const [takeaway, setTakeaway] = useState('')
  const [source, setSource] = useState('')

  const handleSave = () => {
    if (!takeaway.trim()) return
    const words = takeaway.trim().split(/\s+/).slice(0, 8).join(' ')
    const title = words || 'Growth Feed Note'
    const category = classifyCategory(takeaway + ' ' + source)
    onSave({
      id: Date.now(),
      title,
      summary: takeaway.trim(),
      source: source.trim(),
      date: today(),
      category,
      keyPrinciple: '',
      bullets: [],
      tags: ['Growth Feed'],
    })
    setTakeaway('')
    setSource('')
    setOpen(false)
  }

  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'transparent', border: '1px solid rgba(139,92,246,0.35)', borderRadius: 8, cursor: 'pointer', color: '#8b5cf6', fontFamily: '"Orbitron", "Space Grotesk", sans-serif', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.08)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <BookOpen size={13} color="#8b5cf6" />
        What did I learn?
      </button>

      {open && (
        <div style={{ marginTop: 10, background: 'linear-gradient(135deg, #080e1a 0%, #090920 100%)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 10, padding: 16 }}>
          <div style={{ fontFamily: 'Inter', fontSize: 9, fontWeight: 600, color: '#7a95c0', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 10 }}>
            Quick Learning Log
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea
              value={takeaway}
              onChange={e => setTakeaway(e.target.value)}
              placeholder="Main takeaway from what you just watched/read..."
              rows={3}
              style={{ width: '100%', background: 'transparent', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 6, padding: '8px 12px', fontFamily: 'Inter', fontSize: 13, color: 'white', outline: 'none', resize: 'vertical', boxSizing: 'border-box', placeholder: '#7a95c0' }}
            />
            <input
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="Source (video title, book, etc.)"
              style={{ width: '100%', background: 'transparent', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 6, padding: '8px 12px', fontFamily: 'Inter', fontSize: 13, color: 'white', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleSave}
                disabled={!takeaway.trim()}
                style={{ padding: '8px 18px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white', border: 'none', borderRadius: 6, fontFamily: 'Inter', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: takeaway.trim() ? 'pointer' : 'not-allowed', opacity: takeaway.trim() ? 1 : 0.5, boxShadow: '0 0 12px rgba(139,92,246,0.4)' }}
              >
                Save to Arsenal
              </button>
              <button
                onClick={() => { setOpen(false); setTakeaway(''); setSource('') }}
                style={{ padding: '8px 14px', background: 'transparent', border: '1px solid rgba(99,102,241,0.18)', color: '#7a95c0', borderRadius: 6, fontFamily: 'Inter', fontSize: 10, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function GrowthFeed() {
  const [videos, setVideos] = useLocalStorage('marko_growth_feed', INITIAL_VIDEOS)
  const [tasteProfile, setTasteProfile] = useLocalStorage('marko_taste_profile', { seedVideos: [], channelAffinities: {}, topicAffinities: {} })
  const [learningGoal, setLearningGoal] = useLocalStorage('marko_learning_goal', LEARNING_GOAL_DEFAULT)
  const [mindArsenal, setMindArsenal] = useLocalStorage('marko_mind', [])
  const [filter, setFilter] = useState('ALL')
  const [showWatched, setShowWatched] = useState(false)
  const [ratingOpen, setRatingOpen] = useState(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ youtube_url: '', title: '', channel: '', pillar: 'Mindset' })
  const [dropping, setDropping] = useState(false)
  const [dropError, setDropError] = useState('')
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [seedUrl, setSeedUrl] = useState('')
  const [seedTitle, setSeedTitle] = useState('')
  const [seedChannel, setSeedChannel] = useState('')
  const [seedLoading, setSeedLoading] = useState(false)
  const [seedError, setSeedError] = useState('')
  const [showSeedPanel, setShowSeedPanel] = useState(false)

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

  const handleSeedVideo = async () => {
    if (!seedUrl.trim() || !seedTitle.trim()) return
    setSeedLoading(true)
    setSeedError('')
    try {
      const video_id = extractVideoId(seedUrl.trim())
      let topic = '', tags = []
      try {
        const meta = await extractVideoMeta(seedUrl, seedTitle, seedChannel)
        topic = meta.topic || ''
        tags = meta.tags || []
      } catch(_) { /* meta extraction optional */ }
      const seedEntry = {
        id: Date.now().toString(),
        url: seedUrl.trim(),
        video_id,
        title: seedTitle.trim(),
        channel: seedChannel.trim(),
        topic,
        tags,
        addedAt: today()
      }
      setTasteProfile(p => {
        const updated = { ...p, seedVideos: [seedEntry, ...(p.seedVideos || [])] }
        return updateTasteAffinities(updated, seedEntry.title, seedEntry.channel, topic, tags)
      })
      setSeedUrl('')
      setSeedTitle('')
      setSeedChannel('')
    } catch(err) {
      setSeedError(err.message || 'Failed to save seed video')
    } finally { setSeedLoading(false) }
  }

  const handleDrop = async () => {
    setDropping(true)
    setDropError('')
    try {
      const newVids = await fetchVideoDrop(videos.map(v => v.id), tasteProfile)
      setVideos(vs => [...vs, ...newVids.map(v => ({
        ...v,
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

  const handleSaveLearnLog = (entry) => {
    setMindArsenal(arr => [entry, ...(Array.isArray(arr) ? arr : [])])
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

  // TopBar date formatting
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()

  return (
    <div className="h-full flex flex-col" style={{ background: 'transparent' }}>

      {/* ── TopBar ───────────────────────────────────────────────────────────── */}
      <div style={{ background: 'rgba(5,8,20,0.75)', borderBottom: '1px solid rgba(99,102,241,0.18)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#7a95c0' }}>{dateStr}</span>
          <span style={{ color: '#5a7aaa' }}>·</span>
          <span style={{
            fontFamily: '"Orbitron", "Space Grotesk", sans-serif',
            fontSize: 22,
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            lineHeight: 1,
            background: 'linear-gradient(135deg, #f0c040, #f59e0b)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            GROWTH FEED
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Videos watched pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', background: 'rgba(240,192,64,0.1)', border: '1px solid rgba(240,192,64,0.25)', borderRadius: 9999 }}>
            <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: '#f0c040' }}>{totalWatched}</span>
            <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#f0c040', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>watched</span>
          </div>
          {/* Week goal pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 9999 }}>
            <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: '#8b5cf6' }}>
              {(Math.min(getCurrentWeekDays().reduce((s, d) => s + ((learningGoal.logs || {})[d] || 0), 0) / 60, learningGoal.weeklyGoalHours || 5)).toFixed(1)}h
            </span>
            <span style={{ fontFamily: 'Inter', fontSize: 9, color: '#8b5cf6', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>/ {learningGoal.weeklyGoalHours || 5}h goal</span>
          </div>
        </div>
      </div>

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div style={{ background: 'transparent', borderBottom: '1px solid rgba(99,102,241,0.18)', padding: '20px 32px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, color: '#7a95c0', letterSpacing: '0.12em', textTransform: 'uppercase' }}>INTELLIGENCE FEED STREAMING</span>
            </div>
            <h1 style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 64, fontWeight: 400, lineHeight: 0.9, fontStyle: 'italic', letterSpacing: '0.02em', background: 'linear-gradient(135deg, #f0c040, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
              GROWTH FEED
            </h1>
            <p style={{ fontFamily: 'Inter', fontSize: 10, color: '#7a95c0', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>MEDIA INTELLIGENCE // CURATED FOR ELITE OPERATORS</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            {dropError && <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#f0c040' }}>{dropError}</span>}
            <button
              onClick={handleDrop}
              disabled={dropping}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', background: dropping ? '#1e3050' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: dropping ? '#7a95c0' : 'white', border: dropping ? '1px solid rgba(99,102,241,0.18)' : '1px solid #8b5cf6', cursor: dropping ? 'not-allowed' : 'pointer', opacity: dropping ? 0.4 : 1, fontWeight: 700, boxShadow: dropping ? 'none' : '0 0 12px rgba(139,92,246,0.4)' }}
            >
              <Zap size={9} fill={dropping ? 'none' : 'white'} />
              {dropping ? 'Dropping...' : 'Drop 3 Videos'}
            </button>
            <button
              onClick={() => { setKeyInput(localStorage.getItem('anthropic_key') || ''); setShowKeyModal(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid rgba(99,102,241,0.18)', color: '#7a95c0', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', background: 'transparent', cursor: 'pointer' }}
            >
              <Key size={9} /> API Key
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid rgba(99,102,241,0.18)', color: '#7a95c0', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', background: 'transparent', cursor: 'pointer' }}
            >
              <Plus size={9} /> Add Video
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto" style={{ padding: '24px 32px' }}>
        <div className="space-y-6">

          {/* ── Taste Signals Panel ────────────────────────────────────────────── */}
          <div style={{ background: 'linear-gradient(135deg, #080e1a 0%, #090920 100%)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 12, boxShadow: '0 0 0 1px rgba(139,92,246,0.05)' }}>
            <button onClick={() => setShowSeedPanel(!showSeedPanel)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer' }}>
              <span style={{ fontSize: 14 }}>🎯</span>
              <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Taste Signals</span>
              <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#7a95c0', marginLeft: 4 }}>{(tasteProfile.seedVideos || []).length} seed videos saved</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'Inter', fontSize: 9, color: '#7a95c0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {showSeedPanel ? '▲ collapse' : '▼ expand — teach the feed your taste'}
              </span>
            </button>

            {showSeedPanel && (
              <div style={{ padding: '0 20px 20px' }}>
                <p style={{ fontFamily: 'Inter', fontSize: 11, color: '#7a95c0', marginBottom: 16 }}>
                  Paste a YouTube video you liked. The feed learns your taste and recommends similar content.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  <input value={seedUrl} onChange={e => setSeedUrl(e.target.value)} placeholder="YouTube URL (youtube.com/watch?v=...)"
                    style={{ width: '100%', background: 'transparent', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 6, padding: '8px 12px', fontFamily: 'Inter', fontSize: 13, color: 'white', outline: 'none', boxSizing: 'border-box' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input value={seedTitle} onChange={e => setSeedTitle(e.target.value)} placeholder="Video title"
                      style={{ background: 'transparent', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 6, padding: '8px 12px', fontFamily: 'Inter', fontSize: 13, color: 'white', outline: 'none' }} />
                    <input value={seedChannel} onChange={e => setSeedChannel(e.target.value)} placeholder="Channel name"
                      style={{ background: 'transparent', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 6, padding: '8px 12px', fontFamily: 'Inter', fontSize: 13, color: 'white', outline: 'none' }} />
                  </div>
                  {seedError && <p style={{ fontFamily: 'Inter', fontSize: 11, color: '#f43f5e', margin: 0 }}>{seedError}</p>}
                  <button onClick={handleSeedVideo} disabled={seedLoading || !seedUrl.trim() || !seedTitle.trim()}
                    style={{ padding: '9px 20px', background: seedLoading ? '#1e3050' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: seedLoading ? '#7a95c0' : 'white', border: 'none', cursor: seedLoading ? 'not-allowed' : 'pointer', fontFamily: 'Inter', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: 6, boxShadow: seedLoading ? 'none' : '0 0 12px rgba(139,92,246,0.4)' }}>
                    {seedLoading ? 'Saving...' : '+ Add Taste Signal'}
                  </button>
                </div>

                {(tasteProfile.seedVideos || []).length > 0 && (
                  <div>
                    <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#7a95c0', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Saved Taste Signals</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(tasteProfile.seedVideos || []).slice(0, 10).map(sv => (
                        <div key={sv.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'transparent', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 8 }}>
                          <img src={`https://img.youtube.com/vi/${sv.video_id}/default.jpg`} alt="" style={{ width: 40, height: 30, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} onError={e => e.target.style.display='none'} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'Inter', fontSize: 12, color: 'white', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sv.title}</div>
                            <div style={{ fontFamily: 'Inter', fontSize: 10, color: '#7a95c0' }}>{sv.channel}{sv.topic ? ` · ${sv.topic}` : ''}</div>
                          </div>
                          {sv.tags && sv.tags.length > 0 && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              {sv.tags.slice(0, 2).map(tag => (
                                <span key={tag} style={{ fontFamily: 'Inter', fontSize: 9, color: '#8b5cf6', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 4, padding: '2px 6px' }}>{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {Object.keys(tasteProfile.channelAffinities || {}).length > 0 && (
                      <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.12)', borderRadius: 8 }}>
                        <div style={{ fontFamily: 'Inter', fontSize: 9, color: '#7a95c0', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Your Taste Profile</div>
                        <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#d1d5db' }}>
                          Top channels: <span style={{ color: '#8b5cf6' }}>{Object.entries(tasteProfile.channelAffinities || {}).sort((a,b) => b[1]-a[1]).slice(0,3).map(([k]) => k).join(', ') || '—'}</span>
                        </div>
                        <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#d1d5db', marginTop: 3 }}>
                          Top topics: <span style={{ color: '#8b5cf6' }}>{Object.entries(tasteProfile.topicAffinities || {}).sort((a,b) => b[1]-a[1]).slice(0,4).map(([k]) => k).join(', ') || '—'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Weekly Learning Goal Tracker ──────────────────────────────────── */}
          <WeeklyGoalTracker goal={learningGoal} setGoal={setLearningGoal} />

          {/* ── What Did I Learn? ─────────────────────────────────────────────── */}
          <LearnLogPanel onSave={handleSaveLearnLog} />

          {/* ── Stats bar ─────────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', paddingBottom: 20, borderBottom: '1px solid rgba(99,102,241,0.18)' }}>
            {[
              { label: 'Total Watched', value: totalWatched },
              { label: 'Avg Rating', value: avgRating },
              { label: 'Top Pillar', value: topPillar },
              { label: 'This Week', value: thisWeek },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 35, lineHeight: 1, color: '#f0c040' }}>{s.value}</div>
                <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#7a95c0', marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Filter bar ────────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTER_LABELS.map(f => {
              const pillarKey = f === 'ALL' ? null : f.charAt(0) + f.slice(1).toLowerCase().replace(' skills', ' Skills')
              const pillarNorm = f === 'ALL' ? null : Object.keys(PILLAR_COLORS).find(k => k.toUpperCase() === f)
              const activeColor = pillarNorm ? PILLAR_COLORS[pillarNorm] : '#8b5cf6'
              const isActive = filter === f
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={isActive
                    ? { background: `${activeColor}33`, color: activeColor, fontFamily: 'Inter', fontSize: 10, fontWeight: 700, padding: '5px 12px', border: `1px solid ${activeColor}`, cursor: 'pointer', borderRadius: 4 }
                    : { background: 'rgba(5,8,20,0.75)', border: '1px solid rgba(99,102,241,0.18)', color: '#7a95c0', fontFamily: 'Inter', fontSize: 10, padding: '5px 12px', cursor: 'pointer', borderRadius: 4 }
                  }
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = activeColor; e.currentTarget.style.color = '#fff' } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.18)'; e.currentTarget.style.color = '#64748b' } }}
                >
                  {f}
                </button>
              )
            })}
          </div>

          {/* ── Current Drop ──────────────────────────────────────────────────── */}
          <section>
            <div style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 20, color: '#fff', borderLeft: '2px solid #8b5cf6', paddingLeft: 12, marginBottom: 16 }}>
              Current Drop
            </div>
            {unwatched.length === 0 ? (
              <div style={{ background: 'rgba(139,92,246,0.08)', border: '2px dashed rgba(139,92,246,0.2)', fontFamily: 'Inter', fontSize: 12, color: '#7a95c0', padding: '32px', textAlign: 'center', borderRadius: 12 }}>
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
          <div style={{ height: 1, background: '#1e3050' }} />

          {/* ── Watched ───────────────────────────────────────────────────────── */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontFamily: '"Orbitron",sans-serif', fontSize: 20, color: '#fff', borderLeft: '2px solid #8b5cf6', paddingLeft: 12 }}>
                Watched ({videos.filter(v => v.watched).length})
              </div>
              <button
                onClick={() => setShowWatched(!showWatched)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Inter', fontSize: 11, color: '#7a95c0', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {showWatched ? <><ChevronUp size={13} /> Collapse</> : <><ChevronDown size={13} /> Expand</>}
              </button>
            </div>
            {showWatched && (
              watched.length === 0 ? (
                <div style={{ background: 'linear-gradient(135deg, #080e1a 0%, #090920 100%)', border: '1px solid rgba(99,102,241,0.18)', fontFamily: 'Inter', fontSize: 12, color: '#7a95c0', padding: '32px', textAlign: 'center', borderRadius: 12 }}>
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
      </div>

      {/* ── Add Video Modal ───────────────────────────────────────────────────── */}
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
              <button onClick={handleAddVideo} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', border: 'none', cursor: 'pointer', boxShadow: '0 0 12px rgba(139,92,246,0.4)' }}>Add to Feed</button>
              <button onClick={() => setShowAddModal(false)} style={{ padding: '10px 16px', border: '1px solid rgba(99,102,241,0.18)', color: '#7a95c0', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── API Key Modal ─────────────────────────────────────────────────────── */}
      {showKeyModal && (
        <Modal title="Set Anthropic API Key" onClose={() => setShowKeyModal(false)}>
          <div className="space-y-4">
            <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#7a95c0' }}>
              Paste your key from <span style={{ color: '#8b5cf6' }}>console.anthropic.com</span>. Saved to your browser only.
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
              <button onClick={handleSaveKey} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', border: 'none', cursor: 'pointer', boxShadow: '0 0 12px rgba(139,92,246,0.4)' }}>Save Key</button>
              <button onClick={() => setShowKeyModal(false)} style={{ padding: '10px 16px', border: '1px solid rgba(99,102,241,0.18)', color: '#7a95c0', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
