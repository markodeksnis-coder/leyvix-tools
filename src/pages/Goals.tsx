import { useState } from 'react';
import type { Goal, Milestone } from '../types';
import ProgressBar from '../components/ProgressBar';

interface GoalsProps {
  goals: Goal[];
  setGoals: (goals: Goal[]) => void;
}

const CATEGORIES = ['Career', 'Health', 'Mindset', 'Finance', 'Skills', 'Relationships', 'Personal', 'Other'];

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

  const openNew = () => {
    setEditingGoal(null);
    setForm(emptyForm());
    setNewMilestone('');
    setShowForm(true);
  };

  const openEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setForm({
      title: goal.title,
      description: goal.description,
      category: goal.category,
      progress: goal.progress,
      milestones: [...goal.milestones],
      targetDate: goal.targetDate ?? '',
    });
    setNewMilestone('');
    setShowForm(true);
  };

  const saveGoal = () => {
    if (!form.title.trim()) return;
    const today = todayStr();
    if (editingGoal) {
      const history = editingGoal.progressHistory ?? [];
      const filtered = history.filter(h => h.date !== today);
      const newHistory = form.progress !== editingGoal.progress
        ? [...filtered, { date: today, value: form.progress }]
        : history;
      setGoals(goals.map(g => g.id === editingGoal.id
        ? { ...editingGoal, ...form, progressHistory: newHistory }
        : g
      ));
    } else {
      const newGoal: Goal = {
        ...form,
        id: uid(),
        createdAt: new Date().toISOString(),
        progressHistory: form.progress > 0 ? [{ date: today, value: form.progress }] : [],
      };
      setGoals([...goals, newGoal]);
    }
    setShowForm(false);
  };

  const deleteGoal = (goalId: string) => {
    setGoals(goals.filter(g => g.id !== goalId));
    if (expandedId === goalId) setExpandedId(null);
  };

  const toggleMilestone = (goalId: string, milestoneId: string) => {
    const today = todayStr();
    setGoals(goals.map(g => {
      if (g.id !== goalId) return g;
      const milestones = g.milestones.map(m =>
        m.id === milestoneId ? { ...m, completed: !m.completed } : m
      );
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
          <h1 className="text-xl font-semibold text-white">Goals</h1>
          <p className="text-sm text-[#52525B] mt-0.5">
            {goals.length} goal{goals.length !== 1 ? 's' : ''} · {goals.filter(g => g.progress === 100).length} completed
          </p>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2 bg-[#818CF8] hover:bg-[#6366F1] text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New Goal
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">◎</p>
          <p className="text-[#52525B] text-sm">No goals yet. Create your first big goal.</p>
          <button onClick={openNew} className="mt-4 text-[#818CF8] text-sm hover:text-[#A5B4FC] transition-colors">
            Create goal →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map(goal => (
            <div key={goal.id} className="bg-[#111111] border border-[#1E1E1E] rounded-xl overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-[#161616] transition-colors"
                onClick={() => setExpandedId(expandedId === goal.id ? null : goal.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        goal.progress === 100 ? 'bg-[#34D399]' : 'bg-[#818CF8]'
                      }`} />
                      <h3 className="text-sm font-medium text-white">{goal.title}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1E1E1E] text-[#71717A]">{goal.category}</span>
                      {goal.targetDate && (
                        <span className="text-[10px] text-[#3F3F46]">by {goal.targetDate}</span>
                      )}
                    </div>
                    {goal.description && (
                      <p className="text-xs text-[#52525B] mt-1 ml-4 truncate">{goal.description}</p>
                    )}
                    <div className="ml-4 mt-3">
                      <ProgressBar value={goal.progress} />
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-[#3F3F46]">
                          {goal.milestones.filter(m => m.completed).length}/{goal.milestones.length} milestones
                        </span>
                        <span className="text-[10px] text-[#52525B]">{goal.progress}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); openEdit(goal); }}
                      className="text-[#3F3F46] hover:text-[#A1A1AA] text-xs transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteGoal(goal.id); }}
                      className="text-[#3F3F46] hover:text-[#F87171] text-xs transition-colors"
                    >
                      Delete
                    </button>
                    <span className={`text-[#52525B] text-xs transition-transform inline-block ${
                      expandedId === goal.id ? 'rotate-180' : ''
                    }`}>▾</span>
                  </div>
                </div>
              </div>

              {expandedId === goal.id && (
                <div className="border-t border-[#1A1A1A] px-4 py-4 space-y-4">
                  {goal.milestones.length === 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <label className="text-xs text-[#52525B]">Manual progress</label>
                        <span className="text-xs text-[#818CF8]">{goal.progress}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={goal.progress}
                        onChange={e => updateProgress(goal.id, Number(e.target.value))}
                        className="w-full accent-[#818CF8] cursor-pointer"
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-[11px] text-[#52525B] font-medium uppercase tracking-wider">Milestones</p>
                    {goal.milestones.map(m => (
                      <div key={m.id} className="flex items-center gap-3 group">
                        <button
                          onClick={() => toggleMilestone(goal.id, m.id)}
                          className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                            m.completed ? 'bg-[#818CF8] border-[#818CF8]' : 'border-[#333] hover:border-[#818CF8]'
                          }`}
                        >
                          {m.completed && <span className="text-white text-[8px]">✓</span>}
                        </button>
                        <span className={`text-sm flex-1 ${
                          m.completed ? 'line-through text-[#3F3F46]' : 'text-[#D4D4D8]'
                        }`}>
                          {m.title}
                        </span>
                        <button
                          onClick={() => deleteMilestone(goal.id, m.id)}
                          className="opacity-0 group-hover:opacity-100 text-[#3F3F46] hover:text-[#F87171] text-sm transition-all"
                        >
                          ×
                        </button>
                      </div>
                    ))}

                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        placeholder="Add milestone…"
                        value={inlineInput?.goalId === goal.id ? inlineInput.title : ''}
                        onChange={e => setInlineInput({ goalId: goal.id, title: e.target.value })}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && inlineInput?.goalId === goal.id) {
                            addMilestoneToGoal(goal.id, inlineInput.title);
                          }
                        }}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#818CF8] transition-colors"
                      />
                      <button
                        onClick={() => {
                          if (inlineInput?.goalId === goal.id) {
                            addMilestoneToGoal(goal.id, inlineInput.title);
                          }
                        }}
                        className="px-3 py-1.5 bg-[#818CF8]/10 hover:bg-[#818CF8]/20 text-[#818CF8] rounded-lg text-xs transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">{editingGoal ? 'Edit Goal' : 'New Goal'}</h2>
              <button onClick={() => setShowForm(false)} className="text-[#52525B] hover:text-white text-xl leading-none">×</button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Goal title *"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#818CF8] transition-colors"
              />
              <textarea
                placeholder="Description (optional)"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#818CF8] transition-colors resize-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#52525B] mb-1 block">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#818CF8] transition-colors"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#52525B] mb-1 block">Target date</label>
                  <input
                    type="date"
                    value={form.targetDate}
                    onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
                    className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#818CF8] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[#52525B] mb-2 block">Milestones</label>
                <div className="space-y-1.5 mb-2">
                  {form.milestones.map(m => (
                    <div key={m.id} className="flex items-center gap-2">
                      <span className="text-[#818CF8] text-xs">◦</span>
                      <span className="text-sm text-[#D4D4D8] flex-1">{m.title}</span>
                      <button
                        onClick={() => setForm(f => ({ ...f, milestones: f.milestones.filter(x => x.id !== m.id) }))}
                        className="text-[#3F3F46] hover:text-[#F87171] text-sm"
                      >×</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add milestone…"
                    value={newMilestone}
                    onChange={e => setNewMilestone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addFormMilestone()}
                    className="flex-1 bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#818CF8] transition-colors"
                  />
                  <button
                    onClick={addFormMilestone}
                    className="px-3 py-2 bg-[#818CF8]/10 hover:bg-[#818CF8]/20 text-[#818CF8] rounded-lg text-sm transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 border border-[#1E1E1E] text-[#71717A] text-sm rounded-lg hover:border-[#333] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveGoal}
                disabled={!form.title.trim()}
                className="flex-1 py-2.5 bg-[#818CF8] hover:bg-[#6366F1] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {editingGoal ? 'Save' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
