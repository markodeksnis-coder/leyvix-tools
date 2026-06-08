import { useState, useMemo } from 'react';
import type { TabId, Goal, Priority, Project, DreamSelfData, Habit, DailyLog, Targets, VisionImage } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { initialDreamSelf, initialGoals, initialProjects, initialHabits, initialTargets } from './seedData';
import Nav from './components/Nav';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import DreamSelf from './pages/DreamSelf';
import Daily from './pages/Daily';
import Weekly from './pages/Weekly';
import Insights from './pages/Insights';
import VisionBoard from './pages/VisionBoard';

function getWeekDates(offset = 0): string[] {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function computeWeekScore(logs: DailyLog[], targets: Targets, weekDates: string[]): number | null {
  type M = { key: keyof DailyLog; target: number; lower?: boolean; mode: 'avg' | 'sum' };
  const metrics: M[] = [
    { key: 'steps', target: targets.steps, mode: 'avg' },
    { key: 'calories', target: targets.calories, mode: 'avg', lower: true },
    { key: 'protein', target: targets.protein, mode: 'avg' },
    { key: 'screenTime', target: targets.screenTime, mode: 'avg', lower: true },
    { key: 'phonePickups', target: targets.phonePickups, mode: 'avg', lower: true },
    { key: 'callsBooked', target: targets.callsBooked, mode: 'sum' },
    { key: 'showUps', target: targets.showUps, mode: 'sum' },
    { key: 'closes', target: targets.closes, mode: 'sum' },
  ];
  const scores: number[] = [];
  for (const m of metrics) {
    const vals = logs.filter(l => weekDates.includes(l.date) && l[m.key] !== undefined).map(l => l[m.key] as number);
    if (!vals.length) continue;
    const actual = m.mode === 'avg' ? vals.reduce((a, b) => a + b, 0) / vals.length : vals.reduce((a, b) => a + b, 0);
    const pct = m.lower ? Math.round((m.target / actual) * 100) : Math.round((actual / m.target) * 100);
    scores.push(Math.min(100, pct));
  }
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

function getCurrentStreak(logs: string[]): number {
  if (!logs.length) return 0;
  const sorted = [...logs].sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterday = d.toISOString().split('T')[0];
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let streak = 0;
  const cur = new Date(sorted[0]);
  for (const date of sorted) {
    if (date === cur.toISOString().split('T')[0]) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else break;
  }
  return streak;
}

export default function App() {
  const [tab, setTab] = useState<TabId>('dashboard');
  const [showVision, setShowVision] = useState(false);
  const [goals, setGoals] = useLocalStorage<Goal[]>('perf:goals', initialGoals);
  const [priorities, setPriorities] = useLocalStorage<Priority[]>('perf:priorities', []);
  const [projects, setProjects] = useLocalStorage<Project[]>('perf:projects', initialProjects);
  const [dreamSelf, setDreamSelf] = useLocalStorage<DreamSelfData>('perf:dream', initialDreamSelf);
  const [habits, setHabits] = useLocalStorage<Habit[]>('perf:habits', initialHabits);
  const [dailyLogs, setDailyLogs] = useLocalStorage<DailyLog[]>('perf:dailylogs', []);
  const [targets, setTargets] = useLocalStorage<Targets>('perf:targets', initialTargets);
  const [visionImages, setVisionImages] = useLocalStorage<VisionImage[]>('perf:vision', []);

  const today = new Date().toISOString().split('T')[0];

  const { weekScore, weekScoreDelta } = useMemo(() => {
    const thisWeek = computeWeekScore(dailyLogs, targets, getWeekDates(0));
    const lastWeek = computeWeekScore(dailyLogs, targets, getWeekDates(-1));
    return {
      weekScore: thisWeek,
      weekScoreDelta: thisWeek !== null && lastWeek !== null ? thisWeek - lastWeek : null,
    };
  }, [dailyLogs, targets]);

  const habitsToday = habits.filter(h => h.logs.includes(today)).length;
  const topStreak = useMemo(() => habits.reduce((max, h) => Math.max(max, getCurrentStreak(h.logs)), 0), [habits]);
  const energyToday = dailyLogs.find(l => l.date === today)?.energyLevel ?? null;

  return (
    <div className="min-h-screen bg-[#F0F2FF] text-slate-900">
      <header className="border-b border-slate-100 bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-200">
              <span className="text-white font-black text-sm">P</span>
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 leading-tight tracking-tight">Performance</h1>
              <p className="text-[11px] text-slate-400">Personal growth tracker</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowVision(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-violet-50 hover:bg-violet-100 border border-violet-200 hover:border-violet-300 text-violet-600 rounded-xl transition-all font-semibold"
            >
              <span>🖼️</span>
              <span>Vision</span>
              {visionImages.length > 0 && (
                <span className="text-[10px] bg-violet-600 text-white px-1.5 py-0.5 rounded-full font-bold">{visionImages.length}</span>
              )}
            </button>
            <div className="text-xs text-slate-400 font-semibold">
              {goals.filter(g => g.progress === 100).length}/{goals.length} goals
            </div>
          </div>
        </div>
      </header>

      <Nav
        active={tab}
        onChange={setTab}
        weekScore={weekScore}
        weekScoreDelta={weekScoreDelta}
        habitsToday={habitsToday}
        habitsTodayTotal={habits.length}
        topStreak={topStreak}
        energyToday={energyToday}
      />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {tab === 'dashboard' && (
          <Dashboard goals={goals} priorities={priorities} projects={projects} dreamSelf={dreamSelf}
            habits={habits} dailyLogs={dailyLogs} targets={targets} onNavigate={setTab} />
        )}
        {tab === 'goals' && <Goals goals={goals} setGoals={setGoals} />}
        {tab === 'dream-self' && <DreamSelf data={dreamSelf} setData={setDreamSelf} />}
        {tab === 'daily' && (
          <Daily priorities={priorities} setPriorities={setPriorities}
            projects={projects} setProjects={setProjects}
            habits={habits} setHabits={setHabits}
            dailyLogs={dailyLogs} setDailyLogs={setDailyLogs}
            targets={targets} />
        )}
        {tab === 'weekly' && (
          <Weekly dailyLogs={dailyLogs} targets={targets} setTargets={setTargets}
            habits={habits} priorities={priorities} goals={goals} />
        )}
        {tab === 'insights' && (
          <Insights dailyLogs={dailyLogs} setDailyLogs={setDailyLogs}
            habits={habits} targets={targets} goals={goals} />
        )}
      </main>

      {showVision && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setShowVision(false)}
          />
          <div className="relative w-full max-w-sm h-full bg-white border-l border-slate-200 overflow-hidden shadow-2xl">
            <VisionBoard
              images={visionImages}
              setImages={setVisionImages}
              onClose={() => setShowVision(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
