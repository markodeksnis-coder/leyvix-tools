import { CalendarCheck, ClipboardCheck, Dumbbell, Brain, TrendingUp, Activity, Target, BarChart2, Briefcase, Users, Flame, Bot, Settings, Zap } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { getWinHistory, computeCurrentWinStreak, getWinDaySettings } from '../utils/winLoss'
import { daysSinceStart } from '../utils'

const PRIMARY = [
  { id: 'daily', label: 'Daily', Icon: CalendarCheck, color: '#8b5cf6' },
  { id: 'check-in', label: 'Check-In', Icon: ClipboardCheck, color: '#fbbf24' },
  { id: 'body', label: 'Body', Icon: Dumbbell, color: '#10b981' },
  { id: 'mind', label: 'Mind', Icon: Brain, color: '#e879f9' },
  { id: 'growth-feed', label: 'Growth', Icon: TrendingUp, color: '#fbbf24' },
  { id: 'life-cycles', label: 'Cycles', Icon: Activity, color: '#22d3ee' },
]

const SECONDARY = [
  { id: 'record', label: 'Record', Icon: Target, color: '#22d3ee' },
  { id: 'insights', label: 'Insights', Icon: BarChart2, color: '#6366f1' },
  { id: 'business', label: 'Business', Icon: Briefcase, color: '#3b82f6' },
  { id: 'relations', label: 'Relations', Icon: Users, color: '#f43f5e' },
  { id: 'soul', label: 'Soul', Icon: Flame, color: '#fb923c' },
  { id: 'coach', label: 'Coach', Icon: Bot, color: '#a78bfa' },
]

export default function Sidebar({ active, onSelect, onSettings }) {
  const day = daysSinceStart()
  const [dailyData] = useLocalStorage('marko_daily', { logs: {} })
  const [bodyData]  = useLocalStorage('marko_body',  { liftSessions: [], workouts: [] })
  const [dietData]  = useLocalStorage('marko_diet',  { history: [] })
  const winSettings = getWinDaySettings()
  const winHistory  = getWinHistory(30, winSettings, dailyData, bodyData, dietData)
  const winStreak   = computeCurrentWinStreak(winHistory)
  const activeColor = [...PRIMARY, ...SECONDARY].find(i => i.id === active)?.color || '#8b5cf6'

  return (
    <aside style={{
      width: 76,
      flexShrink: 0,
      background: 'linear-gradient(180deg, #070718 0%, #09091f 100%)',
      borderRight: '1px solid rgba(139,92,246,0.25)',
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
        borderBottom: '1px solid rgba(139,92,246,0.2)',
        width: '100%', alignSelf: 'stretch',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(34,211,238,0.2))',
          border: '1px solid rgba(139,92,246,0.4)',
          boxShadow: '0 0 16px rgba(139,92,246,0.4)',
        }}>
          <Zap size={16} fill="#8b5cf6" color="#8b5cf6" />
        </div>
        <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 7, fontWeight: 700, color: '#8b5cf6', letterSpacing: '0.15em', textTransform: 'uppercase' }}>OS</span>
      </div>

      {/* Primary nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '0 8px', boxSizing: 'border-box' }}>
        {PRIMARY.map(({ id, label, Icon, color }) => {
          const isActive = active === id
          return (
            <button key={id} onClick={() => onSelect(id)} title={label}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 5, padding: '10px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
                width: '100%', transition: 'all 0.2s',
                background: isActive
                  ? `linear-gradient(135deg, ${color}25, ${color}10)`
                  : 'transparent',
                boxShadow: isActive
                  ? `0 0 0 1px ${color}50, 0 0 16px ${color}25`
                  : 'none',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.boxShadow = `0 0 12px ${color}15` }}}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none' }}}
            >
              <Icon size={20} color={isActive ? color : 'rgba(148,163,184,0.5)'} strokeWidth={isActive ? 2.5 : 1.5}
                style={{ filter: isActive ? `drop-shadow(0 0 6px ${color})` : 'none', transition: 'all 0.2s' }} />
              <span style={{
                fontFamily: 'Inter', fontSize: 8, fontWeight: isActive ? 700 : 500,
                color: isActive ? color : 'rgba(148,163,184,0.4)',
                textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1, transition: 'color 0.2s',
                textShadow: isActive ? `0 0 10px ${color}` : 'none',
              }}>{label}</span>
            </button>
          )
        })}
      </div>

      {/* Divider */}
      <div style={{ width: 40, height: 1, background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent)', margin: '12px 0' }} />

      {/* Secondary nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', padding: '0 8px', boxSizing: 'border-box' }}>
        {SECONDARY.map(({ id, label, Icon, color }) => {
          const isActive = active === id
          return (
            <button key={id} onClick={() => onSelect(id)} title={label}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                width: '100%', transition: 'all 0.2s',
                background: isActive ? `${color}18` : 'transparent',
                boxShadow: isActive ? `0 0 12px ${color}25` : 'none',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon size={15} color={isActive ? color : 'rgba(100,116,139,0.5)'} strokeWidth={1.5}
                style={{ filter: isActive ? `drop-shadow(0 0 4px ${color})` : 'none' }} />
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
        background: winStreak > 0 ? 'rgba(201,168,76,0.1)' : 'transparent',
        border: `1px solid ${winStreak > 0 ? 'rgba(201,168,76,0.3)' : 'rgba(100,116,139,0.15)'}`,
        borderRadius: 8, width: 'calc(100% - 16px)',
        transition: 'all 0.3s',
      }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>🔥</span>
        <span style={{
          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 20, lineHeight: 1,
          color: winStreak > 0 ? '#c9a84c' : '#64748b',
          textShadow: winStreak > 0 ? '0 0 16px rgba(201,168,76,0.7)' : 'none',
          transition: 'all 0.3s',
        }}>{winStreak}</span>
        <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 5, fontWeight: 700, color: winStreak > 0 ? '#c9a84c' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>WINS</span>
      </div>

      {/* Day counter */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        marginBottom: 10, padding: '8px 4px',
        background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(34,211,238,0.1))',
        border: '1px solid rgba(139,92,246,0.35)',
        borderRadius: 8, width: 'calc(100% - 16px)',
        boxShadow: '0 0 20px rgba(139,92,246,0.25)',
      }}>
        <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 18, fontWeight: 900, color: '#8b5cf6', lineHeight: 1, textShadow: '0 0 16px rgba(139,92,246,0.8)' }}>{String(day).padStart(3, '0')}</span>
        <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 6, fontWeight: 700, color: '#22d3ee', textTransform: 'uppercase', letterSpacing: '0.15em' }}>DAY</span>
      </div>

      {/* Settings */}
      <button onClick={onSettings} title="Settings"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'transparent', transition: 'all 0.2s', width: 'calc(100% - 16px)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <Settings size={14} color="rgba(100,116,139,0.5)" />
      </button>
    </aside>
  )
}
