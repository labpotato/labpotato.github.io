/* Does the per-colony confidence score track whether the detection is actually correct?
   Usage:  node confidence.js ../colony-counter-v2.html                          */
const path = require('path');
const { loadCoreFromHtml, circleMask } = require('./harness.js');
const { makePlate } = require('./plates.js');

const core = loadCoreFromHtml(process.argv[2] || path.join(__dirname, '..', 'colony-counter-v2.html'));

// Plates chosen so that the detector makes genuine mistakes; a suite it gets perfectly right
// cannot tell us whether the score is worth anything.
const CASES = [
  ['very faint c14',  { seed: 51, n: 80, contrast: 14, agar: [120, 116, 100], rMean: 9, noise: 4 }],
  ['faint + noise12', { seed: 52, n: 80, contrast: 20, agar: [120, 116, 100], rMean: 9, noise: 12 }],
  ['scratch + marker',{ seed: 22, n: 70, contrast: 55, agar: [115, 110, 95], rMean: 9, scratch: true, markerStroke: true }],
  ['fused triples',   { seed: 53, n: 30, triples: 12, pairSep: 1.05, contrast: 55, agar: [115, 110, 95], rMean: 9 }],
  ['confluent n300',  { seed: 54, n: 300, contrast: 55, agar: [115, 110, 95], rMean: 8, minGap: 1.02 }],
  ['clean control',   { seed: 11, n: 90, contrast: 55, agar: [110, 104, 90], rMean: 9 }]
];

const mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN;
let allRight = [], allWrong = [];

console.log('plate'.padEnd(18) + 'truth'.padStart(6) + 'obj'.padStart(5) + 'right'.padStart(6) + 'wrong'.padStart(6) +
            '   mean score right / wrong');
for (const [nm, o] of CASES) {
  const p = makePlate(o);
  const mask = circleMask(p.w, p.h, p.roi, 0);
  const r = core.detect({ data: p.data, w: p.w, h: p.h, validMask: mask, sensitivity: 50, splitTouching: true });
  const tol = Math.max(6, (o.rMean || 9) * 0.9);
  const used = new Array(r.colonies.length).fill(false);
  for (const t of p.colonies) {
    let best = -1, bd = tol;
    r.colonies.forEach((c, i) => { if (used[i]) return; const d = Math.hypot(c.x - t.x, c.y - t.y); if (d < bd) { bd = d; best = i; } });
    if (best >= 0) used[best] = true;
  }
  const right = r.colonies.filter((c, i) => used[i]).map(c => c.conf);
  const wrong = r.colonies.filter((c, i) => !used[i]).map(c => c.conf);
  allRight = allRight.concat(right); allWrong = allWrong.concat(wrong);
  console.log(nm.padEnd(18) + String(p.truth).padStart(6) + String(r.colonies.length).padStart(5) +
    String(right.length).padStart(6) + String(wrong.length).padStart(6) +
    '   ' + mean(right).toFixed(3) + '  /  ' + (wrong.length ? mean(wrong).toFixed(3) : '  --  '));
}

console.log('');
console.log('overall: ' + allRight.length + ' right (mean ' + mean(allRight).toFixed(3) + '), ' +
            allWrong.length + ' wrong (mean ' + (allWrong.length ? mean(allWrong).toFixed(3) : '--') + ')');
console.log('');
console.log('cut-off   flags this share of the mistakes   flags this share of the correct ones');
for (const t of [0.3, 0.4, 0.5, 0.6, 0.7]) {
  console.log('  ' + t.toFixed(2) + '     ' +
    (100 * allWrong.filter(v => v < t).length / Math.max(1, allWrong.length)).toFixed(0).padStart(20) + '%' +
    (100 * allRight.filter(v => v < t).length / allRight.length).toFixed(0).padStart(36) + '%');
}
