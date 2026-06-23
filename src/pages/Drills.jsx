import{useState,useEffect,useRef}from'react';
import{loadDrillLog,saveDrillLog,getDateStr}from'../utils/storage.js';

const gold='#c9a84c',goldLt='#e2c675',green='#10b981';

const DRILLS=[
  {day:1,label:'Monday',name:'Tonality',desc:'Record your opener in 5 emotional states: confident, curious, warm, urgent, detached. Play back and compare.'},
  {day:2,label:'Tuesday',name:'Psychology',desc:'Read one chapter from your reading stack. Extract one technique to steal.'},
  {day:3,label:'Wednesday',name:'Live Reps',desc:'Real cold calls only. No fake practice. Log how many you made.'},
  {day:4,label:'Thursday',name:'Breakdown',desc:'Pick one elite closer on YouTube. Dissect their structure sentence by sentence.'},
  {day:5,label:'Friday',name:'Weak Link Attack',desc:"Find your worst conversion point this week. Drill it for the full hour."},
];

const fmt=(s)=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const dateFor=(d)=>{const n=new Date(),x=new Date(n);x.setDate(n.getDate()+(d-n.getDay()));return getDateStr(x);};

function DrillCard({drill,isToday}){
  const dateStr=dateFor(drill.day);
  const [notes,setNotes]=useState('');
  const [done,setDone]=useState(false);
  const [minutes,setMinutes]=useState(60);
  const [timeLeft,setTimeLeft]=useState(3600);
  const [running,setRunning]=useState(false);
  const tmr=useRef(null);

  useEffect(()=>{
    const s=loadDrillLog(dateStr);
    if(s){setNotes(s.notes||'');setDone(s.done||false);const m=s.minutes||60;setMinutes(m);setTimeLeft(m*60);}
    return()=>clearInterval(tmr.current);
  },[dateStr]);

  const persist=(o={})=>saveDrillLog(dateStr,{notes,done,minutes,...o});
  const startPause=()=>{
    if(running){clearInterval(tmr.current);setRunning(false);}
    else{if(timeLeft===0)return;tmr.current=setInterval(()=>setTimeLeft(t=>{if(t<=1){clearInterval(tmr.current);setRunning(false);return 0;}return t-1;}),1000);setRunning(true);}
  };
  const reset=()=>{clearInterval(tmr.current);setRunning(false);setTimeLeft(minutes*60);};
  const setMin=(m)=>{clearInterval(tmr.current);setRunning(false);setMinutes(m);setTimeLeft(m*60);persist({minutes:m});};
  const toggleDone=()=>{const n=!done;setDone(n);persist({done:n});};

  const pct=minutes>0?((minutes*60-timeLeft)/(minutes*60))*100:0;
  const complete=timeLeft===0;
  const borderColor=isToday?'rgba(201,168,76,0.3)':done?'rgba(16,185,129,0.2)':'rgba(201,168,76,0.07)';

  return(
    <div style={{
      background:'linear-gradient(135deg,#0f0f18,#0c0c14)',
      border:`1px solid ${borderColor}`,borderRadius:12,marginBottom:10,overflow:'hidden',
      boxShadow:isToday?'0 4px 28px rgba(0,0,0,0.5)':'none',
      transition:'border-color 0.2s,box-shadow 0.2s',
    }}>
      {/* Progress bar */}
      <div style={{height:2,background:'#0a0a12'}}>
        <div style={{height:'100%',width:`${pct}%`,
          background:complete?green:running?`linear-gradient(90deg,${gold},${goldLt})`:gold,
          transition:running?'width 1s linear':'width 0.3s',borderRadius:2}}/>
      </div>

      <div style={{padding:20}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:16}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:isToday?gold:'#3a3835',letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:4}}>
              {drill.label}{isToday?' — Today':''}
            </div>
            <div style={{fontFamily:'Space Grotesk',fontWeight:900,fontSize:19,color:done?green:'#ede8da',letterSpacing:'-0.02em'}}>{drill.name}</div>
            <div style={{fontSize:12,color:'#5a5560',marginTop:5,lineHeight:1.6,maxWidth:460}}>{drill.desc}</div>
          </div>
          <button onClick={toggleDone} style={{
            fontSize:10,fontWeight:700,letterSpacing:'0.12em',padding:'8px 14px',borderRadius:8,
            border:`1px solid ${done?green:'#1a1a26'}`,
            background:done?'rgba(16,185,129,0.08)':'transparent',
            color:done?green:'#3a3835',cursor:'pointer',transition:'all 0.15s',flexShrink:0,
          }}>{done?'✓ Done':'Mark Done'}</button>
        </div>

        {/* Timer */}
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14,padding:'14px 16px',background:'#08080d',borderRadius:8,border:'1px solid #15151f'}}>
          <div style={{
            fontFamily:'Space Grotesk',fontWeight:900,fontSize:30,lineHeight:1,
            color:complete?green:running?gold:'#ede8da',
            textShadow:running?`0 0 20px rgba(201,168,76,0.3)`:'none',
            transition:'color 0.3s,text-shadow 0.3s',minWidth:95,letterSpacing:'0.04em',
          }}>{fmt(timeLeft)}</div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={startPause} style={{
              fontSize:10,fontWeight:700,letterSpacing:'0.12em',padding:'8px 16px',borderRadius:8,
              border:`1px solid ${running?'rgba(201,168,76,0.4)':'rgba(201,168,76,0.25)'}`,
              background:running?'rgba(201,168,76,0.1)':'transparent',
              color:gold,cursor:'pointer',transition:'all 0.15s',
            }}>{running?'⏸ Pause':'▶ Start'}</button>
            <button onClick={reset} style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',padding:'8px 12px',borderRadius:8,border:'1px solid #1a1a26',color:'#3a3835',background:'transparent',cursor:'pointer'}}>Reset</button>
          </div>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:10,color:'#3a3835'}}>min</span>
            <select value={minutes} onChange={e=>setMin(Number(e.target.value))}
              style={{background:'#0d0d16',border:'1px solid #1a1a26',color:'#c0b8a8',padding:'6px 10px',fontSize:11,borderRadius:6}}>
              {[15,30,45,60,90].map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <textarea value={notes} onChange={e=>setNotes(e.target.value)} onBlur={()=>persist()}
          placeholder="Notes from this drill..."
          rows={2}
          style={{width:'100%',padding:'10px 14px',fontSize:12,background:'#08080d',
            border:'1px solid #1a1a26',borderRadius:8,color:'#ede8da',lineHeight:1.6}}/>
      </div>
    </div>
  );
}

export default function Drills(){
  const today=new Date().getDay();
  return(
    <div style={{padding:'28px 24px',maxWidth:720}}>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:'Space Grotesk',fontWeight:900,fontSize:26,color:'#ede8da',letterSpacing:'-0.03em'}}>Drills</div>
        <div style={{fontSize:12,color:'#4a4550',marginTop:4}}>Weekly protocol — no shortcuts</div>
      </div>
      {DRILLS.map(d=><DrillCard key={d.day} drill={d} isToday={d.day===today}/>)}
    </div>
  );
}
