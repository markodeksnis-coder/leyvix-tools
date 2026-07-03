import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Settings from './components/Settings'
import Record from './pages/Record'
import Insights from './pages/Insights'
import Coach from './pages/Coach'
import GrowthFeed from './pages/GrowthFeed'
import LifeCycles from './pages/LifeCycles'
import CheckIn from './pages/CheckIn'
import MorningCheckIn from './pages/MorningCheckIn'
import EveningCheckIn from './pages/EveningCheckIn'
import Goals from './pages/Goals'
import Journal from './pages/Journal'
import DailyCommand from './pages/DailyCommand'
import { initSeedData } from './data/seedData'

initSeedData()

// One-time backfill: sync historical checkin answers into marko_daily
// Runs once per app version; re-runs if version bumps
;(function backfillCheckinToDaily() {
  if (localStorage.getItem('marko_backfill_v2') === 'done') return
  const MOOD_SCORE = { 'Excellent': 9, 'Good': 7, 'Neutral': 5, 'Low': 3, 'Very low': 1 }
  try {
    const checkin = JSON.parse(localStorage.getItem('marko_checkin') || '{}')
    const daily   = JSON.parse(localStorage.getItem('marko_daily')   || '{"logs":{}}')
    if (!daily.logs) daily.logs = {}

    Object.entries(checkin.morning || {}).forEach(([ds, data]) => {
      const a = data?.answers || {}
      if (!daily.logs[ds]) daily.logs[ds] = {}
      const log = daily.logs[ds]
      if (a['ms2']  != null && log.sleep     == null) log.sleep     = +a['ms2']
      if (a['me6']  != null && log.energy    == null) log.energy    = +a['me6']
      if (a['mm11'] != null && log.mood      == null) log.mood      = a['mm11']
      if (a['mi16'] != null && log.mit       == null) log.mit       = a['mi16']
      if (a['mi17'] != null && log.wordOfDay == null) log.wordOfDay = a['mi17']
    })

    Object.entries(checkin.evening || {}).forEach(([ds, data]) => {
      const a = data?.answers || {}
      if (!daily.logs[ds]) daily.logs[ds] = {}
      const log = daily.logs[ds]
      if (a['eb16'] != null && log.steps       == null) log.steps       = +a['eb16']
      if (a['ed4']  != null && log.workOutput  == null) log.workOutput  = +a['ed4']
      if (a['eb14'] != null && log.dietQuality == null) log.dietQuality = +a['eb14']
      if (a['em19'] != null && log.stress      == null) log.stress      = +a['em19']
      if (a['ed1']  != null && log.dailyRating == null) log.dailyRating = +a['ed1']
      if (a['en8']  != null && log.coldShower  == null) log.coldShower  = a['en8'] === 'YES' ? 1 : 0
      if (a['ek27'] != null && log.reading     == null) log.reading     = a['ek27'] === 'YES' ? 1 : 0
    })

    localStorage.setItem('marko_daily', JSON.stringify(daily))
    localStorage.setItem('marko_backfill_v2', 'done')
  } catch (e) { /* silent fail — non-critical */ }
})()

const PAGES = {
  command: DailyCommand,
  record: Record,
  insights: Insights,
  coach: Coach,
  'growth-feed': GrowthFeed,
  'life-cycles': LifeCycles,
  'check-in': CheckIn,
  morning: MorningCheckIn,
  evening: EveningCheckIn,
  goals: Goals,
  journal: Journal,
}

export default function App() {
  const [active, setActive] = useState('command')
  const [showSettings, setShowSettings] = useState(false)
  const Page = PAGES[active]

  return (
    <div className="flex flex-row h-screen text-white overflow-hidden" style={{ background: '#03040d', position: 'relative' }}>

      {/* ── BACKGROUND SYSTEM 2028 ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>

        {/* Abyss base — ultra dark */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 120% 100% at 50% 0%, rgba(6,7,22,1) 0%, rgba(2,3,12,1) 100%)' }} />

        {/* Primary indigo nebula — ultra diffuse */}
        <div style={{
          position: 'absolute',
          width: '140vw', height: '130vh', top: '-20vh', left: '-20vw',
          background: 'radial-gradient(ellipse at 52% 38%, rgba(99,102,241,0.28) 0%, rgba(99,102,241,0.12) 22%, rgba(139,92,246,0.05) 48%, transparent 68%)',
          animation: 'aurora-drift-1 38s ease-in-out infinite',
          filter: 'blur(60px)',
          mixBlendMode: 'screen',
        }} />

        {/* Violet right bloom — deep glow */}
        <div style={{
          position: 'absolute', borderRadius: '50%',
          width: '80vw', height: '110vh', top: '0vh', right: '-22vw',
          background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.22) 0%, rgba(99,102,241,0.09) 38%, transparent 68%)',
          animation: 'aurora-drift-2 28s ease-in-out infinite',
          filter: 'blur(80px)',
          mixBlendMode: 'screen',
        }} />

        {/* Cyan plasma bottom-left */}
        <div style={{
          position: 'absolute', borderRadius: '50%',
          width: '60vw', height: '60vh', bottom: '-14vh', left: '-8vw',
          background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.2) 0%, rgba(6,182,212,0.07) 40%, transparent 68%)',
          animation: 'aurora-drift-3 22s ease-in-out infinite reverse',
          filter: 'blur(70px)',
          mixBlendMode: 'screen',
        }} />

        {/* Gold crown nebula top-right */}
        <div style={{
          position: 'absolute', borderRadius: '50%',
          width: '45vw', height: '40vh', top: '-8vh', right: '8vw',
          background: 'radial-gradient(ellipse at center, rgba(240,192,64,0.13) 0%, transparent 62%)',
          animation: 'aurora-drift-1 20s ease-in-out infinite reverse',
          filter: 'blur(55px)',
          mixBlendMode: 'screen',
        }} />

        {/* Magenta micro-accent center */}
        <div style={{
          position: 'absolute', borderRadius: '50%',
          width: '30vw', height: '30vh', top: '30vh', left: '35vw',
          background: 'radial-gradient(ellipse at center, rgba(236,72,153,0.08) 0%, transparent 70%)',
          animation: 'aurora-drift-2 34s ease-in-out infinite reverse',
          filter: 'blur(90px)',
        }} />

        {/* Nano dot grid — denser, more alien */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(129,140,248,0.18) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse 90% 90% at 55% 45%, rgba(0,0,0,0.9) 0%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 55% 45%, rgba(0,0,0,0.9) 0%, transparent 100%)',
        }} />

        {/* Scanlines — ultra fine */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(99,102,241,0.012) 3px, rgba(99,102,241,0.012) 4px)',
        }} />

        {/* Holographic mesh overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 60% 50%, rgba(0,0,0,0.6) 0%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 60% 50%, rgba(0,0,0,0.6) 0%, transparent 100%)',
        }} />

        {/* HUD corner brackets */}
        <div style={{ position: 'absolute', top: 16, left: 88, width: 48, height: 48, borderTop: '1px solid rgba(99,102,241,0.55)', borderLeft: '1px solid rgba(99,102,241,0.55)' }} />
        <div style={{ position: 'absolute', top: 16, right: 16, width: 48, height: 48, borderTop: '1px solid rgba(99,102,241,0.55)', borderRight: '1px solid rgba(99,102,241,0.55)' }} />
        <div style={{ position: 'absolute', bottom: 16, right: 16, width: 48, height: 48, borderBottom: '1px solid rgba(99,102,241,0.55)', borderRight: '1px solid rgba(99,102,241,0.55)' }} />
        <div style={{ position: 'absolute', bottom: 16, left: 88, width: 48, height: 48, borderBottom: '1px solid rgba(6,182,212,0.4)', borderLeft: '1px solid rgba(6,182,212,0.4)' }} />

        {/* Edge vignette */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 38%, rgba(1,2,10,0.75) 100%)',
        }} />
      </div>

      <Sidebar active={active} onSelect={setActive} onSettings={() => setShowSettings(true)} />
      <main className="flex-1 overflow-auto min-w-0" style={{ position: 'relative', zIndex: 1 }}>
        <Page onNavigate={setActive} />
      </main>
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  )
}
