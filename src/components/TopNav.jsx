import { Zap, Settings } from 'lucide-react'
import { daysSinceStart } from '../utils'

const NAV = [
  { id: 'daily', label: 'Daily' },
  { id: 'record', label: 'The Record' },
  { id: 'insights', label: 'Insights' },
  { id: 'mind', label: 'Mind' },
  { id: 'body', label: 'Body' },
  { id: 'relations', label: 'Relations' },
  { id: 'business', label: 'Business' },
  { id: 'soul', label: 'Soul' },
  { id: 'coach', label: 'Coach' },
  { id: 'growth-feed', label: 'Growth Feed' },
]

export default function TopNav({ active, onSelect, onSettings }) {
  const day = daysSinceStart()
  return (
    <header
      style={{ background: '#000000', borderBottom: '1px solid #1a2440', height: 56 }}
      className="shrink-0 flex items-center px-5 gap-5"
    >
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <Zap size={15} fill="#f0c040" color="#f0c040" />
        <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 800, color: 'white', letterSpacing: '0.06em' }}>
          MARKO OS
        </span>
      </div>

      {/* Nav */}
      <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto">
        {NAV.map(({ id, label }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              style={{
                fontFamily: 'Inter',
                fontSize: 13,
                fontWeight: isActive ? 700 : 400,
                color: isActive ? '#000' : '#a0aec0',
                background: isActive ? '#f0c040' : 'transparent',
                padding: '5px 11px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#d1d5db' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#a0aec0' }}
            >
              {label}
            </button>
          )
        })}
      </nav>

      {/* Right */}
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={onSettings} style={{ color: '#a0aec0' }} className="hover:text-white transition-colors">
          <Settings size={15} />
        </button>
        <div style={{
          background: '#1a1505',
          border: '1px solid #f0c040',
          borderRadius: 6,
          padding: '4px 10px',
          fontFamily: 'Inter',
          fontSize: 11,
          fontWeight: 600,
          color: '#f0c040',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f0c040', flexShrink: 0 }} />
          DAY {String(day).padStart(3, '0')} OF THE WAR
        </div>
      </div>
    </header>
  )
}
