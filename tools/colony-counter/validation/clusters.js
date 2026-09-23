/* Do the cluster passes actually recover colonies that have grown into each other?
   Usage:  node clusters.js ../colony-counter-v2.html                             */
const path = require('path');
const { loadCoreFromHtml, circleMask, match } = require('./harness.js');
const { makePlate } = require('./plates.js');

const core = loadCoreFromHtml(process.argv[2] || path.join(__dirname, '..', 'colony-counter-v2.html'));

// "sep" is the distance between colony centres as a multiple of the colony radius.
// 2.0 = just touching; 1.1 = overlapping by nearly half a radius; 0.85 = heavily fused.
const CASES = [
  ['pairs, sep 1.4',        { seed: 61, n: 40, contrast: 55, agar: [115, 110, 95], rMean: 9, clusters: [{ k: 2, count: 14, sep: 1.4 }] }],
  ['pairs, sep 1.1',        { seed: 62, n: 40, contrast: 55, agar: [115, 110, 95], rMean: 9, clusters: [{ k: 2, count: 14, sep: 1.1 }] }],
  ['pairs, sep 0.85',       { seed: 63, n: 40, contrast: 55, agar: [115, 110, 95], rMean: 9, clusters: [{ k: 2, count: 14, sep: 0.85 }] }],
  ['triples, sep 1.1',      { seed: 64, n: 35, contrast: 55, agar: [115, 110, 95], rMean: 9, clusters: [{ k: 3, count: 10, sep: 1.1 }] }],
  ['clusters of 4',         { seed: 65, n: 30, contrast: 55, agar: [115, 110, 95], rMean: 9, clusters: [{ k: 4, count: 8, sep: 1.1 }] }],
  ['clusters of 6',         { seed: 66, n: 25, contrast: 55, agar: [115, 110, 95], rMean: 9, clusters: [{ k: 6, count: 6, sep: 1.15 }] }],
  ['clusters of 8',         { seed: 67, n: 20, contrast: 55, agar: [115, 110, 95], rMean: 9, clusters: [{ k: 8, count: 5, sep: 1.2 }] }],
  ['low-res r3 + pairs',    { seed: 68, n: 30, contrast: 55, agar: [115, 110, 95], rMean: 3, rSd: 0.5, w: 520, h: 520, edgeSoft: 0.9, clusters: [{ k: 2, count: 12, sep: 1.2 }] }],
  ['low-res r2.5 + triples',{ seed: 69, n: 25, contrast: 55, agar: [115, 110, 95], rMean: 2.5, rSd: 0.4, w: 480, h: 480, edgeSoft: 0.8, clusters: [{ k: 3, count: 9, sep: 1.2 }] }],
  ['low-res r2, crowded',   { seed: 70, n: 90, contrast: 55, agar: [115, 110, 95], rMean: 2, rSd: 0.3, w: 440, h: 440, edgeSoft: 0.7, minGap: 1.15 }],
  ['faint triples',         { seed: 71, n: 30, contrast: 24, agar: [120, 116, 100], rMean: 8, noise: 3.5, clusters: [{ k: 3, count: 10, sep: 1.1 }] }]
];

const off = process.argv.includes('--no-clusters');
console.log('cluster passes: ' + (off ? 'OFF' : 'on') + '\n');
console.log('plate'.padEnd(26) + 'truth'.padStart(6) + 'count'.padStart(7) + 'err%'.padStart(8) +
            'TP'.padStart(5) + 'FP'.padStart(5) + 'FN'.padStart(5) + '   outline  area');
console.log('-'.repeat(82));
let sAbs = 0, k = 0, sTP = 0, sFP = 0, sFN = 0;
for (const [nm, o] of CASES) {
  const p = makePlate(o);
  const mask = circleMask(p.w, p.h, p.roi, 0);
  const r = core.detect({ data: p.data, w: p.w, h: p.h, validMask: mask, sensitivity: 50,
                          splitTouching: true, upscale: 'auto', resolveClusters: !off });
  const tot = r.colonies.reduce((s, c) => s + (c.n || 1), 0);
  const m = match(r.colonies, p.colonies, Math.max(4, (o.rMean || 9) * 1.0));
  const e = 100 * (tot - p.truth) / p.truth;
  sAbs += Math.abs(e); k++; sTP += m.tp; sFP += m.fp; sFN += m.fn;
  console.log(nm.padEnd(26) + String(p.truth).padStart(6) + String(tot).padStart(7) +
    ((e >= 0 ? '+' : '') + e.toFixed(1)).padStart(8) +
    String(m.tp).padStart(5) + String(m.fp).padStart(5) + String(m.fn).padStart(5) +
    String(r.diag.frstResolved || 0).padStart(10) + String(r.diag.coverResolved || 0).padStart(6));
}
const prec = sTP / (sTP + sFP), rec = sTP / (sTP + sFN);
console.log('-'.repeat(82));
console.log('mean |count error| ' + (sAbs / k).toFixed(2) + '%    precision ' + (100 * prec).toFixed(1) +
  '%    recall ' + (100 * rec).toFixed(1) + '%    F1 ' + (100 * 2 * prec * rec / (prec + rec)).toFixed(1) + '%');
console.log('\n"outline" and "area" count the colonies recovered by the second and third passes.');
console.log('Run with --no-clusters to see what the distance transform alone manages.');
