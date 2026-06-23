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
          width: '80vw', height: '80vh', top: '-30vh', left: '-20vw',
          background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.32) 0%, rgba(99,102,241,0.14) 40%, transparent 70%)',
          animation: 'aurora-drift-1 22s ease-in-out infinite',
          filter: 'blur(60px)',
        }} />
        {/* Violet blob bottom-right */}
        <div style={{
          position: 'absolute', borderRadius: '50%',
          width: '70vw', height: '70vh', bottom: '-20vh', right: '-15vw',
          background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.28) 0%, rgba(139,92,246,0.1) 40%, transparent 70%)',
          animation: 'aurora-drift-2 28s ease-in-out infinite',
          filter: 'blur(70px)',
        }} />
        {/* Cyan blob center */}
        <div style={{
          position: 'absolute', borderRadius: '50%',
          width: '55vw', height: '55vh', top: '30vh', left: '20vw',
          background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.18) 0%, rgba(6,182,212,0.06) 40%, transparent 70%)',
          animation: 'aurora-drift-3 34s ease-in-out infinite',
          filter: 'blur(80px)',
        }} />
        {/* Gold accent top-right */}
        <div style={{
          position: 'absolute', borderRadius: '50%',
          width: '40vw', height: '40vh', top: '-10vh', right: '5vw',
          background: 'radial-gradient(ellipse at center, rgba(240,192,64,0.1) 0%, transparent 65%)',
          animation: 'aurora-drift-2 18s ease-in-out infinite reverse',
          filter: 'blur(50px)',
        }} />
        {/* Dot grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(99,102,241,0.18) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          maskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, black 5%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, black 5%, transparent 100%)',
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
