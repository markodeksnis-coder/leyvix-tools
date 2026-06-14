import { Brain, Dumbbell, Users, TrendingUp, Flame, MessageSquare } from 'lucide-react'

const NAV = [
  { id: 'mind', label: 'Mind', icon: Brain },
  { id: 'body', label: 'Body', icon: Dumbbell },
  { id: 'relations', label: 'Relations', icon: Users },
  { id: 'business', label: 'Business', icon: TrendingUp },
  { id: 'soul', label: 'Soul', icon: Flame },
  { id: 'coach', label: 'Coach', icon: MessageSquare },
]

export default function Sidebar({ active, onSelect }) {
  return (
    <aside className="w-52 border-r border-[#1f1f1f] flex flex-col shrink-0 bg-[#0a0a0a]">
      <div className="px-5 py-5 border-b border-[#1f1f1f]">
        <div className="text-[10px] font-mono tracking-[0.2em] text-neutral-700 uppercase mb-0.5">Personal</div>
        <div className="text-lg font-semibold tracking-tight text-white">Marko OS</div>
      </div>

      <nav className="flex-1 py-2">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`
              w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-all text-left
              ${active === id
                ? 'text-white bg-[#191919] border-r-2 border-white'
                : 'text-neutral-600 hover:text-neutral-300 hover:bg-[#111]'
              }
            `}
          >
            <Icon size={14} strokeWidth={active === id ? 2 : 1.5} />
            <span className="tracking-wide text-xs uppercase font-medium">{label}</span>
          </button>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-[#1f1f1f]">
        <div className="text-[10px] font-mono text-neutral-800 uppercase tracking-widest">v1.0.0</div>
      </div>
    </aside>
  )
}
