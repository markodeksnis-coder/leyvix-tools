import { useState } from 'react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Heatmap({ logs = [], fails = [] }) {
  const [tooltip, setTooltip] = useState(null)
  const logSet = new Set(logs)
  const failSet = new Set(fails)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const todayStr = now.toISOString().split('T')[0]
  const curMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Only months with at least one log/fail + current month, newest first
  const monthSet = new Set([curMonthStr])
  ;[...logs, ...fails].forEach(d => { if (d) monthSet.add(d.substring(0, 7)) })
  const sortedMonths = [...monthSet].sort().reverse()

  const getCellColor = (ds) => {
    if (ds > todayStr) return '#0d0d0d'
    if (logSet.has(ds)) return '#16a34a'
    if (failSet.has(ds)) return '#7f1d1d'
    return '#1c1c1c'
  }

  const getStatus = (ds, color) => {
    if (ds > todayStr) return 'future'
    if (color === '#16a34a') return 'done'
    if (color === '#7f1d1d') return 'failed'
    return 'missed'
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4 }}>
        {sortedMonths.map(monthStr => {
          const [yearStr, mStr] = monthStr.split('-')
          const year = parseInt(yearStr)
          const monthIdx = parseInt(mStr)
          const month = monthIdx - 1
          const daysInMonth = new Date(year, monthIdx, 0).getDate()
          const firstDow = new Date(year, month, 1).getDay()

          const cells = []
          for (let i = 0; i < firstDow; i++) cells.push(null)
          for (let d = 1; d <= daysInMonth; d++) {
            cells.push(`${yearStr}-${mStr}-${String(d).padStart(2, '0')}`)
          }
          while (cells.length % 7 !== 0) cells.push(null)

          const weeks = []
          for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

          return (
            <div key={monthStr} style={{ flexShrink: 0 }}>
              <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#555', marginBottom: 6 }}>
                {MONTHS[month]}{year !== now.getFullYear() ? ` ${year}` : ''}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {weeks.map((week, wi) => (
                  <div key={wi} style={{ display: 'flex', gap: 3 }}>
                    {week.map((ds, di) => {
                      if (!ds) return <div key={di} style={{ width: 14, height: 14 }} />
                      const color = getCellColor(ds)
                      const isToday = ds === todayStr
                      return (
                        <div
                          key={ds}
                          style={{
                            width: 14,
                            height: 14,
                            backgroundColor: color,
                            outline: isToday ? '1px solid #dc2626' : 'none',
                            outlineOffset: 1,
                            cursor: 'default',
                            flexShrink: 0,
                          }}
                          onMouseEnter={e => setTooltip({ ds, status: getStatus(ds, color), x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ fontFamily: 'Inter', fontSize: 10, color: '#555', marginTop: 8 }}>
        {logs.length} days logged
      </div>
      {tooltip && (
        <div
          className="fixed z-50 bg-[#141414] border border-[#2a2a2a] px-2 py-1 pointer-events-none"
          style={{ left: tooltip.x + 10, top: tooltip.y - 28, fontFamily: 'Inter', fontSize: 10, color: '#888' }}
        >
          {tooltip.ds} · {tooltip.status}
        </div>
      )}
    </div>
  )
}
