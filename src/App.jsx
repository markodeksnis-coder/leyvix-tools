import { useState } from 'react'
import TopNav from './components/TopNav'
import Settings from './components/Settings'
import Record from './pages/Record'
import Mind from './pages/Mind'
import Body from './pages/Body'
import Relations from './pages/Relations'
import Business from './pages/Business'
import Soul from './pages/Soul'
import Coach from './pages/Coach'
import GrowthFeed from './pages/GrowthFeed'
import { initSeedData } from './data/seedData'

initSeedData()

const PAGES = { record: Record, mind: Mind, body: Body, relations: Relations, business: Business, soul: Soul, coach: Coach, 'growth-feed': GrowthFeed }

export default function App() {
  const [active, setActive] = useState('record')
  const [showSettings, setShowSettings] = useState(false)
  const Page = PAGES[active]

  return (
    <div className="flex flex-col h-screen text-white overflow-hidden" style={{ background: '#0a0a0f' }}>
      <TopNav active={active} onSelect={setActive} onSettings={() => setShowSettings(true)} />
      <main className="flex-1 overflow-auto min-w-0">
        <Page />
      </main>
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  )
}
