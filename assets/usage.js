/* ============================================================
   USAGE  (end of the homepage)
   How often each tool has been opened, all time and per month,
   read from GoatCounter's public visitor counter. No cookies, no
   accounts: it is the same page count GoatCounter already keeps.

   Needs one switch in GoatCounter (labpotato.goatcounter.com →
   Settings → "Allow adding visitor counts on your website").
   While it is off, the section simply stays hidden.
   GoatCounter caches these numbers for up to four hours.
   ============================================================ */
const USAGE_SITE = "https://labpotato.goatcounter.com";
const USAGE_MONTHS = 6;
const USAGE_CACHE = "lp-usage-v1";

// GoatCounter answers {"count":"1,234",...}; a page with no views yet answers 404 with a count of 0
async function usageCount(path, start, end) {
  const q = new URLSearchParams();
  if (start) q.set("start", start);
  if (end) q.set("end", end);
  const url = `${USAGE_SITE}/counter/${path === "TOTAL" ? "TOTAL" : encodePath(path)}.json${q.toString() ? "?" + q : ""}`;
  const r = await fetch(url, { mode: "cors", credentials: "omit" });
  let j = null;
  try { j = await r.json(); } catch (e) { /* not JSON: the counter is switched off */ }
  if (!j || j.count == null) throw new Error("counter off");
  return +String(j.count).replace(/[^\d]/g, "") || 0;
}

const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// the last USAGE_MONTHS calendar months, oldest first, this month last
function usageMonths() {
  const now = new Date(), out = [];
  for (let k = USAGE_MONTHS - 1; k >= 0; k--) {
    const a = new Date(now.getFullYear(), now.getMonth() - k, 1);
    const b = new Date(now.getFullYear(), now.getMonth() - k + 1, 0);
    out.push({ label: a.toLocaleString("en", { month: "short" }), start: isoDay(a), end: isoDay(b) });
  }
  return out;
}

async function loadUsage() {
  try {
    const c = JSON.parse(localStorage.getItem(USAGE_CACHE) || "null");
    if (c && Date.now() - c.at < 3 * 3600e3) return c.data;   // GoatCounter itself refreshes every few hours
  } catch (e) { /* storage blocked */ }
  const months = usageMonths();
  const total = await usageCount("TOTAL");                    // fails fast if the counter is switched off
  const rows = await Promise.all(TOOLS.filter(t => t.versions && t.versions.length).map(async (t) => {
    const path = "/" + t.folder.replace(/^\/+|\/+$/g, "");
    const [all, ...per] = await Promise.all([usageCount(path), ...months.map(m => usageCount(path, m.start, m.end))]);
    return { id: t.id, all, per };
  }));
  const data = { total, months: months.map(m => m.label), rows };
  try { localStorage.setItem(USAGE_CACHE, JSON.stringify({ at: Date.now(), data })); } catch (e) { /* storage blocked */ }
  return data;
}

function renderUsage(data) {
  const sec = document.getElementById("usage"), box = document.getElementById("usage-grid");
  if (!sec || !box || !data) return;
  const rows = data.rows.slice().sort((a, b) => b.all - a.all);
  const top = Math.max(1, ...rows.map(r => r.all));
  const n = (v) => v.toLocaleString("en");
  box.innerHTML = rows.map((r, ix) => {
    const t = TOOLS.find(x => x.id === r.id); if (!t) return "";
    const now = r.per[r.per.length - 1], before = r.per[r.per.length - 2] || 0;
    const trend = now > before ? "up" : now < before ? "down" : "flat";
    const peak = Math.max(1, ...r.per);   // each tool on its own scale, so the shape shows its trend
    return `<a class="use-row reveal in" style="--card:${accentOf(t)}" href="${toolPath(t, latestOf(t))}" target="_blank" rel="noopener" title="Open ${t.name}">
      <span class="use-rank">${ix + 1}</span>
      <span class="app-icon use-icon">${appGlyph(t)}</span>
      <span class="use-name"><b>${t.name}</b><small>${t.short || t.tagline}</small></span>
      <span class="use-bar" aria-hidden="true"><i style="width:${(100 * r.all / top).toFixed(1)}%"></i></span>
      <span class="use-all"><b>${n(r.all)}</b><small>opened</small></span>
      <span class="use-months" role="img" aria-label="${data.months.map((m, k) => `${m}: ${r.per[k]}`).join(", ")}">${r.per.map((v, k) =>
        `<span class="use-m" title="${data.months[k]}: ${n(v)}"><i style="height:${v ? Math.max(6, 100 * v / peak).toFixed(1) : 0}%"></i><small>${data.months[k][0]}</small></span>`).join("")}</span>
      <span class="use-now ${trend}" title="This month vs last month"><b>${n(now)}</b><small>this month</small></span>
    </a>`;
  }).join("");
  const sum = rows.reduce((a, r) => a + r.all, 0);
  const tl = document.getElementById("usage-total");
  if (tl) tl.textContent = `${n(data.total)} visits to the whole site · ${n(sum)} tool openings`;
  sec.hidden = false;
}

loadUsage().then(renderUsage).catch(() => { /* counter switched off or offline: keep the section hidden */ });
