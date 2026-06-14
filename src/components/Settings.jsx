import { useState } from 'react'
import { X, Download, Upload } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'

const LS_KEYS = ['marko_habits','marko_content','marko_mind','marko_body','marko_diet','marko_relations','marko_business','marko_soul','marko_settings','marko_coach_messages']

export default function Settings({ onClose }) {
  const [settings, setSettings] = useLocalStorage('marko_settings', { name: 'Marko', apiKey: '' })
  const [draft, setDraft] = useState({ name: settings.name || 'Marko', apiKey: settings.apiKey || '' })
  const [saved, setSaved] = useState(false)

  const save = () => {
    setSettings({ ...settings, ...draft })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const exportData = () => {
    const data = {}
    LS_KEYS.forEach(k => {
      try { data[k] = JSON.parse(localStorage.getItem(k)) } catch {}
    })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `marko-os-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        LS_KEYS.forEach(k => {
          if (data[k] !== undefined) localStorage.setItem(k, JSON.stringify(data[k]))
        })
        window.location.reload()
      } catch { alert('Invalid backup file.') }
    }
    reader.readAsText(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 bg-[#111] border-l border-[#1f1f1f] w-80 h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Settings</span>
          <button onClick={onClose} className="text-neutral-700 hover:text-neutral-300 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-5 space-y-6">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-3">Profile</div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-1">Name</label>
                <input
                  value={draft.name}
                  onChange={e => setDraft({ ...draft, name: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-600"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-3">AI Coach</div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-1">
                Anthropic API Key
              </label>
              <input
                type="password"
                value={draft.apiKey}
                onChange={e => setDraft({ ...draft, apiKey: e.target.value })}
                placeholder="sk-ant-..."
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm text-white font-mono placeholder-neutral-800 focus:outline-none focus:border-neutral-600"
              />
              <p className="text-[10px] font-mono text-neutral-700 mt-1.5">Stored in localStorage only. Never sent anywhere except Anthropic.</p>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-3">Data</div>
            <div className="space-y-2">
              <button
                onClick={exportData}
                className="w-full flex items-center gap-2 px-4 py-2.5 border border-[#2a2a2a] text-neutral-400 text-xs hover:border-neutral-600 hover:text-neutral-200 transition-colors"
              >
                <Download size={13} />
                Export All Data (JSON)
              </button>
              <label className="w-full flex items-center gap-2 px-4 py-2.5 border border-[#2a2a2a] text-neutral-400 text-xs hover:border-neutral-600 hover:text-neutral-200 transition-colors cursor-pointer">
                <Upload size={13} />
                Import Backup (JSON)
                <input type="file" accept=".json" onChange={importData} className="hidden" />
              </label>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-3">Danger Zone</div>
            <button
              onClick={() => {
                if (window.confirm('Reset all data to defaults? This cannot be undone.')) {
                  LS_KEYS.forEach(k => localStorage.removeItem(k))
                  localStorage.removeItem('marko_initialized')
                  window.location.reload()
                }
              }}
              className="w-full px-4 py-2.5 border border-red-900/50 text-red-500/70 text-xs hover:border-red-700 hover:text-red-400 transition-colors"
            >
              Reset to Default Data
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#1f1f1f]">
          <button
            onClick={save}
            className="w-full py-2.5 bg-[#facc15] text-black text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-300 transition-colors"
          >
            {saved ? '✓ Saved' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
