import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Mind from './pages/Mind'
import Body from './pages/Body'
import Relations from './pages/Relations'
import Business from './pages/Business'
import Soul from './pages/Soul'
import Coach from './pages/Coach'

const PAGES = { mind: Mind, body: Body, relations: Relations, business: Business, soul: Soul, coach: Coach }

export default function App() {
  const [active, setActive] = useState('mind')
  const Page = PAGES[active]

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-neutral-100 overflow-hidden">
      <Sidebar active={active} onSelect={setActive} />
      <main className="flex-1 overflow-auto min-w-0">
        <Page />
      </main>
    </div>
  )
}
