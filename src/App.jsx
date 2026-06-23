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

      {/* ── AURORA BACKGROUND ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {/* Indigo blob top-left */}
        <div style={{
          position: 'absolute', borderRadius: '50%',
          width: '72vw', height: '72vh', top: '-22vh', left: '-18vw',
          background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.11) 0%, rgba(99,102,241,0.04) 45%, transparent 72%)',
          animation: 'aurora-drift-1 22s ease-in-out infinite',
          filter: 'blur(48px)',
        }} />
        {/* Violet blob bottom-right */}
        <div style={{
          position: 'absolute', borderRadius: '50%',
          width: '62vw', height: '62vh', bottom: '-18vh', right: '-12vw',
          background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.09) 0%, rgba(139,92,246,0.03) 45%, transparent 72%)',
          animation: 'aurora-drift-2 28s ease-in-out infinite',
          filter: 'blur(56px)',
        }} />
        {/* Cyan blob center */}
        <div style={{
          position: 'absolute', borderRadius: '50%',
          width: '48vw', height: '48vh', top: '32vh', left: '22vw',
          background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.06) 0%, rgba(6,182,212,0.02) 45%, transparent 72%)',
          animation: 'aurora-drift-3 34s ease-in-out infinite',
          filter: 'blur(64px)',
        }} />
        {/* Dot grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(99,102,241,0.07) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
          maskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 10%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 10%, transparent 100%)',
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
