import { useState } from 'react';
import type { Priority, Project, DailyLog, Habit, Targets } from '../types';
import ProgressBar from '../components/ProgressBar';

interface DailyProps {
  priorities: Priority[];
  setPriorities: (p: Priority[]) => void;
  projects: Project[];
  setProjects: (p: Project[]) => void;
  habits: Habit[];
  setHabits: (h: Habit[]) => void;
  dailyLogs: DailyLog[];
  setDailyLogs: (l: DailyLog[]) => void;
  targets: Targets;
}

function uid() { return Math.random().toString(36).slice(2); }
function todayStr() { return new Date().toISOString().split('T')[0]; }

function getStreak(logs: string[]): number {
  if (!logs.length) return 0;
  const sorted = [...logs].sort().reverse();
  const today = todayStr();
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

function getLast7(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
}

export default function Daily({ priorities, setPriorities, projects, setProjects, habits, setHabits, dailyLogs, setDailyLogs, targets }: DailyProps) {
  const today = todayStr();
  const todayLog = dailyLogs.find(l => l.date === today) ?? { date: today };
  const [showMetrics, setShowMetrics] = useState(false);
  const [metricsDraft, setMetricsDraft] = useState<DailyLog>(todayLog);
  const [newItem, setNewItem] = useState('');
  const [isPriority, setIsPriority] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectDraft, setProjectDraft] = useState({ title: '', description: '', progress: 0 });
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const todayItems = priorities.filter(p => p.date === today);
  const topPriorities = todayItems.filter(p => p.isPriority);
  const tasks = todayItems.filter(p => !p.isPriority);
  const completedCount = todayItems.filter(p => p.completed).length;
  const last7 = getLast7();
  const completedHabits = habits.filter(h => h.logs.includes(today)).length;

  const toggleHabit = (id: string) => {
    setHabits(habits.map(h => {
      if (h.id !== id) return h;
      return { ...h, logs: h.logs.includes(today) ? h.logs.filter(d => d !== today) : [...h.logs, today] };
    }));
  };

  const saveMetrics = () => {
    setDailyLogs([...dailyLogs.filter(l => l.date !== today), { ...metricsDraft, date: today }]);
    setShowMetrics(false);
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    setPriorities([...priorities, { id: uid(), title: newItem.trim(), completed: false, date: today, isPriority }]);
    setNewItem('');
  };

  const toggle = (id: string) => setPriorities(priorities.map(p => p.id === id ? { ...p, completed: !p.completed } : p));
  const remove = (id: string) => setPriorities(priorities.filter(p => p.id !== id));

  const saveProject = () => {
    if (!projectDraft.title.trim()) return;
    if (editingProject) {
      setProjects(projects.map(p => p.id === editingProject.id ? { ...editingProject, ...projectDraft } : p));
    } else {
      setProjects([...projects, { ...projectDraft, id: uid(), status: 'active' }]);
    }
    setProjectDraft({ title: '', description: '', progress: 0 });
    setEditingProject(null);
    setShowProjectForm(false);
  };

  const pctOf = (val: number | undefined, target: number, lower = false) => {
    if (val === undefined) return null;
    const p = lower ? Math.round((target / val) * 100) : Math.round((val / target) * 100);
    return Math.min(100, p);
  };

  const healthFields: { label: string; key: keyof DailyLog; target: number; unit: string; lower?: boolean }[] = [
    { label: 'Steps', key: 'steps', target: targets.steps, unit: '' },
    { label: 'Calories', key: 'calories', target: targets.calories, unit: 'cal', lower: true },
    { label: 'Protein', key: 'protein', target: targets.protein, unit: 'g' },
    { label: 'Screen time', key: 'screenTime', target: targets.screenTime, unit: 'h', lower: true },
    { label: 'Pickups', key: 'phonePickups', target: targets.phonePickups, unit: '', lower: true },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Daily</h1>
        <p className="text-sm text-[#52525B] mt-0.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Non-negotiables */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Non-Negotiables</h2>
            <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
              completedHabits === habits.length && habits.length > 0
                ? 'bg-[#34D399]/10 text-[#34D399]'
                : 'bg-[#1E1E1E] text-[#52525B]'
            }`}>{completedHabits}/{habits.length}</span>
          </div>
        </div>
        <ProgressBar value={completedHabits} max={habits.length || 1} color="#34D399" height="h-1" />
        <div className="mt-3 divide-y divide-[#161616]">
          {habits.map(habit => {
            const streak = getStreak(habit.logs);
            const doneToday = habit.logs.includes(today);
            return (
              <div key={habit.id} className="flex items-center gap-3 py-2.5">
                <button
                  onClick={() => toggleHabit(habit.id)}
                  className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                    doneToday ? 'bg-[#34D399] border-[#34D399]' : 'border-[#333] hover:border-[#34D399]'
                  }`}
                >
                  {doneToday && <span className="text-[#0A0A0A] text-[10px] font-bold">✓</span>}
                </button>
                <span className={`text-sm flex-1 ${doneToday ? 'text-[#52525B] line-through' : 'text-[#E4E4E7]'}`}>
                  {habit.name}
                </span>
                <div className="flex gap-0.5 items-center">
                  {last7.map(date => (
                    <span key={date} className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      habit.logs.includes(date) ? 'bg-[#34D399]' : 'bg-[#1E1E1E]'
                    }`} />
                  ))}
                </div>
                {streak >= 2 && (
                  <span className="text-[11px] text-[#FBBF24] font-semibold w-8 text-right">{streak}d</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's numbers */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Today's Numbers</h2>
          <button
            onClick={() => { setMetricsDraft({ ...todayLog }); setShowMetrics(true); }}
            className="text-xs text-[#818CF8] hover:text-[#A5B4FC] transition-colors"
          >
            {dailyLogs.some(l => l.date === today) ? 'Edit' : '+ Log'}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {healthFields.map(f => {
            const val = todayLog[f.key] as number | undefined;
            const pct = pctOf(val, f.target, f.lower);
            const color = pct === null ? undefined : pct >= 90 ? '#34D399' : pct >= 65 ? '#FBBF24' : '#F87171';
            return (
              <div key={f.key} className="bg-[#0A0A0A] rounded-lg p-3">
                <p className="text-[11px] text-[#52525B] mb-1">{f.label}</p>
                {val !== undefined ? (
                  <>
                    <p className="text-base font-bold" style={{ color }}>
                      {f.key === 'steps' ? val.toLocaleString() : val}{f.unit}
                    </p>
                    <p className="text-[10px] text-[#3F3F46] mt-0.5">target {f.key === 'steps' ? f.target.toLocaleString() : f.target}{f.unit}</p>
                    <div className="mt-1.5"><ProgressBar value={pct!} color={color!} height="h-0.5" /></div>
                  </>
                ) : (
                  <p className="text-[#2A2A2A] text-sm mt-1">Not logged</p>
                )}
              </div>
            );
          })}
          {(['callsBooked', 'showUps', 'closes'] as const).map(k => {
            const labels = { callsBooked: 'Calls Booked', showUps: 'Show-ups', closes: 'Closes' };
            const val = todayLog[k] as number | undefined;
            return (
              <div key={k} className="bg-[#0A0A0A] rounded-lg p-3">
                <p className="text-[11px] text-[#52525B] mb-1">{labels[k]}</p>
                {val !== undefined ? (
                  <p className="text-base font-bold text-[#818CF8]">{val}</p>
                ) : (
                  <p className="text-[#2A2A2A] text-sm mt-1">Not logged</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Focus / tasks */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Today's Focus</h2>
          {todayItems.length > 0 && <span className="text-xs text-[#52525B]">{completedCount}/{todayItems.length}</span>}
        </div>
        <div className="flex gap-2">
          <input type="text" placeholder={isPriority ? 'Add top priority…' : 'Add task…'}
            value={newItem} onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            className="flex-1 bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#818CF8] transition-colors"
          />
          <button onClick={addItem} disabled={!newItem.trim()}
            className="px-4 py-2.5 bg-[#818CF8] hover:bg-[#6366F1] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >Add</button>
        </div>
        <button onClick={() => setIsPriority(!isPriority)}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors ${
            isPriority ? 'bg-[#818CF8]/15 text-[#818CF8]' : 'bg-[#1A1A1A] text-[#52525B] hover:text-[#A1A1AA]'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isPriority ? 'bg-[#818CF8]' : 'bg-[#3F3F46]'}`} />
          Mark as Top Priority
        </button>
      </div>

      {topPriorities.length > 0 && (
        <div className="bg-[#111111] border border-[#818CF8]/20 rounded-xl p-4">
          <p className="text-[11px] font-semibold text-[#818CF8] uppercase tracking-wider mb-3">Top Priorities</p>
          <ul className="space-y-1">{topPriorities.map(item => <ItemRow key={item.id} item={item} onToggle={toggle} onRemove={remove} />)}</ul>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4">
          <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-wider mb-3">Tasks</p>
          <ul className="space-y-1">{tasks.map(item => <ItemRow key={item.id} item={item} onToggle={toggle} onRemove={remove} />)}</ul>
        </div>
      )}

      {/* Projects */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Working On</h2>
          <button onClick={() => { setProjectDraft({ title: '', description: '', progress: 0 }); setEditingProject(null); setShowProjectForm(true); }}
            className="text-xs text-[#818CF8] hover:text-[#A5B4FC] transition-colors">+ Add</button>
        </div>
        {projects.length === 0 ? (
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5 text-center">
            <p className="text-[#3F3F46] text-sm">No active projects.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map(project => (
              <div key={project.id} className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      project.status === 'active' ? 'bg-[#34D399]' : project.status === 'paused' ? 'bg-[#FBBF24]' : 'bg-[#3F3F46]'
                    }`} />
                    <h3 className="text-sm font-medium text-white">{project.title}</h3>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => { setProjectDraft({ title: project.title, description: project.description, progress: project.progress }); setEditingProject(project); setShowProjectForm(true); }}
                      className="text-[#3F3F46] hover:text-[#A1A1AA] text-xs transition-colors">Edit</button>
                    <button onClick={() => setProjects(projects.filter(p => p.id !== project.id))}
                      className="text-[#3F3F46] hover:text-[#F87171] text-xs transition-colors">Delete</button>
                  </div>
                </div>
                {project.description && <p className="text-xs text-[#52525B] ml-4 mb-2">{project.description}</p>}
                <div className="ml-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#52525B]">Progress</span>
                    <span className="text-white">{project.progress}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={project.progress}
                    onChange={e => setProjects(projects.map(p => p.id === project.id ? { ...p, progress: Number(e.target.value) } : p))}
                    className="w-full accent-[#818CF8] cursor-pointer"
                  />
                </div>
                <div className="flex gap-1 ml-4 mt-2">
                  {(['active', 'paused', 'completed'] as const).map(s => (
                    <button key={s} onClick={() => setProjects(projects.map(p => p.id === project.id ? { ...p, status: s } : p))}
                      className={`text-[11px] px-2 py-0.5 rounded capitalize transition-colors ${
                        project.status === s
                          ? s === 'active' ? 'bg-[#34D399]/10 text-[#34D399]'
                          : s === 'paused' ? 'bg-[#FBBF24]/10 text-[#FBBF24]'
                          : 'bg-[#3F3F46]/20 text-[#71717A]'
                          : 'text-[#3F3F46] hover:text-[#52525B]'
                      }`}>{s}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metrics modal */}
      {showMetrics && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Log Today's Numbers</h2>
              <button onClick={() => setShowMetrics(false)} className="text-[#52525B] hover:text-white text-xl leading-none">×</button>
            </div>
            <div>
              <p className="text-[11px] text-[#52525B] uppercase tracking-wider font-medium mb-3">Health</p>
              <div className="space-y-2">
                {[
                  { label: 'Steps', key: 'steps', ph: `target: ${targets.steps.toLocaleString()}` },
                  { label: 'Calories', key: 'calories', ph: `target: ${targets.calories}` },
                  { label: 'Protein (g)', key: 'protein', ph: `target: ${targets.protein}g` },
                  { label: 'Screen time (h)', key: 'screenTime', ph: `target: ${targets.screenTime}h` },
                  { label: 'Phone pickups', key: 'phonePickups', ph: `target: ${targets.phonePickups}` },
                ].map(f => (
                  <div key={f.key} className="flex items-center gap-3">
                    <label className="text-sm text-[#A1A1AA] w-36 flex-shrink-0">{f.label}</label>
                    <input type="number" placeholder={f.ph}
                      value={(metricsDraft[f.key as keyof DailyLog] as number | undefined) ?? ''}
                      onChange={e => setMetricsDraft(d => ({ ...d, [f.key]: e.target.value ? Number(e.target.value) : undefined }))}
                      className="flex-1 bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-white placeholder-[#2A2A2A] focus:outline-none focus:border-[#818CF8]"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] text-[#52525B] uppercase tracking-wider font-medium mb-3">Sales</p>
              <div className="space-y-2">
                {[
                  { label: 'Calls Booked', key: 'callsBooked' },
                  { label: 'Show-ups', key: 'showUps' },
                  { label: 'Closes', key: 'closes' },
                ].map(f => (
                  <div key={f.key} className="flex items-center gap-3">
                    <label className="text-sm text-[#A1A1AA] w-36 flex-shrink-0">{f.label}</label>
                    <input type="number" placeholder="0"
                      value={(metricsDraft[f.key as keyof DailyLog] as number | undefined) ?? ''}
                      onChange={e => setMetricsDraft(d => ({ ...d, [f.key]: e.target.value ? Number(e.target.value) : undefined }))}
                      className="flex-1 bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-white placeholder-[#2A2A2A] focus:outline-none focus:border-[#818CF8]"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowMetrics(false)} className="flex-1 py-2.5 border border-[#1E1E1E] text-[#71717A] text-sm rounded-lg">Cancel</button>
              <button onClick={saveMetrics} className="flex-1 py-2.5 bg-[#818CF8] hover:bg-[#6366F1] text-white text-sm font-medium rounded-lg transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Project modal */}
      {showProjectForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">{editingProject ? 'Edit Project' : 'New Project'}</h2>
              <button onClick={() => setShowProjectForm(false)} className="text-[#52525B] hover:text-white text-xl leading-none">×</button>
            </div>
            <input type="text" placeholder="Project name *" value={projectDraft.title} autoFocus
              onChange={e => setProjectDraft(d => ({ ...d, title: e.target.value }))}
              className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#818CF8]"
            />
            <textarea placeholder="Short description (optional)" value={projectDraft.description} rows={2}
              onChange={e => setProjectDraft(d => ({ ...d, description: e.target.value }))}
              className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#818CF8] resize-none"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowProjectForm(false)} className="flex-1 py-2.5 border border-[#1E1E1E] text-[#71717A] text-sm rounded-lg">Cancel</button>
              <button onClick={saveProject} disabled={!projectDraft.title.trim()}
                className="flex-1 py-2.5 bg-[#818CF8] hover:bg-[#6366F1] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
              >{editingProject ? 'Save' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemRow({ item, onToggle, onRemove }: { item: Priority; onToggle: (id: string) => void; onRemove: (id: string) => void }) {
  return (
    <li className="flex items-center gap-3 group py-1.5">
      <button onClick={() => onToggle(item.id)}
        className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center transition-all ${
          item.completed ? 'bg-[#818CF8] border-[#818CF8]' : 'border-[#333] hover:border-[#818CF8]'
        }`}
      >
        {item.completed && <span className="text-white text-[10px]">✓</span>}
      </button>
      <span className={`text-sm flex-1 ${item.completed ? 'line-through text-[#3F3F46]' : 'text-[#E4E4E7]'}`}>{item.title}</span>
      <button onClick={() => onRemove(item.id)}
        className="opacity-0 group-hover:opacity-100 text-[#3F3F46] hover:text-[#F87171] text-lg transition-all leading-none">×</button>
    </li>
  );
}
