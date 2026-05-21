import type { TabId } from '../types';

interface NavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  weekScore: number | null;
  weekScoreDelta: number | null;
  habitsToday: number;
  habitsTodayTotal: number;
  topStreak: number;
  energyToday: number | null;
}

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'goals', label: 'Goals', icon: '◎' },
  { id: 'dream-self', label: 'Dream Self', icon: '✦' },
  { id: 'daily', label: 'Daily', icon: '◈' },
  { id: 'weekly', label: 'Weekly', icon: '◆' },
  { id: 'insights', label: 'Insights', icon: '✶' },
];

export default function Nav({ active, onChange, weekScore, weekScoreDelta, habitsToday, habitsTodayTotal, topStreak, energyToday }: NavProps) {
  const scoreColor = weekScore === null ? '#52525B' : weekScore >= 80 ? '#34D399' : weekScore >= 60 ? '#FBBF24' : '#F87171';
  const hasPerformanceData = weekScore !== null || habitsTodayTotal > 0 || topStreak > 0 || energyToday !== null;

  return (
    <div>
      {/* Performance Strip */}
      {hasPerformanceData && (
        <div className="border-b border-[#141414] bg-[#0D0D0D]">
          <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-1 overflow-x-auto">

            {weekScore !== null && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#111111] flex-shrink-0">
                <span className="text-[9px] text-[#3F3F46] uppercase tracking-widest font-semibold">Week</span>
                <span className="text-sm font-bold" style={{ color: scoreColor }}>{weekScore}%</span>
                {weekScoreDelta !== null && weekScoreDelta !== 0 && (
                  <span className={`text-[11px] font-semibold flex items-center ${
                    weekScoreDelta > 0 ? 'text-[#34D399]' : 'text-[#F87171]'
                  }`}>
                    {weekScoreDelta > 0 ? '▲' : '▼'} {Math.abs(weekScoreDelta)}%
                  </span>
                )}
              </div>
            )}

            {habitsTodayTotal > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#111111] flex-shrink-0">
                <span className="text-[9px] text-[#3F3F46] uppercase tracking-widest font-semibold">Habits</span>
                <span className={`text-sm font-bold ${
                  habitsToday === habitsTodayTotal ? 'text-[#34D399]' : 'text-white'
                }`}>{habitsToday}<span className="text-[#3F3F46] font-normal">/{habitsTodayTotal}</span></span>
              </div>
            )}

            {topStreak >= 2 && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#111111] flex-shrink-0">
                <span className="text-[9px] text-[#3F3F46] uppercase tracking-widest font-semibold">Streak</span>
                <span className="text-sm font-bold text-[#FBBF24]">{topStreak}d</span>
                <span className="text-xs">🔥</span>
              </div>
            )}

            {energyToday !== null && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#111111] flex-shrink-0">
                <span className="text-[9px] text-[#3F3F46] uppercase tracking-widest font-semibold">Energy</span>
                <span className={`text-sm font-bold ${
                  energyToday >= 7 ? 'text-[#34D399]' : energyToday >= 5 ? 'text-[#FBBF24]' : 'text-[#F87171]'
                }`}>{energyToday}<span className="text-[#3F3F46] font-normal text-xs">/10</span></span>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Tab Bar */}
      <nav className="border-b border-[#1E1E1E] bg-[#0A0A0A]">
        <div className="max-w-5xl mx-auto px-4 flex items-center">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => onChange(tab.id)}
              className={`px-3 sm:px-4 py-3.5 text-sm font-medium transition-colors relative flex-shrink-0 ${
                active === tab.id ? 'text-white' : 'text-[#52525B] hover:text-[#A1A1AA]'
              }`}
            >
              <span className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-base leading-none">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
              {active === tab.id && <span className="absolute bottom-0 left-0 right-0 h-px bg-[#818CF8]" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
