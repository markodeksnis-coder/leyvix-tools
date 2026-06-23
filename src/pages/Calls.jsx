import { useState, useEffect } from 'react';
import { loadAnalysis, saveAnalysis } from '../utils/storage.js';

const gold='#c9a84c', goldLt='#e2c675', green='#10b981', red='#ef4444';

const SYSTEM_PROMPT = `You are a brutal, honest sales coach analyzing a real sales call. Return JSON only. No preamble.

{
  "wrong": [
    { "issue": "...", "fix": "..." },
    { "issue": "...", "fix": "..." },
    { "issue": "...", "fix": "..." }
  ],
  "right": { "what": "...", "why": "..." },
  "scores": {
    "rapport": 0,
    "discovery": 0,
    "tonality": 0,
    "objection_handling": 0,
    "frame_control": 0
  },
  "drill_this_week": "..."
}`;

const detectType=(t='')=>(/(coaching|roleplay|genesis|training)/i.test(t)?'Coaching':'Prospect');
const fmtDur=(s)=>{if(!s)return'';const m=Math.floor(s/60);return`${m}m`;};

function ScoreBar({label,value}){
  const c=value>=7?green:value>=5?gold:red;
  return(
    <div style={{marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
        <span style={{fontSize:10,fontWeight:600,color:'#4a4550',letterSpacing:'0.1em'}}>{label}</span>
        <span style={{fontFamily:'Space Grotesk',fontWeight:800,fontSize:13,color:c}}>{value}</span>
      </div>
      <div style={{background:'#0a0a12',height:4,borderRadius:4,border:'1px solid #1a1a26'}}>
        <div style={{width:`${value*10}%`,height:'100%',borderRadius:4,background:`linear-gradient(90deg,${c},${value>=7?'#34d399':value>=5?goldLt:'#f87171'})`,transition:'width 0.4s'}}/>
      </div>
    </div>
  );
}

function AnalysisPanel({analysis}){
  if(analysis.error) return<p style={{padding:'16px 20px',fontSize:13,color:red}}>Error: {analysis.error}</p>;
  return(
    <div style={{padding:'20px',borderTop:'1px solid #15151f',display:'flex',flexDirection:'column',gap:18}}>
      <div>
        <div style={{fontSize:9,fontWeight:700,color:red,letterSpacing:'0.2em',marginBottom:10}}>WHAT WENT WRONG</div>
        {(analysis.wrong||[]).map((w,i)=>(
          <div key={i} style={{borderLeft:`2px solid ${red}`,paddingLeft:12,marginBottom:10,paddingTop:2}}>
            <div style={{fontWeight:600,fontSize:13,color:'#ede8da',marginBottom:3}}>{w.issue}</div>
            <div style={{fontSize:12,color:'#5a5560',lineHeight:1.5}}>Fix: {w.fix}</div>
          </div>
        ))}
      </div>
      {analysis.right&&(
        <div>
          <div style={{fontSize:9,fontWeight:700,color:green,letterSpacing:'0.2em',marginBottom:10}}>WHAT WENT RIGHT</div>
          <div style={{borderLeft:`2px solid ${green}`,paddingLeft:12,paddingTop:2}}>
            <div style={{fontWeight:600,fontSize:13,color:'#ede8da',marginBottom:3}}>{analysis.right.what}</div>
            <div style={{fontSize:12,color:'#5a5560',lineHeight:1.5}}>{analysis.right.why}</div>
          </div>
        </div>
      )}
      {analysis.scores&&(
        <div>
          <div style={{fontSize:9,fontWeight:700,color:'#4a4550',letterSpacing:'0.2em',marginBottom:12}}>SKILL BREAKDOWN</div>
          <ScoreBar label="RAPPORT" value={analysis.scores.rapport||0}/>
          <ScoreBar label="DISCOVERY" value={analysis.scores.discovery||0}/>
          <ScoreBar label="TONALITY" value={analysis.scores.tonality||0}/>
          <ScoreBar label="OBJ. HANDLING" value={analysis.scores.objection_handling||0}/>
          <ScoreBar label="FRAME CONTROL" value={analysis.scores.frame_control||0}/>
        </div>
      )}
      {analysis.drill_this_week&&(
        <div style={{background:'rgba(201,168,76,0.05)',border:`1px solid rgba(201,168,76,0.2)`,borderRadius:8,padding:'14px 16px'}}>
          <div style={{fontSize:9,fontWeight:700,color:gold,letterSpacing:'0.2em',marginBottom:6}}>DRILL THIS WEEK</div>
          <div style={{fontSize:13,color:'#ede8da',lineHeight:1.6}}>{analysis.drill_this_week}</div>
        </div>
      )}
    </div>
  );
}

export default function Calls({settings}){
  const [calls,setCalls]=useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [filter,setFilter]=useState('All');
  const [analyzing,setAnalyzing]=useState({});
  const [analyses,setAnalyses]=useState({});
  const [expanded,setExpanded]=useState(null);

  const fetchCalls=async()=>{
    if(!settings?.fathomKey){setError('Add your Fathom API key in Settings.');return;}
    setLoading(true);setError('');
    try{
      const r=await fetch('https://api.fathom.video/v1/calls?limit=30',{headers:{Authorization:`Bearer ${settings.fathomKey}`}});
      if(!r.ok)throw new Error(`Fathom ${r.status}`);
      const d=await r.json();
      setCalls(d.calls||d.data||(Array.isArray(d)?d:[]));
    }catch(e){setError(e.message);}finally{setLoading(false);}
  };

  useEffect(()=>{
    const c={};
    for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith('sgs_analyses_'))try{c[k.replace('sgs_analyses_','')]=JSON.parse(localStorage.getItem(k));}catch{}}
    setAnalyses(c);fetchCalls();
  },[settings?.fathomKey]);

  const analyze=async(call)=>{
    const id=String(call.id||call.call_id);
    if(!settings?.anthropicKey){alert('Add your Anthropic API key in Settings.');return;}
    const cached=loadAnalysis(id);
    if(cached){setAnalyses(p=>({...p,[id]:cached}));setExpanded(p=>p===id?null:id);return;}
    setAnalyzing(p=>({...p,[id]:true}));setExpanded(id);
    try{
      let tx='';
      try{
        const r=await fetch(`https://api.fathom.video/v1/calls/${id}/transcript`,{headers:{Authorization:`Bearer ${settings.fathomKey}`}});
        if(r.ok){const d=await r.json();if(typeof d==='string')tx=d;else if(Array.isArray(d))tx=d.map(t=>`${t.speaker||''}:${t.text||t.content||''}`).join('\n');else if(d.transcript)tx=typeof d.transcript==='string'?d.transcript:JSON.stringify(d.transcript);}
      }catch{}
      if(!tx)tx=`Call: ${call.title||call.name||'Untitled'}. No transcript.`;
      const ai=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'x-api-key':settings.anthropicKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true','content-type':'application/json'},
        body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1024,system:SYSTEM_PROMPT,messages:[{role:'user',content:`Analyze this call. Return ONLY JSON:\n\n${tx.slice(0,8000)}`}]}),
      });
      if(!ai.ok){const e=await ai.json().catch(()=>({}));throw new Error(e.error?.message||`Anthropic ${ai.status}`);}
      const data=await ai.json();
      const match=(data.content?.[0]?.text||'{}').match(/\{[\s\S]*\}/);
      if(!match)throw new Error('No JSON in response');
      const result=JSON.parse(match[0]);
      saveAnalysis(id,result);setAnalyses(p=>({...p,[id]:result}));
    }catch(e){
      const err={error:e.message};saveAnalysis(id,err);setAnalyses(p=>({...p,[id]:err}));
    }finally{setAnalyzing(p=>({...p,[id]:false}));}
  };

  const sorted=[...calls]
    .filter(c=>filter==='All'||detectType(c.title||c.name)===filter)
    .sort((a,b)=>new Date(b.started_at||b.date||0)-new Date(a.started_at||a.date||0));

  const pillStyle=(active)=>({
    fontSize:11,fontWeight:700,letterSpacing:'0.12em',padding:'7px 16px',
    border:`1px solid ${active?gold:'#1a1a26'}`,borderRadius:20,
    background:active?'rgba(201,168,76,0.1)':'transparent',
    color:active?gold:'#3a3835',cursor:'pointer',transition:'all 0.15s',
  });

  return(
    <div style={{padding:'28px 24px',maxWidth:760}}>
      <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <div style={{fontFamily:'Space Grotesk',fontWeight:900,fontSize:26,color:'#ede8da',letterSpacing:'-0.03em'}}>Call Library</div>
          <div style={{fontSize:12,color:'#4a4550',marginTop:4}}>{calls.length} calls loaded</div>
        </div>
        <button onClick={fetchCalls} style={pillStyle(false)}>Refresh</button>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:20}}>
        {['All','Prospect','Coaching'].map(f=><button key={f} onClick={()=>setFilter(f)} style={pillStyle(filter===f)}>{f}</button>)}
      </div>

      {loading&&(
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'18px 20px',background:'linear-gradient(135deg,#0f0f18,#0c0c14)',border:'1px solid rgba(201,168,76,0.1)',borderRadius:12,marginBottom:16}}>
          <div style={{width:14,height:14,border:`2px solid ${gold}`,borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
          <span style={{color:'#4a4550',fontSize:13}}>Fetching calls...</span>
        </div>
      )}
      {error&&(
        <div style={{padding:'14px 18px',background:'rgba(239,68,68,0.05)',border:`1px solid rgba(239,68,68,0.2)`,borderLeft:`3px solid ${red}`,borderRadius:8,marginBottom:16}}>
          <p style={{fontSize:13,color:red}}>{error}</p>
        </div>
      )}
      {!loading&&!error&&sorted.length===0&&(
        <div style={{padding:40,background:'linear-gradient(135deg,#0f0f18,#0c0c14)',border:'1px solid rgba(201,168,76,0.08)',borderRadius:12,textAlign:'center'}}>
          <p style={{color:'#3a3835',fontSize:13}}>No calls found. Add your Fathom API key in Settings.</p>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {sorted.map(call=>{
          const id=String(call.id||call.call_id);
          const type=detectType(call.title||call.name);
          const analysis=analyses[id];
          const isOpen=expanded===id;
          const date=call.started_at||call.date;
          const title=call.title||call.name||call.meeting_title||'Untitled Call';
          return(
            <div key={id} style={{
              background:'linear-gradient(135deg,#0f0f18,#0c0c14)',
              border:`1px solid ${isOpen?'rgba(201,168,76,0.3)':'rgba(201,168,76,0.08)'}`,
              borderRadius:12,overflow:'hidden',transition:'border-color 0.2s',
              boxShadow:isOpen?'0 4px 24px rgba(0,0,0,0.4)':'none',
            }}>
              <div style={{padding:'16px 20px',display:'flex',alignItems:'center',gap:14}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
                    <span style={{fontSize:9,fontWeight:700,letterSpacing:'0.15em',padding:'2px 9px',borderRadius:20,
                      background:type==='Prospect'?'rgba(201,168,76,0.1)':'#111118',
                      color:type==='Prospect'?gold:'#4a4550'}}>{type.toUpperCase()}</span>
                    {date&&<span style={{fontSize:11,color:'#3a3835'}}>{new Date(date).toLocaleDateString()}</span>}
                    {call.duration&&<span style={{fontSize:11,color:'#3a3835'}}>{fmtDur(call.duration)}</span>}
                    {analysis&&!analysis.error&&<span style={{fontSize:9,fontWeight:700,color:green,letterSpacing:'0.12em'}}>✓ ANALYZED</span>}
                  </div>
                  <div style={{fontWeight:700,fontSize:14,color:'#ede8da',lineHeight:1.3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{title}</div>
                </div>
                <div style={{display:'flex',gap:6,flexShrink:0}}>
                  <a href={`https://fathom.video/calls/${id}`} target="_blank" rel="noopener noreferrer"
                    style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',padding:'7px 13px',border:'1px solid #1a1a26',borderRadius:8,color:'#4a4550',textDecoration:'none'}}>Open</a>
                  <button onClick={()=>analyze(call)} disabled={analyzing[id]} style={{
                    fontSize:10,fontWeight:700,letterSpacing:'0.1em',padding:'7px 14px',borderRadius:8,
                    border:`1px solid ${isOpen&&analysis?'rgba(201,168,76,0.4)':'rgba(201,168,76,0.25)'}`,
                    background:isOpen&&analysis?'rgba(201,168,76,0.1)':'transparent',
                    color:analyzing[id]?'#4a4550':gold,cursor:analyzing[id]?'not-allowed':'pointer',
                    display:'flex',alignItems:'center',gap:5,
                  }}>
                    {analyzing[id]?(<><span style={{width:10,height:10,border:`1.5px solid ${gold}`,borderTopColor:'transparent',borderRadius:'50%',display:'inline-block',animation:'spin 0.8s linear infinite'}}/>Analyzing</>)
                      :analysis?'View Analysis':'Analyze AI'}
                  </button>
                </div>
              </div>
              {isOpen&&analysis&&<AnalysisPanel analysis={analysis}/>}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
