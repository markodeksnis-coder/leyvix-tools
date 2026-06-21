import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Settings from './components/Settings'
import Record from './pages/Record'
import DailyOS from './pages/DailyOS'
import Body from './pages/Body'
import Arsenal from './pages/Arsenal'
import GrowthFeed from './pages/GrowthFeed'
import Business from './pages/Business'
import { initSeedData } from './data/seedData'

initSeedData()

const PAGES = {
  record: Record,
  daily: DailyOS,
  body: Body,
  arsenal: Arsenal,
  growth: GrowthFeed,
  business: Business,
}

export default function App() {
  const [active, setActive] = useState('record')
  const [showSettings, setShowSettings] = useState(false)
  const Page = PAGES[active]

  return (
    <div className="flex flex-row h-screen text-white overflow-hidden" style={{ background: '#030508' }}>
      <Sidebar active={active} onSelect={setActive} onSettings={() => setShowSettings(true)} />
      <main className="flex-1 overflow-auto min-w-0">
        <Page />
      </main>
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  )
}
