import { useState } from 'react';
import { saveSettings } from '../utils/storage.js';

const SKILLS = ['Tonality', 'Discovery', 'Objection Handling', 'Frame Control', 'Closing'];

const S = {
  card: { background: '#111111', border: '1px solid #1a1a1a', padding: 16, marginBottom: 16 },
  label: { fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 11, letterSpacing: '0.15em', color: '#737373', display: 'block', marginBottom: 8 },
  input: { width: '100%', padding: '10px 12px', fontSize: 13, background: '#0a0a0a', border: '1px solid #1a1a1a', color: '#f5f5f5' },
  hint: { fontSize: 11, color: '#737373', marginTop: 6 },
  row: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  removeBtn: { fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 },
  addBtn: { fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', padding: '10px 14px', border: '1px solid #ef4444', color: '#ef4444', background: 'transparent', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' },
};

export default function Settings({ settings, onSettingsChange }) {
  const [fathomKey, setFathomKey] = useState(settings?.fathomKey || '');
  const [anthropicKey, setAnthropicKey] = useState(settings?.anthropicKey || '');
  const [skillOfWeek, setSkillOfWeek] = useState(settings?.skillOfWeek || 'Tonality');
  const [readingStack, setReadingStack] = useState(settings?.readingStack || ['Never Split the Difference', 'Influence', 'Way of the Wolf', 'Fanatical Prospecting']);
  const [closers, setClosers] = useState(settings?.closers || ['Jeremy Miner', 'Andy Elliott', 'Alex Hormozi']);
  const [newBook, setNewBook] = useState('');
  const [newCloser, setNewCloser] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const updated = { fathomKey, anthropicKey, skillOfWeek, readingStack, closers };
    saveSettings(updated);
    onSettingsChange(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addBook = () => { if (newBook.trim()) { setReadingStack(p => [...p, newBook.trim()]); setNewBook(''); } };
  const removeBook = (i) => setReadingStack(p => p.filter((_, idx) => idx !== i));
  const addCloser = () => { if (newCloser.trim()) { setClosers(p => [...p, newCloser.trim()]); setNewCloser(''); } };
  const removeCloser = (i) => setClosers(p => p.filter((_, idx) => idx !== i));

  return (
    <div style={{ padding: '24px 20px', maxWidth: 560 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: 24, color: '#f5f5f5', letterSpacing: '-0.02em', marginBottom: 4 }}>SETTINGS</h1>
        <p style={{ color: '#737373', fontSize: 13 }}>Configure your training system.</p>
      </div>

      {/* Fathom key */}
      <div style={S.card}>
        <span style={S.label}>FATHOM API KEY</span>
        <input type="password" value={fathomKey} onChange={e => setFathomKey(e.target.value)} placeholder="fathom_..." style={S.input} />
        <p style={S.hint}>Required to pull calls from your Fathom account.</p>
      </div>

      {/* Anthropic key */}
      <div style={S.card}>
        <span style={S.label}>ANTHROPIC API KEY</span>
        <input type="password" value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)} placeholder="sk-ant-..." style={S.input} />
        <p style={S.hint}>Used for AI call analysis. Stored locally in your browser only.</p>
      </div>

      {/* Skill of week */}
      <div style={S.card}>
        <span style={S.label}>SKILL OF THE WEEK</span>
        <select
          value={skillOfWeek}
          onChange={e => setSkillOfWeek(e.target.value)}
          style={{ ...S.input, cursor: 'pointer' }}
        >
          {SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <p style={S.hint}>Shown in Hour 3 — Sales Genesis Module.</p>
      </div>

      {/* Reading stack */}
      <div style={S.card}>
        <span style={S.label}>READING STACK</span>
        {readingStack.map((book, i) => (
          <div key={i} style={S.row}>
            <div style={{ width: 3, height: 16, background: '#ef4444', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, color: '#f5f5f5' }}>{book}</span>
            <button onClick={() => removeBook(i)} style={S.removeBtn}>REMOVE</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input
            type="text" value={newBook} onChange={e => setNewBook(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addBook()}
            placeholder="Add a book..." style={{ ...S.input }}
          />
          <button onClick={addBook} style={S.addBtn}>ADD</button>
        </div>
      </div>

      {/* Closers to study */}
      <div style={S.card}>
        <span style={S.label}>CLOSERS TO STUDY</span>
        {closers.map((closer, i) => (
          <div key={i} style={S.row}>
            <div style={{ width: 3, height: 16, background: '#22c55e', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, color: '#f5f5f5' }}>{closer}</span>
            <button onClick={() => removeCloser(i)} style={S.removeBtn}>REMOVE</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input
            type="text" value={newCloser} onChange={e => setNewCloser(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCloser()}
            placeholder="Add a closer..." style={{ ...S.input }}
          />
          <button onClick={addCloser} style={S.addBtn}>ADD</button>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        style={{
          width: '100%', padding: 16, fontFamily: 'Space Grotesk', fontWeight: 800,
          fontSize: 13, letterSpacing: '0.2em', border: '1px solid',
          borderColor: saved ? '#22c55e' : '#ef4444',
          background: saved ? '#22c55e' : '#ef4444',
          color: '#fff', cursor: 'pointer', transition: 'all 0.2s',
        }}
      >
        {saved ? '✓ SETTINGS SAVED' : 'SAVE SETTINGS'}
      </button>
    </div>
  );
}
