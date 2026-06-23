import { useEffect, useState } from 'react';

const SKILLS = ['rapport', 'discovery', 'tonality', 'objection_handling', 'frame_control'];
const SKILL_LABEL = {
  rapport: 'RAPPORT',
  discovery: 'DISCOVERY',
  tonality: 'TONALITY',
  objection_handling: 'OBJ. HANDLING',
  frame_control: 'FRAME CONTROL',
};
const DRILL_TIP = {
  rapport: 'Lead with a genuine question about their situation. Build connection before pitching.',
  discovery: 'Layer your questions: What → Why → Impact → Priority. Never pitch without all 4.',
  tonality: 'Record yourself daily in 5 states. Your tonality is your close rate.',
  objection_handling: 'Pause 2 seconds after objections. Acknowledge, isolate, then respond.',
  frame_control: 'Whoever controls the frame controls the call. Practice re-taking the frame.',
};

function SkillBar({ label, value }) {
  const color = value >= 7 ? '#22c55e' : value >= 5 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 10, color: '#737373', letterSpacing: '0.12em' }}>{label}</span>
        <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 12, color: '#f5f5f5' }}>{value.toFixed(1)}</span>
      </div>
      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', height: 10 }}>
        <div style={{ width: `${value * 10}%`, height: '100%', background: color, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

export default function Insights() {
  const [averages, setAverages] = useState({});
  const [count, setCount] = useState(0);
  const [lowest, setLowest] = useState(null);
  const [readingStack, setReadingStack] = useState(['Never Split the Difference', 'Influence', 'Way of the Wolf', 'Fanatical Prospecting']);
  const [closers, setClosers] = useState(['Jeremy Miner', 'Andy Elliott', 'Alex Hormozi']);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('sgs_settings') || '{}');
      if (s.readingStack?.length) setReadingStack(s.readingStack);
      if (s.closers?.length) setClosers(s.closers);
    } catch {}

    const analyses = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('sgs_analyses_')) {
        try {
          const a = JSON.parse(localStorage.getItem(k));
          if (a?.scores && !a.error) analyses.push(a);
        } catch {}
      }
    }
    setCount(analyses.length);
    if (!analyses.length) return;

    const sums = Object.fromEntries(SKILLS.map(k => [k, 0]));
    analyses.forEach(a => SKILLS.forEach(k => { sums[k] += (a.scores[k] || 0); }));
    const avgs = Object.fromEntries(SKILLS.map(k => [k, sums[k] / analyses.length]));
    setAverages(avgs);

    const lo = SKILLS.reduce((a, b) => (avgs[a] || 0) < (avgs[b] || 0) ? a : b);
    setLowest(lo);
  }, []);

  const weakSkills = SKILLS.filter(k => (averages[k] || 0) < 6);

  return (
    <div style={{ padding: '24px 20px', maxWidth: 680 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: 24, color: '#f5f5f5', letterSpacing: '-0.02em', marginBottom: 4 }}>INSIGHTS</h1>
        <p style={{ color: '#737373', fontSize: 13 }}>{count} call{count !== 1 ? 's' : ''} analyzed</p>
      </div>

      {count === 0 ? (
        <div style={{ padding: 24, background: '#111111', border: '1px solid #1a1a1a', textAlign: 'center', marginBottom: 20 }}>
          <p style={{ color: '#737373', fontSize: 13 }}>No analyzed calls yet. Go to Calls → hit Analyze on a call.</p>
        </div>
      ) : (
        <>
          <div style={{ background: '#111111', border: '1px solid #1a1a1a', padding: 16, marginBottom: 16 }}>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 10, color: '#737373', letterSpacing: '0.15em', marginBottom: 14 }}>AVERAGE SKILL SCORES</div>
            {SKILLS.map(k => <SkillBar key={k} label={SKILL_LABEL[k]} value={averages[k] || 0} />)}
          </div>

          {weakSkills.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 10, color: '#737373', letterSpacing: '0.15em', marginBottom: 10 }}>PATTERNS DETECTED</div>
              {weakSkills.map(k => (
                <div key={k} style={{ background: '#111111', borderLeft: '2px solid #ef4444', borderTop: '1px solid #1a1a1a', borderRight: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a', padding: 12, marginBottom: 8 }}>
                  <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 13, color: '#f5f5f5' }}>{SKILL_LABEL[k]} NEEDS WORK</div>
                  <div style={{ fontSize: 12, color: '#737373', marginTop: 3 }}>Avg: {(averages[k] || 0).toFixed(1)}/10 — below 6.0 threshold</div>
                </div>
              ))}
            </div>
          )}

          {lowest && (
            <div style={{ background: '#111111', border: '1px solid #ef4444', padding: 16, marginBottom: 16, boxShadow: '0 0 20px rgba(239,68,68,0.08)' }}>
              <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 10, color: '#ef4444', letterSpacing: '0.15em', marginBottom: 6 }}>PRIORITY FIX THIS WEEK</div>
              <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 16, color: '#f5f5f5', marginBottom: 6 }}>{SKILL_LABEL[lowest]}</div>
              <div style={{ fontSize: 13, color: '#737373' }}>{DRILL_TIP[lowest]}</div>
            </div>
          )}
        </>
      )}

      {/* Reading stack */}
      <div style={{ background: '#111111', border: '1px solid #1a1a1a', padding: 16, marginBottom: 12 }}>
        <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 10, color: '#737373', letterSpacing: '0.15em', marginBottom: 12 }}>READING STACK</div>
        {readingStack.map((book, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 3, height: 14, background: '#ef4444', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#f5f5f5' }}>{book}</span>
          </div>
        ))}
      </div>

      {/* Closers */}
      <div style={{ background: '#111111', border: '1px solid #1a1a1a', padding: 16 }}>
        <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 10, color: '#737373', letterSpacing: '0.15em', marginBottom: 12 }}>CLOSERS TO STUDY</div>
        {closers.map((closer, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 3, height: 14, background: '#22c55e', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#f5f5f5' }}>{closer}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
