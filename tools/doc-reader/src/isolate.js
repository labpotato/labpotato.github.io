/* ---------- v4: a web page opened in the editor can't take over Doc Reader ----------
   A page's body is shown inside #flow, in Doc Reader's own document, so before v4 its ids and classes
   met Doc Reader's: a page with <ul id="menu" class="menu">, <aside id="right"> or <div class="toast">
   got Doc Reader's menu, notes panel or toast styling, and Doc Reader drew its menus and toasts into
   the page. Now (1) Doc Reader's own style rules skip everything inside #flow (except the rules written
   for documents, which name .flow), (2) its lookups by id ($("#menu")) skip the page's copies,
   (3) the page's linked stylesheets are loaded for the editor too, not only for web view, and
   (4) <style> blocks in the page's body move to its head, so they can't restyle Doc Reader. */
(function guardReaderCss() {
  const G = ":where(:not(#flow *))";   // no specificity: the cascade between Doc Reader's rules is unchanged
  const splitTop = sel => { const out = []; let d = 0, q = null, cur = "";
    for (const ch of sel) { if (q) { cur += ch; if (ch === q) q = null; continue; }
      if (ch === '"' || ch === "'") q = ch; else if (ch === "(" || ch === "[") d++; else if (ch === ")" || ch === "]") d--;
      else if (ch === "," && !d) { out.push(cur.trim()); cur = ""; continue; } cur += ch; }
    out.push(cur.trim()); return out.filter(Boolean); };
  const guard = s => {
    if (/flow/i.test(s) || /^(\*|\[hidden\]|html|body|:root[^\s>+~]*|::?[\w-]+(\(.*\))?)$/.test(s)) return s;
    const pe = s.match(/(::?(?:before|after|first-line|first-letter)|::[\w-]+(?:\([^)]*\))?)$/);
    return pe ? s.slice(0, pe.index) + G + pe[0] : s + G;
  };
  const walk = rules => { for (const r of rules) {
    if (r.type === 7) continue;   // @keyframes
    if (r.selectorText != null) { const n = splitTop(r.selectorText).map(guard).join(", "); if (n !== r.selectorText) r.selectorText = n; }
    else if (r.cssRules) walk(r.cssRules); } };
  for (const sh of [...document.styleSheets]) { try { walk(sh.cssRules); } catch (e) { /* not ours */ } }
})();

/* a page shown in the editor stays inside the paper: its fixed banners and z-indexes can't cover Doc Reader */
document.head.append(EL("style", { id: "lp-isolate" }, `.flow.faithful{contain:layout;isolation:isolate}`));

/* addresses in a style sheet, made absolute so they still work from here */
function absCssUrls(css, base) {
  if (!base) return css;
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => { if (/^(data:|blob:|https?:|#|about:)/i.test(u.trim())) return m; try { return `url("${new URL(u.trim(), base).href}")`; } catch (e) { return m; } });
}
/* a linked style sheet with its @imports (works in the extension for any site; the web page can
   only read sheets the site serves to everyone, so others stay unstyled in the editor) */
async function fetchCss(url, depth = 0) {
  let t; try { const r = await fetch(url, { credentials: "omit" }); if (!r.ok) return ""; t = await r.text(); } catch (e) { return ""; }
  if (/^\s*</.test(t)) return "";   // an error page, not CSS
  const imports = [];
  t = t.replace(/@import\s+(?:url\(\s*)?['"]?([^'")\s;]+)['"]?\s*\)?\s*([^;]*);/g, (m, u, media) => { try { imports.push([new URL(u, url).href, media.trim()]); } catch (e) { /* skip */ } return ""; });
  t = absCssUrls(t, url);
  let pre = "";
  if (depth < 3) for (const [u, media] of imports) { const c = await fetchCss(u, depth + 1); if (c) pre += media && !/^(all|screen)$/i.test(media) ? `@media ${media}{\n${c}\n}\n` : c + "\n"; }
  return pre + t;
}
async function loadLinkedCss(d) {
  const t = document.createElement("template"); t.innerHTML = d.meta.head || "";
  const links = [...t.content.querySelectorAll("link[href]")].filter(l => /stylesheet/i.test(l.rel) && /^https?:/i.test(l.getAttribute("href")) && !/^(print|speech)$/i.test(l.media || ""));
  if (!links.length) { d.meta.linkCss = ""; return; }
  const parts = await Promise.all(links.map(async l => { const c = await fetchCss(l.getAttribute("href")); return c && l.media && !/^(all|screen)$/i.test(l.media) ? `@media ${l.media}{\n${c}\n}` : c; }));
  d.meta.linkCss = parts.filter(Boolean).join("\n");
  if (S.doc === d) applyPageCss();
  if (d.meta.linkCss) saveSoon();
}
function applyPageCss() {
  $("#flow-filecss")?.remove(); const m = S.doc?.meta; if (!m || S.doc.kind === "pdf") return;
  const css = (m.linkCss || "") + "\n" + (m.css || ""); if (!css.trim()) return;
  const sc = scopeCss(css); if (sc) document.head.append(EL("style", { id: "flow-filecss" }, sc));
}
/* <style> blocks in the page's body would apply to all of Doc Reader: they go to the page's head
   (web view still has them; the editor gets them limited to the page, through meta.css) */
function liftBodyStyles(d) {
  if (!d?.meta?.faithful || !/<style[\s>]/i.test(d.html || "")) return;
  const t = document.createElement("template"); t.innerHTML = d.html; const st = [...t.content.querySelectorAll("style")]; if (!st.length) return;
  d.meta.head = (d.meta.head || "") + "\n" + st.map(s => s.outerHTML).join("\n");
  if (!d.meta.css) d.meta.css = st.map(s => s.textContent).join("\n");
  st.forEach(s => s.remove()); d.html = t.innerHTML; if (d.origHtml) d.origHtml = d.html;
}

/* the page's CSS, limited to the document. v4: rules written for the page's <html> or <body>
   ("html.dark .x", "body.article p") apply only if the page's own <html>/<body> match them;
   @supports, @layer, @container and @keyframes are kept; addresses are made absolute. */
scopeCss = function (css) {
  try {
    const m = S.doc?.meta || {}, base = m.sourceUrl || "";
    const doc = document.implementation.createHTMLDocument(""), st = doc.createElement("style"); st.textContent = css; doc.head.append(st);
    const probe = document.implementation.createHTMLDocument(""), setA = (el, s) => { const t = probe.createElement("template"); t.innerHTML = `<i ${s || ""}></i>`; for (const a of t.content.firstChild.attributes) el.setAttribute(a.name, a.value); };
    try { setA(probe.documentElement, m.htmlAttr); setA(probe.body, m.bodyAttr); } catch (e) { /* plain */ }
    const fits = (el, c) => { try { return el.matches(c); } catch (e) { return false; } };
    const one = s => {
      s = s.trim(); let mm;
      if ((mm = s.match(/^((?:html|:root)(?![\w-])[^\s>+~]*)\s*>?\s*/i))) { if (!fits(probe.documentElement, mm[1])) return null; s = s.slice(mm[0].length); }
      if ((mm = s.match(/^(body(?![\w-])[^\s>+~]*)\s*>?\s*/i))) { if (!fits(probe.body, mm[1])) return null; s = s.slice(mm[0].length); }
      return s ? "#flow " + s : "#flow";
    };
    const out = [];
    const walk = rules => { for (const r of rules) {
      if (r.selectorText != null) { const sel = r.selectorText.split(/,(?![^(]*\))/).map(one).filter(Boolean); if (sel.length) out.push(sel.join(", ") + r.cssText.slice(r.cssText.indexOf("{"))); }
      else if (r.type === 7 || !r.cssRules) out.push(r.cssText);   // @keyframes, @font-face, @import…
      else { out.push(r.cssText.slice(0, r.cssText.indexOf("{")) + "{"); walk(r.cssRules); out.push("}"); } } };
    walk(st.sheet.cssRules); return absCssUrls(out.join("\n"), base);
  } catch (e) { return ""; }
};

{ const sd = showDoc; showDoc = async function () {
  const d = S.doc; liftBodyStyles(d);
  const r = await sd.apply(this, arguments);
  if (S.doc === d && d.kind !== "pdf") { applyPageCss(); if (d.meta?.faithful && d.meta.linkCss == null && /<link/i.test(d.meta.head || "")) loadLinkedCss(d); }
  return r;
}; }
