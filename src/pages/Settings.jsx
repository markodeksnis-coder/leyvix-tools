import{useState}from'react';
import{saveSettings}from'../utils/storage.js';

const gold='#c9a84c',green='#10b981';
const SKILLS=['Tonality','Discovery','Objection Handling','Frame Control','Closing'];

const card={background:'linear-gradient(135deg,#0f0f18,#0c0c14)',border:'1px solid rgba(201,168,76,0.1)',borderRadius:12,padding:20,marginBottom:12};
const lbl={fontSize:9,fontWeight:700,color:'#5a5560',letterSpacing:'0.2em',display:'block',marginBottom:8,textTransform:'uppercase'};
const inp={width:'100%',padding:'12px 14px',fontSize:13,background:'#08080d',border:'1px solid #1a1a26',borderRadius:8,color:'#ede8da'};
const hint={fontSize:11,color:'#2e2c2a',marginTop:6,lineHeight:1.5};

export default function Settings({settings,onSettingsChange}){
  const [fathomKey,setFathomKey]=useState(settings?.fathomKey||'');
  const [anthropicKey,setAnthropicKey]=useState(settings?.anthropicKey||'');
  const [skill,setSkill]=useState(settings?.skillOfWeek||'Tonality');
  const [reading,setReading]=useState(settings?.readingStack||['Never Split the Difference','Influence','Way of the Wolf','Fanatical Prospecting']);
  const [closers,setClosers]=useState(settings?.closers||['Jeremy Miner','Andy Elliott','Alex Hormozi']);
  const [newBook,setNewBook]=useState('');
  const [newCloser,setNewCloser]=useState('');
  const [saved,setSaved]=useState(false);

  const save=()=>{
    const u={fathomKey,anthropicKey,skillOfWeek:skill,readingStack:reading,closers};
    saveSettings(u);onSettingsChange(u);setSaved(true);setTimeout(()=>setSaved(false),2000);
  };

  const sHead=(l)=>(
    <div style={{fontSize:9,fontWeight:700,color:'#4a4550',letterSpacing:'0.2em',textTransform:'uppercase',
      marginBottom:12,paddingBottom:10,borderBottom:'1px solid #15151f'}}>{l}</div>
  );

  return(
    <div style={{padding:'28px 24px',maxWidth:560}}>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:'Space Grotesk',fontWeight:900,fontSize:26,color:'#ede8da',letterSpacing:'-0.03em'}}>Settings</div>
        <div style={{fontSize:12,color:'#4a4550',marginTop:4}}>Configure your system</div>
      </div>

      <div style={card}>
        {sHead('Fathom API Key')}
        <input type="password" value={fathomKey} onChange={e=>setFathomKey(e.target.value)} placeholder="fathom_..." style={inp}/>
        <p style={hint}>Pulls calls automatically from your Fathom account.</p>
      </div>

      <div style={card}>
        {sHead('Anthropic API Key')}
        <input type="password" value={anthropicKey} onChange={e=>setAnthropicKey(e.target.value)} placeholder="sk-ant-..." style={inp}/>
        <p style={hint}>Used for AI call analysis. Stored locally only.</p>
      </div>

      <div style={card}>
        {sHead('Skill of the Week')}
        <select value={skill} onChange={e=>setSkill(e.target.value)} style={{...inp,cursor:'pointer'}}>
          {SKILLS.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <p style={hint}>Shown in Hour 3 — Sales Genesis module.</p>
      </div>

      <div style={card}>
        {sHead('Reading Stack')}
        {reading.map((b,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid #11111a'}}>
            <div style={{width:2,height:14,background:gold,borderRadius:2,flexShrink:0}}/>
            <span style={{flex:1,fontSize:13,color:'#c0b8a8'}}>{b}</span>
            <button onClick={()=>setReading(p=>p.filter((_,j)=>j!==i))} style={{fontSize:10,fontWeight:700,color:'#2e2c2a',background:'none',border:'none',cursor:'pointer',letterSpacing:'0.1em'}}>Remove</button>
          </div>
        ))}
        <div style={{display:'flex',gap:8,marginTop:12}}>
          <input type="text" value={newBook} onChange={e=>setNewBook(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&newBook.trim()&&(setReading(p=>[...p,newBook.trim()]),setNewBook(''))}
            placeholder="Add a book..." style={{...inp,flex:1}}/>
          <button onClick={()=>newBook.trim()&&(setReading(p=>[...p,newBook.trim()]),setNewBook(''))} style={{
            fontSize:10,fontWeight:700,letterSpacing:'0.12em',padding:'12px 18px',borderRadius:8,
            border:`1px solid rgba(201,168,76,0.3)`,color:gold,background:'rgba(201,168,76,0.06)',cursor:'pointer',flexShrink:0,
          }}>Add</button>
        </div>
      </div>

      <div style={card}>
        {sHead('Closers to Study')}
        {closers.map((c,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid #11111a'}}>
            <div style={{width:2,height:14,background:green,borderRadius:2,flexShrink:0}}/>
            <span style={{flex:1,fontSize:13,color:'#c0b8a8'}}>{c}</span>
            <button onClick={()=>setClosers(p=>p.filter((_,j)=>j!==i))} style={{fontSize:10,fontWeight:700,color:'#2e2c2a',background:'none',border:'none',cursor:'pointer',letterSpacing:'0.1em'}}>Remove</button>
          </div>
        ))}
        <div style={{display:'flex',gap:8,marginTop:12}}>
          <input type="text" value={newCloser} onChange={e=>setNewCloser(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&newCloser.trim()&&(setClosers(p=>[...p,newCloser.trim()]),setNewCloser(''))}
            placeholder="Add a closer..." style={{...inp,flex:1}}/>
          <button onClick={()=>newCloser.trim()&&(setClosers(p=>[...p,newCloser.trim()]),setNewCloser(''))} style={{
            fontSize:10,fontWeight:700,letterSpacing:'0.12em',padding:'12px 18px',borderRadius:8,
            border:`1px solid rgba(16,185,129,0.3)`,color:green,background:'rgba(16,185,129,0.06)',cursor:'pointer',flexShrink:0,
          }}>Add</button>
        </div>
      </div>

      <button onClick={save} style={{
        width:'100%',padding:16,fontFamily:'Space Grotesk',fontWeight:800,fontSize:12,letterSpacing:'0.2em',
        borderRadius:10,border:`1px solid ${saved?'rgba(16,185,129,0.3)':'rgba(201,168,76,0.25)'}`,
        background:saved?'rgba(16,185,129,0.08)':'rgba(201,168,76,0.06)',
        color:saved?green:gold,cursor:'pointer',transition:'all 0.2s',
      }}>{saved?'✓ Saved':'Save Settings'}</button>
    </div>
  );
}
