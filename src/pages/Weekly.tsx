import { useMemo, useState } from 'react';
import type { DailyLog, Targets, Habit, Priority, Goal } from '../types';
import ProgressBar from '../components/ProgressBar';
import SparkLine from '../components/SparkLine';

interface WeeklyProps {
  dailyLogs: DailyLog[];
  targets: Targets;
  setTargets: (t: Targets) => void;
  habits: Habit[];
  priorities: Priority[];
  goals: Goal[];
}

function getWeekDates(offset = 0): string[] {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function getLongestStreak(logs: string[]): number {
  if (!logs.length) return 0;
  const sorted = [...new Set(logs)].sort();
  let longest = 1, current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T12:00:00');
    const curr = new Date(sorted[i] + 'T12:00:00');
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) { current++; if (current > longest) longest = current; }
    else current = 1;
  }
  return longest;
}

function agg(logs: DailyLog[], dates: string[], key: keyof DailyLog, mode: 'avg' | 'sum'): number | null {
  const vals = logs.filter(l => dates.includes(l.date) && l[key] !== undefined).map(l => l[key] as number);
  if (!vals.length) return null;
  const sum = vals.reduce((a, b) => a + b, 0);
  return mode === 'avg' ? Math.round(sum / vals.length) : sum;
}

export default function Weekly({ dailyLogs, targets, setTargets, habits, priorities, goals }: WeeklyProps) {
  const [offset, setOffset] = useState(0);
  const [showTargets, setShowTargets] = useState(false);
  const [targetsDraft, setTargetsDraft] = useState(targets);

  const weekDates = useMemo(() => getWeekDates(offset), [offset]);
  const past4Weeks = useMemo(() => [-3, -2, -1, 0].map(o => getWeekDates(o)), []);

  const weekLabel = useMemo(() => {
    const s = new Date(weekDates[0] + 'T12:00:00');
    const e = new Date(weekDates[6] + 'T12:00:00');
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }, [weekDates]);

  type MRow = { label: string; key: keyof DailyLog; target: number; unit: string; lower?: boolean; mode: 'avg' | 'sum' };

  const healthRows: MRow[] = [
    { label: 'Avg Steps', key: 'steps', target: targets.steps, unit: 'k', mode: 'avg' },
    { label: 'Avg Calories', key: 'calories', target: targets.calories, unit: 'cal', mode: 'avg', lower: true },
    { label: 'Avg Protein', key: 'protein', target: targets.protein, unit: 'g', mode: 'avg' },
    { label: 'Avg Screen', key: 'screenTime', target: targets.screenTime, unit: 'h', mode: 'avg', lower: true },
    { label: 'Avg Pickups', key: 'phonePickups', target: targets.phonePickups, unit: '', mode: 'avg', lower: true },
  ];

  const salesRows: MRow[] = [
    { label: 'Calls Booked', key: 'callsBooked', target: targets.callsBooked, unit: '', mode: 'sum' },
    { label: 'Show-ups', key: 'showUps', target: targets.showUps, unit: '', mode: 'sum' },
    { label: 'Closes', key: 'closes', target: targets.closes, unit: '', mode: 'sum' },
  ];

  const getActual = (r: MRow) => agg(dailyLogs, weekDates, r.key, r.mode);
  const getPct = (actual: number | null, target: number, lower = false) => {
    if (actual === null) return null;
    const p = lower ? Math.round((target / actual) * 100) : Math.round((actual / target) * 100);
    return Math.min(100, p);
  };
  const gapColor = (pct: number | null) =>
    pct === null ? '#3F3F46' : pct >= 90 ? '#34D399' : pct >= 65 ? '#FBBF24' : '#F87171';

  const sparkData = (r: MRow) => past4Weeks.map(w => agg(dailyLogs, w, r.key, r.mode) ?? 0);

  const formatVal = (r: MRow, val: number) =>
    r.key === 'steps' ? `${(val / 1000).toFixed(1)}k` : `${val}${r.unit}`;
  const formatTarget = (r: MRow) =>
    r.key === 'steps' ? `${(r.target / 1000).toFixed(1)}k` : `${r.target}${r.unit}`;

  const allRows = [...healthRows, ...salesRows];
  const scores = allRows.map(r => getPct(getActual(r), r.target, r.lower)).filter((p): p is number => p !== null);
  const weekScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const scoreColor = weekScore === null ? '#3F3F46' : weekScore >= 80 ? '#34D399' : weekScore >= 60 ? '#FBBF24' : '#F87171';

  const weekCalls = agg(dailyLogs, weekDates, 'callsBooked', 'sum');
  const weekShows = agg(dailyLogs, weekDates, 'showUps', 'sum');
  const weekCloses = agg(dailyLogs, weekDates, 'closes', 'sum');
  const showRate = weekCalls && weekShows ? Math.round((weekShows / weekCalls) * 100) : null;
  const closeRate = weekShows && weekCloses ? Math.round((weekCloses / weekShows) * 100) : null;

  // Weekly Wins
  const weeklyWins = useMemo(() => {
    const wins: { label: string; value: string; color: string }[] = [];

    habits.forEach(h => {
      const days = weekDates.filter(d => h.logs.includes(d)).length;
      const longest = getLongestStreak(h.logs);
      if (days === 7) wins.push({ label: h.name, value: 'Perfect week — 7/7', color: '#34D399' });
      else if (days >= 5) wins.push({ label: h.name, value: `${days}/7 days this week`, color: '#FBBF24' });
      if (longest >= 7) wins.push({ label: `${h.name} streak`, value: `${longest}-day best streak`, color: '#818CF8' });
    });

    const completedTasks = priorities.filter(p => weekDates.includes(p.date) && p.completed).length;
    if (completedTasks >= 5) wins.push({ label: 'Tasks completed', value: String(completedTasks), color: '#818CF8' });

    allRows.forEach(r => {
      const actual = agg(dailyLogs, weekDates, r.key, r.mode);
      const pct = getPct(actual, r.target, r.lower);
      if (pct !== null && pct >= 100 && actual !== null) {
        wins.push({ label: r.label, value: `Target hit — ${formatVal(r, actual)}`, color: '#34D399' });
      }
    });

    goals.forEach(g => {
      if (!g.progressHistory || g.progressHistory.length < 2) return;
      const thisWeek = g.progressHistory.filter(h => weekDates.includes(h.date));
      if (!thisWeek.length) return;
      const prev = g.progressHistory.filter(h => !weekDates.includes(h.date));
      const prevVal = prev.length ? prev[prev.length - 1].value : 0;
      const delta = thisWeek[thisWeek.length - 1].value - prevVal;
      if (delta > 0) wins.push({ label: g.title, value: `+${delta}% progress`, color: '#818CF8' });
    });

    return wins;
  }, [habits, priorities, goals, weekDates, dailyLogs]);

  // Goal Progress Trends
  const goalTrends = useMemo(() => {
    return goals
      .filter(g => g.progressHistory && g.progressHistory.length >= 2)
      .map(g => {
        const sorted = [...(g.progressHistory ?? [])].sort((a, b) => a.date.localeCompare(b.date));
        const data = sorted.slice(-8).map(h => h.value);
        const delta = data[data.length - 1] - data[0];
        return { id: g.id, title: g.title, progress: g.progress, trendData: data, delta };
      });
  }, [goals]);

  // Habit Correlation (last 28 days)
  const correlation = useMemo(() => {
    if (!habits.length) return null;
    const last28 = Array.from({ length: 28 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (27 - i));
      return d.toISOString().split('T')[0];
    });
    const fullDays = last28.filter(d => habits.every(h => h.logs.includes(d)));
    const partialDays = last28.filter(d => !habits.every(h => h.logs.includes(d)) && habits.some(h => h.logs.includes(d)));
    if (!fullDays.length || !partialDays.length) return null;

    const avgFor = (dates: string[], key: keyof DailyLog) => {
      const vals = dailyLogs.filter(l => dates.includes(l.date) && l[key] !== undefined).map(l => l[key] as number);
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    };

    const metrics = [
      { label: 'Steps', key: 'steps' as keyof DailyLog, higher: true },
      { label: 'Calls Booked', key: 'callsBooked' as keyof DailyLog, higher: true },
      { label: 'Protein (g)', key: 'protein' as keyof DailyLog, higher: true },
      { label: 'Screen Time (h)', key: 'screenTime' as keyof DailyLog, higher: false },
    ].map(m => ({ ...m, full: avgFor(fullDays, m.key), partial: avgFor(partialDays, m.key) }))
      .filter(m => m.full !== null || m.partial !== null);

    return { fullDays: fullDays.length, partialDays: partialDays.length, metrics };
  }, [habits, dailyLogs]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Weekly Review</h1>
          <p className="text-sm text-[#52525B] mt-0.5">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setOffset(o => o - 1)}
            className="w-7 h-7 rounded-lg bg-[#1A1A1A] text-[#71717A] hover:text-white flex items-center justify-center transition-colors">‹</button>
          {offset < 0 && <button onClick={() => setOffset(0)} className="text-xs text-[#818CF8] px-1">►</button>}
          <button onClick={() => setOffset(o => Math.min(0, o + 1))} disabled={offset === 0}
            className="w-7 h-7 rounded-lg bg-[#1A1A1A] text-[#71717A] hover:text-white disabled:opacity-30 flex items-center justify-center transition-colors">›</button>
        </div>
      </div>

      {/* Score + rates */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4">
          <p className="text-xs text-[#52525B] mb-1">Week Score</p>
          {weekScore !== null ? (
            <p className="text-3xl font-bold" style={{ color: scoreColor }}>{weekScore}<span className="text-lg">%</span></p>
          ) : (
            <p className="text-[#3F3F46] text-sm mt-2">No data</p>
          )}
        </div>
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4">
          <p className="text-xs text-[#52525B] mb-1">Show Rate</p>
          {showRate !== null ? (
            <>
              <p className="text-3xl font-bold" style={{ color: showRate >= 70 ? '#34D399' : showRate >= 40 ? '#FBBF24' : '#F87171' }}>
                {showRate}<span className="text-lg">%</span>
              </p>
              <p className="text-[10px] text-[#3F3F46] mt-0.5">target 70%</p>
            </>
          ) : (
            <p className="text-[#3F3F46] text-sm mt-2">No data</p>
          )}
        </div>
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4">
          <p className="text-xs text-[#52525B] mb-1">Close Rate</p>
          {closeRate !== null ? (
            <>
              <p className="text-3xl font-bold" style={{ color: closeRate >= 20 ? '#34D399' : closeRate >= 12 ? '#FBBF24' : '#F87171' }}>
                {closeRate}<span className="text-lg">%</span>
              </p>
              <p className="text-[10px] text-[#3F3F46] mt-0.5">target 20%</p>
            </>
          ) : (
            <p className="text-[#3F3F46] text-sm mt-2">No data</p>
          )}
        </div>
      </div>

      {/* Weekly Wins */}
      {weeklyWins.length > 0 && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4">
          <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-wider mb-3">Weekly Wins</p>
          <div className="divide-y divide-[#161616]">
            {weeklyWins.map((win, i) => (
              <div key={i} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <span className="text-sm text-[#A1A1AA]">{win.label}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-3"
                  style={{ color: win.color, backgroundColor: `${win.color}18` }}>
                  {win.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health metrics */}
      <MetricSection title="Health" rows={healthRows} getActual={getActual} getPct={getPct} gapColor={gapColor} sparkData={sparkData} formatVal={formatVal} formatTarget={formatTarget} />

      {/* Sales metrics */}
      <MetricSection title="Sales" rows={salesRows} getActual={getActual} getPct={getPct} gapColor={gapColor} sparkData={sparkData} formatVal={(r, v) => String(v)} formatTarget={r => String(r.target)} />

      {/* Goal Progress Trends */}
      {goalTrends.length > 0 && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4">
          <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-wider mb-4">Goal Progress Trends</p>
          <div className="space-y-4">
            {goalTrends.map(goal => (
              <div key={goal.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-[#A1A1AA] truncate flex-1 mr-2">{goal.title}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-semibold ${
                        goal.delta > 0 ? 'text-[#34D399]' : goal.delta < 0 ? 'text-[#F87171]' : 'text-[#52525B]'
                      }`}>
                        {goal.delta > 0 ? '+' : ''}{goal.delta}%
                      </span>
                      <span className="text-[10px] text-[#3F3F46]">{goal.progress}% now</span>
                    </div>
                  </div>
                  <ProgressBar value={goal.progress} color={goal.delta >= 0 ? '#818CF8' : '#F87171'} height="h-1" />
                </div>
                <SparkLine data={goal.trendData} color={goal.delta >= 0 ? '#818CF8' : '#F87171'} height={24} width={56} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Habit Correlation */}
      {correlation && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4">
          <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-wider mb-1">Habit Correlation</p>
          <p className="text-[11px] text-[#3F3F46] mb-4">Last 28 days · {correlation.fullDays} full-habit days vs {correlation.partialDays} partial</p>
          {correlation.metrics.length === 0 ? (
            <p className="text-sm text-[#3F3F46] text-center py-2">Log more data to see patterns</p>
          ) : (
            <div className="space-y-4">
              {correlation.metrics.map(m => {
                const fullBetter = m.higher ? (m.full ?? 0) >= (m.partial ?? 0) : (m.full ?? 0) <= (m.partial ?? 0);
                const maxVal = Math.max(m.full ?? 0, m.partial ?? 0, 1);
                return (
                  <div key={m.label} className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-xs text-[#A1A1AA]">{m.label}</span>
                      {m.full !== null && m.partial !== null && m.full !== m.partial && (
                        <span className={`text-[11px] font-medium ${fullBetter ? 'text-[#34D399]' : 'text-[#F87171]'}`}>
                          {fullBetter ? '↑' : '↓'} {Math.abs(m.full - m.partial)} on habit days
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#34D399] w-12 flex-shrink-0">All done</span>
                      <div className="flex-1 h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#34D399] transition-all" style={{ width: `${((m.full ?? 0) / maxVal) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-[#52525B] w-8 text-right flex-shrink-0">{m.full ?? '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#52525B] w-12 flex-shrink-0">Partial</span>
                      <div className="flex-1 h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#3F3F46] transition-all" style={{ width: `${((m.partial ?? 0) / maxVal) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-[#52525B] w-8 text-right flex-shrink-0">{m.partial ?? '—'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Targets */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Your Targets</h2>
          <button onClick={() => { setTargetsDraft({ ...targets }); setShowTargets(true); }}
            className="text-xs text-[#818CF8] hover:text-[#A5B4FC] transition-colors">Edit</button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Steps/day', v: `${(targets.steps / 1000).toFixed(0)}k` },
            { label: 'Cal/day', v: targets.calories },
            { label: 'Protein/day', v: `${targets.protein}g` },
            { label: 'Screen/day', v: `${targets.screenTime}h` },
            { label: 'Pickups/day', v: targets.phonePickups },
            { label: 'Calls/wk', v: targets.callsBooked },
            { label: 'Shows/wk', v: targets.showUps },
            { label: 'Closes/wk', v: targets.closes },
          ].map(t => (
            <div key={t.label} className="bg-[#0A0A0A] rounded-lg p-2.5">
              <p className="text-[10px] text-[#3F3F46]">{t.label}</p>
              <p className="text-sm font-semibold text-[#818CF8] mt-0.5">{t.v}</p>
            </div>
          ))}
        </div>
      </div>

      {showTargets && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Edit Targets</h2>
              <button onClick={() => setShowTargets(false)} className="text-[#52525B] hover:text-white text-xl leading-none">×</button>
            </div>
            <div>
              <p className="text-[11px] text-[#52525B] uppercase tracking-wider mb-3">Daily Health</p>
              {[{ l: 'Steps', k: 'steps' }, { l: 'Calories', k: 'calories' }, { l: 'Protein (g)', k: 'protein' }, { l: 'Screen time (h)', k: 'screenTime' }, { l: 'Phone pickups', k: 'phonePickups' }].map(f => (
                <div key={f.k} className="flex items-center gap-3 mb-2">
                  <label className="text-sm text-[#A1A1AA] w-36 flex-shrink-0">{f.l}</label>
                  <input type="number" value={targetsDraft[f.k as keyof Targets]}
                    onChange={e => setTargetsDraft(d => ({ ...d, [f.k]: Number(e.target.value) }))}
                    className="flex-1 bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#818CF8]"
                  />
                </div>
              ))}
            </div>
            <div>
              <p className="text-[11px] text-[#52525B] uppercase tracking-wider mb-3">Weekly Sales</p>
              {[{ l: 'Calls Booked', k: 'callsBooked' }, { l: 'Show-ups', k: 'showUps' }, { l: 'Closes', k: 'closes' }].map(f => (
                <div key={f.k} className="flex items-center gap-3 mb-2">
                  <label className="text-sm text-[#A1A1AA] w-36 flex-shrink-0">{f.l}</label>
                  <input type="number" value={targetsDraft[f.k as keyof Targets]}
                    onChange={e => setTargetsDraft(d => ({ ...d, [f.k]: Number(e.target.value) }))}
                    className="flex-1 bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#818CF8]"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowTargets(false)} className="flex-1 py-2.5 border border-[#1E1E1E] text-[#71717A] text-sm rounded-lg">Cancel</button>
              <button onClick={() => { setTargets(targetsDraft); setShowTargets(false); }}
                className="flex-1 py-2.5 bg-[#818CF8] hover:bg-[#6366F1] text-white text-sm font-medium rounded-lg transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type MRow = { label: string; key: string; target: number; unit: string; lower?: boolean; mode: 'avg' | 'sum' };

function MetricSection({ title, rows, getActual, getPct, gapColor, sparkData, formatVal, formatTarget }: {
  title: string;
  rows: MRow[];
  getActual: (r: MRow) => number | null;
  getPct: (actual: number | null, target: number, lower?: boolean) => number | null;
  gapColor: (pct: number | null) => string;
  sparkData: (r: MRow) => number[];
  formatVal: (r: MRow, v: number) => string;
  formatTarget: (r: MRow) => string;
}) {
  return (
    <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4">
      <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-wider mb-4">{title}</p>
      <div className="space-y-4">
        {rows.map(r => {
          const actual = getActual(r);
          const pct = getPct(actual, r.target, r.lower);
          const color = gapColor(pct);
          return (
            <div key={r.key} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-[#A1A1AA]">{r.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold" style={{ color: actual !== null ? color : '#3F3F46' }}>
                      {actual !== null ? formatVal(r, actual) : '—'}
                    </span>
                    <span className="text-[10px] text-[#3F3F46]">/ {formatTarget(r)}</span>
                  </div>
                </div>
                {pct !== null && <ProgressBar value={pct} color={color} height="h-1" />}
              </div>
              <SparkLine data={sparkData(r)} color={actual !== null ? color : '#222'} height={24} width={56} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
