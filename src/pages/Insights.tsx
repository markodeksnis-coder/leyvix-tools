import { useState, useMemo } from 'react';
import type { DailyLog, Habit, Targets, Goal } from '../types';

type Period = 7 | 14 | 30;

interface InsightsProps {
  dailyLogs: DailyLog[];
  setDailyLogs: (logs: DailyLog[]) => void;
  habits: Habit[];
  targets: Targets;
  goals: Goal[];
}

interface Insight {
  type: 'warning' | 'tip' | 'win' | 'pattern';
  icon: string;
  title: string;
  body: string;
  metric?: string;
  priority: number;
}

interface TomorrowAction {
  icon: string;
  category: string;
  action: string;
  why: string;
}

interface RecurringPattern {
  icon: string;
  title: string;
  body: string;
  severity: 'good' | 'bad' | 'neutral';
}

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getLast(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().split('T')[0];
  });
}

function dow(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getDay();
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
    if (date === cur.toISOString().split('T')[0]) { streak++; cur.setDate(cur.getDate() - 1); }
    else break;
  }
  return streak;
}

function avg(vals: number[]): number {
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function buildTomorrowPlan(dailyLogs: DailyLog[], habits: Habit[], targets: Targets, goals: Goal[]): TomorrowAction[] {
  const actions: TomorrowAction[] = [];
  const today = new Date().toISOString().split('T')[0];
  const todayLog = dailyLogs.find(l => l.date === today);
  const last7 = getLast(7);
  const logsLast7 = dailyLogs.filter(l => last7.includes(l.date));
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDow = tomorrow.getDay();
  const tomorrowLabel = DOW_LABELS[tomorrowDow];

  const sleepLogs = logsLast7.filter(l => l.sleep !== undefined);
  const avgSleep = sleepLogs.length >= 2 ? avg(sleepLogs.map(l => l.sleep!)) : todayLog?.sleep;
  if (avgSleep !== undefined && avgSleep < 6.5) {
    actions.push({ icon: '🛏', category: 'Recovery', action: 'Get to bed by 10 PM tonight', why: `${avgSleep.toFixed(1)}h avg this week is building sleep debt. Tonight's sleep directly powers tomorrow.` });
  }

  const proteinLogs = logsLast7.filter(l => l.protein !== undefined);
  if (proteinLogs.length >= 2) {
    const avgProtein = avg(proteinLogs.map(l => l.protein!));
    if (avgProtein < targets.protein * 0.85) {
      actions.push({ icon: '🥩', category: 'Nutrition', action: `Hit ${targets.protein}g protein tomorrow`, why: `Averaging ${Math.round(avgProtein)}g this week — ${Math.round(targets.protein - avgProtein)}g under target. Add eggs + Greek yogurt at breakfast.` });
    }
  } else if (todayLog?.protein !== undefined && todayLog.protein < targets.protein * 0.8) {
    actions.push({ icon: '🥩', category: 'Nutrition', action: `Boost protein tomorrow to ${targets.protein}g`, why: `Only ${todayLog.protein}g today. Add a shake or extra chicken to close the gap.` });
  }

  if (todayLog?.screenTime !== undefined && todayLog.screenTime > targets.screenTime * 1.3) {
    actions.push({ icon: '📱', category: 'Focus', action: `Cap screen time at ${targets.screenTime}h tomorrow`, why: `${todayLog.screenTime}h today — ${(todayLog.screenTime - targets.screenTime).toFixed(1)}h over target. Set app limits tonight.` });
  }

  const callLogs = logsLast7.filter(l => l.callsBooked !== undefined);
  if (callLogs.length >= 2) {
    const totalCalls = callLogs.reduce((a, l) => a + (l.callsBooked ?? 0), 0);
    const weeklyTarget = targets.callsBooked * 5;
    if (totalCalls < weeklyTarget * 0.6) {
      actions.push({ icon: '📞', category: 'Sales', action: `Book ${Math.max(1, targets.callsBooked * 2)} calls tomorrow`, why: `${totalCalls}/${weeklyTarget} calls this week. Volume is the variable — go harder tomorrow.` });
    }
  }

  const weakHabits = habits.filter(h => {
    const relevant = getLast(28).filter(d => dow(d) === tomorrowDow);
    const missed = relevant.filter(d => !h.logs.includes(d));
    return relevant.length >= 2 && missed.length / relevant.length >= 0.6;
  });
  if (weakHabits.length === 1) {
    actions.push({ icon: '⚡', category: 'Habits', action: `Lock in "${weakHabits[0].name}" on ${tomorrowLabel}`, why: `You miss this habit on ${tomorrowLabel}s consistently. Schedule it before 9am.` });
  } else if (weakHabits.length >= 2) {
    actions.push({ icon: '⚡', category: 'Habits', action: `${tomorrowLabel}s are your weak spot — plan habits tonight`, why: `You miss ${weakHabits.length} habits on ${tomorrowLabel}s. Lay everything out before sleep.` });
  }

  const stalledGoal = goals.find(g => {
    if (g.progress >= 100) return false;
    const recent = (g.progressHistory ?? []).filter(h => getLast(7).includes(h.date));
    return recent.length === 0;
  });
  if (stalledGoal) {
    actions.push({ icon: '🎯', category: 'Goals', action: `Move "${stalledGoal.title}" forward tomorrow`, why: 'No progress logged in 7+ days. Even 1% counts — consistency over intensity.' });
  }

  if (todayLog?.energyLevel !== undefined && todayLog.energyLevel <= 4) {
    actions.push({ icon: '🔋', category: 'Energy', action: 'Recovery mode tonight → strong tomorrow', why: 'No screens after 9pm, light dinner, 10-min stretch. Tomorrow starts tonight.' });
  }

  return actions.slice(0, 5);
}

function detectPatterns(dailyLogs: DailyLog[], habits: Habit[], targets: Targets, period: Period): RecurringPattern[] {
  const patterns: RecurringPattern[] = [];
  const dates = getLast(period);
  const logs = dailyLogs.filter(l => dates.includes(l.date));

  const dowEnergy: number[][] = Array.from({ length: 7 }, () => []);
  logs.forEach(l => { if (l.energyLevel !== undefined) dowEnergy[dow(l.date)].push(l.energyLevel); });
  const dowAvg = dowEnergy.map(v => v.length >= 2 ? avg(v) : null);
  const valid = dowAvg.map((v, i) => ({ v, i })).filter((x): x is { v: number; i: number } => x.v !== null);
  if (valid.length >= 4) {
    const best = valid.reduce((a, b) => (a.v > b.v ? a : b));
    const worst = valid.reduce((a, b) => (a.v < b.v ? a : b));
    if (best.v - worst.v >= 2) {
      patterns.push({ icon: '📅', severity: 'neutral', title: `Peak: ${DOW_LABELS[best.i]}s · Low: ${DOW_LABELS[worst.i]}s`, body: `Energy averages ${best.v.toFixed(1)}/10 on ${DOW_LABELS[best.i]}s vs ${worst.v.toFixed(1)}/10 on ${DOW_LABELS[worst.i]}s. Schedule deep work on peak days, lighter tasks on low days.` });
    }
  }

  const wdScreen = logs.filter(l => l.screenTime !== undefined && [1,2,3,4,5].includes(dow(l.date))).map(l => l.screenTime!);
  const weScreen = logs.filter(l => l.screenTime !== undefined && [0,6].includes(dow(l.date))).map(l => l.screenTime!);
  if (wdScreen.length >= 3 && weScreen.length >= 2 && avg(weScreen) - avg(wdScreen) >= 1.5) {
    patterns.push({ icon: '📱', severity: 'bad', title: 'Screen time spikes on weekends', body: `Weekdays: ${avg(wdScreen).toFixed(1)}h · Weekends: ${avg(weScreen).toFixed(1)}h. Weekend screen habits set the tone for Monday's focus.` });
  }

  const habitMissGroups: { name: string; days: string[] }[] = [];
  habits.forEach(h => {
    const highMissDays = [0,1,2,3,4,5,6].filter(di => {
      const total = dates.filter(d => dow(d) === di);
      const missed = total.filter(d => !h.logs.includes(d));
      return total.length >= 2 && missed.length / total.length >= 0.65;
    });
    if (highMissDays.length >= 2) habitMissGroups.push({ name: h.name, days: highMissDays.map(di => DOW_LABELS[di]) });
  });
  if (habitMissGroups.length === 1) {
    patterns.push({ icon: '🔄', severity: 'bad', title: `"${habitMissGroups[0].name}" skipped on ${habitMissGroups[0].days.join(', ')}`, body: 'This is structural, not random. Change the time or trigger on those days.' });
  } else if (habitMissGroups.length >= 2) {
    patterns.push({ icon: '🔄', severity: 'bad', title: 'Habit gaps on specific days of the week', body: habitMissGroups.slice(0, 3).map(h => `"${h.name}" → ${h.days.join('/')}`).join(' · ') + '. These are structural — address the trigger.' });
  }

  const sunSleep = logs.filter(l => dow(l.date) === 0 && l.sleep !== undefined).map(l => l.sleep!);
  const monEnergy = logs.filter(l => dow(l.date) === 1 && l.energyLevel !== undefined).map(l => l.energyLevel!);
  if (sunSleep.length >= 2 && monEnergy.length >= 2 && avg(sunSleep) < 6.5 && avg(monEnergy) < 6) {
    patterns.push({ icon: '😴', severity: 'bad', title: 'Late Sunday nights are wrecking your Mondays', body: `${avg(sunSleep).toFixed(1)}h Sunday sleep → ${avg(monEnergy).toFixed(1)}/10 Monday energy. Sunday bedtime is the highest-leverage sleep of the week.` });
  }

  let streak = 0, maxStreak = 0;
  [...dates].sort().forEach(d => {
    const l = logs.find(x => x.date === d);
    if (l?.protein !== undefined && l.protein < targets.protein * 0.75) { streak++; maxStreak = Math.max(maxStreak, streak); }
    else if (l?.protein !== undefined) streak = 0;
  });
  if (maxStreak >= 4) {
    patterns.push({ icon: '🥩', severity: 'bad', title: `${maxStreak}-day protein deficit`, body: `${maxStreak}+ consecutive days below ${Math.round(targets.protein * 0.75)}g. This is structural — meal prep or add a daily shake.` });
  }

  const callDays = logs.filter(l => l.callsBooked !== undefined && l.showUps !== undefined && l.callsBooked > 0);
  if (callDays.length >= 4) {
    const rate = avg(callDays.map(l => (l.showUps! / l.callsBooked!) * 100));
    if (rate < 50) {
      patterns.push({ icon: '📞', severity: 'bad', title: `Show-up rate: ${Math.round(rate)}%`, body: 'Less than half your booked calls show up. Review your offer, pre-call confirmation, or lead quality.' });
    } else if (rate >= 80) {
      patterns.push({ icon: '🏆', severity: 'good', title: `${Math.round(rate)}% show-up rate`, body: 'Elite conversion. Your positioning and confirmation process are working. Focus on booking more.' });
    }
  }

  const fullDays = habits.length > 0 ? dates.filter(d => habits.every(h => h.logs.includes(d))).length : 0;
  if (habits.length > 0 && fullDays / dates.length >= 0.75 && fullDays >= 5) {
    patterns.push({ icon: '🔥', severity: 'good', title: `${Math.round((fullDays / dates.length) * 100)}% full habit completion`, body: `You complete all habits ${Math.round((fullDays / dates.length) * 100)}% of days. This isn't discipline anymore — it's identity.` });
  }

  return patterns.slice(0, 6);
}

function computePeriodScore(dailyLogs: DailyLog[], habits: Habit[], targets: Targets, period: Period) {
  const dates = getLast(period);
  const logs = dailyLogs.filter(l => dates.includes(l.date));

  const score = (vals: number[], target: number, lower = false): number | null => {
    if (!vals.length) return null;
    return Math.min(100, Math.round(lower ? (target / avg(vals)) * 100 : (avg(vals) / target) * 100));
  };

  const sleepScore = score(logs.filter(l => l.sleep !== undefined).map(l => l.sleep!), 7.5);
  const energyScore = score(logs.filter(l => l.energyLevel !== undefined).map(l => l.energyLevel!), 8);
  const proteinScore = score(logs.filter(l => l.protein !== undefined).map(l => l.protein!), targets.protein);
  const stepsScore = score(logs.filter(l => l.steps !== undefined).map(l => l.steps!), targets.steps);
  const nutriArr = [proteinScore, stepsScore].filter((v): v is number => v !== null);
  const nutritionScore = nutriArr.length ? Math.round(avg(nutriArr)) : null;

  const habitScore = habits.length > 0
    ? Math.round(avg(habits.map(h => (dates.filter(d => h.logs.includes(d)).length / dates.length) * 100)))
    : null;

  const hasCallData = logs.some(l => l.callsBooked !== undefined);
  const hasCloseData = logs.some(l => l.closes !== undefined);
  const callsTotal = logs.reduce((a, l) => a + (l.callsBooked ?? 0), 0);
  const closesTotal = logs.reduce((a, l) => a + (l.closes ?? 0), 0);
  const callScore = hasCallData ? Math.min(100, Math.round((callsTotal / (targets.callsBooked * period * 5 / 7)) * 100)) : null;
  const closeScore = hasCloseData ? Math.min(100, Math.round((closesTotal / (targets.closes * period * 5 / 7)) * 100)) : null;
  const workArr = [callScore, closeScore].filter((v): v is number => v !== null);
  const workScore = workArr.length ? Math.round(avg(workArr)) : null;

  const all = [sleepScore, energyScore, habitScore, nutritionScore, workScore].filter((v): v is number => v !== null);
  return { overall: all.length ? Math.round(avg(all)) : null, sleep: sleepScore, energy: energyScore, habits: habitScore, nutrition: nutritionScore, work: workScore };
}

function generateInsights(dailyLogs: DailyLog[], habits: Habit[], targets: Targets, period: Period): Insight[] {
  const insights: Insight[] = [];
  const today = new Date().toISOString().split('T')[0];
  const dates = getLast(period);
  const last7 = getLast(7);
  const logs = dailyLogs.filter(l => dates.includes(l.date));
  const logsLast7 = dailyLogs.filter(l => last7.includes(l.date));
  const todayLog = dailyLogs.find(l => l.date === today);

  const sleepLogs = logs.filter(l => l.sleep !== undefined);
  if (sleepLogs.length >= 3) {
    const a = avg(sleepLogs.map(l => l.sleep!));
    if (a < 6) insights.push({ type: 'warning', icon: '😴', priority: 1, title: 'Sleep deficit', body: `${a.toFixed(1)}h avg over ${period} days. Under 6h compounds fatigue — aim for 10pm bedtime.`, metric: `${a.toFixed(1)}h avg` });
    else if (a >= 7.5) insights.push({ type: 'win', icon: '🌙', priority: 6, title: 'Sleep locked in', body: `${a.toFixed(1)}h average. Your foundation is solid — everything performs better because of this.`, metric: `${a.toFixed(1)}h avg` });
  }

  const withBoth = logs.filter(l => l.sleep !== undefined && l.energyLevel !== undefined);
  if (withBoth.length >= 4) {
    const hi = withBoth.filter(l => l.sleep! >= 7);
    const lo = withBoth.filter(l => l.sleep! < 7);
    if (hi.length >= 2 && lo.length >= 2) {
      const eHi = avg(hi.map(l => l.energyLevel!));
      const eLo = avg(lo.map(l => l.energyLevel!));
      const diff = eHi - eLo;
      if (diff >= 1.5) insights.push({ type: 'pattern', icon: '⚡', priority: 2, title: 'Sleep is your energy lever', body: `7h+ nights: ${eHi.toFixed(1)}/10 energy. Under 7h: ${eLo.toFixed(1)}/10. A ${diff.toFixed(1)}-point swing — bigger than any supplement.`, metric: `+${diff.toFixed(1)} energy` });
    }
  }

  const withFS = logs.filter(l => l.focusLevel !== undefined && l.screenTime !== undefined);
  if (withFS.length >= 4) {
    const hi = withFS.filter(l => l.screenTime! > targets.screenTime);
    const ok = withFS.filter(l => l.screenTime! <= targets.screenTime);
    if (hi.length >= 2 && ok.length >= 2) {
      const diff = avg(ok.map(l => l.focusLevel!)) - avg(hi.map(l => l.focusLevel!));
      if (diff >= 1) insights.push({ type: 'pattern', icon: '📱', priority: 2, title: 'Screen time cuts focus', body: `High screen days: ${avg(hi.map(l => l.focusLevel!)).toFixed(1)}/10 focus. Within target: ${avg(ok.map(l => l.focusLevel!)).toFixed(1)}/10.`, metric: `-${diff.toFixed(1)} focus on high days` });
    }
  }

  if (todayLog?.focusLevel !== undefined && todayLog.focusLevel <= 4) insights.push({ type: 'tip', icon: '🧠', priority: 1, title: 'Focus is low today', body: 'Close all tabs, 2-min brain dump on paper, 10-min walk without phone.' });
  if (todayLog?.energyLevel !== undefined && todayLog.energyLevel <= 4) {
    const tips: string[] = [];
    if ((todayLog.sleep ?? 8) < 7) tips.push('early bedtime tonight');
    if ((todayLog.protein ?? targets.protein) < targets.protein * 0.6) tips.push('eat high-protein now');
    tips.push('10 min outside');
    insights.push({ type: 'tip', icon: '⚡', priority: 1, title: 'Low energy — recovery mode', body: tips.join(' · ') + '. Small resets compound.' });
  }

  const below = logsLast7.filter(l => l.protein !== undefined && l.protein < targets.protein * 0.8);
  const proteinTotal = logsLast7.filter(l => l.protein !== undefined);
  if (proteinTotal.length >= 3 && below.length >= 3) insights.push({ type: 'tip', icon: '🥩', priority: 3, title: 'Protein below target most days', body: `${below.length}/${proteinTotal.length} days under ${Math.round(targets.protein * 0.8)}g. Add Greek yogurt or a shake.`, metric: `${below.length}/${proteinTotal.length} days under` });

  const maxStreak = habits.reduce((max, h) => Math.max(max, getCurrentStreak(h.logs)), 0);
  if (maxStreak >= 7) insights.push({ type: 'win', icon: '🏆', priority: 5, title: `${maxStreak}-day streak`, body: `At ${maxStreak} days this is becoming identity. Don't break it.`, metric: `${maxStreak} days` });

  if (!logs.some(l => l.energyLevel !== undefined)) insights.push({ type: 'tip', icon: '📊', priority: 4, title: 'Start tracking wellbeing', body: 'Log sleep, energy & focus daily. After 5 days the insights become precise and personalized.' });

  return insights.sort((a, b) => a.priority - b.priority);
}

function scoreColor(v: number): string {
  if (v >= 80) return '#10B981';
  if (v >= 60) return '#F59E0B';
  return '#EF4444';
}

const insightColors = {
  warning: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-600', title: 'text-slate-900', body: 'text-slate-600' },
  tip: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-600', title: 'text-slate-900', body: 'text-slate-600' },
  win: { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', title: 'text-slate-900', body: 'text-slate-600' },
  pattern: { bg: 'bg-indigo-50', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-600', title: 'text-slate-900', body: 'text-slate-600' },
};

const patternColors = {
  good: { bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  bad: { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' },
  neutral: { bg: 'bg-indigo-50', border: 'border-indigo-200', dot: 'bg-indigo-400' },
};

export default function Insights({ dailyLogs, setDailyLogs, habits, targets, goals }: InsightsProps) {
  const [period, setPeriod] = useState<Period>(7);
  const today = new Date().toISOString().split('T')[0];
  const todayLog = dailyLogs.find(l => l.date === today) ?? { date: today };
  const [draft, setDraft] = useState<DailyLog>(todayLog);
  const [showLog, setShowLog] = useState(false);

  const tomorrowPlan = useMemo(() => buildTomorrowPlan(dailyLogs, habits, targets, goals), [dailyLogs, habits, targets, goals]);
  const patterns = useMemo(() => detectPatterns(dailyLogs, habits, targets, period), [dailyLogs, habits, targets, period]);
  const periodScore = useMemo(() => computePeriodScore(dailyLogs, habits, targets, period), [dailyLogs, habits, targets, period]);
  const insights = useMemo(() => generateInsights(dailyLogs, habits, targets, period), [dailyLogs, habits, targets, period]);

  const periodDates = getLast(period);
  const sleepData = periodDates.map(d => dailyLogs.find(l => l.date === d)?.sleep ?? null);
  const energyData = periodDates.map(d => dailyLogs.find(l => l.date === d)?.energyLevel ?? null);
  const focusData = periodDates.map(d => dailyLogs.find(l => l.date === d)?.focusLevel ?? null);
  const hasAnyData = sleepData.some(v => v !== null) || energyData.some(v => v !== null);

  const saveLog = () => {
    setDailyLogs([...dailyLogs.filter(l => l.date !== today), { ...draft, date: today }]);
    setShowLog(false);
  };

  const wellbeingLogged = todayLog.energyLevel !== undefined || todayLog.sleep !== undefined || todayLog.focusLevel !== undefined;

  const scoreItems = [
    { label: 'Sleep', value: periodScore.sleep, icon: '😴' },
    { label: 'Energy', value: periodScore.energy, icon: '⚡' },
    { label: 'Habits', value: periodScore.habits, icon: '🔥' },
    { label: 'Nutrition', value: periodScore.nutrition, icon: '🥩' },
    { label: 'Work', value: periodScore.work, icon: '💼' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Insights</h1>
          <p className="text-sm text-slate-400 mt-0.5 font-medium">What your data says about you</p>
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          {([7, 14, 30] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                period === p
                  ? 'bg-gradient-to-r from-violet-600 to-blue-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >{p}d</button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900">Today's Wellbeing</h2>
          <button onClick={() => { setDraft({ ...todayLog }); setShowLog(true); }} className="text-xs text-violet-600 hover:text-violet-700 font-semibold transition-colors">
            {wellbeingLogged ? 'Edit' : '+ Log'}
          </button>
        </div>
        {wellbeingLogged ? (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Sleep', val: todayLog.sleep !== undefined ? `${todayLog.sleep}h` : null, color: todayLog.sleep !== undefined ? (todayLog.sleep >= 7 ? '#10B981' : todayLog.sleep >= 6 ? '#F59E0B' : '#EF4444') : '#94A3B8' },
              { label: 'Energy', val: todayLog.energyLevel !== undefined ? `${todayLog.energyLevel}/10` : null, color: todayLog.energyLevel !== undefined ? (todayLog.energyLevel >= 7 ? '#10B981' : todayLog.energyLevel >= 5 ? '#F59E0B' : '#EF4444') : '#94A3B8' },
              { label: 'Focus', val: todayLog.focusLevel !== undefined ? `${todayLog.focusLevel}/10` : null, color: todayLog.focusLevel !== undefined ? (todayLog.focusLevel >= 7 ? '#10B981' : todayLog.focusLevel >= 5 ? '#F59E0B' : '#EF4444') : '#94A3B8' },
            ].map(m => (
              <div key={m.label} className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-slate-400 font-semibold mb-1">{m.label}</p>
                <p className="text-xl font-black" style={{ color: m.color }}>{m.val ?? '—'}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-slate-400 mb-3">Log sleep, energy & focus to unlock personalized insights</p>
            <button onClick={() => { setDraft({ ...todayLog }); setShowLog(true); }}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-violet-200">Log Now</button>
          </div>
        )}
      </div>

      {tomorrowPlan.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🌅</span>
            <h2 className="text-sm font-bold text-slate-900">Tomorrow's Plan</h2>
            <span className="text-[10px] px-2 py-0.5 bg-violet-100 text-violet-600 rounded-full font-bold ml-auto">Based on your data</span>
          </div>
          <div className="space-y-2">
            {tomorrowPlan.map((action, i) => (
              <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                <span className="text-lg flex-shrink-0 mt-0.5">{action.icon}</span>
                <div className="min-w-0">
                  <div className="mb-0.5">
                    <span className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full font-bold uppercase tracking-wide">{action.category}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 leading-snug">{action.action}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{action.why}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 mb-3">{period}-Day Performance</h2>
        {periodScore.overall !== null ? (
          <div className="flex items-center gap-5">
            <div className="flex-shrink-0 relative">
              <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="32" cy="32" r="27" fill="none" stroke="#E2E8F0" strokeWidth="6" />
                <circle cx="32" cy="32" r="27" fill="none" stroke={scoreColor(periodScore.overall)} strokeWidth="6"
                  strokeDasharray={2 * Math.PI * 27}
                  strokeDashoffset={2 * Math.PI * 27 - (periodScore.overall / 100) * 2 * Math.PI * 27}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-black" style={{ color: scoreColor(periodScore.overall) }}>{periodScore.overall}</span>
              </div>
            </div>
            <div className="flex-1 space-y-2.5">
              {scoreItems.filter(s => s.value !== null).map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="text-sm w-4 flex-shrink-0">{s.icon}</span>
                  <span className="text-xs text-slate-500 font-medium w-14 flex-shrink-0">{s.label}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.value}%`, backgroundColor: scoreColor(s.value!) }} />
                  </div>
                  <span className="text-xs font-bold w-9 text-right flex-shrink-0" style={{ color: scoreColor(s.value!) }}>{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-3">Log a few days of data to see your performance score</p>
        )}
      </div>

      {patterns.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Recurring Patterns</p>
          {patterns.map((p, i) => {
            const c = patternColors[p.severity];
            return (
              <div key={i} className={`rounded-2xl p-4 border ${c.bg} ${c.border}`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0 mt-0.5">{p.icon}</span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
                      <h3 className="text-sm font-bold text-slate-900">{p.title}</h3>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{p.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {insights.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Recommendations</p>
          {insights.map((ins, i) => {
            const c = insightColors[ins.type];
            return (
              <div key={i} className={`rounded-2xl p-4 border ${c.bg} ${c.border}`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0 mt-0.5">{ins.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className={`text-sm font-bold ${c.title}`}>{ins.title}</h3>
                      {ins.metric && <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${c.badge}`}>{ins.metric}</span>}
                    </div>
                    <p className={`text-xs ${c.body} leading-relaxed`}>{ins.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasAnyData && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-5 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{period}-Day Trends</p>
          {[
            { label: 'Sleep (hours)', data: sleepData, max: 10, threshold: 7, good: '#10B981', warn: '#F59E0B', bad: '#EF4444' },
            { label: 'Energy (/10)', data: energyData, max: 10, threshold: 6, good: '#7C3AED', warn: '#F59E0B', bad: '#EF4444' },
            { label: 'Focus (/10)', data: focusData, max: 10, threshold: 6, good: '#3B82F6', warn: '#F59E0B', bad: '#EF4444' },
          ].filter(t => t.data.some(v => v !== null)).map(trend => {
            const vals = trend.data.filter((v): v is number => v !== null);
            const a = vals.length ? avg(vals) : null;
            const aColor = a !== null ? (a >= trend.threshold ? trend.good : a >= trend.threshold * 0.8 ? trend.warn : trend.bad) : '#94A3B8';
            return (
              <div key={trend.label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 font-semibold">{trend.label}</span>
                  {a !== null && <span className="text-xs font-bold" style={{ color: aColor }}>{a.toFixed(1)} avg</span>}
                </div>
                <div className="flex items-end gap-px h-10">
                  {trend.data.map((val, idx) => {
                    const h = val !== null ? Math.max(8, (val / trend.max) * 100) : 5;
                    const color = val === null ? '#E2E8F0' : val >= trend.threshold ? trend.good : val >= trend.threshold * 0.8 ? trend.warn : trend.bad;
                    return <div key={idx} className="flex-1 rounded-sm" style={{ height: `${h}%`, backgroundColor: color, opacity: val === null ? 0.4 : 1 }} />;
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-slate-300 font-medium">{period}d ago</span>
                  <span className="text-[9px] text-slate-300 font-medium">today</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900">Today's Wellbeing</h2>
              <button onClick={() => setShowLog(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            {[
              { label: 'Sleep', key: 'sleep', unit: 'h', min: 0, max: 12, step: 0.5, hint: '7–9h is optimal' },
              { label: 'Energy', key: 'energyLevel', unit: '/10', min: 1, max: 10, step: 1, hint: '1 = exhausted, 10 = on fire' },
              { label: 'Focus', key: 'focusLevel', unit: '/10', min: 1, max: 10, step: 1, hint: '1 = scattered, 10 = locked in' },
            ].map(f => {
              const val = draft[f.key as keyof DailyLog] as number | undefined;
              return (
                <div key={f.key}>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-bold text-slate-900">{f.label}</label>
                    <span className="text-sm font-black text-violet-600">{val !== undefined ? `${val}${f.unit}` : '—'}</span>
                  </div>
                  <input type="range" min={f.min} max={f.max} step={f.step} value={val ?? (f.min + f.max) / 2}
                    onChange={e => setDraft(d => ({ ...d, [f.key]: Number(e.target.value) }))}
                    onMouseDown={() => { if (val === undefined) setDraft(d => ({ ...d, [f.key]: Math.round((f.min + f.max) / 2) })); }}
                    className="w-full accent-violet-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{f.hint}</p>
                </div>
              );
            })}
            <div className="flex gap-3">
              <button onClick={() => setShowLog(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-500 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={saveLog} className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-violet-200">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
