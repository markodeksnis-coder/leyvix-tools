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
    const area: LifeArea = {
      id: uid(),
      name: newAreaName,
      currentScore: 5,
      dreamScore: 9,
      currentDescription: '',
      dreamDescription: '',
    };
    setData({ ...data, lifeAreas: [...data.lifeAreas, area] });
    setNewAreaName('');
    setShowAddArea(false);
  };

  const saveVision = () => {
    setData({ ...data, visionText: visionDraft });
    setEditingVision(false);
  };

  const overallProgress = data.lifeAreas.length > 0
    ? Math.round(data.lifeAreas.reduce((sum, a) => sum + (a.currentScore / (a.dreamScore || 10)) * 100, 0) / data.lifeAreas.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Dream Self</h1>
          <p className="text-sm text-[#52525B] mt-0.5">Where you are vs where you want to be</p>
        </div>
        {data.lifeAreas.length > 0 && (
          <div className="text-right">
            <p className="text-2xl font-bold text-[#818CF8]">{overallProgress}%</p>
            <p className="text-[11px] text-[#3F3F46]">overall alignment</p>
          </div>
        )}
      </div>

      <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">My Vision</h2>
          <button
            onClick={() => { setVisionDraft(data.visionText); setEditingVision(true); }}
            className="text-xs text-[#818CF8] hover:text-[#A5B4FC] transition-colors"
          >
            {data.visionText ? 'Edit' : 'Write vision'}
          </button>
        </div>
        {data.visionText ? (
          <p className="text-sm text-[#A1A1AA] leading-relaxed whitespace-pre-wrap">{data.visionText}</p>
        ) : (
          <p className="text-sm text-[#3F3F46] italic">
            Who do you want to become? What does your dream life look like? Write it here.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Life Areas</h2>
          <button
            onClick={() => setShowAddArea(true)}
            className="text-xs text-[#818CF8] hover:text-[#A5B4FC] transition-colors"
          >
            + Add area
          </button>
        </div>

        {data.lifeAreas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-4">✦</p>
            <p className="text-[#52525B] text-sm">Map out your life areas to see your gap clearly</p>
            <button
              onClick={() => setData({ ...data, lifeAreas: DEFAULT_AREAS })}
              className="mt-4 px-4 py-2 bg-[#818CF8] hover:bg-[#6366F1] text-white text-sm rounded-lg transition-colors"
            >
              Start with defaults
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.lifeAreas.map(area => {
              const gap = area.dreamScore - area.currentScore;
              const gapColor = gap > 4 ? '#F87171' : gap > 2 ? '#FBBF24' : '#34D399';
              return (
                <div key={area.id} className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-white">{area.name}</h3>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-semibold px-1.5 py-0.5 rounded"
                        style={{ color: gapColor, backgroundColor: `${gapColor}18` }}
                      >
                        {gap > 0 ? `Gap: ${gap}` : 'Aligned'}
                      </span>
                      <button
                        onClick={() => setEditingArea({ ...area })}
                        className="text-[#3F3F46] hover:text-[#A1A1AA] text-xs transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                  <ProgressBar value={area.currentScore} max={area.dreamScore || 10} color={gapColor} />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#0A0A0A] rounded-lg p-2.5">
                      <p className="text-[10px] text-[#52525B] mb-1">Now</p>
                      <p className="text-white font-semibold">
                        {area.currentScore}<span className="text-[#3F3F46] font-normal text-xs">/10</span>
                      </p>
                      {area.currentDescription && (
                        <p className="text-[#52525B] mt-1 text-[11px] leading-snug">{area.currentDescription}</p>
                      )}
                    </div>
                    <div className="bg-[#0A0A0A] rounded-lg p-2.5">
                      <p className="text-[10px] text-[#52525B] mb-1">Dream</p>
                      <p className="font-semibold" style={{ color: gapColor }}>
                        {area.dreamScore}<span className="text-[#3F3F46] font-normal text-xs">/10</span>
                      </p>
                      {area.dreamDescription && (
                        <p className="text-[#52525B] mt-1 text-[11px] leading-snug">{area.dreamDescription}</p>
                      )}
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
          <p className="text-xs text-[#52525B] mb-3">Describe your ideal future self, life, and who you want to become.</p>
          <textarea
            value={visionDraft}
            onChange={e => setVisionDraft(e.target.value)}
            rows={8}
            placeholder="In 5 years, I am..."
            className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#818CF8] transition-colors resize-none"
          />
          <div className="flex gap-3 mt-4">
            <button onClick={() => setEditingVision(false)} className="flex-1 py-2.5 border border-[#1E1E1E] text-[#71717A] text-sm rounded-lg">Cancel</button>
            <button onClick={saveVision} className="flex-1 py-2.5 bg-[#818CF8] hover:bg-[#6366F1] text-white text-sm font-medium rounded-lg transition-colors">Save Vision</button>
          </div>
        </Modal>
      )}

      {editingArea && (
        <Modal title={`Edit: ${editingArea.name}`} onClose={() => setEditingArea(null)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[#52525B] mb-1 block">Area name</label>
              <input
                value={editingArea.name}
                onChange={e => setEditingArea(a => a && ({ ...a, name: e.target.value }))}
                className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#818CF8]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#52525B] mb-1 block">
                  Current: <span className="text-white">{editingArea.currentScore}</span>
                </label>
                <input
                  type="range" min={1} max={10} value={editingArea.currentScore}
                  onChange={e => setEditingArea(a => a && ({ ...a, currentScore: Number(e.target.value) }))}
                  className="w-full accent-[#818CF8]"
                />
              </div>
              <div>
                <label className="text-xs text-[#52525B] mb-1 block">
                  Dream: <span className="text-white">{editingArea.dreamScore}</span>
                </label>
                <input
                  type="range" min={1} max={10} value={editingArea.dreamScore}
                  onChange={e => setEditingArea(a => a && ({ ...a, dreamScore: Number(e.target.value) }))}
                  className="w-full accent-[#818CF8]"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#52525B] mb-1 block">Current state description</label>
              <textarea
                value={editingArea.currentDescription}
                onChange={e => setEditingArea(a => a && ({ ...a, currentDescription: e.target.value }))}
                rows={2}
                placeholder="Where you are now…"
                className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#818CF8] resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-[#52525B] mb-1 block">Dream state description</label>
              <textarea
                value={editingArea.dreamDescription}
                onChange={e => setEditingArea(a => a && ({ ...a, dreamDescription: e.target.value }))}
                rows={2}
                placeholder="Where you want to be…"
                className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#818CF8] resize-none"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => deleteArea(editingArea.id)}
              className="px-3 py-2.5 border border-[#F87171]/30 text-[#F87171] text-sm rounded-lg hover:bg-[#F87171]/10 transition-colors"
            >
              Delete
            </button>
            <button onClick={() => setEditingArea(null)} className="flex-1 py-2.5 border border-[#1E1E1E] text-[#71717A] text-sm rounded-lg">Cancel</button>
            <button onClick={() => updateArea(editingArea)} className="flex-1 py-2.5 bg-[#818CF8] hover:bg-[#6366F1] text-white text-sm font-medium rounded-lg transition-colors">Save</button>
          </div>
        </Modal>
      )}

      {showAddArea && (
        <Modal title="New Life Area" onClose={() => setShowAddArea(false)}>
          <input
            type="text"
            placeholder="e.g. Spirituality, Creativity…"
            value={newAreaName}
            onChange={e => setNewAreaName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addArea()}
            autoFocus
            className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#3F3F46] focus:outline-none focus:border-[#818CF8]"
          />
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowAddArea(false)} className="flex-1 py-2.5 border border-[#1E1E1E] text-[#71717A] text-sm rounded-lg">Cancel</button>
            <button
              onClick={addArea}
              disabled={!newAreaName.trim()}
              className="flex-1 py-2.5 bg-[#818CF8] hover:bg-[#6366F1] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-[#52525B] hover:text-white text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
