// Smooth, Pixar-style Lab Potato rig (matches the profile artwork: goggles, lab coat, blue pen).
// Local coordinates: feet at (0,0); the body spans roughly x -100..100, y -262..0 at s = 1.

const RIG_DEFS = `
  <clipPath id="lensClip"><rect x="-55" y="-168" width="106" height="40" rx="19"/></clipPath>
  <radialGradient id="pSkin" cx="0.36" cy="0.28" r="0.85">
    <stop offset="0" stop-color="#e2ad78"/><stop offset=".55" stop-color="#cb9157"/><stop offset="1" stop-color="#a86f38"/>
  </radialGradient>
  <linearGradient id="pCoat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e3e9f1"/></linearGradient>
  <linearGradient id="pLens" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d6b391"/><stop offset="1" stop-color="#c49f7c"/></linearGradient>
  <radialGradient id="pShadow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#1b1410" stop-opacity=".35"/><stop offset="1" stop-color="#1b1410" stop-opacity="0"/></radialGradient>
  <radialGradient id="pBlush" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff6f6f" stop-opacity=".75"/><stop offset="1" stop-color="#ff6f6f" stop-opacity="0"/></radialGradient>
`;
const BODY_D = 'M28 118C26 88 52 64 88 56C124 48 168 52 196 70C220 86 226 112 216 136C204 164 168 182 128 184C88 186 50 172 36 148C30 138 28 128 28 118Z';
const COAT_D = 'M84 156C62 161 40 166 32 180C22 197 20 212 21 228C68 236 188 236 235 228C236 212 234 197 224 180C216 166 194 161 172 155L127 196Z';
const LENS = '#cfab88';

function pEye(cx, cy, o) {
  const { eyeS = 1, pupil = 1, lookX = 0, lookY = 0, lid = 0, lidTilt = 0, sparkle = 0, side = 1, squeeze = 0, tear = 0 } = o;
  const rx = 8.5 * eyeS, ry = 10.5 * eyeS;
  const ex = cx + lookX * 6, ey = cy + lookY * 4;
  let s = '';
  if (squeeze > .5) { // > < squeezed shut
    const d = side < 0 ? 1 : -1;
    return `<path d="M${cx - 8 * d} ${cy - 8}L${cx + 7 * d} ${cy}L${cx - 8 * d} ${cy + 8}" stroke="#3b302a" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (sparkle > 0) {
    s += `<ellipse cx="${ex}" cy="${ey}" rx="${rx}" ry="${ry}" fill="#2e2622"/>
      <ellipse cx="${ex}" cy="${ey + ry * .35}" rx="${rx * .75}" ry="${ry * .4}" fill="#6c5a7d" opacity="${.7 * sparkle}"/>
      <circle cx="${ex + rx * .32}" cy="${ey - ry * .35}" r="${rx * .38}" fill="#fff"/>
      <circle cx="${ex - rx * .35}" cy="${ey + ry * .3}" r="${rx * .16}" fill="#fff" opacity=".9"/>
      <circle cx="${ex + rx * .05}" cy="${ey + ry * .55}" r="${rx * .1}" fill="#fff" opacity="${sparkle}"/>`;
  } else {
    const pr = Math.max(.25, pupil);
    s += `<ellipse cx="${ex}" cy="${ey}" rx="${rx * pr}" ry="${ry * pr}" fill="#4f4743"/>
      <circle cx="${ex + rx * .28 * pr}" cy="${ey - ry * .32 * pr}" r="${2.6 * eyeS * pr}" fill="#fff" opacity=".85"/>`;
  }
  // eyelid: lens-coloured plate that slides down and tilts (angry = inner corner low)
  if (lid > 0.01) {
    const top = ey - ry - 6, depth = (2 * ry + 8) * lid;
    const ang = lidTilt * 24 * -side;
    s += `<g transform="rotate(${ang} ${ex} ${ey})"><rect x="${ex - rx - 8}" y="${top - 30}" width="${2 * rx + 16}" height="${30 + depth}" fill="${LENS}"/>
      <path d="M${ex - rx - 4} ${top + depth}H${ex + rx + 4}" stroke="#7a5534" stroke-width="2.6" stroke-linecap="round" opacity=".55"/></g>`;
  }
  if (tear > 0) s += `<path d="M${ex + side * rx * .6} ${ey + ry * .7}q4 ${8 + 18 * tear} 0 ${12 + 22 * tear}q-4 -6 0 ${-(12 + 22 * tear)}" fill="#9fe0ff" opacity=".9"/>`;
  return s;
}

function pMouth(m, open = 0) {
  const c = '#2a2018';
  switch (m) {
    case 'smile': return `<path d="M-15 -112q14 13 28 -1" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    case 'grin': return `<path d="M-20 -116q20 26 40 -1z" fill="#5b2a1c" stroke="${c}" stroke-width="4" stroke-linejoin="round"/><path d="M-10 -104q9 5 18 0" stroke="#ef8a8a" stroke-width="5" stroke-linecap="round" fill="none"/>`;
    case 'o': { const r = 6 + 6 * open; return `<ellipse cx="0" cy="-109" rx="${r * .8}" ry="${r}" fill="#4a2118" stroke="${c}" stroke-width="3.5"/>`; }
    case 'frown': return `<path d="M-14 -104q14 -11 28 1" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    case 'wobble': return `<path d="M-17 -108q4.2 -6 8.5 0t8.5 0t8.5 0t8.5 0" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case 'clench': return `<rect x="-17" y="-117" width="34" height="14" rx="5" fill="#fff" stroke="${c}" stroke-width="3.5"/><path d="M-6 -117v14M5 -117v14" stroke="${c}" stroke-width="2"/>`;
    case 'cat': return `<path d="M-14 -112q7 7 14 0q7 7 14 0" stroke="${c}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    case 'pucker': return `<ellipse cx="2" cy="-109" rx="6" ry="5" fill="#d9707a" stroke="${c}" stroke-width="3"/>`;
    case 'gulp': return `<ellipse cx="0" cy="-110" rx="9" ry="${4 + 5 * open}" fill="#4a2118" stroke="${c}" stroke-width="3.5"/>`;
    default: return `<path d="M-12 -111h24" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`;
  }
}

// arm: a = angle in degrees (0 down, 90 sideways out, 180 up), len = sleeve length
function pArm(side, a, len, hold, holdRot) {
  const sx = side * 88, sy = -84, r = a * Math.PI / 180;
  const hx = sx + side * Math.sin(r) * len, hy = sy + Math.cos(r) * len;
  return `<path d="M${sx} ${sy}L${hx} ${hy}" stroke="#c8d0dc" stroke-width="25" stroke-linecap="round"/>
    <path d="M${sx} ${sy}L${hx} ${hy}" stroke="#fbfcfe" stroke-width="19" stroke-linecap="round"/>
    ${hold ? `<g transform="translate(${hx},${hy}) rotate(${holdRot || 0})">${hold}</g>` : ''}
    <circle cx="${hx}" cy="${hy}" r="12.5" fill="#cf965c" stroke="#9d6a2e" stroke-width="2.5"/>`;
}

function potato3(o) {
  const {
    x = 540, y = 1300, s = 2, sx = 1, sy = 1, rot = 0,
    mouth = 'flat', mouthOpen = 0, armL = 8, armR = 8, lenL = 50, lenR = 50,
    holdL = '', holdR = '', holdLRot = 0, holdRRot = 0, frontL = false, frontR = false,
    walk = 0, legs = 1, red = 0, blush = 0, sweat = 0, rim = null, shadow = 1, gogY = 0, gogRot = 0, steam = 0, t = 0, flip = 1
  } = o;
  const leg = side => {
    const ph = walk ? Math.sin(walk * Math.PI * 2 + (side > 0 ? Math.PI : 0)) : 0;
    const lift = Math.max(0, ph) * 12, fx = side * 24 + ph * 11;
    return `<path d="M${side * 22} -28L${fx} ${-7 - lift}" stroke="#8a6238" stroke-width="13" stroke-linecap="round"/>
      <ellipse cx="${fx + side * 4}" cy="${-5 - lift}" rx="15" ry="8" fill="#3a2c22"/>`;
  };
  const eo = Object.assign({}, o);
  const face = `
    <rect x="-55" y="-168" width="106" height="40" rx="19" fill="url(#pLens)"/>
    <g clip-path="url(#lensClip)">${pEye(-30, -146, Object.assign({}, eo, { side: -1 }))}${pEye(26, -149, Object.assign({}, eo, { side: 1 }))}</g>
    <path d="M-38 -131Q-30 -126 -22 -132M18 -134Q26 -129 34 -135" stroke="#8b6a52" stroke-width="3" stroke-linecap="round" fill="none" opacity=".55"/>
    <g transform="translate(0,${gogY}) rotate(${gogRot} 0 -148)">
      <path d="M-66 -145L-100 -139M62 -150L96 -156" stroke="#37414b" stroke-width="15" stroke-linecap="round"/>
      <rect x="-64" y="-176" width="124" height="56" rx="27" fill="none" stroke="#3f4b57" stroke-width="11"/>
      <path d="M-46 -164q16 -5 30 -2" stroke="#fff" stroke-opacity=".75" stroke-width="5" stroke-linecap="round" fill="none"/>
      <ellipse cx="-59" cy="-148" rx="3.8" ry="7.5" fill="#26303a"/><ellipse cx="55" cy="-148" rx="3.8" ry="7.5" fill="#26303a"/>
    </g>
    ${pMouth(mouth, mouthOpen)}`;
  const steamSvg = steam > 0 ? [0, 1, 2].map(i => {
    const k = ((t * 1.6 + i / 3) % 1);
    const px = (i - 1) * 46 + Math.sin(k * 7 + i) * 8, py = -215 - k * 120;
    return `<circle cx="${px}" cy="${py}" r="${(14 + k * 26) * steam}" fill="#fff" opacity="${(1 - k) * .85 * steam}"/>`;
  }).join('') : '';
  const sw = sweat > 0 ? `<path transform="translate(86,-188) scale(${sweat})" d="M0 -18C6 -6 12 0 12 7A12 12 0 0 1 -12 7C-12 0 -6 -6 0 -18Z" fill="#9fdcff" stroke="#4a9bd1" stroke-width="2.5"/>` : '';
  return `<g transform="translate(${x},${y})">
    ${shadow ? `<ellipse cx="0" cy="0" rx="${105 * s / Math.max(.6, sy)}" ry="${15 * s}" fill="url(#pShadow)" opacity="${shadow}"/>` : ''}
    <g transform="rotate(${rot}) scale(${s * sx * flip},${s * sy})">
      ${legs ? leg(-1) + leg(1) : ''}
      ${frontL ? '' : pArm(-1, armL, lenL, holdL, holdLRot)}${frontR ? '' : pArm(1, armR, lenR, holdR, holdRRot)}
      <g transform="translate(-126,-262)">
        <path d="${BODY_D}" fill="url(#pSkin)"/>
        ${red > 0 ? `<path d="${BODY_D}" fill="#ff3b2f" opacity="${.55 * red}"/>` : ''}
        ${rim ? `<path d="M196 70C220 86 226 112 216 136C210 150 200 160 188 168" stroke="${rim}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".8"/>` : ''}
        <ellipse cx="52" cy="128" rx="6.5" ry="3.8" transform="rotate(-18 52 128)" fill="#8d5c24" opacity=".28"/>
        <ellipse cx="198" cy="126" rx="6" ry="3.4" transform="rotate(18 198 126)" fill="#8d5c24" opacity=".28"/>
        <path d="${COAT_D}" fill="url(#pCoat)" stroke="#c8d0dc" stroke-width="3"/>
        <path d="M84 156L127 196M172 155L127 196" stroke="#c8d0dc" stroke-width="2.6" fill="none" stroke-linecap="round"/>
        <rect x="50" y="188" width="35" height="25" rx="4" fill="none" stroke="#c8d0dc" stroke-width="2.6"/>
        <path d="M62 180v14" stroke="#1f66d1" stroke-width="5" stroke-linecap="round"/>
        <circle cx="127" cy="208" r="3.2" fill="#c8d0dc"/><circle cx="127" cy="221" r="3.2" fill="#c8d0dc"/>
      </g>
      ${blush > 0 ? `<ellipse cx="-62" cy="-118" rx="20" ry="11" fill="url(#pBlush)" opacity="${blush}"/><ellipse cx="60" cy="-121" rx="20" ry="11" fill="url(#pBlush)" opacity="${blush}"/>` : ''}
      ${face}${sw}
      ${frontL ? pArm(-1, armL, lenL, holdL, holdLRot) : ''}${frontR ? pArm(1, armR, lenR, holdR, holdRRot) : ''}
      ${steamSvg}
    </g>
  </g>`;
}
