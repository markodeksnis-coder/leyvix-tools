import { LayoutDashboard, Flame, Dumbbell, Zap, TrendingUp, Briefcase, Settings } from 'lucide-react'
import { daysSinceStart } from '../utils'

const NAV_ITEMS = [
  { id: 'record', icon: LayoutDashboard, label: 'RECORD' },
  { id: 'daily', icon: Flame, label: 'DAILY' },
  { id: 'body', icon: Dumbbell, label: 'BODY' },
  { id: 'arsenal', icon: Zap, label: 'ARSENAL' },
  { id: 'growth', icon: TrendingUp, label: 'GROWTH' },
  { id: 'business', icon: Briefcase, label: 'BIZ' },
]

export default function Sidebar({ active, onSelect, onSettings }) {
  const dayCount = daysSinceStart()

  return (
    <div style={{
      width: 64,
      background: '#06090f',
      borderRight: '1px solid #0f1628',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 12,
      paddingBottom: 12,
      height: '100vh',
      overflowY: 'auto',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '1px solid #0f1628',
        width: '100%',
        gap: 2,
        boxSizing: 'border-box',
      }}>
        <Zap size={16} fill="#c9a84c" color="#c9a84c" />
        <span style={{
          fontSize: 9,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 800,
          color: '#4a5a7a',
        }}>
          M
        </span>
      </div>

      {/* Nav items */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '0 8px',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                cursor: 'pointer',
                border: isActive ? '1px solid #1a2440' : '1px solid transparent',
                background: isActive ? '#0f1628' : 'transparent',
                margin: '0 auto',
                padding: 0,
                outline: 'none',
              }}
            >
              <Icon
                size={18}
                color={isActive ? '#c9a84c' : '#2a3a5a'}
              />
              <span style={{
                fontSize: 7,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: isActive ? '#c9a84c' : '#2a3a5a',
              }}>
                {label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Day counter badge */}
      <div style={{
        background: '#0f1628',
        border: '1px solid #0f1628',
        borderRadius: 8,
        padding: 4,
        width: 'calc(100% - 16px)',
        marginBottom: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}>
        <span style={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 900,
          fontSize: 18,
          color: '#c9a84c',
          lineHeight: 1,
        }}>
          {dayCount}
        </span>
        <span style={{
          fontSize: 6,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          color: '#2a3a5a',
          textTransform: 'uppercase',
        }}>
          DAY
        </span>
      </div>

      {/* Settings button */}
      <button
        onClick={onSettings}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          outline: 'none',
        }}
      >
        <Settings size={14} color="#2a3a5a" />
      </button>
    </div>
  )
}
