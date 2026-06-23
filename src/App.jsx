import { useState, useEffect } from 'react';
import Today from './pages/Today.jsx';
import Calls from './pages/Calls.jsx';
import Insights from './pages/Insights.jsx';
import Drills from './pages/Drills.jsx';
import Settings from './pages/Settings.jsx';
import { loadSettings, loadStreak } from './utils/storage.js';

const NAV = [
  { id: 'today',    label: 'TODAY',    icon: <BoltIcon /> },
  { id: 'calls',    label: 'CALLS',    icon: <PhoneIcon /> },
  { id: 'insights', label: 'INSIGHTS', icon: <ChartIcon /> },
  { id: 'drills',   label: 'DRILLS',   icon: <FireIcon /> },
  { id: 'settings', label: 'SETTINGS', icon: <GearIcon /> },
];

function BoltIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
}
function PhoneIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
}
function ChartIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
}
function FireIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>;
}
function GearIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}

export default function App() {
  const [page, setPage] = useState('today');
  const [streak, setStreak] = useState(0);
  const [settings, setSettings] = useState(() => loadSettings());

  useEffect(() => {
    setStreak(loadStreak());
  }, []);

  const handleSettingsChange = (s) => setSettings(s);
  const handleStreakUpdate = (n) => setStreak(n);

  const renderPage = () => {
    switch (page) {
      case 'today':    return <Today settings={settings} streak={streak} onStreakUpdate={handleStreakUpdate} onNavigate={setPage} />;
      case 'calls':    return <Calls settings={settings} />;
      case 'insights': return <Insights />;
      case 'drills':   return <Drills />;
      case 'settings': return <Settings settings={settings} onSettingsChange={handleSettingsChange} />;
      default:         return null;
    }
  };

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Streak bar */}
      <div
        className={streak > 0 ? 'streak-active' : ''}
        style={{
          background: streak > 0 ? 'rgba(239,68,68,0.12)' : '#111111',
          borderBottom: '1px solid #1a1a1a',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <span className={streak > 0 ? 'dot-pulse' : ''} style={{ width: 8, height: 8, borderRadius: '50%', background: streak > 0 ? '#ef4444' : '#333', display: 'inline-block' }} />
        <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 13, letterSpacing: '0.15em', color: streak > 0 ? '#ef4444' : '#737373' }}>
          {streak > 0 ? `${streak} DAY STREAK` : 'START YOUR STREAK'}
        </span>
        <span className={streak > 0 ? 'dot-pulse' : ''} style={{ width: 8, height: 8, borderRadius: '50%', background: streak > 0 ? '#ef4444' : '#333', display: 'inline-block', animationDelay: '0.6s' }} />
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar — desktop only */}
        <nav style={{ width: 200, background: '#111111', borderRight: '1px solid #1a1a1a', display: 'none', flexDirection: 'column', flexShrink: 0 }} className="hidden md:flex">
          <div style={{ padding: '24px 16px 16px' }}>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: 11, letterSpacing: '0.2em', color: '#ef4444', lineHeight: 1.3 }}>
              SALES GOD<br />SYSTEM
            </div>
          </div>
          <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV.map(item => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  fontFamily: 'Space Grotesk',
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: '0.12em',
                  border: 'none',
                  borderLeft: page === item.id ? '2px solid #ef4444' : '2px solid transparent',
                  background: page === item.id ? '#1a1a1a' : 'transparent',
                  color: page === item.id ? '#ef4444' : '#737373',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  boxShadow: page === item.id ? '0 0 8px rgba(239,68,68,0.15)' : 'none',
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
          {renderPage()}
        </main>
      </div>

      {/* Bottom tab bar — mobile only */}
      <nav className="md:hidden" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#111111',
        borderTop: '1px solid #1a1a1a',
        display: 'flex',
        zIndex: 50,
      }}>
        {NAV.map(item => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 4px',
              gap: 3,
              border: 'none',
              background: 'transparent',
              color: page === item.id ? '#ef4444' : '#737373',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            {item.icon}
            <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 9, letterSpacing: '0.1em' }}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
