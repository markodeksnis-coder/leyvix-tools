import { useMemo } from 'react';
import type { Goal, Priority, Project, DreamSelfData } from '../types';
import ProgressBar from '../components/ProgressBar';

interface DashboardProps {
  goals: Goal[];
  priorities: Priority[];
  projects: Project[];
  dreamSelf: DreamSelfData;
  onNavigate: (tab: 'goals' | 'dream-self' | 'daily-focus') => void;
}

export default function Dashboard({ goals, priorities, projects, dreamSelf, onNavigate }: DashboardProps) {
  const today = new Date().toISOString().split('T')[0];
  const todayPriorities = priorities.filter(p => p.date === today);
  const completedToday = todayPriorities.filter(p => p.completed).length;
  const activeProjects = projects.filter(p => p.status === 'active');
  const topGoals = goals.slice(0, 3);

  const avgGap = useMemo(() => {
    if (!dreamSelf.lifeAreas.length) return 0;
    const total = dreamSelf.lifeAreas.reduce((sum, a) => sum + (a.dreamScore - a.currentScore), 0);
    return Math.round((total / dreamSelf.lifeAreas.length) * 10) / 10;
  }, [dreamSelf.lifeAreas]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[#52525B] text-sm">{dateStr}</p>
        <h1 className="text-2xl font-semibold text-white mt-1">{greeting}</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Today's Tasks" value={`${completedToday}/${todayPriorities.length}`} sub="completed" color="#818CF8" />
        <StatCard label="Active Goals" value={goals.length} sub={`${goals.filter(g => g.progress === 100).length} done`} color="#34D399" />
        <StatCard label="Projects" value={activeProjects.length} sub="in progress" color="#FBBF24" />
        <StatCard label="Avg Gap" value={avgGap > 0 ? `${avgGap}pts` : '—'} sub="current → dream" color="#F87171" />
      </div>

      <Section title="Today's Focus" action={{ label: 'See all', onClick: () => onNavigate('daily-focus') }}>
        {todayPriorities.length === 0 ? (
          <EmptyState text="No priorities set for today" action={{ label: 'Set priorities', onClick: () => onNavigate('daily-focus') }} />
        ) : (
          <ul className="space-y-2">
            {todayPriorities.slice(0, 5).map(p => (
              <li key={p.id} className="flex items-center gap-3 py-1.5">
                <span className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${
                  p.completed ? 'bg-[#818CF8] border-[#818CF8]' : 'border-[#333]'
                }`}>
                  {p.completed && <span className="text-white text-[10px]">✓</span>}
                </span>
                <span className={`text-sm flex-1 ${
                  p.completed ? 'line-through text-[#52525B]' : 'text-[#E4E4E7]'
                }`}>
                  {p.title}
                </span>
                {p.isPriority && !p.completed && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#818CF8]/10 text-[#818CF8] font-medium">TOP</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {activeProjects.length > 0 && (
        <Section title="Working On">
          <div className="space-y-4">
            {activeProjects.slice(0, 3).map(p => (
              <div key={p.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#E4E4E7]">{p.title}</span>
                  <span className="text-xs text-[#52525B]">{p.progress}%</span>
                </div>
                <ProgressBar value={p.progress} />
                {p.description && <p className="text-xs text-[#52525B]">{p.description}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Goal Progress" action={{ label: 'All goals', onClick: () => onNavigate('goals') }}>
        {topGoals.length === 0 ? (
          <EmptyState text="No goals created yet" action={{ label: 'Create a goal', onClick: () => onNavigate('goals') }} />
        ) : (
          <div className="space-y-4">
            {topGoals.map(goal => (
              <div key={goal.id} className="space-y-2">
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

      <Section title="Dream Self Gap" action={{ label: 'View details', onClick: () => onNavigate('dream-self') }}>
        {dreamSelf.lifeAreas.length === 0 ? (
          <EmptyState text="Map your dream self" action={{ label: 'Get started', onClick: () => onNavigate('dream-self') }} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {dreamSelf.lifeAreas.slice(0, 6).map(area => {
              const gap = area.dreamScore - area.currentScore;
              const gapColor = gap > 3 ? '#F87171' : gap > 1 ? '#FBBF24' : '#34D399';
              return (
                <div key={area.id} className="bg-[#161616] rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#A1A1AA] font-medium truncate">{area.name}</span>
                    <span className="text-xs font-semibold flex-shrink-0 ml-1" style={{ color: gapColor }}>
                      {gap > 0 ? `+${gap}` : gap}
                    </span>
                  </div>
                  <ProgressBar value={area.currentScore} max={area.dreamScore || 10} color={gapColor} />
                  <div className="flex justify-between text-[10px] text-[#52525B]">
                    <span>now: {area.currentScore}</span>
                    <span>goal: {area.dreamScore}</span>
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

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="bg-[#111111] rounded-xl p-4 border border-[#1E1E1E]">
      <p className="text-xs text-[#52525B] mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-[11px] text-[#3F3F46] mt-1">{sub}</p>
    </div>
  );
}

function Section({ title, action, children }: {
  title: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#111111] rounded-xl p-5 border border-[#1E1E1E]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {action && (
          <button onClick={action.onClick} className="text-xs text-[#818CF8] hover:text-[#A5B4FC] transition-colors">
            {action.label} →
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ text, action }: { text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="py-6 text-center">
      <p className="text-sm text-[#3F3F46]">{text}</p>
      {action && (
        <button onClick={action.onClick} className="mt-2 text-xs text-[#818CF8] hover:text-[#A5B4FC] transition-colors">
          {action.label} →
        </button>
      )}
    </div>
  );
}
