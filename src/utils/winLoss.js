// Win/Loss day calculation engine

export const DEFAULT_WIN_SETTINGS = {
  threshold: 65,
  metrics: {
    calories:  { enabled: true,  target: 2000 },
    protein:   { enabled: true,  target: 150  },
    steps:     { enabled: true,  target: 8000 },
    gym:       { enabled: true               },
    workHours: { enabled: true,  target: 7   },
    nonNeg:    { enabled: true               },
    tasks:     { enabled: true               },
    dailyRating: { enabled: true, threshold: 5 },
    mood:        { enabled: true             },
  },
}

export function getWinDaySettings() {
  try {
    const raw = localStorage.getItem('marko_winday_settings')
    if (!raw) return DEFAULT_WIN_SETTINGS
    const p = JSON.parse(raw)
    const d = DEFAULT_WIN_SETTINGS
    return {
      threshold: p.threshold ?? d.threshold,
      metrics: {
        calories:    { ...d.metrics.calories,    ...p.metrics?.calories    },
        protein:     { ...d.metrics.protein,     ...p.metrics?.protein     },
        steps:       { ...d.metrics.steps,       ...p.metrics?.steps       },
        gym:         { ...d.metrics.gym,         ...p.metrics?.gym         },
        workHours:   { ...d.metrics.workHours,   ...p.metrics?.workHours   },
        nonNeg:      { ...d.metrics.nonNeg,      ...p.metrics?.nonNeg      },
        tasks:       { ...d.metrics.tasks,       ...p.metrics?.tasks       },
        dailyRating: { ...d.metrics.dailyRating, ...p.metrics?.dailyRating },
        mood:        { ...d.metrics.mood,        ...p.metrics?.mood        },
      },
    }
  } catch { return DEFAULT_WIN_SETTINGS }
}

export function saveWinDaySettings(settings) {
  localStorage.setItem('marko_winday_settings', JSON.stringify(settings))
}

// Returns { passed, available, pct, isWin, metrics: [{key,label,pass}] }
export function calcDayScore(dateStr, settings, dailyData, bodyData, dietData) {
  const s = settings
  const log = dailyData?.logs?.[dateStr]
  const items = log?.items || []
  const results = []
  const dietEntry = (dietData?.history || []).find(h => h.date === dateStr)
  const hasDiet = dietEntry && (dietEntry.calories > 0 || dietEntry.protein > 0)

  if (s.metrics.calories.enabled && hasDiet) {
    results.push({
      key: 'calories', label: 'Calories',
      pass: (dietEntry.calories || 0) > 0 && (dietEntry.calories || 0) <= s.metrics.calories.target,
    })
  }

  if (s.metrics.protein.enabled && hasDiet) {
    results.push({
      key: 'protein', label: 'Protein',
      pass: (dietEntry.protein || 0) >= s.metrics.protein.target,
    })
  }

  if (s.metrics.steps.enabled && log?.steps != null) {
    results.push({ key: 'steps', label: 'Steps', pass: log.steps >= s.metrics.steps.target })
  }

  // Gym only counts on days user has a Training non-neg
  if (s.metrics.gym.enabled) {
    const hasTrainingNN = items.some(i => i.isNonNeg && /training|gym|workout/i.test(i.title))
    if (hasTrainingNN) {
      const trained = [...(bodyData?.liftSessions || []), ...(bodyData?.workouts || [])].some(w => w.date === dateStr)
      results.push({ key: 'gym', label: 'Gym Session', pass: trained })
    }
  }

  if (s.metrics.workHours.enabled && log?.workOutput != null) {
    results.push({ key: 'workHours', label: 'Work Output', pass: log.workOutput >= s.metrics.workHours.target })
  }

  if (s.metrics.nonNeg.enabled) {
    const nnItems = items.filter(i => i.isNonNeg)
    if (nnItems.length > 0) {
      results.push({ key: 'nonNeg', label: 'Non-Negotiables', pass: nnItems.every(i => i.checked) })
    }
  }

  if (s.metrics.tasks.enabled) {
    const taskItems = items.filter(i => !i.isNonNeg)
    if (taskItems.length > 0) {
      results.push({ key: 'tasks', label: 'Daily Tasks', pass: taskItems.filter(i => i.checked).length / taskItems.length >= 0.8 })
    }
  }

  if (s.metrics.dailyRating.enabled && log?.dailyRating != null) {
    const threshold = s.metrics.dailyRating.threshold ?? 5
    results.push({ key: 'dailyRating', label: 'Day Rating', pass: log.dailyRating >= threshold })
  }

  if (s.metrics.mood.enabled && log?.mood != null) {
    const goodMoods = ['Excellent', 'Good', 'Neutral']
    results.push({ key: 'mood', label: 'Mood', pass: goodMoods.includes(log.mood) })
  }

  const available = results.length
  const passed = results.filter(r => r.pass).length
  const pct = available > 0 ? Math.round((passed / available) * 100) : 0
  return { passed, available, pct, isWin: available > 0 && pct >= s.threshold, metrics: results }
}

// Last `days` calendar days
export function getWinHistory(days, settings, dailyData, bodyData, dietData) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i))
    const ds = d.toISOString().split('T')[0]
    return { date: ds, ...calcDayScore(ds, settings, dailyData, bodyData, dietData) }
  })
}

export function computeCurrentWinStreak(history) {
  const todayStr = new Date().toISOString().split('T')[0]
  let streak = 0
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i]
    if (h.available === 0) { if (h.date === todayStr) continue; break }
    if (h.isWin) { streak++ }
    else { if (h.date === todayStr) continue; break }
  }
  return streak
}

export function computeCurrentLossStreak(history) {
  const todayStr = new Date().toISOString().split('T')[0]
  let streak = 0
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i]
    if (h.available === 0) { if (h.date === todayStr) continue; break }
    if (!h.isWin) { streak++ }
    else { if (h.date === todayStr) continue; break }
  }
  return streak
}

export function computeLongestWinStreak(settings, dailyData, bodyData, dietData) {
  const dateSet = new Set()
  for (let i = 89; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    dateSet.add(d.toISOString().split('T')[0])
  }
  Object.keys(dailyData?.logs || {}).forEach(k => dateSet.add(k))
  const dates = [...dateSet].sort()
  let longest = 0, current = 0, prevDate = null
  for (const ds of dates) {
    const r = calcDayScore(ds, settings, dailyData, bodyData, dietData)
    if (r.available === 0) { current = 0; prevDate = null; continue }
    if (r.isWin) {
      if (prevDate) {
        const diff = Math.round((new Date(ds + 'T12:00:00') - new Date(prevDate + 'T12:00:00')) / 86400000)
        current = diff === 1 ? current + 1 : 1
      } else { current = 1 }
      if (current > longest) longest = current
    } else { current = 0 }
    prevDate = ds
  }
  return longest
}

// For LifeCycles: 30 data points, win=1, loss=0, no data=null
export function getWinRatePoints(settings, dailyData, bodyData, dietData) {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i))
    const ds = d.toISOString().split('T')[0]
    const r = calcDayScore(ds, settings, dailyData, bodyData, dietData)
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    return { date: ds, label, value: r.available > 0 ? (r.isWin ? 1 : 0) : null }
  })
}
