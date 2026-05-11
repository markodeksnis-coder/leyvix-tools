import { useState } from 'react';
import type { TabId, Goal, Priority, Project, DreamSelfData, Habit, DailyLog, Targets } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { initialDreamSelf, initialGoals, initialProjects, initialHabits, initialTargets } from './seedData';
import Nav from './components/Nav';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import DreamSelf from './pages/DreamSelf';
import Daily from './pages/Daily';
import Weekly from './pages/Weekly';

export default function App() {
  const [tab, setTab] = useState<TabId>('dashboard');
  const [goals, setGoals] = useLocalStorage<Goal[]>('perf:goals', initialGoals);
  const [priorities, setPriorities] = useLocalStorage<Priority[]>('perf:priorities', []);
  const [projects, setProjects] = useLocalStorage<Project[]>('perf:projects', initialProjects);
  const [dreamSelf, setDreamSelf] = useLocalStorage<DreamSelfData>('perf:dream', initialDreamSelf);
  const [habits, setHabits] = useLocalStorage<Habit[]>('perf:habits', initialHabits);
  const [dailyLogs, setDailyLogs] = useLocalStorage<DailyLog[]>('perf:dailylogs', []);
  const [targets, setTargets] = useLocalStorage<Targets>('perf:targets', initialTargets);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <header className="border-b border-[#1A1A1A] bg-[#0A0A0A]">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#818CF8] flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white leading-tight">Performance</h1>
              <p className="text-[11px] text-[#3F3F46]">Personal growth tracker</p>
            </div>
          </div>
          <div className="text-xs text-[#3F3F46]">
            {goals.filter(g => g.progress === 100).length}/{goals.length} goals complete
          </div>
        </div>
      </header>

      <Nav active={tab} onChange={setTab} />

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
          <Weekly dailyLogs={dailyLogs} targets={targets} setTargets={setTargets} />
        )}
      </main>
    </div>
  );
}
