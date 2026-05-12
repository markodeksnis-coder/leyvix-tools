import { useMemo } from 'react';
import type { Goal, Priority, Project, DreamSelfData, Habit, DailyLog, Targets, TabId } from '../types';
import ProgressBar from '../components/ProgressBar';

interface DashboardProps {
  goals: Goal[];
  priorities: Priority[];
  projects: Project[];
  dreamSelf: DreamSelfData;
  habits: Habit[];
  dailyLogs: DailyLog[];
  targets: Targets;
  onNavigate: (tab: TabId) => void;
}

function getWeekDates(): string[] {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function weeklyScore(logs: DailyLog[], targets: Targets): number | null {
  const dates = getWeekDates();
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
    const vals = logs.filter(l => dates.includes(l.date) && l[m.key] !== undefined).map(l => l[m.key] as number);
    if (!vals.length) continue;
    const actual = m.mode === 'avg' ? vals.reduce((a, b) => a + b, 0) / vals.length : vals.reduce((a, b) => a + b, 0);
    const pct = m.lower ? Math.round((m.target / actual) * 100) : Math.round((actual / m.target) * 100);
    scores.push(Math.min(100, pct));
  }
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

export default function Dashboard({ goals, priorities, projects, dreamSelf, habits, dailyLogs, targets, onNavigate }: DashboardProps) {
  const today = new Date().toISOString().split('T')[0];
  const todayPriorities = priorities.filter(p => p.date === today);
  const completedToday = todayPriorities.filter(p => p.completed).length;
  const activeProjects = projects.filter(p => p.status === 'active');
  const topGoals = goals.slice(0, 3);
  const completedHabits = habits.filter(h => h.logs.includes(today)).length;
  const score = useMemo(() => weeklyScore(dailyLogs, targets), [dailyLogs, targets]);
  const scoreColor = score === null ? '#52525B' : score >= 80 ? '#34D399' : score >= 60 ? '#FBBF24' : '#F87171';

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }, []);

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[#52525B] text-sm">{dateStr}</p>
        <h1 className="text-2xl font-semibold text-white mt-1">{greeting}</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Today's Tasks" value={`${completedToday}/${todayPriorities.length}`} sub="completed" color="#818CF8" onClick={() => onNavigate('daily')} />
        <StatCard label="Active Goals" value={goals.length} sub={`${goals.filter(g => g.progress === 100).length} done`} color="#34D399" onClick={() => onNavigate('goals')} />
        <StatCard label="Projects" value={activeProjects.length} sub="in progress" color="#FBBF24" onClick={() => onNavigate('daily')} />
        <StatCard label="Week Score" value={score !== null ? `${score}%` : '—'} sub="vs targets" color={scoreColor} onClick={() => onNavigate('weekly')} />
      </div>

      {/* Habits bar */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4 cursor-pointer hover:border-[#2A2A2A] transition-colors" onClick={() => onNavigate('daily')}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Non-Negotiables</h2>
            <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
              completedHabits === habits.length && habits.length > 0 ? 'bg-[#34D399]/10 text-[#34D399]' : 'bg-[#1E1E1E] text-[#52525B]'
            }`}>{completedHabits}/{habits.length} today</span>
          </div>
          <span className="text-xs text-[#818CF8]">Open →</span>
        </div>
        <ProgressBar value={completedHabits} max={habits.length || 1} color="#34D399" height="h-2" />
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {habits.map(h => (
            <span key={h.id} className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
              h.logs.includes(today) ? 'bg-[#34D399]/10 text-[#34D399]' : 'bg-[#1A1A1A] text-[#3F3F46]'
            }`}>{h.name}</span>
          ))}
        </div>
      </div>

      {/* Today's focus */}
      <Section title="Today's Focus" action={{ label: 'Open Daily', onClick: () => onNavigate('daily') }}>
        {todayPriorities.length === 0 ? (
          <EmptyState text="No priorities set for today" action={{ label: 'Set priorities', onClick: () => onNavigate('daily') }} />
        ) : (
          <ul className="space-y-1">
            {todayPriorities.slice(0, 5).map(p => (
              <li key={p.id} className="flex items-center gap-3 py-1.5">
                <span className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${
                  p.completed ? 'bg-[#818CF8] border-[#818CF8]' : 'border-[#333]'
                }`}>
                  {p.completed && <span className="text-white text-[10px]">✓</span>}
                </span>
                <span className={`text-sm flex-1 ${p.completed ? 'line-through text-[#52525B]' : 'text-[#E4E4E7]'}`}>{p.title}</span>
                {p.isPriority && !p.completed && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#818CF8]/10 text-[#818CF8] font-medium">TOP</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Active projects */}
      {activeProjects.length > 0 && (
        <Section title="Working On">
          <div className="space-y-3">
            {activeProjects.slice(0, 3).map(p => (
              <div key={p.id} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#E4E4E7]">{p.title}</span>
                  <span className="text-xs text-[#52525B]">{p.progress}%</span>
                </div>
                <ProgressBar value={p.progress} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Goal progress */}
      <Section title="Goal Progress" action={{ label: 'All goals', onClick: () => onNavigate('goals') }}>
        {topGoals.length === 0 ? (
          <EmptyState text="No goals yet" action={{ label: 'Create a goal', onClick: () => onNavigate('goals') }} />
        ) : (
          <div className="space-y-4">
            {topGoals.map(goal => (
              <div key={goal.id} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#E4E4E7] font-medium">{goal.title}</span>
                  <span className="text-xs text-[#52525B]">{goal.progress}%</span>
                </div>
                <ProgressBar value={goal.progress} />
                {goal.milestones.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {goal.milestones.slice(0, 4).map(m => (
                      <span key={m.id} className={`text-[10px] px-1.5 py-0.5 rounded ${
                        m.completed ? 'bg-[#34D399]/10 text-[#34D399]' : 'bg-[#1E1E1E] text-[#52525B]'
                      }`}>{m.title}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Dream Self gap */}
      <Section title="Dream Self Gap" action={{ label: 'View all', onClick: () => onNavigate('dream-self') }}>
        {dreamSelf.lifeAreas.length === 0 ? (
          <EmptyState text="Map your life areas" action={{ label: 'Get started', onClick: () => onNavigate('dream-self') }} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {dreamSelf.lifeAreas.slice(0, 6).map(area => {
              const gap = area.dreamScore - area.currentScore;
              const gapColor = gap > 4 ? '#F87171' : gap > 2 ? '#FBBF24' : '#34D399';
              return (
                <div key={area.id} className="bg-[#161616] rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#A1A1AA] truncate font-medium">{area.name}</span>
                    <span className="text-xs font-semibold flex-shrink-0 ml-1" style={{ color: gapColor }}>{gap > 0 ? `+${gap}` : gap}</span>
                  </div>
                  <ProgressBar value={area.currentScore} max={area.dreamScore || 10} color={gapColor} />
                  <div className="flex justify-between text-[10px] text-[#52525B]">
                    <span>now {area.currentScore}</span>
                    <span>target {area.dreamScore}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function StatCard({ label, value, sub, color, onClick }: { label: string; value: string | number; sub: string; color: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className="bg-[#111111] rounded-xl p-4 border border-[#1E1E1E] cursor-pointer hover:border-[#2A2A2A] transition-colors">
      <p className="text-xs text-[#52525B] mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-[11px] text-[#3F3F46] mt-1">{sub}</p>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: { label: string; onClick: () => void }; children: React.ReactNode }) {
  return (
    <div className="bg-[#111111] rounded-xl p-5 border border-[#1E1E1E]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {action && <button onClick={action.onClick} className="text-xs text-[#818CF8] hover:text-[#A5B4FC] transition-colors">{action.label} →</button>}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ text, action }: { text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="py-5 text-center">
      <p className="text-sm text-[#3F3F46]">{text}</p>
      {action && <button onClick={action.onClick} className="mt-2 text-xs text-[#818CF8] hover:text-[#A5B4FC] transition-colors">{action.label} →</button>}
    </div>
  );
}
