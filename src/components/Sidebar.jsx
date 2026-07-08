import { Sun, Moon, TrendingUp, Activity, Target, BarChart2, Bot, Settings, Zap, Flag, BookOpen, LayoutDashboard } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { getWinHistory, computeCurrentWinStreak, getWinDaySettings } from '../utils/winLoss'
import { daysSinceStart } from '../utils'

const PRIMARY = [
  { id: 'command',     label: 'Command', Icon: LayoutDashboard, color: '#818cf8' },
  { id: 'morning',     label: 'Morning', Icon: Sun,             color: '#f0c040' },
  { id: 'evening',     label: 'Evening', Icon: Moon,            color: '#a78bfa' },
  { id: 'growth-feed', label: 'Growth',  Icon: TrendingUp,      color: '#34d399' },
  { id: 'life-cycles', label: 'Cycles',  Icon: Activity,        color: '#22d3ee' },
]

const SECONDARY = [
  { id: 'record',   label: 'Record',   Icon: Target,   color: '#22d3ee' },
  { id: 'insights', label: 'Insights', Icon: BarChart2, color: '#6366f1' },
  { id: 'coach',    label: 'Coach',    Icon: Bot,       color: '#a78bfa' },
  { id: 'goals',    label: 'Goals',    Icon: Flag,      color: '#f0c040' },
  { id: 'journal',  label: 'Journal',  Icon: BookOpen,  color: '#e879f9' },
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
      background: 'rgba(2, 3, 12, 0.96)',
      backdropFilter: 'blur(60px) saturate(180%)',
      WebkitBackdropFilter: 'blur(60px) saturate(180%)',
      borderRight: '1px solid rgba(99,102,241,0.35)',
      boxShadow: '1px 0 0 rgba(129,140,248,0.08), 8px 0 60px rgba(99,102,241,0.08)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 14,
      paddingBottom: 14,
      height: '100vh',
      overflowY: 'auto',
      overflowX: 'hidden',
      position: 'relative',
      zIndex: 10,
    }}>

      {/* Vertical glow line */}
      <div style={{
        position: 'absolute', right: -1, top: '8%', bottom: '8%', width: 1,
        background: 'linear-gradient(to bottom, transparent, rgba(129,140,248,0.9) 25%, rgba(139,92,246,0.7) 55%, rgba(34,211,238,0.5) 80%, transparent)',
        pointerEvents: 'none',
        boxShadow: '0 0 8px rgba(99,102,241,0.6)',
      }} />

      {/* ── LOGO ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        marginBottom: 16, paddingBottom: 14, width: '100%',
        borderBottom: '1px solid rgba(99,102,241,0.12)',
      }}>
        <div className="glow-indigo" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 34, height: 34, borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.1))',
          border: '1px solid rgba(129,140,248,0.5)',
          backdropFilter: 'blur(20px)',
        }}>
          <Zap size={15} fill="#a5b4fc" color="#c4b5fd" />
        </div>
        <span style={{
          fontFamily: '"Orbitron", monospace', fontSize: 6, fontWeight: 700,
          color: '#a5b4fc', letterSpacing: '0.25em', textTransform: 'uppercase',
          textShadow: '0 0 16px rgba(129,140,248,0.7)',
        }}>OS</span>
      </div>

      {/* ── PRIMARY NAV ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', padding: '0 6px', boxSizing: 'border-box' }}>
        {PRIMARY.map(({ id, label, Icon, color }) => {
          const isActive = active === id
          return (
            <button key={id} onClick={() => onSelect(id)} title={label}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 4, padding: '10px 4px', borderRadius: 12, cursor: 'pointer',
                width: '100%', border: 'none', outline: 'none',
                transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
                background: isActive
                  ? `linear-gradient(135deg, ${color}22, ${color}0d)`
                  : 'transparent',
                borderLeft: isActive ? `2px solid ${color}` : '2px solid transparent',
                boxShadow: isActive
                  ? `0 0 24px ${color}30, inset 0 0 24px ${color}10, inset 0 1px 0 rgba(255,255,255,0.07)`
                  : 'none',
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = `${color}12`
                  e.currentTarget.style.borderLeft = `2px solid ${color}60`
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
                size={20}
                color={color}
                strokeWidth={isActive ? 2.5 : 1.6}
                style={{
                  filter: isActive
                    ? `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 20px ${color}AA)`
                    : `drop-shadow(0 0 6px ${color}99)`,
                  opacity: isActive ? 1 : 0.7,
                  transition: 'all 0.22s',
                }}
              />
              <span style={{
                fontFamily: '"Orbitron", monospace', fontSize: 7, fontWeight: 700,
                color: isActive ? color : 'rgba(100,116,139,0.9)',
                textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1,
                textShadow: isActive ? `0 0 12px ${color}` : 'none',
                transition: 'all 0.22s',
              }}>{label}</span>
            </button>
          )
        })}
      </div>

      {/* ── DIVIDER ── */}
      <div style={{
        width: 32, height: 1, margin: '8px 0',
        background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.4), rgba(34,211,238,0.2), transparent)',
        boxShadow: '0 0 6px rgba(99,102,241,0.3)',
      }} />

      {/* ── SECONDARY NAV ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%', padding: '0 6px', boxSizing: 'border-box' }}>
        {SECONDARY.map(({ id, label, Icon, color }) => {
          const isActive = active === id
          return (
            <button key={id} onClick={() => onSelect(id)} title={label}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '9px 4px', borderRadius: 10, cursor: 'pointer',
                width: '100%', border: 'none', outline: 'none',
                transition: 'all 0.2s',
                background: isActive
                  ? `linear-gradient(135deg, ${color}20, ${color}0a)`
                  : 'transparent',
                borderLeft: isActive ? `2px solid ${color}` : '2px solid transparent',
                boxShadow: isActive ? `0 0 16px ${color}25, inset 0 0 16px ${color}0d` : 'none',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = `${color}10`
                  e.currentTarget.style.borderLeft = `2px solid ${color}55`
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
                size={17}
                color={color}
                strokeWidth={1.7}
                style={{
                  filter: isActive
                    ? `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 18px ${color}CC)`
                    : `drop-shadow(0 0 5px ${color}88)`,
                  opacity: isActive ? 1 : 0.65,
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
        marginBottom: 6, padding: '8px 5px',
        background: winStreak > 0
          ? 'linear-gradient(135deg, rgba(240,192,64,0.1), rgba(251,146,60,0.04))'
          : 'rgba(8,12,28,0.7)',
        border: `1px solid ${winStreak > 0 ? 'rgba(240,192,64,0.4)' : 'rgba(99,102,241,0.1)'}`,
        borderRadius: 12, width: 'calc(100% - 12px)',
        boxShadow: winStreak > 0 ? '0 0 32px rgba(240,192,64,0.12), inset 0 1px 0 rgba(240,192,64,0.1)' : 'none',
        transition: 'all 0.4s ease',
      }}>
        <span style={{ fontSize: 13, lineHeight: 1 }}>🔥</span>
        <span style={{
          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontSize: 24, lineHeight: 1,
          color: winStreak > 0 ? '#f0c040' : '#1e293b',
          textShadow: winStreak > 0 ? '0 0 24px rgba(240,192,64,0.9)' : 'none',
          transition: 'all 0.4s',
        }}>{winStreak}</span>
        <span style={{
          fontFamily: '"Orbitron", monospace', fontSize: 5, fontWeight: 700,
          color: winStreak > 0 ? '#f0c040' : '#1e293b',
          textTransform: 'uppercase', letterSpacing: '0.12em',
        }}>WINS</span>
      </div>

      {/* ── DAY COUNTER ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        marginBottom: 8, padding: '8px 5px',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(6,182,212,0.04))',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 12, width: 'calc(100% - 12px)',
        boxShadow: '0 0 24px rgba(99,102,241,0.07), inset 0 1px 0 rgba(129,140,248,0.08)',
      }}>
        <span style={{
          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900,
          fontSize: 26, color: '#a5b4fc', lineHeight: 1,
          textShadow: '0 0 24px rgba(129,140,248,0.8)',
        }}>{String(day).padStart(3, '0')}</span>
        <span style={{
          fontFamily: '"Orbitron", monospace', fontSize: 5, fontWeight: 700,
          color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.18em',
        }}>DAY</span>
      </div>

      {/* ── SETTINGS ── */}
      <button
        onClick={onSettings}
        title="Settings"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 8, borderRadius: 10, border: 'none', cursor: 'pointer',
          background: 'transparent', transition: 'all 0.2s', width: 'calc(100% - 12px)',
          outline: 'none',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(99,102,241,0.08)'
          e.currentTarget.style.border = '1px solid rgba(99,102,241,0.2)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.border = 'none'
        }}
      >
        <Settings size={13} color="#334155" strokeWidth={1.5} />
      </button>
    </aside>
  )
}
