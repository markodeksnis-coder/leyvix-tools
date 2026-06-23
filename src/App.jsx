import { useState, useEffect } from 'react';
import Today from './pages/Today.jsx';
import Calls from './pages/Calls.jsx';
import Insights from './pages/Insights.jsx';
import Drills from './pages/Drills.jsx';
import Settings from './pages/Settings.jsx';
import { loadSettings, loadStreak } from './utils/storage.js';

const NAV = [
  { id: 'today',    label: 'TODAY',    icon: <TargetIcon /> },
  { id: 'calls',    label: 'CALLS',    icon: <PhoneIcon /> },
  { id: 'insights', label: 'INSIGHTS', icon: <TrendIcon /> },
  { id: 'drills',   label: 'DRILLS',   icon: <BoltIcon /> },
  { id: 'settings', label: 'SETTINGS', icon: <GearIcon /> },
];

function TargetIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
}
function PhoneIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
}
function TrendIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
}
function BoltIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
}
function GearIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}

export default function App() {
  const [page, setPage] = useState('today');
  const [streak, setStreak] = useState(0);
  const [settings, setSettings] = useState(() => loadSettings());

  useEffect(() => { setStreak(loadStreak()); }, []);

  const renderPage = () => {
    switch (page) {
      case 'today':    return <Today settings={settings} streak={streak} onStreakUpdate={setStreak} onNavigate={setPage} />;
      case 'calls':    return <Calls settings={settings} />;
      case 'insights': return <Insights />;
      case 'drills':   return <Drills />;
      case 'settings': return <Settings settings={settings} onSettingsChange={setSettings} />;
      default: return null;
    }
  };

  return (
    <div style={{ background: '#050505', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Streak bar */}
      <div
        className={streak > 0 ? 'streak-active' : ''}
        style={{
          background: streak > 0 ? 'rgba(245,158,11,0.07)' : '#0f0f0f',
          borderBottom: '1px solid #1c1c1c',
          padding: '11px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <span
          className={streak > 0 ? 'dot-blink' : ''}
          style={{ width: 7, height: 7, borderRadius: '50%', background: streak > 0 ? '#f59e0b' : '#2a2a2a', display: 'inline-block' }}
        />
        <span style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: 12, letterSpacing: '0.25em', color: streak > 0 ? '#f59e0b' : '#3a3a3a' }}>
          {streak > 0 ? `${streak} DAY STREAK` : 'NO ACTIVE STREAK'}
        </span>
        <span
          className={streak > 0 ? 'dot-blink' : ''}
          style={{ width: 7, height: 7, borderRadius: '50%', background: streak > 0 ? '#f59e0b' : '#2a2a2a', display: 'inline-block', animationDelay: '0.7s' }}
        />
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar — desktop */}
        <nav className="hidden md:flex" style={{ width: 210, background: '#0a0a0a', borderRight: '1px solid #1c1c1c', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '28px 20px 20px' }}>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 900, fontSize: 18, color: '#f59e0b', letterSpacing: '-0.02em', lineHeight: 1.1 }}>SALES GOD</div>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 900, fontSize: 18, color: '#f0f0f0', letterSpacing: '-0.02em', lineHeight: 1.1 }}>SYSTEM</div>
            <div style={{ width: 28, height: 2, background: '#f59e0b', marginTop: 10 }} />
          </div>
          <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV.map(item => {
              const active = page === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 14px',
                    fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 11, letterSpacing: '0.15em',
                    border: 'none',
                    background: active ? 'rgba(245,158,11,0.08)' : 'transparent',
                    color: active ? '#f59e0b' : '#4a4a4a',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    borderLeft: `2px solid ${active ? '#f59e0b' : 'transparent'}`,
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </div>
          <div style={{ padding: '16px 20px', borderTop: '1px solid #1c1c1c' }}>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: 9, color: '#2a2a2a', letterSpacing: '0.2em' }}>BUILT FOR MARKO</div>
          </div>
        </nav>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 72 }}>
          {renderPage()}
        </main>
      </div>

      {/* Bottom tabs — mobile */}
      <nav className="md:hidden" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#0a0a0a', borderTop: '1px solid #1c1c1c',
        display: 'flex', zIndex: 50,
      }}>
        {NAV.map(item => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '10px 4px', gap: 4,
              border: 'none', background: 'transparent',
              color: page === item.id ? '#f59e0b' : '#3a3a3a',
              cursor: 'pointer', transition: 'color 0.15s',
              borderTop: page === item.id ? '2px solid #f59e0b' : '2px solid transparent',
            }}
          >
            {item.icon}
            <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 8, letterSpacing: '0.12em' }}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
