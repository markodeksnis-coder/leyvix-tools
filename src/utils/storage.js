const DEFAULT_SETTINGS = {
  fathomKey: '',
  anthropicKey: '',
  skillOfWeek: 'Tonality',
  readingStack: ['Never Split the Difference', 'Influence', 'Way of the Wolf', 'Fanatical Prospecting'],
  closers: ['Jeremy Miner', 'Andy Elliott', 'Alex Hormozi'],
};

export const loadSettings = () => {
  try {
    const s = localStorage.getItem('sgs_settings');
    return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : { ...DEFAULT_SETTINGS };
  } catch { return { ...DEFAULT_SETTINGS }; }
};

export const saveSettings = (settings) => {
  localStorage.setItem('sgs_settings', JSON.stringify(settings));
};

export const loadStreak = () => {
  return parseInt(localStorage.getItem('sgs_streak') || '0', 10);
};

export const saveStreak = (n) => {
  localStorage.setItem('sgs_streak', String(n));
};

export const getWeekKey = () => {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayOfWeek = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `sgs_week_${now.getFullYear()}-${String(weekNum).padStart(2, '0')}`;
};

export const loadWeek = () => {
  try {
    const w = localStorage.getItem(getWeekKey());
    return w ? JSON.parse(w) : { mon: false, tue: false, wed: false, thu: false, fri: false };
  } catch { return { mon: false, tue: false, wed: false, thu: false, fri: false }; }
};

export const saveWeek = (week) => {
  localStorage.setItem(getWeekKey(), JSON.stringify(week));
};

export const getTodayKey = () => {
  const now = new Date();
  return `sgs_daily_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const loadDailyLog = (key) => {
  try {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : null;
  } catch { return null; }
};

export const saveDailyLog = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const loadAnalysis = (callId) => {
  try {
    const a = localStorage.getItem(`sgs_analyses_${callId}`);
    return a ? JSON.parse(a) : null;
  } catch { return null; }
};

export const saveAnalysis = (callId, data) => {
  localStorage.setItem(`sgs_analyses_${callId}`, JSON.stringify(data));
};

export const loadAllAnalyses = () => {
  const result = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith('sgs_analyses_')) {
      try { result[k.replace('sgs_analyses_', '')] = JSON.parse(localStorage.getItem(k)); } catch {}
    }
  }
  return result;
};

export const loadDrillLog = (dateStr) => {
  try {
    const d = localStorage.getItem(`sgs_drill_${dateStr}`);
    return d ? JSON.parse(d) : null;
  } catch { return null; }
};

export const saveDrillLog = (dateStr, data) => {
  localStorage.setItem(`sgs_drill_${dateStr}`, JSON.stringify(data));
};

export const getDateStr = (date = new Date()) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
