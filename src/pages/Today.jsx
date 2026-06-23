import { useState, useEffect } from 'react';
import { loadDailyLog, saveDailyLog, loadWeek, saveWeek, loadStreak, saveStreak, getTodayKey } from '../utils/storage.js';

const gold='#c9a84c', goldLt='#e2c675', green='#10b981', red='#ef4444';

const DRILLS={
  1:{name:'Tonality',desc:'Record your opener in 5 emotional states: confident, curious, warm, urgent, detached.'},
  2:{name:'Psychology',desc:'Read one chapter from your reading stack. Extract one technique to steal.'},
  3:{name:'Live Reps',desc:'Real cold calls only. No fake practice. Log how many you made.'},
  4:{name:'Breakdown',desc:'Pick one elite closer. Dissect their structure sentence by sentence.'},
  5:{name:'Weak Link Attack',desc:"Find your worst conversion point this week. Drill it for the full hour."},
};

const DAYS=['mon','tue','wed','thu','fri'];
const DAY_LABELS=['M','T','W','T','F'];

// Marko OS-style metric card
function MetricCard({label, value, sub, color=gold, pct=0}) {
  return (
    <div style={{
      background:'linear-gradient(135deg,#0f0f18 0%,#0c0c14 100%)',
      border:'1px solid rgba(201,168,76,0.1)',
      borderRadius:12, padding:'18px 20px', position:'relative', overflow:'hidden',
    }}>
      <div style={{fontSize:9,fontWeight:700,color:'#5a5560',letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:8}}>{label}</div>
      <div style={{fontSize:28,fontWeight:900,color,lineHeight:1,letterSpacing:'-0.03em'}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:'#4a4550',marginTop:4}}>{sub}</div>}
      {pct>0&&<div style={{height:2,background:'#1a1a26',borderRadius:2,overflow:'hidden',marginTop:12}}>
        <div style={{width:`${pct}%`,height:'100%',background:`linear-gradient(90deg,${color},${goldLt})`,borderRadius:2,transition:'width 0.6s'}}/>
      </div>}
    </div>
  );
}

const card={
  background:'linear-gradient(135deg,#0f0f18 0%,#0c0c14 100%)',
  border:'1px solid rgba(201,168,76,0.1)', borderRadius:12, padding:20, marginBottom:12,
};
const sectionHead=(label)=>(
  <div style={{display:'flex',alignItems:'center',gap:10,paddingBottom:12,marginBottom:12,borderBottom:'1px solid #15151f'}}>
    <span style={{fontSize:11,fontWeight:700,color:'#4a4550',letterSpacing:'0.18em',textTransform:'uppercase'}}>{label}</span>
  </div>
);

export default function Today({settings,streak,onStreakUpdate,onNavigate}) {
  const todayKey=getTodayKey();
  const wd=new Date().getDay();
  const todayDrill=DRILLS[wd]||null;
  const defHours=Array(4).fill(null).map(()=>({done:false,notes:''}));
  const [hours,setHours]=useState(defHours);
  const [log,setLog]=useState('');
  const [score,setScore]=useState(0);
  const [week,setWeek]=useState({mon:false,tue:false,wed:false,thu:false,fri:false});
  const [saved,setSaved]=useState(false);

  useEffect(()=>{
    const d=loadDailyLog(todayKey);
    if(d){setHours(d.hours||defHours);setLog(d.log||'');setScore(d.score||0);}
    setWeek(loadWeek());
  },[]);

  const setH=(i,f,v)=>setHours(h=>h.map((x,j)=>j===i?{...x,[f]:v}:x));
  const toggleDay=(day)=>{const u={...week,[day]:!week[day]};setWeek(u);saveWeek(u);};
  const isNow=(h)=>{const n=new Date().getHours();return n>=h&&n<h+1;};

  const handleSave=()=>{
    const isFirst=!loadDailyLog(todayKey);
    saveDailyLog(todayKey,{hours,log,score});
    const map={0:null,1:'mon',2:'tue',3:'wed',4:'thu',5:'fri',6:null};
    const name=map[wd]; if(name){const u={...week,[name]:true};setWeek(u);saveWeek(u);}
    if(isFirst&&hours.some(h=>h.done)){const n=streak+1;saveStreak(n);onStreakUpdate(n);}
    setSaved(true);setTimeout(()=>setSaved(false),2000);
  };

  const daysComplete=Object.values(week).filter(Boolean).length;
  const hoursComplete=hours.filter(h=>h.done).length;
  const todayStr=new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});

  const hourMeta=[
    {num:'01',title:'Coaching Call',hour:9},
    {num:'02',title:'Call Review',hour:10,cta:true},
    {num:'03',title:'Sales Genesis',hour:11,skill:true},
    {num:'04',title:todayDrill?todayDrill.name:"Today's Drill",hour:12,drill:true},
  ];

  return (
    <div style={{padding:'28px 24px',maxWidth:760}}>
      {/* Header */}
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:'Space Grotesk',fontWeight:900,fontSize:26,color:'#ede8da',letterSpacing:'-0.03em',lineHeight:1}}>Today</div>
        <div style={{fontSize:12,color:'#4a4550',marginTop:4,letterSpacing:'0.02em'}}>{todayStr}</div>
      </div>

      {/* Metric cards — Marko OS pattern */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
        <MetricCard label="Day Streak" value={streak} sub={streak>0?'Keep going':''} color={gold} pct={Math.min(streak*10,100)}/>
        <MetricCard label="Hours Done" value={`${hoursComplete}/4`} sub="Today" color={hoursComplete===4?green:gold} pct={hoursComplete*25}/>
        <MetricCard label="Week" value={`${daysComplete}/5`} sub="Days trained" color={green} pct={daysComplete*20}/>
        <MetricCard label="Tonality" value={score||'—'} sub={score>=7?'Sharp':score>=5?'Average':score>0?'Work needed':''} color={score>=7?green:score>=5?gold:score>0?red:gold}/>
      </div>

      {/* Week tracker */}
      <div style={{...card,marginBottom:16}}>
        {sectionHead('Week Tracker')}
        <div style={{display:'flex',gap:8}}>
          {DAYS.map((day,i)=>(
            <button key={day} onClick={()=>toggleDay(day)} style={{
              flex:1,aspectRatio:'1',display:'flex',alignItems:'center',justifyContent:'center',
              fontFamily:'Space Grotesk',fontWeight:800,fontSize:12,
              borderRadius:8, border:`1px solid ${week[day]?gold:'#1a1a26'}`,
              background:week[day]?'rgba(201,168,76,0.1)':'transparent',
              color:week[day]?gold:'#3a3835', cursor:'pointer',transition:'all 0.15s',
            }}>{DAY_LABELS[i]}</button>
          ))}
          {['S','S'].map((d,i)=>(
            <button key={i} disabled style={{
              flex:1,aspectRatio:'1',display:'flex',alignItems:'center',justifyContent:'center',
              fontFamily:'Space Grotesk',fontWeight:800,fontSize:12,borderRadius:8,
              border:'1px solid #111',background:'transparent',color:'#1a1a1a',cursor:'not-allowed',
            }}>{d}</button>
          ))}
        </div>
      </div>

      {/* Hour blocks */}
      {hourMeta.map((m,i)=>{
        const active=isNow(m.hour);
        return(
          <div key={i} style={{
            background:'linear-gradient(135deg,#0f0f18,#0c0c14)',
            border:`1px solid ${active?'rgba(201,168,76,0.35)':'rgba(201,168,76,0.08)'}`,
            borderRadius:12, padding:18, marginBottom:10,
            boxShadow:active?`0 0 24px rgba(201,168,76,0.08)`:'none',
            transition:'border-color 0.2s,box-shadow 0.2s',
          }}>
            <div style={{display:'flex',alignItems:'flex-start',gap:16}}>
              <div style={{
                fontFamily:'Space Grotesk',fontWeight:900,fontSize:20,
                color:active?gold:'#1e1c1a',lineHeight:1,flexShrink:0,marginTop:2,
                textShadow:active?`0 0 20px rgba(201,168,76,0.4)`:' none',
              }}>{m.num}</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                  <span style={{fontWeight:700,fontSize:14,color:'#ede8da'}}>{m.title}</span>
                  {active&&<span className="blink" style={{fontSize:9,fontWeight:700,color:gold,letterSpacing:'0.2em'}}>LIVE</span>}
                </div>
                {m.skill&&<div style={{fontSize:11,color:gold,marginBottom:4,opacity:0.7}}>↳ {(settings?.skillOfWeek||'Tonality').toUpperCase()}</div>}
                {m.drill&&todayDrill&&<div style={{fontSize:12,color:'#4a4550',lineHeight:1.6}}>{todayDrill.desc}</div>}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                {m.cta&&(
                  <button onClick={()=>onNavigate('calls')} style={{
                    fontSize:10,fontWeight:700,letterSpacing:'0.12em',padding:'5px 12px',
                    border:`1px solid rgba(201,168,76,0.3)`,borderRadius:6,
                    color:gold,background:'transparent',cursor:'pointer',
                  }}>CALLS →</button>
                )}
                <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                  <div onClick={()=>setH(i,'done',!hours[i].done)} style={{
                    width:20,height:20,borderRadius:'50%',border:`2px solid ${hours[i].done?gold:'#2a2826'}`,
                    background:hours[i].done?gold:'transparent',cursor:'pointer',
                    display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s',
                    boxShadow:hours[i].done?`0 0 10px rgba(201,168,76,0.4)`:' none',
                  }}>
                    {hours[i].done&&<span style={{fontSize:10,fontWeight:900,color:'#08080d',lineHeight:1}}>✓</span>}
                  </div>
                </label>
              </div>
            </div>
            <textarea value={hours[i].notes} onChange={e=>setH(i,'notes',e.target.value)}
              placeholder="Notes..." rows={2}
              style={{width:'100%',marginTop:12,padding:'10px 14px',fontSize:12,background:'#08080d',
                border:'1px solid #1a1a26',borderRadius:8,color:'#ede8da',lineHeight:1.6}}/>
          </div>
        );
      })}

      {/* Daily debrief */}
      <div style={{...card,marginTop:8}}>
        {sectionHead('Daily Debrief')}
        <textarea value={log} onChange={e=>setLog(e.target.value)}
          placeholder="One thing I'll do differently tomorrow..."
          rows={3} style={{width:'100%',padding:'12px 14px',fontSize:13,background:'#08080d',
            border:'1px solid #1a1a26',borderRadius:8,color:'#ede8da',lineHeight:1.7}}/>
      </div>

      {/* Tonality score */}
      <div style={card}>
        {sectionHead('Tonality Self-Score')}
        <div style={{display:'flex',gap:4}}>
          {Array.from({length:10},(_,i)=>i+1).map(n=>(
            <button key={n} onClick={()=>setScore(n)} style={{
              flex:1,padding:'10px 0',fontWeight:800,fontSize:12,borderRadius:6,
              border:`1px solid ${score===n?gold:'#1a1a26'}`,
              background:score===n?'rgba(201,168,76,0.12)':'transparent',
              color:score===n?gold:'#3a3835',cursor:'pointer',transition:'all 0.15s',
            }}>{n}</button>
          ))}
        </div>
        {score>0&&<div style={{marginTop:10,fontSize:11,fontWeight:700,
          color:score>=8?green:score>=6?gold:score>=4?'#d97706':red,letterSpacing:'0.1em'}}>
          {score>=8?'● ELITE':score>=6?'● SOLID':score>=4?'● AVERAGE':'● NEEDS WORK'}
        </div>}
      </div>

      {/* Save */}
      <button onClick={handleSave} style={{
        width:'100%',padding:'16px',fontFamily:'Space Grotesk',fontWeight:800,
        fontSize:12,letterSpacing:'0.2em',borderRadius:10,border:'none',cursor:'pointer',
        background:saved
          ?`linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.08))`
          :`linear-gradient(135deg,rgba(201,168,76,0.15),rgba(201,168,76,0.06))`,
        color:saved?green:gold,
        boxShadow:saved?`0 0 20px rgba(16,185,129,0.12)`:`0 0 20px rgba(201,168,76,0.08)`,
        border:`1px solid ${saved?'rgba(16,185,129,0.3)':'rgba(201,168,76,0.2)'}`,
        transition:'all 0.25s',
      }}>
        {saved?'✓ DAY LOCKED IN':'LOCK IN THE DAY'}
      </button>
    </div>
  );
}
