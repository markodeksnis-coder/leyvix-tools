import { useState, useEffect, useRef } from 'react';
import { loadDrillLog, saveDrillLog, getDateStr } from '../utils/storage.js';

const DRILLS = [
  { day: 1, label: 'MON', name: 'TONALITY', emoji: '🎙', desc: 'Record your opener in 5 emotional states: confident, curious, warm, urgent, detached. Play back and compare.' },
  { day: 2, label: 'TUE', name: 'PSYCHOLOGY', emoji: '🧠', desc: 'Read one chapter from your reading stack. Take notes on one technique to steal.' },
  { day: 3, label: 'WED', name: 'LIVE REPS', emoji: '📞', desc: 'Real cold calls only. No fake practice. Log how many you made.' },
  { day: 4, label: 'THU', name: 'BREAKDOWN', emoji: '🔍', desc: 'Pick one elite closer on YouTube. Dissect their structure sentence by sentence. What did they say, why did it work, how do you steal it.' },
  { day: 5, label: 'FRI', name: 'WEAK LINK ATTACK', emoji: '⚔', desc: "Look at your week's data. Find your worst conversion point. Drill it for the full hour." },
];

const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const getDateForWeekday = (targetDay) => {
  const now = new Date();
  const diff = targetDay - now.getDay();
  const d = new Date(now);
  d.setDate(now.getDate() + diff);
  return getDateStr(d);
};

function DrillCard({ drill, isToday }) {
  const dateStr = getDateForWeekday(drill.day);
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState(false);
  const [minutes, setMinutes] = useState(60);
  const [timeLeft, setTimeLeft] = useState(3600);
  const [running, setRunning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const saved = loadDrillLog(dateStr);
    if (saved) {
      setNotes(saved.notes || '');
      setDone(saved.done || false);
      const m = saved.minutes || 60;
      setMinutes(m);
      setTimeLeft(m * 60);
    }
    return () => clearInterval(timerRef.current);
  }, [dateStr]);

  const persist = (overrides = {}) => {
    saveDrillLog(dateStr, { notes, done, minutes, ...overrides });
  };

  const startPause = () => {
    if (running) {
      clearInterval(timerRef.current);
      setRunning(false);
    } else {
      if (timeLeft === 0) return;
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); setRunning(false); return 0; }
          return t - 1;
        });
      }, 1000);
      setRunning(true);
    }
  };

  const reset = () => {
    clearInterval(timerRef.current);
    setRunning(false);
    setTimeLeft(minutes * 60);
  };

  const setMin = (m) => {
    clearInterval(timerRef.current);
    setRunning(false);
    setMinutes(m);
    setTimeLeft(m * 60);
    persist({ minutes: m });
  };

  const toggleDone = () => {
    const next = !done;
    setDone(next);
    persist({ done: next });
  };

  const progressPct = minutes > 0 ? ((minutes * 60 - timeLeft) / (minutes * 60)) * 100 : 0;

  return (
    <div style={{
      background: '#111111',
      border: `1px solid ${isToday ? '#ef4444' : '#1a1a1a'}`,
      boxShadow: isToday ? '0 0 16px rgba(239,68,68,0.12)' : 'none',
      marginBottom: 16,
      transition: 'border-color 0.2s',
    }}>
      {/* Progress bar */}
      <div style={{ height: 2, background: '#0a0a0a' }}>
        <div style={{ height: '100%', width: `${progressPct}%`, background: '#ef4444', transition: running ? 'width 1s linear' : 'width 0.3s' }} />
      </div>

      <div style={{ padding: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 10, letterSpacing: '0.15em', color: isToday ? '#ef4444' : '#737373', marginBottom: 3 }}>
              {drill.label}{isToday ? ' — TODAY' : ''}
            </div>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: 17, color: done ? '#22c55e' : '#f5f5f5', letterSpacing: '-0.01em' }}>
              {drill.emoji} {drill.name}
            </div>
            <div style={{ fontSize: 12, color: '#737373', marginTop: 5, lineHeight: 1.5, maxWidth: 480 }}>{drill.desc}</div>
          </div>
          <button
            onClick={toggleDone}
            style={{
              fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 10, letterSpacing: '0.12em',
              padding: '8px 14px', border: '1px solid', cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
              borderColor: done ? '#22c55e' : '#1a1a1a',
              background: done ? '#22c55e' : 'transparent',
              color: done ? '#fff' : '#737373',
            }}
          >{done ? '✓ DONE' : 'MARK DONE'}</button>
        </div>

        {/* Timer row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: 28, color: timeLeft === 0 ? '#22c55e' : '#f5f5f5', letterSpacing: '0.05em', minWidth: 90 }}>
            {fmtTime(timeLeft)}
          </div>
          <button
            onClick={startPause}
            style={{
              fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em',
              padding: '8px 16px', border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
              borderColor: running ? '#f59e0b' : '#ef4444',
              background: running ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
              color: running ? '#f59e0b' : '#ef4444',
            }}
          >{running ? 'PAUSE' : 'START'}</button>
          <button
            onClick={reset}
            style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', padding: '8px 14px', border: '1px solid #1a1a1a', color: '#737373', background: 'transparent', cursor: 'pointer' }}
          >RESET</button>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'Space Grotesk', fontSize: 10, color: '#737373', letterSpacing: '0.1em' }}>MIN</span>
            <select
              value={minutes}
              onChange={e => setMin(Number(e.target.value))}
              style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', color: '#f5f5f5', padding: '4px 8px', fontSize: 12, fontFamily: 'Space Grotesk' }}
            >
              {[15, 30, 45, 60, 90].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Notes */}
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={() => persist()}
          placeholder="Notes from this drill..."
          rows={2}
          style={{ width: '100%', padding: '10px 12px', fontSize: 13, background: '#0a0a0a', border: '1px solid #1a1a1a', color: '#f5f5f5' }}
        />
      </div>
    </div>
  );
}

export default function Drills() {
  const todayDay = new Date().getDay();

  return (
    <div style={{ padding: '24px 20px', maxWidth: 680 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: 24, color: '#f5f5f5', letterSpacing: '-0.02em', marginBottom: 4 }}>DRILL SCHEDULE</h1>
        <p style={{ color: '#737373', fontSize: 13 }}>Weekly training protocol. Every weekday has a mission.</p>
      </div>
      {DRILLS.map(drill => (
        <DrillCard key={drill.day} drill={drill} isToday={drill.day === todayDay} />
      ))}
    </div>
  );
}
