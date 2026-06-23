import{useEffect,useState}from'react';

const gold='#c9a84c',goldLt='#e2c675',green='#10b981',red='#ef4444';
const SKILLS=['rapport','discovery','tonality','objection_handling','frame_control'];
const LABEL={rapport:'Rapport',discovery:'Discovery',tonality:'Tonality',objection_handling:'Obj. Handling',frame_control:'Frame Control'};
const TIP={rapport:'Lead with a genuine question. Build connection before anything else.',discovery:'Layer questions: What → Why → Impact → Priority. Never pitch without all four.',tonality:'Record yourself daily. Tonality is your close rate.',objection_handling:'Pause 2 seconds. Acknowledge, isolate, respond. Never defend.',frame_control:'Whoever holds the frame closes the deal.'};

function MetricCard({label,value,color=gold}){
  return(
    <div style={{background:'linear-gradient(135deg,#0f0f18,#0c0c14)',border:'1px solid rgba(201,168,76,0.1)',borderRadius:12,padding:'18px 20px'}}>
      <div style={{fontSize:9,fontWeight:700,color:'#5a5560',letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:8}}>{label}</div>
      <div style={{fontFamily:'Space Grotesk',fontWeight:900,fontSize:28,color,lineHeight:1,letterSpacing:'-0.03em'}}>{value}</div>
    </div>
  );
}

function SkillBar({label,value}){
  const c=value>=7?green:value>=5?gold:red;
  return(
    <div style={{marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
        <span style={{fontSize:12,fontWeight:600,color:'#7a7570'}}>{label}</span>
        <span style={{fontFamily:'Space Grotesk',fontWeight:800,fontSize:16,color:c}}>{value.toFixed(1)}</span>
      </div>
      <div style={{background:'#0a0a12',border:'1px solid #1a1a26',height:6,borderRadius:4}}>
        <div style={{width:`${value*10}%`,height:'100%',borderRadius:4,background:`linear-gradient(90deg,${c},${value>=7?'#34d399':value>=5?goldLt:'#f87171'})`,transition:'width 0.6s'}}/>
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
    const a=[];
    for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith('sgs_analyses_'))try{const x=JSON.parse(localStorage.getItem(k));if(x?.scores&&!x.error)a.push(x);}catch{}}
    setCount(a.length);if(!a.length)return;
    const sums=Object.fromEntries(SKILLS.map(k=>[k,0]));
    a.forEach(x=>SKILLS.forEach(k=>{sums[k]+=(x.scores[k]||0);}));
    const avg=Object.fromEntries(SKILLS.map(k=>[k,sums[k]/a.length]));
    setAvgs(avg);setLowest(SKILLS.reduce((x,y)=>(avg[x]||0)<(avg[y]||0)?x:y));
  },[]);

  const weak=SKILLS.filter(k=>(avgs[k]||0)<6);
  const best=SKILLS.reduce((x,y)=>(avgs[x]||0)>(avgs[y]||0)?x:y,SKILLS[0]);

  const card={background:'linear-gradient(135deg,#0f0f18,#0c0c14)',border:'1px solid rgba(201,168,76,0.1)',borderRadius:12,padding:20,marginBottom:12};
  const sHead=(l)=>(<div style={{fontSize:9,fontWeight:700,color:'#4a4550',letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:14,paddingBottom:10,borderBottom:'1px solid #15151f'}}>{l}</div>);

  return(
    <div style={{padding:'28px 24px',maxWidth:760}}>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:'Space Grotesk',fontWeight:900,fontSize:26,color:'#ede8da',letterSpacing:'-0.03em'}}>Insights</div>
        <div style={{fontSize:12,color:'#4a4550',marginTop:4}}>{count} call{count!==1?'s':''} analyzed</div>
      </div>

      {count===0?(
        <div style={{...card,padding:40,textAlign:'center'}}>
          <div style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:14,color:'#2e2c2a',marginBottom:6}}>No Data Yet</div>
          <div style={{fontSize:12,color:'#1e1c1a'}}>Analyze calls to build your performance profile.</div>
        </div>
      ):(
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
            <MetricCard label="Calls Analyzed" value={count} color={gold}/>
            <MetricCard label="Best Skill" value={count>0?LABEL[best]:'—'} color={green}/>
            <MetricCard label="Priority Fix" value={lowest?LABEL[lowest]:'—'} color={red}/>
          </div>

          <div style={card}>
            {sHead('Skill Averages')}
            {SKILLS.map(k=><SkillBar key={k} label={LABEL[k]} value={avgs[k]||0}/>)}
          </div>

          {weak.length>0&&(
            <div style={card}>
              {sHead('Patterns Detected')}
              {weak.map(k=>(
                <div key={k} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:8,background:'rgba(239,68,68,0.04)',border:'1px solid rgba(239,68,68,0.12)',marginBottom:8}}>
                  <div style={{width:3,height:36,background:red,borderRadius:2,flexShrink:0}}/>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,color:'#ede8da'}}>{LABEL[k]} needs work</div>
                    <div style={{fontSize:11,color:'#5a5560',marginTop:2}}>Avg {(avgs[k]||0).toFixed(1)}/10 — below threshold</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {lowest&&(
            <div style={{...card,border:'1px solid rgba(201,168,76,0.2)',background:'linear-gradient(135deg,rgba(201,168,76,0.05),rgba(201,168,76,0.02))',marginBottom:16}}>
              {sHead('Priority Fix This Week')}
              <div style={{fontFamily:'Space Grotesk',fontWeight:900,fontSize:20,color:gold,marginBottom:6}}>{LABEL[lowest]}</div>
              <div style={{fontSize:13,color:'#7a7570',lineHeight:1.7}}>{TIP[lowest]}</div>
            </div>
          )}
        </>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div style={{background:'linear-gradient(135deg,#0f0f18,#0c0c14)',border:'1px solid rgba(201,168,76,0.1)',borderRadius:12,padding:18}}>
          <div style={{fontSize:9,fontWeight:700,color:'#4a4550',letterSpacing:'0.2em',marginBottom:14,paddingBottom:10,borderBottom:'1px solid #15151f'}}>READING STACK</div>
          {reading.map((b,i)=>(
            <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:10}}>
              <div style={{width:2,height:14,background:gold,flexShrink:0,marginTop:3,borderRadius:2}}/>
              <span style={{fontSize:12,color:'#c0b8a8',lineHeight:1.4}}>{b}</span>
            </div>
          ))}
        </div>
        <div style={{background:'linear-gradient(135deg,#0f0f18,#0c0c14)',border:'1px solid rgba(201,168,76,0.1)',borderRadius:12,padding:18}}>
          <div style={{fontSize:9,fontWeight:700,color:'#4a4550',letterSpacing:'0.2em',marginBottom:14,paddingBottom:10,borderBottom:'1px solid #15151f'}}>CLOSERS TO STUDY</div>
          {closers.map((c,i)=>(
            <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:10}}>
              <div style={{width:2,height:14,background:green,flexShrink:0,marginTop:3,borderRadius:2}}/>
              <span style={{fontSize:12,color:'#c0b8a8'}}>{c}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
