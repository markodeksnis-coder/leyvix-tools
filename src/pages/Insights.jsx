import { useEffect, useState } from 'react';

const gold='#f59e0b', green='#10b981', red='#ef4444';
const SKILLS=['rapport','discovery','tonality','objection_handling','frame_control'];
const LABEL={rapport:'RAPPORT',discovery:'DISCOVERY',tonality:'TONALITY',objection_handling:'OBJ. HANDLING',frame_control:'FRAME CONTROL'};
const TIP={
  rapport:'Lead with a genuine question about their situation. Build real connection before anything else.',
  discovery:'Layer questions: What → Why → Impact → Priority. Never pitch without all 4.',
  tonality:'Record yourself daily in 5 states. Tonality IS your close rate.',
  objection_handling:'Pause 2 seconds. Acknowledge, isolate, respond. Never defend.',
  frame_control:'Whoever holds the frame, closes the deal. Practice re-taking it.',
};

function SkillBar({label,value}){
  const color=value>=7?green:value>=5?gold:red;
  return(
    <div style={{marginBottom:14}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
        <span style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:10,color:'#4a4a4a',letterSpacing:'0.15em'}}>{label}</span>
        <span style={{fontFamily:'Space Grotesk',fontWeight:800,fontSize:14,color}}>{value.toFixed(1)}</span>
      </div>
      <div style={{background:'#080808',border:'1px solid #1c1c1c',height:8}}>
        <div style={{width:`${value*10}%`,height:'100%',background:color,transition:'width 0.5s'}}/>
      </div>
    </div>
  );
}

export default function Insights(){
  const [avgs,setAvgs]=useState({});
  const [count,setCount]=useState(0);
  const [lowest,setLowest]=useState(null);
  const [reading,setReading]=useState(['Never Split the Difference','Influence','Way of the Wolf','Fanatical Prospecting']);
  const [closers,setClosers]=useState(['Jeremy Miner','Andy Elliott','Alex Hormozi']);

  useEffect(()=>{
    try{const s=JSON.parse(localStorage.getItem('sgs_settings')||'{}');if(s.readingStack?.length)setReading(s.readingStack);if(s.closers?.length)setClosers(s.closers);}catch{}
    const analyses=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k?.startsWith('sgs_analyses_'))try{const a=JSON.parse(localStorage.getItem(k));if(a?.scores&&!a.error)analyses.push(a);}catch{}
    }
    setCount(analyses.length);
    if(!analyses.length)return;
    const sums=Object.fromEntries(SKILLS.map(k=>[k,0]));
    analyses.forEach(a=>SKILLS.forEach(k=>{sums[k]+=(a.scores[k]||0);}));
    const a=Object.fromEntries(SKILLS.map(k=>[k,sums[k]/analyses.length]));
    setAvgs(a);
    setLowest(SKILLS.reduce((x,y)=>(a[x]||0)<(a[y]||0)?x:y));
  },[]);

  const weak=SKILLS.filter(k=>(avgs[k]||0)<6);

  return(
    <div style={{padding:'28px 24px',maxWidth:700}}>
      <div style={{marginBottom:28}}>
        <div style={{fontFamily:'Space Grotesk',fontWeight:900,fontSize:28,color:'#f0f0f0',letterSpacing:'-0.03em',lineHeight:1}}>INSIGHTS</div>
        <div style={{fontFamily:'Space Grotesk',fontSize:12,color:'#4a4a4a',letterSpacing:'0.15em',marginTop:5}}>{count} CALL{count!==1?'S':''} ANALYZED</div>
      </div>

      {count===0?(
        <div style={{padding:32,background:'#0f0f0f',border:'1px solid #1c1c1c',textAlign:'center',marginBottom:20}}>
          <div style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:13,color:'#3a3a3a'}}>NO DATA YET</div>
          <div style={{fontSize:12,color:'#2a2a2a',marginTop:6}}>Analyze calls to start building your insights.</div>
        </div>
      ):(
        <>
          <div style={{background:'#0f0f0f',border:'1px solid #1c1c1c',padding:20,marginBottom:14}}>
            <div style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:10,color:'#4a4a4a',letterSpacing:'0.2em',marginBottom:16}}>SKILL AVERAGES</div>
            {SKILLS.map(k=><SkillBar key={k} label={LABEL[k]} value={avgs[k]||0}/>)}
          </div>

          {weak.length>0&&(
            <div style={{marginBottom:14}}>
              <div style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:10,color:'#4a4a4a',letterSpacing:'0.2em',marginBottom:10}}>PATTERNS DETECTED</div>
              {weak.map(k=>(
                <div key={k} style={{background:'#0f0f0f',borderLeft:`3px solid ${red}`,border:`1px solid #1c1c1c`,borderLeft:`3px solid ${red}`,padding:'12px 16px',marginBottom:8}}>
                  <div style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:13,color:'#f0f0f0'}}>{LABEL[k]} NEEDS WORK</div>
                  <div style={{fontSize:11,color:'#4a4a4a',marginTop:2}}>Avg {(avgs[k]||0).toFixed(1)}/10 — below 6.0</div>
                </div>
              ))}
            </div>
          )}

          {lowest&&(
            <div style={{background:'#0f0f0f',border:`1px solid ${gold}`,borderLeft:`3px solid ${gold}`,padding:20,marginBottom:14,boxShadow:`0 0 24px rgba(245,158,11,0.06)`}}>
              <div style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:9,color:gold,letterSpacing:'0.2em',marginBottom:6}}>PRIORITY FIX THIS WEEK</div>
              <div style={{fontFamily:'Space Grotesk',fontWeight:800,fontSize:18,color:'#f0f0f0',marginBottom:6}}>{LABEL[lowest]}</div>
              <div style={{fontSize:13,color:'#5a5a5a',lineHeight:1.6}}>{TIP[lowest]}</div>
            </div>
          )}
        </>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:8}}>
        <div style={{background:'#0f0f0f',border:'1px solid #1c1c1c',padding:18}}>
          <div style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:9,color:'#4a4a4a',letterSpacing:'0.2em',marginBottom:14}}>READING STACK</div>
          {reading.map((b,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <div style={{width:3,height:14,background:gold,flexShrink:0}}/>
              <span style={{fontSize:12,color:'#c0c0c0',lineHeight:1.4}}>{b}</span>
            </div>
          ))}
        </div>
        <div style={{background:'#0f0f0f',border:'1px solid #1c1c1c',padding:18}}>
          <div style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:9,color:'#4a4a4a',letterSpacing:'0.2em',marginBottom:14}}>CLOSERS TO STUDY</div>
          {closers.map((c,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <div style={{width:3,height:14,background:green,flexShrink:0}}/>
              <span style={{fontSize:12,color:'#c0c0c0'}}>{c}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
