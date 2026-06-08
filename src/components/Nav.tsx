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
  const hasPerformanceData = weekScore !== null || habitsTodayTotal > 0 || topStreak > 0 || energyToday !== null;

  return (
    <div>
      {hasPerformanceData && (
        <div className="border-b border-slate-100 bg-white/90 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-1.5 overflow-x-auto">

            {weekScore !== null && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-100 flex-shrink-0">
                <span className="text-[9px] text-violet-400 uppercase tracking-widest font-bold">Week</span>
                <span className={`text-sm font-bold ${
                  weekScore >= 80 ? 'text-emerald-500' : weekScore >= 60 ? 'text-amber-500' : 'text-red-500'
                }`}>{weekScore}%</span>
                {weekScoreDelta !== null && weekScoreDelta !== 0 && (
                  <span className={`text-[11px] font-semibold flex items-center ${
                    weekScoreDelta > 0 ? 'text-emerald-500' : 'text-red-500'
                  }`}>
                    {weekScoreDelta > 0 ? '▲' : '▼'} {Math.abs(weekScoreDelta)}%
                  </span>
                )}
              </div>
            )}

            {habitsTodayTotal > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-50 to-cyan-50 border border-emerald-100 flex-shrink-0">
                <span className="text-[9px] text-emerald-600 uppercase tracking-widest font-bold">Habits</span>
                <span className={`text-sm font-bold ${
                  habitsToday === habitsTodayTotal ? 'text-emerald-600' : 'text-slate-700'
                }`}>{habitsToday}<span className="text-slate-300 font-normal">/{habitsTodayTotal}</span></span>
              </div>
            )}

            {topStreak >= 2 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 flex-shrink-0">
                <span className="text-[9px] text-amber-500 uppercase tracking-widest font-bold">Streak</span>
                <span className="text-sm font-bold text-amber-500">{topStreak}d</span>
                <span className="text-xs">🔥</span>
              </div>
            )}

            {energyToday !== null && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-100 flex-shrink-0">
                <span className="text-[9px] text-pink-400 uppercase tracking-widest font-bold">Energy</span>
                <span className={`text-sm font-bold ${
                  energyToday >= 7 ? 'text-emerald-500' : energyToday >= 5 ? 'text-amber-500' : 'text-red-500'
                }`}>{energyToday}<span className="text-slate-300 font-normal text-xs">/10</span></span>
              </div>
            )}

          </div>
        </div>
      )}

      <nav className="border-b border-slate-100 bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 flex items-center">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => onChange(tab.id)}
              className={`px-3 sm:px-4 py-3.5 text-sm font-medium transition-colors relative flex-shrink-0 ${
                active === tab.id ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-base leading-none">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
              {active === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-600 to-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
