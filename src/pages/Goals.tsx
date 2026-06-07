import { useState } from 'react';
import type { Goal, Milestone } from '../types';
import ProgressBar from '../components/ProgressBar';

interface GoalsProps {
  goals: Goal[];
  setGoals: (goals: Goal[]) => void;
}

const CATEGORIES = ['Career', 'Health', 'Mindset', 'Finance', 'Skills', 'Relationships', 'Personal', 'Other'];

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Career: { bg: 'bg-blue-100', text: 'text-blue-700' },
  Health: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  Mindset: { bg: 'bg-violet-100', text: 'text-violet-700' },
  Finance: { bg: 'bg-amber-100', text: 'text-amber-700' },
  Skills: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  Relationships: { bg: 'bg-rose-100', text: 'text-rose-700' },
  Personal: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  Other: { bg: 'bg-slate-100', text: 'text-slate-600' },
};

function uid() { return Math.random().toString(36).slice(2); }
function todayStr() { return new Date().toISOString().split('T')[0]; }

const emptyForm = () => ({
  title: '',
  description: '',
  category: 'Personal',
  progress: 0,
  milestones: [] as Milestone[],
  targetDate: '',
});

export default function Goals({ goals, setGoals }: GoalsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [newMilestone, setNewMilestone] = useState('');
  const [inlineInput, setInlineInput] = useState<{ goalId: string; title: string } | null>(null);

  const openNew = () => { setEditingGoal(null); setForm(emptyForm()); setNewMilestone(''); setShowForm(true); };

  const openEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setForm({ title: goal.title, description: goal.description, category: goal.category, progress: goal.progress, milestones: [...goal.milestones], targetDate: goal.targetDate ?? '' });
    setNewMilestone('');
    setShowForm(true);
  };

  const saveGoal = () => {
    if (!form.title.trim()) return;
    const today = todayStr();
    if (editingGoal) {
      const history = editingGoal.progressHistory ?? [];
      const filtered = history.filter(h => h.date !== today);
      const newHistory = form.progress !== editingGoal.progress ? [...filtered, { date: today, value: form.progress }] : history;
      setGoals(goals.map(g => g.id === editingGoal.id ? { ...editingGoal, ...form, progressHistory: newHistory } : g));
    } else {
      const newGoal: Goal = { ...form, id: uid(), createdAt: new Date().toISOString(), progressHistory: form.progress > 0 ? [{ date: today, value: form.progress }] : [] };
      setGoals([...goals, newGoal]);
    }
    setShowForm(false);
  };

  const deleteGoal = (goalId: string) => { setGoals(goals.filter(g => g.id !== goalId)); if (expandedId === goalId) setExpandedId(null); };

  const toggleMilestone = (goalId: string, milestoneId: string) => {
    const today = todayStr();
    setGoals(goals.map(g => {
      if (g.id !== goalId) return g;
      const milestones = g.milestones.map(m => m.id === milestoneId ? { ...m, completed: !m.completed } : m);
      const completedCount = milestones.filter(m => m.completed).length;
      const progress = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : g.progress;
      const history = g.progressHistory ?? [];
      const filtered = history.filter(h => h.date !== today);
      return { ...g, milestones, progress, progressHistory: [...filtered, { date: today, value: progress }] };
    }));
  };

  const addMilestoneToGoal = (goalId: string, title: string) => {
    if (!title.trim()) return;
    const milestone: Milestone = { id: uid(), title, completed: false };
    setGoals(goals.map(g => g.id === goalId ? { ...g, milestones: [...g.milestones, milestone] } : g));
    setInlineInput(null);
  };

  const deleteMilestone = (goalId: string, milestoneId: string) => {
    setGoals(goals.map(g => {
      if (g.id !== goalId) return g;
      const milestones = g.milestones.filter(m => m.id !== milestoneId);
      const completedCount = milestones.filter(m => m.completed).length;
      const progress = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;
      return { ...g, milestones, progress };
    }));
  };

  const updateProgress = (goalId: string, progress: number) => {
    const today = todayStr();
    setGoals(goals.map(g => {
      if (g.id !== goalId) return g;
      const history = g.progressHistory ?? [];
      const filtered = history.filter(h => h.date !== today);
      return { ...g, progress, progressHistory: [...filtered, { date: today, value: progress }] };
    }));
  };

  const addFormMilestone = () => {
    if (!newMilestone.trim()) return;
    const milestone: Milestone = { id: uid(), title: newMilestone, completed: false };
    setForm(f => ({ ...f, milestones: [...f.milestones, milestone] }));
    setNewMilestone('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Goals</h1>
          <p className="text-sm text-slate-400 mt-0.5 font-medium">
            {goals.length} goal{goals.length !== 1 ? 's' : ''} · {goals.filter(g => g.progress === 100).length} completed
          </p>
        </div>
        <button onClick={openNew} className="px-4 py-2 bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-violet-200">
          + New Goal
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">◎</p>
          <p className="text-slate-400 text-sm">No goals yet. Create your first big goal.</p>
          <button onClick={openNew} className="mt-4 text-violet-600 text-sm hover:text-violet-700 font-semibold transition-colors">
            Create goal →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map(goal => {
            const catColor = CATEGORY_COLORS[goal.category] ?? CATEGORY_COLORS['Other'];
            return (
              <div key={goal.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div
                  className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedId(expandedId === goal.id ? null : goal.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          goal.progress === 100 ? 'bg-emerald-500' : 'bg-violet-500'
                        }`} />
                        <h3 className="text-sm font-bold text-slate-900">{goal.title}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${catColor.bg} ${catColor.text}`}>{goal.category}</span>
                        {goal.targetDate && <span className="text-[10px] text-slate-400 font-medium">by {goal.targetDate}</span>}
                      </div>
                      {goal.description && (
                        <p className="text-xs text-slate-400 mt-1 ml-4 truncate">{goal.description}</p>
                      )}
                      <div className="ml-4 mt-3">
                        <ProgressBar value={goal.progress} color={goal.progress === 100 ? '#10B981' : '#7C3AED'} />
                        <div className="flex justify-between mt-1">
                          <span className="text-[10px] text-slate-400 font-medium">
                            {goal.milestones.filter(m => m.completed).length}/{goal.milestones.length} milestones
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold">{goal.progress}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button onClick={e => { e.stopPropagation(); openEdit(goal); }} className="text-slate-400 hover:text-violet-600 text-xs transition-colors font-medium">Edit</button>
                      <button onClick={e => { e.stopPropagation(); deleteGoal(goal.id); }} className="text-slate-400 hover:text-red-500 text-xs transition-colors font-medium">Delete</button>
                      <span className={`text-slate-400 text-xs transition-transform inline-block ${ expandedId === goal.id ? 'rotate-180' : '' }`}>▾</span>
                    </div>
                  </div>
                </div>

                {expandedId === goal.id && (
                  <div className="border-t border-slate-100 px-4 py-4 space-y-4 bg-slate-50/50">
                    {goal.milestones.length === 0 && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <label className="text-xs text-slate-500 font-medium">Manual progress</label>
                          <span className="text-xs text-violet-600 font-bold">{goal.progress}%</span>
                        </div>
                        <input type="range" min={0} max={100} value={goal.progress}
                          onChange={e => updateProgress(goal.id, Number(e.target.value))}
                          className="w-full accent-violet-600 cursor-pointer"
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Milestones</p>
                      {goal.milestones.map(m => (
                        <div key={m.id} className="flex items-center gap-3 group">
                          <button onClick={() => toggleMilestone(goal.id, m.id)}
                            className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                              m.completed ? 'bg-violet-600 border-violet-600' : 'border-slate-300 hover:border-violet-400'
                            }`}>
                            {m.completed && <span className="text-white text-[8px]">✓</span>}
                          </button>
                          <span className={`text-sm flex-1 ${ m.completed ? 'line-through text-slate-300' : 'text-slate-700' }`}>{m.title}</span>
                          <button onClick={() => deleteMilestone(goal.id, m.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 text-sm transition-all">×</button>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-2">
                        <input type="text" placeholder="Add milestone…"
                          value={inlineInput?.goalId === goal.id ? inlineInput.title : ''}
                          onChange={e => setInlineInput({ goalId: goal.id, title: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter' && inlineInput?.goalId === goal.id) addMilestoneToGoal(goal.id, inlineInput.title); }}
                          onClick={e => e.stopPropagation()}
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-300 focus:outline-none focus:border-violet-400 transition-colors"
                        />
                        <button onClick={() => { if (inlineInput?.goalId === goal.id) addMilestoneToGoal(goal.id, inlineInput.title); }}
                          className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-600 rounded-xl text-xs font-semibold transition-colors">Add</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900">{editingGoal ? 'Edit Goal' : 'New Goal'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>

            <div className="space-y-3">
              <input type="text" placeholder="Goal title *" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-violet-400 transition-colors"
              />
              <textarea placeholder="Description (optional)" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-violet-400 transition-colors resize-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-violet-400 transition-colors">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Target date</label>
                  <input type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-violet-400 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-semibold mb-2 block">Milestones</label>
                <div className="space-y-1.5 mb-2">
                  {form.milestones.map(m => (
                    <div key={m.id} className="flex items-center gap-2">
                      <span className="text-violet-400 text-xs">◦</span>
                      <span className="text-sm text-slate-700 flex-1">{m.title}</span>
                      <button onClick={() => setForm(f => ({ ...f, milestones: f.milestones.filter(x => x.id !== m.id) }))}
                        className="text-slate-300 hover:text-red-500 text-sm">×</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Add milestone…" value={newMilestone}
                    onChange={e => setNewMilestone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addFormMilestone()}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-violet-400 transition-colors"
                  />
                  <button onClick={addFormMilestone} className="px-3 py-2 bg-violet-50 hover:bg-violet-100 text-violet-600 rounded-xl text-sm font-semibold transition-colors">Add</button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-500 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={saveGoal} disabled={!form.title.trim()}
                className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-violet-200">
                {editingGoal ? 'Save' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
