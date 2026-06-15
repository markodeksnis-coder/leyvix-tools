import { useState } from 'react'
import { X, Upload } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'

const LS_KEYS = ['marko_habits','marko_content','marko_mind','marko_body','marko_diet','marko_relations','marko_business','marko_soul','marko_settings','marko_coach_messages']

const cls = {
  input: "w-full bg-[#080808] border border-[#2a2a2a] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#dc2626] transition-colors",
  label: "block text-[9px] font-mono uppercase tracking-widest text-[#444] mb-1.5",
  section: "text-[9px] font-mono uppercase tracking-widest text-[#dc2626] mb-3",
}

export default function Settings({ onClose }) {
  const [settings, setSettings] = useLocalStorage('marko_settings', { name: 'Marko' })
  const [apiKey, setApiKey] = useState(localStorage.getItem('anthropic_key') || '')
  const [name, setName] = useState(settings.name || 'Marko')
  const [saved, setSaved] = useState(false)
  const appStart = localStorage.getItem('marko_app_start') || new Date().toISOString().split('T')[0]
  const dayNum = Math.max(1, Math.floor((Date.now() - new Date(appStart).getTime()) / 86400000) + 1)

  const save = () => {
    setSettings({ ...settings, name })
    localStorage.setItem('anthropic_key', apiKey.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const importData = e => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result)
        LS_KEYS.forEach(k => { if (data[k] !== undefined) localStorage.setItem(k, JSON.stringify(data[k])) })
        window.location.reload()
      } catch { alert('Invalid backup file.') }
    }
    reader.readAsText(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 bg-[#0f0f0f] border-l border-[#2a2a2a] w-80 h-full flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#555]">Settings</span>
          <button onClick={onClose} className="text-[#444] hover:text-white transition-colors"><X size={15} /></button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-5 space-y-6">
          <div>
            <div className={cls.section}>App</div>
            <div className="bg-[#141414] border border-[#2a2a2a] p-3">
              <div className="text-[9px] font-mono text-[#444] uppercase tracking-widest">Day of the war</div>
              <div className="text-3xl font-mono font-black text-[#dc2626] mt-1">Day {dayNum}</div>
              <div className="text-[9px] font-mono text-[#333] mt-0.5">Since {appStart}</div>
            </div>
          </div>

          <div>
            <div className={cls.section}>Profile</div>
            <div><label className={cls.label}>Your Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className={cls.input} />
            </div>
          </div>

          <div>
            <div className={cls.section}>AI Coach</div>
            <div>
              <label className={cls.label}>Anthropic API Key</label>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-ant-..." className={cls.input + " font-mono"} />
              <p className="text-[9px] font-mono text-[#333] mt-1.5">Stored locally. Never sent anywhere except Anthropic.</p>
            </div>
          </div>

          <div>
            <div className={cls.section}>Data</div>
            <label className="w-full flex items-center gap-2 px-4 py-2.5 border border-[#2a2a2a] text-[#555] text-[10px] uppercase tracking-widest hover:border-[#dc2626] hover:text-white transition-colors cursor-pointer">
              <Upload size={11} /> Import Backup
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
          </div>

          <div>
            <div className={cls.section}>Danger Zone</div>
            <button
              onClick={() => {
                if (window.confirm('Reset ALL data? This cannot be undone.')) {
                  LS_KEYS.forEach(k => localStorage.removeItem(k))
                  localStorage.removeItem('marko_initialized')
                  localStorage.removeItem('anthropic_key')
                  localStorage.removeItem('marko_app_start')
                  window.location.reload()
                }
              }}
              className="w-full px-4 py-2.5 border border-red-900/50 text-red-600/70 text-[10px] uppercase tracking-widest hover:border-[#dc2626] hover:text-[#dc2626] transition-colors"
            >
              Reset All Data
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#2a2a2a]">
          <button
            onClick={save}
            className="w-full py-2.5 bg-[#dc2626] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 transition-colors"
          >
            {saved ? '✓ SAVED' : 'SAVE SETTINGS'}
          </button>
        </div>
      </div>
    </div>
  )
}
