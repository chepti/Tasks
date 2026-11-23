// גרפי SVG קטנים, בלי ספריות.
const W = 340;
const H = 150;
const PAD = { l: 34, r: 10, t: 12, b: 24 };

function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const f = v / p;
  const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return n * p;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

function shortDate(key) {
  const [, m, d] = key.split('-');
  return `${Number(d)}/${Number(m)}`;
}

function frame(inner, label) {
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" dir="ltr">${inner}</svg>`;
}

function xLabels(keys, xAt) {
  if (!keys.length) return '';
  const idxs = keys.length === 1 ? [0] : [0, Math.floor((keys.length - 1) / 2), keys.length - 1];
  return [...new Set(idxs)]
    .map(
      (i) =>
        `<text x="${xAt(i)}" y="${H - 6}" text-anchor="${keys.length > 1 && i === keys.length - 1 ? 'end' : keys.length > 1 && i === 0 ? 'start' : 'middle'}" class="ch-lbl">${shortDate(keys[i])}</text>`
    )
    .join('');
}

/** @param {{key:string,value:number|null}[]} pts */
export function lineChart(pts, { unit = '', label = '' } = {}) {
  const have = pts.filter((p) => p.value != null);
  if (have.length < 1) return '<p class="muted center">אין עדיין נתונים</p>';
  let lo = Math.min(...have.map((p) => p.value));
  let hi = Math.max(...have.map((p) => p.value));
  if (hi - lo < 1) {
    lo -= 0.5;
    hi += 0.5;
  } else {
    const pad = (hi - lo) * 0.15;
    lo -= pad;
    hi += pad;
  }
  const n = pts.length;
  const xAt = (i) => PAD.l + (n === 1 ? (W - PAD.l - PAD.r) / 2 : (i * (W - PAD.l - PAD.r)) / (n - 1));
  const yAt = (v) => PAD.t + ((hi - v) / (hi - lo)) * (H - PAD.t - PAD.b);
  const coords = pts.map((p, i) => (p.value == null ? null : [xAt(i), yAt(p.value), p]));
  const line = coords
    .filter(Boolean)
    .map((c, i) => `${i ? 'L' : 'M'}${c[0].toFixed(1)} ${c[1].toFixed(1)}`)
    .join(' ');
  const dots = coords
    .filter(Boolean)
    .map(
      (c) =>
        `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="3.6" class="ch-dot"><title>${shortDate(c[2].key)}: ${c[2].value}${unit}</title></circle>`
    )
    .join('');
  const grid = [lo, (lo + hi) / 2, hi]
    .map(
      (v) =>
        `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${yAt(v)}" y2="${yAt(v)}" class="ch-grid"/><text x="${PAD.l - 4}" y="${yAt(v) + 3}" text-anchor="end" class="ch-lbl">${v.toFixed(1)}</text>`
    )
    .join('');
  return frame(
    `${grid}<path d="${line}" class="ch-line" fill="none"/>${dots}${xLabels(pts.map((p) => p.key), xAt)}`,
    label
  );
}

/** סדרות מוערמות. series: [{name,cls,values[]}] */
export function barChart(keys, series, { label = '', unit = '' } = {}) {
  if (!keys.length) return '<p class="muted center">אין עדיין נתונים</p>';
  const totals = keys.map((_, i) => series.reduce((a, s) => a + (s.values[i] || 0), 0));
  const max = niceMax(Math.max(...totals));
  if (Math.max(...totals) === 0) return '<p class="muted center">אין עדיין נתונים</p>';
  const n = keys.length;
  const slot = (W - PAD.l - PAD.r) / n;
  const bw = Math.max(2, Math.min(22, slot * 0.7));
  const xAt = (i) => PAD.l + slot * i + slot / 2;
  const yAt = (v) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  let bars = '';
  keys.forEach((k, i) => {
    let acc = 0;
    series.forEach((s) => {
      const v = s.values[i] || 0;
      if (!v) return;
      const y0 = yAt(acc);
      const y1 = yAt(acc + v);
      bars += `<rect x="${(xAt(i) - bw / 2).toFixed(1)}" y="${y1.toFixed(1)}" width="${bw.toFixed(1)}" height="${(y0 - y1).toFixed(1)}" rx="2" class="${s.cls}"><title>${shortDate(k)} ${s.name}: ${v}${unit}</title></rect>`;
      acc += v;
    });
  });
  const grid = [0, max / 2, max]
    .map(
      (v) =>
        `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${yAt(v)}" y2="${yAt(v)}" class="ch-grid"/><text x="${PAD.l - 4}" y="${yAt(v) + 3}" text-anchor="end" class="ch-lbl">${Number.isInteger(v) ? v : v.toFixed(1)}</text>`
    )
    .join('');
  const legend = series.length > 1
    ? `<div class="legend">${series.map((s) => `<span><i class="${s.cls}"></i>${esc(s.name)}</span>`).join('')}</div>`
    : '';
  return frame(`${grid}${bars}${xLabels(keys, xAt)}`, label) + legend;
}
