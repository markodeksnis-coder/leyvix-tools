import { useState, useRef } from 'react';
import type { VisionImage } from '../types';

interface VisionBoardProps {
  images: VisionImage[];
  setImages: (imgs: VisionImage[]) => void;
  onClose: () => void;
}

function uid() { return Math.random().toString(36).slice(2); }

async function compressImage(dataUrl: string): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 1200;
      const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export default function VisionBoard({ images, setImages, onClose }: VisionBoardProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fullscreen, setFullscreen] = useState<VisionImage | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setPreview(null); setUrlInput(''); setCaption(''); setLoading(false); };

  const handleFile = async (file: File) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async e => {
      const raw = e.target?.result as string;
      const compressed = await compressImage(raw);
      setPreview(compressed);
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const addImage = () => {
    const src = addMode === 'url' ? urlInput.trim() : preview;
    if (!src) return;
    try {
      setImages([...images, { id: uid(), src, caption: caption.trim() || undefined, addedAt: new Date().toISOString() }]);
      reset();
      setShowAdd(false);
    } catch {
      alert('Storage is full. Try removing some photos first.');
    }
  };

  const remove = (id: string) => setImages(images.filter(img => img.id !== id));
  const canAdd = addMode === 'url' ? urlInput.trim().length > 0 : preview !== null;

  return (
    <div className="flex flex-col h-full relative bg-white">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 flex-shrink-0">
        <div>
          <h2 className="text-sm font-black text-slate-900">Vision Board</h2>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Your future, visualized</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { reset(); setShowAdd(true); }}
            className="text-xs px-3 py-1.5 bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600 text-white font-semibold rounded-xl transition-all shadow-md shadow-violet-200"
          >
            + Photo
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="text-5xl mb-4">🌅</div>
            <p className="text-sm font-bold text-slate-900 mb-1">Your vision board is empty</p>
            <p className="text-xs text-slate-400 leading-relaxed mb-5">
              Add photos that represent your dreams,<br />goals, and the life you're building
            </p>
            <button
              onClick={() => { reset(); setShowAdd(true); }}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-violet-200"
            >
              Add First Photo
            </button>
          </div>
        ) : (
          <div className="columns-2 gap-2">
            {images.map(img => (
              <div
                key={img.id}
                className="break-inside-avoid relative group rounded-xl overflow-hidden cursor-pointer mb-2 bg-slate-100"
                onClick={() => setFullscreen(img)}
              >
                <img src={img.src} alt={img.caption ?? ''} className="w-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                {img.caption && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 pt-6 pb-2">
                    <p className="text-[11px] text-white font-semibold leading-tight">{img.caption}</p>
                  </div>
                )}
                <button
                  onClick={e => { e.stopPropagation(); remove(img.id); }}
                  className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/40 hover:bg-red-500 text-white rounded-full text-xs leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="absolute inset-0 bg-white z-10 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 flex-shrink-0">
            <h3 className="text-sm font-black text-slate-900">Add Photo</h3>
            <button onClick={() => { setShowAdd(false); reset(); }} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
              {(['upload', 'url'] as const).map(m => (
                <button key={m} onClick={() => { setAddMode(m); reset(); }}
                  className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition-all ${
                    addMode === m ? 'bg-gradient-to-r from-violet-600 to-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}>
                  {m === 'upload' ? '📁 Upload File' : '🔗 Image URL'}
                </button>
              ))}
            </div>

            {addMode === 'upload' ? (
              <div>
                {loading ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                    <p className="text-sm text-slate-400 font-medium">Compressing…</p>
                  </div>
                ) : !preview ? (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-violet-400 rounded-2xl p-8 text-center cursor-pointer transition-colors group"
                  >
                    <p className="text-4xl mb-2">📷</p>
                    <p className="text-sm text-slate-700 font-semibold group-hover:text-violet-600 transition-colors">Tap to choose a photo</p>
                    <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP, GIF</p>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <img src={preview} alt="Preview" className="w-full rounded-2xl object-cover max-h-56" />
                    <button onClick={reset} className="text-xs text-red-400 hover:text-red-500 font-medium transition-colors">Choose different photo</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <input type="url" placeholder="Paste image URL…" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-violet-400"
                />
                {urlInput && (
                  <img src={urlInput} alt="Preview" className="w-full rounded-2xl object-cover max-h-48"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    onLoad={e => { (e.target as HTMLImageElement).style.display = ''; }}
                  />
                )}
              </div>
            )}

            <div>
              <label className="text-xs text-slate-500 font-semibold mb-1.5 block">Caption (optional)</label>
              <input type="text" placeholder="e.g. Dream home, Financial freedom…" value={caption}
                onChange={e => setCaption(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && canAdd && addImage()}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-violet-400"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowAdd(false); reset(); }}
                className="flex-1 py-2.5 border border-slate-200 text-slate-500 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={addImage} disabled={!canAdd}
                className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-violet-200">Add to Board</button>
            </div>
          </div>
        </div>
      )}

      {fullscreen && (
        <div className="absolute inset-0 bg-slate-900 z-20 flex flex-col">
          <div className="flex items-center justify-between p-4 flex-shrink-0">
            <p className="text-sm font-semibold text-white truncate flex-1">{fullscreen.caption ?? ''}</p>
            <button onClick={() => setFullscreen(null)} className="text-white text-2xl leading-none ml-3 flex-shrink-0">×</button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4 min-h-0">
            <img src={fullscreen.src} alt={fullscreen.caption ?? ''} className="max-w-full max-h-full object-contain rounded-xl" />
          </div>
          <div className="p-4 flex-shrink-0">
            <button onClick={() => { remove(fullscreen.id); setFullscreen(null); }}
              className="w-full py-2.5 border border-red-400/40 text-red-400 text-sm font-medium rounded-xl hover:bg-red-500/10 transition-colors">Remove from Board</button>
          </div>
        </div>
      )}
    </div>
  );
}
