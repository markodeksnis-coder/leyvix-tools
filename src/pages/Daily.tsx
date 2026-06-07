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
    if (date === cur.toISOString().split('T')[0]) { streak++; cur.setDate(cur.getDate() - 1); }
    else break;
  }
  return streak;
}

function getLongestStreak(logs: string[]): number {
  if (!logs.length) return 0;
  const sorted = [...new Set(logs)].sort();
  let longest = 1, current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T12:00:00');
    const curr = new Date(sorted[i] + 'T12:00:00');
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) { current++; if (current > longest) longest = current; }
    else current = 1;
  }
  return longest;
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
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Daily</h1>
        <p className="text-sm text-slate-400 mt-0.5 font-medium">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">Non-Negotiables</h2>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
              completedHabits === habits.length && habits.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
            }`}>{completedHabits}/{habits.length}</span>
          </div>
        </div>
        <ProgressBar value={completedHabits} max={habits.length || 1} color="#10B981" height="h-1.5" />
        <div className="mt-3 divide-y divide-slate-50">
          {habits.map(habit => {
            const streak = getStreak(habit.logs);
            const longest = getLongestStreak(habit.logs);
            const doneToday = habit.logs.includes(today);
            return (
              <div key={habit.id} className="flex items-center gap-3 py-2.5">
                <button onClick={() => toggleHabit(habit.id)}
                  className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                    doneToday ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200 hover:border-emerald-400'
                  }`}>
                  {doneToday && <span className="text-white text-[10px] font-bold">✓</span>}
                </button>
                <span className={`text-sm flex-1 font-medium ${ doneToday ? 'text-slate-300 line-through' : 'text-slate-700' }`}>
                  {habit.name}
                </span>
                <div className="flex gap-0.5 items-center">
                  {last7.map(date => (
                    <span key={date} className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      habit.logs.includes(date) ? 'bg-emerald-500' : 'bg-slate-100'
                    }`} />
                  ))}
                </div>
                <div className="text-right flex-shrink-0 min-w-[52px]">
                  {streak >= 1 && <div className="text-[11px] text-amber-500 font-bold">{streak}d 🔥</div>}
                  {longest > streak && longest >= 2 && <div className="text-[10px] text-slate-300 font-medium">best {longest}d</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900">Today's Numbers</h2>
          <button onClick={() => { setMetricsDraft({ ...todayLog }); setShowMetrics(true); }}
            className="text-xs text-violet-600 hover:text-violet-700 font-semibold transition-colors">
            {dailyLogs.some(l => l.date === today) ? 'Edit' : '+ Log'}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {healthFields.map(f => {
            const val = todayLog[f.key] as number | undefined;
            const pct = pctOf(val, f.target, f.lower);
            const color = pct === null ? undefined : pct >= 90 ? '#10B981' : pct >= 65 ? '#F59E0B' : '#EF4444';
            return (
              <div key={f.key} className="bg-slate-50 rounded-xl p-3">
                <p className="text-[11px] text-slate-400 font-medium mb-1">{f.label}</p>
                {val !== undefined ? (
                  <>
                    <p className="text-base font-black" style={{ color }}>
                      {f.key === 'steps' ? val.toLocaleString() : val}{f.unit}
                    </p>
                    <p className="text-[10px] text-slate-300 mt-0.5 font-medium">target {f.key === 'steps' ? f.target.toLocaleString() : f.target}{f.unit}</p>
                    <div className="mt-1.5"><ProgressBar value={pct!} color={color!} height="h-0.5" /></div>
                  </>
                ) : (
                  <p className="text-slate-200 text-sm mt-1">Not logged</p>
                )}
              </div>
            );
          })}
          {(['callsBooked', 'showUps', 'closes'] as const).map(k => {
            const labels = { callsBooked: 'Calls Booked', showUps: 'Show-ups', closes: 'Closes' };
            const val = todayLog[k] as number | undefined;
            return (
              <div key={k} className="bg-slate-50 rounded-xl p-3">
                <p className="text-[11px] text-slate-400 font-medium mb-1">{labels[k]}</p>
                {val !== undefined ? (
                  <p className="text-base font-black text-violet-600">{val}</p>
                ) : (
                  <p className="text-slate-200 text-sm mt-1">Not logged</p>
                )}
              </div>
            );
          })}
          {(['sleep', 'energyLevel', 'focusLevel'] as const).map(k => {
            const labels = { sleep: 'Sleep', energyLevel: 'Energy', focusLevel: 'Focus' };
            const units = { sleep: 'h', energyLevel: '/10', focusLevel: '/10' };
            const val = todayLog[k] as number | undefined;
            const color = val === undefined ? undefined
              : k === 'sleep' ? (val >= 7 ? '#10B981' : val >= 6 ? '#F59E0B' : '#EF4444')
              : (val >= 7 ? '#10B981' : val >= 5 ? '#F59E0B' : '#EF4444');
            return (
              <div key={k} className="bg-slate-50 rounded-xl p-3">
                <p className="text-[11px] text-slate-400 font-medium mb-1">{labels[k]}</p>
                {val !== undefined ? (
                  <p className="text-base font-black" style={{ color }}>{val}{units[k]}</p>
                ) : (
                  <p className="text-slate-200 text-sm mt-1">Not logged</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Today's Focus</h2>
          {todayItems.length > 0 && <span className="text-xs text-slate-400 font-semibold">{completedCount}/{todayItems.length}</span>}
        </div>
        <div className="flex gap-2">
          <input type="text" placeholder={isPriority ? 'Add top priority…' : 'Add task…'}
            value={newItem} onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-violet-400 transition-colors"
          />
          <button onClick={addItem} disabled={!newItem.trim()}
            className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-violet-200">Add</button>
        </div>
        <button onClick={() => setIsPriority(!isPriority)}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors ${
            isPriority ? 'bg-violet-100 text-violet-600 font-semibold' : 'bg-slate-100 text-slate-400 hover:text-slate-600'
          }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${ isPriority ? 'bg-violet-600' : 'bg-slate-300' }`} />
          Mark as Top Priority
        </button>
      </div>

      {topPriorities.length > 0 && (
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
          <p className="text-[11px] font-bold text-violet-600 uppercase tracking-wider mb-3">Top Priorities</p>
          <ul className="space-y-1">{topPriorities.map(item => <ItemRow key={item.id} item={item} onToggle={toggle} onRemove={remove} />)}</ul>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Tasks</p>
          <ul className="space-y-1">{tasks.map(item => <ItemRow key={item.id} item={item} onToggle={toggle} onRemove={remove} />)}</ul>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Working On</h2>
          <button onClick={() => { setProjectDraft({ title: '', description: '', progress: 0 }); setEditingProject(null); setShowProjectForm(true); }}
            className="text-xs text-violet-600 hover:text-violet-700 font-semibold transition-colors">+ Add</button>
        </div>
        {projects.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-5 text-center shadow-sm">
            <p className="text-slate-400 text-sm">No active projects.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map(project => (
              <div key={project.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      project.status === 'active' ? 'bg-emerald-500' : project.status === 'paused' ? 'bg-amber-400' : 'bg-slate-300'
                    }`} />
                    <h3 className="text-sm font-bold text-slate-900">{project.title}</h3>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => { setProjectDraft({ title: project.title, description: project.description, progress: project.progress }); setEditingProject(project); setShowProjectForm(true); }}
                      className="text-slate-400 hover:text-violet-600 text-xs transition-colors font-medium">Edit</button>
                    <button onClick={() => setProjects(projects.filter(p => p.id !== project.id))}
                      className="text-slate-400 hover:text-red-500 text-xs transition-colors font-medium">Delete</button>
                  </div>
                </div>
                {project.description && <p className="text-xs text-slate-400 ml-4 mb-2">{project.description}</p>}
                <div className="ml-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 font-medium">Progress</span>
                    <span className="text-slate-700 font-bold">{project.progress}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={project.progress}
                    onChange={e => setProjects(projects.map(p => p.id === project.id ? { ...p, progress: Number(e.target.value) } : p))}
                    className="w-full accent-violet-600 cursor-pointer"
                  />
                </div>
                <div className="flex gap-1 ml-4 mt-2">
                  {(['active', 'paused', 'completed'] as const).map(s => (
                    <button key={s} onClick={() => setProjects(projects.map(p => p.id === project.id ? { ...p, status: s } : p))}
                      className={`text-[11px] px-2 py-0.5 rounded-full capitalize transition-colors font-medium ${
                        project.status === s
                          ? s === 'active' ? 'bg-emerald-100 text-emerald-700'
                          : s === 'paused' ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                          : 'text-slate-300 hover:text-slate-500'
                      }`}>{s}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showMetrics && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900">Log Today's Numbers</h2>
              <button onClick={() => setShowMetrics(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-3">Health</p>
              <div className="space-y-2">
                {[
                  { label: 'Steps', key: 'steps', ph: `target: ${targets.steps.toLocaleString()}` },
                  { label: 'Calories', key: 'calories', ph: `target: ${targets.calories}` },
                  { label: 'Protein (g)', key: 'protein', ph: `target: ${targets.protein}g` },
                  { label: 'Screen time (h)', key: 'screenTime', ph: `target: ${targets.screenTime}h` },
                  { label: 'Phone pickups', key: 'phonePickups', ph: `target: ${targets.phonePickups}` },
                ].map(f => (
                  <div key={f.key} className="flex items-center gap-3">
                    <label className="text-sm text-slate-500 font-medium w-36 flex-shrink-0">{f.label}</label>
                    <input type="number" placeholder={f.ph}
                      value={(metricsDraft[f.key as keyof DailyLog] as number | undefined) ?? ''}
                      onChange={e => setMetricsDraft(d => ({ ...d, [f.key]: e.target.value ? Number(e.target.value) : undefined }))}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-violet-400"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-3">Wellbeing</p>
              <div className="space-y-2">
                {[
                  { label: 'Sleep (hours)', key: 'sleep', ph: '7.5' },
                  { label: 'Energy (1–10)', key: 'energyLevel', ph: '7' },
                  { label: 'Focus (1–10)', key: 'focusLevel', ph: '7' },
                ].map(f => (
                  <div key={f.key} className="flex items-center gap-3">
                    <label className="text-sm text-slate-500 font-medium w-36 flex-shrink-0">{f.label}</label>
                    <input type="number" placeholder={f.ph}
                      value={(metricsDraft[f.key as keyof DailyLog] as number | undefined) ?? ''}
                      onChange={e => setMetricsDraft(d => ({ ...d, [f.key]: e.target.value ? Number(e.target.value) : undefined }))}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-violet-400"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-3">Sales</p>
              <div className="space-y-2">
                {[
                  { label: 'Calls Booked', key: 'callsBooked' },
                  { label: 'Show-ups', key: 'showUps' },
                  { label: 'Closes', key: 'closes' },
                ].map(f => (
                  <div key={f.key} className="flex items-center gap-3">
                    <label className="text-sm text-slate-500 font-medium w-36 flex-shrink-0">{f.label}</label>
                    <input type="number" placeholder="0"
                      value={(metricsDraft[f.key as keyof DailyLog] as number | undefined) ?? ''}
                      onChange={e => setMetricsDraft(d => ({ ...d, [f.key]: e.target.value ? Number(e.target.value) : undefined }))}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-violet-400"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowMetrics(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-500 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={saveMetrics} className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-violet-200">Save</button>
            </div>
          </div>
        </div>
      )}

      {showProjectForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900">{editingProject ? 'Edit Project' : 'New Project'}</h2>
              <button onClick={() => setShowProjectForm(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <input type="text" placeholder="Project name *" value={projectDraft.title} autoFocus
              onChange={e => setProjectDraft(d => ({ ...d, title: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-violet-400"
            />
            <textarea placeholder="Short description (optional)" value={projectDraft.description} rows={2}
              onChange={e => setProjectDraft(d => ({ ...d, description: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-violet-400 resize-none"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowProjectForm(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-500 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={saveProject} disabled={!projectDraft.title.trim()}
                className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-violet-200">
                {editingProject ? 'Save' : 'Add'}
              </button>
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
          item.completed ? 'bg-violet-600 border-violet-600' : 'border-slate-200 hover:border-violet-400'
        }`}>
        {item.completed && <span className="text-white text-[10px]">✓</span>}
      </button>
      <span className={`text-sm flex-1 font-medium ${ item.completed ? 'line-through text-slate-300' : 'text-slate-700' }`}>{item.title}</span>
      <button onClick={() => onRemove(item.id)}
        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 text-lg transition-all leading-none">×</button>
    </li>
  );
}
