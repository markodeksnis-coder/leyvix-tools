import { useState } from 'react';
import type { Priority, Project } from '../types';
import ProgressBar from '../components/ProgressBar';

interface DailyFocusProps {
  priorities: Priority[];
  setPriorities: (p: Priority[]) => void;
  projects: Project[];
  setProjects: (p: Project[]) => void;
}

function uid() { return Math.random().toString(36).slice(2); }
function todayStr() { return new Date().toISOString().split('T')[0]; }

export default function DailyFocus({ priorities, setPriorities, projects, setProjects }: DailyFocusProps) {
  const [newItem, setNewItem] = useState('');
  const [isPriority, setIsPriority] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectDraft, setProjectDraft] = useState({ title: '', description: '', progress: 0 });
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const today = todayStr();
  const todayItems = priorities.filter(p => p.date === today);
  const pastItems = priorities.filter(p => p.date < today).slice(-15).reverse();
  const topPriorities = todayItems.filter(p => p.isPriority);
  const tasks = todayItems.filter(p => !p.isPriority);
  const completedCount = todayItems.filter(p => p.completed).length;
  const totalCount = todayItems.length;

  const addItem = () => {
    if (!newItem.trim()) return;
    const item: Priority = {
      id: uid(),
      title: newItem.trim(),
      completed: false,
      date: today,
      isPriority,
    };
    setPriorities([...priorities, item]);
    setNewItem('');
  };

  const toggle = (id: string) => {
    setPriorities(priorities.map(p => p.id === id ? { ...p, completed: !p.completed } : p));
  };

  const remove = (id: string) => {
    setPriorities(priorities.filter(p => p.id !== id));
  };

  const saveProject = () => {
    if (!projectDraft.title.trim()) return;
    if (editingProject) {
      setProjects(projects.map(p => p.id === editingProject.id ? { ...editingProject, ...projectDraft } : p));
    } else {
      const project: Project = { ...projectDraft, id: uid(), status: 'active' };
      setProjects([...projects, project]);
    }
    setProjectDraft({ title: '', description: '', progress: 0 });
    setEditingProject(null);
    setShowProjectForm(false);
  };

  const updateProjectProgress = (id: string, progress: number) => {
    setProjects(projects.map(p => p.id === id ? { ...p, progress } : p));
  };

  const updateProjectStatus = (id: string, status: Project['status']) => {
    setProjects(projects.map(p => p.id === id ? { ...p, status } : p));
  };

  const deleteProject = (id: string) => {
    setProjects(projects.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Daily Focus</h1>
        <p className="text-sm text-[#52525B] mt-0.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          {totalCount > 0 && ` · ${completedCount}/${totalCount} done`}
        </p>
      </div>

      {totalCount > 0 && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4">
          <div className="flex justify-between mb-2">
            <span className="text-xs text-[#52525B]">Day progress</span>
            <span className="text-xs text-white">{Math.round((completedCount / totalCount) * 100)}%</span>
          </div>
          <ProgressBar value={completedCount} max={totalCount} color="#818CF8" height="h-2" />
        </div>
      )}

      <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={isPriority ? 'Add top priority…' : 'Add task…'}
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            className="flex-1 bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#818CF8] transition-colors"
          />
          <button
            onClick={addItem}
            disabled={!newItem.trim()}
            className="px-4 py-2.5 bg-[#818CF8] hover:bg-[#6366F1] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Add
          </button>
        </div>
        <button
          onClick={() => setIsPriority(!isPriority)}
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
          <ul className="space-y-1">
            {topPriorities.map(item => (
              <ItemRow key={item.id} item={item} onToggle={toggle} onRemove={remove} />
            ))}
          </ul>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4">
          <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-wider mb-3">Tasks</p>
          <ul className="space-y-1">
            {tasks.map(item => (
              <ItemRow key={item.id} item={item} onToggle={toggle} onRemove={remove} />
            ))}
          </ul>
        </div>
      )}

      {todayItems.length === 0 && (
        <div className="text-center py-8">
          <p className="text-[#3F3F46] text-sm">Nothing added yet. What will you focus on today?</p>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Working On</h2>
          <button
            onClick={() => { setProjectDraft({ title: '', description: '', progress: 0 }); setEditingProject(null); setShowProjectForm(true); }}
            className="text-xs text-[#818CF8] hover:text-[#A5B4FC] transition-colors"
          >
            + Add project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-6 text-center">
            <p className="text-[#3F3F46] text-sm">No projects yet. Add what you're working on.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map(project => (
              <div key={project.id} className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        project.status === 'active' ? 'bg-[#34D399]' :
                        project.status === 'paused' ? 'bg-[#FBBF24]' : 'bg-[#3F3F46]'
                      }`} />
                      <h3 className="text-sm font-medium text-white">{project.title}</h3>
                    </div>
                    {project.description && (
                      <p className="text-xs text-[#52525B] mt-1 ml-4">{project.description}</p>
                    )}
                  </div>
                  <div className="flex gap-3 flex-shrink-0">
                    <button
                      onClick={() => {
                        setProjectDraft({ title: project.title, description: project.description, progress: project.progress });
                        setEditingProject(project);
                        setShowProjectForm(true);
                      }}
                      className="text-[#3F3F46] hover:text-[#A1A1AA] text-xs transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="text-[#3F3F46] hover:text-[#F87171] text-xs transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#52525B]">Progress</span>
                    <span className="text-white">{project.progress}%</span>
                  </div>
                  <input
                    type="range"
                    min={0} max={100}
                    value={project.progress}
                    onChange={e => updateProjectProgress(project.id, Number(e.target.value))}
                    className="w-full accent-[#818CF8] cursor-pointer"
                  />
                </div>

                <div className="flex gap-1">
                  {(['active', 'paused', 'completed'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => updateProjectStatus(project.id, s)}
                      className={`text-[11px] px-2.5 py-0.5 rounded capitalize transition-colors ${
                        project.status === s
                          ? s === 'active' ? 'bg-[#34D399]/10 text-[#34D399]'
                          : s === 'paused' ? 'bg-[#FBBF24]/10 text-[#FBBF24]'
                          : 'bg-[#3F3F46]/20 text-[#71717A]'
                          : 'text-[#3F3F46] hover:text-[#52525B]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pastItems.length > 0 && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4">
          <p className="text-[11px] font-semibold text-[#3F3F46] uppercase tracking-wider mb-3">Previous Days</p>
          <div className="space-y-1">
            {pastItems.slice(0, 6).map(item => (
              <div key={item.id} className="flex items-center gap-3 py-0.5">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  item.completed ? 'bg-[#34D399]/40' : 'border border-[#333]'
                }`} />
                <span className={`text-xs flex-1 ${
                  item.completed ? 'text-[#3F3F46] line-through' : 'text-[#52525B]'
                }`}>{item.title}</span>
                <span className="text-[10px] text-[#2A2A2A]">{item.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showProjectForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">{editingProject ? 'Edit Project' : 'New Project'}</h2>
              <button onClick={() => setShowProjectForm(false)} className="text-[#52525B] hover:text-white text-xl leading-none">×</button>
            </div>
            <input
              type="text"
              placeholder="Project name *"
              value={projectDraft.title}
              onChange={e => setProjectDraft(d => ({ ...d, title: e.target.value }))}
              autoFocus
              className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#818CF8]"
            />
            <textarea
              placeholder="Short description (optional)"
              value={projectDraft.description}
              onChange={e => setProjectDraft(d => ({ ...d, description: e.target.value }))}
              rows={2}
              className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#818CF8] resize-none"
            />
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs text-[#52525B]">Starting progress</label>
                <span className="text-xs text-white">{projectDraft.progress}%</span>
              </div>
              <input
                type="range" min={0} max={100}
                value={projectDraft.progress}
                onChange={e => setProjectDraft(d => ({ ...d, progress: Number(e.target.value) }))}
                className="w-full accent-[#818CF8]"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowProjectForm(false)} className="flex-1 py-2.5 border border-[#1E1E1E] text-[#71717A] text-sm rounded-lg">Cancel</button>
              <button
                onClick={saveProject}
                disabled={!projectDraft.title.trim()}
                className="flex-1 py-2.5 bg-[#818CF8] hover:bg-[#6366F1] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {editingProject ? 'Save' : 'Add Project'}
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
      <button
        onClick={() => onToggle(item.id)}
        className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${
          item.completed ? 'bg-[#818CF8] border-[#818CF8]' : 'border-[#333] hover:border-[#818CF8]'
        }`}
      >
        {item.completed && <span className="text-white text-[10px]">✓</span>}
      </button>
      <span className={`text-sm flex-1 ${
        item.completed ? 'line-through text-[#3F3F46]' : 'text-[#E4E4E7]'
      }`}>
        {item.title}
      </span>
      <button
        onClick={() => onRemove(item.id)}
        className="opacity-0 group-hover:opacity-100 text-[#3F3F46] hover:text-[#F87171] text-lg transition-all leading-none"
      >
        ×
      </button>
    </li>
  );
}
