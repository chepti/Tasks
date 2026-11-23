// סטיקרים מאוירים (SVG בתוך viewBox של 64x64). כל פריט: id, label, svg.
const OUT = 'stroke="#5b3a4a" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';
const o = (extra = '') => `${OUT} ${extra}`;

/** פנים חמודות. s = קנה מידה */
function face(cx, cy, s = 1) {
  const e = 5 * s;
  return `<g>
    <circle cx="${cx - e}" cy="${cy}" r="${1.8 * s}" fill="#3b2430"/>
    <circle cx="${cx + e}" cy="${cy}" r="${1.8 * s}" fill="#3b2430"/>
    <path d="M${cx - 2.4 * s} ${cy + 3 * s} q${2.4 * s} ${2.6 * s} ${4.8 * s} 0" fill="none" stroke="#3b2430" stroke-width="${1.6 * s}" stroke-linecap="round"/>
    <circle cx="${cx - e - 3.2 * s}" cy="${cy + 3 * s}" r="${2.2 * s}" fill="#ff9eb1" opacity=".75"/>
    <circle cx="${cx + e + 3.2 * s}" cy="${cy + 3 * s}" r="${2.2 * s}" fill="#ff9eb1" opacity=".75"/>
  </g>`;
}

const steam = (x, y) =>
  `<path d="M${x} ${y} q-4 -4 0 -8 q4 -4 0 -8" fill="none" stroke="#c9b6c0" stroke-width="2.2" stroke-linecap="round"/>`;

function glass(waterFill, extra = '') {
  return `
  <path d="M17 14 L47 14 L43.5 56 Q43.3 58 41.3 58 L22.7 58 Q20.7 58 20.5 56 Z" fill="#f1fafd" ${o()}/>
  <path d="M18.6 24 L45.4 24 L42.6 55 Q42.4 56.2 41.2 56.2 L22.8 56.2 Q21.6 56.2 21.4 55 Z" fill="${waterFill}"/>
  <path d="M17 14 L47 14 L43.5 56 Q43.3 58 41.3 58 L22.7 58 Q20.7 58 20.5 56 Z" fill="none" ${o()}/>
  <path d="M23 18 L24.5 40" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>
  ${extra}`;
}

const chestnut = (cx, cy, s, withFace) => `
  <g transform="translate(${cx} ${cy}) scale(${s})">
    <path d="M0 -18 Q16 -14 18 4 Q18 18 0 18 Q-18 18 -18 4 Q-16 -14 0 -18 Z" fill="#a55a2a" ${o()}/>
    <path d="M-12 8 Q0 20 12 8 Q10 17 0 18 Q-10 17 -12 8 Z" fill="#e8c28a"/>
    <ellipse cx="-8" cy="-4" rx="2.4" ry="5" fill="#c9824c" transform="rotate(10 -8 -4)"/>
    <path d="M-5 -17 L0 -23 L5 -17 Z" fill="#6b3a1c" ${o('stroke-width="1.6"')}/>
    ${withFace ? face(0, 2, 0.9) : ''}
  </g>`;

const almond = (cx, cy, rot, withFace) => `
  <g transform="translate(${cx} ${cy}) rotate(${rot})">
    <path d="M0 -17 Q12 -7 11 5 Q10 17 0 17 Q-10 17 -11 5 Q-12 -7 0 -17 Z" fill="#e0b27a" ${o()}/>
    <path d="M-5 -5 Q-6.5 4 -4 10" fill="none" stroke="#f6dcae" stroke-width="2.4" stroke-linecap="round"/>
    ${withFace ? face(0, 3, 0.8) : ''}
  </g>`;

const bean = (d) => `
  <path d="${d}" fill="none" stroke="#5b3a4a" stroke-width="12" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="#62b84c" stroke-width="8.4" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="#9be07a" stroke-width="3" stroke-linecap="round" transform="translate(0 -1.6)"/>`;

export const STICKERS = [
  {
    id: 'lemonwater',
    label: 'מים עם לימון',
    svg: `${glass('#cdeef7', `<circle cx="47" cy="16" r="10" fill="#ffe066" ${o()}/><circle cx="47" cy="16" r="7" fill="#fff1a0"/><path d="M47 9.5 V22.5 M41.4 12.8 L52.6 19.2 M41.4 19.2 L52.6 12.8" stroke="#ffd23c" stroke-width="1.6" fill="none"/>`)}${face(32, 42)}`,
  },
  {
    id: 'yogurt',
    label: 'יוגורט',
    svg: `<path d="M14 22 L50 22 L45.2 54 Q44.7 57 41.7 57 L22.3 57 Q19.3 57 18.8 54 Z" fill="#fff" ${o()}/>
      <path d="M15.4 32 L48.6 32 L46.6 45 L17.4 45 Z" fill="#ffc2d1"/>
      <rect x="11" y="15" width="42" height="9" rx="3.5" fill="#d9e4ee" ${o()}/>
      <path d="M18 19.5 H30" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      ${face(32, 38)}`,
  },
  {
    id: 'coffee',
    label: 'קפה',
    svg: `<path d="M44 28 H48 Q55 28 55 36 Q55 44 46 44 H43" fill="none" ${o('stroke-width="2.4"')}/>
      <path d="M13 24 H45 V42 Q45 56 31 56 H27 Q13 56 13 42 Z" fill="#ffb3a7" ${o()}/>
      <ellipse cx="29" cy="24" rx="16" ry="4" fill="#7b4a2e" ${o()}/>
      ${steam(24, 17)}${steam(34, 15)}
      ${face(29, 41)}`,
  },
  {
    id: 'omelet',
    label: 'חביתה',
    svg: `<ellipse cx="32" cy="40" rx="29" ry="17" fill="#fff" ${o()}/>
      <ellipse cx="32" cy="41" rx="21" ry="10" fill="#f1ecf7"/>
      <path d="M11 41 Q12 22 32 22 Q52 22 53 41 Q32 48 11 41 Z" fill="#ffd84d" ${o()}/>
      <path d="M16 37 Q32 30 48 37" fill="none" stroke="#e8a920" stroke-width="2" stroke-linecap="round"/>
      <path d="M44 27 q4 -6 9 -4 q-2 6 -9 4 Z" fill="#7ec96a" ${o('stroke-width="1.4"')}/>
      ${face(32, 38)}`,
  },
  {
    id: 'cucumber',
    label: 'מלפפון',
    svg: `<g transform="rotate(-28 32 32)">
      <rect x="6" y="21" width="52" height="22" rx="11" fill="#7dc96a" ${o()}/>
      <rect x="10" y="25" width="44" height="5" rx="2.5" fill="#a5e08f" opacity=".8"/>
      <circle cx="14" cy="38" r="1.2" fill="#4f9e47"/><circle cx="23" cy="40" r="1.2" fill="#4f9e47"/>
      <circle cx="42" cy="39.5" r="1.2" fill="#4f9e47"/><circle cx="50" cy="37" r="1.2" fill="#4f9e47"/>
      ${face(32, 32, 0.9)}
    </g>`,
  },
  {
    id: 'cottage',
    label: 'כף קוטג׳',
    svg: `<path d="M8 56 L33 31" stroke="#5b3a4a" stroke-width="7.5" stroke-linecap="round"/>
      <path d="M8 56 L33 31" stroke="#cfd5e0" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="42" cy="22" rx="16" ry="11" transform="rotate(-42 42 22)" fill="#d9dee8" ${o()}/>
      <circle cx="35" cy="24" r="5.4" fill="#fffdf5" ${o('stroke-width="1.6"')}/>
      <circle cx="44" cy="15" r="5.6" fill="#fffdf5" ${o('stroke-width="1.6"')}/>
      <circle cx="48" cy="25" r="5" fill="#fffdf5" ${o('stroke-width="1.6"')}/>
      <circle cx="41" cy="22" r="5" fill="#fffdf5" ${o('stroke-width="1.6"')}/>
      ${face(41, 21, 0.45)}`,
  },
  {
    id: 'tea',
    label: 'תה',
    svg: `<ellipse cx="29" cy="55" rx="25" ry="5" fill="#cdb4f0" ${o()}/>
      <path d="M46 30 H49 Q56 30 56 37 Q56 44 47 44 H45" fill="none" ${o('stroke-width="2.4"')}/>
      <path d="M12 26 H46 V38 Q46 53 29 53 Q12 53 12 38 Z" fill="#fff" ${o()}/>
      <ellipse cx="29" cy="26" rx="17" ry="4.2" fill="#d99a4e" ${o()}/>
      <path d="M33 25 Q38 14 44 11" fill="none" stroke="#5b3a4a" stroke-width="1.6" stroke-linecap="round"/>
      <rect x="41" y="5" width="9" height="9" rx="2" fill="#a8e0a0" ${o('stroke-width="1.6"')} transform="rotate(18 45 9)"/>
      ${steam(22, 17)}
      ${face(29, 40)}`,
  },
  {
    id: 'fish',
    label: 'דג מושט',
    svg: `<path d="M46 32 L61 19 L61 45 Z" fill="#8fb3de" ${o()}/>
      <path d="M22 20 Q30 8 40 21 Z" fill="#8fb3de" ${o()}/>
      <ellipse cx="28" cy="32" rx="21" ry="14" fill="#a9c7e8" ${o()}/>
      <ellipse cx="28" cy="39" rx="14" ry="5.5" fill="#e3effa"/>
      <circle cx="33" cy="30" r="3.4" fill="#5f7fa6" opacity=".55"/>
      <path d="M40 27 q3 5 0 10" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
      <circle cx="16" cy="29" r="2.6" fill="#3b2430"/><circle cx="15.2" cy="28.2" r="0.9" fill="#fff"/>
      <path d="M9 35 q3 2.4 6 0" fill="none" stroke="#3b2430" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="19" cy="35" r="2.2" fill="#ff9eb1" opacity=".75"/>`,
  },
  {
    id: 'greenbeans',
    label: 'שעועית ירוקה',
    svg: `${bean('M9 20 Q28 9 55 18')}${bean('M8 34 Q30 24 56 32')}${bean('M11 48 Q32 40 53 50')}
      <circle cx="23" cy="32" r="1.5" fill="#3b2430"/><circle cx="33" cy="30.4" r="1.5" fill="#3b2430"/>
      <path d="M26 34 q2.2 2 4.4 0" fill="none" stroke="#3b2430" stroke-width="1.4" stroke-linecap="round"/>`,
  },
  {
    id: 'roastveg',
    label: 'ירקות אפויים',
    svg: `<ellipse cx="32" cy="41" rx="29" ry="17" fill="#fff" ${o()}/>
      <rect x="12" y="26" width="17" height="15" rx="4.5" fill="#ff9f43" ${o()} transform="rotate(-12 20 33)"/>
      <rect x="29" y="22" width="15" height="14" rx="4.5" fill="#ef5350" ${o()} transform="rotate(10 36 29)"/>
      <rect x="24" y="37" width="16" height="12" rx="4.5" fill="#8e6bb8" ${o()} transform="rotate(-5 32 43)"/>
      <circle cx="47" cy="38" r="7" fill="#8fd16a" ${o()}/><circle cx="47" cy="38" r="3.6" fill="#c3ec9f"/>
      <path d="M14 36 l6 -3 M33 25 l7 2 M28 43 l7 -1" stroke="#8a4b1e" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>
      ${face(20, 33, 0.5)}`,
  },
  {
    id: 'chicken',
    label: 'חזה עוף',
    svg: `<ellipse cx="32" cy="42" rx="30" ry="18" fill="#fff" ${o()}/>
      <path d="M10 41 Q8 24 28 22 Q51 20 55 36 Q55 49 34 51 Q13 53 10 41 Z" fill="#f2c38d" ${o()}/>
      <path d="M20 28 l8 8 M29 25 l9 9 M38 25 l7 7" stroke="#b9733a" stroke-width="2.2" stroke-linecap="round" opacity=".6"/>
      <path d="M46 46 q5 -8 11 -6 q-2 7 -11 6 Z" fill="#7ec96a" ${o('stroke-width="1.4"')}/>
      ${face(30, 42)}`,
  },
  {
    id: 'chestnuts',
    label: 'ערמונים',
    svg: `${chestnut(24, 36, 1, true)}${chestnut(46, 42, 0.78, false)}`,
  },
  {
    id: 'almonds',
    label: 'שקדים',
    svg: `${almond(20, 38, -28, false)}${almond(44, 38, 26, false)}${almond(32, 30, 0, true)}`,
  },
  {
    id: 'cookie',
    label: 'עוגיה',
    svg: `<circle cx="32" cy="32" r="23" fill="#e6b36a" ${o()}/>
      <path d="M17 18 Q32 8 47 18" fill="none" stroke="#f3cf93" stroke-width="3" stroke-linecap="round" opacity=".8"/>
      <ellipse cx="20" cy="22" rx="3.4" ry="2.6" fill="#6b3a1c"/><ellipse cx="43" cy="19" rx="3.2" ry="2.6" fill="#6b3a1c"/>
      <ellipse cx="49" cy="35" rx="3" ry="2.4" fill="#6b3a1c"/><ellipse cx="37" cy="49" rx="3.4" ry="2.6" fill="#6b3a1c"/>
      <ellipse cx="18" cy="42" rx="3" ry="2.4" fill="#6b3a1c"/><ellipse cx="29" cy="16" rx="2.4" ry="2" fill="#6b3a1c"/>
      ${face(32, 33)}`,
  },
  {
    id: 'chocolate',
    label: 'קוביית שוקולד',
    svg: `<rect x="11" y="11" width="42" height="42" rx="8" fill="#8a5232" ${o()}/>
      <rect x="17" y="17" width="30" height="30" rx="5" fill="#9d6240" stroke="#6b3a1c" stroke-width="1.6"/>
      <path d="M20 21 H34" stroke="#c18560" stroke-width="2.4" stroke-linecap="round"/>
      ${face(32, 33)}`,
  },
  {
    id: 'cornflakes',
    label: 'קורנפלקס',
    svg: `<rect x="17" y="17" width="9" height="8" rx="2" fill="#f4b942" ${o('stroke-width="1.6"')} transform="rotate(-18 21 21)"/>
      <rect x="28" y="13" width="10" height="9" rx="2" fill="#f4b942" ${o('stroke-width="1.6"')} transform="rotate(12 33 17)"/>
      <rect x="39" y="18" width="9" height="8" rx="2" fill="#f4b942" ${o('stroke-width="1.6"')} transform="rotate(25 43 22)"/>
      <path d="M7 30 H57 Q57 55 32 55 Q7 55 7 30 Z" fill="#9ed7f2" ${o()}/>
      <ellipse cx="32" cy="30" rx="25" ry="6" fill="#fffdf5" ${o()}/>
      <rect x="22" y="24" width="9" height="7" rx="2" fill="#f4b942" ${o('stroke-width="1.6"')} transform="rotate(-8 26 28)"/>
      <rect x="35" y="25" width="9" height="7" rx="2" fill="#f4b942" ${o('stroke-width="1.6"')} transform="rotate(14 39 29)"/>
      ${face(32, 44)}`,
  },
  {
    id: 'soup',
    label: 'מרק',
    svg: `${steam(24, 19)}${steam(37, 17)}
      <path d="M7 30 H57 Q57 55 32 55 Q7 55 7 30 Z" fill="#9fd3c7" ${o()}/>
      <ellipse cx="32" cy="30" rx="25" ry="6" fill="#ff9f5a" ${o()}/>
      <circle cx="22" cy="29" r="2.2" fill="#ffd166"/><circle cx="31" cy="31" r="2.2" fill="#7bc96f"/>
      <circle cx="41" cy="29" r="2.4" fill="#ffd166"/><circle cx="46" cy="32" r="1.8" fill="#7bc96f"/>
      ${face(32, 44)}`,
  },
  {
    id: 'rice',
    label: 'אורז',
    svg: `<ellipse cx="32" cy="43" rx="29" ry="15" fill="#cfe3f7" ${o()}/>
      <ellipse cx="32" cy="43" rx="20" ry="9" fill="#e8f2fc"/>
      <path d="M13 43 Q15 20 32 20 Q49 20 51 43 Q32 50 13 43 Z" fill="#fff" ${o()}/>
      <path d="M22 28 l3 -2 M33 24 l3 1 M41 30 l3 -1 M20 37 l3 0 M44 38 l2 -2" stroke="#d6cfba" stroke-width="2" stroke-linecap="round"/>
      ${face(32, 36)}`,
  },
  {
    id: 'water',
    label: 'מים',
    svg: `${glass('#a9dcf5', `<circle cx="29" cy="30" r="1.8" fill="#fff" opacity=".9"/><circle cx="37" cy="26" r="1.3" fill="#fff" opacity=".9"/>`)}${face(32, 43)}`,
  },
];

export const STICKER_MAP = Object.fromEntries(STICKERS.map((s) => [s.id, s]));

export function stickerSvg(id, size = 64) {
  const s = STICKER_MAP[id];
  if (!s) return '';
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${s.svg}</svg>`;
}
