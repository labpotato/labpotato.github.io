/* Lab Potato Doc Reader extension v3: the tools on top of any web page (like Liner), no new tab.
   A small potato sits at the bottom right; click it (or the extension icon) to open the toolbar.
   Select text: a "Highlight" bubble appears; pressing it marks the text and opens the toolbar.
   Highlights and comments are kept per address in chrome.storage.local and come back when the same
   address is opened again. Highlights are found again by their words (the text plus a little before
   and after), so they survive small page changes.
   v3: the page's text can no longer be edited here (open the page in Doc Reader to edit a copy).
   Paragraphs edited with an earlier version still show as edited, and "Revert edited text" puts the
   page's own words back. */
(() => {
  if (window.__lpDocReader) return; window.__lpDocReader = true;
  if (!document.documentElement || !/^https?:|^file:/.test(location.protocol)) return;
  /* v4: stay out of Doc Reader itself (it has its own highlights, comments and AI editor): any page that says
     <meta name="lab-potato-app" content="doc-reader">, or a Doc Reader file by its address (older versions) */
  if (document.querySelector('meta[name="lab-potato-app"][content="doc-reader"]') || /\/tools\/doc-reader\/(doc-reader-v\d+\.html)?$|\/doc-reader-v\d+\.html$/.test(location.pathname)) return;

  const COLORS = [["#ffe066", "Yellow"], ["#a5f3a1", "Green"], ["#9bd4ff", "Blue"], ["#ffb3d1", "Pink"], ["#ffc68a", "Orange"], ["#d4b8ff", "Purple"]];
  /* v7: one paper, one set of notes, however you reach it. A library proxy (NUS libproxy, any EZproxy or
     OpenAthens proxy) changes the address: www-cell-com.libproxy1.nus.edu.sg is www.cell.com. The proxy is
     undone, and a page that names its DOI (publisher pages do, proxied or not; doi.org links lead to them)
     shares its notes with every other copy of the same DOI. */
  const PROXY_LABEL = /^(ezproxy\d*|libproxy\d*|proxy\d*|ezp\d*|ezpprod\d*|eproxy\d*|ezaccess|remotexs|idm|elib|elibrary|lib-proxy|libezproxy)$/i;
  function deproxy(u) {
    try {
      const x = new URL(u), inner = x.searchParams.get("url") || x.searchParams.get("qurl");
      if (/\/login\b/i.test(x.pathname) && inner && /^https?:/i.test(inner)) return deproxy(inner);   // https://proxy.lib.x.edu/login?url=https://…
      const L = x.hostname.split(".");
      if (L.length > 2 && L.slice(1).some(l => PROXY_LABEL.test(l)) && L[0].includes("-")) {   // hostname form: dots became hyphens, hyphens became "--"
        const host = L[0].replace(/--/g, "\u0000").replace(/-/g, ".").replace(/\u0000/g, "-");
        if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) { x.hostname = host; x.port = ""; x.protocol = "https:"; }
      }
      if (x.protocol === "http:" && !x.port) x.protocol = "https:";   // the same page over http or https
      x.hash = ""; return x.href;
    } catch (e) { return String(u).replace(/#.*$/, ""); }
  }
  const cleanDoi = d => { let r = String(d || "").trim().replace(/^(https?:\/\/)?(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, ""); try { r = decodeURIComponent(r); } catch (e) { /* as is */ } r = r.replace(/[.,;]+$/, ""); return /^10\.\d{4,9}\/\S+$/.test(r) ? "doi:" + r.toLowerCase() : null; };
  function paperId() {
    for (const m of document.querySelectorAll('meta[name="citation_doi" i],meta[name="dc.identifier" i],meta[name="prism.doi" i],meta[name="bepress_citation_doi" i],meta[property="citation_doi" i],meta[scheme="doi" i],meta[name="doi" i]')) { const d = cleanDoi(m.getAttribute("content")); if (d) return d; }
    const u = deproxy(location.href), d2 = u.match(/(?:doi\.org|\/doi(?:\/(?:abs|full|pdf|epdf|epub|reader))?)\/(10\.\d{4,9}\/[^?#\s]+)/i); if (d2) { const d = cleanDoi(d2[1]); if (d) return d; }
    const pm = document.querySelector('meta[name="citation_pmid" i]')?.getAttribute("content")?.trim(); if (pm && /^\d+$/.test(pm)) return "pmid:" + pm;
    const ax = u.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5})/i); if (ax) return "arxiv:" + ax[1];
    return null;
  }
  const HERE = location.href.replace(/#.*$/, ""), CANON = deproxy(HERE);
  let KEY = "lp:" + CANON, PID = null;
  const SKEY = "lp:settings";
  let DATA = { url: CANON, title: document.title, created: Date.now(), updated: 0, marks: [], edits: [], pageNote: "" };
  let SET = { open: false, pos: null, color: COLORS[0][0], button: true, dock: false, rail: true, progress: true, look: "auto", accent: "#0a5fd0", off: [], on: [], offDefaults: true };
  /* v5: sites where the tools stay off unless you turn them on there: places where you write or chat, not read */
  const OFF_DEFAULT = ["claude.ai", "chatgpt.com", "chat.openai.com", "gemini.google.com", "copilot.microsoft.com", "perplexity.ai", "docs.google.com", "slides.google.com", "sheets.google.com", "drive.google.com", "mail.google.com", "calendar.google.com", "notion.so", "overleaf.com", "outlook.live.com", "outlook.office.com", "teams.microsoft.com", "app.slack.com", "discord.com", "figma.com", "canva.com", "onedrive.live.com", "word.office.com", "office.com", "app.grammarly.com", "github.dev", "colab.research.google.com", "benchling.com"];
  const HOST = location.hostname.replace(/^www\./, "");
  const onList = (list, h) => (list || []).some(d => h === d || h.endsWith("." + d));
  const siteOff = () => !onList(SET.on, HOST) && (onList(SET.off, HOST) || (SET.offDefaults !== false && onList(OFF_DEFAULT, HOST)));
  const ACCENTS = [["#0a5fd0", "Blue"], ["#c58d52", "Potato"], ["#139171", "Green"], ["#6a55d6", "Purple"], ["#c94b6d", "Pink"], ["#1f2733", "Ink"]];
  let booted = false;
  let panelOpen = false, lost = [], tab = "notes", noteQ = "", railIdx = -1;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const store = chrome?.storage?.local;
  let pendingSave = false;
  const save = (() => { let t; return () => { clearTimeout(t); pendingSave = true; setTimeout(() => typeof drawRail === "function" && drawRail(), 30); t = setTimeout(() => { pendingSave = false; DATA.updated = Date.now(); DATA.title = document.title; const empty = !DATA.marks.length && !DATA.edits.length && !(DATA.pageNote || "").trim(); try { empty ? store.remove(KEY) : store.set({ [KEY]: DATA }); } catch (e) { /* extension reloaded */ } }, 250); }; })();
  const saveSet = () => { try { store.set({ [SKEY]: SET }); } catch (e) { /* ignore */ } };

  /* ---------- the page's text, collapsed whitespace, with a map back to text nodes ---------- */
  const SKIP = "script,style,noscript,textarea,select,template,svg title,#lp-dr-host";
  function textIndex() {
    const nodes = [], walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement && !n.parentElement.closest(SKIP) ? 1 : 2 });
    let norm = "", map = [], prevSpace = true, n;
    while ((n = walk.nextNode())) { const v = n.nodeValue; nodes.push(n);
      for (let i = 0; i < v.length; i++) { const sp = /\s/.test(v[i]); if (sp && prevSpace) continue; norm += sp ? " " : v[i]; map.push([nodes.length - 1, i]); prevSpace = sp; } }
    return { nodes, norm, map };
  }
  const normText = s => s.replace(/\s+/g, " ").trim();
  /* where a DOM boundary falls in the collapsed text */
  function boundaryIndex(ix, node, off, isEnd) {
    let tn = node, to = off;
    if (node.nodeType !== 3) { const kids = node.childNodes; const ref = kids[off] || null;
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); w.currentNode = ref || node;
      if (ref) { tn = ref.nodeType === 3 ? ref : w.nextNode(); to = 0; }
      else { let last = node; while (last.lastChild) last = last.lastChild; w.currentNode = last; tn = w.nextNode(); to = 0; } }   // past the end of an element: the next text after it
    if (!tn) return ix.map.length;
    const ni = ix.nodes.indexOf(tn);
    let lo = 0, hi = ix.map.length;   // first map entry at or after (ni, to)
    while (lo < hi) { const m = (lo + hi) >> 1, [a, b] = ix.map[m]; if (a < ni || (a === ni && b < to)) lo = m + 1; else hi = m; }
    if (ni < 0) return isEnd ? ix.map.length : 0;
    return lo;
  }
  function describe(range) {
    const ix = textIndex(); let s = boundaryIndex(ix, range.startContainer, range.startOffset, false), e = boundaryIndex(ix, range.endContainer, range.endOffset, true);
    while (s < e && ix.norm[s] === " ") s++; while (e > s && ix.norm[e - 1] === " ") e--;
    if (e <= s) return null;
    return { exact: ix.norm.slice(s, e), prefix: ix.norm.slice(Math.max(0, s - 40), s), suffix: ix.norm.slice(e, e + 40), pos: s / Math.max(1, ix.norm.length) };
  }
  /* find a quote again: every place the words occur, scored by how much of the text around them still matches */
  function locate(ix, q) {
    const hits = []; let i = -1; while ((i = ix.norm.indexOf(q.exact, i + 1)) >= 0 && hits.length < 400) hits.push(i);
    if (!hits.length) return null;
    const same = (a, b, fromEnd) => { let k = 0; while (k < a.length && k < b.length && (fromEnd ? a[a.length - 1 - k] === b[b.length - 1 - k] : a[k] === b[k])) k++; return k; };
    let best = null, bs = -1;
    for (const h of hits) { const sc = same(ix.norm.slice(Math.max(0, h - q.prefix.length), h), q.prefix, true) + same(ix.norm.slice(h + q.exact.length, h + q.exact.length + q.suffix.length), q.suffix, false) - Math.abs(h / Math.max(1, ix.norm.length) - (q.pos || 0)) * 5;
      if (sc > bs) { bs = sc; best = h; } }
    return [best, best + q.exact.length];
  }
  /* wrap the text between two collapsed-text positions in <lp-hl> elements */
  function wrap(ix, s, e, m) {
    const [n0, o0] = ix.map[s], [n1, o1] = ix.map[e - 1]; const els = [];
    for (let k = n0; k <= n1; k++) {
      let node = ix.nodes[k]; const a = k === n0 ? o0 : 0, b = k === n1 ? o1 + 1 : node.nodeValue.length;
      if (b <= a || !node.nodeValue.slice(a, b).trim() && !(k === n0 && k === n1)) continue;
      if (node.parentElement.closest("lp-hl")) { els.push(node.parentElement.closest("lp-hl")); continue; }
      if (b < node.nodeValue.length) node.splitText(b);
      if (a > 0) node = node.splitText(a);
      const w = document.createElement("lp-hl"); w.dataset.id = m.id; paint(w, m); node.parentNode.insertBefore(w, node); w.append(node); els.push(w);
    }
    return els;
  }
  function paint(w, m) { w.style.setProperty("background-color", m.color, "important"); w.style.setProperty("color", "inherit", "important"); w.style.setProperty("border-radius", "2px", "important");
    w.style.setProperty("cursor", "pointer", "important"); w.style.setProperty("box-shadow", m.note ? `0 2px 0 ${shade(m.color)}` : "none", "important"); w.title = m.note ? "Comment: " + m.note : "Lab Potato highlight"; }
  const shade = c => { const n = parseInt(c.slice(1), 16), f = v => Math.max(0, Math.round(v * .62)); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
  const marksOf = id => [...document.querySelectorAll(`lp-hl[data-id="${id}"]`)];
  function unwrap(id) { marksOf(id).forEach(w => { const p = w.parentNode; while (w.firstChild) p.insertBefore(w.firstChild, w); w.remove(); p.normalize(); }); }

  /* ---------- put everything saved for this address back ---------- */
  function applyAll() {
    lost = [];
    for (const m of DATA.marks) { if (marksOf(m.id).length) continue; const ix = textIndex(); const at = locate(ix, m.quote); if (at) wrap(ix, at[0], at[1], m); else lost.push(m.id); }
    for (const ed of DATA.edits) applyEdit(ed);
    drawBar();
  }
  function applyEdit(ed) {
    if (ed.done) return;
    let el = null; try { el = document.querySelector(ed.path); } catch (e) { /* bad selector */ }
    const ok = x => x && normText(x.textContent) === ed.orig;
    if (!ok(el)) el = [...document.body.querySelectorAll(ed.tag || "*")].find(ok) || null;
    if (!el) return;
    if (!origHtml.has(ed.id)) origHtml.set(ed.id, el.innerHTML);
    el.innerHTML = ed.html; el.dataset.lpEdited = ed.id; ed.done = true;
  }
  /* put the page's own words back where an earlier version's edit was shown */
  const origHtml = new Map();
  function undoEdits(list) {
    for (const ed of list) { const el = document.querySelector(`[data-lp-edited="${CSS.escape(ed.id)}"]`); if (el && origHtml.has(ed.id)) { el.innerHTML = origHtml.get(ed.id); delete el.dataset.lpEdited; } origHtml.delete(ed.id); }
  }
  function revertEdits() {
    const n = DATA.edits.length; if (!n) return toast("Nothing on this page was edited.");
    if (!confirm(`Put the page's own text back in the ${n} paragraph${n > 1 ? "s" : ""} edited earlier? Your highlights and comments stay.`)) return;
    undoEdits(DATA.edits); DATA.edits = []; save(); drawBar(); drawPanel(); applyAll(); toast("Edited text reverted: the page shows its own words again.");
  }

  /* ---------- making marks ---------- */
  function highlight(note) {
    const sel = getSelection(); if (!sel || sel.isCollapsed || !sel.rangeCount) { toast("Select some text first."); return null; }
    const range = sel.getRangeAt(0); if (host.contains(range.commonAncestorContainer)) return null;
    const q = describe(range); if (!q) return null;
    const m = { id: uid(), color: SET.color, quote: q, note: note || "", at: Date.now() };
    const ix = textIndex(), at = locate(ix, q); if (!at) return null;
    if (!wrap(ix, at[0], at[1], m).length) return null;
    DATA.marks.push(m); sel.removeAllRanges(); save(); drawBar(); if (panelOpen) drawPanel(); return m;
  }

  /* ---------- the UI lives in a shadow root outside <body>, so the page can't restyle it ---------- */
  const host = document.createElement("div"); host.id = "lp-dr-host"; host.style.cssText = "all:initial;position:fixed;z-index:2147483646;top:0;left:0;width:0;height:0";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>
  :host{all:initial;--acc:var(--acc);--acc-soft:#e6efff}
  *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
  .fab{position:fixed;right:16px;bottom:14px;width:52px;height:52px;border:0;padding:0;background:none;display:grid;place-items:center;cursor:pointer;opacity:.92;filter:drop-shadow(0 4px 8px rgba(60,35,10,.28));transition:opacity .15s,transform .2s cubic-bezier(.3,1.6,.5,1)}
  .fab:hover{opacity:1;transform:translateY(-2px) rotate(-6deg) scale(1.08)} .fab svg{width:52px;height:52px} .fab .n{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--acc);color:#fff;font:700 10.5px/18px sans-serif;text-align:center}
  .bar{position:fixed;display:flex;align-items:center;gap:2px;padding:4px 6px;border-radius:14px;background:rgba(255,255,255,.96);backdrop-filter:blur(14px);border:1px solid rgba(0,0,0,.12);box-shadow:0 10px 30px rgba(15,23,42,.22);color:#18202c;font-size:12.5px;max-width:calc(100vw - 16px);flex-wrap:wrap}
  .bar.dock{left:0!important;right:0!important;top:0!important;border-radius:0;max-width:none;justify-content:center;border-width:0 0 1px}
  .bar button,.pop button,.sel button,.panel button{all:unset;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:5px;height:30px;min-width:30px;padding:0 7px;border-radius:8px;font-size:12.5px;color:#18202c;white-space:nowrap}
  .bar button:hover,.pop button:hover,.sel button:hover,.panel button:hover{background:#eef2f7} .bar button.on{background:var(--acc-soft);color:var(--acc)}
  .bar .grip{cursor:grab;padding:0 4px} .bar .grip svg{width:26px;height:26px}
  .sep{width:1px;height:18px;background:#dfe4ea;margin:0 3px}
  .dot{width:15px;height:15px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.2);display:inline-block}
  button.sw{min-width:24px;padding:0 3px} button.sw.on .dot{box-shadow:0 0 0 2px #fff,0 0 0 4px var(--acc)}
  .lnk{border:0;background:none;color:var(--acc);text-decoration:underline;cursor:pointer;padding:0;font:inherit}
  b.bi{font-weight:800} i.ii{font-style:italic;font-family:Georgia,serif} u{text-decoration:underline} s{text-decoration:line-through}
  .sel{position:fixed;display:flex;gap:2px;align-items:center;padding:3px;border-radius:11px;background:rgba(255,255,255,.97);border:1px solid rgba(0,0,0,.12);box-shadow:0 8px 24px rgba(15,23,42,.2);backdrop-filter:blur(10px)}
  .sel button{color:#18202c;height:28px} .sel button:hover{background:#eef2f7} .sel .pot svg{width:18px;height:18px} .sel .x{min-width:26px;padding:0 4px;color:#6b7480;font-size:14px}
  :host(.lp-dark) .sel{background:#1c2330;border-color:rgba(255,255,255,.14)} :host(.lp-dark) .sel button{color:#fff} :host(.lp-dark) .sel button:hover{background:rgba(255,255,255,.14)} :host(.lp-dark) .sel .x{color:#aab3bf}
  .pop{position:fixed;width:300px;max-width:calc(100vw - 16px);background:#fff;border:1px solid rgba(0,0,0,.14);border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.22);padding:10px;color:#18202c;font-size:13px}
  .pop q{display:block;font-style:italic;color:#555;border-left:3px solid #ddd;padding-left:8px;margin:0 0 8px;max-height:72px;overflow:auto;quotes:none}
  textarea{width:100%;min-height:70px;border:1px solid #d5dbe3;border-radius:8px;padding:7px 8px;font-size:13px;resize:vertical;color:#18202c;background:#fff}
  .row{display:flex;align-items:center;gap:4px;margin-top:6px;flex-wrap:wrap} .grow{flex:1}
  .pri{background:var(--acc)!important;color:#fff!important;padding:0 12px!important} .danger{color:#b42318!important}
  .panel{position:fixed;right:12px;top:12px;bottom:12px;width:min(340px,calc(100vw - 24px));background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.22);display:flex;flex-direction:column;color:#18202c;font-size:13px}
  .panel h3{margin:0;font-size:14px;padding:12px 14px 8px;display:flex;align-items:center;gap:8px}
  .panel .list{overflow:auto;padding:0 10px 12px;flex:1}
  .item{border:1px solid #e6eaef;border-radius:10px;padding:8px 10px;margin:6px 0;cursor:pointer;border-left:5px solid var(--c)} .item:hover{background:#f7f9fb}
  .item .t{font-size:12.5px;line-height:1.4} .item .nt{margin-top:5px;font-size:12.5px;color:#0a3d8a} .item .m{font-size:11px;color:#77808c;margin-top:4px}
  .muted{color:#77808c;font-size:12px;padding:6px 4px}
  .toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#1c2330;color:#fff;padding:9px 14px;border-radius:10px;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.3);max-width:calc(100vw - 32px)}
  .menu{position:fixed;background:#fff;border:1px solid rgba(0,0,0,.14);border-radius:11px;box-shadow:0 12px 32px rgba(0,0,0,.22);padding:5px;min-width:230px}
  .menu button{display:flex;width:100%;justify-content:flex-start;height:auto;padding:7px 10px;flex-direction:column;align-items:flex-start;gap:1px}
  .menu small{color:#77808c;font-size:11px}
  .rail{position:fixed;top:8px;bottom:8px;width:12px;display:flex;flex-direction:column;align-items:center;gap:3px;pointer-events:none}
  .rail .st{all:unset;pointer-events:auto;width:14px;height:13px;border-radius:4px;background:rgba(255,255,255,.9);box-shadow:0 0 0 1px rgba(0,0,0,.15);font:8px/13px sans-serif;text-align:center;color:#555;cursor:pointer}
  .rail .st:hover{color:var(--acc)}
  .track{position:relative;flex:1;width:10px;border-radius:5px;background:rgba(0,0,0,.05);pointer-events:none}
  .view{position:absolute;left:0;right:0;border-radius:5px;background:rgba(10,95,208,.13);box-shadow:inset 0 0 0 1px rgba(10,95,208,.3);pointer-events:none}
  .tick{all:unset;position:absolute;left:50%;transform:translate(-50%,-50%);cursor:pointer;background:var(--c);pointer-events:auto}
  .tick.hl{width:10px;height:4px;border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.2)}
  .tick.cm{width:10px;height:10px;border-radius:50% 50% 50% 2px;box-shadow:0 0 0 1.5px rgba(0,0,0,.45)}
  .tick.ed{width:10px;height:4px;border-radius:2px;background:#8b5cf6}
  .tick:hover,.tick.on{transform:translate(-50%,-50%) scale(1.6);z-index:2;box-shadow:0 0 0 2px var(--acc)}
  .prog{position:fixed;left:0;top:0;height:3px;background:linear-gradient(90deg,#cd9050,var(--acc));pointer-events:none;transition:width .1s}
  .tabs{display:flex;gap:4px;padding:0 10px 6px}.tabs button{flex:1;height:28px!important;font-size:12px!important;background:#f1f4f8}.tabs button.on{background:var(--acc)!important;color:#fff!important}
  .search{width:calc(100% - 20px);margin:0 10px 6px;padding:6px 9px;border:1px solid #d5dbe3;border-radius:8px;font-size:12.5px;box-sizing:border-box;color:inherit;background:transparent}
  .ol{display:block;padding:5px 8px;border-radius:7px;cursor:pointer;font-size:12.5px;line-height:1.35}.ol:hover{background:#eef2f7}.ol.h2{padding-left:18px}.ol.h3{padding-left:30px;font-size:12px}.ol.h4{padding-left:42px;font-size:12px;color:#5b6472}
  .pnote{min-height:180px}
  [hidden]{display:none!important}
  :host(.lp-dark) .bar,:host(.lp-dark) .pop,:host(.lp-dark) .panel,:host(.lp-dark) .menu{background:#1f2630;color:#e8edf3;border-color:rgba(255,255,255,.14)} :host(.lp-dark) .bar button,:host(.lp-dark) .pop button,:host(.lp-dark) .panel button,:host(.lp-dark) .menu button{color:#e8edf3} :host(.lp-dark) .bar button:hover,:host(.lp-dark) .pop button:hover,:host(.lp-dark) .panel button:hover,:host(.lp-dark) .menu button:hover{background:#2b3440} :host(.lp-dark) textarea{background:#161b22;color:#e8edf3;border-color:#3a4450} :host(.lp-dark) .item{border-color:#333d48} :host(.lp-dark) .item:hover{background:#252d37} :host(.lp-dark) .item .nt{color:#9cc3ff} :host(.lp-dark) .sep{background:#3a4450} :host(.lp-dark) .bar button.on{background:rgba(255,255,255,.1)}
  </style>
  <button class="fab" title="Lab Potato: highlight, comment and edit this page" aria-label="Open Lab Potato tools"></button>
  <div class="bar" role="toolbar" aria-label="Lab Potato" hidden></div>
  <div class="prog" hidden></div><div class="rail" hidden><button class="st" data-r="-1" title="Previous mark (Alt+Up)">▲</button><div class="track"><div class="view"></div></div><button class="st" data-r="1" title="Next mark (Alt+Down)">▼</button></div><div class="sel" hidden></div><div class="pop" hidden></div><div class="panel" hidden></div><div class="menu" hidden></div><div class="toast" hidden></div>`;
  const $ = s => root.querySelector(s), railEl = $(".rail"), track = $(".track"), viewBox = $(".view"), prog = $(".prog"), fab = $(".fab"), bar = $(".bar"), selPop = $(".sel"), pop = $(".pop"), panel = $(".panel"), menuEl = $(".menu"), toastEl = $(".toast");
  const POTATO = `<svg aria-hidden="true" viewBox="0 0 128 128"><defs><radialGradient id="lpfb" cx="36%" cy="30%" r="80%"><stop offset="0" stop-color="#f6cf96"/><stop offset=".55" stop-color="#dba264"/><stop offset="1" stop-color="#b37840"/></radialGradient><radialGradient id="lpfs" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#5a3a1c" stop-opacity=".32"/><stop offset="1" stop-color="#5a3a1c" stop-opacity="0"/></radialGradient><linearGradient id="lpfl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8fe08a"/><stop offset="1" stop-color="#3fae5a"/></linearGradient></defs><ellipse cx="66" cy="117" rx="44" ry="7" fill="url(#lpfs)"/><g transform="rotate(-6 66 68)"><path d="M18 70C15 46 34 27 60 23C86 19 108 27 116 47C123 64 119 86 106 99C92 112 70 116 50 112C30 108 20 92 18 70Z" fill="url(#lpfb)"/><path d="M18 70C15 46 34 27 60 23C86 19 108 27 116 47C123 64 119 86 106 99C92 112 70 116 50 112C30 108 20 92 18 70Z" fill="none" stroke="#8a5528" stroke-opacity=".25" stroke-width="2"/><ellipse cx="44" cy="40" rx="16" ry="8" transform="rotate(-24 44 40)" fill="#fff" opacity=".42"/><circle cx="99" cy="50" r="2.4" fill="#9a6232" opacity=".55"/><circle cx="31" cy="86" r="2" fill="#9a6232" opacity=".5"/><circle cx="88" cy="97" r="2.2" fill="#9a6232" opacity=".5"/><ellipse cx="48" cy="79" rx="8" ry="5" fill="#f08c7c" opacity=".55"/><ellipse cx="95" cy="76" rx="8" ry="5" fill="#f08c7c" opacity=".55"/><ellipse cx="55" cy="66" rx="5.4" ry="6.6" fill="#2a1d12"/><ellipse cx="86" cy="64" rx="5.4" ry="6.6" fill="#2a1d12"/><circle cx="56.8" cy="63.4" r="1.9" fill="#fff"/><circle cx="87.8" cy="61.4" r="1.9" fill="#fff"/><path d="M63 79Q71 86 79 78" stroke="#2a1d12" stroke-width="4" fill="none" stroke-linecap="round"/></g><path d="M72 25C72 18 74 12 78 8" stroke="#3fae5a" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M77 10C82 2 94 2 98 6C93 14 84 15 77 10Z" fill="url(#lpfl)"/><path d="M75 13C69 6 59 7 56 11C61 17 70 18 75 13Z" fill="url(#lpfl)"/></svg>`;
  let toastT; function toast(m) { toastEl.textContent = m; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => toastEl.hidden = true, 3200); }
  /* a toast with an Undo button: the last removal can be taken back for a few seconds */
  function toastUndo(m, fn) { toastEl.innerHTML = `${esc(m)} <button class="lnk" style="color:#9cc3ff;margin-left:8px">Undo</button>`; toastEl.querySelector("button").onclick = () => { toastEl.hidden = true; fn(); }; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => toastEl.hidden = true, 7000); }
  /* look: light, dark or follow the system; and the accent colour */
  const sysDark = matchMedia("(prefers-color-scheme: dark)");
  function applyLook() { const dark = SET.look === "dark" || (SET.look !== "light" && sysDark.matches); host.classList.toggle("lp-dark", dark);
    const a = SET.accent || "#0a5fd0"; host.style.setProperty("--acc", a); host.style.setProperty("--acc-soft", a + "22"); }
  sysDark.addEventListener("change", applyLook);

  /* ---------- the toolbar ---------- */
  function drawBar() {
    const n = DATA.marks.length, ne = DATA.edits.length;
    fab.innerHTML = POTATO + (n + ne ? `<span class="n">${n + ne}</span>` : ""); fab.hidden = SET.open || !SET.button;
    bar.hidden = !SET.open; bar.classList.toggle("dock", !!SET.dock); 
    if (!SET.open) { document.documentElement.style.removeProperty("margin-top"); drawRail(); return; }
    bar.innerHTML = `<button class="grip" data-a="fold" title="Drag to move · click to fold back into the potato">${POTATO}</button><span class="sep"></span>
      <button data-a="hl" title="Highlight the selected text (Alt+H)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>Highlight</button>
      ${COLORS.map(([c, nm]) => `<button class="sw${SET.color === c ? " on" : ""}" data-a="color" data-c="${c}" title="${nm}"><i class="dot" style="background:${c}"></i></button>`).join("")}
      <button data-a="cmt" title="Comment on the selected text"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Comment</button>
      <span class="sep"></span>
      ${ne ? `<button data-a="revert" title="Put the page's own text back where it was edited with an earlier version">↺ Revert edits ${ne}</button><span class="sep"></span>` : ""}
      <button data-a="prev" title="Previous mark (Alt+Up)">↑</button><button data-a="next" title="Next mark (Alt+Down)">↓</button>
      <button data-a="notes" class="${panelOpen ? "on" : ""}" title="Notes, the page's outline and a note for the whole page">☰ Notes ${n ? n : ""}</button>
      <button data-a="more" title="Export, Doc Reader, library, settings">⋯</button>`;
    placeBar(); drawRail();
  }
  function placeBar() {
    if (SET.dock) { requestAnimationFrame(() => document.documentElement.style.setProperty("margin-top", bar.offsetHeight + "px", "important")); return; }
    document.documentElement.style.removeProperty("margin-top");
    const p = SET.pos; requestAnimationFrame(() => { const w = bar.offsetWidth, h = bar.offsetHeight;
      let x = p ? Math.min(Math.max(4, p[0]), innerWidth - w - 4) : innerWidth - w - 18; const y = p ? Math.min(Math.max(4, p[1]), innerHeight - h - 4) : 14;
      if (panelOpen && x + w > innerWidth - 360) x = Math.max(4, innerWidth - 360 - w);   // never under the notes panel
      bar.style.left = x + "px"; bar.style.top = y + "px"; });
  }
  function setOpen(o) { SET.open = o; if (!o) { panelOpen = false; panel.hidden = true; } saveSet(); drawBar(); drawProgress(); }
  fab.addEventListener("click", () => setOpen(true));
  bar.addEventListener("mousedown", e => { if (e.target.closest("button")) e.preventDefault(); });   // keep the page's selection
  bar.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    const a = b.dataset.a;
    if (a === "hl") { if (!highlight()) toast("Select some text on the page first."); }
    else if (a === "color") { SET.color = b.dataset.c; saveSet(); const s = getSelection(); if (s && !s.isCollapsed) highlight(); drawBar(); }
    else if (a === "cmt") comment();
    else if (a === "revert") revertEdits();
    else if (a === "notes") { panelOpen = !panelOpen; drawPanel(); drawBar(); }
    else if (a === "prev" || a === "next") stepMark(a === "next" ? 1 : -1);
    else if (a === "more") moreMenu(b);
  });
  /* drag by the potato; a plain click folds the bar back */
  bar.addEventListener("pointerdown", e => {
    const g = e.target.closest(".grip"); if (!g) return; e.preventDefault(); g.setPointerCapture(e.pointerId);
    const r = bar.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top, x0 = e.clientX, y0 = e.clientY; let moved = false;
    const mv = ev => { if (!moved && Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) < 5) return; if (!moved && SET.dock) { SET.dock = false; drawBar(); } moved = true; bar.style.left = Math.min(Math.max(4, ev.clientX - dx), innerWidth - bar.offsetWidth - 4) + "px"; bar.style.top = Math.min(Math.max(4, ev.clientY - dy), innerHeight - bar.offsetHeight - 4) + "px"; };
    const up = () => { g.removeEventListener("pointermove", mv); g.removeEventListener("pointerup", up); if (moved) { SET.pos = [parseFloat(bar.style.left), parseFloat(bar.style.top)]; saveSet(); } else setOpen(false); };
    g.addEventListener("pointermove", mv); g.addEventListener("pointerup", up);
  });
  addEventListener("resize", () => SET.open && placeBar());

  function moreMenu(anchor) {
    const items = [
      ["dock", SET.dock ? "Float the toolbar" : "Dock the toolbar at the top", SET.dock ? "Move it freely over the page again" : "Its own strip; the page moves down so nothing is covered"],
      ["md", "Export notes as Markdown", "The highlights, comments and page note"],
      ["copy", "Copy notes", "The same, to paste into Lab Entry, Notion or a document"],
      ["rail", SET.rail ? "Hide marks beside the scroll bar" : "Show marks beside the scroll bar", "A tick for every highlight and comment; click one to go there"],
      ["progress", SET.progress ? "Hide the reading progress line" : "Show the reading progress line", "A thin line at the top: how far down the page you are"],
      ["html", "Save this page with your marks (.html)", "The page as it is now, with your highlights"],
      ["reader", "Open in Doc Reader", "Edit a copy there: Word-style editing, AI editor, PDF export"],
      ...(DATA.edits.length ? [["revert", `Revert edited text (${DATA.edits.length})`, "Paragraphs edited with an earlier version get the page's own words back"]] : []),
      ["lib", "All my pages", "Every page you marked, to reopen or export"],
      ["button", SET.button ? "Hide the potato on pages" : "Show the potato on pages", SET.button ? "Open the tools from the extension icon (Alt+Shift+R) instead" : "A small button at the bottom right of every page"],
      ["look", "Look: " + (SET.look === "auto" ? "follows the system" : SET.look === "dark" ? "dark" : "light"), "Click to change: light, dark, or follow the system"],
      ["accent", "Accent colour: " + ((ACCENTS.find(([c]) => c === SET.accent) || ACCENTS[0])[1]), "Click for the next colour"],
      ["off", `Turn off on ${HOST}`, "The potato and the tools stay hidden on this site; the extension icon or All my pages turns them back on"],
      ["clear", "Remove everything on this page", "Kept for 30 days under Recently removed in All my pages", true]];
    menuEl.innerHTML = items.map(([a, l, s, d]) => `<button data-m="${a}" class="${d ? "danger" : ""}"><span>${l}</span><small>${s}</small></button>`).join("");
    menuEl.hidden = false; const r = anchor.getBoundingClientRect(), w = menuEl.offsetWidth, h = menuEl.offsetHeight;
    menuEl.style.left = Math.min(Math.max(8, r.right - w), innerWidth - w - 8) + "px"; menuEl.style.top = (r.bottom + h + 6 < innerHeight ? r.bottom + 4 : Math.max(8, r.top - h - 4)) + "px";
  }
  menuEl.addEventListener("click", async e => {
    const b = e.target.closest("[data-m]"); if (!b) return; menuEl.hidden = true; const a = b.dataset.m;
    if (a === "dock") { SET.dock = !SET.dock; saveSet(); drawBar(); }
    else if (a === "md") download(new Blob([notesMd()], { type: "text/markdown" }), fileName() + "_notes.md");
    else if (a === "html") download(new Blob([pageHtml()], { type: "text/html" }), fileName() + ".html");
    else if (a === "copy") { try { await navigator.clipboard.writeText(notesMd()); toast("Notes copied."); } catch (er) { toast("The page did not allow copying; use Export notes instead."); } }
    else if (a === "rail") { SET.rail = !SET.rail; saveSet(); drawRail(); }
    else if (a === "progress") { SET.progress = !SET.progress; saveSet(); drawProgress(); }
    else if (a === "reader") chrome.runtime.sendMessage({ t: "reader" });
    else if (a === "lib") chrome.runtime.sendMessage({ t: "library" });
    else if (a === "button") { SET.button = !SET.button; saveSet(); drawBar(); toast(SET.button ? "The potato shows on every page." : "Hidden. Open the tools with the extension icon or Alt+Shift+R."); }
    else if (a === "revert") revertEdits();
    else if (a === "off") { SET.off = [...new Set([...(SET.off || []), HOST])]; SET.on = (SET.on || []).filter(h => h !== HOST); saveSet(); shutDown(); }
    else if (a === "look") { SET.look = SET.look === "auto" ? "light" : SET.look === "light" ? "dark" : "auto"; saveSet(); applyLook(); toast("Look: " + (SET.look === "auto" ? "follows the system" : SET.look)); }
    else if (a === "accent") { const i = ACCENTS.findIndex(([c]) => c === SET.accent); SET.accent = ACCENTS[(i + 1) % ACCENTS.length][0]; saveSet(); applyLook(); drawBar(); toast("Accent: " + ACCENTS.find(([c]) => c === SET.accent)[1]); }
    else if (a === "clear") { const keep = JSON.parse(JSON.stringify(DATA)); try { await store.set({ ["lp:trash:" + KEY.slice(3)]: { data: keep, at: Date.now() } }); } catch (er) {} if (!confirm("Remove every highlight and comment on this page" + (DATA.edits.length ? " and put its own text back where it was edited" : "") + "?")) return; DATA.marks.forEach(m => unwrap(m.id)); undoEdits(DATA.edits); DATA.marks = []; DATA.edits = []; save(); drawBar(); drawPanel(); }
  });
  document.addEventListener("pointerdown", e => { if (!e.composedPath().includes(host)) { menuEl.hidden = true; } }, true);

  /* ---------- the selection bubble ---------- */
  let selMute = 0;   // after ✕, the bubble stays away for a minute
  function showSelPop() {
    if (Date.now() < selMute) { selPop.hidden = true; return; }
    const s = getSelection(); if (!s || s.isCollapsed || !s.rangeCount || !s.toString().trim()) { selPop.hidden = true; return; }
    const range = s.getRangeAt(0); if (host.contains(range.commonAncestorContainer)) return;
    const r = range.getBoundingClientRect(); if (!r.width && !r.height) { selPop.hidden = true; return; }
    selPop.innerHTML = `<button data-s="hl" class="pot" title="Highlight with Lab Potato">${POTATO}Highlight</button>${COLORS.slice(0, 4).map(([c, nm]) => `<button data-s="c" data-c="${c}" title="${nm}"><i class="dot" style="background:${c}"></i></button>`).join("")}<button data-s="cmt" title="Comment">💬</button><button data-s="x" class="x" title="Close (Esc). To keep it away on this site: ⋯ → Turn off on this site">✕</button>`;
    selPop.hidden = false; const w = selPop.offsetWidth, h = selPop.offsetHeight;
    selPop.style.left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8) + "px"; selPop.style.top = (r.top - h - 8 > 4 ? r.top - h - 8 : r.bottom + 8) + "px";
  }
  selPop.addEventListener("mousedown", e => e.preventDefault());
  selPop.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; selPop.hidden = true;
    if (b.dataset.s === "x") { selMute = Date.now() + 60000; return; }
    if (b.dataset.s === "c") { SET.color = b.dataset.c; saveSet(); }
    if (b.dataset.s === "cmt") { comment(); setOpen(true); return; }
    if (highlight()) setOpen(true);   // pressing Highlight opens the full tools
  });
  document.addEventListener("mouseup", e => { if (e.composedPath().includes(host)) return; setTimeout(showSelPop, 10); });
  document.addEventListener("keyup", e => { if (e.shiftKey && /Arrow|Home|End/.test(e.key)) showSelPop(); });
  document.addEventListener("selectionchange", () => { const s = getSelection(); if (!s || s.isCollapsed) selPop.hidden = true; });
  document.addEventListener("keydown", e => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "h") { const s = getSelection(); if (s && !s.isCollapsed) { e.preventDefault(); if (highlight()) setOpen(true); } }
    if (e.key === "Escape") { pop.hidden = true; menuEl.hidden = true; selPop.hidden = true; }
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "ArrowDown" || e.key === "ArrowUp") && railMarks().length && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "") ) { e.preventDefault(); e.stopPropagation(); stepMark(e.key === "ArrowDown" ? 1 : -1); }
  }, true);

  /* ---------- comments ---------- */
  function comment() { const m = highlight(); if (!m) { toast("Select some text to comment on."); return; } openPop(m); }
  function openPop(m) {
    const el = marksOf(m.id)[0]; if (!el) return; const r = el.getBoundingClientRect();
    pop.innerHTML = `<q>${esc(m.quote.exact.slice(0, 300))}</q><textarea placeholder="Write a comment… (Ctrl+Enter saves)">${esc(m.note)}</textarea>
      <div class="row">${COLORS.map(([c, nm]) => `<button class="sw${m.color === c ? " on" : ""}" data-p="color" data-c="${c}" title="${nm}"><i class="dot" style="background:${c}"></i></button>`).join("")}<span class="grow"></span>
      <button data-p="del" class="danger" title="Remove this highlight">Remove</button><button data-p="ok" class="pri">Save</button></div>`;
    pop.hidden = false; pop.dataset.id = m.id; const w = pop.offsetWidth, h = pop.offsetHeight;
    pop.style.left = Math.min(Math.max(8, r.left), innerWidth - w - 8) + "px"; pop.style.top = (r.bottom + h + 8 < innerHeight ? r.bottom + 6 : Math.max(8, r.top - h - 6)) + "px";
    const ta = pop.querySelector("textarea"); ta.focus(); ta.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) pop.querySelector("[data-p=ok]").click(); if (e.key === "Escape") pop.hidden = true; });
  }
  pop.addEventListener("click", e => { const b = e.target.closest("[data-p]"); if (!b) return; const m = DATA.marks.find(x => x.id === pop.dataset.id); if (!m) return;
    if (b.dataset.p === "color") { m.color = b.dataset.c; marksOf(m.id).forEach(w => paint(w, m)); pop.querySelectorAll(".sw").forEach(x => x.classList.toggle("on", x === b)); save(); }
    else if (b.dataset.p === "del") { unwrap(m.id); DATA.marks = DATA.marks.filter(x => x !== m); pop.hidden = true; save(); drawBar(); drawPanel();
      toastUndo("Highlight removed.", () => { DATA.marks.push(m); applyAll(); save(); drawBar(); drawPanel(); }); }
    else if (b.dataset.p === "ok") { m.note = pop.querySelector("textarea").value.trim(); marksOf(m.id).forEach(w => paint(w, m)); pop.hidden = true; save(); drawPanel(); }
  });
  /* click a highlight: its comment box */
  document.addEventListener("click", e => { const w = e.target.closest?.("lp-hl"); if (!w) return; const s = getSelection(); if (s && !s.isCollapsed) return;
    const m = DATA.marks.find(x => x.id === w.dataset.id); if (m) { e.preventDefault(); e.stopPropagation(); openPop(m); } }, true);
  document.addEventListener("pointerdown", e => { if (!e.composedPath().includes(host) && !e.target.closest?.("lp-hl")) pop.hidden = true; }, true);

  /* ---------- notes panel ---------- */
  /* the page's own headings, for jumping around a long page */
  const headings = () => [...document.body.querySelectorAll("h1,h2,h3,h4")].filter(h => h.textContent.trim() && h.getClientRects().length && !h.closest("nav,footer,aside,[aria-hidden=true]")).slice(0, 200);
  function drawPanel() {
    panel.hidden = !panelOpen; if (!panelOpen) return;
    const q = noteQ.toLowerCase(), list = DATA.marks.slice().sort((a, b) => (a.quote.pos || 0) - (b.quote.pos || 0)).filter(m => !q || (m.quote.exact + " " + m.note).toLowerCase().includes(q));
    const T = (k, l) => `<button data-tab="${k}" class="${tab === k ? "on" : ""}">${l}</button>`;
    let body = "";
    if (tab === "notes") body = `<input class="search" type="search" placeholder="Search your highlights and comments" value="${esc(noteQ)}">
      <div class="list">${list.length ? list.map(m => `<div class="item" data-id="${m.id}" style="--c:${m.color}"><div class="t">${esc(m.quote.exact.slice(0, 220))}${m.quote.exact.length > 220 ? "…" : ""}</div>${m.note ? `<div class="nt">💬 ${esc(m.note)}</div>` : ""}<div class="m">${new Date(m.at).toLocaleString()}${lost.includes(m.id) ? " · not found on the page now" : ""}</div></div>`).join("") : `<p class="muted">${DATA.marks.length ? "Nothing matches." : "Nothing marked yet. Select text and press Highlight."}</p>`}
      ${DATA.edits.length ? `<p class="muted">${DATA.edits.length} paragraph${DATA.edits.length > 1 ? "s" : ""} edited with an earlier version. <button class="lnk" data-n="revert">Revert edited text</button></p>` : ""}</div>`;
    else if (tab === "outline") { const hs = headings(); body = `<div class="list">${hs.length ? hs.map((h, i) => `<span class="ol ${h.tagName.toLowerCase()}" data-h="${i}">${esc(h.textContent.trim().slice(0, 120))}</span>`).join("") : '<p class="muted">This page has no headings.</p>'}</div>`; }
    else body = `<div class="list"><textarea class="pnote" placeholder="A note for this whole page: why you saved it, what to do next…">${esc(DATA.pageNote || "")}</textarea><p class="muted">Saved as you type, with this page's highlights. Shows in the library and in exports.</p></div>`;
    panel.innerHTML = `<h3>${POTATO.replace("<svg", '<svg width="22" height="22"')}On this page<span class="grow"></span><button data-n="close" title="Close">✕</button></h3>
      <div class="tabs">${T("notes", "Notes " + (DATA.marks.length || ""))}${T("outline", "Outline")}${T("page", "Page note" + ((DATA.pageNote || "").trim() ? " •" : ""))}</div>${body}`;
    const si = panel.querySelector(".search"); if (si) si.addEventListener("input", e => { noteQ = e.target.value; const pos = e.target.selectionStart; drawPanel(); const n = panel.querySelector(".search"); n.focus(); n.setSelectionRange(pos, pos); });
    const pn = panel.querySelector(".pnote"); if (pn) pn.addEventListener("input", e => { DATA.pageNote = e.target.value; save(); });
    panel.querySelectorAll("input,textarea").forEach(x => x.addEventListener("keydown", e => e.stopPropagation()));
  }
  panel.addEventListener("click", e => { if (e.target.closest("[data-n=close]")) { panelOpen = false; drawPanel(); drawBar(); return; }
    if (e.target.closest("[data-n=revert]")) { revertEdits(); return; }
    const tb = e.target.closest("[data-tab]"); if (tb) { tab = tb.dataset.tab; drawPanel(); return; }
    const ol = e.target.closest("[data-h]"); if (ol) { const h = headings()[+ol.dataset.h]; if (h) { h.scrollIntoView({ behavior: "smooth", block: "start" }); afterScroll(() => flash(h)); } return; }
    const it = e.target.closest(".item"); if (!it) return; const el = marksOf(it.dataset.id)[0]; if (!el) return toast("That text is not on the page now.");
    el.scrollIntoView({ behavior: "smooth", block: "center" }); const m = DATA.marks.find(x => x.id === it.dataset.id); afterScroll(() => { marksOf(m.id).forEach(flash); openPop(m); }); });

  /* ---------- marks beside the scroll bar, and the reading progress line ---------- */
  const docH = () => Math.max(1, document.documentElement.scrollHeight, document.body.scrollHeight);
  function railMarks() {
    const out = [], H = docH();
    for (const m of DATA.marks) { const el = marksOf(m.id)[0]; if (!el) continue; out.push({ kind: m.note ? "cm" : "hl", m, el, color: m.color, f: (el.getBoundingClientRect().top + scrollY) / H, title: (m.note ? "Comment: " + m.note : "Highlight: " + m.quote.exact).slice(0, 140) }); }
    document.querySelectorAll("[data-lp-edited]").forEach(el => out.push({ kind: "ed", el, color: "#8b5cf6", f: (el.getBoundingClientRect().top + scrollY) / H, title: "Edited: " + el.textContent.trim().slice(0, 120) }));
    return out.sort((a, b) => a.f - b.f);
  }
  function drawRail() {
    const ms = SET.rail === false ? [] : railMarks(); railEl.hidden = !ms.length; railEl._ms = ms; if (!ms.length) return;
    const sb = Math.max(0, innerWidth - document.documentElement.clientWidth);
    railEl.style.right = (panelOpen ? Math.min(innerWidth - 40, 12 + Math.min(340, innerWidth - 24) + 6) : sb + 3) + "px";   // beside the notes panel when it is open
    track.querySelectorAll(".tick").forEach(t => t.remove());
    ms.forEach((x, k) => { const t = document.createElement("button"); t.className = "tick " + x.kind + (k === railIdx ? " on" : ""); t.style.top = (Math.min(1, Math.max(0, x.f)) * 100).toFixed(2) + "%"; t.style.setProperty("--c", x.color); t.title = x.title; t.dataset.k = k; track.append(t); });
    drawView();
  }
  function drawView() { if (railEl.hidden) return; const H = docH(); viewBox.style.top = (scrollY / H * 100) + "%"; viewBox.style.height = Math.max(2, innerHeight / H * 100) + "%"; }
  function drawProgress() { const on = SET.progress !== false && SET.open, H = docH() - innerHeight; prog.hidden = !on || H < 200; if (!prog.hidden) prog.style.width = (Math.min(1, scrollY / H) * 100) + "%"; }
  function afterScroll(fn) { let last = -1, n = 0; const t = setInterval(() => { if (scrollY === last || ++n > 12) { clearInterval(t); fn(); } last = scrollY; }, 100); }
  /* the emphasis when you arrive: an orange ring that pulses twice */
  function flash(el) { try { el.animate([{ outline: "3px solid rgba(255,159,28,0)", outlineOffset: "2px" }, { outline: "3px solid #ff9f1c", outlineOffset: "2px", boxShadow: "0 0 0 6px rgba(255,159,28,.35)" }, { outline: "3px solid rgba(255,159,28,0)", outlineOffset: "2px" }, { outline: "3px solid #ff9f1c", outlineOffset: "2px", boxShadow: "0 0 0 6px rgba(255,159,28,.35)" }, { outline: "3px solid rgba(255,159,28,0)", outlineOffset: "2px" }], { duration: 1800, easing: "ease-in-out" }); } catch (e) { /* old browser */ } }
  function goMark(k) { const ms = railEl._ms || railMarks(), x = ms[k]; if (!x) return; railIdx = k;
    x.el.scrollIntoView({ behavior: "smooth", block: "center" });
    afterScroll(() => { (x.m ? marksOf(x.m.id) : [x.el]).forEach(flash); });
    track.querySelectorAll(".tick").forEach(t => t.classList.toggle("on", +t.dataset.k === k)); }
  function stepMark(dir) { const ms = railMarks(); railEl._ms = ms; if (!ms.length) return toast("Nothing marked on this page yet.");
    const mid = (scrollY + innerHeight / 2) / docH();
    if (railIdx < 0 || railIdx >= ms.length) { let k = dir > 0 ? ms.findIndex(x => x.f > mid + 0.001) : ms.map(x => x.f < mid - 0.001).lastIndexOf(true); if (k < 0) k = dir > 0 ? 0 : ms.length - 1; return goMark(k); }
    goMark((railIdx + dir + ms.length) % ms.length); }
  track.addEventListener("click", e => { const t = e.target.closest(".tick"); if (t) goMark(+t.dataset.k); });
  railEl.addEventListener("click", e => { const b = e.target.closest("[data-r]"); if (b) stepMark(+b.dataset.r); });
  addEventListener("scroll", () => requestAnimationFrame(() => { drawView(); drawProgress(); }), { passive: true });
  addEventListener("resize", () => { drawRail(); drawProgress(); });
  { let t; new ResizeObserver(() => { clearTimeout(t); t = setTimeout(drawRail, 250); }).observe(document.documentElement); }

  /* ---------- exports ---------- */
  const fileName = () => (document.title || location.hostname).replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 60).replace(/\s+/g, "_");
  function download(blob, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.documentElement.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  function notesMd() { return `# ${document.title}\n\n<${DATA.url}>\n\n` + ((DATA.pageNote || "").trim() ? `**Page note:** ${DATA.pageNote.trim()}\n\n` : "") + DATA.marks.slice().sort((a, b) => (a.quote.pos || 0) - (b.quote.pos || 0)).map(m => `> ${m.quote.exact}\n${m.note ? `\n${m.note}\n` : ""}`).join("\n") + `\n_Saved with Lab Potato Doc Reader, ${new Date().toLocaleString()}_\n`; }
  function pageHtml() { const d = document.documentElement.cloneNode(true); d.querySelectorAll("script,noscript,#lp-dr-host").forEach(e => e.remove()); d.querySelector("body")?.removeAttribute("contenteditable");
    const b = d.querySelector("head"); if (b && !d.querySelector("base")) { const base = document.createElement("base"); base.href = location.href; b.prepend(base); }
    return "<!doctype html>\n" + d.outerHTML; }

  /* ---------- start ---------- */
  chrome.runtime.onMessage.addListener((msg, _s, reply) => {
    if (!booted) {   // the tools are off on this site: the extension icon (or the library) turns them on here
      if (msg.t === "toggle" || msg.t === "highlight") { SET.on = [...new Set([...(SET.on || []), HOST])]; SET.off = (SET.off || []).filter(h => h !== HOST); saveSet(); boot(true); reply({ ok: true, turnedOn: true }); }
      else if (msg.t === "offSite") reply({ ok: true, already: true });
      else reply({ ok: true, off: true });
      return; }
    if (msg.t === "offSite") { SET.off = [...new Set([...(SET.off || []), HOST])]; SET.on = (SET.on || []).filter(h => h !== HOST); saveSet(); shutDown(); reply({ ok: true }); }
    else if (msg.t === "toggle") { setOpen(!SET.open); reply({ ok: true }); }
    else if (msg.t === "highlight") { if (highlight()) setOpen(true); reply({ ok: true }); }
    else if (msg.t === "ping") reply({ ok: true });
  });
  chrome.storage.onChanged.addListener((ch, area) => { if (area === "local" && ch[SKEY] && ch[SKEY].newValue) { const o = SET.open; SET = Object.assign(SET, ch[SKEY].newValue); SET.open = o; if (booted && siteOff()) return shutDown(); if (!booted && !siteOff()) return boot(false); if (booted) { applyLook(); drawBar(); } }
    // this page's marks changed on another computer (Chrome Sync) or in another tab: show the newer copy
    if (area === "local" && ch[KEY]) { const nv = ch[KEY].newValue;
      if (nv && (nv.updated || 0) > (DATA.updated || 0)) { DATA.marks.forEach(m => unwrap(m.id)); undoEdits(DATA.edits.filter(ed => !(nv.edits || []).some(x => x.id === ed.id))); DATA = Object.assign({ marks: [], edits: [], pageNote: "" }, nv); DATA.edits.forEach(ed => ed.done = false); applyAll(); drawPanel(); toast("Lab Potato: highlights updated from your other computer."); }
      else if (!nv && (DATA.marks.length || DATA.edits.length) && !pendingSave) { DATA.marks.forEach(m => unwrap(m.id)); undoEdits(DATA.edits); DATA.marks = []; DATA.edits = []; DATA.pageNote = ""; drawBar(); drawPanel(); } } });
  function shutDown() { booted = false; SET.open = false; panelOpen = false; DATA.marks.forEach(m => unwrap(m.id)); host.remove(); document.documentElement.style.removeProperty("margin-top"); }
  function boot(openNow) {
    booted = true; document.documentElement.append(host); applyLook();
    DATA.edits.forEach(ed => ed.done = false);
    SET.open = !!openNow;   // every page starts with just the potato; it opens when you click it or highlight
    applyAll();
    // pages that build their text late (single-page apps): try again for a while as content appears
    if (lost.length || DATA.edits.some(ed => !ed.done)) { let tries = 0; const mo = new MutationObserver(() => { clearTimeout(mo.t); mo.t = setTimeout(() => { applyAll(); if ((!lost.length && DATA.edits.every(ed => ed.done)) || ++tries > 20) mo.disconnect(); }, 400); });
      mo.observe(document.body, { childList: true, subtree: true, characterData: true }); setTimeout(() => mo.disconnect(), 20000); }
    if (DATA.marks.length || DATA.edits.length) toast(`Lab Potato: ${DATA.marks.length} highlight${DATA.marks.length === 1 ? "" : "s"}${DATA.edits.length ? ` and ${DATA.edits.length} edit${DATA.edits.length === 1 ? "" : "s"}` : ""} restored from ${new Date(DATA.updated).toLocaleString()}${lost.length ? ` (${lost.length} not found on the page now)` : ""}.`);
    drawRail();
    if (openNow) { drawBar(); toast(`Lab Potato is on for ${HOST} again.`); }
  }
  (async () => {
    try {
      PID = paperId();
      const isPage = k => k.startsWith("lp:http") || k.startsWith("lp:file");
      const st = await store.get(null);
      if (st[SKEY]) SET = Object.assign(SET, st[SKEY]);
      // every record that is this paper: the same DOI, or the same address once any proxy is undone (this also
      // finds notes saved before v7 under a proxy address)
      const same = Object.keys(st).filter(k => isPage(k) && st[k] && ((PID && st[k].paper === PID) || k === "lp:" + HERE || deproxy(k.slice(3)) === CANON));
      same.sort((a, b) => (st[b].updated || 0) - (st[a].updated || 0));
      if (same.length) { KEY = same[0]; DATA = Object.assign(DATA, st[KEY]); }
      DATA.url = KEY.slice(3);   // the sync and the library find a record by its address
      if (PID) DATA.paper = PID;
      const moved = same.length && st[KEY].lastUrl !== HERE;
      DATA.lastUrl = HERE;   // the library opens the paper where you last read it (through the proxy, if that is how you get in)
      // notes kept under another address for the same paper join this one
      const rest = same.slice(1);
      if (rest.length) {
        for (const k of rest) { const o = st[k];
          for (const m of o.marks || []) if (!DATA.marks.some(x => x.id === m.id || (x.quote?.exact === m.quote?.exact && x.quote?.prefix === m.quote?.prefix))) DATA.marks.push(m);
          for (const ed of o.edits || []) if (!DATA.edits.some(x => x.id === ed.id)) DATA.edits.push(ed);
          if ((o.pageNote || "").trim() && !(DATA.pageNote || "").includes(o.pageNote.trim())) DATA.pageNote = [DATA.pageNote, o.pageNote].filter(x => (x || "").trim()).join("\n\n"); }
        DATA.updated = Date.now(); await store.set({ [KEY]: DATA }); await store.remove(rest);
      } else if (same.length && (moved || (PID && st[KEY].paper !== PID))) await store.set({ [KEY]: DATA });   // where you read it now; the DOI on notes saved before v7
    } catch (e) { /* storage unavailable */ }
    if (!siteOff()) boot(false);
    window.__lpDR = { get data() { return DATA; }, get key() { return KEY; }, deproxy, paperId, highlight, setOpen, revertEdits, undoEdits, applyAll, stepMark, drawRail };   // for tests
  })();
})();
