/* Lab Potato Doc Reader extension v3: the background worker.
   The tools now work on top of the page itself (content.js). The toolbar icon (or Alt+Shift+R) opens
   and folds them; on pages where an extension can't run (the Web Store, chrome:// pages, the PDF viewer)
   it opens Doc Reader instead. "Open in Doc Reader" copies the page as it is shown, with your marks. */
const isPdf = url => /\.pdf($|[?#])/i.test(url || "") || /^chrome-extension:\/\/mhjfbmdgcfjbbpaeojofohoefgiehjai\//.test(url || "");
const reader = q => chrome.tabs.create({ url: chrome.runtime.getURL("reader.html" + (q || "")) });
const library = () => chrome.tabs.create({ url: chrome.runtime.getURL("library.html") });

/* the tools on this tab: ask the page; if the page was open before the extension was installed, add them first */
async function onPage(tab, msg) {
  const url = tab.url || "";
  if (!/^(https?|file):/i.test(url) || /^https:\/\/chrome(webstore)?\.google\.com\/(webstore|extensions)/i.test(url)) return false;
  if (isPdf(url)) return false;
  try { await chrome.tabs.sendMessage(tab.id, msg); return true; }
  catch (e) {
    try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] }); await new Promise(r => setTimeout(r, 300)); await chrome.tabs.sendMessage(tab.id, msg); return true; }
    catch (e2) { return false; }
  }
}
async function toggle(tab) {
  if (await onPage(tab, { t: "toggle" })) return;
  const url = tab.url || "";
  if (isPdf(url)) reader("?file=" + encodeURIComponent(url)); else if (/^https?:/i.test(url)) openPage(tab, false); else reader();
}

async function openPage(tab, selectionOnly) {
  const url = tab.url || "";
  if (!url || /^(chrome|edge|about|devtools):/i.test(url)) return reader();
  if (isPdf(url) && !selectionOnly) return reader("?file=" + encodeURIComponent(url));
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: sel => {
        let selection = "";
        if (sel) { const s = getSelection(); if (s && !s.isCollapsed) { const d = document.createElement("div"); for (let i = 0; i < s.rangeCount; i++) d.append(s.getRangeAt(i).cloneContents()); selection = d.innerHTML; } }
        // styles the page added from script (CSS-in-JS, adopted sheets) are not in any <style> text: copy their rules
        let extra = "";
        for (const sh of [...document.styleSheets, ...(document.adoptedStyleSheets || [])]) {
          try { const own = sh.ownerNode; if (own && own.tagName === "LINK") continue; if (own && own.textContent.trim()) continue; extra += [...sh.cssRules].map(r => r.cssText).join("\n") + "\n"; } catch (e) { /* another site's sheet */ }
        }
        const doc = document.documentElement.cloneNode(true);
        // v3: parts drawn inside shadow roots (web components: share bars, figures, menus) are not in a copy of
        // the page: write each one out in place, its slots filled, its styles limited to that element.
        // Pictures that loaded lazily take the address the browser actually used.
        let shN = 0, shCss = "";
        const scopeSh = (rules, host) => [...rules].map(r => r.selectorText != null
          ? r.selectorText.split(/,(?![^(]*\))/).map(x => { x = x.trim().replace(/::slotted\(([^)]*)\)/g, "$1");
              return /^:host/.test(x) ? x.replace(/^:host(?:\(([^)]*)\))?/, (m, a) => host + (a || "")) : x.includes(":host") ? null : host + " " + x; }).filter(Boolean).join(", ") + r.cssText.slice(r.cssText.indexOf("{"))
          : r.cssRules && r.type !== 7 ? r.cssText.slice(0, r.cssText.indexOf("{")) + "{" + scopeSh(r.cssRules, host) + "}" : r.cssText).join("\n");
        const flat = (live, copy) => {
          if (live.nodeType !== 1) return copy;
          if (live.tagName === "IMG" && live.currentSrc && (!copy.getAttribute("src") || /^data:/.test(copy.getAttribute("src")))) copy.setAttribute("src", live.currentSrc);
          if (live.tagName === "SLOT" && live.closest && live.getRootNode() instanceof ShadowRoot) {
            const as = live.assignedNodes({ flatten: true }), src = as.length ? as : [...live.childNodes];
            return src.map(n => flat(n, n.cloneNode(true)));
          }
          const lk = [...live.childNodes], ck = [...copy.childNodes];
          if (lk.length === ck.length) lk.forEach((n, i) => { const out = flat(n, ck[i]); if (Array.isArray(out)) ck[i].replaceWith(...out); });
          const sr = live.shadowRoot; if (!sr || live.id === "lp-dr-host") return copy;
          const tag = "s" + (++shN), host = `[data-lp-sh="${tag}"]`; copy.setAttribute("data-lp-sh", tag);
          for (const sh of [...sr.styleSheets, ...(sr.adoptedStyleSheets || [])]) { try { shCss += scopeSh(sh.cssRules, host) + "\n"; } catch (e) { /* another site's sheet */ } }
          const kids = [...sr.childNodes].filter(n => !(n.nodeType === 1 && /^(STYLE|SCRIPT|LINK)$/.test(n.tagName))).flatMap(n => { const o = flat(n, n.cloneNode(true)); return Array.isArray(o) ? o : [o]; });
          copy.replaceChildren(...kids); return copy;
        };
        try { flat(document.documentElement, doc); } catch (e) { /* keep the plain copy */ }
        if (shCss) extra += "\n" + shCss;
        doc.querySelectorAll("script,noscript,#lp-dr-host").forEach(e => e.remove());
        doc.querySelector("body")?.removeAttribute("contenteditable");
        // lazy pictures: use the real address
        doc.querySelectorAll("img").forEach(im => { const ds = im.getAttribute("data-src") || im.getAttribute("data-lazy-src") || im.getAttribute("data-original"); if (ds && (!im.getAttribute("src") || /^data:/.test(im.getAttribute("src")))) im.setAttribute("src", ds); im.removeAttribute("loading"); });
        // your highlights and comments travel as Doc Reader marks
        const comments = {}, LP = window.__lpDR?.data;
        const byId = LP ? Object.fromEntries(LP.marks.map(m => [m.id, m])) : {};
        doc.querySelectorAll("lp-hl").forEach(w => { const m = byId[w.dataset.id] || { color: "#ffe066", note: "", at: Date.now() };
          const n = document.createElement(m.note ? "span" : "mark"); if (m.note) n.className = "cmt"; n.dataset.id = w.dataset.id; n.style.setProperty(m.note ? "--c" : "--hl", m.color);
          while (w.firstChild) n.append(w.firstChild); w.replaceWith(n);
          comments[w.dataset.id] = { at: m.at || Date.now(), color: m.color, t: m.note ? "cmt" : "mark", text: m.note || "" }; });
        if (extra) { const st = document.createElement("style"); st.textContent = extra; doc.querySelector("head")?.append(st); }
        if (Object.keys(comments).length) { const j = document.createElement("script"); j.type = "application/json"; j.id = "lp-comments"; j.textContent = JSON.stringify(comments); doc.querySelector("body")?.append(j); }
        return { html: "<!doctype html>" + doc.outerHTML, url: location.href, title: document.title, selection };
      },
      args: [!!selectionOnly]
    });
    if (selectionOnly && !result.selection) return reader("?url=" + encodeURIComponent(url));
    const key = "cap-" + Date.now();
    await chrome.storage.local.set({ [key]: result });
    reader("?cap=" + key);
  } catch (e) {
    // pages that refuse scripts (the Web Store, some PDFs): fetch by address instead
    reader("?url=" + encodeURIComponent(url));
  }
}

chrome.action.onClicked.addListener(tab => toggle(tab));
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "lp-hl", title: "Highlight (Lab Potato)", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "lp-tools", title: "Lab Potato tools on this page", contexts: ["page"] });
    chrome.contextMenus.create({ id: "lp-page", title: "Open this page in Doc Reader", contexts: ["page"] });
    chrome.contextMenus.create({ id: "lp-sel", title: "Open the selection in Doc Reader", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "lp-link", title: "Open this link in Doc Reader", contexts: ["link"] });
    chrome.contextMenus.create({ id: "lp-lib", title: "All my marked pages", contexts: ["action"] });
    chrome.contextMenus.create({ id: "lp-new", title: "New blank document in Doc Reader", contexts: ["action"] });
  });
});
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const id = info.menuItemId;
  if (id === "lp-hl") { if (!(await onPage(tab, { t: "highlight" }))) openPage(tab, true); }
  else if (id === "lp-tools") toggle(tab);
  else if (id === "lp-page") openPage(tab, false);
  else if (id === "lp-sel") openPage(tab, true);
  else if (id === "lp-link") reader(isPdf(info.linkUrl) ? "?file=" + encodeURIComponent(info.linkUrl) : "?url=" + encodeURIComponent(info.linkUrl));
  else if (id === "lp-lib") library();
  else if (id === "lp-new") reader();
});
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.t === "reader" && sender.tab) openPage(sender.tab, false);
  else if (msg.t === "library") library();
});

/* ---------- sync across computers (Chrome Sync) ----------
   Each page's marks are mirrored, compactly, into chrome.storage.sync. When you are signed in to Chrome
   with sync on, Chrome copies them to every computer where you are signed in, and they are merged into
   that computer's own store; the newer copy of a page wins, so a removed highlight stays removed.
   Chrome Sync holds about 100 KB in all (512 entries, 8 KB each), so a page too big for it stays local,
   and the library says so. Edited text travels only while it is small. */
const SYNC_ON = async () => ((await chrome.storage.local.get("lp:settings"))["lp:settings"] || {}).sync !== false;
const hashKey = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); };
const CHUNK = 7600;
function pack(rec) {
  const c = { u: rec.url, t: (rec.title || "").slice(0, 120), up: rec.updated || 0, n: rec.pageNote || "",
    m: (rec.marks || []).map(m => [m.id, m.color, m.quote.exact, m.quote.prefix, m.quote.suffix, +(m.quote.pos || 0).toFixed(4), m.note || "", m.at || 0]) };
  const ed = (rec.edits || []).map(e => [e.id, e.path, e.tag, e.orig, e.html, e.at || 0]);
  if (JSON.stringify(ed).length < 3000) c.e = ed;
  return JSON.stringify(c);
}
function unpack(str, cur) {
  const c = JSON.parse(str), o = cur ? Object.assign({}, cur) : { created: c.up };
  Object.assign(o, { url: c.u, title: c.t, updated: c.up, pageNote: c.n,
    marks: c.m.map(([id, color, exact, prefix, suffix, pos, note, at]) => ({ id, color, quote: { exact, prefix, suffix, pos }, note, at })) });
  if (c.e) o.edits = c.e.map(([id, path, tag, orig, html, at]) => ({ id, path, tag, orig, html, at }));
  return o;
}
let syncBusy = false;
const pushQ = new Set(); let pushT = null;
async function pushNow() {
  pushT = null; if (!(await SYNC_ON())) return pushQ.clear();
  const keys = [...pushQ]; pushQ.clear(); const local = await chrome.storage.local.get(keys), set = {}, del = [];
  const cur = await chrome.storage.sync.get(null);
  for (const k of keys) {
    const h = "s:" + hashKey(k.slice(3)), old = Object.keys(cur).filter(x => x === h || x.startsWith(h + ":"));
    const rec = local[k];
    if (!rec) { del.push(...old); set["x:" + hashKey(k.slice(3))] = Date.now(); continue; }   // removed here: tell the others
    const s = pack(rec), parts = []; for (let i = 0; i < s.length; i += CHUNK) parts.push(s.slice(i, i + CHUNK));
    del.push("x:" + hashKey(k.slice(3)));
    set[h] = { n: parts.length, up: rec.updated || 0, p: parts[0] }; for (let i = 1; i < parts.length; i++) set[h + ":" + i] = parts[i];
    old.filter(x => x !== h && +x.split(":")[2] >= parts.length).forEach(x => del.push(x));
  }
  syncBusy = true;
  try { if (del.length) await chrome.storage.sync.remove(del); if (Object.keys(set).length) await chrome.storage.sync.set(set);
    await chrome.storage.local.set({ "lp:syncState": { ok: true, at: Date.now() } }); }
  catch (e) { await chrome.storage.local.set({ "lp:syncState": { ok: false, at: Date.now(), error: String(e.message || e) } }); }
  finally { setTimeout(() => { syncBusy = false; }, 500); }
}
/* bring in what other computers sent */
async function pullAll() {
  if (!(await SYNC_ON())) return;
  const all = await chrome.storage.sync.get(null), local = await chrome.storage.local.get(null), put = {}, rm = [];
  for (const [k, v] of Object.entries(all)) {
    if (k.startsWith("x:")) { const lk = Object.keys(local).find(x => x.startsWith("lp:http") && hashKey(x.slice(3)) === k.slice(2)); if (lk && (local[lk].updated || 0) < v) rm.push(lk); continue; }
    if (!/^s:[^:]+$/.test(k) || !v || !v.p) continue;
    let s = v.p; for (let i = 1; i < v.n; i++) { if (all[k + ":" + i] == null) { s = null; break; } s += all[k + ":" + i]; } if (s == null) continue;
    let rec; try { rec = unpack(s); } catch (e) { continue; }
    const lk = "lp:" + rec.url, cur = local[lk];
    if (!cur || (rec.updated || 0) > (cur.updated || 0)) put[lk] = unpack(s, cur);
  }
  syncBusy = true;
  try { if (rm.length) await chrome.storage.local.remove(rm); if (Object.keys(put).length) await chrome.storage.local.set(put); } finally { setTimeout(() => { syncBusy = false; }, 500); }
}
chrome.storage.onChanged.addListener((ch, area) => {
  if (area === "local" && !syncBusy) { let any = false; for (const k of Object.keys(ch)) if (k.startsWith("lp:http") || k.startsWith("lp:file")) { pushQ.add(k); any = true; }
    if (any) { clearTimeout(pushT); pushT = setTimeout(pushNow, 2500); noteChange(); } }
  if (area === "local" && ch["lp:settings"] && (ch["lp:settings"].newValue || {}).sync !== false && (ch["lp:settings"].oldValue || {}).sync === false) syncEverything();
  if (area === "sync" && !syncBusy) pullAll();
});
async function syncEverything() { const local = await chrome.storage.local.get(null); Object.keys(local).filter(k => k.startsWith("lp:http") || k.startsWith("lp:file")).forEach(k => pushQ.add(k)); await pullAll(); await pushNow(); }
chrome.runtime.onStartup.addListener(() => { pullAll(); });
chrome.runtime.onInstalled.addListener(() => { setTimeout(syncEverything, 1500); });

/* ---------- a save file on this computer, in case the browser's storage is cleared ----------
   Once a day after a change (and whenever you press Save now), everything is written to
   Downloads/LabPotato/lab_potato_backup.json, replacing the previous one. Restore it from the library. */
async function backupJson() { const all = await chrome.storage.local.get(null);
  return JSON.stringify({ format: "lab-potato-doc-reader-backup", version: 1, savedAt: new Date().toISOString(), data: Object.fromEntries(Object.entries(all).filter(([k]) => k.startsWith("lp:") && !["lp:syncState", "lp:backupState", "lp:drive", "lp:tomb"].includes(k))) }); }
async function saveBackup(reason) {
  const json = await backupJson(), url = "data:application/json;base64," + btoa(unescape(encodeURIComponent(json)));
  try { const id = await chrome.downloads.download({ url, filename: "LabPotato/lab_potato_backup.json", conflictAction: "overwrite", saveAs: false });
    await chrome.storage.local.set({ "lp:backupState": { ok: true, at: Date.now(), id, reason, bytes: json.length } }); return true; }
  catch (e) { await chrome.storage.local.set({ "lp:backupState": { ok: false, at: Date.now(), error: String(e.message || e) } }); return false; }
}
async function noteChange() {
  const s = (await chrome.storage.local.get("lp:settings"))["lp:settings"] || {}; if (s.autoBackup === false) return;
  const st = (await chrome.storage.local.get("lp:backupState"))["lp:backupState"] || {};
  const day = d => new Date(d).toDateString(); if (st.at && day(st.at) === day(Date.now())) return;
  clearTimeout(noteChange.t); noteChange.t = setTimeout(() => saveBackup("daily"), 60000);   // a minute after the day's first change
}
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.t === "backupNow") { saveBackup("now").then(ok => reply({ ok })); return true; }
  if (msg.t === "syncNow") { syncEverything().then(() => reply({ ok: true })); return true; }
});

/* ---------- Google Drive sync: sign in once, the same highlights on every computer ----------
   Everything lives in one file, lab-potato-highlights.json, in the hidden app folder of your own Google
   Drive (scope drive.appdata: the extension sees only its own file, nothing else in your Drive).
   Each sync reads that file, merges it with this computer (for each page the newer copy wins; a page
   removed here or there stays removed), writes the result back, and updates any open page.
   Sign-in uses Chrome's web sign-in window with an OAuth client ID you paste into the library once. */
let DRIVE = "https://www.googleapis.com";                 // the Drive API (a test can point this at a mock)
const DEFAULT_CLIENT_ID = "502625246525-u3vf2hmn6dmgrlmq2p5j5m40eojpks2l.apps.googleusercontent.com";   // Lab Potato's Google Cloud project; a client ID pasted in the library overrides it
const DFILE = "lab-potato-highlights.json", SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const dstate = async () => (await chrome.storage.local.get("lp:drive"))["lp:drive"] || {};
const setDstate = async o => chrome.storage.local.set({ "lp:drive": Object.assign(await dstate(), o) });
const clientId = async () => (await dstate()).clientId || DEFAULT_CLIENT_ID;
let getToken = async interactive => {
  const cache = (await chrome.storage.session.get("lp:tok"))["lp:tok"];
  if (cache && cache.exp > Date.now() + 60000) return cache.token;
  const cid = await clientId(); if (!cid) throw new Error("not set up: paste the OAuth client ID first");
  const st = await dstate(), redirect = chrome.identity.getRedirectURL();
  const url = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({ client_id: cid, response_type: "token", redirect_uri: redirect, scope: SCOPE, include_granted_scopes: "true",
    prompt: interactive ? "select_account" : "none", ...(st.email ? { login_hint: st.email } : {}) });
  const back = await chrome.identity.launchWebAuthFlow({ url, interactive: !!interactive });
  const p = new URLSearchParams(new URL(back).hash.slice(1)); if (!p.get("access_token")) throw new Error(p.get("error") || "sign-in failed");
  const tok = { token: p.get("access_token"), exp: Date.now() + (+p.get("expires_in") || 3600) * 1000 };
  await chrome.storage.session.set({ "lp:tok": tok }); return tok.token;
};
async function dfetch(path, opts = {}, interactive = false) {
  let t = await getToken(interactive), go = () => fetch(DRIVE + path, Object.assign({}, opts, { headers: Object.assign({}, opts.headers, { Authorization: "Bearer " + t }) }));
  let r = await go();
  if (r.status === 401) { await chrome.storage.session.remove("lp:tok"); t = await getToken(interactive); r = await go(); }
  if (!r.ok) throw new Error("Google Drive answered " + r.status);
  return r;
}
async function driveFind() { const j = await (await dfetch(`/drive/v3/files?spaces=appDataFolder&fields=files(id,name,modifiedTime)&q=${encodeURIComponent(`name='${DFILE}'`)}`)).json(); return (j.files || [])[0] || null; }
async function driveWrite(id, obj) {
  const body = JSON.stringify(obj);
  if (id) { await dfetch(`/upload/drive/v3/files/${id}?uploadType=media`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body }); return id; }
  const b = "lp" + Date.now(), mp = `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: DFILE, parents: ["appDataFolder"] })}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${b}--`;
  return (await (await dfetch("/upload/drive/v3/files?uploadType=multipart&fields=id", { method: "POST", headers: { "Content-Type": "multipart/related; boundary=" + b }, body: mp })).json()).id;
}
const isPage = k => k.startsWith("lp:http") || k.startsWith("lp:file");
let driveBusy = false, driveRunning = null;
/* pages removed on this computer, so the removal reaches the others */
chrome.storage.onChanged.addListener(async (ch, area) => {
  if (area !== "local" || driveBusy) return; const gone = Object.keys(ch).filter(k => isPage(k) && ch[k].oldValue && !ch[k].newValue);
  const changed = Object.keys(ch).some(isPage);
  if (gone.length) { const t = (await chrome.storage.local.get("lp:tomb"))["lp:tomb"] || {}; gone.forEach(k => { t[k] = Date.now(); }); await chrome.storage.local.set({ "lp:tomb": t }); }
  if (changed && (await dstate()).on) { clearTimeout(driveSoonT); driveSoonT = setTimeout(() => driveSync(false), 15000); }
});
let driveSoonT = null;
async function driveSync(interactive) {
  if (driveRunning) return driveRunning;
  driveRunning = (async () => {
    const st = await dstate(); if (!st.on && !interactive) return { ok: false, off: true };
    try {
      let id = st.fileId, remote = null;
      if (id) { try { remote = await (await dfetch(`/drive/v3/files/${id}?alt=media`, {}, interactive)).json(); } catch (e) { id = null; } }
      if (!id) { const f = await driveFind(); if (f) { id = f.id; remote = await (await dfetch(`/drive/v3/files/${id}?alt=media`)).json(); } }
      remote = remote && remote.pages ? remote : { pages: {}, tomb: {} };
      const all = await chrome.storage.local.get(null), lt = all["lp:tomb"] || {}, tomb = Object.assign({}, remote.tomb || {});
      for (const [k, t] of Object.entries(lt)) tomb[k] = Math.max(tomb[k] || 0, t);
      const cut = Date.now() - 90 * 864e5; for (const k of Object.keys(tomb)) if (tomb[k] < cut) delete tomb[k];   // a removal is remembered for 90 days
      const keys = new Set([...Object.keys(all).filter(isPage), ...Object.keys(remote.pages)]), pages = {}, put = {}, rm = [];
      for (const k of keys) {
        const L = all[k], R = remote.pages[k], best = !L ? R : !R ? L : ((R.updated || 0) > (L.updated || 0) ? R : L);
        if (tomb[k] && tomb[k] >= ((best && best.updated) || 0)) { if (L) rm.push(k); continue; }
        pages[k] = best; if (best !== L) put[k] = best;
      }
      driveBusy = true;
      try { if (rm.length) await chrome.storage.local.remove(rm); if (Object.keys(put).length) await chrome.storage.local.set(put); } finally { setTimeout(() => { driveBusy = false; }, 300); }
      const out = { format: "lab-potato-drive-sync", version: 1, updatedAt: new Date().toISOString(), pages, tomb };
      if (JSON.stringify(out.pages) !== JSON.stringify(remote.pages) || JSON.stringify(out.tomb) !== JSON.stringify(remote.tomb || {}) || !id) id = await driveWrite(id, out);
      await chrome.storage.local.set({ "lp:tomb": tomb });
      await setDstate({ on: true, fileId: id, lastSync: Date.now(), error: "", pages: Object.keys(pages).length, got: Object.keys(put).length });
      return { ok: true, got: Object.keys(put).length, removed: rm.length };
    } catch (e) { await setDstate({ error: String(e.message || e), lastTry: Date.now() }); return { ok: false, error: String(e.message || e) }; }
  })();
  try { return await driveRunning; } finally { driveRunning = null; }
}
async function driveSignIn() {
  await chrome.storage.session.remove("lp:tok");
  await getToken(true);
  let email = ""; try { const a = await (await dfetch("/drive/v3/about?fields=user(emailAddress,displayName)")).json(); email = a.user && a.user.emailAddress || ""; } catch (e) {}
  await setDstate({ on: true, email, error: "" });
  return driveSync(true);
}
async function driveSignOut() {
  const c = (await chrome.storage.session.get("lp:tok"))["lp:tok"];
  if (c && c.token) { try { await fetch("https://oauth2.googleapis.com/revoke?token=" + encodeURIComponent(c.token), { method: "POST" }); } catch (e) {} }
  await chrome.storage.session.remove("lp:tok"); await setDstate({ on: false, fileId: "", email: "" });
}
chrome.alarms.create("lp-drive", { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener(a => { if (a.name === "lp-drive") driveSync(false); });
chrome.runtime.onStartup.addListener(() => setTimeout(() => driveSync(false), 3000));
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.t === "driveSignIn") { driveSignIn().then(r => reply(r), e => reply({ ok: false, error: String(e.message || e) })); return true; }
  if (msg.t === "driveSignOut") { driveSignOut().then(() => reply({ ok: true })); return true; }
  if (msg.t === "driveSync") { driveSync(true).then(r => reply(r)); return true; }
  if (msg.t === "driveToken") {   // v3: Doc Reader's own documents sync through the same sign-in (reader.js)
    (async () => { if (!(await dstate()).on) return { ok: false, off: true }; if (msg.fresh) await chrome.storage.session.remove("lp:tok"); return { ok: true, token: await getToken(false), api: DRIVE }; })()
      .then(r => reply(r), e => reply({ ok: false, error: String(e.message || e) })); return true; }
  if (msg.t === "driveRedirect") { reply({ url: chrome.identity.getRedirectURL(), id: chrome.runtime.id }); return false; }
});
