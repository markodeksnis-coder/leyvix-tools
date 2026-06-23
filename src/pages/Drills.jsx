import { useState, useEffect, useRef } from 'react';
import { loadDrillLog, saveDrillLog, getDateStr } from '../utils/storage.js';

const gold='#f59e0b', green='#10b981';

const DRILLS=[
  {day:1,label:'MON',name:'TONALITY',desc:'Record your opener in 5 emotional states: confident, curious, warm, urgent, detached. Play back and compare.'},
  {day:2,label:'TUE',name:'PSYCHOLOGY',desc:'Read one chapter from your reading stack. Extract one technique to steal.'},
  {day:3,label:'WED',name:'LIVE REPS',desc:'Real cold calls only. No fake practice. Log how many you made.'},
  {day:4,label:'THU',name:'BREAKDOWN',desc:'Pick one elite closer on YouTube. Dissect their structure sentence by sentence.'},
  {day:5,label:'FRI',name:'WEAK LINK ATTACK',desc:"Look at your week's data. Find your worst conversion point. Drill it for the full hour."},
];

const fmt=(s)=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

const dateForDay=(targetDay)=>{
  const now=new Date(), diff=targetDay-now.getDay(), d=new Date(now);
  d.setDate(now.getDate()+diff); return getDateStr(d);
};

function DrillCard({drill,isToday}){
  const dateStr=dateForDay(drill.day);
  const [notes,setNotes]=useState('');
  const [done,setDone]=useState(false);
  const [minutes,setMinutes]=useState(60);
  const [timeLeft,setTimeLeft]=useState(3600);
  const [running,setRunning]=useState(false);
  const timer=useRef(null);

  useEffect(()=>{
    const s=loadDrillLog(dateStr);
    if(s){setNotes(s.notes||'');setDone(s.done||false);const m=s.minutes||60;setMinutes(m);setTimeLeft(m*60);}
    return()=>clearInterval(timer.current);
  },[dateStr]);

  const persist=(o={})=>saveDrillLog(dateStr,{notes,done,minutes,...o});

  const startPause=()=>{
    if(running){clearInterval(timer.current);setRunning(false);}
    else{
      if(timeLeft===0)return;
      timer.current=setInterval(()=>setTimeLeft(t=>{if(t<=1){clearInterval(timer.current);setRunning(false);return 0;}return t-1;}),1000);
      setRunning(true);
    }
  };

  const reset=()=>{clearInterval(timer.current);setRunning(false);setTimeLeft(minutes*60);};
  const setMin=(m)=>{clearInterval(timer.current);setRunning(false);setMinutes(m);setTimeLeft(m*60);persist({minutes:m});};
  const toggleDone=()=>{const n=!done;setDone(n);persist({done:n});};

  const pct=minutes>0?((minutes*60-timeLeft)/(minutes*60))*100:0;
  const complete=timeLeft===0;

  return(
    <div style={{background:'#0f0f0f',border:`1px solid ${isToday?gold:'#1c1c1c'}`,boxShadow:isToday?`0 0 20px rgba(245,158,11,0.07)`:'none',marginBottom:12,transition:'border-color 0.2s'}}>
      {/* Progress */}
      <div style={{height:2,background:'#080808'}}>
        <div style={{height:'100%',width:`${pct}%`,background:complete?green:gold,transition:running?'width 1s linear':'width 0.3s'}}/>
      </div>

      <div style={{padding:20}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:16}}>
          <div>
            <div style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:10,color:isToday?gold:'#3a3a3a',letterSpacing:'0.2em',marginBottom:4}}>
              {drill.label}{isToday?' — TODAY':''}
            </div>
            <div style={{fontFamily:'Space Grotesk',fontWeight:900,fontSize:18,color:done?green:'#f0f0f0',letterSpacing:'-0.01em'}}>
              {drill.name}
            </div>
            <div style={{fontSize:12,color:'#4a4a4a',marginTop:5,lineHeight:1.6,maxWidth:480}}>{drill.desc}</div>
          </div>
          <button onClick={toggleDone} style={{
            fontFamily:'Space Grotesk',fontWeight:700,fontSize:9,letterSpacing:'0.15em',
            padding:'8px 14px',border:'1px solid',cursor:'pointer',transition:'all 0.15s',flexShrink:0,
            borderColor:done?green:'#1c1c1c',
            background:done?'rgba(16,185,129,0.1)':'transparent',
            color:done?green:'#3a3a3a',
          }}>{done?'✓ COMPLETE':'MARK DONE'}</button>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
          <div style={{fontFamily:'Space Grotesk',fontWeight:900,fontSize:30,color:complete?green:running?gold:'#f0f0f0',letterSpacing:'0.04em',minWidth:95,transition:'color 0.3s'}}>
            {fmt(timeLeft)}
          </div>
          <button onClick={startPause} style={{
            fontFamily:'Space Grotesk',fontWeight:700,fontSize:9,letterSpacing:'0.15em',
            padding:'9px 18px',border:'1px solid',cursor:'pointer',transition:'all 0.15s',
            borderColor:running?'#f59e0b':gold,
            background:running?'rgba(245,158,11,0.15)':'rgba(245,158,11,0.08)',
            color:gold,
          }}>{running?'⏸ PAUSE':'▶ START'}</button>
          <button onClick={reset} style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:9,letterSpacing:'0.15em',padding:'9px 14px',border:'1px solid #1c1c1c',color:'#3a3a3a',background:'transparent',cursor:'pointer'}}>RESET</button>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontFamily:'Space Grotesk',fontSize:9,color:'#3a3a3a',letterSpacing:'0.1em'}}>MIN</span>
            <select value={minutes} onChange={e=>setMin(Number(e.target.value))}
              style={{background:'#080808',border:'1px solid #1c1c1c',color:'#f0f0f0',padding:'5px 8px',fontSize:11,fontFamily:'Space Grotesk'}}>
              {[15,30,45,60,90].map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <textarea value={notes} onChange={e=>setNotes(e.target.value)} onBlur={()=>persist()}
          placeholder="Notes from this drill..."
          rows={2}
          style={{width:'100%',padding:'10px 14px',fontSize:12,background:'#080808',border:'1px solid #1c1c1c',color:'#f0f0f0',lineHeight:1.6}}/>
      </div>
    </div>
  );
}

export default function Drills(){
  const today=new Date().getDay();
  return(
    <div style={{padding:'28px 24px',maxWidth:700}}>
      <div style={{marginBottom:28}}>
        <div style={{fontFamily:'Space Grotesk',fontWeight:900,fontSize:28,color:'#f0f0f0',letterSpacing:'-0.03em',lineHeight:1}}>DRILLS</div>
        <div style={{fontFamily:'Space Grotesk',fontSize:12,color:'#4a4a4a',letterSpacing:'0.15em',marginTop:5}}>WEEKLY PROTOCOL — NO SHORTCUTS</div>
      </div>
      {DRILLS.map(d=><DrillCard key={d.day} drill={d} isToday={d.day===today}/>)}
    </div>
  );
}
