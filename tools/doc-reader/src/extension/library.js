/* every page with highlights, comments or edits, newest first; open, export or remove */
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
let PAGES = [];
const md = p => `# ${p.title || p.url}\n\n<${p.url}>\n\n` + ((p.pageNote || "").trim() ? `**Page note:** ${p.pageNote.trim()}\n\n` : "") + p.marks.map(m => `> ${m.quote.exact}\n${m.note ? `\n${m.note}\n` : ""}`).join("\n") + (p.edits.length ? `\n_${p.edits.length} paragraph(s) edited on the page._\n` : "");
function download(text, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/markdown" })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); }
async function load() {
  const all = await chrome.storage.local.get(null);
  PAGES = Object.entries(all).filter(([k, v]) => k.startsWith("lp:") && !["lp:settings", "lp:syncState", "lp:backupState", "lp:drive", "lp:tomb"].includes(k) && v && v.url).map(([k, v]) => ({ key: k, ...v, marks: v.marks || [], edits: v.edits || [] })).sort((a, b) => (b.updated || 0) - (a.updated || 0));
  document.getElementById("btnOn").checked = (all["lp:settings"] || {}).button !== false;
  try { const b = await chrome.storage.local.getBytesInUse(null); document.getElementById("usage").textContent = `${PAGES.length} page${PAGES.length === 1 ? "" : "s"} · ${(b / 1024).toFixed(0)} KB kept in this browser's extension storage (chrome.storage.local). Back up to keep a copy outside the browser.`; } catch (e) {}
  draw();
}
function draw() {
  const q = document.getElementById("q").value.toLowerCase().trim(), box = document.getElementById("list");
  const list = PAGES.filter(p => !q || (p.title + " " + p.url + " " + p.marks.map(m => m.quote.exact + " " + m.note).join(" ")).toLowerCase().includes(q));
  box.innerHTML = list.length ? list.map(p => `<div class="page" data-k="${esc(p.key)}"><h2><a href="${esc(p.url)}" target="_blank">${esc(p.title || p.url)}</a></h2><div class="url">${esc(p.url)}</div>
    <div class="meta">${p.marks.length} highlight${p.marks.length === 1 ? "" : "s"}${p.edits.length ? ` · ${p.edits.length} edit${p.edits.length === 1 ? "" : "s"}` : ""} · ${new Date(p.updated || p.created).toLocaleString()}</div>
    ${(p.pageNote || "").trim() ? `<div class="pn">📝 ${esc(p.pageNote.trim().slice(0, 300))}</div>` : ""}${p.marks.slice(0, 4).map(m => `<div class="q" style="--c:${esc(m.color)}">${esc(m.quote.exact.slice(0, 200))}${m.note ? `<div class="n">💬 ${esc(m.note)}</div>` : ""}</div>`).join("")}${p.marks.length > 4 ? `<div class="meta">and ${p.marks.length - 4} more</div>` : ""}
    <div class="row"><a class="btn" href="${esc(p.url)}" target="_blank">Open the page</a><button data-a="md">Export Markdown</button><button data-a="del" class="danger">Remove</button></div></div>`).join("")
    : `<p class="empty">${PAGES.length ? "Nothing matches." : "Nothing yet. On any page, select text and press Highlight."}</p>`;
}
document.getElementById("list").addEventListener("click", async e => {
  const b = e.target.closest("button[data-a]"); if (!b) return; const k = b.closest(".page").dataset.k, p = PAGES.find(x => x.key === k);
  if (b.dataset.a === "md") download(md(p), (p.title || "page").replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 60) + "_notes.md");
  if (b.dataset.a === "del" && confirm("Remove the highlights, comments and edits kept for this page?")) { await chrome.storage.local.remove(k); load(); }
});
document.getElementById("q").addEventListener("input", draw);
/* back up and restore: every page's marks plus the settings, as one JSON file */
document.getElementById("backup").addEventListener("click", async () => {
  const all = await chrome.storage.local.get(null), data = Object.fromEntries(Object.entries(all).filter(([k]) => k.startsWith("lp:") && !["lp:syncState", "lp:backupState", "lp:drive", "lp:tomb"].includes(k)));
  const blob = new Blob([JSON.stringify({ format: "lab-potato-doc-reader-backup", version: 1, savedAt: new Date().toISOString(), data }, null, 1)], { type: "application/json" }), name = "lab_potato_highlights_" + new Date().toISOString().slice(0, 10) + ".json";
  if (window.showSaveFilePicker) { try { const h = await showSaveFilePicker({ suggestedName: name, types: [{ description: "Lab Potato backup", accept: { "application/json": [".json"] } }] }); const w = await h.createWritable(); await w.write(blob); await w.close(); return; } catch (e) { if (e.name === "AbortError") return; } }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); });
/* sync and the daily backup file: switches and how they are doing */
const when = t => t ? new Date(t).toLocaleString() : "never";
async function drawKeep() {
  const all = await chrome.storage.local.get(["lp:settings", "lp:syncState", "lp:backupState"]), s = all["lp:settings"] || {}, ss = all["lp:syncState"], bs = all["lp:backupState"];
  document.getElementById("syncOn").checked = s.sync !== false; document.getElementById("bkOn").checked = s.autoBackup !== false;
  let used = 0; try { used = await chrome.storage.sync.getBytesInUse(null); } catch (e) {}
  const sy = document.getElementById("syncSt"); sy.className = "kst" + (ss && !ss.ok ? " bad" : "");
  sy.textContent = s.sync === false ? "Off: highlights stay on this computer." : `${(used / 1024).toFixed(1)} KB of 100 KB used · last synced ${when(ss && ss.at)}${ss && !ss.ok ? " · " + ss.error : ""}`;
  const bk = document.getElementById("bkSt"); bk.className = "kst" + (bs && !bs.ok ? " bad" : "");
  bk.textContent = s.autoBackup === false ? "Off" : `Last saved ${when(bs && bs.at)}${bs && !bs.ok ? " · " + bs.error : ""}`;
}
async function setOpt(k, v) { const s = (await chrome.storage.local.get("lp:settings"))["lp:settings"] || {}; s[k] = v; await chrome.storage.local.set({ "lp:settings": s }); drawKeep(); }
document.getElementById("syncOn").addEventListener("change", e => setOpt("sync", e.target.checked));
document.getElementById("bkOn").addEventListener("change", e => setOpt("autoBackup", e.target.checked));
document.getElementById("syncNow").addEventListener("click", async () => { await chrome.runtime.sendMessage({ t: "syncNow" }); drawKeep(); });
document.getElementById("bkNow").addEventListener("click", async () => { const r = await chrome.runtime.sendMessage({ t: "backupNow" }); drawKeep(); if (!r || !r.ok) alert("The backup file could not be saved. Use Save a copy as… instead."); });
chrome.storage.onChanged.addListener((ch, area) => { if (ch["lp:syncState"] || ch["lp:backupState"] || area === "sync") drawKeep(); });
drawKeep();
/* Google Drive */
async function drawDrive() {
  const d = (await chrome.storage.local.get("lp:drive"))["lp:drive"] || {}, info = await chrome.runtime.sendMessage({ t: "driveRedirect" });
  document.getElementById("dRedir").textContent = info.url; document.getElementById("dExt").textContent = info.id;
  if (!document.getElementById("dCid").value) document.getElementById("dCid").value = d.clientId || "";
  const on = !!d.on, st = document.getElementById("dSt"), dot = document.getElementById("gdot");
  dot.className = "gdot" + (on && !d.error ? " on" : d.error ? " bad" : "");
  st.className = "kst" + (d.error ? " bad" : "");
  st.textContent = on ? `Signed in${d.email ? " as " + d.email : ""} · last synced ${when(d.lastSync)}${d.pages != null ? ` · ${d.pages} page${d.pages === 1 ? "" : "s"}` : ""}${d.error ? " · " + d.error : ""}` : d.error ? d.error : "Not signed in";
  document.getElementById("dIn").hidden = on; document.getElementById("dSync").hidden = !on; document.getElementById("dOut").hidden = !on;
  if (!d.clientId && !on) document.getElementById("dSetup").open = true;
}
document.getElementById("dCidSave").addEventListener("click", async () => { const v = document.getElementById("dCid").value.trim(); const d = (await chrome.storage.local.get("lp:drive"))["lp:drive"] || {}; d.clientId = v; await chrome.storage.local.set({ "lp:drive": d }); drawDrive(); });
document.getElementById("dIn").addEventListener("click", async e => { e.target.disabled = true; e.target.textContent = "Signing in…"; const r = await chrome.runtime.sendMessage({ t: "driveSignIn" }); e.target.disabled = false; e.target.textContent = "Sign in with Google"; if (!r || !r.ok) alert("Google sign-in did not finish: " + ((r && r.error) || "unknown error") + (/not set up/.test(r && r.error || "") ? "\n\nOpen Setup below and paste the OAuth client ID first." : "")); drawDrive(); load(); });
document.getElementById("dSync").addEventListener("click", async () => { const r = await chrome.runtime.sendMessage({ t: "driveSync" }); drawDrive(); load(); if (r && r.ok && r.got) alert(`${r.got} page${r.got === 1 ? "" : "s"} brought in from your other computers.`); });
document.getElementById("dOut").addEventListener("click", async () => { if (!confirm("Sign out of Google Drive sync? Your highlights stay on this computer and in Drive.")) return; await chrome.runtime.sendMessage({ t: "driveSignOut" }); drawDrive(); });
chrome.storage.onChanged.addListener(ch => { if (ch["lp:drive"]) drawDrive(); });
drawDrive();
document.getElementById("restore").addEventListener("click", () => document.getElementById("restoreIn").click());
document.getElementById("restoreIn").addEventListener("change", async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return; let d; try { d = JSON.parse(await f.text()); } catch (x) {}
  if (!d || d.format !== "lab-potato-doc-reader-backup" || !d.data) return alert("That is not a Lab Potato backup file.");
  const cur = await chrome.storage.local.get(null), put = {}; let added = 0, merged = 0;
  for (const [k, v] of Object.entries(d.data)) { if (!k.startsWith("lp:")) continue;
    if (k === "lp:settings" || k === "lp:syncState" || k === "lp:backupState") { if (k === "lp:settings" && !cur[k]) put[k] = v; continue; }
    const c = cur[k]; if (!c) { put[k] = v; added++; continue; }
    // the same page on both sides: keep every highlight and edit from either, the newer page note
    const byId = new Map([...(c.marks || []), ...(v.marks || [])].map(m => [m.id, m])), eds = new Map([...(c.edits || []), ...(v.edits || [])].map(x => [x.id, x]));
    put[k] = Object.assign({}, c, { marks: [...byId.values()], edits: [...eds.values()], pageNote: (v.updated || 0) > (c.updated || 0) ? v.pageNote : c.pageNote, updated: Math.max(c.updated || 0, v.updated || 0) }); merged++; }
  await chrome.storage.local.set(put); alert(`Restored: ${added} new page${added === 1 ? "" : "s"}, ${merged} merged with what was here.`); load(); });
document.getElementById("allMd").addEventListener("click", () => download(PAGES.map(md).join("\n---\n\n"), "lab_potato_highlights.md"));
document.getElementById("btnOn").addEventListener("change", async e => { const s = (await chrome.storage.local.get("lp:settings"))["lp:settings"] || {}; s.button = e.target.checked; await chrome.storage.local.set({ "lp:settings": s }); });
chrome.storage.onChanged.addListener(() => load());
load();
