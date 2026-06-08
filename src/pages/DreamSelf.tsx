import { useState } from 'react';
import type { DreamSelfData, LifeArea } from '../types';
import ProgressBar from '../components/ProgressBar';

interface DreamSelfProps {
  data: DreamSelfData;
  setData: (data: DreamSelfData) => void;
}

const DEFAULT_AREAS: LifeArea[] = [
  { id: '1', name: 'Health & Body', currentScore: 5, dreamScore: 9, currentDescription: '', dreamDescription: '' },
  { id: '2', name: 'Mindset', currentScore: 6, dreamScore: 9, currentDescription: '', dreamDescription: '' },
  { id: '3', name: 'Career', currentScore: 5, dreamScore: 9, currentDescription: '', dreamDescription: '' },
  { id: '4', name: 'Finance', currentScore: 4, dreamScore: 9, currentDescription: '', dreamDescription: '' },
  { id: '5', name: 'Relationships', currentScore: 6, dreamScore: 9, currentDescription: '', dreamDescription: '' },
  { id: '6', name: 'Skills', currentScore: 5, dreamScore: 9, currentDescription: '', dreamDescription: '' },
];

function uid() { return Math.random().toString(36).slice(2); }

export default function DreamSelf({ data, setData }: DreamSelfProps) {
  const [editingArea, setEditingArea] = useState<LifeArea | null>(null);
  const [editingVision, setEditingVision] = useState(false);
  const [visionDraft, setVisionDraft] = useState(data.visionText);
  const [showAddArea, setShowAddArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');

  const updateArea = (area: LifeArea) => {
    setData({ ...data, lifeAreas: data.lifeAreas.map(a => a.id === area.id ? area : a) });
    setEditingArea(null);
  };

  const deleteArea = (id: string) => {
    setData({ ...data, lifeAreas: data.lifeAreas.filter(a => a.id !== id) });
    setEditingArea(null);
  };

  const addArea = () => {
    if (!newAreaName.trim()) return;
    const area: LifeArea = { id: uid(), name: newAreaName, currentScore: 5, dreamScore: 9, currentDescription: '', dreamDescription: '' };
    setData({ ...data, lifeAreas: [...data.lifeAreas, area] });
    setNewAreaName('');
    setShowAddArea(false);
  };

  const saveVision = () => { setData({ ...data, visionText: visionDraft }); setEditingVision(false); };

  const overallProgress = data.lifeAreas.length > 0
    ? Math.round(data.lifeAreas.reduce((sum, a) => sum + (a.currentScore / (a.dreamScore || 10)) * 100, 0) / data.lifeAreas.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Dream Self</h1>
          <p className="text-sm text-slate-400 mt-0.5 font-medium">Where you are vs where you want to be</p>
        </div>
        {data.lifeAreas.length > 0 && (
          <div className="text-right">
            <p className="text-2xl font-black text-violet-600">{overallProgress}%</p>
            <p className="text-[11px] text-slate-400 font-medium">overall alignment</p>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900">My Vision</h2>
          <button onClick={() => { setVisionDraft(data.visionText); setEditingVision(true); }}
            className="text-xs text-violet-600 hover:text-violet-700 font-semibold transition-colors">
            {data.visionText ? 'Edit' : 'Write vision'}
          </button>
        </div>
        {data.visionText ? (
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{data.visionText}</p>
        ) : (
          <p className="text-sm text-slate-300 italic">Who do you want to become? What does your dream life look like? Write it here.</p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Life Areas</h2>
          <button onClick={() => setShowAddArea(true)} className="text-xs text-violet-600 hover:text-violet-700 font-semibold transition-colors">+ Add area</button>
        </div>

        {data.lifeAreas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-4">✦</p>
            <p className="text-slate-400 text-sm">Map out your life areas to see your gap clearly</p>
            <button onClick={() => setData({ ...data, lifeAreas: DEFAULT_AREAS })}
              className="mt-4 px-4 py-2 bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-violet-200">
              Start with defaults
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.lifeAreas.map(area => {
              const gap = area.dreamScore - area.currentScore;
              const gapColor = gap > 4 ? '#EF4444' : gap > 2 ? '#F59E0B' : '#10B981';
              return (
                <div key={area.id} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">{area.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ color: gapColor, backgroundColor: `${gapColor}18` }}>
                        {gap > 0 ? `Gap: ${gap}` : 'Aligned'}
                      </span>
                      <button onClick={() => setEditingArea({ ...area })} className="text-slate-400 hover:text-violet-600 text-xs font-semibold transition-colors">Edit</button>
                    </div>
                  </div>
                  <ProgressBar value={area.currentScore} max={area.dreamScore || 10} color={gapColor} />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-[10px] text-slate-400 font-medium mb-1">Now</p>
                      <p className="text-slate-900 font-black">{area.currentScore}<span className="text-slate-300 font-normal text-xs">/10</span></p>
                      {area.currentDescription && <p className="text-slate-500 mt-1 text-[11px] leading-snug">{area.currentDescription}</p>}
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-[10px] text-slate-400 font-medium mb-1">Dream</p>
                      <p className="font-black" style={{ color: gapColor }}>{area.dreamScore}<span className="text-slate-300 font-normal text-xs">/10</span></p>
                      {area.dreamDescription && <p className="text-slate-500 mt-1 text-[11px] leading-snug">{area.dreamDescription}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingVision && (
        <Modal title="My Vision" onClose={() => setEditingVision(false)}>
          <p className="text-xs text-slate-500 mb-3">Describe your ideal future self, life, and who you want to become.</p>
          <textarea value={visionDraft} onChange={e => setVisionDraft(e.target.value)} rows={8}
            placeholder="In 5 years, I am..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-violet-400 transition-colors resize-none"
          />
          <div className="flex gap-3 mt-4">
            <button onClick={() => setEditingVision(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-500 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={saveVision} className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-violet-200">Save Vision</button>
          </div>
        </Modal>
      )}

      {editingArea && (
        <Modal title={`Edit: ${editingArea.name}`} onClose={() => setEditingArea(null)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-500 font-semibold mb-1 block">Area name</label>
              <input value={editingArea.name} onChange={e => setEditingArea(a => a && ({ ...a, name: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-violet-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 font-semibold mb-1 block">Current: <span className="text-violet-600 font-black">{editingArea.currentScore}</span></label>
                <input type="range" min={1} max={10} value={editingArea.currentScore}
                  onChange={e => setEditingArea(a => a && ({ ...a, currentScore: Number(e.target.value) }))}
                  className="w-full accent-violet-600"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-semibold mb-1 block">Dream: <span className="text-violet-600 font-black">{editingArea.dreamScore}</span></label>
                <input type="range" min={1} max={10} value={editingArea.dreamScore}
                  onChange={e => setEditingArea(a => a && ({ ...a, dreamScore: Number(e.target.value) }))}
                  className="w-full accent-violet-600"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-semibold mb-1 block">Current state description</label>
              <textarea value={editingArea.currentDescription}
                onChange={e => setEditingArea(a => a && ({ ...a, currentDescription: e.target.value }))}
                rows={2} placeholder="Where you are now…"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-violet-400 resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-semibold mb-1 block">Dream state description</label>
              <textarea value={editingArea.dreamDescription}
                onChange={e => setEditingArea(a => a && ({ ...a, dreamDescription: e.target.value }))}
                rows={2} placeholder="Where you want to be…"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-violet-400 resize-none"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => deleteArea(editingArea.id)}
              className="px-3 py-2.5 border border-red-200 text-red-500 text-sm font-semibold rounded-xl hover:bg-red-50 transition-colors">Delete</button>
            <button onClick={() => setEditingArea(null)} className="flex-1 py-2.5 border border-slate-200 text-slate-500 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={() => updateArea(editingArea)} className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-violet-200">Save</button>
          </div>
        </Modal>
      )}

      {showAddArea && (
        <Modal title="New Life Area" onClose={() => setShowAddArea(false)}>
          <input type="text" placeholder="e.g. Spirituality, Creativity…" value={newAreaName}
            onChange={e => setNewAreaName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addArea()}
            autoFocus
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-violet-400"
          />
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowAddArea(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-500 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={addArea} disabled={!newAreaName.trim()}
              className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-violet-200">Add</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-black text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
