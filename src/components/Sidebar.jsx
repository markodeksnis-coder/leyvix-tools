import { ScrollText, Brain, Dumbbell, Users, TrendingUp, Flame, MessageSquare, Settings } from 'lucide-react'

const NAV = [
  { id: 'record',    label: 'The Record',  icon: ScrollText },
  { id: 'mind',      label: 'Mind',        icon: Brain },
  { id: 'body',      label: 'Body',        icon: Dumbbell },
  { id: 'relations', label: 'Relations',   icon: Users },
  { id: 'business',  label: 'Business',    icon: TrendingUp },
  { id: 'soul',      label: 'Soul',        icon: Flame },
  { id: 'coach',     label: 'Coach',       icon: MessageSquare },
]

export default function Sidebar({ active, onSelect, onSettings }) {
  return (
    <aside className="w-52 border-r border-[#1f1f1f] flex flex-col shrink-0 bg-[#0a0a0a]">
      <div className="px-5 py-5 border-b border-[#1f1f1f]">
        <div className="text-[8px] font-mono tracking-[0.3em] text-[#444] uppercase mb-0.5">Personal OS</div>
        <div className="text-base font-bold tracking-widest text-[#facc15] uppercase">MARKO OS</div>
      </div>

      <nav className="flex-1 py-2">
        {NAV.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={`
                w-full flex items-center gap-3 px-5 py-2.5 text-left transition-all
                ${isActive
                  ? 'text-[#facc15] bg-[#facc15]/5 border-r-2 border-[#facc15]'
                  : 'text-[#555] hover:text-neutral-300 hover:bg-[#111]'
                }
              `}
            >
              <Icon size={14} strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-[11px] font-mono uppercase tracking-widest">{label}</span>
            </button>
          )
        })}
      </nav>

      <div className="px-5 py-4 border-t border-[#1f1f1f]">
        <button
          onClick={onSettings}
          className="flex items-center gap-2 text-[#444] hover:text-neutral-400 transition-colors"
        >
          <Settings size={13} strokeWidth={1.5} />
          <span className="text-[10px] font-mono uppercase tracking-widest">Settings</span>
        </button>
      </div>
    </aside>
  )
}
