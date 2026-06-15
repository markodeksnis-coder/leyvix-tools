import { useState } from 'react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Heatmap({ logs = [], fails = [] }) {
  const [tooltip, setTooltip] = useState(null)
  const logSet = new Set(logs)
  const failSet = new Set(fails)
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  const todayStr = todayDate.toISOString().split('T')[0]

  const start = new Date(todayDate)
  start.setDate(start.getDate() - start.getDay() - 52 * 7)

  const weeks = []
  const monthLabels = []
  let lastMonth = -1

  for (let w = 0; w < 53; w++) {
    const days = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(start)
      date.setDate(start.getDate() + w * 7 + d)
      const ds = date.toISOString().split('T')[0]
      const isFuture = date > todayDate
      const isToday = ds === todayStr

      let color = '#0d0d0d'
      if (!isFuture) {
        if (logSet.has(ds)) color = '#dc2626'
        else if (failSet.has(ds)) color = '#2d0000'
        else color = '#1a1a1a'
      }

      if (d === 0) {
        const m = date.getMonth()
        if (m !== lastMonth) { monthLabels.push({ week: w, label: MONTHS[m] }); lastMonth = m }
        else monthLabels.push(null)
      }

      days.push({ ds, color, isToday })
    }
    weeks.push(days)
  }

  const statusLabel = (color) => {
    if (color === '#dc2626') return 'done'
    if (color === '#2d0000') return 'failed'
    if (color === '#0d0d0d') return 'future'
    return 'missed'
  }

  return (
    <div className="relative">
      <div className="flex gap-0 mb-1">
        {monthLabels.map((ml, i) => (
          <div key={i} className="shrink-0 text-[8px] font-mono text-[#333]" style={{ width: 14 }}>
            {ml ? ml.label : ''}
          </div>
        ))}
      </div>
      <div className="flex gap-[2px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[2px]">
            {week.map(({ ds, color, isToday }) => (
              <div
                key={ds}
                className={`w-3 h-3 cursor-default hover:opacity-70 transition-opacity ${isToday ? 'ring-1 ring-[#dc2626] ring-offset-[1px] ring-offset-[#0f0f0f]' : ''}`}
                style={{ backgroundColor: color }}
                onMouseEnter={e => setTooltip({ ds, status: statusLabel(color), x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setTooltip(null)}
              />
            ))}
          </div>
        ))}
      </div>
      {tooltip && (
        <div
          className="fixed z-50 bg-[#141414] border border-[#2a2a2a] px-2 py-1 text-[9px] font-mono text-[#888] pointer-events-none"
          style={{ left: tooltip.x + 10, top: tooltip.y - 28 }}
        >
          {tooltip.ds} · {tooltip.status}
        </div>
      )}
    </div>
  )
}
