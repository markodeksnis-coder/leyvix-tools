import { useState, useMemo } from 'react';
import type { DailyLog, Habit, Targets } from '../types';
import SparkLine from '../components/SparkLine';

interface InsightsProps {
  dailyLogs: DailyLog[];
  setDailyLogs: (logs: DailyLog[]) => void;
  habits: Habit[];
  targets: Targets;
}

interface Insight {
  type: 'warning' | 'tip' | 'win' | 'pattern';
  icon: string;
  title: string;
  body: string;
  metric?: string;
  priority: number;
}

function getLast(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().split('T')[0];
  });
}

function getCurrentStreak(logs: string[]): number {
  if (!logs.length) return 0;
  const sorted = [...logs].sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterday = d.toISOString().split('T')[0];
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let streak = 0;
  const cur = new Date(sorted[0]);
  for (const date of sorted) {
    if (date === cur.toISOString().split('T')[0]) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else break;
  }
  return streak;
}

function avg(vals: number[]): number {
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function generateInsights(dailyLogs: DailyLog[], habits: Habit[], targets: Targets): Insight[] {
  const insights: Insight[] = [];
  const today = new Date().toISOString().split('T')[0];
  const last7 = getLast(7);
  const last14 = getLast(14);
  const logsLast7 = dailyLogs.filter(l => last7.includes(l.date));
  const logsLast14 = dailyLogs.filter(l => last14.includes(l.date));
  const todayLog = dailyLogs.find(l => l.date === today);

  // Sleep deficit
  const sleepLogs7 = logsLast7.filter(l => l.sleep !== undefined);
  if (sleepLogs7.length >= 3) {
    const avgSleep = avg(sleepLogs7.map(l => l.sleep!));
    if (avgSleep < 6) {
      insights.push({
        type: 'warning', icon: '😴', priority: 1,
        title: 'Sleep deficit detected',
        body: `You're averaging ${avgSleep.toFixed(1)}h this week. Under 6h is compounding fatigue and hurting focus. Try getting to bed 30–45 min earlier tonight.`,
        metric: `${avgSleep.toFixed(1)}h avg`,
      });
    } else if (avgSleep >= 7.5) {
      insights.push({
        type: 'win', icon: '🌙', priority: 6,
        title: 'Sleep is locked in',
        body: `${avgSleep.toFixed(1)}h average this week. Quality sleep is your foundation — everything else performs better because of this.`,
        metric: `${avgSleep.toFixed(1)}h avg`,
      });
    }
  }

  // Sleep drives energy correlation
  const withSleepEnergy = logsLast14.filter(l => l.sleep !== undefined && l.energyLevel !== undefined);
  if (withSleepEnergy.length >= 4) {
    const highSleep = withSleepEnergy.filter(l => l.sleep! >= 7);
    const lowSleep = withSleepEnergy.filter(l => l.sleep! < 7);
    if (highSleep.length >= 2 && lowSleep.length >= 2) {
      const eHigh = avg(highSleep.map(l => l.energyLevel!));
      const eLow = avg(lowSleep.map(l => l.energyLevel!));
      if (eHigh - eLow >= 1.5) {
        insights.push({
          type: 'pattern', icon: '⚡', priority: 2,
          title: 'Sleep is your biggest energy lever',
          body: `On 7h+ nights your energy averages ${eHigh.toFixed(1)}/10. On less sleep: ${eLow.toFixed(1)}/10. That's a ${(eHigh - eLow).toFixed(1)}-point swing — more than any supplement.`,
          metric: `+${(eHigh - eLow).toFixed(1)} energy`,
        });
      }
    }
  }

  // Focus vs screen time
  const withFocusScreen = logsLast14.filter(l => l.focusLevel !== undefined && l.screenTime !== undefined);
  if (withFocusScreen.length >= 4) {
    const highScreen = withFocusScreen.filter(l => l.screenTime! > targets.screenTime);
    const okScreen = withFocusScreen.filter(l => l.screenTime! <= targets.screenTime);
    if (highScreen.length >= 2 && okScreen.length >= 2) {
      const fHigh = avg(highScreen.map(l => l.focusLevel!));
      const fOk = avg(okScreen.map(l => l.focusLevel!));
      if (fOk - fHigh >= 1) {
        insights.push({
          type: 'pattern', icon: '📱', priority: 2,
          title: 'Screen time is stealing your focus',
          body: `On high screen time days your focus drops to ${fHigh.toFixed(1)}/10. Within target: ${fOk.toFixed(1)}/10. Cutting phone time by 1h could be worth more than you think.`,
          metric: `-${(fOk - fHigh).toFixed(1)} focus on high days`,
        });
      }
    }
  }

  // Habits = energy
  const fullHabitDays = last14.filter(d => habits.length > 0 && habits.every(h => h.logs.includes(d)));
  const partialDays = last14.filter(d => !habits.every(h => h.logs.includes(d)) && habits.some(h => h.logs.includes(d)));
  const efFull = dailyLogs.filter(l => fullHabitDays.includes(l.date) && l.energyLevel !== undefined).map(l => l.energyLevel!);
  const efPart = dailyLogs.filter(l => partialDays.includes(l.date) && l.energyLevel !== undefined).map(l => l.energyLevel!);
  if (efFull.length >= 2 && efPart.length >= 2) {
    const diff = avg(efFull) - avg(efPart);
    if (diff >= 1) {
      insights.push({
        type: 'pattern', icon: '🔥', priority: 2,
        title: 'Your habits are your energy source',
        body: `On days you complete all habits, energy averages ${avg(efFull).toFixed(1)}/10 vs ${avg(efPart).toFixed(1)}/10 on partial days. The habits aren't just discipline — they're fuel.`,
        metric: `+${diff.toFixed(1)} energy on full days`,
      });
    }
  }

  // Low focus today
  if (todayLog?.focusLevel !== undefined && todayLog.focusLevel <= 4) {
    insights.push({
      type: 'tip', icon: '🧠', priority: 1,
      title: 'Focus is low today',
      body: 'Try: close all tabs except one, do a 2-min brain dump on paper, take a 10-min walk without your phone. Focus follows a clear environment.',
    });
  }

  // Low energy today
  if (todayLog?.energyLevel !== undefined && todayLog.energyLevel <= 4) {
    const tips: string[] = [];
    if ((todayLog.sleep ?? 8) < 7) tips.push('prioritize an early bedtime tonight');
    if ((todayLog.protein ?? targets.protein) < targets.protein * 0.6) tips.push('eat a high-protein meal now');
    tips.push('get outside for 10 min');
    insights.push({
      type: 'tip', icon: '⚡', priority: 1,
      title: 'Energy is low — here\'s how to recover',
      body: tips.join(' · ') + '. Small resets compound into better afternoons.',
    });
  }

  // Protein below target
  const proteinLogs = logsLast7.filter(l => l.protein !== undefined);
  if (proteinLogs.length >= 3) {
    const below = proteinLogs.filter(l => l.protein! < targets.protein * 0.8);
    if (below.length >= 3) {
      insights.push({
        type: 'tip', icon: '🥩', priority: 3,
        title: 'Protein below target most days',
        body: `${below.length} of the last ${proteinLogs.length} days you've been under ${Math.round(targets.protein * 0.8)}g. Protein directly affects energy, mood, and recovery. Add Greek yogurt, cottage cheese, or a shake.`,
        metric: `${below.length}/${proteinLogs.length} days under`,
      });
    }
  }

  // Streak win
  const maxStreak = habits.reduce((max, h) => Math.max(max, getCurrentStreak(h.logs)), 0);
  if (maxStreak >= 7) {
    insights.push({
      type: 'win', icon: '🏆', priority: 5,
      title: `${maxStreak}-day streak — don't break it`,
      body: `Consistency compounds. At ${maxStreak} days, you're building a real identity shift. The longer the streak, the more it becomes who you are, not just what you do.`,
      metric: `${maxStreak} days`,
    });
  }

  // No energy data yet
  if (logsLast7.filter(l => l.energyLevel !== undefined).length === 0) {
    insights.push({
      type: 'tip', icon: '📊', priority: 4,
      title: 'Start tracking your energy',
      body: 'Log your sleep, energy, and focus daily. After 5 days the AI starts showing you exactly what\'s driving your best performance — and what\'s holding you back.',
    });
  }

  return insights.sort((a, b) => a.priority - b.priority);
}

const insightColors = {
  warning: { bg: 'bg-[#F87171]/8', border: 'border-[#F87171]/20', badge: 'bg-[#F87171]/10 text-[#F87171]' },
  tip: { bg: 'bg-[#FBBF24]/8', border: 'border-[#FBBF24]/20', badge: 'bg-[#FBBF24]/10 text-[#FBBF24]' },
  win: { bg: 'bg-[#34D399]/8', border: 'border-[#34D399]/20', badge: 'bg-[#34D399]/10 text-[#34D399]' },
  pattern: { bg: 'bg-[#818CF8]/8', border: 'border-[#818CF8]/20', badge: 'bg-[#818CF8]/10 text-[#818CF8]' },
};

export default function Insights({ dailyLogs, setDailyLogs, habits, targets }: InsightsProps) {
  const today = new Date().toISOString().split('T')[0];
  const todayLog = dailyLogs.find(l => l.date === today) ?? { date: today };
  const [draft, setDraft] = useState<DailyLog>(todayLog);
  const [showLog, setShowLog] = useState(false);

  const insights = useMemo(() => generateInsights(dailyLogs, habits, targets), [dailyLogs, habits, targets]);

  const last14 = getLast(14);

  const sleepData = last14.map(d => dailyLogs.find(l => l.date === d)?.sleep ?? null);
  const energyData = last14.map(d => dailyLogs.find(l => l.date === d)?.energyLevel ?? null);
  const focusData = last14.map(d => dailyLogs.find(l => l.date === d)?.focusLevel ?? null);

  const hasAnyData = sleepData.some(v => v !== null) || energyData.some(v => v !== null);

  const saveLog = () => {
    setDailyLogs([...dailyLogs.filter(l => l.date !== today), { ...draft, date: today }]);
    setShowLog(false);
  };

  const wellbeingLogged = todayLog.energyLevel !== undefined || todayLog.sleep !== undefined || todayLog.focusLevel !== undefined;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Insights</h1>
        <p className="text-sm text-[#52525B] mt-0.5">What your data says about you</p>
      </div>

      {/* Today's Wellbeing */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Today's Wellbeing</h2>
          <button
            onClick={() => { setDraft({ ...todayLog }); setShowLog(true); }}
            className="text-xs text-[#818CF8] hover:text-[#A5B4FC] transition-colors"
          >
            {wellbeingLogged ? 'Edit' : '+ Log'}
          </button>
        </div>

        {wellbeingLogged ? (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Sleep', value: todayLog.sleep !== undefined ? `${todayLog.sleep}h` : null, max: 10, color: todayLog.sleep !== undefined ? (todayLog.sleep >= 7 ? '#34D399' : todayLog.sleep >= 6 ? '#FBBF24' : '#F87171') : '#3F3F46' },
              { label: 'Energy', value: todayLog.energyLevel !== undefined ? `${todayLog.energyLevel}/10` : null, max: 10, color: todayLog.energyLevel !== undefined ? (todayLog.energyLevel >= 7 ? '#34D399' : todayLog.energyLevel >= 5 ? '#FBBF24' : '#F87171') : '#3F3F46' },
              { label: 'Focus', value: todayLog.focusLevel !== undefined ? `${todayLog.focusLevel}/10` : null, max: 10, color: todayLog.focusLevel !== undefined ? (todayLog.focusLevel >= 7 ? '#34D399' : todayLog.focusLevel >= 5 ? '#FBBF24' : '#F87171') : '#3F3F46' },
            ].map(m => (
              <div key={m.label} className="bg-[#0A0A0A] rounded-lg p-3 text-center">
                <p className="text-[10px] text-[#52525B] mb-1">{m.label}</p>
                <p className="text-xl font-bold" style={{ color: m.color }}>{m.value ?? '—'}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-[#3F3F46] mb-3">Log sleep, energy & focus to unlock personalized insights</p>
            <button
              onClick={() => { setDraft({ ...todayLog }); setShowLog(true); }}
              className="px-4 py-2 bg-[#818CF8] hover:bg-[#6366F1] text-white text-sm font-medium rounded-lg transition-colors"
            >
              Log Now
            </button>
          </div>
        )}
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-wider">Recommendations</p>
          {insights.map((ins, i) => {
            const c = insightColors[ins.type];
            return (
              <div key={i} className={`rounded-xl p-4 border ${c.bg} ${c.border}`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0 mt-0.5">{ins.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-semibold text-white">{ins.title}</h3>
                      {ins.metric && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${c.badge}`}>{ins.metric}</span>
                      )}
                    </div>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed">{ins.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 14-day Trends */}
      {hasAnyData && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4 space-y-5">
          <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-wider">14-Day Trends</p>

          {[
            { label: 'Sleep (hours)', data: sleepData, max: 10, goodColor: '#34D399', warnColor: '#FBBF24', badColor: '#F87171', threshold: 7 },
            { label: 'Energy (/10)', data: energyData, max: 10, goodColor: '#818CF8', warnColor: '#FBBF24', badColor: '#F87171', threshold: 6 },
            { label: 'Focus (/10)', data: focusData, max: 10, goodColor: '#818CF8', warnColor: '#FBBF24', badColor: '#F87171', threshold: 6 },
          ].filter(t => t.data.some(v => v !== null)).map(trend => (
            <div key={trend.label}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#A1A1AA]">{trend.label}</span>
                {(() => {
                  const vals = trend.data.filter(v => v !== null) as number[];
                  if (!vals.length) return null;
                  const a = avg(vals);
                  const color = a >= trend.threshold ? trend.goodColor : a >= trend.threshold * 0.8 ? trend.warnColor : trend.badColor;
                  return <span className="text-xs font-semibold" style={{ color }}>{a.toFixed(1)} avg</span>;
                })()}
              </div>
              <div className="flex items-end gap-0.5 h-12">
                {trend.data.map((val, i) => {
                  const h = val !== null ? Math.max(8, (val / trend.max) * 100) : 6;
                  const color = val === null ? '#1A1A1A'
                    : val >= trend.threshold ? trend.goodColor
                    : val >= trend.threshold * 0.8 ? trend.warnColor
                    : trend.badColor;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-sm transition-all"
                      style={{ height: `${h}%`, backgroundColor: color, opacity: val === null ? 0.3 : 1 }}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-[#2A2A2A]">14 days ago</span>
                <span className="text-[9px] text-[#2A2A2A]">today</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log modal */}
      {showLog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl w-full max-w-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Today's Wellbeing</h2>
              <button onClick={() => setShowLog(false)} className="text-[#52525B] hover:text-white text-xl leading-none">×</button>
            </div>

            {[
              { label: 'Sleep', key: 'sleep', unit: 'hours', min: 0, max: 12, step: 0.5, hint: '7-9h is optimal' },
              { label: 'Energy', key: 'energyLevel', unit: '/10', min: 1, max: 10, step: 1, hint: '1 = exhausted, 10 = on fire' },
              { label: 'Focus', key: 'focusLevel', unit: '/10', min: 1, max: 10, step: 1, hint: '1 = scattered, 10 = locked in' },
            ].map(f => {
              const val = draft[f.key as keyof DailyLog] as number | undefined;
              return (
                <div key={f.key}>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-medium text-white">{f.label}</label>
                    <span className="text-sm font-bold text-[#818CF8]">{val !== undefined ? `${val}${f.unit}` : '—'}</span>
                  </div>
                  <input
                    type="range"
                    min={f.min} max={f.max} step={f.step}
                    value={val ?? (f.min + f.max) / 2}
                    onChange={e => setDraft(d => ({ ...d, [f.key]: Number(e.target.value) }))}
                    onMouseDown={() => { if (val === undefined) setDraft(d => ({ ...d, [f.key]: Math.round((f.min + f.max) / 2) })); }}
                    className="w-full accent-[#818CF8] cursor-pointer"
                  />
                  <p className="text-[10px] text-[#3F3F46] mt-0.5">{f.hint}</p>
                </div>
              );
            })}

            <div className="flex gap-3">
              <button onClick={() => setShowLog(false)} className="flex-1 py-2.5 border border-[#1E1E1E] text-[#71717A] text-sm rounded-lg">Cancel</button>
              <button onClick={saveLog} className="flex-1 py-2.5 bg-[#818CF8] hover:bg-[#6366F1] text-white text-sm font-medium rounded-lg transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
