import { CalendarCheck, Sun, Moon, Dumbbell, Brain, TrendingUp, Activity, Target, BarChart2, Briefcase, Users, Flame, Bot, Settings, Zap, Flag, BookOpen } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { getWinHistory, computeCurrentWinStreak, getWinDaySettings } from '../utils/winLoss'
import { daysSinceStart } from '../utils'

const PRIMARY = [
  { id: 'daily',   label: 'Daily',   Icon: CalendarCheck, color: '#8b5cf6' },
  { id: 'morning', label: 'Morning', Icon: Sun,           color: '#f0c040' },
  { id: 'evening', label: 'Evening', Icon: Moon,          color: '#b8a0ff' },
  { id: 'body',    label: 'Body',    Icon: Dumbbell,      color: '#1ad9a0' },
  { id: 'mind',    label: 'Mind',    Icon: Brain,         color: '#e879f9' },
  { id: 'growth-feed', label: 'Growth', Icon: TrendingUp, color: '#f0c040' },
  { id: 'life-cycles', label: 'Cycles', Icon: Activity,   color: '#22d3ee' },
]

const SECONDARY = [
  { id: 'record', label: 'Record', Icon: Target, color: '#22d3ee' },
  { id: 'insights', label: 'Insights', Icon: BarChart2, color: '#6366f1' },
  { id: 'business', label: 'Business', Icon: Briefcase, color: '#4d9fff' },
  { id: 'relations', label: 'Relations', Icon: Users, color: '#f43f5e' },
  { id: 'soul', label: 'Soul', Icon: Flame, color: '#fb923c' },
  { id: 'coach', label: 'Coach', Icon: Bot, color: '#b8a0ff' },
  { id: 'goals', label: 'Goals', Icon: Flag, color: '#f0c040' },
  { id: 'journal', label: 'Journal', Icon: BookOpen, color: '#e879f9' },
]

export default function Sidebar({ active, onSelect, onSettings }) {
  const day = daysSinceStart()
  const [dailyData] = useLocalStorage('marko_daily', { logs: {} })
  const [bodyData]  = useLocalStorage('marko_body',  { liftSessions: [], workouts: [] })
  const [dietData]  = useLocalStorage('marko_diet',  { history: [] })
  const winSettings = getWinDaySettings()
  const winHistory  = getWinHistory(30, winSettings, dailyData, bodyData, dietData)
  const winStreak   = computeCurrentWinStreak(winHistory)

  return (
    <aside style={{
      width: 76,
      flexShrink: 0,
      background: '#040810',
      borderRight: '1px solid #1e3050',
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
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        marginBottom: 20, paddingBottom: 16,
        borderBottom: '1px solid #1e3050',
        width: '100%', alignSelf: 'stretch',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, rgba(232,184,75,0.25), rgba(240,192,64,0.1))',
          border: '1px solid rgba(232,184,75,0.5)',
          boxShadow: '0 0 16px rgba(232,184,75,0.3)',
        }}>
          <Zap size={16} fill="#e8b84b" color="#e8b84b" />
        </div>
        <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 7, fontWeight: 700, color: '#e8b84b', letterSpacing: '0.15em', textTransform: 'uppercase' }}>OS</span>
      </div>

      {/* Primary nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '0 8px', boxSizing: 'border-box' }}>
        {PRIMARY.map(({ id, label, Icon, color }) => {
          const isActive = active === id
          return (
            <button key={id} onClick={() => onSelect(id)} title={label}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 5, padding: '10px 4px', borderRadius: 10, cursor: 'pointer',
                width: '100%', transition: 'all 0.2s',
                background: isActive ? '#1a2440' : 'transparent',
                border: isActive ? '1px solid #3b5a9a' : '1px solid transparent',
                borderLeft: isActive ? '2px solid #f0c040' : '2px solid transparent',
                boxShadow: isActive ? '0 2px 12px rgba(26,36,64,0.8)' : 'none',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#0d1628'; e.currentTarget.style.borderColor = 'rgba(58,90,154,0.4)' }}}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}}
            >
              <Icon size={20} color={color} strokeWidth={isActive ? 2.5 : 1.5}
                style={{ filter: `drop-shadow(0 0 ${isActive ? 10 : 6}px ${color})`, transition: 'all 0.2s' }} />
              <span style={{
                fontFamily: 'Inter', fontSize: 8, fontWeight: isActive ? 700 : 500,
                color: color,
                textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1, transition: 'color 0.2s',
                textShadow: `0 0 8px ${color}`,
              }}>{label}</span>
            </button>
          )
        })}
      </div>

      {/* Divider */}
      <div style={{ width: 40, height: 1, background: 'linear-gradient(90deg, transparent, #2a4a7a, transparent)', margin: '12px 0' }} />

      {/* Secondary nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', padding: '0 8px', boxSizing: 'border-box' }}>
        {SECONDARY.map(({ id, label, Icon, color }) => {
          const isActive = active === id
          return (
            <button key={id} onClick={() => onSelect(id)} title={label}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '8px 4px', borderRadius: 8, cursor: 'pointer',
                width: '100%', transition: 'all 0.2s',
                background: isActive ? '#1a2440' : 'transparent',
                border: isActive ? `1px solid #3b5a9a` : '1px solid transparent',
                borderLeft: isActive ? `2px solid #f0c040` : '2px solid transparent',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#0d1628'; e.currentTarget.style.borderColor = 'rgba(58,90,154,0.3)' }}}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}}
            >
              <Icon size={15} color={color} strokeWidth={1.5}
                style={{ filter: `drop-shadow(0 0 ${isActive ? 8 : 5}px ${color})`, transition: 'all 0.2s' }} />
            </button>
          )
        })}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Win Streak */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        marginBottom: 6, padding: '6px 4px',
        background: winStreak > 0 ? 'rgba(240,192,64,0.12)' : 'rgba(26,48,80,0.4)',
        border: `1px solid ${winStreak > 0 ? 'rgba(240,192,64,0.4)' : '#1e3050'}`,
        borderRadius: 8, width: 'calc(100% - 16px)',
        transition: 'all 0.3s',
      }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>🔥</span>
        <span style={{
          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 20, lineHeight: 1,
          color: winStreak > 0 ? '#f0c040' : '#7a95c0',
          textShadow: winStreak > 0 ? '0 0 16px rgba(240,192,64,0.8)' : 'none',
          transition: 'all 0.3s',
        }}>{winStreak}</span>
        <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 5, fontWeight: 700, color: winStreak > 0 ? '#f0c040' : '#7a95c0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>WINS</span>
      </div>

      {/* Day counter */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        marginBottom: 10, padding: '8px 4px',
        background: '#0f1e38',
        border: '1px solid #2a4a7a',
        borderRadius: 8, width: 'calc(100% - 16px)',
      }}>
        <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 22, fontWeight: 900, color: '#f0c040', lineHeight: 1, textShadow: '0 0 12px rgba(240,192,64,0.6)' }}>{String(day).padStart(3, '0')}</span>
        <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 6, fontWeight: 700, color: '#7a9cc5', textTransform: 'uppercase', letterSpacing: '0.15em' }}>DAY</span>
      </div>

      {/* Settings */}
      <button onClick={onSettings} title="Settings"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 8, borderRadius: 8, border: '1px solid transparent', cursor: 'pointer',
          background: 'transparent', transition: 'all 0.2s', width: 'calc(100% - 16px)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#0d1628'; e.currentTarget.style.borderColor = '#1e3050' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
      >
        <Settings size={14} color="#7a95c0" />
      </button>
    </aside>
  )
}
