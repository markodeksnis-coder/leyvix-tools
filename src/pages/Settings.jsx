import { useState } from 'react';
import { saveSettings } from '../utils/storage.js';

const gold='#f59e0b', green='#10b981';
const SKILLS=['Tonality','Discovery','Objection Handling','Frame Control','Closing'];

const card={background:'#0f0f0f',border:'1px solid #1c1c1c',padding:20,marginBottom:12};
const lbl={fontFamily:'Space Grotesk',fontWeight:700,fontSize:10,letterSpacing:'0.2em',color:'#4a4a4a',display:'block',marginBottom:8};
const inp={width:'100%',padding:'11px 14px',fontSize:13,background:'#080808',border:'1px solid #1c1c1c',color:'#f0f0f0'};
const hint={fontSize:11,color:'#3a3a3a',marginTop:6,lineHeight:1.5};

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
    saveSettings(u); onSettingsChange(u); setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  return(
    <div style={{padding:'28px 24px',maxWidth:540}}>
      <div style={{marginBottom:28}}>
        <div style={{fontFamily:'Space Grotesk',fontWeight:900,fontSize:28,color:'#f0f0f0',letterSpacing:'-0.03em',lineHeight:1}}>SETTINGS</div>
        <div style={{fontFamily:'Space Grotesk',fontSize:12,color:'#4a4a4a',letterSpacing:'0.15em',marginTop:5}}>CONFIGURE YOUR SYSTEM</div>
      </div>

      <div style={card}>
        <span style={lbl}>FATHOM API KEY</span>
        <input type="password" value={fathomKey} onChange={e=>setFathomKey(e.target.value)} placeholder="fathom_..." style={inp}/>
        <p style={hint}>Pull calls automatically from your Fathom account.</p>
      </div>

      <div style={card}>
        <span style={lbl}>ANTHROPIC API KEY</span>
        <input type="password" value={anthropicKey} onChange={e=>setAnthropicKey(e.target.value)} placeholder="sk-ant-..." style={inp}/>
        <p style={hint}>Used for AI call analysis. Stored locally only — never sent anywhere else.</p>
      </div>

      <div style={card}>
        <span style={lbl}>SKILL OF THE WEEK</span>
        <select value={skill} onChange={e=>setSkill(e.target.value)} style={{...inp,cursor:'pointer'}}>
          {SKILLS.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <p style={hint}>Shown in Hour 3 — Sales Genesis Module.</p>
      </div>

      <div style={card}>
        <span style={lbl}>READING STACK</span>
        {reading.map((b,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
            <div style={{width:3,height:14,background:gold,flexShrink:0}}/>
            <span style={{flex:1,fontSize:13,color:'#c0c0c0'}}>{b}</span>
            <button onClick={()=>setReading(p=>p.filter((_,j)=>j!==i))} style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:9,letterSpacing:'0.1em',color:'#3a3a3a',background:'transparent',border:'none',cursor:'pointer'}}>REMOVE</button>
          </div>
        ))}
        <div style={{display:'flex',gap:8,marginTop:10}}>
          <input type="text" value={newBook} onChange={e=>setNewBook(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(setReading(p=>[...p,newBook.trim()]),setNewBook(''))} placeholder="Add a book..." style={inp}/>
          <button onClick={()=>{if(newBook.trim()){setReading(p=>[...p,newBook.trim()]);setNewBook('');}}} style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:9,letterSpacing:'0.15em',padding:'11px 16px',border:`1px solid ${gold}`,color:gold,background:'transparent',cursor:'pointer',flexShrink:0}}>ADD</button>
        </div>
      </div>

      <div style={card}>
        <span style={lbl}>CLOSERS TO STUDY</span>
        {closers.map((c,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
            <div style={{width:3,height:14,background:green,flexShrink:0}}/>
            <span style={{flex:1,fontSize:13,color:'#c0c0c0'}}>{c}</span>
            <button onClick={()=>setClosers(p=>p.filter((_,j)=>j!==i))} style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:9,letterSpacing:'0.1em',color:'#3a3a3a',background:'transparent',border:'none',cursor:'pointer'}}>REMOVE</button>
          </div>
        ))}
        <div style={{display:'flex',gap:8,marginTop:10}}>
          <input type="text" value={newCloser} onChange={e=>setNewCloser(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(setClosers(p=>[...p,newCloser.trim()]),setNewCloser(''))} placeholder="Add a closer..." style={inp}/>
          <button onClick={()=>{if(newCloser.trim()){setClosers(p=>[...p,newCloser.trim()]);setNewCloser('');}}} style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:9,letterSpacing:'0.15em',padding:'11px 16px',border:`1px solid ${green}`,color:green,background:'transparent',cursor:'pointer',flexShrink:0}}>ADD</button>
        </div>
      </div>

      <button onClick={save} style={{
        width:'100%',padding:17,fontFamily:'Space Grotesk',fontWeight:800,fontSize:12,letterSpacing:'0.25em',
        border:'1px solid', borderColor:saved?green:gold,
        background:saved?'rgba(16,185,129,0.1)':'rgba(245,158,11,0.1)',
        color:saved?green:gold, cursor:'pointer',transition:'all 0.2s',
      }}>{saved?'✓ SAVED':'SAVE SETTINGS'}</button>
    </div>
  );
}
