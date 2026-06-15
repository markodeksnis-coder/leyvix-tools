// ─── Date helpers ───────────────────────────────────────────────────────────

export const today = () => new Date().toISOString().split('T')[0]

export function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

export function dateRange(from, to) {
  // from = higher daysAgo number (older), to = lower (more recent)
  const arr = []
  for (let i = from; i >= to; i--) arr.push(daysAgo(i))
  return arr
}

// ─── Streak calculation ─────────────────────────────────────────────────────

export function calcStreak(logs = []) {
  const logSet = new Set(logs)
  const todayStr = today()
  const ystrdStr = daysAgo(1)
  const isActiveToday = logSet.has(todayStr)

  // Current streak: walk back from today (or yesterday)
  let current = 0
  const anchor = isActiveToday ? new Date() : new Date(Date.now() - 86400000)
  if (logSet.has(anchor.toISOString().split('T')[0])) {
    const d = new Date(anchor)
    while (logSet.has(d.toISOString().split('T')[0])) {
      current++
      d.setDate(d.getDate() - 1)
    }
  }

  // Longest streak + last broken date
  let longest = 0
  let lastBroken = null
  if (logs.length > 0) {
    const sorted = [...new Set(logs)].sort()
    const d = new Date(sorted[0] + 'T00:00:00')
    const end = new Date()
    let run = 0
    while (d <= end) {
      const ds = d.toISOString().split('T')[0]
      if (logSet.has(ds)) {
        run++
        if (run > longest) longest = run
      } else {
        if (run > 0) lastBroken = ds
        run = 0
      }
      d.setDate(d.getDate() + 1)
    }
  }

  // This-week count (Mon → today)
  const now = new Date()
  const dow = now.getDay()
  const mon = new Date(now)
  mon.setDate(mon.getDate() - (dow === 0 ? 6 : dow - 1))
  mon.setHours(0, 0, 0, 0)
  const weekCount = logs.filter(d => new Date(d + 'T00:00:00') >= mon).length

  // This-month count
  const ms = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthCount = logs.filter(d => d >= ms).length

  return { current, longest, lastBroken, isActiveToday, weekCount, monthCount }
}

// ─── Formatting ─────────────────────────────────────────────────────────────

export function fmtDate(ds) {
  if (!ds) return '—'
  return new Date(ds + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

export function fmtShort(ds) {
  if (!ds) return '—'
  return new Date(ds + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function daysAgoLabel(ds) {
  if (!ds) return '—'
  const n = Math.floor((Date.now() - new Date(ds + 'T12:00:00')) / 86400000)
  if (n === 0) return 'today'
  if (n === 1) return 'yesterday'
  return `${n}d ago`
}

export function monthRevenue(deals = []) {
  const ms = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  return deals
    .filter(d => d.status === 'Closed' && d.date >= ms)
    .reduce((s, d) => s + (parseFloat(d.value) || 0), 0)
}

export function pct(current, target) {
  if (!target) return 0
  return Math.min(100, Math.round((current / target) * 100))
}
