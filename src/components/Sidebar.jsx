import { CalendarCheck, Dumbbell, Brain, TrendingUp, Target, BarChart2, Briefcase, Users, Flame, Bot, Settings, Zap } from 'lucide-react'
import { daysSinceStart } from '../utils'

const PRIMARY = [
  { id: 'daily', label: 'Daily', Icon: CalendarCheck },
  { id: 'body', label: 'Body', Icon: Dumbbell },
  { id: 'mind', label: 'Mind', Icon: Brain },
  { id: 'growth-feed', label: 'Growth', Icon: TrendingUp },
]

const SECONDARY = [
  { id: 'record', label: 'Record', Icon: Target },
  { id: 'insights', label: 'Insights', Icon: BarChart2 },
  { id: 'business', label: 'Business', Icon: Briefcase },
  { id: 'relations', label: 'Relations', Icon: Users },
  { id: 'soul', label: 'Soul', Icon: Flame },
  { id: 'coach', label: 'Coach', Icon: Bot },
]

export default function Sidebar({ active, onSelect, onSettings }) {
  const day = daysSinceStart()

  return (
    <aside style={{
      width: 76,
      flexShrink: 0,
      background: '#080810',
      borderRight: '1px solid #1a1a2e',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 16,
      paddingBottom: 16,
      gap: 0,
      height: '100vh',
      overflowY: 'auto',
      overflowX: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #1a1a2e', width: '100%', alignSelf: 'stretch' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={18} fill="#f59e0b" color="#f59e0b" />
        </div>
        <span style={{ fontFamily: 'Inter', fontSize: 8, fontWeight: 800, color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase' }}>MARKO OS</span>
      </div>

      {/* Primary nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '0 8px', boxSizing: 'border-box' }}>
        {PRIMARY.map(({ id, label, Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              title={label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                padding: '10px 4px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                background: isActive ? 'rgba(245,158,11,0.12)' : 'transparent',
                transition: 'all 0.15s',
                width: '100%',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon
                size={20}
                color={isActive ? '#f59e0b' : '#4b5563'}
                strokeWidth={isActive ? 2 : 1.5}
                style={{ transition: 'color 0.15s' }}
              />
              <span style={{
                fontFamily: 'Inter',
                fontSize: 9,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#f59e0b' : '#4b5563',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                lineHeight: 1,
                transition: 'color 0.15s',
              }}>{label}</span>
            </button>
          )
        })}
      </div>

      {/* Divider */}
      <div style={{ width: 36, height: 1, background: '#1a1a2e', margin: '12px 0' }} />

      {/* Secondary nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', padding: '0 8px', boxSizing: 'border-box' }}>
        {SECONDARY.map(({ id, label, Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              title={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 4px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                background: isActive ? 'rgba(245,158,11,0.1)' : 'transparent',
                transition: 'all 0.15s',
                width: '100%',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon size={15} color={isActive ? '#f59e0b' : '#374151'} strokeWidth={1.5} />
            </button>
          )
        })}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Day counter */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        marginBottom: 10,
        padding: '6px 4px',
        background: '#06060f',
        border: '1px solid #1a1a2e',
        borderRadius: 8,
        width: 'calc(100% - 16px)',
      }}>
        <span style={{ fontFamily: '"Bebas Neue",cursive', fontSize: 20, color: '#f59e0b', lineHeight: 1 }}>{String(day).padStart(3, '0')}</span>
        <span style={{ fontFamily: 'Inter', fontSize: 7, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em' }}>day</span>
      </div>

      {/* Settings */}
      <button
        onClick={onSettings}
        title="Settings"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 8,
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer',
          background: 'transparent',
          transition: 'all 0.15s',
          width: 'calc(100% - 16px)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <Settings size={15} color="#374151" />
      </button>
    </aside>
  )
}
