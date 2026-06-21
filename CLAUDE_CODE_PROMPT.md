# {APP_NAME} — Base Platform Scaffold Prompt

> **Copy this entire file into a fresh Claude Code session.**
> Fill the three placeholders at the top, then run.
> Everything below is an instruction to Claude Code, not to you.

```
APP_NAME    = {APP_NAME}        # e.g. "Marko OS"
TAGLINE     = {TAGLINE}         # e.g. "Personal performance OS"
PRIMARY_DOMAIN = {PRIMARY_DOMAIN}  # e.g. "markoos.app"
```

---

## 1. Role & Mission

You are a senior full-stack engineer. Build the base of a personal performance OS platform called **{APP_NAME}** — `{TAGLINE}`. It tracks daily check-ins (sleep, energy, mood, stress, training), habit streaks, AI-generated insights, and provides an AI coach interface.

Deliver a working shell: design system, routing, data store, one fully-built module (Daily Check-Ins + /insights), and clearly-marked stubs for every other life-area module. The owner will build the stubs out themselves.

---

## 2. Non-Negotiables

Follow every rule below without exception. If a rule conflicts with your defaults, the rule wins.

- **File-based routing only.** All routes live under `src/routes/`. No `src/pages/` directory.
- **No hardcoded colors in JSX.** Every color must reference a CSS token from `src/styles.css`. Never write `text-orange-500`, `bg-[#f59e0b]`, or any raw hex in a component file.
- **Server-side secrets only.** API keys are read exclusively inside `createServerFn` `.handler()` bodies via `process.env`. Never reference `import.meta.env.VITE_*` for secrets.
- **Design tokens are the single source of truth.** All palette, spacing, radius, and shadow values live in `src/styles.css` under `@theme`. Zero duplication in JS.
- **Never invent files that don't exist.** If you reference a component or utility, create it. If you extend an existing file, read it first.
- **TypeScript everywhere.** All new files use `.tsx` or `.ts`. No implicit `any`.
- **No `tailwind.config.js`.** Tailwind v4 is CSS-first. All customisation is in `src/styles.css`.

---

## 3. Tech Stack

### Install Commands (run in order)

```bash
# 1. Bootstrap TanStack Start
npx create-tanstack@latest --template react-start-basic

# 2. Add Tailwind v4 (CSS-first)
npm install tailwindcss@next @tailwindcss/vite@next

# 3. UI components
npx shadcn@latest init
npx shadcn@latest add dialog sheet tooltip progress

# 4. Charts & motion
npm install recharts framer-motion

# 5. Utilities
npm install date-fns clsx tailwind-merge zod

# 6. AI (optional Supabase upgrade path — add when ready)
# npm install @supabase/supabase-js
```

### Vite config addition

```ts
// vite.config.ts — add inside plugins array
import tailwindcss from '@tailwindcss/vite'
// ...
plugins: [tanstackStart(), tailwindcss()]
```

### Versions locked

| Package | Version |
|---|---|
| tanstack/start | ^1.0.0 |
| react | 19 |
| vite | ^7 |
| tailwindcss | ^4 |
| recharts | ^2 |
| framer-motion | ^11 |

---

## 4. Design System

### 4a. `src/styles.css` — Full token set

Create or replace this file entirely:

```css
@import "tailwindcss";

@theme {
  /* ── Palette ── */
  --color-navy-deep:     #020617;
  --color-navy:          #0f172a;
  --color-panel:         #0a1226;
  --color-panel-raised:  #111c35;
  --color-border:        #1e2d4a;
  --color-border-bright: #2e4068;

  --color-gold:          #f59e0b;
  --color-gold-soft:     #fcd34d;
  --color-gold-deep:     #b45309;
  --color-gold-muted:    #78450a;

  --color-indigo:        #818cf8;
  --color-indigo-dim:    #4f5fa8;

  --color-success:       #22c55e;
  --color-danger:        #ef4444;
  --color-warning:       #f97316;

  --color-text:          #f1f5f9;
  --color-text-muted:    #64748b;
  --color-text-dim:      #334155;

  /* ── Fonts ── */
  --font-display:  'Space Grotesk', system-ui, sans-serif;
  --font-body:     'DM Sans', system-ui, sans-serif;
  --font-mono:     'JetBrains Mono', monospace;

  /* ── Radius ── */
  --radius-tile:   12px;
  --radius-card:   8px;
  --radius-chip:   4px;

  /* ── Shadows ── */
  --shadow-tile:   0 4px 24px rgba(0,0,0,0.4);
  --shadow-gold:   0 0 24px rgba(245,158,11,0.25);
  --shadow-glow:   0 0 40px rgba(245,158,11,0.12);
}

/* ── Google Fonts ── */
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap');

/* ── Base ── */
html, body { background: var(--color-navy-deep); color: var(--color-text); font-family: var(--font-body); }
* { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: var(--color-navy-deep); }
::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }

/* ── Utility classes ── */

/* Bento tile — standard grid card */
.bento-tile {
  background: var(--color-panel);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-tile);
  padding: 20px;
  box-shadow: var(--shadow-tile);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.bento-tile:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-tile), 0 0 0 1px var(--color-border-bright);
}

/* Ledger panel — full-width data table container */
.ledger-panel {
  background: var(--color-panel);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-tile);
}

/* Tilt tile — card that lifts more on hover */
.tilt-tile {
  background: var(--color-panel-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-tile);
  padding: 20px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}
.tilt-tile:hover {
  transform: translateY(-4px) rotate(0.3deg);
  box-shadow: var(--shadow-gold);
}

/* Blaze text — gold vertical gradient for hero numbers */
.blaze-text {
  background: linear-gradient(180deg, var(--color-gold-soft) 0%, var(--color-gold) 50%, var(--color-gold-deep) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Glow gold — border + shadow pulse for active/record state */
.glow-gold {
  border-color: var(--color-gold-muted) !important;
  box-shadow: 0 0 0 1px var(--color-gold-muted), var(--shadow-gold);
}

/* Signal sweep — animated underline on focus */
.signal-sweep {
  position: relative;
}
.signal-sweep::after {
  content: '';
  position: absolute;
  bottom: -2px; left: 0;
  width: 0; height: 1px;
  background: var(--color-gold);
  transition: width 0.3s ease;
}
.signal-sweep:focus-within::after,
.signal-sweep:hover::after { width: 100%; }

/* Count pulse — brief scale pop on number mount (add via framer-motion, class is a hint) */
.count-pulse { will-change: transform; }

/* Flame flicker — for streak fire emoji / badge */
@keyframes flame-flicker {
  0%, 100% { opacity: 1; transform: scaleY(1); }
  50%       { opacity: 0.85; transform: scaleY(0.96); }
}
.flame-flicker { animation: flame-flicker 1.4s ease-in-out infinite; }

/* Label utilities */
.label-upper {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
```

### 4b. Motion Principles

- **Tile hover:** `translateY(-2px)` in 180 ms ease — never bounce, never spring.
- **Metric mount:** count-up from 0 using framer-motion `useMotionValue` + `useTransform`, duration 0.8s.
- **Signal strip:** rotate to the next item every 8 s, crossfade 300 ms.
- **Gold underline sweep:** `.signal-sweep` class, CSS only.
- **No parallax. No 3-D perspective. No bouncy springs.**

---

## 5. Information Architecture

Create every route file listed. Stub routes get a placeholder component with correct `<title>` meta only — no layout work.

### Real routes (fully implement)

| Route | File | Purpose |
|---|---|---|
| `/` | `src/routes/index.tsx` | Home — "The Record". Hero + SignalStrip + BentoLedger |
| `/insights` | `src/routes/insights.tsx` | Pulse rings, 30-day trends, correlations, weekly briefing, fatigue forecast |
| `/coach` | `src/routes/coach.tsx` | AI coach chat + CoachAlertBanner |
| `/settings` | `src/routes/settings.tsx` | Profile, theme, data export |

### Stub routes (file + head meta + `// EXTEND HERE` comment only)

`/body`, `/mind`, `/soul`, `/relations`, `/business`, `/growth`

Stub template:

```tsx
// src/routes/body.tsx
// EXTEND HERE — Body module
// Pattern: add store slice in src/store/body.ts, bento tile in home BentoLedger, optional insights contribution.
import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/body')({ component: BodyPage })
function BodyPage() {
  return (
    <main className="p-8">
      <h1 className="font-display text-3xl blaze-text">Body</h1>
      <p className="text-[var(--color-text-muted)] mt-2">Module coming soon.</p>
    </main>
  )
}
```

---

## 6. Data Model

Create `src/types.ts`:

```ts
export interface Habit {
  id: string
  name: string
  icon: string
  category: 'health' | 'fitness' | 'mind' | 'soul' | 'business' | 'other'
  target: 'daily' | 'weekdays' | 'weekends'
  logs: string[]   // ISO date strings logged
  fails: string[]  // ISO date strings marked failed
  createdAt: string
}

export interface DailyLog {
  date: string          // YYYY-MM-DD
  sleep: number         // hours (0–12)
  energy: number        // 1–10
  mood: number          // 1–10
  stress: number        // 1–10
  workOutput: number    // 1–10
  training: boolean
  caloriesIn?: number
  win?: string          // one-line daily win
  loss?: string         // one-line daily loss
  loggedAt: number      // epoch ms
}

export interface MindEntry {
  id: string
  date: string
  category: 'book' | 'article' | 'podcast' | 'lesson' | 'other'
  title: string
  takeaway: string
}

export interface Person {
  id: string
  name: string
  relationship: string
  lastContactDate?: string
  energyLevel: 'positive' | 'neutral' | 'draining'
  notes?: string
}

export interface Deal {
  id: string
  prospect: string
  value: number
  status: 'lead' | 'appointment' | 'no-show' | 'closed' | 'lost'
  date: string
}

export interface Video {
  id: string
  title: string
  channel: string
  pillar: 'mindset' | 'business' | 'social' | 'style' | 'health'
  youtubeUrl: string
  videoId: string
  watched: boolean
  rating: number | null
  dateAdded: string
}

export interface WeeklyReview {
  weekStart: string  // ISO date of Monday
  wins: string[]
  losses: string[]
  focus: string
  aiSummary?: string
}

export interface AiBriefing {
  date: string
  orders: string[]    // 4 numbered items
  read: string        // 1–2 sentence situation
  watch: string       // 1 sentence risk
  readiness: number   // 0–100
  generatedAt: number
}
```

### Local-first store — `src/store/index.ts`

```ts
// Zustand-style localStorage store. Upgrade path: replace localStorage calls
// with Supabase realtime queries without changing component APIs.

import type { Habit, DailyLog, MindEntry, Deal, Video, AiBriefing } from '../types'

const KEY = '{APP_NAME}_store_v1'

interface Store {
  habits: Habit[]
  logs: Record<string, DailyLog>   // keyed by YYYY-MM-DD
  mind: MindEntry[]
  deals: Deal[]
  videos: Video[]
  briefings: AiBriefing[]
}

function load(): Store {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? seed() }
  catch { return seed() }
}

function save(s: Store) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function getStore(): Store { return load() }

export function updateStore(fn: (s: Store) => Store) {
  const next = fn(load())
  save(next)
  window.dispatchEvent(new Event('store-update'))
}

// React hook — re-renders on store-update
import { useState, useEffect } from 'react'
export function useStore() {
  const [s, setS] = useState<Store>(load)
  useEffect(() => {
    const handler = () => setS(load())
    window.addEventListener('store-update', handler)
    return () => window.removeEventListener('store-update', handler)
  }, [])
  return s
}

// Seed with one sample habit so the UI isn't empty on first load
function seed(): Store {
  const s: Store = { habits: [], logs: {}, mind: [], deals: [], videos: [], briefings: [] }
  s.habits = [{
    id: '1', name: 'Morning Log', icon: '☀️', category: 'health',
    target: 'daily', logs: [], fails: [], createdAt: new Date().toISOString()
  }]
  save(s)
  return s
}
```

---

## 7. Insights Math

Create `src/lib/insights.ts`. Implement the following pure functions — no side effects.

```ts
import { differenceInDays, subDays, format } from 'date-fns'
import type { DailyLog, Habit } from '../types'

// ── Pearson correlation (rolling, lag-1 optional) ──────────────────────────
// Returns null when N < 5 (insufficient data).
export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length)
  if (n < 5) return null
  const meanX = xs.slice(0, n).reduce((a, b) => a + b, 0) / n
  const meanY = ys.slice(0, n).reduce((a, b) => a + b, 0) / n
  let num = 0, dx = 0, dy = 0
  for (let i = 0; i < n; i++) {
    const ex = xs[i] - meanX, ey = ys[i] - meanY
    num += ex * ey; dx += ex * ex; dy += ey * ey
  }
  const denom = Math.sqrt(dx * dy)
  return denom === 0 ? null : num / denom
}

// Correlation between two daily log fields over the last `days` days.
// lag=1 means Y is shifted one day forward (e.g. sleep → next-day energy).
export function logCorrelation(
  logs: Record<string, DailyLog>,
  fieldX: keyof DailyLog,
  fieldY: keyof DailyLog,
  days = 30,
  lag = 0
): number | null {
  const today = new Date()
  const xs: number[] = [], ys: number[] = []
  for (let i = lag; i < days + lag; i++) {
    const dx = format(subDays(today, i), 'yyyy-MM-dd')
    const dy = format(subDays(today, i - lag), 'yyyy-MM-dd')
    const lx = logs[dx], ly = logs[dy]
    if (lx && ly) {
      const vx = lx[fieldX], vy = ly[fieldY]
      if (typeof vx === 'number' && typeof vy === 'number') {
        xs.push(vx); ys.push(vy)
      }
    }
  }
  return pearson(xs, ys)
}

// ── Sleep debt ─────────────────────────────────────────────────────────────
export function sleepDebt7d(logs: Record<string, DailyLog>, target = 8): number {
  let debt = 0
  for (let i = 0; i < 7; i++) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
    debt += target - (logs[d]?.sleep ?? target)
  }
  return Math.max(0, debt)
}

// ── Streak detection ───────────────────────────────────────────────────────
export function currentStreak(logs: string[]): number {
  const today = format(new Date(), 'yyyy-MM-dd')
  const set = new Set(logs)
  let streak = 0, d = new Date()
  while (true) {
    const ds = format(d, 'yyyy-MM-dd')
    if (!set.has(ds)) break
    streak++; d = subDays(d, 1)
  }
  return streak
}

export function longestStreak(logs: string[]): number {
  if (!logs.length) return 0
  const sorted = [...logs].sort()
  let best = 1, cur = 1
  for (let i = 1; i < sorted.length; i++) {
    const diff = differenceInDays(new Date(sorted[i]), new Date(sorted[i - 1]))
    if (diff === 1) { cur++; best = Math.max(best, cur) } else cur = 1
  }
  return best
}

// ── Fatigue forecast ───────────────────────────────────────────────────────
// Returns a 3-day band: { low, mid, high } score (0–100) per day.
// Inputs: 7-day sleep debt, recent stress/training load momentum.
export interface FatigueBand { day: string; low: number; mid: number; high: number }

export function fatigueForecast(
  logs: Record<string, DailyLog>,
  days = 3
): FatigueBand[] {
  const debt = sleepDebt7d(logs)
  const today = new Date()

  // Load momentum: avg (stress + training*2) over last 7 days
  let load = 0, n = 0
  for (let i = 0; i < 7; i++) {
    const l = logs[format(subDays(today, i), 'yyyy-MM-dd')]
    if (l) { load += l.stress + (l.training ? 2 : 0); n++ }
  }
  const avgLoad = n > 0 ? load / n : 5

  const base = Math.max(0, Math.min(100, 100 - debt * 4 - avgLoad * 3))

  return Array.from({ length: days }, (_, i) => {
    const uncertainty = 8 + i * 4  // grows with forecast horizon
    return {
      day: format(subDays(today, -(i + 1)), 'yyyy-MM-dd'),
      low:  Math.max(0, Math.round(base - uncertainty)),
      mid:  Math.round(base),
      high: Math.min(100, Math.round(base + uncertainty)),
    }
  })
}
```

---

## 8. AI Integration

Create `src/server/ai.ts`. Use TanStack Start `createServerFn` — secrets are read only inside `.handler()`.

```ts
import { createServerFn } from '@tanstack/start'
import { z } from 'zod'

// ── Config ────────────────────────────────────────────────────────────────
// Set in .env (never in VITE_*):
//   AI_GATEWAY_KEY=...
//   AI_GATEWAY_URL=https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/
//   OR use Lovable Cloud Supabase Edge Function URL.
// Model: google/gemini-2.5-flash (fast, cheap, structured output friendly)

async function aiCall(prompt: string, system: string): Promise<string> {
  const url  = process.env.AI_GATEWAY_URL!
  const key  = process.env.AI_GATEWAY_KEY!
  const res  = await fetch(`${url}google/gemini-2.5-flash`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 512,
    }),
  })
  if (!res.ok) throw new Error(`AI gateway ${res.status}`)
  const data = await res.json()
  return data.content?.[0]?.text ?? data.choices?.[0]?.message?.content ?? ''
}

// ── Coach advice ──────────────────────────────────────────────────────────
export const getCoachAdvice = createServerFn({ method: 'POST' })
  .validator(z.object({ context: z.string() }))
  .handler(async ({ data }) => {
    const text = await aiCall(
      data.context,
      `You are a blunt, direct personal performance coach. Give 3-5 specific, actionable recommendations. Return JSON: { "recommendations": string[] }`
    )
    return JSON.parse(text) as { recommendations: string[] }
  })

// ── Weekly briefing ───────────────────────────────────────────────────────
export const getWeeklyBriefing = createServerFn({ method: 'POST' })
  .validator(z.object({ weekSummary: z.string() }))
  .handler(async ({ data }) => {
    const text = await aiCall(
      data.weekSummary,
      `You are an operator AI. Generate a war-room weekly briefing. Return JSON: { "headline": string, "wins": string[], "risks": string[], "focus": string }`
    )
    return JSON.parse(text) as { headline: string; wins: string[]; risks: string[]; focus: string }
  })

// ── Fatigue forecast (AI-enhanced) ───────────────────────────────────────
export const getFatigueForecast = createServerFn({ method: 'POST' })
  .validator(z.object({ sleepDebt: z.number(), avgLoad: z.number(), recentLogs: z.string() }))
  .handler(async ({ data }) => {
    const text = await aiCall(
      `Sleep debt: ${data.sleepDebt.toFixed(1)}h. Load momentum: ${data.avgLoad.toFixed(1)}. Logs: ${data.recentLogs}`,
      `You are a recovery analyst. Return JSON: { "riskLevel": "low"|"medium"|"high", "recommendation": string, "forecast": [{ "day": string, "score": number }] }`
    )
    return JSON.parse(text) as { riskLevel: string; recommendation: string; forecast: { day: string; score: number }[] }
  })
```

---

## 9. Component Inventory

Create each component at the listed path. Implement `TopNav`, `SignalStrip`, `MorningCheckIn`, and `EveningCheckIn` fully. The rest are implemented as part of their route.

### `src/components/TopNav.tsx`
**Purpose:** Fixed top navigation bar, 56px tall.  
**Props:** `active: string` — current route id.  
**Spec:**
- Left: `{APP_NAME}` wordmark (Space Grotesk 800, gold gradient), lightning bolt icon
- Center: nav tabs — Home, Insights, Body, Mind, Soul, Relations, Business, Growth, Coach
- Right: Settings gear + "DAY {N} / WAR" gold chip (compute day count from a fixed start date in settings)
- Active tab: white filled pill (`background: var(--color-text); color: var(--color-navy-deep)`)
- Inactive tab: `color: var(--color-text-muted)` hover to `var(--color-text)`
- Border bottom: `1px solid var(--color-border)`
- Background: `var(--color-navy-deep)`

### `src/components/SignalStrip.tsx`
**Purpose:** Horizontal marquee/ticker showing live stats (active streaks, today's check-in status, day count).  
**Props:** none — reads from store directly.  
**Spec:** Rotates through 4–6 signals every 8s with 300ms crossfade. Gold dot prefix `●`. Label-upper class for text.

### `src/components/TodaysOrders.tsx`
**Purpose:** AI-generated daily briefing card (war-room style).  
**Props:** `briefing: AiBriefing | null`, `onRegenerate: () => void`, `loading: boolean`.  
**Spec:** "OPERATOR AI" chip, REGENERATE button, orders list, READINESS progress bar (gold gradient fill).

### `src/components/FatigueIndex.tsx`
**Purpose:** Composite recovery score 0–100 with 7-day area sparkline.  
**Props:** `score: number`, `label: string`, `drivers: { label: string; impact: number }[]`, `chartData: { day: string; score: number }[]`.

### `src/components/MorningCheckIn.tsx`
**Purpose:** Click-to-open card that logs sleep/energy/mood. Becomes a "logged" state after submit.  
**Props:** `log: DailyLog | null`, `onSave: (data: Partial<DailyLog>) => void`.  
**Inputs:** Sleep (number, step 0.5), Energy 1–10, Mood 1–10.

### `src/components/EveningCheckIn.tsx`
**Purpose:** Click-to-open card for stress/work/training + win/loss fields.  
**Props:** `log: DailyLog | null`, `onSave: (data: Partial<DailyLog>) => void`.  
**Inputs:** Stress 1–10, Work Output 1–10, Training checkbox, Win text, Loss text.

### `src/components/CoachAlertBanner.tsx`
**Purpose:** Dismissible banner showing the top 1–2 cross-module alerts.  
**Props:** `alerts: { type: string; title: string; body: string }[]`, `onDismiss: (i: number) => void`.

### `src/components/insights/PulseRings.tsx`
**Purpose:** SVG ring set showing today's check-in scores (sleep, energy, mood, stress).  
**Props:** `log: DailyLog | null`.

### `src/components/insights/TrendChart.tsx`
**Purpose:** 30-day line chart for any daily log field.  
**Props:** `logs: Record<string, DailyLog>`, `field: keyof DailyLog`, `label: string`, `color?: string`.  
**Uses:** Recharts `AreaChart`.

### `src/components/insights/CorrelationCard.tsx`
**Purpose:** Shows one correlation result (r value, interpretation, scatter mini-chart).  
**Props:** `fieldX: string`, `fieldY: string`, `r: number | null`, `data: { x: number; y: number }[]`.

### `src/components/insights/WeeklyBriefing.tsx`
**Purpose:** Displays the latest AI-generated weekly briefing.  
**Props:** `briefing: WeeklyReview`.

### `src/components/insights/FatigueForecast.tsx`
**Purpose:** 3-day band forecast chart (low/mid/high) from math lib.  
**Props:** `bands: FatigueBand[]`.

### `src/components/insights/StreakFlame.tsx`
**Purpose:** Streak badge with animated flame at ≥7 days.  
**Props:** `streak: number`, `name: string`.

---

## 10. `/` Home — "The Record"

Layout: full-height flex column. No sidebar. TopNav fixed top.

```
┌─────────────────────────────────────────────────────┐
│  TopNav                                             │
├─────────────────────────────────────────────────────┤
│  SignalStrip                                        │
├────────────────────┬────────────────────────────────┤
│  TodaysOrders      │  MorningCheckIn                │
│  (2/3 width)       │  EveningCheckIn                │
├────────────────────┴────────────────────────────────┤
│  CoachAlertBanner (conditional)                     │
├──────────────┬──────────────┬───────────────────────┤
│  Today's     │  FatigueIndex│  Streak Top 3         │
│  Status      │              │  (bento-tile)         │
├──────────────┴──────────────┴───────────────────────┤
│  Habit Ledger (ledger-panel, full width)            │
└─────────────────────────────────────────────────────┘
```

**Today's Status bento-tile** — progress bars for: MISSION DONE (`logs/habits.length`), ACTIVE STREAKS, FAILED TODAY. Stats row: BEST EVER / PERFECT DAYS / HABITS (blaze-text large numbers).

**Habit Ledger** — table cols: HABIT | CURRENT | EFFICIENCY | BEST EVER | STATUS | COMMAND. Status badges: `DOWN` (danger), `RECORD` (gold filled), `ACTIVE` (success outline). COMMAND: DONE (gold) / FAIL (danger outline) / UNDO (muted). Search input top-right. "+ NEW HABIT" button.

---

## 11. `/insights` Route

Six-section layout, each in its own `bento-tile`:

1. **Pulse Rings** — today's check-in at a glance
2. **30-Day Trends** — `TrendChart` × 4 (sleep, energy, mood, stress) in a 2×2 grid
3. **Correlations** — top 3 correlations computed from `logCorrelation()`. Show interpretation: |r| ≥ 0.5 = "strong", 0.3–0.5 = "moderate", < 0.3 = "weak".
4. **Weekly Briefing** — latest `WeeklyReview` or CTA to generate one
5. **Fatigue Forecast** — `FatigueForecast` component + optional AI-enhanced version
6. **Streak Hall of Fame** — `StreakFlame` for each habit, sorted by best streak desc

---

## 12. Build Order

Follow this exact sequence. Commit after each step.

```
1. Scaffold (create-tanstack, install deps)
2. src/styles.css — full token set and utility classes
3. Root layout (src/routes/__root.tsx) + TopNav
4. src/types.ts + src/store/index.ts + seedIfEmpty()
5. src/routes/index.tsx — Home, wired to store, no AI yet
6. MorningCheckIn + EveningCheckIn modals
7. Habit Ledger (Today's Status + table)
8. src/lib/insights.ts — pure math functions
9. src/routes/insights.tsx — all 6 sections
10. src/server/ai.ts — server fns (env vars optional, graceful degradation)
11. TodaysOrders + CoachAlertBanner wired to server fns
12. Stub routes (/body /mind /soul /relations /business /growth)
13. /coach route — chat UI + CoachAlertBanner
14. /settings route — profile, export, day-count origin
15. Polish pass — motion, a11y, mobile reflow
```

---

## 13. Acceptance Checklist

Every item must pass before you consider the scaffold complete.

- [ ] All routes render without console errors
- [ ] MorningCheckIn and EveningCheckIn save to store; data persists after `localStorage.clear()` simulation and re-seed
- [ ] Habit DONE / FAIL / UNDO updates store and re-renders immediately
- [ ] `/insights` Pearson correlations return `null` gracefully when N < 5
- [ ] Fatigue forecast renders a 3-band chart without AI key set (math-only path)
- [ ] AI server fns return valid JSON when env vars are set; return a clear error object when missing
- [ ] Zero hardcoded colors (`#`, `rgb`, Tailwind color utilities) in any JSX or TSX file
- [ ] Bento grid reflows: 1 col at `sm:`, 2 col at `md:`, 3 col at `lg:`
- [ ] TopNav is fully responsive — tabs scroll horizontally below `lg:`
- [ ] Lighthouse a11y score ≥ 90 (buttons have labels, inputs have labels, color contrast passes)
- [ ] TypeScript compiles with zero errors (`tsc --noEmit`)

---

## 14. Extension Hooks

### How to add a new life-area module (e.g. Body)

```
1. Replace stub:    src/routes/body.tsx  → full component
2. Add store slice: src/store/body.ts    → BodyData interface + updateBody()
3. Register slice:  import into src/store/index.ts, add to Store interface
4. Bento tile:      Add <BodyTile /> to the BentoLedger section in src/routes/index.tsx
                    // EXTEND HERE — add life-area bento tiles
5. Insights hook:   (optional) Export metrics from src/store/body.ts consumed by
                    logCorrelation() in /insights
                    // EXTEND HERE — add correlation field pairs
6. AI context:      (optional) Pass body snapshot to getCoachAdvice context string
                    // EXTEND HERE — add module context to coach prompt
```

### "// EXTEND HERE" comment locations

Place these comments in the generated code at the spots below:

| File | Location | Comment |
|---|---|---|
| `src/routes/index.tsx` | After Habit Ledger, before closing `</main>` | `{/* EXTEND HERE — add life-area bento tiles */}` |
| `src/store/index.ts` | After `briefings` field in Store interface | `// EXTEND HERE — add life-area store slices` |
| `src/server/ai.ts` | Inside coach prompt string | `// EXTEND HERE — add module context to coach prompt` |
| `src/lib/insights.ts` | After existing correlation examples | `// EXTEND HERE — add correlation field pairs` |
| `src/routes/__root.tsx` | TopNav nav items array | `// EXTEND HERE — add nav items for new modules` |

---

## 15. Placeholders to Fill

Before running this prompt, find-and-replace these three tokens in this file:

| Token | Example value | Where used |
|---|---|---|
| `{APP_NAME}` | `Marko OS` | Page title, store key, wordmark |
| `{TAGLINE}` | `Personal performance OS` | Sub-heading, meta description |
| `{PRIMARY_DOMAIN}` | `markoos.app` | Meta canonical, OG tags |

---

*End of scaffold prompt. Everything above is an instruction to Claude Code.*  
*Do not modify this file as part of the scaffold — it is documentation only.*
