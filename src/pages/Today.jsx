import { useState, useEffect } from 'react';
import {
  loadDailyLog, saveDailyLog, loadWeek, saveWeek,
  loadStreak, saveStreak, getTodayKey, getDateStr,
} from '../utils/storage.js';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

const DRILLS_BY_WEEKDAY = {
  1: { name: 'TONALITY', desc: 'Record your opener in 5 emotional states: confident, curious, warm, urgent, detached. Play back and compare.' },
  2: { name: 'PSYCHOLOGY', desc: 'Read one chapter from your reading stack. Take notes on one technique to steal.' },
  3: { name: 'LIVE REPS', desc: 'Real cold calls only. No fake practice. Log how many you made.' },
  4: { name: 'BREAKDOWN', desc: 'Pick one elite closer on YouTube. Dissect their structure sentence by sentence.' },
  5: { name: 'WEAK LINK ATTACK', desc: "Look at your week's data. Find your worst conversion point. Drill it for the full hour." },
};

const S = {
  card: { background: '#111111', border: '1px solid #1a1a1a', padding: 16, marginBottom: 16 },
  label: { fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 11, letterSpacing: '0.15em', color: '#737373', display: 'block', marginBottom: 10 },
  textarea: { width: '100%', padding: '10px 12px', fontSize: 13, background: '#0a0a0a', border: '1px solid #1a1a1a', color: '#f5f5f5', marginTop: 10, minHeight: 60 },
  h1: { fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: 24, color: '#f5f5f5', letterSpacing: '-0.02em', marginBottom: 4 },
  subtext: { color: '#737373', fontSize: 13 },
};

export default function Today({ settings, streak, onStreakUpdate, onNavigate }) {
  const todayKey = getTodayKey();
  const weekday = new Date().getDay(); // 0=Sun,1=Mon...6=Sat
  const todayDrill = DRILLS_BY_WEEKDAY[weekday] || null;

  const defaultHours = Array(4).fill(null).map(() => ({ done: false, notes: '' }));
  const [hours, setHours] = useState(defaultHours);
  const [log, setLog] = useState('');
  const [score, setScore] = useState(0);
  const [week, setWeek] = useState({ mon: false, tue: false, wed: false, thu: false, fri: false });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const data = loadDailyLog(todayKey);
    if (data) {
      setHours(data.hours || defaultHours);
      setLog(data.log || '');
      setScore(data.score || 0);
    }
    setWeek(loadWeek());
  }, []);

  const setHour = (i, field, val) =>
    setHours(h => h.map((x, idx) => idx === i ? { ...x, [field]: val } : x));

  const toggleDay = (day) => {
    const updated = { ...week, [day]: !week[day] };
    setWeek(updated);
    saveWeek(updated);
  };

  const isActiveNow = (targetHour) => {
    const h = new Date().getHours();
    return h >= targetHour && h < targetHour + 1;
  };

  const handleSave = () => {
    const isFirstSave = !loadDailyLog(todayKey);
    const anyDone = hours.some(h => h.done);
    saveDailyLog(todayKey, { hours, log, score });

    const dayNameMap = { 0: null, 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: null };
    const todayName = dayNameMap[weekday];
    if (todayName) {
      const updatedWeek = { ...week, [todayName]: true };
      setWeek(updatedWeek);
      saveWeek(updatedWeek);
    }

    if (isFirstSave && anyDone) {
      const newStreak = streak + 1;
      saveStreak(newStreak);
      onStreakUpdate(newStreak);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const hourMeta = [
    { title: 'HOUR 1', sub: 'COACHING CALL', activeHour: 9 },
    { title: 'HOUR 2', sub: 'CALL REVIEW', activeHour: 10, hasCTA: true },
    { title: 'HOUR 3', sub: 'SALES GENESIS MODULE', activeHour: 11, showSkill: true },
    { title: 'HOUR 4', sub: todayDrill ? `DRILL: ${todayDrill.name}` : "TODAY'S DRILL", activeHour: 12 },
  ];

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div style={{ padding: '24px 20px', maxWidth: 680 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={S.h1}>TODAY'S TRAINING</h1>
        <p style={S.subtext}>{todayLabel}</p>
      </div>

      {/* Weekly tracker */}
      <div style={S.card}>
        <span style={S.label}>THIS WEEK</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {DAYS.map((day, i) => (
            <button
              key={day}
              onClick={() => toggleDay(day)}
              style={{
                flex: 1, padding: '10px 0', fontFamily: 'Space Grotesk', fontWeight: 700,
                fontSize: 11, letterSpacing: '0.12em', border: '1px solid',
                borderColor: week[day] ? '#ef4444' : '#1a1a1a',
                background: week[day] ? '#ef4444' : '#0a0a0a',
                color: week[day] ? '#fff' : '#737373',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >{DAY_LABELS[i]}</button>
          ))}
          {['SAT', 'SUN'].map(d => (
            <button key={d} disabled style={{
              flex: 1, padding: '10px 0', fontFamily: 'Space Grotesk', fontWeight: 700,
              fontSize: 11, letterSpacing: '0.12em', border: '1px solid #1a1a1a',
              background: '#0a0a0a', color: '#2a2a2a', cursor: 'not-allowed',
            }}>{d}</button>
          ))}
        </div>
      </div>

      {/* Hour blocks */}
      {hourMeta.map((meta, i) => {
        const active = isActiveNow(meta.activeHour);
        return (
          <div key={i} style={{ ...S.card, borderColor: active ? '#ef4444' : '#1a1a1a', boxShadow: active ? '0 0 14px rgba(239,68,68,0.15)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Space Grotesk', fontSize: 10, color: '#737373', letterSpacing: '0.15em', marginBottom: 2 }}>{meta.title}</div>
                <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 15, color: '#f5f5f5' }}>{meta.sub}</div>
                {meta.showSkill && (
                  <div style={{ fontFamily: 'Space Grotesk', fontSize: 11, color: '#ef4444', marginTop: 4, letterSpacing: '0.1em' }}>
                    SKILL: {settings?.skillOfWeek?.toUpperCase() || 'TONALITY'}
                  </div>
                )}
                {i === 3 && todayDrill && (
                  <div style={{ fontSize: 12, color: '#737373', marginTop: 4 }}>{todayDrill.desc}</div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {active && (
                  <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 10, color: '#ef4444', letterSpacing: '0.15em', animation: 'dot-pulse 1.2s ease-in-out infinite' }}>ACTIVE</span>
                )}
                {meta.hasCTA && (
                  <button
                    onClick={() => onNavigate('calls')}
                    style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', padding: '4px 10px', border: '1px solid #ef4444', color: '#ef4444', background: 'transparent', cursor: 'pointer' }}
                  >CALLS →</button>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={hours[i].done}
                    onChange={e => setHour(i, 'done', e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: '#ef4444', cursor: 'pointer' }}
                  />
                  <span style={{ fontFamily: 'Space Grotesk', fontSize: 10, color: '#737373', letterSpacing: '0.1em' }}>DONE</span>
                </label>
              </div>
            </div>
            <textarea
              value={hours[i].notes}
              onChange={e => setHour(i, 'notes', e.target.value)}
              placeholder="Notes..."
              rows={2}
              style={S.textarea}
            />
          </div>
        );
      })}

      {/* Daily log */}
      <div style={S.card}>
        <span style={S.label}>DAILY LOG</span>
        <textarea
          value={log}
          onChange={e => setLog(e.target.value)}
          placeholder="One thing I'll do differently tomorrow..."
          rows={3}
          style={{ ...S.textarea, marginTop: 0 }}
        />
      </div>

      {/* Tonality score */}
      <div style={S.card}>
        <span style={S.label}>TONALITY SELF-SCORE</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => setScore(n)}
              style={{
                flex: 1, padding: '10px 0', fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 13,
                border: '1px solid', borderColor: score === n ? '#ef4444' : '#1a1a1a',
                background: score === n ? '#ef4444' : '#0a0a0a',
                color: score === n ? '#fff' : '#737373',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >{n}</button>
          ))}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        style={{
          width: '100%', padding: '16px', fontFamily: 'Space Grotesk', fontWeight: 800,
          fontSize: 13, letterSpacing: '0.2em', border: '1px solid',
          borderColor: saved ? '#22c55e' : '#ef4444',
          background: saved ? '#22c55e' : '#ef4444',
          color: '#fff', cursor: 'pointer', transition: 'all 0.2s',
        }}
      >
        {saved ? '✓ SAVED' : 'SAVE DAY'}
      </button>
    </div>
  );
}
