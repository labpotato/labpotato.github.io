// Shared helpers for the Lab Potato reels. Everything is a pure function of time t
// (seconds), so the renderer can step frame by frame and every frame is reproducible.
const W = 1080, H = 1920;
// Instagram Reels safe zone (approx.): keep text/key visuals inside this box.
const SAFE = { top: 270, bottom: 1440, left: 70, right: 940 };

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, t0, t1) => clamp((t - t0) / (t1 - t0));
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeIn = k => k * k * k;
const easeInOut = k => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOutBack = (k, s = 1.9) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
// damped spring settling from 1 to 0 (for wobble after an impact)
const spring = (dt, freq = 9, damp = 6) => (dt < 0 ? 0 : Math.exp(-damp * dt) * Math.cos(freq * dt * 2 * Math.PI / 2));
const pop = (t, t0, d = .45) => (t < t0 ? 0 : easeOutBack(prog(t, t0, t0 + d)));
const fadeOut = (t, t0, d = .25) => 1 - prog(t, t0, t0 + d);

// A hop: anticipation squash -> stretched airborne arc -> landing squash with spring wobble.
// Returns {dy, sx, sy}; dy is negative upward.
function hop(t, t0, dur = .55, h = 160) {
  const pre = .1, land = t0 + pre + dur;
  if (t < t0) return { dy: 0, sx: 1, sy: 1 };
  if (t < t0 + pre) { const k = Math.sin(prog(t, t0, t0 + pre) * Math.PI / 2); return { dy: 0, sx: 1 + .14 * k, sy: 1 - .16 * k }; }
  if (t < land) {
    const k = prog(t, t0 + pre, land);
    const v = Math.abs(1 - 2 * k);              // speed proxy, high at take off/landing
    return { dy: -4 * h * k * (1 - k), sx: 1 - .1 * v, sy: 1 + .14 * v };
  }
  const w = spring(t - land, 3.2, 7);
  return { dy: 0, sx: 1 + .2 * w, sy: 1 - .22 * w };
}
// combine several hops (only the active/most recent one matters)
function hops(t, list) {
  let r = { dy: 0, sx: 1, sy: 1 };
  for (const [t0, dur, h] of list) if (t >= t0) r = hop(t, t0, dur, h);
  return r;
}
// gentle idle breathing bob
const idle = (t, amp = 1) => ({ dy: -6 * amp * (0.5 + 0.5 * Math.sin(t * 4.2)), sx: 1 + .015 * amp * Math.sin(t * 4.2), sy: 1 - .015 * amp * Math.sin(t * 4.2) });
const blinkAt = (t, period = 3.1, off = 0) => { const p = ((t + off) % period); return p < .12; };

// ---------- the mascot ----------
// Coordinates: the potato's feet sit at local (0,0); body spans ~ -100..100 x, -250..0 y at scale 1.
function potato(o) {
  const {
    x = 540, y = 1300, s = 2.2, sx = 1, sy = 1, rot = 0,
    eyes = 'open', mouth = 'flat', goggles = 'on', gogX = 0, gogY = 0, gogRot = 0,
    walk = 0, armL = 0, armR = 0, look = 0, lookY = 0, eyebags = .34, sweat = 0, blush = 0,
    shadow = 1, night = 0, legs = 1
  } = o;
  const leg = (side) => {
    const ph = walk ? Math.sin(walk * Math.PI * 2 + (side > 0 ? Math.PI : 0)) : 0;
    const lift = Math.max(0, ph) * 10, fx = side * 24 + ph * 9;
    return `<path d="M${side * 22} -26 L${fx} ${-6 - lift}" stroke="#7a5a3a" stroke-width="12" stroke-linecap="round"/>
            <ellipse cx="${fx + side * 3}" cy="${-4 - lift}" rx="13" ry="7" fill="#3a2c22"/>`;
  };
  // arms: angle in degrees, 0 = hanging down, 90 = straight out sideways, 160 = up
  const arm = (side, a) => {
    const sh = { x: side * 92, y: -78 };
    const r = a * Math.PI / 180, len = 46;
    const ex = sh.x + side * Math.sin(r) * len, ey = sh.y + Math.cos(r) * len;
    return `<path d="M${sh.x} ${sh.y} L${ex} ${ey}" stroke="#b9c3d1" stroke-width="24" stroke-linecap="round"/>
            <path d="M${sh.x} ${sh.y} L${ex} ${ey}" stroke="#fbfcfe" stroke-width="19" stroke-linecap="round"/>
            <circle cx="${ex}" cy="${ey}" r="11" fill="#c58d52" stroke="#9d6a2e" stroke-width="2"/>`;
  };
  const ex = look * 6, ey = lookY * 5;
  let eyeSvg;
  if (eyes === 'closed' || eyes === 'blink') eyeSvg = `<path d="M-38 -136h16M18 -139h16" stroke="#2a2018" stroke-width="5" stroke-linecap="round"/>`;
  else if (eyes === 'happy') eyeSvg = `<path d="M-40 -132q10 -14 20 0M16 -135q10 -14 20 0" stroke="#2a2018" stroke-width="5.5" fill="none" stroke-linecap="round"/>`;
  else if (eyes === 'wide') eyeSvg = `<circle cx="${-30 + ex}" cy="${-136 + ey}" r="14" fill="#fff" stroke="#2a2018" stroke-width="3"/><circle cx="${26 + ex}" cy="${-139 + ey}" r="14" fill="#fff" stroke="#2a2018" stroke-width="3"/>
       <circle cx="${-30 + ex * 1.4}" cy="${-136 + ey * 1.4}" r="5" fill="#2a2018"/><circle cx="${26 + ex * 1.4}" cy="${-139 + ey * 1.4}" r="5" fill="#2a2018"/>`;
  else if (eyes === 'tired') eyeSvg = `<ellipse cx="${-30 + ex}" cy="${-132 + ey}" rx="8" ry="5" fill="#2a2018"/><ellipse cx="${26 + ex}" cy="${-135 + ey}" rx="8" ry="5" fill="#2a2018"/>
       <path d="M-41 -138h22M15 -141h22" stroke="#9d6a2e" stroke-width="5" stroke-linecap="round"/>`;
  else if (eyes === 'squint') eyeSvg = `<path d="M-40 -136h20M16 -139h20" stroke="#2a2018" stroke-width="7" stroke-linecap="round"/>`;
  else if (eyes === 'star') eyeSvg = [[-30, -136], [26, -139]].map(([cx, cy]) => `<path transform="translate(${cx},${cy})" d="M0 -14L4 -4L14 -4L6 3L9 13L0 7L-9 13L-6 3L-14 -4L-4 -4Z" fill="#2a2018"/>`).join('');
  else eyeSvg = `<ellipse cx="${-30 + ex}" cy="${-136 + ey}" rx="8" ry="10" fill="#2a2018"/><ellipse cx="${26 + ex}" cy="${-139 + ey}" rx="8" ry="10" fill="#2a2018"/>`;
  const mouths = {
    flat: `<path d="M-13 -100h24" stroke="#2a2018" stroke-width="4.5" stroke-linecap="round"/>`,
    smile: `<path d="M-16 -104q15 14 30 -2" stroke="#2a2018" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
    grin: `<path d="M-22 -106q22 26 44 -2z" fill="#5b2a1c" stroke="#2a2018" stroke-width="4" stroke-linejoin="round"/><path d="M-12 -94q10 6 20 0" stroke="#e57f7f" stroke-width="5" stroke-linecap="round" fill="none"/>`,
    o: `<ellipse cx="0" cy="-98" rx="9" ry="12" fill="#5b2a1c" stroke="#2a2018" stroke-width="4"/>`,
    frown: `<path d="M-15 -94q15 -12 30 1" stroke="#2a2018" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
    wobble: `<path d="M-18 -98q4.5 -6 9 0t9 0t9 0t9 0" stroke="#2a2018" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  };
  const gog = goggles === 'off' ? '' : `
    <g transform="translate(${gogX},${gogY}) rotate(${gogRot} 0 -140)">
      <path d="M-66 -137L-98 -131M62 -142L94 -147" stroke="#39444e" stroke-width="14" stroke-linecap="round"/>
      <rect x="-64" y="-168" width="124" height="56" rx="27" fill="none" stroke="#3f4b57" stroke-width="10"/>
      <rect x="-55" y="-160" width="106" height="40" rx="19" fill="#cfe6f2" fill-opacity=".3"/>
      <path d="M-40 -152q14 -6 26 -2" stroke="#fff" stroke-opacity=".7" stroke-width="5" stroke-linecap="round" fill="none"/>
      <ellipse cx="-59" cy="-140" rx="3.6" ry="7" fill="#2b343d"/><ellipse cx="55" cy="-140" rx="3.6" ry="7" fill="#2b343d"/>
    </g>`;
  const sw = sweat > 0 ? `<path transform="translate(78,-176) scale(${sweat})" d="M0 -18C6 -6 12 0 12 7A12 12 0 0 1 -12 7C-12 0 -6 -6 0 -18Z" fill="#8fd3ff" stroke="#3a8cc4" stroke-width="2.5"/>` : '';
  const bl = blush > 0 ? `<ellipse cx="-58" cy="-112" rx="13" ry="7" fill="#ff7a7a" opacity="${.45 * blush}"/><ellipse cx="54" cy="-115" rx="13" ry="7" fill="#ff7a7a" opacity="${.45 * blush}"/>` : '';
  return `
  <g transform="translate(${x},${y})">
    ${shadow ? `<ellipse cx="0" cy="2" rx="${92 * s * (1 / Math.max(.6, sy))}" ry="${9 * s}" fill="#2a2018" opacity="${.13 * shadow}"/>` : ''}
    <g transform="rotate(${rot}) scale(${s * sx},${s * sy})">
      ${legs ? leg(-1) + leg(1) : ''}
      ${arm(-1, armL)}${arm(1, armR)}
      <g transform="translate(-126,-262)">
        <path d="M28 118C26 88 52 64 88 56C124 48 168 52 196 70C220 86 226 112 216 136C204 164 168 182 128 184C88 186 50 172 36 148C30 138 28 128 28 118Z" fill="url(#skin)" stroke="#8a5a26" stroke-width="5"/>
        <ellipse cx="52" cy="128" rx="6.5" ry="3.8" transform="rotate(-18 52 128)" fill="#8d5c24" opacity=".28"/>
        <ellipse cx="198" cy="126" rx="6" ry="3.4" transform="rotate(18 198 126)" fill="#8d5c24" opacity=".28"/>
        <path d="M84 156C62 161 40 166 32 180C22 197 20 212 21 228C68 236 188 236 235 228C236 212 234 197 224 180C216 166 194 161 172 155L127 196Z" fill="#fbfcfe" stroke="#a9b4c4" stroke-width="4.5"/>
        <path d="M84 156L127 196M172 155L127 196" stroke="#a9b4c4" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <rect x="50" y="188" width="35" height="25" rx="3" fill="none" stroke="#a9b4c4" stroke-width="3.5"/>
        <path d="M62 182v13" stroke="#e8613c" stroke-width="4" stroke-linecap="round"/>
        <circle cx="127" cy="208" r="3" fill="#ccd4e0"/><circle cx="127" cy="221" r="3" fill="#ccd4e0"/>
      </g>
      <g transform="translate(0,-10)"><path d="M-38 -121Q-30 -116 -22 -122M18 -124Q26 -119 34 -125" stroke="#2a2018" stroke-width="4" stroke-linecap="round" fill="none" opacity="${eyebags}"/>
      ${bl}${eyeSvg}${mouths[mouth] || mouths.flat}${gog}${sw}</g>
    </g>
  </g>`;
}

const DEFS = `<defs>
  <linearGradient id="skin" x1="0.2" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#d09760"/><stop offset="100%" stop-color="#bc8148"/></linearGradient>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#1c1f27" flood-opacity=".18"/></filter>
  <filter id="softsm" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#1c1f27" flood-opacity=".18"/></filter>
</defs>`;

// Big caption with outline; pops in with overshoot. lines: array of strings.
function caption(t, t0, lines, o = {}) {
  const { y = 360, size = 74, color = '#14161c', hl = null, hlColor = '#c58d52', out = null, align = 'middle', x = 540, weight = 700, lh = 1.12, bg = null } = o;
  if (t < t0 || (out !== null && t > out + .25)) return '';
  const k = pop(t, t0, .5), a = out !== null ? fadeOut(t, out) : 1;
  const sc = .6 + .4 * k;
  let s = `<g opacity="${clamp(k * 1.6) * a}" transform="translate(${x},${y}) scale(${sc}) translate(${-x},${-y})">`;
  if (bg) {
    const wmax = Math.max(...lines.map(l => l.length)) * size * .52 + 70;
    s += `<path d="${pbox(x - wmax / 2, y - size * 1.05, wmax, lines.length * size * lh + size * .55, 10)}" fill="${bg}"/>`;
  }
  lines.forEach((ln, i) => {
    const yy = y + i * size * lh;
    const txt = hl ? ln.replace(hl, m => `<tspan fill="${hlColor}">${m}</tspan>`) : ln;
    s += `<text x="${x}" y="${yy}" text-anchor="${align}" font-family="Pixelify Sans" font-weight="${weight}" font-size="${size}" fill="${color}">${txt}</text>`;
  });
  return s + '</g>';
}
// Speech bubble anchored with tail pointing to (tx,ty). layer 'art' draws the
// pixelated balloon, layer 'ui' draws the crisp text on top of it.
function bubble(t, t0, t1, lines, o = {}, layer = 'art') {
  if (t < t0 || t > t1 + .2) return '';
  const { x = 540, y = 700, size = 46, tx = x, ty = y + 120, w = null, fill = '#fff' } = o;
  const k = pop(t, t0, .4), a = fadeOut(t, t1, .2);
  const bw = w || Math.max(...lines.map(l => l.length)) * size * .52 + 80, bh = lines.length * size * 1.2 + 50;
  const sc = .3 + .7 * k;
  let s = `<g opacity="${clamp(k * 2) * a}" transform="translate(${tx},${ty}) scale(${sc}) translate(${-tx},${-ty})">`;
  if (layer === 'art') {
    s += `<path d="M${x - 30} ${y + bh / 2 - 6} L${tx} ${ty} L${x + 30} ${y + bh / 2 - 6}Z" fill="${fill}" stroke="#14161c" stroke-width="10" stroke-linejoin="miter"/>
     <path d="${pbox(x - bw / 2, y - bh / 2, bw, bh, 15)}" fill="${fill}" stroke="#14161c" stroke-width="10"/>
     <path d="M${x - 26} ${y + bh / 2 - 5} L${x + 26} ${y + bh / 2 - 5}" stroke="${fill}" stroke-width="12"/>`;
  } else {
    lines.forEach((ln, i) => {
      s += `<text x="${x}" y="${y - bh / 2 + 26 + size * .92 + i * size * 1.2}" text-anchor="middle" font-family="Pixelify Sans" font-weight="600" font-size="${size}" fill="#14161c">${ln}</text>`;
    });
  }
  return s + '</g>';
}
// rectangle with stepped "pixel" corners (n = step size in px)
function pbox(x, y, w, h, n = 10) {
  return `M${x + 2 * n} ${y}H${x + w - 2 * n}V${y + n}H${x + w - n}V${y + 2 * n}H${x + w}V${y + h - 2 * n}H${x + w - n}V${y + h - n}H${x + w - 2 * n}V${y + h}H${x + 2 * n}V${y + h - n}H${x + n}V${y + h - 2 * n}H${x}V${y + 2 * n}H${x + n}V${y + n}H${x + 2 * n}Z`;
}
// little burst lines (impact / sparkle)
function burst(cx, cy, k, n = 8, r0 = 40, r1 = 110, color = '#14161c', w = 7) {
  if (k <= 0 || k >= 1) return '';
  const a = 1 - k, ri = lerp(r0, r1 * .8, easeOut(k)), ro = lerp(r0 + 10, r1, easeOut(k));
  let s = '';
  for (let i = 0; i < n; i++) {
    const th = i / n * Math.PI * 2 + .3;
    s += `<path d="M${cx + Math.cos(th) * ri} ${cy + Math.sin(th) * ri}L${cx + Math.cos(th) * ro} ${cy + Math.sin(th) * ro}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="${a}"/>`;
  }
  return s;
}
function sparkle(cx, cy, r, color = '#f5b301', rot = 0) {
  return `<path transform="translate(${cx},${cy}) rotate(${rot}) scale(${r / 20})" d="M0 -20Q3 -3 20 0Q3 3 0 20Q-3 3 -20 0Q-3 -3 0 -20Z" fill="${color}"/>`;
}
// deterministic pseudo random
const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// progress pill "1/6" style chip
function chip(x, y, label, o = {}) {
  const { size = 34, fill = '#14161c', color = '#fff', pad = 26 } = o;
  const w = label.length * size * .55 + pad * 2;
  return `<path d="${pbox(x - w / 2, y - size * .95, w, size * 1.5, Math.round(size / 6))}" fill="${fill}"/>
   <text x="${x}" y="${y + size * .05}" text-anchor="middle" font-family="Pixelify Sans" font-weight="600" font-size="${size}" fill="${color}">${label}</text>`;
}

// Optional debug overlay of the Reels safe zone (?safe=1)
function safeOverlay() {
  return `<rect x="0" y="0" width="${W}" height="${SAFE.top}" fill="red" opacity=".18"/>
  <rect x="0" y="${SAFE.bottom}" width="${W}" height="${H - SAFE.bottom}" fill="red" opacity=".18"/>
  <rect x="${SAFE.right}" y="${SAFE.top}" width="${W - SAFE.right}" height="${SAFE.bottom - SAFE.top}" fill="red" opacity=".12"/>`;
}

const PX = 6;   // 1 art pixel = PX x PX video pixels
function mount(art, ui) {
  const root = document.getElementById('stage');
  root.innerHTML = `<canvas id="px" width="${W / PX}" height="${H / PX}" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;image-rendering:pixelated"></canvas><div id="ui" style="position:absolute;left:0;top:0"></div>`;
  const cv = root.querySelector('#px'), ctx = cv.getContext('2d'), uiEl = root.querySelector('#ui');
  ctx.imageSmoothingEnabled = false;
  const showSafe = /safe=1/.test(location.search);
  const img = new Image();
  window.render = t => new Promise(res => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W / PX}" height="${H / PX}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">${DEFS}${art(t)}</svg>`;
    img.onload = () => {
      ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0, cv.width, cv.height);
      uiEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${DEFS}${ui(t)}${showSafe ? safeOverlay() : ''}</svg>`;
      res();
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
  const m = /t=([\d.]+)/.exec(location.search);
  window.render(m ? +m[1] : 0);
  if (/play=1/.test(location.search)) { const st = performance.now(); const loop = async () => { await window.render(((performance.now() - st) / 1000) % window.DURATION); requestAnimationFrame(loop); }; loop(); }
}
