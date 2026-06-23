import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Settings from './components/Settings'
import Record from './pages/Record'
import Insights from './pages/Insights'
import Mind from './pages/Mind'
import Body from './pages/Body'
import Relations from './pages/Relations'
import Business from './pages/Business'
import Soul from './pages/Soul'
import Coach from './pages/Coach'
import GrowthFeed from './pages/GrowthFeed'
import DailyOS from './pages/DailyOS'
import LifeCycles from './pages/LifeCycles'
import CheckIn from './pages/CheckIn'
import MorningCheckIn from './pages/MorningCheckIn'
import EveningCheckIn from './pages/EveningCheckIn'
import Goals from './pages/Goals'
import Journal from './pages/Journal'
import DailyCommand from './pages/DailyCommand'
import { initSeedData } from './data/seedData'

initSeedData()

const PAGES = {
  command: DailyCommand,
  record: Record,
  insights: Insights,
  mind: Mind,
  body: Body,
  relations: Relations,
  business: Business,
  soul: Soul,
  coach: Coach,
  'growth-feed': GrowthFeed,
  daily: DailyOS,
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

      {/* ── BACKGROUND SYSTEM ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>

        {/* Large central orb — main visual anchor */}
        <div style={{
          position: 'absolute',
          width: '110vw', height: '110vh',
          top: '-10vh', left: '-5vw',
          background: 'radial-gradient(ellipse at 55% 40%, rgba(99,102,241,0.22) 0%, rgba(99,102,241,0.1) 25%, rgba(139,92,246,0.06) 50%, transparent 70%)',
          animation: 'aurora-drift-1 30s ease-in-out infinite',
          filter: 'blur(30px)',
        }} />

        {/* Deep violet right-side bloom */}
        <div style={{
          position: 'absolute', borderRadius: '50%',
          width: '65vw', height: '90vh', top: '10vh', right: '-15vw',
          background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.18) 0%, rgba(99,102,241,0.08) 40%, transparent 70%)',
          animation: 'aurora-drift-2 24s ease-in-out infinite',
          filter: 'blur(60px)',
        }} />

        {/* Cyan accent bottom-left */}
        <div style={{
          position: 'absolute', borderRadius: '50%',
          width: '50vw', height: '50vh', bottom: '-10vh', left: '-5vw',
          background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.14) 0%, rgba(6,182,212,0.05) 45%, transparent 70%)',
          animation: 'aurora-drift-3 20s ease-in-out infinite reverse',
          filter: 'blur(50px)',
        }} />

        {/* Gold crown top-right */}
        <div style={{
          position: 'absolute', borderRadius: '50%',
          width: '40vw', height: '35vh', top: '-5vh', right: '10vw',
          background: 'radial-gradient(ellipse at center, rgba(240,192,64,0.1) 0%, transparent 65%)',
          animation: 'aurora-drift-1 18s ease-in-out infinite reverse',
          filter: 'blur(40px)',
        }} />

        {/* Dot grid — constellation feel */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(129,140,248,0.22) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 95% 95% at 50% 50%, black 0%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 95% 95% at 50% 50%, black 0%, transparent 100%)',
        }} />

        {/* Horizontal scan line shimmer */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(99,102,241,0.015) 2px, rgba(99,102,241,0.015) 4px)',
          pointerEvents: 'none',
        }} />

        {/* Corner HUD elements */}
        {/* Top-left */}
        <div style={{ position: 'absolute', top: 20, left: 90, width: 60, height: 60, borderTop: '1px solid rgba(99,102,241,0.4)', borderLeft: '1px solid rgba(99,102,241,0.4)', opacity: 0.6 }} />
        {/* Top-right */}
        <div style={{ position: 'absolute', top: 20, right: 20, width: 60, height: 60, borderTop: '1px solid rgba(99,102,241,0.4)', borderRight: '1px solid rgba(99,102,241,0.4)', opacity: 0.6 }} />
        {/* Bottom-right */}
        <div style={{ position: 'absolute', bottom: 20, right: 20, width: 60, height: 60, borderBottom: '1px solid rgba(99,102,241,0.4)', borderRight: '1px solid rgba(99,102,241,0.4)', opacity: 0.6 }} />

        {/* Vignette edges */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(2,3,13,0.7) 100%)',
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
