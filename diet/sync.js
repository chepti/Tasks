import { normalizeDay, isEmptyDay } from './logic.js';

const LS_KEY = 'tasks_diet_days_v1';
const DIRTY_KEY = 'tasks_diet_dirty_v1';
const API = 'api/api.php';

export function loadLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    const days = {};
    for (const [k, v] of Object.entries(raw)) days[k] = normalizeDay(v, k);
    return days;
  } catch {
    return {};
  }
}

export function saveLocal(days) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(days));
  } catch {
    /* אחסון חסום/מלא — ממשיכים בזיכרון */
  }
}

const loadDirty = () => {
  try { return new Set(JSON.parse(localStorage.getItem(DIRTY_KEY) || '[]')); } catch { return new Set(); }
};
const saveDirty = (set) => {
  try { localStorage.setItem(DIRTY_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
};

/**
 * סנכרון לשרת של האפליקציה (SQLite דרך api.php), באותה סיסמה שבה נכנסים לאפליקציה (tasks_key).
 * ימים ששונו ועוד לא הגיעו לשרת מסומנים "dirty" ונשמרים גם אחרי סגירת הדף.
 * בלי התחברות או בלי רשת — העמוד עובד מקומית בלבד.
 */
export async function initCloud({ onStatus, onRemoteDays, getLocalDays }) {
  const key = localStorage.getItem('tasks_key') || '';
  if (!key) {
    onStatus({ state: 'local', reason: 'signed-out' });
    return { save() {}, signIn: null };
  }
  const call = async (action, body) => {
    const res = await fetch(`${API}?action=${action}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'X-Key': key, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) { const e = new Error('unauthorized'); e.auth = true; throw e; }
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'שגיאה');
    return json;
  };
  const dirty = loadDirty();
  const timers = new Map();

  const write = async (day) => {
    try {
      await call('diet_day_set', { date: day.date, day: isEmptyDay(day) ? null : day });
      dirty.delete(day.date);
      saveDirty(dirty);
      onStatus({ state: 'synced' });
    } catch (e) {
      if (e.auth) onStatus({ state: 'local', reason: 'signed-out' });
      else onStatus(e instanceof TypeError ? { state: 'local', reason: 'offline' } : { state: 'error' });
    }
  };

  onStatus({ state: 'syncing' });
  (async () => {
    try {
      // קודם מעלים מה שנשאר "dirty" מפעם קודמת, ואז מושכים את מצב השרת
      const local = getLocalDays();
      for (const k of [...dirty]) if (local[k]) await write(local[k]); else dirty.delete(k);
      const { days } = await call('diet_days');
      const remote = {};
      for (const [k, d] of Object.entries(days || {})) if (!dirty.has(k)) remote[k] = normalizeDay(d, k);
      onRemoteDays(remote);
      // ימים שנרשמו מקומית ועדיין לא קיימים בשרת
      for (const [k, day] of Object.entries(getLocalDays())) {
        if (!(k in (days || {})) && !isEmptyDay(day)) await write(day);
      }
      onStatus({ state: 'synced' });
    } catch (e) {
      if (e.auth) onStatus({ state: 'local', reason: 'signed-out' });
      else onStatus(e instanceof TypeError ? { state: 'local', reason: 'offline' } : { state: 'error' });
    }
  })();

  return {
    save(day) {
      dirty.add(day.date);
      saveDirty(dirty);
      clearTimeout(timers.get(day.date));
      timers.set(day.date, setTimeout(() => write(day), 500));
    },
    signIn: null,
  };
}
