/* ============================================================
   USAGE  (end of the homepage)
   How often each tool is opened, over time, where visitors are, and
   what they use. Two sources, best first:

   1. assets/usage.json, written once a day by the "Update usage numbers"
      GitHub Action (.github/workflows/usage.yml, tools/build_usage.py)
      from the GoatCounter API. It is served by this site, so ad blockers
      do not stop it. Gives the line graphs, the world map and where visitors came from.
   2. If that file is not there yet: GoatCounter's public visitor counter
      (needs "Allow adding visitor counts on your website" in GoatCounter).
      Gives the line graph only.

   GoatCounter keeps no personal data: countries and referring sites only,
   never who someone is.
   ============================================================ */
const USAGE_SITE = "https://labpotato.goatcounter.com";
const USAGE_FILE = (typeof window !== "undefined" && window.USAGE_FILE) || "assets/usage.json";
const WORLD_FILE = (typeof window !== "undefined" && window.WORLD_FILE) || "assets/world.json";
const USAGE_LINK_BASE = (typeof window !== "undefined" && window.USAGE_LINK_BASE) || "";
const DAY = 864e5;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const utcDay = (d) => d.toISOString().slice(0, 10);
const utc0 = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const fmtD = (d) => `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
const nf = (v) => Math.round(v).toLocaleString("en");
const esc2 = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const toolPathOf = (t) => "/" + t.folder.replace(/^\/+|\/+$/g, "");
const liveTools = () => TOOLS.filter(t => t.versions && t.versions.length);

const RANGES = {
  week: { label: "Week", noun: "in the last 7 days", last: "today" },
  month: { label: "Month", noun: "in the last 30 days", last: "this week" },
  year: { label: "Year", noun: "in the last 12 months", last: "this month" },
  all: { label: "All time", noun: "since the start", last: "this month" },
};

/* ---------- source 1: the daily file ---------- */
let FILE = null;
async function loadFile() {
  if (FILE !== null) return FILE;
  if (typeof window !== "undefined" && window.USAGE_SAMPLE) return (FILE = window.USAGE_SAMPLE);
  try { const r = await fetch(USAGE_FILE, { cache: "no-cache" }); FILE = r.ok ? await r.json() : false; } catch (e) { FILE = false; }
  return FILE;
}
/* points for a range from daily counts: a point a day (week, month), a week (year) or a month (all time) */
function fromFile(f, range) {
  // the job runs early in the day (UTC), so today is only a few hours old: stop at yesterday
  const days = f.days, n = days.length - (days[days.length - 1] === String(f.generated || "").slice(0, 10) ? 1 : 0), idx = (k) => new Date(days[k] + "T00:00:00Z");
  let groups = [];
  if (range === "week" || range === "month") {
    const m = range === "week" ? 7 : 30;
    for (let k = n - m; k < n; k++) groups.push({ ks: [k], l: fmtD(idx(k)) });
  } else if (range === "year") {
    for (let e = n; e > n - 364; e -= 7) groups.unshift({ ks: Array.from({ length: 7 }, (_, j) => e - 7 + j), l: `wk of ${fmtD(idx(e - 7))}` });
  } else {
    const first = Math.max(0, days.findIndex((d, k) => Object.values(f.paths).some(p => p[k] > 0)));
    let cur = null;
    for (let k = first; k < n; k++) { const d = idx(k), key = d.getUTCFullYear() * 12 + d.getUTCMonth(); if (!cur || cur.key !== key) { cur = { key, ks: [], l: `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}` }; groups.push(cur); } cur.ks.push(k); }
  }
  const sumOf = (arr, g) => g.ks.reduce((a, k) => a + (arr && arr[k] || 0), 0);
  const rows = liveTools().map(t => { const p = f.paths[toolPathOf(t)]; const per = groups.map(g => sumOf(p, g)); return { id: t.id, per, sum: per.reduce((a, v) => a + v, 0) }; });
  const site = groups.map(g => Object.values(f.paths).reduce((a, p) => a + sumOf(p, g), 0));
  const last = { week: "yesterday", month: "yesterday", year: "last 7 days", all: "this month" }[range];
  return { range, src: "file", last, at: Date.parse(f.generated), labels: groups.map(g => g.l), rows, site, siteSum: site.reduce((a, v) => a + v, 0), stats: f.stats && f.stats[range], failed: 0, asked: 1 };
}

/* ---------- source 2: GoatCounter's public counter (tool lines only) ---------- */
const usageLog = [];
async function usageCount(path, start, end) {
  const q = new URLSearchParams(); if (start) q.set("start", start); if (end) q.set("end", end);
  q.set("cb", String(Math.floor(Date.now() / 6e5)));   // GoatCounter ignores it; stops the browser reusing an old answer
  const url = `${USAGE_SITE}/counter/${path === "TOTAL" ? "TOTAL" : encodePath(path)}.json?${q}`;
  try {
    const r = await fetch(url, { mode: "cors", credentials: "omit", cache: "no-store" });
    let j = null; try { j = await r.json(); } catch (e) { /* an error page */ }
    if (!j || j.count == null) { usageLog.push({ url, ok: false, why: `HTTP ${r.status}` + (r.status === 403 ? " (visitor counter switched off?)" : "") }); return { err: 1 }; }
    const n = +String(j.count).replace(/[^\d]/g, "") || 0; usageLog.push({ url, ok: true, why: `${r.status} → ${n}` }); return { n };
  } catch (e) { usageLog.push({ url, ok: false, why: "blocked or offline (ad blocker, or no answer)" }); return { err: 1 }; }
}
async function pool(jobs, size = 6) { const out = new Array(jobs.length); let i = 0; await Promise.all(Array.from({ length: Math.min(size, jobs.length) }, async () => { while (i < jobs.length) { const k = i++; out[k] = await jobs[k](); } })); return out; }
function counterBars(range) {
  // a bar runs from its first day to the first day of the next (GoatCounter's end date covers only its first hour)
  const t = utc0(new Date()), out = [];
  const months = (n) => { const now = new Date(); for (let k = n - 1; k >= 0; k--) { const a = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - k, 1)); out.push({ a, b: new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + 1, 1)), l: `${MON[a.getUTCMonth()]} ${a.getUTCFullYear()}` }); } };
  if (range === "week") for (let k = 6; k >= 0; k--) { const a = new Date(t - k * DAY); out.push({ a, b: new Date(+a + DAY), l: fmtD(a) }); }
  else if (range === "month") for (let k = 3; k >= 0; k--) { const b = new Date(+t + DAY - k * 7 * DAY), a = new Date(b - 7 * DAY); out.push({ a, b, l: `wk of ${fmtD(a)}` }); }
  else if (range === "year") months(12);
  else { const first = TOOLS.flatMap(x => x.versions.map(v => v.date)).filter(Boolean).sort()[0] || utcDay(new Date()); const f = new Date(first + "T00:00:00Z"), n = new Date(); months(Math.max(1, Math.min(24, (n.getUTCFullYear() - f.getUTCFullYear()) * 12 + n.getUTCMonth() - f.getUTCMonth() + 1))); }
  return out;
}
async function fromCounter(range, fresh) {
  const key = `lp-usage-v3:${range}`;
  if (!fresh) try { const c = JSON.parse(localStorage.getItem(key) || "null"); if (c && Date.now() - c.at < 3600e3) return c.data; } catch (e) { /* storage blocked */ }
  usageLog.length = 0;
  const bars = counterBars(range), tools = liveTools(), jobs = [];
  jobs.push(() => usageCount("TOTAL", utcDay(bars[0].a), utcDay(bars[bars.length - 1].b)));
  tools.forEach(t => bars.forEach(b => jobs.push(() => usageCount(toolPathOf(t), utcDay(b.a), utcDay(b.b)))));
  const res = await pool(jobs), failed = res.filter(r => r.err).length; let k = 1;
  const rows = tools.map(t => { const per = bars.map(() => res[k++].n || 0); return { id: t.id, per, sum: per.reduce((a, v) => a + v, 0) }; });
  const data = { range, src: "counter", at: Date.now(), labels: bars.map(b => b.l), rows, site: null, siteSum: res[0].n, stats: null, failed, asked: jobs.length };
  if (!failed) try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), data })); } catch (e) { /* storage blocked */ }
  return data;
}

/* ---------- drawing ---------- */
const css = (name, fb) => (getComputedStyle(document.documentElement).getPropertyValue(name) || "").trim() || fb;
const niceMax = (v) => { if (v <= 4) return 4; const p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; };

/* one line graph: every tool as a quiet grey line, the chosen one (or all tools together) in colour */
function lineChart(el, data, focus) {
  const W = 1000, H = 280, L = 46, R = 190, T = 16, B = 30, n = data.labels.length;
  const series = data.rows.map(r => ({ id: r.id, per: r.per, color: accentOf(TOOLS.find(t => t.id === r.id)), name: TOOLS.find(t => t.id === r.id).name }));
  const all = { id: "all", name: "All tools", per: data.labels.map((_, k) => data.rows.reduce((a, r) => a + r.per[k], 0)), color: css("--accent", "#0a5fd0") };
  const hi = focus === "all" ? all : series.find(s => s.id === focus) || all;
  const ymax = niceMax(Math.max(1, ...hi.per, ...(focus === "all" ? [] : series.flatMap(s => s.per))));
  const x = (k) => n === 1 ? L + (W - L - R) / 2 : L + k * (W - L - R) / (n - 1), y = (v) => T + (H - T - B) * (1 - v / ymax);
  const pathOf = (per) => per.map((v, k) => `${k ? "L" : "M"}${x(k).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const ticks = [0, ymax / 2, ymax];
  const xl = n <= 8 ? data.labels.map((_, k) => k) : [0, Math.round((n - 1) / 2), n - 1];
  const grid = css("--border", "#e6e5e1"), mute = css("--text-faint", "#8e929c"), quiet = css("--use-quiet", "#c9ccd3");
  const others = (focus === "all" ? series : series.filter(s => s !== hi)).map(s => `<path d="${pathOf(s.per)}" fill="none" stroke="${quiet}" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round"/>`).join("");
  const last = hi.per[n - 1];
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="use-svg" role="img" aria-label="${esc2(hi.name)}: ${hi.per.map((v, k) => `${data.labels[k]} ${v}`).join(", ")}">
    ${ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="${grid}" stroke-width="1"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" class="use-ax">${nf(v)}</text>`).join("")}
    ${xl.map(k => `<text x="${x(k)}" y="${H - 8}" text-anchor="${n > 1 && k === 0 ? "start" : n > 1 && k === n - 1 ? "end" : "middle"}" class="use-ax">${esc2(data.labels[k].replace(/^wk of /, ""))}</text>`).join("")}
    ${others}
    <path d="${pathOf(hi.per)}" fill="none" stroke="${hi.color}" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${x(n - 1)}" cy="${y(last)}" r="4" fill="${hi.color}" stroke="${css("--surface", "#fff")}" stroke-width="2"/>
    <text x="${x(n - 1) + 10}" y="${y(last) + 4}" class="use-dl">${esc2(hi.name)} · ${nf(last)}</text>
    <g class="use-hover" visibility="hidden"><line class="use-xh" y1="${T}" y2="${H - B}" stroke="${mute}" stroke-width="1" stroke-dasharray="3 3"/><circle class="use-hd" r="4.5" fill="${hi.color}" stroke="${css("--surface", "#fff")}" stroke-width="2"/></g>
    <rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent" class="use-hit"/>
  </svg><div class="use-tip" hidden></div>`;
  const svg = el.querySelector("svg"), tip = el.querySelector(".use-tip"), g = el.querySelector(".use-hover");
  const move = (ev) => {
    const r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * W / r.width;
    const k = Math.max(0, Math.min(n - 1, Math.round(n === 1 ? 0 : (px - L) / ((W - L - R) / (n - 1)))));
    g.setAttribute("visibility", "visible"); g.querySelector(".use-xh").setAttribute("x1", x(k)); g.querySelector(".use-xh").setAttribute("x2", x(k));
    const hd = g.querySelector(".use-hd"); hd.setAttribute("cx", x(k)); hd.setAttribute("cy", y(hi.per[k]));
    const top = series.map(s => [s.name, s.per[k], s.color]).sort((a, b) => b[1] - a[1]).slice(0, 4);
    tip.innerHTML = `<b>${esc2(data.labels[k])}</b><div class="use-tip-hi"><i style="background:${hi.color}"></i>${esc2(hi.name)}<span>${nf(hi.per[k])}</span></div>${focus === "all" ? top.map(([nm, v, c]) => `<div><i style="background:${c}"></i>${esc2(nm)}<span>${nf(v)}</span></div>`).join("") : ""}`;
    tip.hidden = false;
    const tx = (x(k) / W) * r.width, w = tip.offsetWidth; tip.style.left = Math.min(r.width - w - 4, Math.max(4, tx + 14 > r.width - w ? tx - w - 14 : tx + 14)) + "px"; tip.style.top = "10px";
  };
  svg.addEventListener("pointermove", move); svg.addEventListener("pointerleave", () => { g.setAttribute("visibility", "hidden"); tip.hidden = true; });
}

/* a tiny line for one tool, in its own colour (one series, so no legend needed), on a faint baseline with its first and last date */
function spark(per, color, labels) {
  const W = 160, H = 52, BASE = 38, n = per.length, mx = Math.max(1, ...per);
  const x = (k) => n === 1 ? W / 2 : 3 + k * (W - 6) / (n - 1), y = (v) => BASE - (BASE - 6) * v / mx;
  const d = per.map((v, k) => `${k ? "L" : "M"}${x(k).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const lab = (s) => esc2(String(s || "").replace(/^wk of /, "")), axis = css("--border", "#e6e5e1");
  return `<svg viewBox="0 0 ${W} ${H}" class="use-spark" aria-hidden="true">
    <line x1="3" x2="${W - 3}" y1="${BASE + .5}" y2="${BASE + .5}" stroke="${axis}" stroke-width="1"/>
    ${labels && n > 1 ? `<line x1="${x(0)}" x2="${x(0)}" y1="${BASE}" y2="${BASE + 3}" stroke="${axis}"/><line x1="${x(n - 1)}" x2="${x(n - 1)}" y1="${BASE}" y2="${BASE + 3}" stroke="${axis}"/>
    <text x="${x(0)}" y="${H - 2}" class="use-sx">${lab(labels[0])}</text><text x="${x(n - 1)}" y="${H - 2}" text-anchor="end" class="use-sx">${lab(labels[n - 1])}</text>` : ""}
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${x(n - 1)}" cy="${y(per[n - 1])}" r="3" fill="${color}"/></svg>`;
}

/* the world map: countries shaded by visitors, one blue, light (few) to dark (many) */
let WORLD = null;
async function world() { if (WORLD) return WORLD; if (typeof window !== "undefined" && window.USAGE_WORLD) return (WORLD = window.USAGE_WORLD); try { const r = await fetch(WORLD_FILE); WORLD = r.ok ? await r.json() : false; } catch (e) { WORLD = false; } return WORLD; }
async function drawMap(el, listEl, locs, wait) {
  const w = await world();
  const by = {}; (locs || []).forEach(l => { const id = String(l.id || "").slice(0, 2).toUpperCase(); if (id) by[id] = (by[id] || 0) + l.count; });
  const total = Object.values(by).reduce((a, v) => a + v, 0), mx = Math.max(1, ...Object.values(by));
  const ramp = css("--use-ramp", "#cde2fb #86b6ef #3987e5 #1c5cab #0d366b").split(/\s+/), none = css("--use-none", "#e7e9ee");
  const step = (v) => v ? ramp[Math.min(ramp.length - 1, Math.floor(ramp.length * Math.log(1 + v) / Math.log(1 + mx + 1e-9)))] : none;
  if (w) {
    el.innerHTML = `<svg viewBox="0 0 ${w.w} ${w.h}" class="use-map" role="img" aria-label="Visitors by country">${w.c.map(([id, name, d]) => `<path d="${d}" fill="${step(by[id] || 0)}" data-c="${id}" data-n="${esc2(name)}"/>`).join("")}${
      (w.dots || []).filter(([id]) => by[id]).map(([id, name, cx, cy]) => `<circle class="use-dot" cx="${cx}" cy="${cy}" r="4.5" fill="${step(by[id])}" data-c="${id}" data-n="${esc2(name)}"/>`).join("")}</svg><div class="use-tip" hidden></div>
      <div class="use-key"><span>fewer</span>${ramp.map(c => `<i style="background:${c}"></i>`).join("")}<span>more</span><span class="use-key-none"><i style="background:${none}"></i>no visits</span></div>`;
    const tip = el.querySelector(".use-tip"), svg = el.querySelector("svg");
    svg.addEventListener("pointermove", e => { const p = e.target.closest("path,circle"); if (!p) { tip.hidden = true; return; } const v = by[p.dataset.c] || 0; tip.innerHTML = `<b>${esc2(p.dataset.n)}</b><div>${v ? `${nf(v)} visit${v === 1 ? "" : "s"} · ${(100 * v / Math.max(1, total)).toFixed(v / total < .01 ? 1 : 0)}%` : "no visits"}</div>`; tip.hidden = false; const r = el.getBoundingClientRect(); tip.style.left = Math.min(r.width - tip.offsetWidth - 4, e.clientX - r.left + 12) + "px"; tip.style.top = Math.max(4, e.clientY - r.top - 44) + "px"; });
    svg.addEventListener("pointerleave", () => { tip.hidden = true; });
  } else el.innerHTML = `<p class="use-empty">The map could not be loaded.</p>`;
  const top = (locs || []).slice().sort((a, b) => b.count - a.count);
  listEl.innerHTML = top.length ? barList(top, 10, total, "country") : (wait && w ? "" : `<p class="use-empty">${wait || "No visits yet."}</p>`);
  if (wait && w) el.insertAdjacentHTML("beforeend", `<p class="use-wait">${wait}</p>`);
}

/* how people found the site: every referrer sorted into four groups.
   GoatCounter gives each one a name (a domain, or a grouped name such as "Google") and a kind:
   g = grouped (search engines and the like), c = campaign link, h = a link from a page; no name = direct */
const SEARCH = /(^|\.)(google|bing|duckduckgo|yahoo|baidu|naver|yandex|ecosia|brave|startpage|qwant|daum|kagi|perplexity|scholar)\b|google scholar|chatgpt|openai/i;
const SOCIAL = /instagram|facebook|(^|\.)fb\.|(^|\W)t\.co\b|twitter|(^|\.)x\.com|reddit|linkedin|lnkd|bsky|bluesky|threads|youtube|tiktok|kakao|discord|slack|telegram|whatsapp|wechat|weibo|mastodon|xiaohongshu|line\.me/i;
function srcGroup(x) {
  const nm = String(x.name || "").trim();
  if (!nm || /^\(?no referr?al\)?$/i.test(nm)) return "Direct";
  if (SEARCH.test(nm)) return "Search";
  if (SOCIAL.test(nm) || x.scheme === "c") return "Social";
  return "Other sites";
}
function drawSources(groupsEl, topEl, refs, wait) {
  refs = refs || [];
  const total = refs.reduce((a, x) => a + x.count, 0), by = { Search: 0, Social: 0, "Other sites": 0, Direct: 0 };
  refs.forEach(x => { by[srcGroup(x)] += x.count; });
  const hint = { Search: "Google, Bing, Naver …", Social: "Instagram, Reddit, X …", "Other sites": "links on other pages", Direct: "typed, bookmarked, or sent in a chat" };
  groupsEl.innerHTML = total ? `<ol class="use-bl">${Object.entries(by).sort((a, b) => b[1] - a[1]).map(([g, v]) =>
    `<li title="${g}: ${nf(v)} visits"><span class="use-bl-n"><b>${g}</b> <small>${hint[g]}</small></span><span class="use-bl-v">${(100 * v / total).toFixed(v && v / total < .1 ? 1 : 0)}%</span><span class="use-bl-b"><i style="width:${(100 * v / total).toFixed(1)}%"></i></span></li>`).join("")}</ol>` : `<p class="use-empty">${wait || "No visits yet."}</p>`;
  const named = refs.filter(x => srcGroup(x) !== "Direct").sort((a, b) => b.count - a.count);
  topEl.innerHTML = named.length ? barList(named.map(x => ({ name: x.name, count: x.count })), 6, total) : `<p class="use-empty">${wait ? "" : "No referring sites yet."}</p>`;
}

/* a short ranked list with share bars (one quiet hue), the rest folded into "Other" */
function barList(items, n, total, kind) {
  const sum = total || items.reduce((a, x) => a + x.count, 0) || 1, head = items.slice(0, n), rest = items.slice(n).reduce((a, x) => a + x.count, 0);
  const rows = head.map(x => [x.name || x.id || "(unknown)", x.count]); if (rest) rows.push(["Other", rest]);
  return `<ol class="use-bl">${rows.map(([nm, v]) => `<li title="${esc2(nm)}: ${nf(v)}"><span class="use-bl-n">${esc2(nm)}</span><span class="use-bl-v">${(100 * v / sum).toFixed(v / sum < .1 ? 1 : 0)}%</span><span class="use-bl-b"><i style="width:${(100 * v / sum).toFixed(1)}%"></i></span></li>`).join("")}</ol>`;
}

/* no country or source data yet (the daily report has not run): the panels are drawn empty, with a note */
function emptyDemo() {
  document.getElementById("usage-demo").hidden = false; document.getElementById("usage-src").hidden = false;
  drawMap(document.getElementById("usage-map"), document.getElementById("usage-countries"), [], "No country data yet · it is collected once a day");
  drawSources(document.getElementById("usage-src-groups"), document.getElementById("usage-src-top"), [], "No source data yet · it is collected once a day");
  document.getElementById("usage-geo-sum").textContent = "";
}
function renderUsage(data) {
  const sec = document.getElementById("usage"), R = Object.assign({}, RANGES[data.range], data.last ? { last: data.last } : {});
  const note = document.getElementById("usage-note"), box = document.getElementById("usage-grid"), foot = document.getElementById("usage-total");
  const chart = document.getElementById("usage-chart"), legend = document.getElementById("usage-legend"), demo = document.getElementById("usage-demo");
  if (data.src === "counter" && data.failed === data.asked) {
    [box, chart, legend].forEach(e => e.innerHTML = ""); sec.classList.add("use-off"); emptyDemo();
    note.hidden = false; note.innerHTML = `<b>The counts could not be loaded in this browser.</b> An ad or tracker blocker is the usual reason (it stops goatcounter.com, which counts the visits); nothing else on the site is affected. <button type="button" class="use-retry">Try again</button>`;
    foot.textContent = ""; usageDebug(); return;
  }
  sec.classList.remove("use-off");
  note.hidden = !data.failed; if (data.failed) note.innerHTML = `${data.failed} of ${data.asked} counts did not load, so some numbers may be low. <button type="button" class="use-retry">Try again</button>`;
  const rows = data.rows.slice().sort((a, b) => b.sum - a.sum), top = Math.max(1, ...rows.map(r => r.sum));
  // the line graph, with chips to pick which line is in colour
  const focus = sec.dataset.focus && (sec.dataset.focus === "all" || rows.some(r => r.id === sec.dataset.focus)) ? sec.dataset.focus : "all";
  legend.innerHTML = `<button type="button" data-focus="all" aria-pressed="${focus === "all"}"><i style="background:${css("--accent", "#0a5fd0")}"></i>All tools</button>` +
    rows.map(r => { const t = TOOLS.find(x => x.id === r.id); return `<button type="button" data-focus="${r.id}" aria-pressed="${focus === r.id}"><i style="background:${accentOf(t)}"></i>${esc2(t.name)}</button>`; }).join("");
  lineChart(chart, data, focus);
  // one row per tool with its own little line
  box.innerHTML = rows.map((r, ix) => {
    const t = TOOLS.find(x => x.id === r.id); if (!t) return "";
    const now = r.per[r.per.length - 1], before = r.per.length > 1 ? r.per[r.per.length - 2] : now, trend = now > before ? "up" : now < before ? "down" : "flat";
    return `<a class="use-row${focus === r.id ? " on" : ""}" data-row="${r.id}" style="--card:${accentOf(t)}" href="${USAGE_LINK_BASE}${toolPath(t, latestOf(t))}" target="_blank" rel="noopener" title="Open ${esc2(t.name)}">
      <span class="use-rank">${ix + 1}</span><span class="app-icon use-icon">${appGlyph(t)}</span>
      <span class="use-name"><b>${esc2(t.name)}</b><small>${esc2(t.short || t.tagline)}</small></span>
      <span class="use-bar" aria-hidden="true"><i style="width:${(100 * r.sum / top).toFixed(1)}%"></i></span>
      <span class="use-all"><b>${nf(r.sum)}</b><small>opened</small></span>
      ${spark(r.per, accentOf(t), data.labels)}
      <span class="use-now ${trend}" title="${R.last} vs the one before"><b>${nf(now)}</b><small>${R.last}</small></span></a>`;
  }).join("");
  // where visitors are
  if (data.stats) {
    demo.hidden = false; const s = data.stats, tot = (s.locations || []).reduce((a, x) => a + x.count, 0);
    drawMap(document.getElementById("usage-map"), document.getElementById("usage-countries"), s.locations);
    drawSources(document.getElementById("usage-src-groups"), document.getElementById("usage-src-top"), s.toprefs);
    document.getElementById("usage-src").hidden = false;
    document.getElementById("usage-geo-sum").textContent = tot ? `${nf(tot)} visits from ${(s.locations || []).length} countr${(s.locations || []).length === 1 ? "y" : "ies"} ${R.noun}` : "";
  } else emptyDemo();
  const sum = rows.reduce((a, r) => a + r.sum, 0), when = new Date(data.at), whenTxt = `${fmtD(when)}, ${when.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}`;
  foot.textContent = `${data.siteSum != null ? nf(data.siteSum) + " visits to the whole site · " : ""}${nf(sum)} tool openings ${R.noun} · ${data.src === "file" ? "updated daily, last " + whenTxt : "checked " + whenTxt}`;
  usageDebug();
}

/* add #usage-debug to the address to see every counter request and its answer */
function usageDebug() {
  const d = document.getElementById("usage-debug"); if (!d) return;
  const on = (/usage-debug/.test(location.hash) || d.dataset.always === "1") && usageLog.length; d.hidden = !on; if (!on) return;
  d.innerHTML = `<summary>Requests (${usageLog.filter(x => x.ok).length} answered, ${usageLog.filter(x => !x.ok).length} failed)</summary><ol>${usageLog.map(x => `<li class="${x.ok ? "ok" : "bad"}"><code>${esc2(x.url.replace(USAGE_SITE, ""))}</code> ${esc2(x.why)}</li>`).join("")}</ol>`;
}

function initUsage() {
  const sec = document.getElementById("usage"); if (!sec) return;
  sec.hidden = false;
  let range = "month";   // always opens on the last 30 days
  const seg = document.getElementById("usage-range"), box = document.getElementById("usage-grid");
  seg.innerHTML = Object.entries(RANGES).map(([k, r]) => `<button type="button" data-range="${k}" aria-pressed="${k === range}">${r.label}</button>`).join("");
  let current = null;
  const go = async (fresh) => {
    seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.range === range)));
    sec.classList.add("loading");
    const f = await loadFile();
    current = f ? fromFile(f, range) : await fromCounter(range, fresh);
    sec.classList.remove("loading"); renderUsage(current);
  };
  seg.addEventListener("click", e => { const b = e.target.closest("[data-range]"); if (!b || b.dataset.range === range) return; range = b.dataset.range; go(false); });
  sec.addEventListener("click", e => {
    if (e.target.closest(".use-retry")) { go(true); return; }
    const c = e.target.closest("[data-focus]"); if (c && current) { sec.dataset.focus = c.dataset.focus; renderUsage(current); }
  });
  // pointing at a tool's row shows its line in the graph
  box.addEventListener("pointerover", e => { const r = e.target.closest("[data-row]"); if (!r || !current || sec.dataset.hover === r.dataset.row) return; sec.dataset.hover = r.dataset.row; lineChart(document.getElementById("usage-chart"), current, r.dataset.row); });
  box.addEventListener("pointerleave", () => { if (!current) return; delete sec.dataset.hover; lineChart(document.getElementById("usage-chart"), current, sec.dataset.focus || "all"); });
  go(false);
}
initUsage();
