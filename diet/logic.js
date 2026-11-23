import { STICKER_MAP } from './stickers.js';

export const MEALS = [
  { id: 'morning', label: 'בוקר' },
  { id: 'noon', label: 'צהריים' },
  { id: 'evening', label: 'ערב' },
];
const MEAL_LABEL = Object.fromEntries(MEALS.map((m) => [m.id, m.label]));

export function pad(n) {
  return String(n).padStart(2, '0');
}

export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function formatKey(key) {
  const [y, m, d] = key.split('-');
  return `${Number(d)}.${Number(m)}.${y}`;
}

export function weekdayName(key) {
  return ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][parseKey(key).getDay()];
}

/** בלי בחירת ארוחה: מסיקים מהשעה. */
export function inferMeal(hour) {
  if (hour < 11) return 'morning';
  if (hour < 17) return 'noon';
  return 'evening';
}

export function emptyDay(date) {
  return { date, events: [], pilates: null, walk: null, weight: null };
}

let seq = 0;
export function newEventId() {
  seq += 1;
  return `${Date.now().toString(36)}${seq}${Math.random().toString(36).slice(2, 5)}`;
}

/**
 * @param {string|null} meal  ארוחה שנבחרה ידנית, או null = "עכשיו"
 * @param {Date} now
 */
export function makeEvent(item, meal, now = new Date(), text) {
  const manual = Boolean(meal);
  return {
    id: newEventId(),
    item,
    ...(text ? { text } : {}),
    meal: manual ? meal : inferMeal(now.getHours()),
    // שעה נשמרת רק כשהתיעוד הוא "עכשיו"; בתיעוד בדיעבד נשמרת רק הארוחה
    time: manual ? null : `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

export function countsByItem(day) {
  const c = {};
  for (const e of day.events) if (e.item !== 'free') c[e.item] = (c[e.item] || 0) + 1;
  return c;
}

export function foodCount(day) {
  return day.events.filter((e) => e.item !== 'free').length;
}

/** מקבץ לפי ארוחה: [{meal,label,items:[{label,qty,times[]}], free:[{text,time}]}] */
export function groupMeals(day) {
  const out = [];
  for (const m of MEALS) {
    const evs = day.events.filter((e) => e.meal === m.id);
    if (!evs.length) continue;
    const items = [];
    const free = [];
    for (const e of evs) {
      if (e.item === 'free') {
        free.push({ text: e.text || '', time: e.time || null });
        continue;
      }
      let row = items.find((r) => r.item === e.item);
      if (!row) {
        row = { item: e.item, label: STICKER_MAP[e.item]?.label || e.item, qty: 0, times: [] };
        items.push(row);
      }
      row.qty += 1;
      if (e.time && !row.times.includes(e.time)) row.times.push(e.time);
    }
    out.push({ meal: m.id, label: m.label, items, free });
  }
  return out;
}

function fmtMin(n) {
  return `${n} דקות`;
}

/** הפסקה שמודבקת לבוט */
export function summaryText(day) {
  const parts = [];
  const groups = groupMeals(day);
  if (!groups.length) parts.push('לא תועד אוכל');
  for (const g of groups) {
    const bits = g.items.map((r) => {
      let s = r.label;
      if (r.qty > 1) s += ` ×${r.qty}`;
      if (r.times.length) s += ` (${r.times.join(', ')})`;
      return s;
    });
    for (const f of g.free) bits.push(f.time ? `${f.text} (${f.time})` : f.text);
    parts.push(`${g.label}: ${bits.join(', ')}`);
  }
  const extras = [];
  if (day.pilates) extras.push(`פילאטיס ${fmtMin(day.pilates)}`);
  if (day.walk) extras.push(`הליכה ${fmtMin(day.walk)}`);
  if (day.weight) extras.push(`משקל ${day.weight} ק״ג`);
  const head = `${formatKey(day.date)} (יום ${weekdayName(day.date)})`;
  return `${head} — ${[...parts, ...extras].join('. ')}.`;
}

/** מבנה ל-JSON קריא (ייצוא / הדבקה) */
export function dayToJson(day) {
  const meals = {};
  for (const g of groupMeals(day)) {
    meals[g.label] = {
      items: Object.fromEntries(g.items.map((r) => [r.label, r.qty])),
      ...(g.free.length ? { free: g.free.map((f) => f.text) } : {}),
    };
  }
  return {
    date: day.date,
    meals,
    pilatesMinutes: day.pilates ?? null,
    walkMinutes: day.walk ?? null,
    weightKg: day.weight ?? null,
    events: day.events.map((e) => ({
      item: e.item,
      ...(e.text ? { text: e.text } : {}),
      meal: e.meal,
      time: e.time,
    })),
  };
}

/** נרמול יום שנטען מבחוץ */
export function normalizeDay(raw, date) {
  const d = emptyDay(date);
  if (!raw || typeof raw !== 'object') return d;
  d.events = Array.isArray(raw.events) ? raw.events.filter((e) => e && e.item) : [];
  for (const k of ['pilates', 'walk', 'weight']) {
    const v = Number(raw[k]);
    d[k] = Number.isFinite(v) && v > 0 ? v : null;
  }
  return d;
}

export function isEmptyDay(day) {
  return !day.events.length && !day.pilates && !day.walk && !day.weight;
}
