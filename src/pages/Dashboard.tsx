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

function getLast7(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
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

function CircleRing({ value, color, size = 56, stroke = 5 }: { value: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, Math.max(0, value)) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
    </svg>
  );
}

export default function Dashboard({ goals, priorities, projects, dreamSelf, habits, dailyLogs, targets, onNavigate }: DashboardProps) {
  const today = new Date().toISOString().split('T')[0];
  const todayLog = dailyLogs.find(l => l.date === today);
  const todayPriorities = priorities.filter(p => p.date === today);
  const completedToday = todayPriorities.filter(p => p.completed).length;
  const activeProjects = projects.filter(p => p.status === 'active');
  const topGoals = goals.slice(0, 3);
  const completedHabits = habits.filter(h => h.logs.includes(today)).length;
  const score = useMemo(() => weeklyScore(dailyLogs, targets), [dailyLogs, targets]);
  const last7 = useMemo(() => getLast7(), []);

  const scoreGradient = score === null
    ? 'from-slate-400 to-slate-500'
    : score >= 80 ? 'from-emerald-400 to-cyan-500'
    : score >= 60 ? 'from-amber-400 to-orange-500'
    : 'from-red-400 to-pink-500';

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }, []);

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const hasVitals = todayLog && (todayLog.sleep !== undefined || todayLog.energyLevel !== undefined || todayLog.focusLevel !== undefined);

  const vitals = [
    { label: 'Sleep', value: todayLog?.sleep, max: 10, unit: 'h', baseColor: '#3B82F6', threshold: 7 },
    { label: 'Energy', value: todayLog?.energyLevel, max: 10, unit: '/10', baseColor: '#F59E0B', threshold: 7 },
    { label: 'Focus', value: todayLog?.focusLevel, max: 10, unit: '/10', baseColor: '#7C3AED', threshold: 7 },
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-slate-400 text-sm font-medium">{dateStr}</p>
        <h1 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">{greeting}</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Today's Tasks" value={`${completedToday}/${todayPriorities.length}`} sub="completed" gradient="from-violet-500 to-indigo-600" onClick={() => onNavigate('daily')} />
        <StatCard label="Active Goals" value={goals.length} sub={`${goals.filter(g => g.progress === 100).length} done`} gradient="from-emerald-400 to-cyan-500" onClick={() => onNavigate('goals')} />
        <StatCard label="Projects" value={activeProjects.length} sub="in progress" gradient="from-amber-400 to-orange-500" onClick={() => onNavigate('daily')} />
        <StatCard label="Week Score" value={score !== null ? `${score}%` : '—'} sub="vs targets" gradient={scoreGradient} onClick={() => onNavigate('weekly')} />
      </div>

      {/* Habits card with 7-day bar chart */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 cursor-pointer hover:border-violet-200 hover:shadow-md transition-all shadow-sm" onClick={() => onNavigate('daily')}>
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <CircleRing value={habits.length > 0 ? (completedHabits / habits.length) * 100 : 0}
              color={completedHabits === habits.length && habits.length > 0 ? '#10B981' : '#7C3AED'} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold text-slate-700">{completedHabits}/{habits.length}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-900">Non-Negotiables</h2>
              <span className="text-xs text-violet-600 font-semibold">Open →</span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {habits.map(h => (
                <span key={h.id} className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                  h.logs.includes(today) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                }`}>{h.name}</span>
              ))}
            </div>
          </div>
        </div>
        {/* 7-day micro bar chart */}
        {habits.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-50">
            <div className="flex gap-1 items-end h-8">
              {last7.map((date, i) => {
                const done = habits.filter(h => h.logs.includes(date)).length;
                const pct = habits.length > 0 ? done / habits.length : 0;
                const h = Math.max(4, pct * 32);
                const isToday = date === today;
                const barColor = pct >= 0.9 ? '#10B981' : pct >= 0.5 ? '#7C3AED' : pct > 0 ? '#F59E0B' : '#E2E8F0';
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full rounded-t-sm transition-all"
                      style={{ height: `${h}px`, backgroundColor: barColor, opacity: isToday ? 1 : 0.7 }} />
                    <span className={`text-[8px] font-bold ${ isToday ? 'text-violet-600' : 'text-slate-300' }`}>
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'][(new Date(date + 'T12:00:00').getDay() + 6) % 7]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Today's Vitals rings */}
      {hasVitals && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Today's Vitals</h2>
            <button onClick={e => { e.stopPropagation(); onNavigate('insights'); }} className="text-xs text-violet-600 hover:text-violet-700 font-semibold transition-colors">Insights →</button>
          </div>
          <div className="flex justify-around">
            {vitals.map(v => {
              if (v.value === undefined) return null;
              const pct = (v.value / v.max) * 100;
              const color = v.value >= v.threshold ? v.baseColor : v.value >= v.threshold * 0.75 ? '#F59E0B' : '#EF4444';
              return (
                <div key={v.label} className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <CircleRing value={pct} color={color} size={64} stroke={5} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-base font-black" style={{ color }}>{v.value}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-bold text-slate-600">{v.label}</p>
                    <p className="text-[9px] text-slate-300 font-medium">{v.unit}</p>
                  </div>
                </div>
              );
            }).filter(Boolean)}
          </div>
        </div>
      )}

      <Section title="Today's Focus" action={{ label: 'Open Daily', onClick: () => onNavigate('daily') }}>
        {todayPriorities.length === 0 ? (
          <EmptyState text="No priorities set for today" action={{ label: 'Set priorities', onClick: () => onNavigate('daily') }} />
        ) : (
          <ul className="space-y-1">
            {todayPriorities.slice(0, 5).map(p => (
              <li key={p.id} className="flex items-center gap-3 py-1.5">
                <span className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${
                  p.completed ? 'bg-violet-600 border-violet-600' : 'border-slate-200'
                }`}>
                  {p.completed && <span className="text-white text-[10px]">✓</span>}
                </span>
                <span className={`text-sm flex-1 ${ p.completed ? 'line-through text-slate-300' : 'text-slate-700' }`}>{p.title}</span>
                {p.isPriority && !p.completed && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 font-bold">TOP</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {activeProjects.length > 0 && (
        <Section title="Working On">
          <div className="space-y-3">
            {activeProjects.slice(0, 3).map(p => (
              <div key={p.id} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-700 font-semibold">{p.title}</span>
                  <span className="text-xs text-slate-400 font-bold">{p.progress}%</span>
                </div>
                <ProgressBar value={p.progress} color="#7C3AED" />
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Goal Progress" action={{ label: 'All goals', onClick: () => onNavigate('goals') }}>
        {topGoals.length === 0 ? (
          <EmptyState text="No goals yet" action={{ label: 'Create a goal', onClick: () => onNavigate('goals') }} />
        ) : (
          <div className="space-y-4">
            {topGoals.map(goal => (
              <div key={goal.id} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-700 font-semibold">{goal.title}</span>
                  <span className="text-xs text-slate-400 font-bold">{goal.progress}%</span>
                </div>
                <ProgressBar value={goal.progress} color={goal.progress === 100 ? '#10B981' : '#7C3AED'} />
                {goal.milestones.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {goal.milestones.slice(0, 4).map(m => (
                      <span key={m.id} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        m.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                      }`}>{m.title}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Dream Self Gap" action={{ label: 'View all', onClick: () => onNavigate('dream-self') }}>
        {dreamSelf.lifeAreas.length === 0 ? (
          <EmptyState text="Map your life areas" action={{ label: 'Get started', onClick: () => onNavigate('dream-self') }} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {dreamSelf.lifeAreas.slice(0, 6).map(area => {
              const gap = area.dreamScore - area.currentScore;
              const gapColor = gap > 4 ? '#EF4444' : gap > 2 ? '#F59E0B' : '#10B981';
              return (
                <div key={area.id} className="bg-slate-50 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600 truncate font-semibold">{area.name}</span>
                    <span className="text-xs font-bold flex-shrink-0 ml-1" style={{ color: gapColor }}>{gap > 0 ? `+${gap}` : gap}</span>
                  </div>
                  <ProgressBar value={area.currentScore} max={area.dreamScore || 10} color={gapColor} />
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
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

function StatCard({ label, value, sub, gradient, onClick }: { label: string; value: string | number; sub: string; gradient: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`rounded-2xl p-4 cursor-pointer bg-gradient-to-br ${gradient} text-white shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5`}>
      <p className="text-xs font-semibold text-white/70 mb-1.5">{label}</p>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-[11px] text-white/60 mt-1">{sub}</p>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: { label: string; onClick: () => void }; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {action && <button onClick={action.onClick} className="text-xs text-violet-600 hover:text-violet-700 font-semibold transition-colors">{action.label} →</button>}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ text, action }: { text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="py-5 text-center">
      <p className="text-sm text-slate-400">{text}</p>
      {action && <button onClick={action.onClick} className="mt-2 text-xs text-violet-600 hover:text-violet-700 font-semibold transition-colors">{action.label} →</button>}
    </div>
  );
}
