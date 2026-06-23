import { useState, useEffect } from 'react';
import { loadAnalysis, saveAnalysis } from '../utils/storage.js';

const gold = '#f59e0b';
const green = '#10b981';
const red = '#ef4444';

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

const detectType = (title = '') => {
  const l = title.toLowerCase();
  return (l.includes('coaching')||l.includes('roleplay')||l.includes('genesis')||l.includes('training')) ? 'Coaching' : 'Prospect';
};

const fmtDuration = (s) => { if (!s) return ''; const m = Math.floor(s/60); return `${m}m`; };

function ScoreBar({ label, value }) {
  const color = value>=7 ? green : value>=5 ? gold : red;
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontFamily:'Space Grotesk', fontSize:10, color:'#4a4a4a', letterSpacing:'0.1em' }}>{label}</span>
        <span style={{ fontFamily:'Space Grotesk', fontWeight:800, fontSize:12, color }}>{value}</span>
      </div>
      <div style={{ background:'#080808', height:4, border:'1px solid #1c1c1c' }}>
        <div style={{ width:`${value*10}%`, height:'100%', background:color, transition:'width 0.4s' }} />
      </div>
    </div>
  );
}

function AnalysisPanel({ analysis }) {
  if (analysis.error) return <p style={{ fontSize:13, color:red, padding:'12px 20px' }}>Error: {analysis.error}</p>;
  return (
    <div style={{ padding:20, borderTop:'1px solid #1c1c1c', display:'flex', flexDirection:'column', gap:18 }}>
      <div>
        <div style={{ fontFamily:'Space Grotesk', fontWeight:700, fontSize:9, color:red, letterSpacing:'0.2em', marginBottom:10 }}>WHAT WENT WRONG</div>
        {(analysis.wrong||[]).map((w,i) => (
          <div key={i} style={{ borderLeft:`2px solid ${red}`, paddingLeft:12, marginBottom:10 }}>
            <div style={{ fontFamily:'Space Grotesk', fontWeight:600, fontSize:13, color:'#f0f0f0' }}>{w.issue}</div>
            <div style={{ fontSize:12, color:'#5a5a5a', marginTop:3 }}>FIX: {w.fix}</div>
          </div>
        ))}
      </div>
      {analysis.right && (
        <div>
          <div style={{ fontFamily:'Space Grotesk', fontWeight:700, fontSize:9, color:green, letterSpacing:'0.2em', marginBottom:10 }}>WHAT WENT RIGHT</div>
          <div style={{ borderLeft:`2px solid ${green}`, paddingLeft:12 }}>
            <div style={{ fontFamily:'Space Grotesk', fontWeight:600, fontSize:13, color:'#f0f0f0' }}>{analysis.right.what}</div>
            <div style={{ fontSize:12, color:'#5a5a5a', marginTop:3 }}>{analysis.right.why}</div>
          </div>
        </div>
      )}
      {analysis.scores && (
        <div>
          <div style={{ fontFamily:'Space Grotesk', fontWeight:700, fontSize:9, color:'#4a4a4a', letterSpacing:'0.2em', marginBottom:12 }}>SKILL BREAKDOWN</div>
          <ScoreBar label="RAPPORT" value={analysis.scores.rapport||0} />
          <ScoreBar label="DISCOVERY" value={analysis.scores.discovery||0} />
          <ScoreBar label="TONALITY" value={analysis.scores.tonality||0} />
          <ScoreBar label="OBJ. HANDLING" value={analysis.scores.objection_handling||0} />
          <ScoreBar label="FRAME CONTROL" value={analysis.scores.frame_control||0} />
        </div>
      )}
      {analysis.drill_this_week && (
        <div style={{ background:'#080808', border:`1px solid ${gold}`, borderLeft:`3px solid ${gold}`, padding:14 }}>
          <div style={{ fontFamily:'Space Grotesk', fontWeight:700, fontSize:9, color:gold, letterSpacing:'0.2em', marginBottom:5 }}>DRILL THIS WEEK</div>
          <div style={{ fontSize:13, color:'#f0f0f0', lineHeight:1.5 }}>{analysis.drill_this_week}</div>
        </div>
      )}
    </div>
  );
}

export default function Calls({ settings }) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [analyzing, setAnalyzing] = useState({});
  const [analyses, setAnalyses] = useState({});
  const [expanded, setExpanded] = useState(null);

  const fetchCalls = async () => {
    if (!settings?.fathomKey) { setError('Add your Fathom API key in Settings.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('https://api.fathom.video/v1/calls?limit=30', {
        headers: { Authorization: `Bearer ${settings.fathomKey}` },
      });
      if (!res.ok) throw new Error(`Fathom ${res.status}`);
      const data = await res.json();
      setCalls(data.calls || data.data || (Array.isArray(data) ? data : []));
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const cached = {};
    for (let i=0;i<localStorage.length;i++) {
      const k=localStorage.key(i);
      if(k?.startsWith('sgs_analyses_')) try { cached[k.replace('sgs_analyses_','')] = JSON.parse(localStorage.getItem(k)); } catch{}
    }
    setAnalyses(cached);
    fetchCalls();
  }, [settings?.fathomKey]);

  const analyzeCall = async (call) => {
    const callId = String(call.id||call.call_id);
    if (!settings?.anthropicKey) { alert('Add your Anthropic API key in Settings.'); return; }
    const cached = loadAnalysis(callId);
    if (cached) { setAnalyses(p=>({...p,[callId]:cached})); setExpanded(p=>p===callId?null:callId); return; }
    setAnalyzing(p=>({...p,[callId]:true})); setExpanded(callId);
    try {
      let transcript='';
      try {
        const tx = await fetch(`https://api.fathom.video/v1/calls/${callId}/transcript`,{headers:{Authorization:`Bearer ${settings.fathomKey}`}});
        if(tx.ok){
          const d=await tx.json();
          if(typeof d==='string') transcript=d;
          else if(Array.isArray(d)) transcript=d.map(t=>`${t.speaker||''}:${t.text||t.content||''}`).join('\n');
          else if(d.transcript) transcript=typeof d.transcript==='string'?d.transcript:JSON.stringify(d.transcript);
        }
      } catch{}
      if(!transcript) transcript=`Call: ${call.title||call.name||'Untitled'}. No transcript available.`;
      const ai = await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'x-api-key':settings.anthropicKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true','content-type':'application/json'},
        body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1024,system:SYSTEM_PROMPT,messages:[{role:'user',content:`Analyze this call transcript. Return ONLY JSON:\n\n${transcript.slice(0,8000)}`}]}),
      });
      if(!ai.ok){const e=await ai.json().catch(()=>({}));throw new Error(e.error?.message||`Anthropic ${ai.status}`);}
      const aiData=await ai.json();
      const text=aiData.content?.[0]?.text||'{}';
      const match=text.match(/\{[\s\S]*\}/);
      if(!match) throw new Error('No JSON in response');
      const result=JSON.parse(match[0]);
      saveAnalysis(callId,result);
      setAnalyses(p=>({...p,[callId]:result}));
    } catch(e) {
      const err={error:e.message}; saveAnalysis(callId,err); setAnalyses(p=>({...p,[callId]:err}));
    } finally { setAnalyzing(p=>({...p,[callId]:false})); }
  };

  const sorted=[...calls]
    .filter(c=>filter==='All'||detectType(c.title||c.name)===filter)
    .sort((a,b)=>new Date(b.started_at||b.date||0)-new Date(a.started_at||a.date||0));

  const pill=(label, active)=>({
    fontFamily:'Space Grotesk', fontWeight:700, fontSize:10, letterSpacing:'0.15em',
    padding:'7px 16px', border:'1px solid', cursor:'pointer', transition:'all 0.15s',
    borderColor: active?gold:'#1c1c1c',
    background: active?'rgba(245,158,11,0.1)':'transparent',
    color: active?gold:'#3a3a3a',
  });

  return (
    <div style={{ padding:'28px 24px', maxWidth:740 }}>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <div style={{ fontFamily:'Space Grotesk', fontWeight:900, fontSize:28, color:'#f0f0f0', letterSpacing:'-0.03em', lineHeight:1 }}>CALL LIBRARY</div>
          <div style={{ fontFamily:'Space Grotesk', fontSize:12, color:'#4a4a4a', letterSpacing:'0.15em', marginTop:5 }}>{calls.length} CALLS LOADED</div>
        </div>
        <button onClick={fetchCalls} style={{ fontFamily:'Space Grotesk', fontWeight:700, fontSize:10, letterSpacing:'0.15em', padding:'8px 16px', border:`1px solid ${gold}`, color:gold, background:'transparent', cursor:'pointer' }}>↺ REFRESH</button>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:20 }}>
        {['All','Prospect','Coaching'].map(f=><button key={f} onClick={()=>setFilter(f)} style={pill(f,filter===f)}>{f.toUpperCase()}</button>)}
      </div>

      {loading && (
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:20, background:'#0f0f0f', border:'1px solid #1c1c1c', marginBottom:16 }}>
          <div style={{ width:14,height:14,border:`2px solid ${gold}`,borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite' }}/>
          <span style={{ color:'#4a4a4a', fontSize:13 }}>Fetching calls from Fathom...</span>
        </div>
      )}
      {error && <div style={{ padding:16, background:'#0f0f0f', border:`1px solid ${red}`, borderLeft:`3px solid ${red}`, marginBottom:16 }}><p style={{ fontSize:13, color:red }}>{error}</p></div>}
      {!loading&&!error&&sorted.length===0&&(
        <div style={{ padding:32, background:'#0f0f0f', border:'1px solid #1c1c1c', textAlign:'center' }}>
          <p style={{ color:'#4a4a4a', fontSize:13 }}>No calls found. Add your Fathom API key in Settings.</p>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {sorted.map(call=>{
          const callId=String(call.id||call.call_id);
          const type=detectType(call.title||call.name);
          const analysis=analyses[callId];
          const isAnalyzing=analyzing[callId];
          const isExpanded=expanded===callId;
          const date=call.started_at||call.date;
          const title=call.title||call.name||call.meeting_title||'Untitled Call';
          return (
            <div key={callId} style={{ background:'#0f0f0f', border:`1px solid ${isExpanded?gold:'#1c1c1c'}`, transition:'border-color 0.2s' }}>
              <div style={{ padding:'16px 20px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                      <span style={{ fontFamily:'Space Grotesk', fontWeight:700, fontSize:9, letterSpacing:'0.15em', padding:'2px 8px', background: type==='Prospect'?'rgba(245,158,11,0.1)':'#1a1a1a', color:type==='Prospect'?gold:'#4a4a4a' }}>{type.toUpperCase()}</span>
                      {date&&<span style={{ fontSize:11, color:'#3a3a3a' }}>{new Date(date).toLocaleDateString()}</span>}
                      {call.duration&&<span style={{ fontSize:11, color:'#3a3a3a' }}>{fmtDuration(call.duration)}</span>}
                      {analysis&&!analysis.error&&<span style={{ fontSize:9, color:green, fontFamily:'Space Grotesk', fontWeight:700, letterSpacing:'0.15em' }}>✓ ANALYZED</span>}
                    </div>
                    <div style={{ fontFamily:'Space Grotesk', fontWeight:700, fontSize:14, color:'#f0f0f0', lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{title}</div>
                  </div>
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    <a href={`https://fathom.video/calls/${callId}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily:'Space Grotesk', fontWeight:700, fontSize:9, letterSpacing:'0.1em', padding:'7px 12px', border:'1px solid #1c1c1c', color:'#4a4a4a', textDecoration:'none' }}>OPEN</a>
                    <button onClick={()=>analyzeCall(call)} disabled={isAnalyzing} style={{
                      fontFamily:'Space Grotesk', fontWeight:700, fontSize:9, letterSpacing:'0.1em',
                      padding:'7px 14px', border:`1px solid ${gold}`, color:isAnalyzing?'#4a4a4a':gold,
                      background: isExpanded&&analysis?'rgba(245,158,11,0.1)':'transparent',
                      cursor:isAnalyzing?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:5,
                    }}>
                      {isAnalyzing?(<><span style={{width:10,height:10,border:'1.5px solid #4a4a4a',borderTopColor:'transparent',borderRadius:'50%',display:'inline-block',animation:'spin 0.8s linear infinite'}}/>ANALYZING</>):analysis?'VIEW':'ANALYZE AI'}
                    </button>
                  </div>
                </div>
              </div>
              {isExpanded&&analysis&&<AnalysisPanel analysis={analysis}/>}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
