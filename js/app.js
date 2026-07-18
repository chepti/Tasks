/* ============ המשימות שלי — לוגיקה ============ */
'use strict';

const API = 'api/api.php';

/* ---------- אייקונים (Lucide) ---------- */
function ic(name, size = 20) {
  const paths = {
    sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    mapPin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    laptop: '<path d="M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z"/><path d="M20.054 15.987H3.946"/>',
    phone: '<path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/>',
    shoppingBag: '<path d="M16 10a4 4 0 0 1-8 0"/><path d="M3.103 6.034h17.794"/><path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"/>',
    zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    battery: '<path d="M 22 14 L 22 10"/><rect x="2" y="6" width="16" height="12" rx="2"/>',
    batteryLow: '<path d="M 22 14 L 22 10"/><rect x="2" y="6" width="16" height="12" rx="2"/><path d="M6 10v4"/>',
    batteryMed: '<path d="M 22 14 L 22 10"/><rect x="2" y="6" width="16" height="12" rx="2"/><path d="M6 10v4"/><path d="M10 10v4"/>',
    batteryFull: '<path d="M 22 14 L 22 10"/><rect x="2" y="6" width="16" height="12" rx="2"/><path d="M6 10v4"/><path d="M10 10v4"/><path d="M14 10v4"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    clipboard: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6"/><path d="M9 16h6"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    partyPopper: '<path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/>',
    rotateCcw: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    listTodo: '<rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
    hourglass: '<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
    cloudSun: '<path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>',
    coffee: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>',
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ''}</svg>`;
}

/* ---------- מילונים ---------- */
const CONTEXTS = {
  home:     { label: 'בבית',    icon: 'home',        color: 'teal' },
  out:      { label: 'בחוץ',    icon: 'mapPin',      color: 'sky' },
  computer: { label: 'מחשב',    icon: 'laptop',      color: 'lilac' },
  phone:    { label: 'טלפון',   icon: 'phone',       color: 'rose' },
  errand:   { label: 'סידורים', icon: 'shoppingBag', color: 'peach' },
};
const ENERGY = {
  low:    { label: 'אנרגיה נמוכה',  short: 'נמוכה',  icon: 'batteryLow',  color: 'teal',  rank: 1 },
  medium: { label: 'אנרגיה בינונית', short: 'בינונית', icon: 'batteryMed',  color: 'peach', rank: 2 },
  high:   { label: 'אנרגיה גבוהה',  short: 'גבוהה',  icon: 'batteryFull', color: 'coral', rank: 3 },
};
const SIZE = {
  small:  { label: 'קטן',   icon: 'clock',     color: 'sky',   rank: 1 },
  medium: { label: 'בינוני', icon: 'clock',     color: 'lilac', rank: 2 },
  big:    { label: 'גדול',  icon: 'hourglass', color: 'rose',  rank: 3 },
};
const STATUS = {
  inbox:   { label: 'מלאי',      color: 'gray' },
  next:    { label: 'הבא בתור',  color: 'coral' },
  waiting: { label: 'ממתין',     color: 'peach' },
  someday: { label: 'מתישהו',    color: 'lilac' },
  done:    { label: 'בוצע',      color: 'teal' },
};
const PROJECT_COLORS = ['#FF7B6B','#2FBFA7','#9B8CFF','#5BB8F5','#FFB25E','#F56BA0','#7BC96F','#E0B252'];

const PRAISES = [
  'איזה יופי!', 'כל הכבוד!', 'עוד ניצחון!', 'את מדהימה!', 'בום! בוצע!',
  'וואו, מתקדמים!', 'אלופה!', 'עוד אחת ירדה!', 'איזו מלכה!', 'זה הלך מהר!',
];

/* ---------- מצב ---------- */
let KEY = localStorage.getItem('tasks_key') || '';
let DATA = { projects: [], tasks: [] };
let VIEW = localStorage.getItem('tasks_view') || 'now';
let NOW_FILTER = JSON.parse(localStorage.getItem('tasks_now_filter') || '{"context":"","energy":"","size":""}');
let OPEN_PROJECTS = new Set();
let EDITING = null;       // המשימה שנערכת בגיליון
let TOAST_TIMER = null;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- API ---------- */
async function api(action, body = null) {
  const opts = {
    method: body ? 'POST' : 'GET',
    headers: { 'X-Key': KEY, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}?action=${action}`, opts);
  if (res.status === 401) { logout(); throw new Error('unauthorized'); }
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'שגיאה');
  return json;
}

async function reload() {
  DATA = await api('all');
  render();
}

/* ---------- זמנים ---------- */
function parseUTC(s) { return s ? new Date(s.replace(' ', 'T') + 'Z') : null; }
function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayStr() { return localDateStr(new Date()); }

function weekStart() {
  // השבוע נספר משישי עד חמישי — חגיגת הנצחונות של יום חמישי
  const d = new Date();
  const back = (d.getDay() - 5 + 7) % 7;
  d.setDate(d.getDate() - back);
  d.setHours(0, 0, 0, 0);
  return d;
}

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
function dayLabel(dateStr) {
  const today = todayStr();
  const d = new Date(dateStr + 'T12:00:00');
  const diff = Math.round((new Date(today + 'T12:00:00') - d) / 86400000);
  if (diff === 0) return 'היום';
  if (diff === 1) return 'אתמול';
  const name = 'יום ' + DAY_NAMES[d.getDay()];
  if (diff < 7) return name;
  return `${name} · ${d.getDate()}.${d.getMonth() + 1}`;
}

function timeAgo(s) {
  const d = parseUTC(s);
  if (!d) return '';
  const mins = Math.round((Date.now() - d) / 60000);
  if (mins < 2) return 'הרגע';
  if (mins < 60) return `לפני ${mins} דקות`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs === 1 ? 'לפני שעה' : `לפני ${hrs} שעות`;
  const days = Math.round(hrs / 24);
  return days === 1 ? 'אתמול' : `לפני ${days} ימים`;
}

/* ---------- עזרי נתונים ---------- */
function projectOf(t) { return DATA.projects.find(p => p.id == t.project_id) || null; }
function openTasks() {
  return DATA.tasks.filter(t => !['done', 'dropped'].includes(t.status));
}
function isSnoozed(t) {
  return t.snoozed_until && parseUTC(t.snoozed_until) > new Date();
}
function doneTasks() {
  return DATA.tasks.filter(t => t.status === 'done' && t.completed_at)
    .sort((a, b) => b.completed_at.localeCompare(a.completed_at));
}

/* ---------- כניסה ---------- */
function logout() {
  KEY = '';
  localStorage.removeItem('tasks_key');
  $('#app').classList.add('hidden');
  showLogin();
}

function showLogin() {
  $('#login-screen').classList.remove('hidden');
  $('#login-logo').innerHTML = ic('sparkles', 48);
  $('#login-password').focus();
}

async function tryLogin(pw) {
  KEY = pw;
  try {
    DATA = await api('all');
    localStorage.setItem('tasks_key', KEY);
    $('#login-screen').classList.add('hidden');
    $('#app').classList.remove('hidden');
    render();
    return true;
  } catch (e) {
    KEY = '';
    return false;
  }
}

/* ---------- ניווט ---------- */
const VIEWS = [
  { id: 'now',      label: 'עכשיו',    icon: 'sparkles' },
  { id: 'projects', label: 'פרויקטים', icon: 'folder' },
  { id: 'all',      label: 'הכל',      icon: 'listTodo' },
  { id: 'wins',     label: 'נצחונות',  icon: 'trophy' },
];

function renderNav() {
  const html = VIEWS.map(v => `
    <button class="nav-item ${VIEW === v.id ? 'active' : ''}" data-view="${v.id}">
      ${ic(v.icon, 22)}<span>${v.label}</span>
    </button>`).join('');
  $('#bottomnav').innerHTML = html;
  $('#topnav').innerHTML = html;
  $$('.nav-item').forEach(b => b.onclick = () => {
    VIEW = b.dataset.view;
    localStorage.setItem('tasks_view', VIEW);
    render();
  });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'לילה טוב';
  if (h < 12) return 'בוקר טוב';
  if (h < 17) return 'צהריים טובים';
  if (h < 21) return 'ערב טוב';
  return 'לילה טוב';
}

/* ---------- רינדור ראשי ---------- */
function render() {
  $('#greeting').textContent = greeting();
  renderNav();
  closeDeferPop();
  const main = $('#main');
  if (VIEW === 'now') main.innerHTML = renderNow();
  else if (VIEW === 'projects') main.innerHTML = renderProjects();
  else if (VIEW === 'all') main.innerHTML = renderAll();
  else if (VIEW === 'wins') main.innerHTML = renderWins();
  bindMain();
}

/* ---------- כרטיס משימה ---------- */
function taskTags(t, { withProject = true } = {}) {
  const tags = [];
  const p = withProject ? projectOf(t) : null;
  if (p) tags.push(`<span class="tag t-gray" style="background:${p.color}22;color:${p.color}">${ic('folder', 11)}${esc(p.name)}</span>`);
  if (t.context && CONTEXTS[t.context]) {
    const c = CONTEXTS[t.context];
    tags.push(`<span class="tag t-${c.color}">${ic(c.icon, 11)}${c.label}</span>`);
  }
  if (t.energy && ENERGY[t.energy]) {
    const e = ENERGY[t.energy];
    tags.push(`<span class="tag t-${e.color}">${ic(e.icon, 11)}${e.short}</span>`);
  }
  if (t.size && SIZE[t.size]) {
    const s = SIZE[t.size];
    tags.push(`<span class="tag t-${s.color}">${ic(s.icon, 11)}${s.label}</span>`);
  }
  if (t.due_date) {
    const overdue = t.due_date < todayStr();
    tags.push(`<span class="tag ${overdue ? 't-coral' : 't-gray'}">${ic('calendar', 11)}${dayLabel(t.due_date)}</span>`);
  }
  if (isSnoozed(t)) tags.push(`<span class="tag t-lilac">${ic('moon', 11)}נדחה</span>`);
  if (t.status === 'waiting') tags.push(`<span class="tag t-peach">${ic('hourglass', 11)}ממתין</span>`);
  if (t.status === 'someday') tags.push(`<span class="tag t-lilac">${ic('cloudSun', 11)}מתישהו</span>`);
  return tags.join('');
}

function taskCard(t, { defer = false, withProject = true } = {}) {
  const tags = taskTags(t, { withProject });
  return `
  <div class="task-card" data-task="${t.id}">
    <button class="check-circle" data-complete="${t.id}" title="בוצע!">${ic('check', 16)}</button>
    <div class="task-body" data-edit="${t.id}">
      <div class="task-title">${esc(t.title)}</div>
      ${t.notes ? `<div class="task-notes">${esc(t.notes)}</div>` : ''}
      ${tags ? `<div class="task-tags">${tags}</div>` : ''}
    </div>
    <div class="task-side">
      <button class="star-btn ${t.is_next == 1 ? 'on' : ''}" data-star="${t.id}" title="המשימה הבאה">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="${t.is_next == 1 ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${'<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>'}</svg>
      </button>
      ${defer ? `<button class="defer-btn" data-defer="${t.id}" title="לא מתאים עכשיו">${ic('moon', 18)}</button>` : ''}
    </div>
  </div>`;
}

/* ---------- תצוגת עכשיו ---------- */
function nowMatches(t) {
  if (['done', 'dropped', 'someday', 'waiting'].includes(t.status)) return false;
  if (isSnoozed(t)) return false;
  const f = NOW_FILTER;
  if (f.context && t.context && t.context !== f.context) return false;
  if (f.energy && t.energy && ENERGY[t.energy].rank > ENERGY[f.energy].rank) return false;
  if (f.size && t.size && SIZE[t.size].rank > SIZE[f.size].rank) return false;
  return true;
}

function renderNow() {
  const f = NOW_FILTER;
  const chip = (group, val, label, icon, color) => `
    <button class="chip c-${color} ${f[group] === val ? 'on' : ''}" data-filter="${group}" data-val="${val}">
      ${ic(icon, 14)}${label}
    </button>`;

  const tasks = openTasks().filter(nowMatches).sort((a, b) =>
    (b.is_next - a.is_next) ||
    ((a.due_date || '9999') > (b.due_date || '9999') ? 1 : (a.due_date || '9999') < (b.due_date || '9999') ? -1 : 0) ||
    ((SIZE[a.size]?.rank || 2) - (SIZE[b.size]?.rank || 2)) ||
    (a.id - b.id)
  );

  const filtersOn = f.context || f.energy || f.size;

  return `
  <div class="now-hero">
    <h2>${ic('sparkles', 20)} מה מתאים לי עכשיו?</h2>
    <div class="filter-row">
      <span class="filter-label">איפה אני</span>
      ${Object.entries(CONTEXTS).map(([k, c]) => chip('context', k, c.label, c.icon, c.color)).join('')}
    </div>
    <div class="filter-row">
      <span class="filter-label">אנרגיה</span>
      ${Object.entries(ENERGY).map(([k, e]) => chip('energy', k, e.short, e.icon, e.color)).join('')}
    </div>
    <div class="filter-row">
      <span class="filter-label">יש לי כוח ל...</span>
      ${Object.entries(SIZE).map(([k, s]) => chip('size', k, s.label, s.icon, s.color)).join('')}
    </div>
  </div>

  ${tasks.length ? `
    <div class="section-title">${filtersOn ? 'מתאים לך עכשיו' : 'כל מה שפתוח'} <span class="count">${tasks.length}</span></div>
    <div class="task-list">${tasks.map(t => taskCard(t, { defer: true })).join('')}</div>
  ` : `
    <div class="empty-state">
      ${ic('coffee', 44)}
      <p>אין כלום שמתאים לסינון הזה</p>
      <p class="sub">אולי זה הזמן להפסקת קפה? מגיע לך</p>
    </div>
  `}`;
}

/* ---------- תצוגת פרויקטים ---------- */
function renderProjects() {
  const active = DATA.projects.filter(p => p.status === 'active');
  const someday = DATA.projects.filter(p => p.status === 'someday');

  const projCard = p => {
    const tasks = DATA.tasks.filter(t => t.project_id == p.id && t.status !== 'dropped');
    const open = tasks.filter(t => t.status !== 'done');
    const done = tasks.length - open.length;
    const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
    const isOpen = OPEN_PROJECTS.has(p.id);
    const next = open.find(t => t.is_next == 1);
    return `
    <div class="card project-card ${isOpen ? 'open' : ''}" data-project-card="${p.id}">
      <div class="project-head" data-toggle-project="${p.id}">
        <span class="project-dot" style="background:${p.color || '#C3C0D2'}"></span>
        <div style="flex:1;min-width:0">
          <div class="project-name">${esc(p.name)}</div>
          <div class="project-meta">${open.length ? `${open.length} פתוחות` : 'הכל בוצע!'} · ${done}/${tasks.length}</div>
        </div>
        <button class="icon-btn" data-edit-project="${p.id}" title="עריכה" style="width:34px;height:34px;box-shadow:none;background:transparent">${ic('pencil', 16)}</button>
        <span class="project-chevron">${ic('chevronDown', 20)}</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      ${!isOpen && next ? `<div style="margin-top:10px"><span class="tag t-peach">${ic('star', 11)}הבא: ${esc(next.title)}</span></div>` : ''}
      ${isOpen ? `
        <div class="project-tasks">
          ${open.map(t => taskCard(t, { withProject: false })).join('') || '<div class="empty-state" style="padding:16px"><p class="sub">אין משימות פתוחות</p></div>'}
        </div>
        <div class="project-add">
          <input type="text" placeholder="משימה חדשה לפרויקט..." data-project-input="${p.id}">
          <button class="btn btn-ghost" data-project-addbtn="${p.id}">${ic('plus', 18)}</button>
        </div>
      ` : ''}
    </div>`;
  };

  return `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
    <div class="section-title" style="margin:0">${ic('folder', 20)} הפרויקטים שלי <span class="count">${active.length}</span></div>
    <button class="btn btn-ghost" id="btn-new-project">${ic('plus', 16)} פרויקט</button>
  </div>
  <div class="projects-grid">${active.map(projCard).join('')}</div>
  ${active.length === 0 ? `<div class="empty-state">${ic('folder', 44)}<p>עוד אין פרויקטים</p><p class="sub">התחילי עם אחד קטן</p></div>` : ''}
  ${someday.length ? `
    <div class="section-title">${ic('cloudSun', 18)} מתישהו / אולי <span class="count">${someday.length}</span></div>
    <div class="projects-grid">${someday.map(projCard).join('')}</div>
  ` : ''}`;
}

/* ---------- תצוגת הכל ---------- */
function renderAll() {
  const open = openTasks();
  const groups = [
    ['next',    'הבא בתור',  'star'],
    ['inbox',   'מלאי',      'inbox'],
    ['waiting', 'ממתין למישהו', 'hourglass'],
    ['someday', 'מתישהו / אולי', 'cloudSun'],
  ];
  return `
  <div class="quick-add">
    <input type="text" id="quick-input" placeholder="מה צריך לעשות? הקלידי והקישי אנטר...">
    <button class="btn btn-primary" id="quick-btn" title="הוספה">${ic('plus', 22)}</button>
    <button class="btn btn-ghost" id="btn-paste" title="הדבקת רשימה">${ic('clipboard', 20)}</button>
  </div>
  ${groups.map(([st, label, icon]) => {
    const list = open.filter(t => t.status === st);
    if (!list.length) return '';
    return `
      <div class="section-title">${ic(icon, 18)} ${label} <span class="count">${list.length}</span></div>
      <div class="task-list">${list.map(t => taskCard(t)).join('')}</div>`;
  }).join('')}
  ${open.length === 0 ? `<div class="empty-state">${ic('smile', 44)}<p>הכל נקי!</p><p class="sub">הוסיפי משימה או פשוט תיהני מהרגע</p></div>` : ''}`;
}

/* ---------- תצוגת נצחונות ---------- */
function renderWins() {
  const done = doneTasks();
  const ws = weekStart();
  const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);

  const thisWeek = done.filter(t => parseUTC(t.completed_at) >= ws);
  const thisMonth = done.filter(t => parseUTC(t.completed_at) >= monthAgo);

  // קיבוץ לפי יום מקומי
  const byDay = {};
  for (const t of done.slice(0, 200)) {
    const day = localDateStr(parseUTC(t.completed_at));
    (byDay[day] = byDay[day] || []).push(t);
  }

  const isThursday = new Date().getDay() === 4;

  return `
  <div class="wins-hero">
    <div class="big-num">${thisWeek.length}</div>
    <div class="label">נצחונות השבוע ${isThursday ? '· יום חמישי — זמן לחגוג!' : ''}</div>
    <div class="wins-stats">
      <span class="stat-pill">${ic('calendar', 14)} החודש: ${thisMonth.length}</span>
      <span class="stat-pill">${ic('trophy', 14)} סה"כ: ${done.length}</span>
    </div>
    <button class="btn btn-primary celebrate-btn" id="btn-celebrate">${ic('partyPopper', 18)} לחגוג!</button>
  </div>
  ${Object.entries(byDay).map(([day, list]) => `
    <div class="day-group">
      <div class="day-head">${dayLabel(day)} <span class="day-count">${list.length}</span></div>
      ${list.map(t => {
        const p = projectOf(t);
        const d = parseUTC(t.completed_at);
        return `
        <div class="win-card">
          <span class="win-check">${ic('check', 18)}</span>
          <span class="win-title">${esc(t.title)}${p ? ` <span class="tag t-gray" style="background:${p.color}22;color:${p.color}">${esc(p.name)}</span>` : ''}</span>
          <span class="win-time">${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</span>
          <button class="win-undo" data-reopen="${t.id}" title="החזרה לרשימה">${ic('rotateCcw', 15)}</button>
        </div>`;
      }).join('')}
    </div>
  `).join('')}
  ${done.length === 0 ? `<div class="empty-state">${ic('trophy', 44)}<p>הנצחונות הראשונים בדרך</p><p class="sub">כל משימה שתסמני תופיע כאן</p></div>` : ''}`;
}

/* ---------- חיבור אירועים ---------- */
function bindMain() {
  // השלמת משימה
  $$('[data-complete]').forEach(b => b.onclick = e => {
    e.stopPropagation();
    completeTask(+b.dataset.complete, b);
  });
  // עריכה
  $$('[data-edit]').forEach(el => el.onclick = () => openTaskSheet(+el.dataset.edit));
  // כוכב
  $$('[data-star]').forEach(b => b.onclick = e => {
    e.stopPropagation();
    const t = DATA.tasks.find(x => x.id == b.dataset.star);
    updateTask(t.id, { is_next: t.is_next == 1 ? 0 : 1, status: t.is_next == 1 ? t.status : 'next' });
  });
  // דחייה
  $$('[data-defer]').forEach(b => b.onclick = e => {
    e.stopPropagation();
    openDeferPop(+b.dataset.defer, b);
  });
  // סינון עכשיו
  $$('[data-filter]').forEach(b => b.onclick = () => {
    const g = b.dataset.filter, v = b.dataset.val;
    NOW_FILTER[g] = NOW_FILTER[g] === v ? '' : v;
    localStorage.setItem('tasks_now_filter', JSON.stringify(NOW_FILTER));
    render();
  });
  // הוספה מהירה
  const qi = $('#quick-input');
  if (qi) {
    const add = async () => {
      const title = qi.value.trim();
      if (!title) return;
      qi.value = '';
      await createTask({ title, status: 'inbox' });
    };
    qi.onkeydown = e => { if (e.key === 'Enter') add(); };
    $('#quick-btn').onclick = add;
  }
  // הדבקת רשימה
  const pb = $('#btn-paste');
  if (pb) pb.onclick = openPasteModal;
  // פרויקטים
  $$('[data-toggle-project]').forEach(el => el.onclick = e => {
    if (e.target.closest('[data-edit-project]')) return;
    const id = +el.dataset.toggleProject;
    OPEN_PROJECTS.has(id) ? OPEN_PROJECTS.delete(id) : OPEN_PROJECTS.add(id);
    render();
  });
  $$('[data-edit-project]').forEach(b => b.onclick = e => {
    e.stopPropagation();
    openProjectModal(+b.dataset.editProject);
  });
  $$('[data-project-addbtn]').forEach(b => b.onclick = () => addProjectTask(+b.dataset.projectAddbtn));
  $$('[data-project-input]').forEach(inp => inp.onkeydown = e => {
    if (e.key === 'Enter') addProjectTask(+inp.dataset.projectInput);
  });
  const np = $('#btn-new-project');
  if (np) np.onclick = () => openProjectModal(null);
  // נצחונות
  const cb = $('#btn-celebrate');
  if (cb) cb.onclick = () => confetti(220);
  $$('[data-reopen]').forEach(b => b.onclick = async () => {
    await api('task_reopen', { id: +b.dataset.reopen });
    await reload();
    toast('חזרה לרשימה');
  });
}

async function addProjectTask(pid) {
  const inp = $(`[data-project-input="${pid}"]`);
  const title = inp.value.trim();
  if (!title) return;
  inp.value = '';
  await createTask({ title, project_id: pid, status: 'next' });
}

/* ---------- פעולות ---------- */
async function createTask(fields) {
  try {
    const { task } = await api('task_create', fields);
    DATA.tasks.push(task);
    render();
    toast('נוספה: ' + task.title);
  } catch (e) { toast('אופס, לא נשמר — ' + e.message); }
}

async function updateTask(id, fields) {
  const t = DATA.tasks.find(x => x.id == id);
  const backup = { ...t };
  Object.assign(t, fields);
  render();
  try {
    const { task } = await api('task_update', { id, ...fields });
    Object.assign(t, task);
  } catch (e) {
    Object.assign(t, backup);
    render();
    toast('אופס, לא נשמר — ' + e.message);
  }
}

async function completeTask(id, btn) {
  const card = btn.closest('.task-card');
  btn.classList.add('checked');
  confetti(60, btn);
  if (card) card.classList.add('completing');
  const t = DATA.tasks.find(x => x.id == id);
  setTimeout(async () => {
    t.status = 'done';
    t.completed_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    render();
    toastUndo(PRAISES[Math.floor(Math.random() * PRAISES.length)], async () => {
      await api('task_reopen', { id });
      await reload();
    });
    try {
      await api('task_complete', { id });
    } catch (e) { toast('אופס, לא נשמר — ' + e.message); await reload(); }
  }, 450);
}

/* ---------- פופ־אובר דחייה ---------- */
function closeDeferPop() { $$('.defer-pop').forEach(p => p.remove()); }

function openDeferPop(id, anchor) {
  closeDeferPop();
  const pop = document.createElement('div');
  pop.className = 'defer-pop';
  pop.innerHTML = `
    <button data-why="energy">${ic('batteryFull', 16)} זה דורש יותר אנרגיה</button>
    <button data-why="big">${ic('hourglass', 16)} זה גדול מדי לעכשיו</button>
    <button data-why="out">${ic('mapPin', 16)} זה בכלל בחוץ</button>
    <button data-why="home">${ic('home', 16)} זה בכלל בבית</button>
    <button data-why="tomorrow">${ic('moon', 16)} לא היום, אולי מחר</button>
    <button data-why="someday">${ic('cloudSun', 16)} מתישהו, לא דחוף</button>`;
  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  pop.style.top = Math.min(window.innerHeight - pop.offsetHeight - 12, r.bottom + 6 + window.scrollY) + 'px';
  pop.style.left = Math.max(10, r.left - pop.offsetWidth + 24) + 'px';

  pop.querySelectorAll('button').forEach(b => b.onclick = () => {
    const why = b.dataset.why;
    closeDeferPop();
    const fields = {};
    if (why === 'energy') fields.energy = 'high';
    if (why === 'big') fields.size = 'big';
    if (why === 'out') fields.context = 'out';
    if (why === 'home') fields.context = 'home';
    if (why === 'someday') fields.status = 'someday';
    if (why === 'tomorrow') {
      const tmrw = new Date();
      tmrw.setDate(tmrw.getDate() + 1);
      tmrw.setHours(5, 0, 0, 0);
      fields.snoozed_until = tmrw.toISOString().slice(0, 19).replace('T', ' ');
    }
    updateTask(id, fields);
    toast('סודר — זה יחכה לזמן הנכון');
  });

  setTimeout(() => {
    document.addEventListener('click', function h(e) {
      if (!pop.contains(e.target)) { closeDeferPop(); document.removeEventListener('click', h); }
    });
  }, 10);
}

/* ---------- גיליון עריכה ---------- */
function openTaskSheet(id) {
  EDITING = id ? { ...DATA.tasks.find(t => t.id == id) } : {
    title: '', notes: '', project_id: '', status: 'inbox',
    context: '', energy: '', size: '', due_date: '', is_next: 0,
  };
  const t = EDITING;
  const isNew = !id;

  const chipRow = (field, dict, useShort = false) => Object.entries(dict).map(([k, v]) => `
    <button class="chip c-${v.color} ${t[field] === k ? 'on' : ''}" data-sheet-chip="${field}" data-val="${k}">
      ${ic(v.icon || 'check', 14)}${useShort ? v.short : v.label}
    </button>`).join('');

  $('#task-sheet').innerHTML = `
    <div class="sheet-handle"></div>
    <h3>${isNew ? 'משימה חדשה' : 'עריכת משימה'}</h3>
    <div class="field">
      <input type="text" id="sheet-title" placeholder="מה המשימה?" value="${esc(t.title)}">
    </div>
    <div class="field">
      <textarea id="sheet-notes" placeholder="הערות (לא חובה)">${esc(t.notes)}</textarea>
    </div>
    <div class="row-2">
      <div class="field">
        <div class="field-label">${ic('folder', 13)} פרויקט</div>
        <select id="sheet-project">
          <option value="">בלי פרויקט</option>
          ${DATA.projects.filter(p => ['active', 'someday'].includes(p.status)).map(p =>
            `<option value="${p.id}" ${t.project_id == p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <div class="field-label">${ic('calendar', 13)} תאריך יעד</div>
        <input type="date" id="sheet-due" value="${esc(t.due_date)}">
      </div>
    </div>
    <div class="field">
      <div class="field-label">${ic('listTodo', 13)} סטטוס</div>
      <div class="chips">${Object.entries(STATUS).filter(([k]) => k !== 'done').map(([k, v]) => `
        <button class="chip c-${v.color === 'gray' ? 'sky' : v.color} ${t.status === k ? 'on' : ''}" data-sheet-chip="status" data-val="${k}">${v.label}</button>`).join('')}
      </div>
    </div>
    <div class="field">
      <div class="field-label">${ic('mapPin', 13)} איפה זה קורה</div>
      <div class="chips">${chipRow('context', CONTEXTS)}</div>
    </div>
    <div class="field">
      <div class="field-label">${ic('zap', 13)} כמה אנרגיה זה דורש</div>
      <div class="chips">${chipRow('energy', ENERGY, true)}</div>
    </div>
    <div class="field">
      <div class="field-label">${ic('clock', 13)} כמה זמן / גודל</div>
      <div class="chips">${chipRow('size', SIZE)}</div>
    </div>
    <div class="sheet-actions">
      ${!isNew ? `<button class="btn btn-danger" id="sheet-delete" title="מחיקה">${ic('trash', 17)}</button>` : ''}
      <button class="btn btn-ghost" id="sheet-cancel">ביטול</button>
      <button class="btn btn-primary" id="sheet-save">${isNew ? 'הוספה' : 'שמירה'}</button>
    </div>`;

  $('#task-sheet').classList.remove('hidden');
  $('#sheet-backdrop').classList.remove('hidden');
  if (isNew) $('#sheet-title').focus();

  $$('#task-sheet [data-sheet-chip]').forEach(b => b.onclick = () => {
    const f = b.dataset.sheetChip, v = b.dataset.val;
    EDITING[f] = EDITING[f] === v ? '' : v;
    if (f === 'status' && EDITING.status === '') EDITING.status = 'inbox';
    // רענון הצ'יפים בלבד
    $$(`#task-sheet [data-sheet-chip="${f}"]`).forEach(x =>
      x.classList.toggle('on', x.dataset.val === EDITING[f]));
  });

  $('#sheet-cancel').onclick = closeSheet;
  $('#sheet-backdrop').onclick = closeSheet;
  $('#sheet-save').onclick = async () => {
    const fields = {
      title: $('#sheet-title').value.trim(),
      notes: $('#sheet-notes').value.trim(),
      project_id: $('#sheet-project').value || null,
      due_date: $('#sheet-due').value,
      status: EDITING.status, context: EDITING.context,
      energy: EDITING.energy, size: EDITING.size,
    };
    if (!fields.title) { $('#sheet-title').focus(); return; }
    closeSheet();
    if (isNew) await createTask(fields);
    else await updateTask(id, fields);
  };
  const del = $('#sheet-delete');
  if (del) del.onclick = async () => {
    closeSheet();
    await api('task_delete', { id });
    DATA.tasks = DATA.tasks.filter(x => x.id != id);
    render();
    toast('נמחקה (אפשר לשחזר מההיסטוריה)');
  };
}

function closeSheet() {
  $('#task-sheet').classList.add('hidden');
  $('#sheet-backdrop').classList.add('hidden');
  EDITING = null;
}

/* ---------- מודאלים ---------- */
function openModal(html) {
  $('#modal').innerHTML = html;
  $('#modal-backdrop').classList.remove('hidden');
}
function closeModal() { $('#modal-backdrop').classList.add('hidden'); }

function openPasteModal() {
  openModal(`
    <h3>${ic('clipboard', 20)} הדבקת ערימת משימות</h3>
    <p style="color:var(--ink-soft);font-size:.88rem;margin-bottom:12px">כל שורה תהפוך למשימה במלאי. אפשר לתייג אחר כך.</p>
    <textarea id="paste-area" rows="8" placeholder="משימה ראשונה&#10;משימה שנייה&#10;..."></textarea>
    <div class="sheet-actions">
      <button class="btn btn-ghost" id="paste-cancel">ביטול</button>
      <button class="btn btn-primary" id="paste-go">הוספת הכל</button>
    </div>`);
  $('#paste-area').focus();
  $('#paste-cancel').onclick = closeModal;
  $('#paste-go').onclick = async () => {
    const lines = $('#paste-area').value.split('\n').map(s => s.trim()).filter(Boolean);
    if (!lines.length) return;
    closeModal();
    try {
      const res = await api('bulk_add', { tasks: lines.map(title => ({ title, status: 'inbox' })) });
      await reload();
      toast(`נוספו ${res.count} משימות למלאי`);
    } catch (e) { toast('אופס — ' + e.message); }
  };
}

function openProjectModal(id) {
  const p = id ? DATA.projects.find(x => x.id == id) : { name: '', notes: '', color: PROJECT_COLORS[DATA.projects.length % PROJECT_COLORS.length], status: 'active' };
  openModal(`
    <h3>${ic('folder', 20)} ${id ? 'עריכת פרויקט' : 'פרויקט חדש'}</h3>
    <div class="field"><input type="text" id="proj-name" placeholder="שם הפרויקט" value="${esc(p.name)}"></div>
    <div class="field"><textarea id="proj-notes" placeholder="על מה הפרויקט? (לא חובה)">${esc(p.notes)}</textarea></div>
    <div class="field">
      <div class="field-label">צבע</div>
      <div class="chips">${PROJECT_COLORS.map(c => `
        <button class="chip" data-color="${c}" style="background:${c};width:38px;height:38px;padding:0;${p.color === c ? 'outline:3px solid var(--ink);outline-offset:2px' : ''}"></button>`).join('')}
      </div>
    </div>
    <div class="field">
      <div class="field-label">מצב</div>
      <div class="chips">
        <button class="chip c-teal ${p.status === 'active' ? 'on' : ''}" data-pstatus="active">${ic('zap', 14)}פעיל</button>
        <button class="chip c-lilac ${p.status === 'someday' ? 'on' : ''}" data-pstatus="someday">${ic('cloudSun', 14)}מתישהו</button>
        <button class="chip c-sky ${p.status === 'done' ? 'on' : ''}" data-pstatus="done">${ic('check', 14)}הושלם</button>
      </div>
    </div>
    <div class="sheet-actions">
      ${id ? `<button class="btn btn-danger" id="proj-archive" title="ארכיון">${ic('trash', 17)}</button>` : ''}
      <button class="btn btn-ghost" id="proj-cancel">ביטול</button>
      <button class="btn btn-primary" id="proj-save">${id ? 'שמירה' : 'יצירה'}</button>
    </div>`);

  let color = p.color, status = p.status;
  $$('#modal [data-color]').forEach(b => b.onclick = () => {
    color = b.dataset.color;
    $$('#modal [data-color]').forEach(x => x.style.outline = x.dataset.color === color ? '3px solid var(--ink)' : 'none');
  });
  $$('#modal [data-pstatus]').forEach(b => b.onclick = () => {
    status = b.dataset.pstatus;
    $$('#modal [data-pstatus]').forEach(x => x.classList.toggle('on', x.dataset.pstatus === status));
  });
  $('#proj-cancel').onclick = closeModal;
  $('#proj-save').onclick = async () => {
    const name = $('#proj-name').value.trim();
    if (!name) { $('#proj-name').focus(); return; }
    const fields = { name, notes: $('#proj-notes').value.trim(), color, status };
    closeModal();
    try {
      if (id) await api('project_update', { id, ...fields });
      else await api('project_create', fields);
      await reload();
      toast(id ? 'הפרויקט עודכן' : 'פרויקט חדש נולד!');
    } catch (e) { toast('אופס — ' + e.message); }
  };
  const arch = $('#proj-archive');
  if (arch) arch.onclick = async () => {
    closeModal();
    await api('project_delete', { id });
    await reload();
    toast('הפרויקט הועבר לארכיון');
  };
}

async function openHistoryModal() {
  openModal(`<h3>${ic('history', 20)} היסטוריית שינויים</h3><p style="color:var(--ink-soft)">טוען...</p>`);
  const { history } = await api('history&limit=80');
  const ACTIONS = { create: 'נוצרה', update: 'עודכנה', delete: 'נמחקה', complete: 'הושלמה', reopen: 'נפתחה מחדש', restore: 'שוחזרה' };
  openModal(`
    <h3>${ic('history', 20)} היסטוריית שינויים</h3>
    <p style="color:var(--ink-soft);font-size:.85rem;margin-bottom:10px">שחזור מחזיר את הפריט למצב שלפני השינוי.</p>
    ${history.map(h => `
      <div class="history-item">
        <div class="h-what">
          <div class="h-title">${esc(h.snapshot?.title || h.snapshot?.name || '#' + h.entity_id)}</div>
          <div class="h-meta">${h.entity === 'project' ? 'פרויקט' : 'משימה'} · ${ACTIONS[h.action] || h.action} · ${timeAgo(h.at)}</div>
        </div>
        ${['update', 'delete', 'complete'].includes(h.action) ? `<button class="btn btn-ghost" data-restore="${h.id}">שחזור</button>` : ''}
      </div>`).join('') || '<p style="color:var(--ink-soft)">אין עדיין היסטוריה</p>'}
    <div class="sheet-actions"><button class="btn btn-ghost" id="hist-close" style="flex:1">סגירה</button></div>`);
  $('#hist-close').onclick = closeModal;
  $$('#modal [data-restore]').forEach(b => b.onclick = async () => {
    try {
      await api('restore', { history_id: +b.dataset.restore });
      closeModal();
      await reload();
      toast('שוחזר בהצלחה');
    } catch (e) { toast('אופס — ' + e.message); }
  });
}

function openSettingsModal() {
  openModal(`
    <h3>${ic('settings', 20)} הגדרות</h3>
    <div style="display:flex;flex-direction:column;gap:10px">
      <button class="btn btn-ghost" id="set-export" style="justify-content:flex-start">${ic('download', 18)} גיבוי — הורדת כל הנתונים</button>
      <button class="btn btn-ghost" id="set-history" style="justify-content:flex-start">${ic('history', 18)} היסטוריית שינויים ושחזור</button>
      <button class="btn btn-ghost" id="set-logout" style="justify-content:flex-start">${ic('logout', 18)} יציאה</button>
    </div>
    <div class="sheet-actions"><button class="btn btn-ghost" id="set-close" style="flex:1">סגירה</button></div>`);
  $('#set-close').onclick = closeModal;
  $('#set-logout').onclick = () => { closeModal(); logout(); };
  $('#set-history').onclick = () => { closeModal(); openHistoryModal(); };
  $('#set-export').onclick = async () => {
    const data = await api('export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tasks-backup-${todayStr()}.json`;
    a.click();
    toast('הגיבוי ירד למכשיר');
  };
}

/* ---------- טוסט ---------- */
function toast(msg) {
  const el = $('#toast');
  el.innerHTML = esc(msg);
  el.classList.remove('hidden');
  clearTimeout(TOAST_TIMER);
  TOAST_TIMER = setTimeout(() => el.classList.add('hidden'), 2600);
}

function toastUndo(msg, onUndo) {
  const el = $('#toast');
  el.innerHTML = `${esc(msg)} <button class="toast-action">ביטול</button>`;
  el.classList.remove('hidden');
  el.querySelector('.toast-action').onclick = async () => {
    el.classList.add('hidden');
    await onUndo();
  };
  clearTimeout(TOAST_TIMER);
  TOAST_TIMER = setTimeout(() => el.classList.add('hidden'), 4000);
}

/* ---------- קונפטי ---------- */
const CONF_COLORS = ['#FF7B6B', '#2FBFA7', '#9B8CFF', '#5BB8F5', '#FFB25E', '#F56BA0'];
let confettiRunning = false;

function confetti(count = 80, anchor = null) {
  const canvas = $('#confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  let ox = canvas.width / 2, oy = canvas.height / 2;
  if (anchor) {
    const r = anchor.getBoundingClientRect();
    ox = r.left + r.width / 2;
    oy = r.top + r.height / 2;
  }

  const parts = [];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 4 + Math.random() * 9;
    parts.push({
      x: ox, y: oy,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 4,
      w: 5 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - .5) * .3,
      color: CONF_COLORS[i % CONF_COLORS.length],
      life: 60 + Math.random() * 40,
    });
  }

  let existing = window.__confParts || [];
  window.__confParts = existing.concat(parts);
  if (confettiRunning) return;
  confettiRunning = true;

  (function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const alive = [];
    for (const p of window.__confParts) {
      p.x += p.vx; p.y += p.vy;
      p.vy += .25; p.vx *= .99;
      p.rot += p.vr; p.life--;
      if (p.life > 0 && p.y < canvas.height + 20) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, p.life / 30);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.w / 2, p.w, p.w * .6);
        ctx.restore();
        alive.push(p);
      }
    }
    window.__confParts = alive;
    if (alive.length) requestAnimationFrame(frame);
    else { confettiRunning = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  })();
}

/* ---------- אתחול ---------- */
$('#login-form').onsubmit = async e => {
  e.preventDefault();
  const pw = $('#login-password').value;
  if (!pw) return;
  const ok = await tryLogin(pw);
  $('#login-error').classList.toggle('hidden', ok);
};

$('#fab').onclick = () => openTaskSheet(null);
$('#fab').innerHTML = ic('plus', 26);
$('#btn-history').innerHTML = ic('history', 19);
$('#btn-history').onclick = openHistoryModal;
$('#btn-settings').innerHTML = ic('settings', 19);
$('#btn-settings').onclick = openSettingsModal;

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeSheet(); closeModal(); closeDeferPop(); }
});

(async function init() {
  if (KEY) {
    try {
      DATA = await api('all');
      $('#app').classList.remove('hidden');
      render();
      return;
    } catch (e) { /* מפתח לא תקף — מסך כניסה */ }
  }
  showLogin();
})();

// רענון כשחוזרים לאפליקציה
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && KEY && !$('#app').classList.contains('hidden')) reload().catch(() => {});
});
