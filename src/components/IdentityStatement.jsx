import { useState, useEffect, useRef } from 'react'

const GOLD  = '#f0c040'
const MUTED = '#7a95c0'

// Circumference of circle with r=15: 2 * pi * 15 ≈ 94.248
const CIRCUMFERENCE = 2 * Math.PI * 15

// Props: { statement, dayNumber, dateStr, onContinue }
export default function IdentityStatement({ statement, dayNumber, dateStr, onContinue }) {
  const [elapsed, setElapsed]       = useState(0)   // ms elapsed
  const [showButton, setShowButton] = useState(false)
  const intervalRef                 = useRef(null)
  const autoDoneRef                 = useRef(null)

  useEffect(() => {
    // Tick every 100ms
    intervalRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 100
        if (next >= 3000) {
          clearInterval(intervalRef.current)
          setShowButton(true)
        }
        return Math.min(next, 3000)
      })
    }, 100)

    // Auto-continue at 5 seconds
    autoDoneRef.current = setTimeout(() => {
      onContinue()
    }, 5000)

    return () => {
      clearInterval(intervalRef.current)
      clearTimeout(autoDoneRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Progress 0→1 over 3000ms
  const progress        = Math.min(elapsed / 3000, 1)
  const strokeDashOffset = CIRCUMFERENCE * (1 - progress)

  const formattedDate = (() => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  })()

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#000000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '0 24px',
    }}>
      {/* Center content */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        gap: 0,
        paddingTop: 48,
        paddingBottom: 48,
        maxWidth: 640,
        width: '100%',
      }}>
        {/* Belief statement */}
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 900,
          fontSize: 32,
          color: '#ffffff',
          textAlign: 'center',
          padding: '0 48px',
          lineHeight: 1.3,
          letterSpacing: '0.01em',
        }}>
          {statement}
        </div>

        {/* Gold divider */}
        <div style={{
          width: 80,
          height: 1,
          background: GOLD,
          marginTop: 32,
          marginBottom: 16,
          borderRadius: 1,
        }} />

        {/* Day number */}
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 900,
          fontSize: 24,
          color: GOLD,
          letterSpacing: '0.06em',
        }}>
          DAY {dayNumber}
        </div>

        {/* Today's date */}
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 12,
          color: MUTED,
          marginTop: 6,
          letterSpacing: '0.02em',
        }}>
          {formattedDate}
        </div>
      </div>

      {/* Bottom: countdown ring + continue button */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        paddingBottom: 56,
      }}>
        {/* SVG countdown ring */}
        <svg width="36" height="36" viewBox="0 0 36 36" style={{ display: 'block' }}>
          {/* Track */}
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="rgba(240,192,64,0.2)"
            strokeWidth="3"
          />
          {/* Gold progress arc — starts from top (rotate -90deg) */}
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke={GOLD}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashOffset}
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '18px 18px',
              transition: 'stroke-dashoffset 0.1s linear',
            }}
          />
        </svg>

        {/* Continue button — appears after 3s */}
        <button
          onClick={onContinue}
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: 15,
            letterSpacing: '0.12em',
            color: showButton ? '#000' : 'transparent',
            background: showButton ? GOLD : 'transparent',
            border: showButton ? `1px solid ${GOLD}` : '1px solid transparent',
            borderRadius: 8,
            padding: '12px 36px',
            cursor: showButton ? 'pointer' : 'default',
            transition: 'color 0.3s, background 0.3s, border-color 0.3s',
            pointerEvents: showButton ? 'auto' : 'none',
            minWidth: 160,
          }}
        >
          CONTINUE →
        </button>
      </div>
    </div>
  )
}
