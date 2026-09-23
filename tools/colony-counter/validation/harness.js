/* ============================================================
   Colony Counter — accuracy harness
   Runs the detection core that ships inside the tool's HTML against a set of
   synthetic plates whose colony count and colony positions are known exactly,
   and reports the count error and the per-colony precision and recall.

   Usage:   node harness.js ../colony-counter-v2.html
            node harness.js ../colony-counter-v2.html --sensitivity 70
            node harness.js ../colony-counter-v2.html --reject --margin 3

   Needs nothing but Node. It reads the HTML, pulls the worker block out of it
   and evaluates that, so it always tests the file that is actually published
   rather than a copy that can drift away from it.
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { makePlate } = require('./plates.js');

function loadCoreFromHtml(file) {
  const html = fs.readFileSync(file, 'utf8');
  const m = html.match(/<script id="workerSrc"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('no <script id="workerSrc"> block in ' + file);
  const stub = { onmessage: null, postMessage() {} };
  return new Function('self', m[1] + '\n;return { detect };')(stub);
}

function circleMask(w, h, c, shrink) {
  const m = new Uint8Array(w * h), r = c.r * (1 - (shrink || 0));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = (Math.hypot(x - c.cx, y - c.cy) <= r) ? 1 : 0;
  return m;
}

// greedy one-to-one match of detections to true colonies within a tolerance
function match(det, truth, tol) {
  const used = new Array(det.length).fill(false);
  let tp = 0;
  for (const t of truth) {
    let best = -1, bd = tol;
    for (let i = 0; i < det.length; i++) {
      if (used[i]) continue;
      const d = Math.hypot(det[i].x - t.x, det[i].y - t.y);
      if (d < bd) { bd = d; best = i; }
    }
    if (best >= 0) { used[best] = true; tp++; }
  }
  return { tp, fp: det.length - tp, fn: truth.length - tp };
}

const SUITE = [
  { name: 'white/dark agar, isolated',    o: { seed: 11, n: 90,  contrast:  55, agar: [110, 104, 90],  rMean: 9 } },
  { name: 'dark colonies, pale agar',     o: { seed: 12, n: 85,  contrast: -55, agar: [205, 200, 185], rMean: 9 } },
  { name: 'faint colonies (low contrast)',o: { seed: 13, n: 80,  contrast:  22, agar: [120, 116, 100], rMean: 9, noise: 3.5 } },
  { name: 'strong illumination gradient', o: { seed: 14, n: 85,  contrast:  50, agar: [150, 145, 128], rMean: 9, gradient: 0.55, vignette: 0.5 } },
  { name: 'chromogenic (blue colonies)',  o: { seed: 15, n: 80,  contrast:  45, agar: [190, 186, 170], rMean: 9, colonyTint: [-0.9, -0.2, 1.0] } },
  { name: 'small colonies (r~5px)',       o: { seed: 16, n: 120, contrast:  50, agar: [120, 115, 100], rMean: 5, rSd: 1.0 } },
  { name: 'large colonies (r~16px)',      o: { seed: 17, n: 40,  contrast:  55, agar: [120, 115, 100], rMean: 16, rSd: 3 } },
  { name: 'touching pairs x12',           o: { seed: 18, n: 50,  pairs: 12,   contrast: 55, agar: [115, 110, 95], rMean: 9 } },
  { name: 'touching triples x8',          o: { seed: 19, n: 45,  triples: 8,  contrast: 55, agar: [115, 110, 95], rMean: 9 } },
  { name: 'crowded plate (n=220)',        o: { seed: 20, n: 220, contrast: 55, agar: [115, 110, 95], rMean: 7, minGap: 1.15 } },
  { name: 'sparse plate (n=12)',          o: { seed: 21, n: 12,  contrast: 55, agar: [115, 110, 95], rMean: 10 } },
  { name: 'scratch + marker artefacts',   o: { seed: 22, n: 70,  contrast: 55, agar: [115, 110, 95], rMean: 9, scratch: true, markerStroke: true } },
  { name: 'high resolution (1800px)',     o: { seed: 23, n: 90,  contrast: 55, agar: [115, 110, 95], rMean: 18, rSd: 4, w: 1800, h: 1800 } },
  { name: 'low resolution (600px)',       o: { seed: 24, n: 70,  contrast: 55, agar: [115, 110, 95], rMean: 6, rSd: 1.5, w: 600, h: 600 } },
  { name: 'noisy sensor (sigma 8)',       o: { seed: 25, n: 80,  contrast: 50, agar: [115, 110, 95], rMean: 9, noise: 8 } },
  { name: 'isoluminant red colonies',     o: { seed: 26, n: 80,  contrast: 60, agar: [150, 150, 150], rMean: 9, colonyTint: [1.0, -0.52, -0.48] } },
  { name: 'very large photo (2600px)',    o: { seed: 27, n: 90,  contrast: 55, agar: [115, 110, 95], rMean: 26, rSd: 5, w: 2600, h: 2600 } }
];

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? +process.argv[i + 1] : dflt;
}

const file = process.argv[2] || path.join(__dirname, '..', 'colony-counter-v2.html');
const core = loadCoreFromHtml(file);
const sensitivity = arg('sensitivity', 50);
const shrink = arg('margin', 0) / 100;
const rejectElongated = process.argv.includes('--reject');

console.log('core: ' + path.basename(file) + '   sensitivity ' + sensitivity +
  '   edge margin ' + (shrink * 100).toFixed(0) + '%' + (rejectElongated ? '   rejectElongated' : ''));
console.log('');
console.log('plate'.padEnd(34) + 'truth'.padStart(6) + 'count'.padStart(7) + 'err%'.padStart(8) +
            'TP'.padStart(5) + 'FP'.padStart(5) + 'FN'.padStart(5) + '  mode     ms');
console.log('-'.repeat(86));

let sumAbs = 0, k = 0, sTP = 0, sFP = 0, sFN = 0;
for (const t of SUITE) {
  const p = makePlate(t.o);
  const mask = circleMask(p.w, p.h, p.roi, shrink);
  const t0 = Date.now();
  const r = core.detect({
    data: p.data, w: p.w, h: p.h, validMask: mask,
    sensitivity, splitTouching: true, rejectElongated
  });
  const ms = Date.now() - t0;
  const counted = r.colonies.reduce((s, c) => s + (c.n || 1), 0);
  const m = match(r.colonies, p.colonies, Math.max(6, (t.o.rMean || 9) * 0.9));
  const e = 100 * (counted - p.truth) / p.truth;
  sumAbs += Math.abs(e); k++; sTP += m.tp; sFP += m.fp; sFN += m.fn;
  console.log(t.name.padEnd(34) + String(p.truth).padStart(6) + String(counted).padStart(7) +
    ((e >= 0 ? '+' : '') + e.toFixed(1)).padStart(8) +
    String(m.tp).padStart(5) + String(m.fp).padStart(5) + String(m.fn).padStart(5) +
    '  ' + String(r.diag.mode).padEnd(8) + String(ms).padStart(5));
}
const prec = sTP / (sTP + sFP), rec = sTP / (sTP + sFN);
console.log('-'.repeat(86));
console.log('mean |count error| ' + (sumAbs / k).toFixed(2) + '%    precision ' + (100 * prec).toFixed(1) +
  '%    recall ' + (100 * rec).toFixed(1) + '%    F1 ' + (100 * 2 * prec * rec / (prec + rec)).toFixed(1) + '%');
