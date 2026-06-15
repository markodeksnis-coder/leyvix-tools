import { ScrollText, Brain, Dumbbell, Users, TrendingUp, Flame, MessageSquare, Settings, Zap, Download, PlayCircle } from 'lucide-react'

const NAV = [
  { id: 'record',      label: 'The Record',  icon: ScrollText },
  { id: 'mind',        label: 'Mind',        icon: Brain },
  { id: 'body',        label: 'Body',        icon: Dumbbell },
  { id: 'relations',   label: 'Relations',   icon: Users },
  { id: 'business',    label: 'Business',    icon: TrendingUp },
  { id: 'soul',        label: 'Soul',        icon: Flame },
  { id: 'coach',       label: 'Coach',       icon: MessageSquare },
  { id: 'growth-feed', label: 'Growth Feed', icon: PlayCircle },
]

function exportData() {
  const keys = ['marko_habits','marko_content','marko_mind','marko_body','marko_diet','marko_relations','marko_business','marko_soul','marko_settings','marko_coach_messages']
  const data = {}
  keys.forEach(k => { try { data[k] = JSON.parse(localStorage.getItem(k)) } catch {} })
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `marko-os-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Sidebar({ active, onSelect, onSettings }) {
  return (
    <aside className="w-52 border-r border-[#2a2a2a] flex flex-col shrink-0 bg-[#080808]">
      <div className="px-5 py-5 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-1.5">
          <Zap size={14} className="text-[#dc2626]" fill="#dc2626" />
          <div className="text-base font-black tracking-widest text-[#dc2626] uppercase">MARKO OS</div>
        </div>
        <div className="text-[8px] font-mono tracking-[0.25em] text-[#222] uppercase mt-0.5">Personal Operating System</div>
      </div>

      <nav className="flex-1 py-2">
        {NAV.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-all border-l-2 ${
                isActive
                  ? 'text-white bg-[#dc2626]/10 border-l-[#dc2626]'
                  : 'text-[#444] hover:text-[#888] hover:bg-[#0f0f0f] border-l-transparent'
              }`}
            >
              <Icon size={13} strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-[11px] font-mono uppercase tracking-widest">{label}</span>
            </button>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-[#2a2a2a] space-y-1">
        <button
          onClick={exportData}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-[#333] hover:text-[#666] transition-colors"
        >
          <Download size={11} strokeWidth={1.5} />
          <span className="text-[9px] font-mono uppercase tracking-widest">Export Data</span>
        </button>
        <button
          onClick={onSettings}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-[#333] hover:text-[#666] transition-colors"
        >
          <Settings size={11} strokeWidth={1.5} />
          <span className="text-[9px] font-mono uppercase tracking-widest">Settings</span>
        </button>
      </div>
    </aside>
  )
}
