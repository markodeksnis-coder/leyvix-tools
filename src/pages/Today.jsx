import { useState, useEffect } from 'react';
import { loadDailyLog, saveDailyLog, loadWeek, saveWeek, loadStreak, saveStreak, getTodayKey } from '../utils/storage.js';

const DAYS = ['mon','tue','wed','thu','fri'];
const DAY_LABELS = ['MON','TUE','WED','THU','FRI'];

const DRILLS = {
  1: { name: 'TONALITY', desc: 'Record your opener in 5 emotional states: confident, curious, warm, urgent, detached.' },
  2: { name: 'PSYCHOLOGY', desc: 'Read one chapter from your reading stack. Extract one technique to steal.' },
  3: { name: 'LIVE REPS', desc: 'Real cold calls only. No fake practice. Log how many you made.' },
  4: { name: 'BREAKDOWN', desc: 'Pick one elite closer. Dissect their structure sentence by sentence.' },
  5: { name: 'WEAK LINK ATTACK', desc: "Find your worst conversion point from the week. Drill it for the full hour." },
};

const gold = '#f59e0b';
const green = '#10b981';
const card = { background: '#0f0f0f', border: '1px solid #1c1c1c', padding: '20px', marginBottom: 12 };
const labelStyle = { fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 10, letterSpacing: '0.2em', color: '#4a4a4a', display: 'block', marginBottom: 10 };
const textareaStyle = { width: '100%', padding: '10px 14px', fontSize: 13, background: '#080808', border: '1px solid #1c1c1c', color: '#f0f0f0', marginTop: 10, lineHeight: 1.6 };

export default function Today({ settings, streak, onStreakUpdate, onNavigate }) {
  const todayKey = getTodayKey();
  const weekday = new Date().getDay();
  const todayDrill = DRILLS[weekday] || null;
  const defaultHours = Array(4).fill(null).map(() => ({ done: false, notes: '' }));

  const [hours, setHours] = useState(defaultHours);
  const [log, setLog] = useState('');
  const [score, setScore] = useState(0);
  const [week, setWeek] = useState({ mon:false, tue:false, wed:false, thu:false, fri:false });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const d = loadDailyLog(todayKey);
    if (d) { setHours(d.hours || defaultHours); setLog(d.log || ''); setScore(d.score || 0); }
    setWeek(loadWeek());
  }, []);

  const setHour = (i, field, val) => setHours(h => h.map((x, idx) => idx === i ? { ...x, [field]: val } : x));

  const toggleDay = (day) => {
    const u = { ...week, [day]: !week[day] };
    setWeek(u); saveWeek(u);
  };

  const isActive = (h) => { const n = new Date().getHours(); return n >= h && n < h + 1; };

  const handleSave = () => {
    const isFirst = !loadDailyLog(todayKey);
    saveDailyLog(todayKey, { hours, log, score });
    const map = { 0:null,1:'mon',2:'tue',3:'wed',4:'thu',5:'fri',6:null };
    const name = map[weekday];
    if (name) { const u = { ...week, [name]: true }; setWeek(u); saveWeek(u); }
    if (isFirst && hours.some(h => h.done)) { const n = streak + 1; saveStreak(n); onStreakUpdate(n); }
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const hourMeta = [
    { num:'01', title:'COACHING CALL', hour:9 },
    { num:'02', title:'CALL REVIEW', hour:10, cta:true },
    { num:'03', title:'SALES GENESIS', hour:11, skill:true },
    { num:'04', title: todayDrill ? todayDrill.name : "TODAY'S DRILL", hour:12, drill:true },
  ];

  const today = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });

  return (
    <div style={{ padding:'28px 24px', maxWidth:700 }}>

      {/* Header */}
      <div style={{ marginBottom:28, display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontFamily:'Space Grotesk', fontWeight:900, fontSize:28, color:'#f0f0f0', letterSpacing:'-0.03em', lineHeight:1 }}>TODAY</div>
          <div style={{ fontFamily:'Space Grotesk', fontSize:12, color:'#4a4a4a', letterSpacing:'0.15em', marginTop:5 }}>{today.toUpperCase()}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:'Space Grotesk', fontWeight:800, fontSize:28, color:gold, lineHeight:1 }}>{streak}</div>
          <div style={{ fontFamily:'Space Grotesk', fontSize:9, color:'#4a4a4a', letterSpacing:'0.2em' }}>DAY STREAK</div>
        </div>
      </div>

      {/* Weekly tracker */}
      <div style={{ ...card, marginBottom:20 }}>
        <span style={labelStyle}>WEEK TRACKER</span>
        <div style={{ display:'flex', gap:6 }}>
          {DAYS.map((day,i) => (
            <button key={day} onClick={() => toggleDay(day)} style={{
              flex:1, padding:'12px 0', fontFamily:'Space Grotesk', fontWeight:800,
              fontSize:10, letterSpacing:'0.12em',
              border:'1px solid', borderColor: week[day] ? gold : '#1c1c1c',
              background: week[day] ? 'rgba(245,158,11,0.12)' : 'transparent',
              color: week[day] ? gold : '#3a3a3a',
              cursor:'pointer', transition:'all 0.15s',
            }}>{DAY_LABELS[i]}</button>
          ))}
          {['SAT','SUN'].map(d => (
            <button key={d} disabled style={{
              flex:1, padding:'12px 0', fontFamily:'Space Grotesk', fontWeight:800,
              fontSize:10, letterSpacing:'0.12em',
              border:'1px solid #111', background:'transparent', color:'#1a1a1a', cursor:'not-allowed',
            }}>{d}</button>
          ))}
        </div>
      </div>

      {/* Hour blocks */}
      {hourMeta.map((m,i) => {
        const active = isActive(m.hour);
        return (
          <div key={i} style={{
            background:'#0f0f0f',
            border:`1px solid ${active ? gold : '#1c1c1c'}`,
            boxShadow: active ? `0 0 20px rgba(245,158,11,0.08)` : 'none',
            padding:20, marginBottom:12, transition:'border-color 0.2s',
          }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:16, flex:1 }}>
                <div style={{ fontFamily:'Space Grotesk', fontWeight:900, fontSize:22, color: active ? gold : '#222', lineHeight:1, flexShrink:0, marginTop:2 }}>{m.num}</div>
                <div>
                  <div style={{ fontFamily:'Space Grotesk', fontWeight:700, fontSize:14, color:'#f0f0f0', letterSpacing:'0.02em' }}>{m.title}</div>
                  {m.skill && <div style={{ fontSize:11, color:gold, marginTop:3, fontFamily:'Space Grotesk', fontWeight:600, letterSpacing:'0.1em' }}>↳ {(settings?.skillOfWeek||'TONALITY').toUpperCase()}</div>}
                  {m.drill && todayDrill && <div style={{ fontSize:12, color:'#4a4a4a', marginTop:4, lineHeight:1.5 }}>{todayDrill.desc}</div>}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                {active && <span style={{ fontFamily:'Space Grotesk', fontWeight:700, fontSize:9, color:gold, letterSpacing:'0.2em', animation:'dot-blink 1.4s ease-in-out infinite' }}>● LIVE</span>}
                {m.cta && (
                  <button onClick={() => onNavigate('calls')} style={{ fontFamily:'Space Grotesk', fontWeight:700, fontSize:9, letterSpacing:'0.12em', padding:'5px 10px', border:`1px solid ${gold}`, color:gold, background:'transparent', cursor:'pointer' }}>CALLS →</button>
                )}
                <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                  <input type="checkbox" checked={hours[i].done} onChange={e => setHour(i,'done',e.target.checked)}
                    style={{ width:17, height:17, accentColor:gold, cursor:'pointer' }} />
                  <span style={{ fontFamily:'Space Grotesk', fontSize:9, color:'#3a3a3a', letterSpacing:'0.15em' }}>DONE</span>
                </label>
              </div>
            </div>
            <textarea value={hours[i].notes} onChange={e => setHour(i,'notes',e.target.value)} placeholder="Notes..." rows={2} style={textareaStyle} />
          </div>
        );
      })}

      {/* Daily log */}
      <div style={{ ...card, marginTop:8 }}>
        <span style={labelStyle}>DAILY DEBRIEF</span>
        <textarea value={log} onChange={e => setLog(e.target.value)} placeholder="One thing I'll do differently tomorrow..." rows={3} style={{ ...textareaStyle, marginTop:0 }} />
      </div>

      {/* Tonality score */}
      <div style={card}>
        <span style={labelStyle}>TONALITY SCORE</span>
        <div style={{ display:'flex', gap:4 }}>
          {Array.from({length:10},(_,i)=>i+1).map(n => (
            <button key={n} onClick={() => setScore(n)} style={{
              flex:1, padding:'11px 0', fontFamily:'Space Grotesk', fontWeight:800, fontSize:12,
              border:'1px solid', borderColor: score===n ? gold : '#1c1c1c',
              background: score===n ? 'rgba(245,158,11,0.12)' : 'transparent',
              color: score===n ? gold : '#3a3a3a',
              cursor:'pointer', transition:'all 0.15s',
            }}>{n}</button>
          ))}
        </div>
        {score > 0 && <div style={{ fontFamily:'Space Grotesk', fontSize:11, color: score>=7?green:score>=5?gold:'#ef4444', marginTop:10, letterSpacing:'0.1em' }}>
          {score>=7 ? '● SHARP' : score>=5 ? '● AVERAGE' : '● NEEDS WORK'}
        </div>}
      </div>

      {/* Save */}
      <button onClick={handleSave} style={{
        width:'100%', padding:'17px',
        fontFamily:'Space Grotesk', fontWeight:800, fontSize:12, letterSpacing:'0.25em',
        border:'1px solid',
        borderColor: saved ? green : gold,
        background: saved ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.1)',
        color: saved ? green : gold,
        cursor:'pointer', transition:'all 0.2s',
      }}>
        {saved ? '✓ DAY SAVED' : 'LOCK IN THE DAY'}
      </button>
    </div>
  );
}
