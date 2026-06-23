import { useState, useEffect } from 'react';
import { loadAnalysis, saveAnalysis } from '../utils/storage.js';

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
  return (l.includes('coaching') || l.includes('roleplay') || l.includes('genesis') || l.includes('training'))
    ? 'Coaching' : 'Prospect';
};

const fmtDuration = (s) => {
  if (!s) return '';
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
};

function ScoreBar({ label, value }) {
  const color = value >= 7 ? '#22c55e' : value >= 5 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ fontFamily: 'Space Grotesk', fontSize: 10, color: '#737373', width: 110, letterSpacing: '0.08em', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, background: '#0a0a0a', height: 6, border: '1px solid #1a1a1a' }}>
        <div style={{ width: `${value * 10}%`, height: '100%', background: color, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 12, color: '#f5f5f5', width: 20, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function AnalysisPanel({ analysis }) {
  if (analysis.error) {
    return <p style={{ fontSize: 13, color: '#ef4444', padding: '12px 16px' }}>Error: {analysis.error}</p>;
  }
  return (
    <div style={{ padding: '16px', borderTop: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Wrong */}
      <div>
        <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 10, color: '#ef4444', letterSpacing: '0.15em', marginBottom: 8 }}>WHAT WENT WRONG</div>
        {(analysis.wrong || []).map((w, i) => (
          <div key={i} style={{ borderLeft: '2px solid #ef4444', paddingLeft: 10, marginBottom: 8 }}>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: 13, color: '#f5f5f5' }}>{w.issue}</div>
            <div style={{ fontSize: 12, color: '#737373', marginTop: 2 }}>FIX: {w.fix}</div>
          </div>
        ))}
      </div>
      {/* Right */}
      {analysis.right && (
        <div>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 10, color: '#22c55e', letterSpacing: '0.15em', marginBottom: 8 }}>WHAT WENT RIGHT</div>
          <div style={{ borderLeft: '2px solid #22c55e', paddingLeft: 10 }}>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: 13, color: '#f5f5f5' }}>{analysis.right.what}</div>
            <div style={{ fontSize: 12, color: '#737373', marginTop: 2 }}>{analysis.right.why}</div>
          </div>
        </div>
      )}
      {/* Scores */}
      {analysis.scores && (
        <div>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 10, color: '#737373', letterSpacing: '0.15em', marginBottom: 10 }}>SKILL SCORES</div>
          <ScoreBar label="RAPPORT" value={analysis.scores.rapport || 0} />
          <ScoreBar label="DISCOVERY" value={analysis.scores.discovery || 0} />
          <ScoreBar label="TONALITY" value={analysis.scores.tonality || 0} />
          <ScoreBar label="OBJ. HANDLING" value={analysis.scores.objection_handling || 0} />
          <ScoreBar label="FRAME CONTROL" value={analysis.scores.frame_control || 0} />
        </div>
      )}
      {/* Drill */}
      {analysis.drill_this_week && (
        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', padding: 12 }}>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 10, color: '#ef4444', letterSpacing: '0.12em', marginBottom: 4 }}>DRILL THIS WEEK</div>
          <div style={{ fontSize: 13, color: '#f5f5f5' }}>{analysis.drill_this_week}</div>
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
    if (!settings?.fathomKey) {
      setError('No Fathom API key. Go to Settings to add it.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('https://api.fathom.video/v1/calls?limit=30', {
        headers: { Authorization: `Bearer ${settings.fathomKey}` },
      });
      if (!res.ok) throw new Error(`Fathom API ${res.status}: ${res.statusText}`);
      const data = await res.json();
      const list = data.calls || data.data || (Array.isArray(data) ? data : []);
      setCalls(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Hydrate cached analyses
    const cached = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('sgs_analyses_')) {
        try { cached[k.replace('sgs_analyses_', '')] = JSON.parse(localStorage.getItem(k)); } catch {}
      }
    }
    setAnalyses(cached);
    fetchCalls();
  }, [settings?.fathomKey]);

  const analyzeCall = async (call) => {
    const callId = String(call.id || call.call_id);
    if (!settings?.anthropicKey) { alert('Add your Anthropic API key in Settings.'); return; }

    const cached = loadAnalysis(callId);
    if (cached) {
      setAnalyses(p => ({ ...p, [callId]: cached }));
      setExpanded(prev => prev === callId ? null : callId);
      return;
    }

    setAnalyzing(p => ({ ...p, [callId]: true }));
    setExpanded(callId);

    try {
      // Fetch transcript
      let transcript = '';
      try {
        const txRes = await fetch(`https://api.fathom.video/v1/calls/${callId}/transcript`, {
          headers: { Authorization: `Bearer ${settings.fathomKey}` },
        });
        if (txRes.ok) {
          const tx = await txRes.json();
          if (typeof tx === 'string') transcript = tx;
          else if (Array.isArray(tx)) transcript = tx.map(t => `${t.speaker || t.name || ''}: ${t.text || t.content || ''}`).join('\n');
          else if (tx.transcript) transcript = typeof tx.transcript === 'string' ? tx.transcript : JSON.stringify(tx.transcript);
          else transcript = JSON.stringify(tx);
        }
      } catch {}

      if (!transcript) transcript = `Call title: ${call.title || call.name || 'Untitled'}. No transcript available.`;

      // Claude API
      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': settings.anthropicKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: `Analyze this sales call transcript and return ONLY the JSON:\n\n${transcript.slice(0, 8000)}` }],
        }),
      });

      if (!aiRes.ok) {
        const err = await aiRes.json().catch(() => ({}));
        throw new Error(err.error?.message || `Anthropic API ${aiRes.status}`);
      }

      const aiData = await aiRes.json();
      const text = aiData.content?.[0]?.text || '{}';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON in AI response');
      const result = JSON.parse(match[0]);

      saveAnalysis(callId, result);
      setAnalyses(p => ({ ...p, [callId]: result }));
    } catch (e) {
      const errResult = { error: e.message };
      saveAnalysis(callId, errResult);
      setAnalyses(p => ({ ...p, [callId]: errResult }));
    } finally {
      setAnalyzing(p => ({ ...p, [callId]: false }));
    }
  };

  const sorted = [...calls]
    .filter(c => filter === 'All' || detectType(c.title || c.name) === filter)
    .sort((a, b) => new Date(b.started_at || b.date || b.created_at || 0) - new Date(a.started_at || a.date || a.created_at || 0));

  const btnStyle = (active) => ({
    fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em',
    padding: '8px 16px', border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
    borderColor: active ? '#ef4444' : '#1a1a1a',
    background: active ? '#ef4444' : 'transparent',
    color: active ? '#fff' : '#737373',
  });

  return (
    <div style={{ padding: '24px 20px', maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: 24, color: '#f5f5f5', letterSpacing: '-0.02em', marginBottom: 4 }}>CALL LIBRARY</h1>
          <p style={{ color: '#737373', fontSize: 13 }}>{calls.length} calls loaded</p>
        </div>
        <button onClick={fetchCalls} style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', padding: '8px 16px', border: '1px solid #1a1a1a', color: '#737373', background: 'transparent', cursor: 'pointer' }}>REFRESH</button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {['All', 'Prospect', 'Coaching'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={btnStyle(filter === f)}>{f.toUpperCase()}</button>
        ))}
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 16, background: '#111111', border: '1px solid #1a1a1a', marginBottom: 16 }}>
          <div style={{ width: 16, height: 16, border: '2px solid #ef4444', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: '#737373', fontSize: 13 }}>Loading calls from Fathom...</span>
        </div>
      )}

      {error && (
        <div style={{ padding: 16, background: '#111111', border: '1px solid #ef4444', marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: '#ef4444' }}>{error}</p>
        </div>
      )}

      {!loading && !error && sorted.length === 0 && (
        <div style={{ padding: 24, background: '#111111', border: '1px solid #1a1a1a', textAlign: 'center' }}>
          <p style={{ color: '#737373', fontSize: 13 }}>No calls found. Add your Fathom API key in Settings.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.map(call => {
          const callId = String(call.id || call.call_id);
          const type = detectType(call.title || call.name);
          const analysis = analyses[callId];
          const isAnalyzing = analyzing[callId];
          const isExpanded = expanded === callId;
          const date = call.started_at || call.date || call.created_at;
          const title = call.title || call.name || call.meeting_title || 'Untitled Call';

          return (
            <div key={callId} style={{ background: '#111111', border: `1px solid ${isExpanded ? '#ef4444' : '#1a1a1a'}`, transition: 'border-color 0.2s' }}>
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{
                        fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em',
                        padding: '2px 8px',
                        background: type === 'Coaching' ? '#1a1a1a' : 'rgba(239,68,68,0.1)',
                        color: type === 'Coaching' ? '#737373' : '#ef4444',
                      }}>{type.toUpperCase()}</span>
                      {date && <span style={{ fontSize: 12, color: '#737373' }}>{new Date(date).toLocaleDateString()}</span>}
                      {call.duration && <span style={{ fontSize: 12, color: '#737373' }}>{fmtDuration(call.duration)}</span>}
                    </div>
                    <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 14, color: '#f5f5f5', lineHeight: 1.3 }}>{title}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <a
                      href={`https://fathom.video/calls/${callId}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', padding: '6px 10px', border: '1px solid #1a1a1a', color: '#737373', textDecoration: 'none', display: 'inline-block', transition: 'all 0.15s' }}
                    >OPEN</a>
                    <button
                      onClick={() => analyzeCall(call)}
                      disabled={isAnalyzing}
                      style={{
                        fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em',
                        padding: '6px 10px', border: '1px solid #ef4444', color: isAnalyzing ? '#737373' : '#ef4444',
                        background: 'transparent', cursor: isAnalyzing ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      {isAnalyzing ? (
                        <><span style={{ width: 10, height: 10, border: '1.5px solid #737373', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />ANALYZING</>
                      ) : analysis ? 'VIEW' : 'ANALYZE'}
                    </button>
                  </div>
                </div>
              </div>
              {isExpanded && analysis && <AnalysisPanel analysis={analysis} />}
            </div>
          );
        })}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
