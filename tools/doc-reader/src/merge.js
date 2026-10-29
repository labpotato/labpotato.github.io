/* ---------- Paper Writer is now part of Doc Reader: bring its documents and settings over ----------
   Paper Writer (v1-v5) kept its documents in its own browser database, "lp-paperwriter", on the same site.
   Each start copies any Paper Writer document (with its AI chat) that was never brought over before, so
   documents made later with an old Paper Writer link still arrive, and one deleted here does not come back.
   The AI, spelling and page settings come over the first time. The old database is left as it was. */
async function importPaperWriter() {
  if (IS_EXT) return;
  try {
    if (indexedDB.databases && !(await indexedDB.databases()).some(d => d.name === "lp-paperwriter")) return;
    // open it without creating it: a missing database asks for an upgrade, which is cancelled
    const old = await new Promise(res => { const r = indexedDB.open("lp-paperwriter"); r.onupgradeneeded = () => r.transaction.abort(); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
    if (!old) return;
    const read = (store, key) => new Promise(res => { try { const t = old.transaction(store, "readonly").objectStore(store); const q = key === undefined ? t.getAll() : t.get(key); q.onsuccess = () => res(q.result); q.onerror = () => res(null); } catch (e) { res(null); } });
    const docs = (await read("docs")) || [], prefs = (await read("kv", "prefs")) || {}; old.close();
    const have = new Set(((await DB.all("docs")) || []).map(d => d.id)), done = new Set(Prefs.get("pwIds", [])); let n = 0;
    for (const d of docs) { if (done.has(d.id)) continue; if (!have.has(d.id)) { await DB.put("docs", d); n++; } done.add(d.id); }
    Prefs.set("pwIds", [...done]);
    if (!Prefs.get("pwImported")) { for (const k of ["ai", "aiKeys", "userDict", "spell", "pageDefaults", "aiMarkup", "pasteMode", "recentSym", "aiPanelSeen"]) if (prefs[k] != null && Prefs.get(k) == null) Prefs.set(k, prefs[k]); Prefs.set("pwImported", Date.now()); }
    if (n) toast(`Paper Writer is now part of Doc Reader: brought over ${n} document${n === 1 ? "" : "s"} with their AI chats.`);
  } catch (e) { console.warn("Paper Writer import", e); }
}
{ const lr = listRecent; let first = true; listRecent = async function () { if (first) { first = false; await importPaperWriter(); } return lr(); }; }
