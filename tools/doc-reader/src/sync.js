/* ---------- v4 (extension 3): documents follow you to every computer through Google Drive ----------
   The extension's Google sign-in (library page → Setup) already syncs the highlights made on web pages.
   With it on, each Doc Reader document is also kept as one file, lpdoc-<id>.json, in the hidden app
   folder of your own Google Drive (scope drive.appdata: the extension sees only its own files).
   A sync runs on start, a few seconds after a save, when the tab comes back into view and every 5 minutes:
   for each document the newer copy wins; one removed here is removed there too (and the other way round).
   The web page version has no Google sign-in, so this is the extension only. */
const DSYNC = { busy: null, last: 0, state: "" };
async function dsToken(fresh) {
  const r = await chrome.runtime.sendMessage({ t: "driveToken", fresh: !!fresh }).catch(e => ({ ok: false, error: String(e.message || e) }));
  if (!r || !r.ok) throw Object.assign(new Error(r?.off ? "off" : (r?.error || "no Google sign-in")), { off: !!r?.off });
  return r;
}
async function dsFetch(path, opts = {}) {
  let t = await dsToken(); const go = () => fetch(t.api + path, { ...opts, headers: { ...(opts.headers || {}), Authorization: "Bearer " + t.token } });
  let r = await go(); if (r.status === 401) { t = await dsToken(true); r = await go(); }
  if (!r.ok) throw new Error("Google Drive answered " + r.status); return r;
}
async function dsPack(d) {
  const { handle, srcHandle, src, _page, ...doc } = d;
  return JSON.stringify({ format: "lpdoc", v: 1, kind: d.kind, name: d.name, app: "Lab Potato Doc Reader", doc, srcB64: src ? b64.enc(await src.arrayBuffer()) : null });
}
function dsUnpack(txt) {
  const p = JSON.parse(txt); if (p.format !== "lpdoc" || !p.doc?.id) throw new Error("not a Doc Reader document");
  return { ...p.doc, saved: true, src: p.srcB64 ? new Blob([b64.dec(p.srcB64)], { type: "application/pdf" }) : null };
}
/* resumable upload: any size, one file per document */
async function dsUpload(d, fileId) {
  const meta = { appProperties: { lpdoc: d.id, mod: String(d.modified || 0) }, ...(fileId ? {} : { name: `lpdoc-${d.id}.json`, parents: ["appDataFolder"] }) };
  const start = await dsFetch(fileId ? `/upload/drive/v3/files/${fileId}?uploadType=resumable` : "/upload/drive/v3/files?uploadType=resumable", { method: fileId ? "PATCH" : "POST", headers: { "Content-Type": "application/json; charset=UTF-8" }, body: JSON.stringify(meta) });
  const loc = start.headers.get("Location"); if (!loc) throw new Error("Google Drive gave no upload address");
  const r = await fetch(loc, { method: "PUT", headers: { "Content-Type": "application/json" }, body: await dsPack(d) });
  if (!r.ok) throw new Error("upload failed (" + r.status + ")");
}
async function docSync(why) {
  if (!IS_EXT) return { ok: false };
  if (DSYNC.busy) return DSYNC.busy;
  DSYNC.busy = (async () => {
    let got = 0, sent = 0, gone = 0;
    try {
      if (S.dirty) await saveNow();
      const files = (await (await dsFetch(`/drive/v3/files?spaces=appDataFolder&pageSize=1000&fields=files(id,name,appProperties)&q=${encodeURIComponent("name contains 'lpdoc-'")}`)).json()).files || [];
      const remote = new Map(files.filter(f => f.appProperties?.lpdoc).map(f => [f.appProperties.lpdoc, f]));
      const local = new Map(((await DB.all("docs")) || []).map(d => [d.id, d])), seen = Prefs.get("syncSeen", {}), next = {};
      for (const [id, d] of local) {
        const f = remote.get(id), rm = f ? +f.appProperties.mod || 0 : 0, lm = d.modified || 0;
        if (!f && seen[id] && lm <= seen[id]) { if (S.doc?.id !== id) { await DB.del("docs", id); gone++; } continue; }   // removed on another computer
        if (!f || lm > rm) { await dsUpload(d, f?.id); sent++; next[id] = lm; }
        else if (rm > lm) { if (await dsGet(f, d)) got++; next[id] = rm; }
        else next[id] = lm;
      }
      for (const [id, f] of remote) {
        if (local.has(id)) continue;
        if (seen[id]) { await dsFetch(`/drive/v3/files/${f.id}`, { method: "DELETE" }).catch(() => {}); gone++; continue; }   // removed here
        if (await dsGet(f, null)) { got++; next[id] = +f.appProperties.mod || 0; }
      }
      Prefs.set("syncSeen", next); DSYNC.last = Date.now(); DSYNC.state = "ok";
      if (got || gone) { if ($("#home") && !$("#home").hidden) listRecent(); }
      if (why === "button") toast(`Synced with Google Drive: ${sent} sent, ${got} received${gone ? `, ${gone} removed` : ""}.`);
      dsShow(); return { ok: true, got, sent, gone };
    } catch (e) {
      DSYNC.state = e.off ? "off" : "err:" + (e.message || e); dsShow();
      if (why === "button") toast(e.off ? "Sign in with Google first: Library → Setup → Sign in with Google." : "Sync failed: " + (e.message || e));
      return { ok: false, error: String(e.message || e) };
    }
  })();
  try { return await DSYNC.busy; } finally { DSYNC.busy = null; }
}
/* bring one document in; the open one is refreshed only if it has no unsaved changes */
async function dsGet(f, cur) {
  const d = dsUnpack(await (await dsFetch(`/drive/v3/files/${f.id}?alt=media`)).text());
  if (cur) { d.handle = cur.handle || null; d.srcHandle = cur.srcHandle || null; }
  if (S.doc?.id === d.id) { if (S.dirty) return false; await DB.put("docs", d); S.doc = null; await (d.kind === "pdf" ? openPdfDoc(d) : openDoc(d)); toast("This document was updated from another computer."); return true; }
  await DB.put("docs", d); return true;
}
/* a line on the start page: what is synced, and a button */
function dsShow() {
  if (!IS_EXT) return; let box = $("#syncCard");
  if (!box) { const side = $("#extCard")?.parentElement; if (!side) return;
    box = EL("div", { class: "home-card", id: "syncCard" }, EL("h3", {}, "Sync between computers"), EL("p", { class: "ds-line" }), EL("div", {}, EL("button", { class: "btn small", onclick: () => docSync("button") }, "Sync now"), " ", EL("button", { class: "btn small ghost", onclick: () => chrome.runtime.openOptionsPage() }, "Google sign-in…")));
    side.insertBefore(box, $("#extCard")); }
  const st = DSYNC.state, line = box.querySelector(".ds-line");
  line.textContent = st === "ok" ? `Your documents and page highlights are kept in your Google Drive; last synced ${fmtTime(DSYNC.last)}. Sign in with the same Google account on another computer to see them there.`
    : st === "off" || !st ? "Sign in with Google once (Library → Setup) and your documents and page highlights follow you to every computer where the extension is signed in to the same account."
    : "Last sync failed: " + st.slice(4);
}
if (IS_EXT) {
  const later = debounce(() => docSync("save"), 8000);
  { const sn = saveNow; saveNow = async function () { const r = await sn.apply(this, arguments); if (!DSYNC.busy) later(); return r; }; }
  setTimeout(() => { dsShow(); docSync("start"); }, 2500);
  setInterval(() => docSync("timer"), 5 * 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - DSYNC.last > 60000) docSync("focus"); });
}
