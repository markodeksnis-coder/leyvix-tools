import { today } from '../utils'

export default function Heatmap({ logs = [], fails = [] }) {
  const logSet = new Set(logs)
  const failSet = new Set(fails)
  const todayStr = today()

  // Build 53 weeks ending today, aligned to start on Sunday
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date(end)
  start.setDate(start.getDate() - 364)
  const dow = start.getDay()
  start.setDate(start.getDate() - dow)

  const weeks = []
  const cur = new Date(start)
  let wk = []

  while (cur <= end) {
    const ds = cur.toISOString().split('T')[0]
    const isFuture = ds > todayStr
    wk.push({ ds, isFuture, done: logSet.has(ds) && !isFuture, failed: failSet.has(ds) && !isFuture })
    if (cur.getDay() === 6) { weeks.push(wk); wk = [] }
    cur.setDate(cur.getDate() + 1)
  }
  if (wk.length) weeks.push(wk)

  // Month labels
  const monthLabels = []
  weeks.forEach((wk, wi) => {
    const first = wk.find(c => !c.isFuture)
    if (first) {
      const d = new Date(first.ds + 'T12:00:00')
      if (d.getDate() <= 7) {
        monthLabels[wi] = d.toLocaleDateString('en-US', { month: 'short' })
      }
    }
  })

  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        {/* Month labels */}
        <div className="flex gap-[3px] mb-1 pl-0">
          {weeks.map((_, wi) => (
            <div key={wi} className="w-[11px] text-[9px] font-mono text-[#444] shrink-0">
              {monthLabels[wi] || ''}
            </div>
          ))}
        </div>
        {/* Grid */}
        <div className="flex gap-[3px]">
          {weeks.map((wk, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {Array.from({ length: 7 }, (_, di) => {
                const cell = wk[di]
                if (!cell) return <div key={di} className="w-[11px] h-[11px] shrink-0" />
                const bg = cell.isFuture ? 'bg-[#0d0d0d]'
                  : cell.done ? 'bg-green-600'
                  : cell.failed ? 'bg-red-900/60'
                  : 'bg-[#1e1e1e]'
                const ring = cell.ds === todayStr ? 'ring-1 ring-[#facc15]' : ''
                return (
                  <div
                    key={di}
                    className={`w-[11px] h-[11px] shrink-0 ${bg} ${ring}`}
                    title={cell.ds}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
