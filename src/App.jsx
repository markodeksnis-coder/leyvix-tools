import { useState, useEffect } from 'react';
import Today from './pages/Today.jsx';
import Calls from './pages/Calls.jsx';
import Insights from './pages/Insights.jsx';
import Drills from './pages/Drills.jsx';
import Settings from './pages/Settings.jsx';
import { loadSettings, loadStreak } from './utils/storage.js';

const NAV = [
  { id:'today',    label:'Today',    sub:'Training Dashboard' },
  { id:'calls',    label:'Calls',    sub:'Call Library' },
  { id:'insights', label:'Insights', sub:'Performance Data' },
  { id:'drills',   label:'Drills',   sub:'Weekly Protocol' },
  { id:'settings', label:'Settings', sub:'Configuration' },
];

const gold = '#c9a84c';

export default function App() {
  const [page, setPage] = useState('today');
  const [streak, setStreak] = useState(0);
  const [settings, setSettings] = useState(() => loadSettings());

  useEffect(() => { setStreak(loadStreak()); }, []);

  const renderPage = () => {
    switch(page) {
      case 'today':    return <Today settings={settings} streak={streak} onStreakUpdate={setStreak} onNavigate={setPage} />;
      case 'calls':    return <Calls settings={settings} />;
      case 'insights': return <Insights />;
      case 'drills':   return <Drills />;
      case 'settings': return <Settings settings={settings} onSettingsChange={setSettings} />;
      default: return null;
    }
  };

  return (
    <div style={{ background:'#08080d', minHeight:'100vh', display:'flex', flexDirection:'column' }}>

      {/* Streak ribbon */}
      <div
        className={streak > 0 ? 'streak-active' : ''}
        style={{
          background: streak > 0 ? 'rgba(201,168,76,0.05)' : '#0d0d14',
          borderBottom: `1px solid ${streak > 0 ? 'rgba(201,168,76,0.2)' : '#1a1a26'}`,
          padding: '9px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          position: 'sticky', top: 0, zIndex: 100,
          backdropFilter: 'blur(10px)',
        }}
      >
        <span className={streak > 0 ? 'blink' : ''}
          style={{ width:6, height:6, borderRadius:'50%', background: streak>0 ? gold : '#2a2825', display:'inline-block' }}/>
        <span style={{ fontFamily:'Space Grotesk', fontWeight:700, fontSize:11, letterSpacing:'0.25em',
          color: streak>0 ? gold : '#3a3835',
          background: streak>0 ? `linear-gradient(90deg, #c9a84c, #e2c675, #c9a84c)` : 'none',
          WebkitBackgroundClip: streak>0 ? 'text' : 'none',
          WebkitTextFillColor: streak>0 ? 'transparent' : '#3a3835',
        }}>
          {streak > 0 ? `${streak} DAY STREAK` : 'NO ACTIVE STREAK'}
        </span>
        <span className={streak > 0 ? 'blink' : ''} style={{ animationDelay:'0.8s',
          width:6, height:6, borderRadius:'50%', background: streak>0 ? gold : '#2a2825', display:'inline-block' }}/>
      </div>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* Sidebar — desktop */}
        <nav className="hidden md:flex" style={{
          width: 220, flexShrink: 0, flexDirection:'column',
          background: 'linear-gradient(180deg, #0b0b15 0%, #09090f 100%)',
          borderRight: '1px solid #15151f',
        }}>
          {/* Brand */}
          <div style={{ padding:'28px 22px 24px' }}>
            <div style={{
              fontFamily:'Space Grotesk', fontWeight:900, fontSize:17, lineHeight:1.15,
              background: 'linear-gradient(135deg, #e2c675 0%, #c9a84c 50%, #a8893a 100%)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              letterSpacing:'-0.02em',
            }}>SALES GOD<br />SYSTEM</div>
            <div style={{ width:32, height:1, background:'linear-gradient(90deg,#c9a84c,transparent)', marginTop:12 }}/>
          </div>

          {/* Nav */}
          <div style={{ flex:1, padding:'4px 12px', display:'flex', flexDirection:'column', gap:2 }}>
            {NAV.map(item => {
              const active = page === item.id;
              return (
                <button key={item.id} onClick={() => setPage(item.id)}
                  style={{
                    display:'flex', flexDirection:'column', alignItems:'flex-start',
                    padding: '10px 12px', border:'none', borderRadius:8,
                    background: active ? 'rgba(201,168,76,0.06)' : 'transparent',
                    borderLeft: `2px solid ${active ? gold : 'transparent'}`,
                    cursor:'pointer', textAlign:'left', transition:'all 0.15s',
                  }}
                >
                  <span style={{ fontSize:13, fontWeight:700, color: active ? gold : '#5a5660', letterSpacing:'-0.01em', lineHeight:1.2 }}>{item.label}</span>
                  <span style={{ fontSize:10, color: active ? 'rgba(201,168,76,0.5)' : '#2e2c30', marginTop:1 }}>{item.sub}</span>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ padding:'16px 22px', borderTop:'1px solid #13131e' }}>
            <div style={{ fontSize:9, fontWeight:700, color:'#2a2828', letterSpacing:'0.2em', textTransform:'uppercase' }}>Built for Marko</div>
          </div>
        </nav>

        {/* Main */}
        <main style={{ flex:1, overflowY:'auto', paddingBottom:72 }}>
          {renderPage()}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden" style={{
        position:'fixed', bottom:0, left:0, right:0,
        background:'rgba(10,10,18,0.95)', backdropFilter:'blur(12px)',
        borderTop:'1px solid #1a1a26', display:'flex', zIndex:50,
      }}>
        {NAV.map(item => (
          <button key={item.id} onClick={() => setPage(item.id)}
            style={{
              flex:1, display:'flex', flexDirection:'column', alignItems:'center',
              padding:'10px 4px', gap:3, border:'none', background:'transparent',
              color: page===item.id ? gold : '#3a3835',
              borderTop: `2px solid ${page===item.id ? gold : 'transparent'}`,
              transition:'all 0.15s', cursor:'pointer',
            }}
          >
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'-0.01em' }}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
