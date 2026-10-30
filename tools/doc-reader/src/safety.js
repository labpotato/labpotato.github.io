/* ---------- v6: safety nets ----------
   Recently removed: a document removed from the list (here, or on another computer through sync) is kept for
   30 days in this browser's storage (kv "trash:<id>") and can be restored from the start page.
   Earlier versions: while you write, a copy of the text is kept every 10 minutes (kv "snap:<id>", the last 40),
   and always before big one-shot changes (accept or reject every AI change, revert to the original).
   File menu → Earlier versions… shows them; restoring one first keeps the current text as a version too. */
const TRASH_DAYS = 30, SNAP_EVERY = 10 * 60000, SNAP_MAX = 40;
const kvKeys = () => DB.tx("kv", "readonly", s => s.getAllKeys());

/* --- recently removed --- */
{ const del0 = DB.del.bind(DB);
  DB.del = async function (store, k) {
    if (store === "docs") { try { const d = await DB.get("docs", k); if (d) { await DB.put("kv", { doc: d, at: Date.now() }, "trash:" + k); trashSoon(); } } catch (e) { console.warn("trash", e); } }
    return del0(store, k);
  }; }
const trashSoon = debounce(() => { drawTrashLink(); toast("Moved to Recently removed on the start page. You can restore it for " + TRASH_DAYS + " days."); }, 300);
async function trashList() {
  const keys = (await kvKeys()).filter(k => String(k).startsWith("trash:")), out = [], cut = Date.now() - TRASH_DAYS * 864e5;
  for (const k of keys) { const t = await DB.get("kv", k); if (!t || !t.doc || t.at < cut) { await DB.del("kv", k); continue; } out.push({ key: k, ...t }); }
  return out.sort((a, b) => b.at - a.at);
}
async function drawTrashLink() {
  const head = $(".recent-h"); if (!head) return;
  let a = $("#trashLink"); const n = (await trashList()).length;
  if (!a) { a = EL("button", { class: "btn small ghost", id: "trashLink", onclick: openTrash }); head.append(a); }
  a.hidden = !n; a.textContent = `Recently removed (${n})`;
}
async function openTrash() {
  const list = await trashList();
  const rows = list.map(t => `<div class="tr-row" data-k="${esc(t.key)}"><div class="tr-t"><b>${esc(t.doc.name || "Untitled")}</b><span class="muted">Removed ${fmtTime(t.at)} · kept until ${new Date(t.at + TRASH_DAYS * 864e5).toLocaleDateString()}</span></div><button class="btn small" data-tr="restore">Restore</button><button class="btn small ghost danger" data-tr="purge">Delete forever</button></div>`).join("");
  const p = modal(`<h3>Recently removed</h3><p class="muted">Documents removed in the last ${TRASH_DAYS} days, from this computer or from another one through sync. After that they are deleted for good.</p>
    <div class="tr-list">${rows || '<p class="muted">Nothing here.</p>'}</div><div class="mrow"><button class="btn" data-cancel>Close</button></div>`);
  $("#modal .tr-list")?.addEventListener("click", async e => {
    const b = e.target.closest("[data-tr]"); if (!b) return; const row = b.closest(".tr-row"), k = row.dataset.k, t = await DB.get("kv", k); if (!t) return row.remove();
    if (b.dataset.tr === "restore") { await DB.put("docs", { ...t.doc, modified: Date.now() }); await DB.del("kv", k); row.remove(); toast(`Restored "${t.doc.name}".`); listRecent(); }
    else if (confirm(`Delete "${t.doc.name}" for good? This cannot be undone.`)) { await DB.del("kv", k); row.remove(); }
    drawTrashLink();
  });
  await p; drawTrashLink();
}

/* --- earlier versions of a written document --- */
async function snapList(id) { return (await DB.get("kv", "snap:" + id)) || []; }
async function snapTake(why, force) {
  const d = S.doc; if (!d || d.kind !== "flow" || S.webview) return;
  // the text without unreviewed AI suggestions (their original words), as exports and saves write it
  const html = withOriginals(() => flowEl.innerHTML)().replace(/ class="(on|sel)"/g, ""), list = await snapList(d.id), last = list[0];
  if (last && last.html === html) return;
  if (!force && last && Date.now() - last.at < SNAP_EVERY) return;
  list.unshift({ at: Date.now(), why: why || "autosave", html, words: (EL("div", { html }).textContent.match(/\S+/g) || []).length });
  await DB.put("kv", list.slice(0, SNAP_MAX), "snap:" + d.id);
}
{ const sn = saveNow; saveNow = async function () { const r = await sn.apply(this, arguments); snapTake("autosave").catch(() => {}); return r; }; }
/* before the big one-shot changes, always */
{ const da = aiDecideAll; aiDecideAll = async function () { await snapTake("before accepting or rejecting every AI change", true).catch(() => {}); return da.apply(this, arguments); }; }
async function openVersions() {
  const d = S.doc; if (!d || d.kind !== "flow") return toast("Earlier versions are kept for written documents.");
  await snapTake("now", true);
  const list = await snapList(d.id);
  const rows = list.map((v, i) => `<div class="tr-row"><div class="tr-t"><b>${fmtTime(v.at)}</b><span class="muted">${v.words} words · ${esc(v.why === "autosave" ? "kept while you wrote" : v.why === "now" ? "the text as it is now" : v.why)}</span></div>${i ? `<button class="btn small ghost" data-v="${i}" data-a="peek">Preview</button><button class="btn small" data-v="${i}" data-a="use">Restore</button>` : '<span class="muted">current</span>'}</div>`).join("");
  const p = modal(`<h3>Earlier versions</h3><p class="muted">A copy of the text is kept every ${SNAP_EVERY / 60000} minutes while you write (the last ${SNAP_MAX}), and before big changes. Restoring keeps the current text as a version too, so nothing is lost.</p>
    <div class="tr-list">${rows}</div><div class="tr-peek" hidden></div><div class="mrow"><button class="btn" data-cancel>Close</button></div>`);
  $("#modal .tr-list")?.addEventListener("click", async e => {
    const b = e.target.closest("[data-v]"); if (!b) return; const v = list[+b.dataset.v]; if (!v) return;
    if (b.dataset.a === "peek") { const pk = $("#modal .tr-peek"); pk.hidden = false; pk.innerHTML = v.html; return; }
    await snapTake("before restoring the version of " + fmtTime(v.at), true);
    flowEl.innerHTML = v.html; S.dirty = true; await saveNow(); closeModal(null); toast("Restored the version of " + fmtTime(v.at) + ". The text before it is kept under Earlier versions.");
  });
  await p;
}
{ const sm = saveMenu; saveMenu = function (anchor) {
    if (S.doc?.kind !== "flow") return sm.apply(this, arguments);
    const m0 = menu; menu = (items, ...rest) => { menu = m0; const i = items.findIndex(x => x && x.sep); const add = { label: "Earlier versions…", sub: "Every 10 minutes while you write, and before big changes", fn: openVersions };
      return m0(i < 0 ? [...items, add] : [...items.slice(0, i), add, ...items.slice(i)], ...rest); };
    try { return sm.apply(this, arguments); } finally { menu = m0; } }; }

/* --- start --- */
{ const lr = listRecent; listRecent = async function () { const r = await lr.apply(this, arguments); drawTrashLink(); return r; }; }
setTimeout(() => { trashList().catch(() => {}); drawTrashLink(); }, 1500);
Object.assign(window, { snapTake, snapList, openVersions, trashList, openTrash, drawTrashLink, DB });   // for the tests and the console
