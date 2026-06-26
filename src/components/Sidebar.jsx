import { CalendarCheck, Sun, Moon, Dumbbell, Brain, TrendingUp, Activity, Target, BarChart2, Flame, Bot, Settings, Zap, Flag, BookOpen, LayoutDashboard } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { getWinHistory, computeCurrentWinStreak, getWinDaySettings } from '../utils/winLoss'
import { daysSinceStart } from '../utils'

const PRIMARY = [
  { id: 'command', label: 'Command', Icon: LayoutDashboard, color: '#818cf8' },
  { id: 'morning', label: 'Morning', Icon: Sun,             color: '#f0c040' },
  { id: 'evening', label: 'Evening', Icon: Moon,            color: '#a78bfa' },
  { id: 'body',    label: 'Body',    Icon: Dumbbell,        color: '#2dd4bf' },
  { id: 'mind',    label: 'Mind',    Icon: Brain,           color: '#e879f9' },
  { id: 'growth-feed', label: 'Growth', Icon: TrendingUp,   color: '#34d399' },
  { id: 'life-cycles', label: 'Cycles', Icon: Activity,     color: '#22d3ee' },
]

const SECONDARY = [
  { id: 'daily',    label: 'Daily',    Icon: CalendarCheck, color: '#818cf8' },
  { id: 'record',   label: 'Record',   Icon: Target,        color: '#22d3ee' },
  { id: 'insights', label: 'Insights', Icon: BarChart2,     color: '#6366f1' },
  { id: 'soul',     label: 'Soul',     Icon: Flame,         color: '#fb923c' },
  { id: 'coach',    label: 'Coach',    Icon: Bot,           color: '#a78bfa' },
  { id: 'goals',    label: 'Goals',    Icon: Flag,          color: '#f0c040' },
  { id: 'journal',  label: 'Journal',  Icon: BookOpen,      color: '#e879f9' },
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
      background: 'rgba(5, 7, 20, 0.92)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderRight: '1px solid rgba(99,102,241,0.12)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 16,
      paddingBottom: 16,
      height: '100vh',
      overflowY: 'auto',
      overflowX: 'hidden',
      position: 'relative',
      zIndex: 10,
    }}>

      {/* Vertical accent line */}
      <div style={{
        position: 'absolute', right: 0, top: '8%', bottom: '8%', width: 1,
        background: 'linear-gradient(to bottom, transparent, rgba(99,102,241,0.4) 35%, rgba(139,92,246,0.35) 65%, transparent)',
        pointerEvents: 'none',
      }} />

      {/* ── LOGO ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        marginBottom: 18, paddingBottom: 16, width: '100%',
        borderBottom: '1px solid rgba(99,102,241,0.1)',
      }}>
        <div className="glow-indigo" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.15))',
          border: '1px solid rgba(99,102,241,0.45)',
        }}>
          <Zap size={16} fill="#818cf8" color="#c4b5fd" />
        </div>
        <span style={{
          fontFamily: '"Orbitron", monospace', fontSize: 6, fontWeight: 700,
          color: '#818cf8', letterSpacing: '0.2em', textTransform: 'uppercase',
          textShadow: '0 0 12px rgba(99,102,241,0.6)',
        }}>OS</span>
      </div>

      {/* ── PRIMARY NAV ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', padding: '0 8px', boxSizing: 'border-box' }}>
        {PRIMARY.map(({ id, label, Icon, color }) => {
          const isActive = active === id
          return (
            <button key={id} onClick={() => onSelect(id)} title={label}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 4, padding: '9px 4px', borderRadius: 10, cursor: 'pointer',
                width: '100%', border: 'none', outline: 'none',
                transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.22), rgba(139,92,246,0.12))'
                  : 'transparent',
                borderLeft: isActive ? '2px solid rgba(129,140,248,0.9)' : '2px solid transparent',
                boxShadow: isActive
                  ? `0 4px 24px rgba(99,102,241,0.18), inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(99,102,241,0.2)`
                  : 'none',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(99,102,241,0.09)'
                  e.currentTarget.style.borderLeft = '2px solid rgba(99,102,241,0.25)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderLeft = '2px solid transparent'
                }
              }}
            >
              <Icon
                size={19}
                color={color}
                strokeWidth={isActive ? 2.5 : 1.6}
                style={{
                  filter: `drop-shadow(0 0 ${isActive ? 10 : 5}px ${color})`,
                  opacity: isActive ? 1 : 0.72,
                  transition: 'all 0.22s',
                }}
              />
              <span style={{
                fontFamily: '"Orbitron", monospace', fontSize: 7, fontWeight: 700,
                color: isActive ? color : 'rgba(148,163,184,0.65)',
                textTransform: 'uppercase', letterSpacing: '0.09em', lineHeight: 1,
                textShadow: isActive ? `0 0 10px ${color}` : 'none',
                transition: 'all 0.22s',
              }}>{label}</span>
            </button>
          )
        })}
      </div>

      {/* ── DIVIDER ── */}
      <div style={{
        width: 38, height: 1, margin: '10px 0',
        background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.35), transparent)',
      }} />

      {/* ── SECONDARY NAV ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', padding: '0 8px', boxSizing: 'border-box' }}>
        {SECONDARY.map(({ id, label, Icon, color }) => {
          const isActive = active === id
          return (
            <button key={id} onClick={() => onSelect(id)} title={label}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '7px 4px', borderRadius: 8, cursor: 'pointer',
                width: '100%', border: 'none', outline: 'none',
                transition: 'all 0.2s',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.09))'
                  : 'transparent',
                borderLeft: isActive ? '2px solid rgba(129,140,248,0.8)' : '2px solid transparent',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(99,102,241,0.08)'
                  e.currentTarget.style.borderLeft = '2px solid rgba(99,102,241,0.2)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderLeft = '2px solid transparent'
                }
              }}
            >
              <Icon
                size={15}
                color={color}
                strokeWidth={1.5}
                style={{
                  filter: `drop-shadow(0 0 ${isActive ? 8 : 4}px ${color})`,
                  opacity: isActive ? 1 : 0.6,
                  transition: 'all 0.2s',
                }}
              />
            </button>
          )
        })}
      </div>

      {/* ── SPACER ── */}
      <div style={{ flex: 1 }} />

      {/* ── WIN STREAK ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        marginBottom: 7, padding: '8px 6px',
        background: winStreak > 0
          ? 'linear-gradient(135deg, rgba(240,192,64,0.12), rgba(251,146,60,0.06))'
          : 'rgba(12,16,36,0.6)',
        border: `1px solid ${winStreak > 0 ? 'rgba(240,192,64,0.35)' : 'rgba(99,102,241,0.1)'}`,
        borderRadius: 10, width: 'calc(100% - 16px)',
        boxShadow: winStreak > 0 ? '0 0 24px rgba(240,192,64,0.1)' : 'none',
        transition: 'all 0.4s ease',
      }}>
        <span style={{ fontSize: 14, lineHeight: 1 }}>🔥</span>
        <span style={{
          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 22, lineHeight: 1,
          color: winStreak > 0 ? '#f0c040' : '#334155',
          textShadow: winStreak > 0 ? '0 0 20px rgba(240,192,64,0.8)' : 'none',
          transition: 'all 0.4s',
        }}>{winStreak}</span>
        <span style={{
          fontFamily: '"Orbitron", monospace', fontSize: 5, fontWeight: 700,
          color: winStreak > 0 ? '#f0c040' : '#334155',
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>WINS</span>
      </div>

      {/* ── DAY COUNTER ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        marginBottom: 10, padding: '8px 6px',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(6,182,212,0.05))',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 10, width: 'calc(100% - 16px)',
        boxShadow: '0 4px 20px rgba(99,102,241,0.08)',
      }}>
        <span style={{
          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900,
          fontSize: 24, color: '#818cf8', lineHeight: 1,
          textShadow: '0 0 18px rgba(99,102,241,0.7)',
        }}>{String(day).padStart(3, '0')}</span>
        <span style={{
          fontFamily: '"Orbitron", monospace', fontSize: 5, fontWeight: 700,
          color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.15em',
        }}>DAY</span>
      </div>

      {/* ── SETTINGS ── */}
      <button
        onClick={onSettings}
        title="Settings"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'transparent', transition: 'all 0.2s', width: 'calc(100% - 16px)',
          outline: 'none',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(99,102,241,0.08)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <Settings size={14} color="#475569" />
      </button>
    </aside>
  )
}
