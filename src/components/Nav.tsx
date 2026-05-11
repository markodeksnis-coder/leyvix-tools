import type { TabId } from '../types';

interface NavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'goals', label: 'Goals', icon: '◎' },
  { id: 'dream-self', label: 'Dream Self', icon: '✦' },
  { id: 'daily-focus', label: 'Daily Focus', icon: '◈' },
];

export default function Nav({ active, onChange }: NavProps) {
  return (
    <nav className="flex-shrink-0 border-b border-[#1E1E1E] bg-[#0A0A0A]">
      <div className="max-w-5xl mx-auto px-4 flex items-center gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-3.5 text-sm font-medium transition-colors relative ${
              active === tab.id
                ? 'text-white'
                : 'text-[#52525B] hover:text-[#A1A1AA]'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="text-base leading-none">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </span>
            {active === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-px bg-[#818CF8]" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
