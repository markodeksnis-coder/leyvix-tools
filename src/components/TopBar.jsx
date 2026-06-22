import { useLocalStorage } from '../hooks/useLocalStorage'

export default function TopBar({ section }) {
  const [markoDaily] = useLocalStorage('marko_daily', {})

  const todayKey = new Date().toISOString().split('T')[0]

  // Today's score = checked items / total items for today's date
  const todayData = markoDaily[todayKey] || {}
  const items = Object.values(todayData)
  const totalItems = items.length
  const checkedItems = items.filter(Boolean).length
  const score = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0

  // Streak = consecutive days where ALL non-negotiables (isNonNeg=true) are checked
  // marko_daily structure assumed: { [dateKey]: { [itemId]: boolean } }
  // We also check marko_daily_meta for non-neg info, falling back to all items
  const markoItems = (() => {
    try {
      const raw = window.localStorage.getItem('marko_daily_items')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })()
  const nonNegIds = markoItems.filter(i => i.isNonNeg).map(i => i.id)

  const calcStreak = () => {
    let streak = 0
    const d = new Date()
    // Start from today, go backwards
    for (let i = 0; i < 365; i++) {
      const key = d.toISOString().split('T')[0]
      const dayData = markoDaily[key] || {}
      let allChecked = false
      if (nonNegIds.length > 0) {
        allChecked = nonNegIds.every(id => dayData[id])
      } else {
        // fallback: at least something checked
        allChecked = Object.values(dayData).some(Boolean)
      }
      if (allChecked) {
        streak++
        d.setDate(d.getDate() - 1)
      } else {
        break
      }
    }
    return streak
  }

  const streak = calcStreak()

  // Format date: "SAT JUN 21"
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).toUpperCase().replace(',', '')

  return (
    <div style={{
      background: '#040810',
      borderBottom: '1px solid #1e3050',
      padding: '12px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      {/* Left: date + section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{
          fontSize: 9,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          color: '#7a95c0',
          textTransform: 'uppercase',
          letterSpacing: '0.3em',
        }}>
          {dateStr}
        </span>
        <span style={{
          fontFamily: '"Orbitron", "Space Grotesk", sans-serif',
          fontWeight: 700,
          fontSize: 18,
          color: '#ffffff',
          textTransform: 'uppercase',
          lineHeight: 1,
        }}>
          {section}
        </span>
      </div>

      {/* Right: streak + score pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Streak pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: '#1a0f00',
          border: '1px solid #5a4000',
          borderRadius: 9999,
          padding: '4px 10px',
        }}>
          <span style={{ fontSize: 12 }}>🔥</span>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: 12,
            color: '#f0c040',
          }}>
            {streak}d
          </span>
        </div>

        {/* Score pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: '#0a1428',
          border: '1px solid #1a3a7a',
          borderRadius: 9999,
          padding: '4px 10px',
        }}>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: 12,
            color: '#4d9fff',
          }}>
            {score}%
          </span>
        </div>
      </div>
    </div>
  )
}
