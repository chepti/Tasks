import { STICKERS, stickerSvg } from './stickers.js';
import {
  MEALS,
  dateKey,
  addDays,
  formatKey,
  weekdayName,
  emptyDay,
  makeEvent,
  countsByItem,
  foodCount,
  summaryText,
  dayToJson,
  isEmptyDay,
  normalizeDay,
} from './logic.js';
import { loadLocal, saveLocal, initCloud } from './sync.js';
import { lineChart, barChart } from './charts.js';

const days = loadLocal();
let current = dateKey();
let mealMode = null; // null = "עכשיו"
let view = 'today';
let range = 30;
let chartItem = 'all';
let cloud = { save() {}, signIn: null };
let status = { state: 'local', reason: 'init' };

const app = document.getElementById('diet-app');
const $ = (sel, root = app) => root.querySelector(sel);

/* אייקונים בסגנון Lucide (stroke 2, קצוות מעוגלים) — בלי אימוג'י */
const ico = (paths, size = 15) => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const ICONS = {
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  cloudSun: '<path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
};
const MEAL_ICON = ['sun', 'cloudSun', 'moon'];

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const getDay = (key = current) => days[key] || (days[key] = emptyDay(key));

function touch(day) {
  saveLocal(days);
  cloud.save(day);
}

function toast(msg) {
  let t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.h);
  toast.h = setTimeout(() => t.classList.remove('show'), 1600);
}

async function copyText(text, okMsg = 'הועתק') {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast(okMsg);
}

/* ---------- מסגרת ---------- */

function renderShell() {
  app.innerHTML = `
    <div class="diet-shell">
      <header class="d-header">
        <a class="d-back" href="./" aria-label="חזרה למשימות">→ המשימות</a>
        <h1>יומן דיאטה</h1>
        <span class="d-sync" id="sync-badge"></span>
      </header>
      <div class="d-tabs" role="tablist">
        <button type="button" role="tab" data-view="today">היום</button>
        <button type="button" role="tab" data-view="history">היסטוריה ומגמות</button>
      </div>
      <div id="view"></div>
      <footer class="d-footer">
        <span>נבנה ב<a href="https://chepti.com" target="_blank" rel="noopener">חולמים תקשוב</a></span>
        <a class="d-feedback" href="mailto:chepti@gmail.com?subject=%D7%9E%D7%A9%D7%95%D7%91%20%E2%80%93%20%D7%99%D7%95%D7%9E%D7%9F%20%D7%93%D7%99%D7%90%D7%98%D7%94">${ico(ICONS.mail, 14)} משוב</a>
      </footer>
      <div id="toast" class="toast" role="status"></div>
    </div>`;
  app.querySelectorAll('.d-tabs button').forEach((b) =>
    b.addEventListener('click', () => {
      view = b.dataset.view;
      renderView();
    })
  );
  renderSync();
}

function renderSync() {
  const el = $('#sync-badge');
  if (!el) return;
  const map = {
    synced: ['מסונכרן', 'ok'],
    syncing: ['מסנכרן…', ''],
    error: ['שגיאת סנכרון — נשמר במכשיר', 'bad'],
  };
  el.onclick = null;
  if (map[status.state]) {
    el.className = `d-sync ${map[status.state][1]}`;
    el.textContent = map[status.state][0];
  } else if (status.reason === 'signed-out') {
    el.className = 'd-sync link';
    el.textContent = 'התחברי באפליקציה לסנכרון';
    el.onclick = () => { location.href = './'; };
  } else {
    el.className = 'd-sync';
    el.textContent = status.reason === 'offline' ? 'אין רשת — נשמר במכשיר' : 'נשמר במכשיר';
  }
}

function renderView() {
  app.querySelectorAll('.d-tabs button').forEach((b) => {
    const on = b.dataset.view === view;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', String(on));
  });
  if (view === 'today') renderToday();
  else renderHistory();
}

/* ---------- היום ---------- */

function renderToday() {
  const day = getDay();
  const isToday = current === dateKey();
  $('#view').innerHTML = `
    <div class="d-card datebar">
      <button type="button" class="icon-btn" id="prev" aria-label="יום קודם">›</button>
      <div class="date-mid">
        <input type="date" id="date-in" value="${current}" max="${dateKey()}" />
        <div class="muted small">יום ${weekdayName(current)}${isToday ? ' · היום' : ''}</div>
      </div>
      <button type="button" class="icon-btn" id="next" aria-label="יום הבא" ${isToday ? 'disabled' : ''}>‹</button>
      ${isToday ? '' : '<button type="button" class="chip" id="to-today">להיום</button>'}
    </div>

    <div class="d-card">
      <div class="meal-row" id="meal-row">
        <button type="button" class="chip" data-meal="">${ico(ICONS.clock)} עכשיו</button>
        ${MEALS.map((m, i) => `<button type="button" class="chip" data-meal="${m.id}">${ico(ICONS[MEAL_ICON[i]])} ${m.label}</button>`).join('')}
      </div>
      <p class="muted small" id="meal-hint"></p>
      <div class="sticker-grid" id="grid"></div>
    </div>

    <div class="d-card">
      <label class="field-label" for="free-in">משהו שלא מופיע למעלה</label>
      <div class="free-row">
        <input type="text" id="free-in" placeholder="למשל: פרוסת לחם עם טחינה" autocomplete="off" />
        <button type="button" class="btn-primary" id="free-add">הוסיפי</button>
      </div>
    </div>

    <div class="d-card">
      <div class="metrics">
        ${metricField('pilates', 'פילאטיס (דק׳)', day.pilates, '1', 'numeric', true)}
        ${metricField('walk', 'הליכה (דק׳)', day.walk, '1', 'numeric', true)}
        ${metricField('weight', 'משקל (ק״ג)', day.weight, '0.1', 'decimal', false)}
      </div>
    </div>

    <div class="d-card">
      <h3>מה נרשם</h3>
      <ul class="log" id="log"></ul>
    </div>

    <div class="d-card">
      <h3>סיכום להדבקה לבוט</h3>
      <textarea id="summary" readonly rows="5"></textarea>
      <div class="btn-row">
        <button type="button" class="btn-primary" id="copy-text">העתיקי טקסט</button>
        <button type="button" class="btn-ghost" id="copy-json">העתיקי JSON</button>
      </div>
    </div>`;

  $('#prev').onclick = () => go(addDays(current, -1));
  $('#next').onclick = () => go(addDays(current, 1));
  $('#to-today')?.addEventListener('click', () => go(dateKey()));
  $('#date-in').onchange = (e) => e.target.value && go(e.target.value > dateKey() ? dateKey() : e.target.value);

  $('#meal-row').addEventListener('click', (e) => {
    const b = e.target.closest('[data-meal]');
    if (!b) return;
    mealMode = b.dataset.meal || null;
    refreshMeal();
  });

  $('#grid').addEventListener('click', (e) => {
    const minus = e.target.closest('[data-minus]');
    if (minus) {
      e.stopPropagation();
      removeLast(minus.dataset.minus);
      return;
    }
    const tile = e.target.closest('[data-item]');
    if (tile) addItem(tile.dataset.item);
  });

  const addFree = () => {
    const inp = $('#free-in');
    const text = inp.value.trim();
    if (!text) return;
    getDay().events.push(makeEvent('free', mealMode, new Date(), text));
    touch(getDay());
    inp.value = '';
    refreshDerived();
  };
  $('#free-add').onclick = addFree;
  $('#free-in').addEventListener('keydown', (e) => e.key === 'Enter' && addFree());

  $('#view').querySelectorAll('[data-metric]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const v = parseFloat(String(inp.value).replace(',', '.'));
      getDay()[inp.dataset.metric] = Number.isFinite(v) && v > 0 ? v : null;
      touch(getDay());
      refreshSummary();
    });
  });
  $('#view').querySelectorAll('[data-add]').forEach((b) =>
    b.addEventListener('click', () => {
      const [k, n] = b.dataset.add.split(':');
      const inp = $(`[data-metric="${k}"]`);
      const next = (Number(getDay()[k]) || 0) + Number(n);
      getDay()[k] = next;
      inp.value = next;
      touch(getDay());
      refreshSummary();
    })
  );

  $('#copy-text').onclick = () => copyText(summaryText(getDay()));
  $('#copy-json').onclick = () => copyText(JSON.stringify(dayToJson(getDay()), null, 2), 'JSON הועתק');

  refreshMeal();
  refreshDerived();
}

function metricField(key, label, value, step, mode, quick) {
  return `<div class="metric">
    <label class="field-label" for="m-${key}">${label}</label>
    <input id="m-${key}" data-metric="${key}" type="number" min="0" step="${step}" inputmode="${mode}" value="${value ?? ''}" placeholder="—" />
    ${quick ? `<div class="quick"><button type="button" class="chip sm" data-add="${key}:10">+10</button><button type="button" class="chip sm" data-add="${key}:5">+5</button></div>` : ''}
  </div>`;
}

function go(key) {
  current = key;
  renderToday();
}

function refreshMeal() {
  app.querySelectorAll('#meal-row .chip').forEach((b) => {
    b.classList.toggle('is-active', (b.dataset.meal || null) === mealMode);
  });
  const hint = $('#meal-hint');
  if (!hint) return;
  hint.textContent = mealMode
    ? `מה שתסמני יירשם ל${MEALS.find((m) => m.id === mealMode).label} (בלי שעה מדויקת)`
    : 'מה שתסמני יירשם עם השעה של עכשיו';
}

function addItem(item) {
  getDay().events.push(makeEvent(item, mealMode));
  touch(getDay());
  refreshDerived();
  const tile = $(`[data-item="${item}"]`);
  tile?.classList.remove('pop');
  void tile?.offsetWidth;
  tile?.classList.add('pop');
}

function removeLast(item) {
  const evs = getDay().events;
  for (let i = evs.length - 1; i >= 0; i--) {
    if (evs[i].item === item) {
      evs.splice(i, 1);
      break;
    }
  }
  touch(getDay());
  refreshDerived();
}

function refreshDerived() {
  const day = getDay();
  const counts = countsByItem(day);
  const grid = $('#grid');
  if (grid) {
    grid.innerHTML = STICKERS.map((s) => {
      const c = counts[s.id] || 0;
      return `<div class="tile ${c ? 'has' : ''}">
        <button type="button" class="sticker" data-item="${s.id}" aria-label="${esc(s.label)}${c ? ` (${c})` : ''}">
          ${stickerSvg(s.id, 62)}
          ${c ? `<span class="count">${c}</span>` : ''}
        </button>
        <span class="tile-label">${esc(s.label)}</span>
        ${c ? `<button type="button" class="minus" data-minus="${s.id}" aria-label="הורידי אחד: ${esc(s.label)}">−</button>` : ''}
      </div>`;
    }).join('');
  }
  const log = $('#log');
  if (log) {
    const mealLabel = Object.fromEntries(MEALS.map((m) => [m.id, m.label]));
    log.innerHTML = day.events.length
      ? day.events
          .map((e) => {
            const name = e.item === 'free' ? esc(e.text) : esc(STICKERS.find((s) => s.id === e.item)?.label || e.item);
            const icon = e.item === 'free' ? ico(ICONS.pencil, 18) : stickerSvg(e.item, 26);
            return `<li><span class="log-ico">${icon}</span><span class="log-name">${name}</span>
              <span class="muted small">${mealLabel[e.meal] || ''}${e.time ? ` · ${e.time}` : ''}</span>
              <button type="button" class="x" data-del="${e.id}" aria-label="מחקי">×</button></li>`;
          })
          .join('')
      : '<li class="muted">עוד לא נרשם כלום ליום הזה</li>';
    log.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', () => {
        day.events = day.events.filter((e) => e.id !== b.dataset.del);
        touch(day);
        refreshDerived();
      })
    );
  }
  refreshSummary();
}

function refreshSummary() {
  const el = $('#summary');
  if (el) el.value = summaryText(getDay());
}

/* ---------- היסטוריה ---------- */

function recentKeys(n) {
  const out = [];
  const today = dateKey();
  for (let i = n - 1; i >= 0; i--) out.push(addDays(today, -i));
  return out;
}

function renderHistory() {
  const filled = Object.values(days)
    .filter((d) => !isEmptyDay(d))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const keys = recentKeys(range);

  const weightPts = keys.map((k) => ({ key: k, value: days[k]?.weight ?? null }));
  const itemSel = ['<option value="all">כל האוכל (מס׳ פריטים)</option>']
    .concat(STICKERS.map((s) => `<option value="${s.id}" ${chartItem === s.id ? 'selected' : ''}>${esc(s.label)}</option>`))
    .join('');
  const itemVals = keys.map((k) => {
    const d = days[k];
    if (!d) return 0;
    return chartItem === 'all' ? foodCount(d) : countsByItem(d)[chartItem] || 0;
  });

  $('#view').innerHTML = `
    <div class="d-card range-row">
      ${[7, 30, 90, 365].map((r) => `<button type="button" class="chip ${r === range ? 'is-active' : ''}" data-range="${r}">${r === 365 ? 'שנה' : r + ' ימים'}</button>`).join('')}
    </div>
    <div class="d-card"><h3>משקל</h3>${lineChart(weightPts, { unit: ' ק״ג', label: 'גרף משקל' })}</div>
    <div class="d-card"><h3>פעילות (דקות)</h3>${barChart(
      keys,
      [
        { name: 'פילאטיס', cls: 'c-pil', values: keys.map((k) => days[k]?.pilates || 0) },
        { name: 'הליכה', cls: 'c-walk', values: keys.map((k) => days[k]?.walk || 0) },
      ],
      { label: 'גרף פעילות', unit: ' דק׳' }
    )}</div>
    <div class="d-card"><h3>אוכל</h3>
      <select id="item-sel" class="sel">${itemSel}</select>
      ${barChart(keys, [{ name: 'כמות', cls: 'c-food', values: itemVals }], { label: 'גרף אוכל' })}
    </div>
    <div class="d-card">
      <h3>ימים קודמים</h3>
      ${
        filled.length
          ? `<div class="table-wrap"><table>
        <thead><tr><th>תאריך</th><th>משקל</th><th>פילאטיס</th><th>הליכה</th><th>פריטים</th><th></th></tr></thead>
        <tbody>${filled
          .map(
            (d) => `<tr data-open="${d.date}">
          <td>${formatKey(d.date).replace(/\.\d{4}$/, '')}<span class="muted small"> ${weekdayName(d.date).slice(0, 3)}׳</span></td>
          <td>${d.weight != null ? Math.round(d.weight * 10) / 10 : '·'}</td><td>${d.pilates ?? '·'}</td><td>${d.walk ?? '·'}</td><td>${foodCount(d) || '·'}</td>
          <td><button type="button" class="chip sm" data-copy="${d.date}">העתק</button></td></tr>`
          )
          .join('')}</tbody></table></div>`
          : '<p class="muted">עדיין אין ימים שמורים</p>'
      }
      <div class="btn-row">
        <button type="button" class="btn-ghost" id="dl-json" ${filled.length ? '' : 'disabled'}>הורידי הכל כ-JSON</button>
      </div>
    </div>`;

  $('#view').querySelectorAll('[data-range]').forEach((b) =>
    b.addEventListener('click', () => {
      range = Number(b.dataset.range);
      renderHistory();
    })
  );
  $('#item-sel').onchange = (e) => {
    chartItem = e.target.value;
    renderHistory();
  };
  $('#view').querySelectorAll('tr[data-open]').forEach((tr) =>
    tr.addEventListener('click', (e) => {
      const c = e.target.closest('[data-copy]');
      if (c) {
        e.stopPropagation();
        copyText(summaryText(days[c.dataset.copy]));
        return;
      }
      current = tr.dataset.open;
      view = 'today';
      renderView();
      window.scrollTo({ top: 0 });
    })
  );
  $('#dl-json')?.addEventListener('click', () => {
    const data = [...filled].reverse().map(dayToJson);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `diet-${dateKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
}

/* ---------- אתחול ---------- */

renderShell();
renderView();

initCloud({
  getLocalDays: () => days,
  onStatus: (s) => {
    status = s;
    renderSync();
  },
  onRemoteDays: (remote) => {
    for (const [k, d] of Object.entries(remote)) days[k] = normalizeDay(d, k);
    saveLocal(days);
    // לא מרנדרים מחדש בזמן הקלדה
    const typing = document.activeElement?.matches?.('input, textarea');
    if (!typing) renderView();
  },
})
  .then((c) => {
    cloud = c;
    renderSync();
  })
  .catch((e) => {
    console.warn('diet cloud init', e);
    status = { state: 'local', reason: 'init-failed' };
    renderSync();
  });

