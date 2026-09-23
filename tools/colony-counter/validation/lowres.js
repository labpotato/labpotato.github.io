/* Does the low-resolution boost actually help, or does it only look like it?
   Usage:  node lowres.js ../colony-counter-v2.html                             */
const path = require('path');
const { loadCoreFromHtml, circleMask, match } = require('./harness.js');
const { makePlate } = require('./plates.js');

const core = loadCoreFromHtml(process.argv[2] || path.join(__dirname, '..', 'colony-counter-v2.html'));

const CASES = [
  ['tiny r2.2  n60',    { seed: 41, n: 60, contrast: 55, agar: [115, 110, 95], rMean: 2.2, rSd: 0.5, w: 500, h: 500, edgeSoft: 0.9 }],
  ['tiny r1.8  n50',    { seed: 42, n: 50, contrast: 55, agar: [115, 110, 95], rMean: 1.8, rSd: 0.4, w: 420, h: 420, edgeSoft: 0.8 }],
  ['tiny r2.5 + pairs', { seed: 43, n: 30, pairs: 10, contrast: 55, agar: [115, 110, 95], rMean: 2.5, rSd: 0.4, w: 520, h: 520, edgeSoft: 0.9 }],
  ['tiny r3.0 faint',   { seed: 44, n: 55, contrast: 26, agar: [120, 116, 100], rMean: 3.0, rSd: 0.6, w: 560, h: 560, noise: 3 }],
  ['normal r9 control', { seed: 11, n: 90, contrast: 55, agar: [110, 104, 90], rMean: 9 }]
];

console.log('count / colonies matched to a real one / applied factor / time');
console.log('');
console.log('plate'.padEnd(20) + 'truth'.padStart(6) + ['off', 'auto', '2x', '3x'].map(s => s.padStart(20)).join(''));
for (const [nm, o] of CASES) {
  const p = makePlate(o);
  const mask = circleMask(p.w, p.h, p.roi, 0);
  let line = nm.padEnd(20) + String(p.truth).padStart(6);
  for (const u of [1, 'auto', 2, 3]) {
    const t0 = Date.now();
    const r = core.detect({ data: p.data, w: p.w, h: p.h, validMask: mask, sensitivity: 50, splitTouching: true, upscale: u });
    const ms = Date.now() - t0;
    const m = match(r.colonies, p.colonies, Math.max(4, (o.rMean || 9) * 1.2));
    const tot = r.colonies.reduce((s, c) => s + (c.n || 1), 0);
    line += (tot + '/' + m.tp + '/' + (r.diag.upscale || 1) + 'x/' + ms + 'ms').padStart(20);
  }
  console.log(line);
}
console.log('');
console.log('The count column can be right while the matched column is wrong: an unresolved pair');
console.log('counted as a clump of two lands the total correctly and gets both positions wrong.');
