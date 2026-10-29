/* ---------- Paper Writer: Word-style editing on top of Doc Reader's editor ----------
   Fonts and sizes, page width and margins, an offline spell checker (nspell + Hunspell en-GB / en-US),
   footnotes, table of contents, symbols, page breaks, change case, spacing, format painter, word count,
   and Word / Google Docs keyboard shortcuts. Runs inside Doc Reader's scope like ai.js. */

const W = { range: null, painter: null, painterArmed: false };
const flowOn = () => S.doc?.kind === "flow" && !S.webview;
function saveRange() { const s = getSelection(); if (s.rangeCount && flowEl.contains(s.anchorNode)) W.range = s.getRangeAt(0).cloneRange(); }
function useRange() {
  flowEl.focus({ preventScroll: true }); const s = getSelection();
  if (W.range && flowEl.contains(W.range.commonAncestorContainer) && !(s.rangeCount && flowEl.contains(s.anchorNode) && s.getRangeAt(0).compareBoundaryPoints(Range.START_TO_START, W.range) === 0 && s.getRangeAt(0).compareBoundaryPoints(Range.END_TO_END, W.range) === 0)) { s.removeAllRanges(); s.addRange(W.range); }
  return s;
}
const WORDCH = /[\p{L}\p{N}\p{M}'’-]/u;
function wordAtCaret(sel) {
  const n = sel.anchorNode, o = sel.anchorOffset; if (!n || n.nodeType !== 3) return null;
  const t = n.data; let a = o, b = o; while (a > 0 && WORDCH.test(t[a - 1])) a--; while (b < t.length && WORDCH.test(t[b])) b++;
  if (a === b) return null; const r = document.createRange(); r.setStart(n, a); r.setEnd(n, b); return r;
}
/* the selection, or the word at the caret, like Word */
function targetSel() { const sel = useRange(); if (!sel.rangeCount || !flowEl.contains(sel.anchorNode)) return null; if (sel.isCollapsed) { const r = wordAtCaret(sel); if (!r) return null; sel.removeAllRanges(); sel.addRange(r); } return sel; }
function done() { const s = getSelection(); if (s.rangeCount && flowEl.contains(s.anchorNode)) W.range = s.getRangeAt(0).cloneRange(); flowChanged(); syncFontUI(); }
const C = name => () => { useRange(); cmd(name); };

/* ---- fonts and sizes ---- */
const FONTS = [["", "Default"], ["Calibri, Carlito, 'Segoe UI', sans-serif", "Calibri"], ["Arial, Helvetica, sans-serif", "Arial"], ["'Helvetica Neue', Helvetica, Arial, sans-serif", "Helvetica"], ["'Times New Roman', Times, serif", "Times New Roman"], ["Georgia, serif", "Georgia"], ["Cambria, Caladea, Georgia, serif", "Cambria"], ["Charter, 'Iowan Old Style', Georgia, serif", "Charter"], ["Garamond, 'EB Garamond', 'Times New Roman', serif", "Garamond"], ["'Palatino Linotype', Palatino, 'Book Antiqua', serif", "Palatino"], ["Verdana, sans-serif", "Verdana"], ["Tahoma, sans-serif", "Tahoma"], ["'Trebuchet MS', sans-serif", "Trebuchet MS"], ["'Segoe UI', system-ui, sans-serif", "Segoe UI"], ["system-ui, sans-serif", "System sans"], ["'Courier New', Courier, monospace", "Courier New"], ["Consolas, Menlo, monospace", "Consolas"]];
const SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 60, 72];
const firstFam = f => String(f || "").split(",")[0].trim().replace(/^["']|["']$/g, "").toLowerCase();
const fontSel = $("#fontSel"), sizeSel = $("#sizeSel");
fontSel.innerHTML = FONTS.map(([v, n]) => `<option value="${esc(v)}" style="font-family:${esc(v || "inherit")}">${esc(n)}</option>`).join("");
sizeSel.innerHTML = SIZES.map(s => `<option value="${s}">${s}</option>`).join("");
for (const el of [fontSel, sizeSel]) { el.addEventListener("pointerdown", saveRange); el.addEventListener("keydown", e => { if (e.key === "Escape") { e.preventDefault(); useRange(); } }); }
fontSel.addEventListener("change", () => setFont(fontSel.value));
sizeSel.addEventListener("change", () => setSize(+sizeSel.value));
function tidySpans(root = flowEl) { for (const s of $$("span[style=''],span:not([class]):not([style]):not([data-id]):not([data-ai])", root)) { if (!s.attributes.length || (s.attributes.length === 1 && s.getAttribute("style") === "")) s.replaceWith(...s.childNodes); } }
function inlineStyle(prop, value) {
  const sel = targetSel(); if (!sel) { toast("Select text first, or put the cursor in a word."); return false; }
  const range = sel.getRangeAt(0), camel = prop === "font-family" ? "fontFamily" : "fontSize";
  document.execCommand("styleWithCSS", false, true);
  if (prop === "font-family") document.execCommand("fontName", false, "lp-mark-font"); else document.execCommand("fontSize", false, "7");
  document.execCommand("styleWithCSS", false, false);
  const marked = prop === "font-family" ? $$('[style*="lp-mark-font"], font[face="lp-mark-font"]', flowEl) : $$('[style*="xxx-large"], font[size="7"]', flowEl);
  let first = null, last = null;
  for (let el of marked) {
    if (el.tagName === "FONT") { const sp = EL("span"); while (el.firstChild) sp.append(el.firstChild); el.replaceWith(sp); el = sp; }
    let v = value || ""; if (!v && prop === "font-family") { const anc = el.parentElement?.closest("[style*='font-family']"); if (anc && anc !== flowEl && flowEl.contains(anc)) v = getComputedStyle(flowEl).fontFamily; }
    el.style[camel] = v; $$("[style]", el).forEach(c => { c.style[camel] = ""; });
    if (!el.getAttribute("style")) el.removeAttribute("style");
    first = first || el; last = el;
  }
  tidySpans();
  if (first && first.isConnected && last.isConnected) { const r = document.createRange(); r.setStart(first, 0); r.setEnd(last, last.childNodes.length); sel.removeAllRanges(); sel.addRange(r); }
  done(); return true;
}
function setFont(v) { inlineStyle("font-family", v); }
function setSize(pt) { if (pt > 0) inlineStyle("font-size", pt + "pt"); }
function curSize() { const s = getSelection(); const el = s.rangeCount && flowEl.contains(s.anchorNode) ? elOf(s.anchorNode) : flowEl; return Math.round(parseFloat(getComputedStyle(el).fontSize) * 0.75 * 2) / 2; }
function stepSize(d) { saveRange(); const c = curSize(); const n = d > 0 ? SIZES.find(s => s > c + 0.01) || c + 12 : [...SIZES].reverse().find(s => s < c - 0.01) || Math.max(1, c - 1); setSize(n); }
function bumpSize(d) { saveRange(); setSize(Math.max(1, curSize() + d)); }
function syncFontUI() {
  if (!flowOn()) return; const s = getSelection();
  const el = s.rangeCount && flowEl.contains(s.anchorNode) ? elOf(s.anchorNode) : flowEl, cs = getComputedStyle(el), pt = Math.round(parseFloat(cs.fontSize) * 0.75 * 2) / 2;
  if (![...sizeSel.options].some(o => +o.value === pt)) { $$("option.tmp", sizeSel).forEach(o => o.remove()); sizeSel.prepend(EL("option", { class: "tmp", value: pt }, String(pt))); }
  sizeSel.value = String(pt);
  const fam = firstFam(cs.fontFamily), base = firstFam(getComputedStyle(flowEl).fontFamily), own = el.closest("[style*='font-family']");
  let opt = !own || !flowEl.contains(own) || fam === base ? "" : (FONTS.find(([v]) => v && firstFam(v) === fam) || [])[0];
  if (opt == null) { $$("option.tmp", fontSel).forEach(o => o.remove()); fontSel.prepend(EL("option", { class: "tmp", value: cs.fontFamily }, fam)); opt = cs.fontFamily; }
  fontSel.value = opt;
}
{ const uft = updateFlowToolbar; updateFlowToolbar = function () { uft(); syncFontUI(); }; }

/* ---- paragraphs: spacing, indent, move, clear ---- */
const PBLOCK = "p,h1,h2,h3,h4,h5,h6,li,blockquote,pre,figcaption,dd,dt,td,th";
function selBlocks() {
  const sel = useRange(); if (!sel.rangeCount) return []; const r = sel.getRangeAt(0);
  let bs = $$(PBLOCK, flowEl).filter(b => r.intersectsNode(b) && !b.querySelector(PBLOCK) && !b.closest("nav.toc"));
  if (!bs.length) { let n = elOf(r.startContainer); while (n && n.parentElement !== flowEl) n = n.parentElement; if (n && n !== flowEl) bs = [n]; }
  return bs;
}
function blockStyle(prop, val) { const bs = selBlocks(); if (!bs.length) return toast("Put the cursor in a paragraph first."); bs.forEach(b => { b.style[prop] = typeof val === "function" ? val(b) : val; if (!b.getAttribute("style")) b.removeAttribute("style"); }); done(); }
const lineSpacing = v => blockStyle("lineHeight", v);
function clearParagraph() { const bs = selBlocks(); bs.forEach(b => { b.removeAttribute("style"); b.removeAttribute("align"); }); done(); }
function moveBlock(d) {
  const sel = getSelection(); if (!sel.rangeCount) return; let b = elOf(sel.anchorNode).closest("li") || elOf(sel.anchorNode);
  if (!b.closest("li")) while (b && b.parentElement !== flowEl) b = b.parentElement;
  if (!b || b === flowEl) return; const sib = d < 0 ? b.previousElementSibling : b.nextElementSibling; if (!sib || sib.matches("ol.footnotes,hr.fn-sep")) return;
  const r = sel.getRangeAt(0).cloneRange(); d < 0 ? sib.before(b) : sib.after(b); sel.removeAllRanges(); sel.addRange(r); b.scrollIntoView({ block: "nearest" }); done();
}
function spacingMenu(anchor) {
  saveRange(); const cur = (() => { const b = selBlocks()[0]; return b ? b.style.lineHeight : ""; })();
  menu([{ head: "Line spacing" }, ...[["1", "Single", "Ctrl+1"], ["1.15", "1.15", ""], ["1.5", "1.5 lines", "Ctrl+5"], ["2", "Double", "Ctrl+2"], ["", "Document default", ""]].map(([v, l, k]) => ({ label: l, k, on: cur === v, fn: () => lineSpacing(v) })),
    { sep: true }, { head: "Paragraph" },
    { label: "No space after paragraphs", fn: () => blockStyle("marginBottom", "0") }, { label: "Add space after paragraphs", fn: () => blockStyle("marginBottom", "1.2em") },
    { label: "First-line indent on / off", fn: () => blockStyle("textIndent", b => b.style.textIndent ? "" : "2em") },
    { label: "Increase indent", k: "Ctrl+M", fn: C("indent") }, { label: "Decrease indent", k: "Ctrl+Shift+M", fn: C("outdent") },
    { label: "Clear paragraph formatting", k: "Ctrl+Q", fn: clearParagraph }], anchor);
}

/* ---- change case ---- */
const SMALL = new Set("a an and as at but by for in nor of on or per the to vs via with".split(" "));
const titleCase = s => s.toLowerCase().replace(/[\p{L}][\p{L}'’]*/gu, (w, i) => i > 0 && SMALL.has(w) ? w : w[0].toUpperCase() + w.slice(1));
const sentenceCase = s => s.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (m, a, c) => a + c.toUpperCase());
function changeCase(mode) {
  const sel = targetSel(); if (!sel) return toast("Select text first.");
  const r = sel.getRangeAt(0), nodes = rangeTextNodes(r); if (!nodes.length) return; const all = nodes.map(n => n.data).join("");
  if (mode === "cycle") mode = all === all.toUpperCase() ? "lower" : all === all.toLowerCase() ? "title" : "upper";
  const fn = { upper: s => s.toUpperCase(), lower: s => s.toLowerCase(), title: titleCase, sentence: sentenceCase }[mode];
  const out = fn(all); let i = 0; for (const n of nodes) { n.data = out.slice(i, i + n.data.length); i += n.data.length; }
  const nr = document.createRange(); nr.setStart(nodes[0], 0); nr.setEnd(nodes.at(-1), nodes.at(-1).data.length); sel.removeAllRanges(); sel.addRange(nr); done();
}
function smallCaps() { const sel = targetSel(); if (!sel) return toast("Select text first."); const r = sel.getRangeAt(0); const on = getComputedStyle(elOf(r.startContainer)).fontVariantCaps === "small-caps"; const sp = EL("span", { style: on ? "font-variant:normal" : "font-variant:small-caps" }); sp.append(r.extractContents()); r.insertNode(sp); $$("[style*='font-variant']", sp).forEach(c => c.style.fontVariant = ""); tidySpans(); const nr = document.createRange(); nr.selectNodeContents(sp); sel.removeAllRanges(); sel.addRange(nr); done(); }

/* ---- format painter ---- */
function copyFormat() {
  const s = getSelection(); if (!s.rangeCount || !flowEl.contains(s.anchorNode)) return toast("Put the cursor in the text whose look you want to copy.");
  const el = elOf(s.getRangeAt(0).startContainer), cs = getComputedStyle(el), fcs = getComputedStyle(flowEl);
  W.painter = { b: +cs.fontWeight >= 600, i: cs.fontStyle === "italic", u: !!el.closest("u"), s: !!el.closest("s,strike,del:not(.ai-d)"), sup: !!el.closest("sup"), sub: !!el.closest("sub"), color: cs.color !== fcs.color ? cs.color : "", family: cs.fontFamily !== fcs.fontFamily ? cs.fontFamily : "", size: cs.fontSize !== fcs.fontSize ? Math.round(parseFloat(cs.fontSize) * 0.75 * 2) / 2 : 0, caps: cs.fontVariantCaps === "small-caps" };
  W.painterArmed = true; $("[data-act=wPainter]")?.classList.add("on"); toast("Format copied: select text to paint it (or Ctrl+Alt+V).");
}
function pasteFormat() {
  const p = W.painter; if (!p) return toast("Copy a format first (Ctrl+Alt+C or the brush)."); const sel = targetSel(); if (!sel) return toast("Select text to paint.");
  W.painterArmed = false; $("[data-act=wPainter]")?.classList.remove("on");
  document.execCommand("removeFormat"); for (const [k, c] of [["b", "bold"], ["i", "italic"], ["u", "underline"], ["s", "strikeThrough"], ["sup", "superscript"], ["sub", "subscript"]]) if (p[k]) document.execCommand(c);
  if (p.color) document.execCommand("foreColor", false, p.color);
  saveRange(); if (p.family) inlineStyle("font-family", p.family); if (p.size) inlineStyle("font-size", p.size + "pt"); if (p.caps) smallCaps(); done();
}
flowEl.addEventListener("mouseup", () => { if (W.painterArmed && !getSelection().isCollapsed) setTimeout(pasteFormat, 0); });

/* ---- insert: page break, footnotes, contents, symbols, date ---- */
function pageBreak() { useRange(); insertHtml('<hr class="page-break"><p><br></p>'); }
function insertFootnote() {
  const sel = useRange(); if (!sel.rangeCount || !flowEl.contains(sel.anchorNode)) return toast("Put the cursor where the footnote mark goes.");
  if (elOf(sel.anchorNode).closest("ol.footnotes")) return toast("Footnotes go in the text, not in the footnote list.");
  const id = uid(), r = sel.getRangeAt(0); r.collapse(false);
  const ref = EL("sup", { class: "fn-ref", "data-fn": id, contenteditable: "false", title: "Footnote: click to edit" }, "?"); r.insertNode(ref);
  fnRenumber(); const li = $(`ol.footnotes li[data-fn="${id}"]`, flowEl); const nr = document.createRange(); nr.selectNodeContents(li); nr.collapse(false); sel.removeAllRanges(); sel.addRange(nr);
  li.scrollIntoView({ block: "center" }); flowChanged();
}
function fnRenumber() {
  const refs = $$("sup.fn-ref[data-fn]", flowEl).filter(r => !r.closest("ol.footnotes")); let list = $("ol.footnotes", flowEl), ch = false;
  if (!refs.length) { if (list) { list.previousElementSibling?.matches("hr.fn-sep") && list.previousElementSibling.remove(); list.remove(); return true; } return false; }
  if (!list) { list = EL("ol", { class: "footnotes" }); flowEl.append(EL("hr", { class: "fn-sep" }), list); ch = true; }
  if (list.nextElementSibling) { const sep = list.previousElementSibling?.matches("hr.fn-sep") ? list.previousElementSibling : null; flowEl.append(...(sep ? [sep] : []), list); ch = true; }
  refs.forEach((r, i) => { const n = String(i + 1); if (r.textContent !== n) { r.textContent = n; ch = true; } });
  const order = refs.map(r => r.dataset.fn), lis = new Map();
  for (const li of [...list.children]) { if (li.tagName !== "LI") { li.remove(); ch = true; continue; } if (!li.dataset.fn) { const prev = li.previousElementSibling; if (prev) { prev.append(EL("br"), ...li.childNodes); } li.remove(); ch = true; continue; } lis.set(li.dataset.fn, li); }
  for (const [id, li] of lis) if (!order.includes(id)) { li.remove(); ch = true; }
  let prev = null; for (const id of order) { let li = lis.get(id); if (!li) { li = EL("li", { "data-fn": id }); li.innerHTML = "<br>"; ch = true; } const want = prev ? prev.nextSibling : list.firstChild; if (want !== li) { list.insertBefore(li, want); ch = true; } prev = li; }
  return ch;
}
const slug = s => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 40) || "section";
function tocHtml() {
  const hs = $$("h2,h3,h4", flowEl).filter(h => !h.closest("nav.toc") && h.textContent.trim()); const used = new Set();
  hs.forEach(h => { let id = h.id || "h-" + slug(h.textContent); while (used.has(id)) id += "-2"; used.add(id); if (h.id !== id) h.id = id; });
  return `<p class="toc-h">Contents</p><ol>${hs.map(h => `<li class="toc-${h.tagName.toLowerCase()}"><a href="#${h.id}">${esc(h.textContent.trim())}</a></li>`).join("") || "<li>Add headings (Heading 1-3) to fill the contents.</li>"}</ol>`;
}
function insertToc() { useRange(); insertHtml(`<nav class="toc" contenteditable="false" data-toc>${tocHtml()}</nav><p><br></p>`); }
function tocUpdate() { const t = $("nav.toc", flowEl); if (!t) return false; const h = tocHtml(); if (t.innerHTML === h) return false; t.innerHTML = h; return true; }
flowEl.addEventListener("click", e => {
  const a = e.target.closest("nav.toc a"); if (a) { e.preventDefault(); $(a.getAttribute("href"), flowEl)?.scrollIntoView({ block: "start", behavior: "smooth" }); return; }
  const f = e.target.closest("sup.fn-ref"); if (f) { const li = $(`ol.footnotes li[data-fn="${f.dataset.fn}"]`, flowEl); if (li) { li.scrollIntoView({ block: "center", behavior: "smooth" }); const r = document.createRange(); r.selectNodeContents(li); r.collapse(false); getSelection().removeAllRanges(); getSelection().addRange(r); flashEl(li); } }
});
flowEl.addEventListener("dblclick", e => { const li = e.target.closest("ol.footnotes li[data-fn]"); if (li && e.offsetX < 0) { const f = $(`sup.fn-ref[data-fn="${li.dataset.fn}"]`, flowEl); f?.scrollIntoView({ block: "center", behavior: "smooth" }); } });
const SYMBOLS = [["Greek", "α β γ δ ε ζ η θ ι κ λ μ ν ξ π ρ σ τ υ φ χ ψ ω Γ Δ Θ Λ Ξ Π Σ Φ Ψ Ω"], ["Maths", "± × ÷ · ≈ ≠ ≡ ≤ ≥ ≪ ≫ ∝ ∞ √ ∑ ∏ ∫ ∂ ∇ ∆ ∈ ∉ ∩ ∪ ⊂ ⊆ ∀ ∃ ¬ ∧ ∨ ′ ″ ‰ ‱"], ["Units and science", "µ ° ℃ ℉ Å Ω ℓ ⁻ ⁺ ⁰ ¹ ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ ₀ ₁ ₂ ₃ ₄ ₅ ₆ ₇ ₈ ₉ ½ ⅓ ¼ ¾ ♀ ♂ ☐ ☑"], ["Arrows", "→ ← ↑ ↓ ↔ ⇌ ⇄ ⇒ ⇐ ⇔ ↗ ↘ ⟶"], ["Punctuation", "– — … ‐ • · § ¶ † ‡ © ® ™ “ ” ‘ ’ « » ‹ › ¿ ¡ №"]];
function symbolDialog() {
  saveRange(); const recent = Prefs.get("recentSym", []);
  const grid = (t, s) => `<div class="sym-g"><div class="sym-t">${t}</div><div class="sym-row">${s.map(c => `<button type="button" data-sym="${esc(c)}" title="U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}">${esc(c)}</button>`).join("")}</div></div>`;
  modal(`<h3>Insert a symbol</h3><p>Click to insert at the cursor; the dialog stays open. Non-breaking space: Ctrl+Shift+Space.</p>${recent.length ? grid("Recently used", recent) : ""}${SYMBOLS.map(([t, s]) => grid(t, s.split(" "))).join("")}<div class="mrow"><button class="btn primary" data-cancel>Done</button></div>`);
  $("#modal").addEventListener("click", e => { const b = e.target.closest("[data-sym]"); if (!b) return; const c = b.dataset.sym; useRange(); document.execCommand("insertText", false, c); saveRange(); Prefs.set("recentSym", [c, ...Prefs.get("recentSym", []).filter(x => x !== c)].slice(0, 16)); });
}
const insertDate = () => { useRange(); document.execCommand("insertText", false, new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })); };

/* ---- page: width (A4, Letter, wide, fill the stage, any width by dragging the edge), margins, defaults ---- */
const PAGE_W = { a4: 794, letter: 816, wide: 1150 };
const paper = $(".flow-paper"), grip = EL("div", { class: "page-grip", title: "Drag to change the page width · double-click: fill the stage / back to A4" }); paper.append(grip);
function pageCfg() { return { w: "a4", px: 900, m: "normal", font: "", size: 12, lh: "", ...(Prefs.get("pageDefaults", {}) || {}), ...(S.doc?.meta?.page || {}) }; }
function applyPage() {
  if (S.doc?.kind !== "flow") return; const p = pageCfg();
  paper.dataset.w = p.w; paper.style.setProperty("--pw", (p.w === "custom" ? p.px : PAGE_W[p.w] || 794) + "px"); flowEl.dataset.m = p.m;
  flowEl.style.fontFamily = p.font || ""; flowEl.style.fontSize = p.size ? p.size + "pt" : ""; flowEl.style.lineHeight = p.lh || "";
  requestAnimationFrame(() => { placeGrip(); layoutMargin(); placeBar?.(); nudgeOverlays(); });
}
function setPage(patch, asDefault) { if (!S.doc) return; S.doc.meta = S.doc.meta || {}; S.doc.meta.page = { ...pageCfg(), ...patch }; if (asDefault) Prefs.set("pageDefaults", { ...S.doc.meta.page }); applyPage(); markDirty(); }
function placeGrip() { const pr = paper.getBoundingClientRect(), fr = flowEl.getBoundingClientRect(); grip.style.left = (fr.right - pr.left - 5) + "px"; grip.style.top = (fr.top - pr.top) + "px"; grip.style.height = fr.height + "px"; }
grip.addEventListener("pointerdown", e => {
  e.preventDefault(); grip.setPointerCapture(e.pointerId); const z = S.flowZoom || 1, x0 = e.clientX, w0 = flowEl.getBoundingClientRect().width / z; grip.classList.add("on");
  const mv = ev => { const w = Math.round(clamp(w0 + (ev.clientX - x0) * 2 / z, 420, 4000)); S.doc.meta.page = { ...pageCfg(), w: "custom", px: w }; applyPage(); status(`Page width ${w}px (${(w / 37.8).toFixed(1)} cm)`); };
  const up = () => { grip.classList.remove("on"); grip.removeEventListener("pointermove", mv); grip.removeEventListener("pointerup", up); markDirty(); };
  grip.addEventListener("pointermove", mv); grip.addEventListener("pointerup", up);
});
grip.addEventListener("dblclick", () => setPage({ w: pageCfg().w === "fill" ? "a4" : "fill" }));
addEventListener("resize", debounce(placeGrip, 100));
function pageMenu(anchor) {
  const p = pageCfg();
  menu([{ head: "Page width" }, ...[["a4", "A4 (21 cm)"], ["letter", "US Letter (21.6 cm)"], ["wide", "Wide"], ["fill", "Fill the stage", "No page edges: the text uses the whole window"]].map(([w, l, sub]) => ({ label: l, sub, on: p.w === w, fn: () => setPage({ w }) })),
    { label: p.w === "custom" ? `Custom: ${p.px}px` : "Custom width", sub: "Drag the right edge of the page", on: p.w === "custom", fn: () => toast("Drag the right edge of the page to any width; double-click it to fill the stage.") },
    { sep: true }, { head: "Margins" }, ...[["narrow", "Narrow"], ["normal", "Normal"], ["wide", "Wide"]].map(([m, l]) => ({ label: l, on: p.m === m, fn: () => setPage({ m }) })),
    { sep: true }, { label: "Page setup…", sub: "Default font, size and line spacing; keep as default for new documents", fn: pageSetup }], anchor, { right: true });
}
async function pageSetup() {
  const p = pageCfg();
  const v = await modal(`<h3>Page setup</h3><p>For this document. Tick the box to use it for new documents too.</p>
    <div class="ai-grid2"><div class="ai-f"><label>Page width</label><select name="w">${[["a4", "A4"], ["letter", "US Letter"], ["wide", "Wide"], ["fill", "Fill the stage"], ["custom", "Custom"]].map(([k, l]) => `<option value="${k}"${p.w === k ? " selected" : ""}>${l}</option>`).join("")}</select></div>
    <div class="ai-f"><label>Custom width (px)</label><input type="text" name="px" value="${p.px}" inputmode="numeric"></div>
    <div class="ai-f"><label>Margins</label><select name="m">${[["narrow", "Narrow"], ["normal", "Normal"], ["wide", "Wide"]].map(([k, l]) => `<option value="${k}"${p.m === k ? " selected" : ""}>${l}</option>`).join("")}</select></div>
    <div class="ai-f"><label>Line spacing</label><select name="lh">${[["", "Default"], ["1", "Single"], ["1.15", "1.15"], ["1.5", "1.5"], ["2", "Double"]].map(([k, l]) => `<option value="${k}"${String(p.lh) === k ? " selected" : ""}>${l}</option>`).join("")}</select></div>
    <div class="ai-f"><label>Font</label><select name="font">${FONTS.map(([k, l]) => `<option value="${esc(k)}"${p.font === k ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
    <div class="ai-f"><label>Size (pt)</label><select name="size"><option value="0">Default</option>${SIZES.map(s => `<option value="${s}"${+p.size === s ? " selected" : ""}>${s}</option>`).join("")}</select></div></div>
    <div class="chkrow"><label><input type="checkbox" name="def"> Use for new documents</label></div>
    <div class="mrow"><button class="btn" data-cancel>Cancel</button><button class="btn primary" data-ok="ok">Apply</button></div>`);
  if (!v) return; setPage({ w: v.w, px: clamp(+v.px || 900, 420, 4000), m: v.m, lh: v.lh, font: v.font, size: +v.size }, v.def);
}

/* ---- zoom the text and the comment margin, not the page box around them: extensions such as Grammarly draw their
   underlines in an overlay next to the text, which a zoomed box would scale a second time ---- */
{ const sz = setZoom; setZoom = async function (mode, val) {
    if (S.doc?.kind !== "flow") return sz(mode, val);
    S.flowZoom = mode === "custom" ? clamp(val, .4, 3) : 1; S.zoomMode = mode === "custom" ? "custom" : "width"; const z = S.flowZoom;
    paper.style.zoom = ""; flowEl.style.zoom = z === 1 ? "" : z; marginEl.style.zoom = z === 1 ? "" : z; paper.style.setProperty("--z", z);
    $("#zoomVal").textContent = Math.round(z * 100) + "%"; layoutMargin(); placeGrip(); nudgeOverlays();
  }; }
/* tell spelling and grammar extensions (Grammarly and the like) that the text moved, so they re-measure their underlines */
const nudgeOverlays = debounce(() => { dispatchEvent(new Event("resize")); viewer.dispatchEvent(new Event("scroll")); placeBar(); }, 60);

/* ---- word count ---- */
const wcPill = EL("button", { class: "wc-pill", type: "button", title: "Word count (Ctrl+Shift+G)", onclick: () => wordCountDialog() }); viewer.append(wcPill);
function textOfNode(root) { let s = ""; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, { acceptNode: n => n.nodeType === 1 ? (n.matches("del.ai-d,.ai-old,sup.fn-ref,nav.toc") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP) : NodeFilter.FILTER_ACCEPT }); let n; while ((n = w.nextNode())) s += n.data + (/^(P|LI|H\d|TD|TH|BLOCKQUOTE|FIGCAPTION|PRE)$/.test(n.parentElement.tagName) && !n.nextSibling ? "\n" : ""); return s; }
const countWords = s => (s.match(/[\p{L}\p{N}]+(?:['’\-.][\p{L}\p{N}]+)*/gu) || []).length;
function wcUpdate() {
  if (!flowOn()) { wcPill.hidden = true; return; } wcPill.hidden = false;
  const total = countWords(textOfNode(flowEl)), s = getSelection();
  const selW = s.rangeCount && !s.isCollapsed && flowEl.contains(s.anchorNode) ? countWords(s.toString()) : 0;
  wcPill.textContent = (selW ? `${selW.toLocaleString("en")} of ` : "") + `${total.toLocaleString("en")} word${total === 1 ? "" : "s"}`;
}
const wcSoon = debounce(wcUpdate, 300);
function wordCountDialog() {
  const t = textOfNode(flowEl), s = getSelection(), sel = s.rangeCount && !s.isCollapsed && flowEl.contains(s.anchorNode) ? s.toString() : "";
  const st = x => ({ w: countWords(x), c: x.replace(/\s/g, "").length, cs: x.replace(/\n/g, "").length, p: x.split(/\n+/).filter(l => l.trim()).length, sn: (x.match(/[^.!?]+[.!?]+(\s|$)/g) || []).length });
  const a = st(t), b = sel ? st(sel) : null, fn = $$("ol.footnotes li", flowEl).length, mins = Math.max(1, Math.round(a.w / 238));
  const row = (l, k) => `<tr><td>${l}</td><td>${a[k].toLocaleString("en")}</td>${b ? `<td>${b[k].toLocaleString("en")}</td>` : ""}</tr>`;
  modal(`<h3>Word count</h3><table class="wc-t"><tr><th></th><th>Document</th>${b ? "<th>Selection</th>" : ""}</tr>${row("Words", "w")}${row("Characters (no spaces)", "c")}${row("Characters (with spaces)", "cs")}${row("Paragraphs", "p")}${row("Sentences", "sn")}</table><p>Footnotes: ${fn}. Reading time about ${mins} min (238 words per minute). Counts include footnotes and leave out the contents list and suggestions not yet accepted.</p><div class="mrow"><button class="btn primary" data-cancel>Close</button></div>`);
}

/* ---- spelling: offline Hunspell dictionaries (SCOWL, en-GB / en-US) with nspell ---- */
const SCI = ($("#sci-words")?.textContent || "").split(/\s+/).filter(Boolean);
const SP = { eng: {}, ranges: [], cache: new Map(), ignore: new Set() };
function spellCfg() { return { mode: "en-GB", italic: true, ...(Prefs.get("spell", {}) || {}) }; }
function spellEngine() {
  const lang = spellCfg().mode; if (lang !== "en-GB" && lang !== "en-US") return null;
  if (!SP.eng[lang]) { const id = lang === "en-US" ? "us" : "gb"; const sp = nspell($(`#dic-${id}-aff`).textContent, $(`#dic-${id}-dic`).textContent); SCI.forEach(w => sp.add(w)); (Prefs.get("userDict", []) || []).forEach(w => sp.add(w)); SP.eng[lang] = sp; SP.cache.clear(); }
  return SP.eng[lang];
}
function spellApplyMode() { const m = spellCfg().mode; flowEl.spellcheck = m === "browser"; if (m === "browser" || m === "off") { SP.ranges = []; try { CSS.highlights.delete("lp-spell"); } catch (e) { /* no highlight API */ } } else spellSoon(); }
const SKIP_SPELL = "pre,code,a,.ai-chg,sup.fn-ref,nav.toc,[data-nospell],script,style";
function wordOk(w, sp) {
  if (w.length < 2 || /\d/.test(w) || /\p{Lu}.*\p{Lu}/u.test(w) || /\p{Ll}\p{Lu}/u.test(w)) return true;
  const k = w.replace(/’/g, "'"); if (SP.ignore.has(k.toLowerCase()) || (S.doc?.meta?.spellIgnore || []).includes(k.toLowerCase())) return true;
  if (SP.cache.has(k)) return SP.cache.get(k);
  const base = k.replace(/'s$/i, "").replace(/^'+|'+$/g, ""), lower = base.toLowerCase();
  const ok = !base || sp.correct(base) || sp.correct(lower) || (base[0] === base[0].toUpperCase() && sp.correct(base.toLowerCase()));
  SP.cache.set(k, ok); return ok;
}
function spellRun() {
  const sp = flowOn() && spellEngine(); if (!sp) return; const cfg = spellCfg(), out = [];
  const w = document.createTreeWalker(flowEl, NodeFilter.SHOW_TEXT, { acceptNode: n => { const p = n.parentElement; if (!p || p.closest(SKIP_SPELL) || (cfg.italic && p.closest("i,em"))) return NodeFilter.FILTER_REJECT; return NodeFilter.FILTER_ACCEPT; } });
  let n; while ((n = w.nextNode())) {
    for (const m of n.data.matchAll(/[\p{L}\p{M}][\p{L}\p{M}'’-]*[\p{L}\p{M}]|[\p{L}]/gu)) {
      let off = m.index; for (const part of m[0].split("-")) { if (part && !wordOk(part, sp)) { const r = document.createRange(); r.setStart(n, off); r.setEnd(n, off + part.length); out.push(r); } off += part.length + 1; }
    }
  }
  SP.ranges = out; try { CSS.highlights.set("lp-spell", new Highlight(...out)); } catch (e) { /* no highlight API: the F7 panel still works */ }
  if (spPanel && !spPanel.hidden) spShow();
}
const spellSoon = debounce(() => { const m = spellCfg().mode; if (m === "en-GB" || m === "en-US") spellRun(); }, 450);
function spellAt(x, y) {
  let node, off; if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); node = p?.offsetNode; off = p?.offset; } else if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); node = r?.startContainer; off = r?.startOffset; }
  if (!node) return null; return SP.ranges.find(r => r.startContainer === node && r.startOffset <= off && off <= r.endOffset) || null;
}
/* nspell misses swapped letters ("teh"): try those first */
function suggest(word) {
  const sp = spellEngine(), out = [], lw = word.toLowerCase(), cap = word[0] !== lw[0];
  for (let i = 0; i < lw.length - 1; i++) { const t = lw.slice(0, i) + lw[i + 1] + lw[i] + lw.slice(i + 2); if (sp.correct(t)) out.push(cap ? t[0].toUpperCase() + t.slice(1) : t); }
  return [...new Set([...out, ...sp.suggest(word)])];
}
function spellReplace(r, word) { const s = getSelection(); s.removeAllRanges(); s.addRange(r); flowEl.focus({ preventScroll: true }); s.removeAllRanges(); s.addRange(r); document.execCommand("insertText", false, word); spellRun(); }
function spellIgnoreAll(word) { const k = word.replace(/’/g, "'").toLowerCase(); S.doc.meta = S.doc.meta || {}; S.doc.meta.spellIgnore = [...new Set([...(S.doc.meta.spellIgnore || []), k])]; SP.cache.clear(); markDirty(); spellRun(); }
function spellAdd(word) { const k = word.replace(/’/g, "'"); Prefs.set("userDict", [...new Set([...(Prefs.get("userDict", []) || []), k])]); Object.values(SP.eng).forEach(e => e.add(k)); SP.cache.clear(); spellRun(); toast(`Added “${k}” to your dictionary (this browser).`); }
flowEl.addEventListener("contextmenu", e => {
  if (!flowOn() || e.ctrlKey || e.shiftKey) return; const r = spellAt(e.clientX, e.clientY); if (!r) return; e.preventDefault();
  const word = r.toString(), sug = suggest(word).slice(0, 6);
  menu([{ head: `Not in the dictionary: “${word}”` }, ...(sug.length ? sug.map(s => ({ label: s, fn: () => spellReplace(r, s) })) : [{ label: "No suggestions", fn: () => {} }]), { sep: true },
    { label: "Ignore all", sub: "In this document", fn: () => spellIgnoreAll(word) }, { label: "Add to dictionary", sub: "For every document in this browser", fn: () => spellAdd(word) }, { sep: true },
    { label: "Spelling panel…", k: "F7", fn: () => spellPanel() }, { label: "Browser menu", sub: "Shift+right-click shows it any time", fn: () => {} }], e);
});
/* the F7 panel: step through the document like Word's Spelling pane */
let spPanel = null, spIdx = 0, spSkip = new Set();
function spellPanel() {
  const m = spellCfg().mode; if (m !== "en-GB" && m !== "en-US") { spellMenuSet("en-GB"); }
  spellRun(); spIdx = 0; spSkip = new Set();
  if (!spPanel) { spPanel = EL("div", { class: "sp-panel", role: "dialog", "aria-label": "Spelling" }); document.body.append(spPanel); }
  spPanel.hidden = false; spShow();
}
function spCur() { const list = SP.ranges.filter(r => !spSkip.has(r.startContainer.data + "@" + r.startOffset + ":" + r.toString())); return list[Math.min(spIdx, list.length - 1)] || null; }
function spShow() {
  const r = spCur(), lang = spellCfg().mode === "en-US" ? "English (US)" : "English (UK)"; spPanel.innerHTML = "";
  const head = EL("div", { class: "sp-h" }, EL("b", {}, "Spelling"), EL("span", { class: "sp-lang" }, lang), EL("span", { style: "flex:1" }), EL("button", { class: "ibtn", title: "Close (Esc)", onclick: () => { spPanel.hidden = true; } }, ICON("i-x")));
  spPanel.append(head);
  if (!r) { spPanel.append(EL("p", { class: "sp-ok" }, "✓ No spelling issues found."), EL("div", { class: "sp-btns" }, EL("button", { class: "btn small", onclick: () => { spPanel.hidden = true; } }, "Close"))); return; }
  const word = r.toString(), sug = suggest(word).slice(0, 8);
  const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); elOf(r.startContainer).scrollIntoView({ block: "center", behavior: "smooth" });
  const ctx = r.startContainer.data, a = Math.max(0, r.startOffset - 50), b = Math.min(ctx.length, r.endOffset + 50);
  spPanel.append(EL("div", { class: "sp-ctx", html: (a ? "…" : "") + esc(ctx.slice(a, r.startOffset)) + `<mark>${esc(word)}</mark>` + esc(ctx.slice(r.endOffset, b)) + (b < ctx.length ? "…" : "") }), EL("div", { class: "sp-n" }, `${SP.ranges.length} word${SP.ranges.length === 1 ? "" : "s"} not in the dictionary`));
  let pick = sug[0] || ""; const list = EL("div", { class: "sp-sug" });
  sug.forEach((s, i) => list.append(EL("button", { class: i === 0 ? "on" : "", onclick: e => { pick = s; $$("button", list).forEach(x => x.classList.toggle("on", x === e.currentTarget)); }, ondblclick: () => change() }, s)));
  if (!sug.length) list.append(EL("span", { class: "muted" }, "No suggestions"));
  spPanel.append(list);
  const change = () => { if (pick) spellReplace(r, pick); };
  const changeAll = () => { if (!pick) return; for (const x of [...SP.ranges].reverse()) if (x.toString() === word) { x.deleteContents(); x.insertNode(document.createTextNode(pick)); } flowEl.normalize(); flowChanged(); spellRun(); };
  const B = (l, fn, cls = "btn small") => EL("button", { class: cls, onclick: fn }, l);
  spPanel.append(EL("div", { class: "sp-btns" }, B("Change", change, "btn small primary"), B("Change all", changeAll), B("Ignore once", () => { spSkip.add(r.startContainer.data + "@" + r.startOffset + ":" + word); spShow(); }), B("Ignore all", () => spellIgnoreAll(word)), B("Add to dictionary", () => spellAdd(word))));
}
document.addEventListener("keydown", e => { if (e.key === "Escape" && spPanel && !spPanel.hidden && e.target.closest?.(".sp-panel,#flow,body")) { if (!$("#menu").hidden || !$("#modalBack").hidden) return; spPanel.hidden = true; } });
function spellMenuSet(mode) { Prefs.set("spell", { ...spellCfg(), mode }); SP.cache.clear(); spellApplyMode(); }

/* ---- menus: Edit, Insert, Format, Tools, Help ---- */
function editMenu(a) { saveRange(); menu([{ label: "Undo", k: "Ctrl+Z", fn: undo }, { label: "Redo", k: "Ctrl+Y", fn: redo }, { sep: true }, { label: "Cut", k: "Ctrl+X", fn: () => { useRange(); document.execCommand("cut"); } }, { label: "Copy", k: "Ctrl+C", fn: () => { useRange(); document.execCommand("copy"); } }, { label: "Paste", k: "Ctrl+V", sub: "Use the keys: browsers block pasting from a menu", fn: () => toast("Press Ctrl+V (⌘V) to paste.") }, { label: "Select all", k: "Ctrl+A", fn: () => { flowEl.focus(); document.execCommand("selectAll"); } }, { sep: true }, { label: "Find", k: "Ctrl+F", fn: () => { showLeft("find"); $("#findIn").focus(); } }, { label: "Find and replace", k: "Ctrl+H", fn: () => { showLeft("find"); $("#replIn").focus(); } }], a); }
function insertMenu(a) { saveRange(); menu([{ label: "Table", icon: "i-table", fn: () => tableMenu(a) }, { label: "Image…", icon: "i-image", fn: () => $("[data-act=insertImage]").click() }, { label: "Link…", icon: "i-link", k: "Ctrl+K", fn: () => { useRange(); linkPrompt(); } }, { sep: true },
  { label: "Footnote", k: "Ctrl+Alt+F", fn: insertFootnote }, { label: "Page break", k: "Ctrl+Enter", fn: pageBreak }, { label: "Table of contents", sub: "Updates itself from the headings", fn: insertToc }, { label: "Horizontal line", icon: "i-hr", fn: C("insertHorizontalRule") }, { sep: true },
  { label: "Symbol…", sub: "Greek letters, ± µ ° → and more", fn: symbolDialog }, { label: "Today's date", fn: insertDate }, { label: "Comment", icon: "i-comment", k: "Ctrl+Alt+M", fn: () => { useRange(); flowComment(); } }], a); }
function formatMenu(a) { saveRange(); menu([{ head: "Text" }, { label: "Bold", k: "Ctrl+B", fn: C("bold") }, { label: "Italic", k: "Ctrl+I", fn: C("italic") }, { label: "Underline", k: "Ctrl+U", fn: C("underline") }, { label: "Strikethrough", k: "Ctrl+Shift+X", fn: C("strikeThrough") }, { label: "Superscript", k: "Ctrl+Shift+=", fn: C("superscript") }, { label: "Subscript", k: "Ctrl+=", fn: C("subscript") }, { label: "Small caps", k: "Ctrl+Shift+K", fn: smallCaps },
  { label: "Bigger", k: "Ctrl+Shift+>", fn: () => stepSize(1) }, { label: "Smaller", k: "Ctrl+Shift+<", fn: () => stepSize(-1) },
  { sep: true }, { head: "Change case" }, { label: "UPPERCASE", k: "Shift+F3 cycles", fn: () => changeCase("upper") }, { label: "lowercase", fn: () => changeCase("lower") }, { label: "Title Case", fn: () => changeCase("title") }, { label: "Sentence case", fn: () => changeCase("sentence") },
  { sep: true }, { head: "Paragraph" }, { label: "Line and paragraph spacing…", fn: () => spacingMenu(a) }, { label: "Align left / centre / right / justify", sub: "Ctrl+L, Ctrl+E, Ctrl+R, Ctrl+J", fn: () => alignMenu(a) }, { label: "Bulleted list", k: "Ctrl+Shift+8", fn: C("insertUnorderedList") }, { label: "Numbered list", k: "Ctrl+Shift+7", fn: C("insertOrderedList") },
  { sep: true }, { label: "Copy formatting", k: "Ctrl+Alt+C", fn: copyFormat }, { label: "Paste formatting", k: "Ctrl+Alt+V", fn: pasteFormat }, { label: "Clear formatting", k: "Ctrl+Space", fn: C("removeFormat") }, { sep: true }, { label: "Page setup…", fn: pageSetup }], a); }
function toolsMenu(a) {
  const m = spellCfg();
  menu([{ head: "Spelling" }, { label: "Check spelling…", k: "F7", fn: () => spellPanel() }, ...[["en-GB", "English (UK)", "Offline dictionary, red wavy underlines"], ["en-US", "English (US)", "Offline dictionary"], ["browser", "Browser's own checker", "Your browser's languages"], ["off", "Off", ""]].map(([k, l, sub]) => ({ label: l, sub, on: m.mode === k, fn: () => spellMenuSet(k) })),
    { label: (m.italic ? "✓ " : "") + "Skip words in italics", sub: "Species names such as Escherichia coli", fn: () => { Prefs.set("spell", { ...m, italic: !m.italic }); spellRun(); } },
    { label: "Personal dictionary…", fn: personalDict }, { sep: true }, { label: "Word count", k: "Ctrl+Shift+G", fn: wordCountDialog }, { label: "Ask AI about the selection", k: "Alt+A", fn: () => { useRange(); aiAskOpen(); } }, { label: "AI settings…", fn: () => aiSettings() }, { sep: true }, { label: "Keyboard shortcuts", k: "Ctrl+/", fn: shortcutsHelp }], a);
}
async function personalDict() {
  const v = await modal(`<h3>Personal dictionary</h3><p>Words you added, one per line. They are kept in this browser and used by every document.</p><textarea name="w" style="min-height:220px">${esc((Prefs.get("userDict", []) || []).join("\n"))}</textarea><div class="mrow"><button class="btn" data-cancel>Cancel</button><button class="btn primary" data-ok="ok">Save</button></div>`);
  if (!v) return; Prefs.set("userDict", [...new Set(v.w.split(/\n/).map(x => x.trim()).filter(Boolean))]); SP.eng = {}; SP.cache.clear(); spellRun();
}

/* ---- keyboard shortcuts (Word, and Google Docs where a browser keeps Word's key for itself) ---- */
const SHORTCUTS = [
  ["Text", [["Ctrl+B / I / U", "Bold, italic, underline"], ["Ctrl+Shift+X or Alt+Shift+5", "Strikethrough"], ["Ctrl+=", "Subscript"], ["Ctrl+Shift+=", "Superscript"], ["Ctrl+Shift+K", "Small caps"], ["Shift+F3", "Change case (UPPER, lower, Title)"], ["Ctrl+Shift+> / <", "Font size up / down a step"], ["Ctrl+] / Ctrl+[", "Font size up / down 1 pt"], ["Ctrl+Shift+F or Ctrl+D", "Font box"], ["Ctrl+Shift+P", "Size box"], ["Ctrl+Space or Ctrl+\\", "Clear character formatting"], ["Ctrl+Alt+C / Ctrl+Alt+V", "Copy / paste formatting"], ["Ctrl+Shift+H", "Highlight"], ["Ctrl+K", "Link"]]],
  ["Paragraph", [["Ctrl+Alt+1 / 2 / 3", "Heading 1 / 2 / 3"], ["Ctrl+Alt+0", "Normal text"], ["Ctrl+L / E / R / J", "Align left, centre, right, justify (also Ctrl+Shift+L/E/R/J)"], ["Ctrl+1 / Ctrl+5 / Ctrl+2", "Line spacing single / 1.5 / double"], ["Ctrl+M / Ctrl+Shift+M", "Indent / outdent (also Tab / Shift+Tab)"], ["Ctrl+Shift+8 / 7", "Bulleted / numbered list"], ["Alt+Shift+↑ / ↓", "Move paragraph up / down"], ["Ctrl+Q", "Clear paragraph formatting"], ["Shift+Enter", "Line break in the same paragraph"]]],
  ["Insert", [["Ctrl+Enter", "Page break"], ["Ctrl+Alt+F", "Footnote"], ["Ctrl+Alt+M", "Comment"], ["Ctrl+Shift+Space", "Non-breaking space"]]],
  ["AI", [["Alt+A", "Ask AI about the selection"], ["Tab", "Accept the AI suggestion"], ["Esc", "Reject the AI suggestion"]]],
  ["Document", [["Ctrl+S", "Save"], ["Ctrl+O", "Open"], ["Ctrl+P", "Print / save as PDF"], ["Ctrl+Z / Ctrl+Y", "Undo / redo"], ["Ctrl+F / Ctrl+H", "Find / replace"], ["F7", "Spelling"], ["Ctrl+Shift+G", "Word count"], ["Ctrl+/", "This list"], ["Ctrl+wheel, Ctrl+−", "Zoom (Ctrl+= is subscript in the text)"]]]
];
function shortcutsHelp() {
  const mac = /Mac|iPhone|iPad/.test(navigator.platform), k = s => esc(mac ? s.replace(/Ctrl\+/g, "⌘").replace(/Alt\+/g, "⌥").replace(/Shift\+/g, "⇧") : s);
  modal(`<h3>Keyboard shortcuts</h3><p>Word's keys work in the text. Where a browser keeps one of Word's keys for itself, the Google Docs key works instead.</p><div class="kb-grid">${SHORTCUTS.map(([g, list]) => `<div><div class="kb-h">${g}</div><table class="kb-t">${list.map(([a, b]) => `<tr><td><kbd>${k(a)}</kbd></td><td>${esc(b)}</td></tr>`).join("")}</table></div>`).join("")}</div><div class="mrow"><button class="btn primary" data-cancel>Close</button></div>`);
  $("#modal").classList.add("kb-modal"); const off = () => { if ($("#modalBack").hidden) { $("#modal").classList.remove("kb-modal"); } else setTimeout(off, 300); }; setTimeout(off, 300);
}
document.addEventListener("keydown", e => {
  if (!flowOn() || !$("#modalBack").hidden) return;
  const t = e.target, inFlow = !!t.closest?.("#flow"), inField = !inFlow && !!t.closest?.("input,textarea,select,[contenteditable=true]");
  const mod = e.ctrlKey || e.metaKey, L = e.code.startsWith("Key") ? e.code.slice(3).toLowerCase() : "", sh = e.shiftKey, al = e.altKey;
  const go = fn => { e.preventDefault(); e.stopPropagation(); fn(); };
  if (!inField) {
    if (mod && !al && (e.code === "Slash" || e.key === "/")) return go(shortcutsHelp);
    if (mod && sh && !al && L === "g") return go(wordCountDialog);
    if (e.key === "F7" && !mod && !al) return go(() => spellPanel());
    if (mod && !sh && !al && L === "p") return go(() => printFlow());
    if (mod && !sh && !al && L === "o") return go(() => $("[data-act=openFile]").click());
    if (mod && !sh && !al && L === "h") return go(() => { showLeft("find"); $("#replIn").focus(); });
  }
  if (!inFlow) return;
  if (e.key === "Enter" && !mod && !sh && t.closest && elOf(getSelection().anchorNode)?.closest("ol.footnotes")) return go(() => document.execCommand("insertLineBreak"));
  if (!mod && !(al && sh) && !(sh && e.key === "F3")) return;
  saveRange();
  if (mod && al && !sh && /^Digit[0-3]$/.test(e.code)) return go(() => setBlock(e.code === "Digit0" ? "p" : "h" + (+e.code.slice(5) + 1)));
  if (mod && !al && e.code === "Equal") return go(() => cmd(sh ? "superscript" : "subscript"));
  if (mod && sh && !al && (e.key === ">" || e.code === "Period")) return go(() => stepSize(1));
  if (mod && sh && !al && (e.key === "<" || e.code === "Comma")) return go(() => stepSize(-1));
  if (mod && !sh && !al && e.code === "BracketRight") return go(() => bumpSize(1));
  if (mod && !sh && !al && e.code === "BracketLeft") return go(() => bumpSize(-1));
  if (mod && !al && "lerj".includes(L) && L) return go(() => cmd({ l: "justifyLeft", e: "justifyCenter", r: "justifyRight", j: "justifyFull" }[L]));
  if (mod && !al && L === "m") return go(() => cmd(sh ? "outdent" : "indent"));
  if (mod && sh && !al && e.code === "Digit7") return go(() => cmd("insertOrderedList"));
  if (mod && sh && !al && e.code === "Digit8") return go(() => cmd("insertUnorderedList"));
  if ((mod && sh && !al && L === "x") || (al && sh && !mod && e.code === "Digit5")) return go(() => cmd("strikeThrough"));
  if (mod && sh && !al && L === "k") return go(smallCaps);
  if (mod && sh && !al && e.code === "Space") return go(() => document.execCommand("insertText", false, " "));
  if (mod && !sh && !al && (e.code === "Space" || e.code === "Backslash")) return go(() => cmd("removeFormat"));
  if (mod && !sh && !al && L === "q") return go(clearParagraph);
  if (mod && al && !sh && L === "c") return go(copyFormat);
  if (mod && al && !sh && L === "v") return go(pasteFormat);
  if (mod && al && !sh && L === "f") return go(insertFootnote);
  if (mod && !sh && !al && e.key === "Enter") return go(pageBreak);
  if (sh && !mod && !al && e.key === "F3") return go(() => changeCase("cycle"));
  if (al && sh && !mod && (e.key === "ArrowUp" || e.key === "ArrowDown")) return go(() => moveBlock(e.key === "ArrowUp" ? -1 : 1));
  if (mod && !sh && !al && ["Digit1", "Digit2", "Digit5"].includes(e.code)) return go(() => lineSpacing({ Digit1: "1", Digit2: "2", Digit5: "1.5" }[e.code]));
  if (mod && ((sh && !al && L === "f") || (!sh && !al && L === "d"))) return go(() => fontSel.focus());
  if (mod && sh && !al && L === "p") return go(() => sizeSel.focus());
}, true);

/* ---- upkeep after every change: footnote numbers, contents, spelling, word count ---- */
let wBusy = false;
const upkeep = debounce(() => { if (!flowOn() || wBusy) return; wBusy = true; try { const a = fnRenumber(), b = tocUpdate(); if (a || b) flowChanged(); } finally { wBusy = false; } placeGrip(); wcUpdate(); spellSoon(); }, 350);
new MutationObserver(() => { if (!wBusy) upkeep(); }).observe(flowEl, { childList: true, characterData: true, subtree: true });
document.addEventListener("selectionchange", () => { if (flowOn()) { wcSoon(); const s = getSelection(); if (s.rangeCount && flowEl.contains(s.anchorNode)) syncFontUISoon(); } });
const syncFontUISoon = debounce(syncFontUI, 120);
{ const sd2 = showDoc; showDoc = async function () { const r = await sd2(); if (S.doc?.kind === "flow") { applyPage(); spellApplyMode(); requestAnimationFrame(syncFontUI); } wcUpdate(); return r; }; }
{ const ew2 = exitWebView; exitWebView = function () { const r = ew2(); applyPage(); wcUpdate(); return r; }; }
/* exports carry the page font, size and line spacing */
{ const eh = exportHtmlString; exportHtmlString = async function (o) { const h = await eh(o), p = pageCfg(); if (S.doc?.kind !== "flow" || !(p.font || p.size || p.lh)) return h; return h.replace("</head>", `<style>body{${p.font ? `font-family:${p.font};` : ""}${p.size ? `font-size:${p.size}pt;` : ""}${p.lh ? `line-height:${p.lh};` : ""}}</style>\n</head>`); }; }

/* ---- toolbar and menu bar wiring ---- */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  const A = { wEdit: () => editMenu(b), wInsert: () => insertMenu(b), wFormat: () => formatMenu(b), wTools: () => toolsMenu(b), wHelp: shortcutsHelp, wPage: () => pageMenu(b), wSpacing: () => spacingMenu(b), wGrow: () => stepSize(1), wShrink: () => stepSize(-1), wPainter: () => { if (W.painterArmed) { W.painterArmed = false; b.classList.remove("on"); } else { saveRange(); copyFormat(); } }, wCase: () => { saveRange(); changeCase("cycle"); } };
  if (A[a]) { e.preventDefault(); A[a](); }
});
$$(".menubar button, #flowTools [data-act^=w]").forEach(b => b.addEventListener("pointerdown", e => { saveRange(); e.preventDefault(); }));
/* ---- inserting HTML: Chrome sometimes adds inline styles of its own to what it inserts; keep only the content's own ---- */
{ const ih = insertHtml; insertHtml = function (html) {
    const t = document.createElement("template"); t.innerHTML = html; t.content.querySelectorAll("[style]").forEach(e => e.setAttribute("data-pwk", ""));
    const had = new Set($$("[style]", flowEl)); ih(t.innerHTML);
    for (const el of $$("[style]", flowEl)) { if (had.has(el)) continue; if (el.hasAttribute("data-pwk")) continue; el.removeAttribute("style"); if ((el.tagName === "SPAN" || el.tagName === "FONT") && !el.attributes.length) el.replaceWith(...el.childNodes); }
    $$("[data-pwk]", flowEl).forEach(e => e.removeAttribute("data-pwk")); S.doc && (S.doc.html = flowEl.innerHTML);
  }; }
/* ---- links: Enter applies, a bare address gets https://, an e-mail gets mailto:, a click shows Open / Edit / Remove ---- */
function normUrl(u) { u = String(u || "").trim(); if (!u) return ""; if (/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(u)) return "mailto:" + u; if (/^(#|\/|\.\/|\.\.\/)/.test(u) || /^[a-z][\w+.-]*:/i.test(u)) return u; return "https://" + u; }
linkPrompt = async function () {
  const sel = getSelection(), inFlow = sel.rangeCount && flowEl.contains(sel.anchorNode); if (!inFlow) useRange();
  const a = elOf(sel.anchorNode)?.closest("#flow a"), saved = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null, collapsed = !saved || saved.collapsed;
  const v = await modal(`<h3>${a ? "Edit link" : "Insert link"}</h3><div class="ai-f"><label>Web address, e-mail or #heading</label><input type="text" name="url" value="${esc(a?.getAttribute("href") || "")}" placeholder="example.org/page" spellcheck="false" autocomplete="url"></div>${collapsed && !a ? `<div class="ai-f"><label>Text to show (optional)</label><input type="text" name="text" placeholder="the address"></div>` : ""}<div class="mrow">${a ? '<button class="btn danger" data-ok="unlink">Remove link</button>' : ""}<span class="sp"></span><button class="btn" data-cancel>Cancel</button><button class="btn primary" data-ok="ok">Apply</button></div>`, { select: true });
  if (!v) return; flowEl.focus({ preventScroll: true }); if (saved) { sel.removeAllRanges(); sel.addRange(saved); }
  if (v.btn === "unlink") { if (a) { a.replaceWith(...a.childNodes); flowChanged(); } return; }
  const url = normUrl(v.url); if (!url) return;
  if (a) { a.setAttribute("href", url); flowChanged(); }
  else if (collapsed) insertHtml(`<a href="${esc(url)}">${esc(v.text?.trim() || v.url.trim())}</a>`);
  else cmd("createLink", url);
};
$("#modal").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && e.target.matches("input:not([type=checkbox]):not([type=radio])")) { const ok = $("#modal [data-ok='ok']") || $("#modal [data-ok]"); if (ok) { e.preventDefault(); ok.click(); } } });
let linkCard = null;
function closeLinkCard() { linkCard?.remove(); linkCard = null; }
flowEl.addEventListener("click", e => {
  const a = e.target.closest("a[href]"); closeLinkCard(); if (!a || a.closest("nav.toc") || e.ctrlKey || e.metaKey) return;
  const r = a.getBoundingClientRect(), href = a.getAttribute("href");
  linkCard = EL("div", { class: "imgtools link-card", style: `position:fixed;left:${clamp(r.left, 8, innerWidth - 340)}px;top:${r.bottom + 6}px` });
  const B = (l, fn, t) => linkCard.append(EL("button", { title: t || "", onpointerdown: ev => ev.preventDefault(), onclick: ev => { ev.preventDefault(); closeLinkCard(); fn(); } }, l));
  linkCard.append(EL("span", { class: "lc-url", title: href }, href.length > 42 ? href.slice(0, 40) + "…" : href));
  B("Open ↗", () => { if (href.startsWith("#")) $(href, flowEl)?.scrollIntoView({ behavior: "smooth" }); else window.open(a.href, "_blank", "noopener"); }, "Open (or Ctrl+click the link)");
  B("Edit", () => { const rg = document.createRange(); rg.selectNodeContents(a); getSelection().removeAllRanges(); getSelection().addRange(rg); saveRange(); linkPrompt(); });
  B("Remove", () => { a.replaceWith(...a.childNodes); flowChanged(); });
  document.body.append(linkCard);
});
document.addEventListener("pointerdown", e => { if (linkCard && !e.target.closest(".link-card")) closeLinkCard(); }, true);
viewer.addEventListener("scroll", closeLinkCard, { passive: true });

/* ---- paste keeps the source's look (fonts, sizes, bold, colours), like Word's "Keep source formatting";
   the options chip switches to the document's own look or plain text; Ctrl+Shift+V pastes plain text ---- */
const KEEP_TAGS = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI", "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TD", "TH", "CAPTION", "BLOCKQUOTE", "PRE", "CODE", "A", "IMG", "BR", "SUP", "SUB", "FIGURE", "FIGCAPTION", "HR", "B", "STRONG", "I", "EM", "U", "S"]);
const BLOCKS = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "TD", "TH", "BLOCKQUOTE", "PRE", "FIGCAPTION", "CAPTION", "DIV"]);
function pasteSandbox(html) {
  const dom = new DOMParser().parseFromString(html, "text/html");
  const css = [...dom.querySelectorAll("style")].map(x => x.textContent).join("\n").replace(/@import[^;]+;/g, "");
  const body = DOMPurify.sanitize(dom.body.innerHTML, { ADD_ATTR: ["style", "colspan", "rowspan"], FORBID_TAGS: ["style", "script", "iframe", "form", "input", "button", "select", "textarea", "object", "embed", "video", "audio", "canvas", "svg"] });
  const fr = EL("iframe", { sandbox: "allow-same-origin", style: "position:fixed;left:-10000px;top:0;width:900px;height:400px;border:0;visibility:hidden", "aria-hidden": "true" });
  document.body.append(fr); const d = fr.contentDocument; d.open(); d.write(`<!doctype html><html><head><style>body{margin:0}${css.replace(/<\//g, "")}</style></head><body>${body}</body></html>`); d.close();
  return { fr, d };
}
const isDarkGrey = c => { const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); if (!m) return false; const [r, g, b] = m.slice(1).map(Number); return Math.max(r, g, b) < 80 && Math.max(r, g, b) - Math.min(r, g, b) < 24; };
/* mode: "keep" (source look as inline styles), "match" (structure, bold, italic only) */
function pasteConvert(html, mode) {
  const { fr, d } = pasteSandbox(html), win = fr.contentWindow, base = win.getComputedStyle(d.body);
  const props = ["fontFamily", "fontSize", "fontWeight", "fontStyle", "color", "backgroundColor", "textDecorationLine", "verticalAlign", "fontVariantCaps"];
  function styleFor(el, parentCs) {
    const cs = win.getComputedStyle(el), out = [];
    if (mode === "keep") {
      if (cs.fontFamily !== parentCs.fontFamily && cs.fontFamily !== base.fontFamily) out.push(`font-family:${cs.fontFamily}`);
      if (cs.fontSize !== parentCs.fontSize && cs.fontSize !== base.fontSize) out.push(`font-size:${Math.round(parseFloat(cs.fontSize) * 0.75 * 2) / 2}pt`);
      if (cs.color !== parentCs.color && !isDarkGrey(cs.color)) out.push(`color:${cs.color}`);
      if (cs.backgroundColor !== parentCs.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent|rgb\(255, 255, 255\)/.test(cs.backgroundColor)) out.push(`background-color:${cs.backgroundColor}`);
      if (cs.fontVariantCaps === "small-caps" && parentCs.fontVariantCaps !== "small-caps") out.push("font-variant:small-caps");
      if (BLOCKS.has(el.tagName) && cs.textAlign && /center|right|justify/.test(cs.textAlign) && cs.textAlign !== parentCs.textAlign) out.push(`text-align:${cs.textAlign}`);
    }
    return { cs, out };
  }
  function walk(src, parentCs, dst) {
    for (const n of src.childNodes) {
      if (n.nodeType === 3) { dst.append(n.data.replace(/ /g, " ").replace(/[\r\n]+/g, " ")); continue; }
      if (n.nodeType !== 1) continue;
      const tag = n.tagName; if (/^(SCRIPT|STYLE|META|LINK|TITLE|O:P)$/.test(tag)) continue;
      const { cs, out } = styleFor(n, parentCs);
      const bold = +cs.fontWeight >= 600, pBold = +parentCs.fontWeight >= 600, ital = cs.fontStyle === "italic", pItal = parentCs.fontStyle === "italic";
      const und = /underline/.test(cs.textDecorationLine) && !/underline/.test(parentCs.textDecorationLine), str = /line-through/.test(cs.textDecorationLine) && !/line-through/.test(parentCs.textDecorationLine);
      const sup = cs.verticalAlign === "super" && parentCs.verticalAlign !== "super", sub = cs.verticalAlign === "sub" && parentCs.verticalAlign !== "sub";
      let el;
      if (tag === "A" && n.getAttribute("href")) el = EL("a", { href: n.getAttribute("href") });
      else if (tag === "IMG") { const src2 = n.getAttribute("src"); if (src2 && !/^(file|cid):/i.test(src2)) dst.append(EL("img", { src: src2, alt: n.getAttribute("alt") || "" })); continue; }
      else if (tag === "BR" || tag === "HR") { dst.append(EL(tag.toLowerCase())); continue; }
      else if (/^(TD|TH)$/.test(tag)) { el = EL(tag.toLowerCase()); for (const at of ["colspan", "rowspan"]) if (n.getAttribute(at)) el.setAttribute(at, n.getAttribute(at)); }
      else if (KEEP_TAGS.has(tag) && !/^(B|STRONG|I|EM|U|S|SUP|SUB)$/.test(tag)) el = EL(tag.toLowerCase());
      else if (tag === "DIV" && [...n.childNodes].some(c => c.nodeType === 3 && c.data.trim())) el = EL("p");
      else if (BLOCKS.has(tag) || /^(DIV|SECTION|ARTICLE|MAIN|HEADER|FOOTER|ASIDE|NAV|CENTER)$/.test(tag)) { walk(n, cs, dst); continue; }
      else el = null;   // inline wrapper (span, font, b, i…): its look goes on a span or tags
      let inner = el || document.createDocumentFragment(), leaf = inner;
      const wrap = t => { const w = EL(t); leaf.append(w); leaf = w; };
      // headings keep their tag; with "keep" their source size and weight go inline so they look as they did
      if (el && /^H[1-6]$/.test(tag) && mode === "keep") { out.push(`font-size:${Math.round(parseFloat(cs.fontSize) * 0.75 * 2) / 2}pt`, `font-weight:${cs.fontWeight}`); if (cs.fontFamily !== base.fontFamily) out.push(`font-family:${cs.fontFamily}`); }
      if (out.length) { const st = [...new Map(out.map(x => [x.split(":")[0], x])).values()].join(";"); out.length = 0; out.push(st); if (el && (BLOCKS.has(tag) || /^H[1-6]$/.test(tag))) el.setAttribute("style", out.join(";")); else { const sp = EL("span", { style: out.join(";") }); leaf.append(sp); leaf = sp; } }
      if (!/^H[1-6]$/.test(tag) || mode !== "keep") { if (bold && !pBold && !/^H[1-6]$|^TH$/.test(tag)) wrap("b"); }
      if (ital && !pItal) wrap("i"); if (und) wrap("u"); if (str) wrap("s"); if (sup) wrap("sup"); if (sub) wrap("sub");
      if (!bold && pBold && mode === "keep") { leaf.setAttribute?.("style", ((leaf.getAttribute?.("style") || "") + ";font-weight:normal").replace(/^;/, "")); }
      walk(n, cs, leaf); dst.append(inner);
    }
  }
  const out = document.createElement("div"); walk(d.body, base, out); fr.remove();
  $$("p,li,h1,h2,h3,h4,h5,h6", out).forEach(x => { if (!x.textContent.trim() && !x.querySelector("img")) x.remove(); });
  $$("span:not([style])", out).forEach(x => x.replaceWith(...x.childNodes));
  return out.innerHTML;
}
function textOffset(node, off) { let n = 0; const w = document.createTreeWalker(flowEl, NodeFilter.SHOW_TEXT); let t; while ((t = w.nextNode())) { if (t === node) return n + off; n += t.data.length; } if (node.nodeType === 1) { const r = document.createRange(); r.setStart(flowEl, 0); r.setEnd(node, off); return r.toString().length; } return n; }
function pointAt(off) { const w = document.createTreeWalker(flowEl, NodeFilter.SHOW_TEXT); let t, n = 0; while ((t = w.nextNode())) { if (n + t.data.length >= off) return [t, off - n]; n += t.data.length; } return [flowEl, flowEl.childNodes.length]; }
let pasteChip = null;
function closePasteChip() { pasteChip?.remove(); pasteChip = null; }
function doPaste(data, mode) {
  if (mode === "text") { const paras = data.text.replace(/\r/g, "").split(/\n{2,}|\n/).map(x => x.trim()); if (paras.length > 1) insertHtml(paras.map(x => `<p>${esc(x) || "<br>"}</p>`).join("")); else document.execCommand("insertText", false, data.text); flowChanged(); return; }
  if (!data.html) { if (/^(#|\*|-|\d+\.|>|\|)/m.test(data.text) && data.text.includes("\n")) insertHtml(mdToHtml(data.text)); else doPaste(data, "text"); return; }
  insertHtml(pasteConvert(data.html, mode));
}
document.addEventListener("paste", e => {
  if (!flowOn() || !e.target.closest?.("#flow") || e.target.closest(".ai-chg")) return;
  const cd = e.clipboardData; if (!cd) return; const items = [...cd.items]; if (items.some(i => i.type.startsWith("image/")) && !cd.getData("text/html")) return;   // pictures: the editor's own paste
  const data = { html: cd.getData("text/html"), text: cd.getData("text/plain") };
  if (!data.html && !data.text) return;
  e.preventDefault(); e.stopPropagation(); closePasteChip();
  const sel = getSelection(), r = sel.getRangeAt(0), before = flowEl.innerHTML, a = textOffset(r.startContainer, r.startOffset), b = textOffset(r.endContainer, r.endOffset);
  const mode = W.plainPaste ? "text" : (Prefs.get("pasteMode", "keep")); W.plainPaste = false;
  doPaste(data, data.html ? mode : "text");
  if (!data.html) return;
  const rr = getSelection().rangeCount ? getSelection().getRangeAt(0).getBoundingClientRect() : null;
  pasteChip = EL("div", { class: "imgtools paste-chip", style: `position:fixed;left:${clamp(rr?.left || 200, 8, innerWidth - 360)}px;top:${clamp((rr?.bottom || 200) + 8, 60, innerHeight - 50)}px` });
  pasteChip.append(EL("span", { class: "lc-url" }, "Paste:"));
  for (const [m, l, t] of [["keep", "Keep source formatting", "Fonts, sizes, bold and colours as in the source"], ["match", "Match this document", "Headings, lists, bold and italic; the document's own font and size"], ["text", "Plain text", "Ctrl+Shift+V"]]) {
    pasteChip.append(EL("button", { class: m === mode ? "on" : "", title: t, onpointerdown: ev => ev.preventDefault(), onclick: ev => {
      ev.preventDefault(); flowEl.innerHTML = before; const [n1, o1] = pointAt(a), [n2, o2] = pointAt(b), rg = document.createRange(); rg.setStart(n1, o1); rg.setEnd(n2, o2);
      flowEl.focus({ preventScroll: true }); getSelection().removeAllRanges(); getSelection().addRange(rg); doPaste(data, m); if (m !== "text") Prefs.set("pasteMode", m); $$("button", pasteChip).forEach(x => x.classList.toggle("on", x === ev.currentTarget)); } }, l));
  }
  document.body.append(pasteChip); const chip = pasteChip; setTimeout(() => document.addEventListener("keydown", closePasteChip, { once: true }), 0); setTimeout(() => { if (pasteChip === chip) closePasteChip(); }, 15000);
}, true);
document.addEventListener("pointerdown", e => { if (pasteChip && !e.target.closest(".paste-chip")) closePasteChip(); }, true);
document.addEventListener("keydown", e => { if (flowOn() && (e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyV" && e.target.closest?.("#flow")) W.plainPaste = true; }, true);

/* ---- page width in the toolbar; wide pages fold the side panels so there is room; the web view follows the page ---- */
const pwSel = $("#pageWSel");
pwSel.innerHTML = [["a4", "A4"], ["letter", "Letter"], ["wide", "Wide"], ["fill", "Fill the stage"], ["custom", "Custom"]].map(([k, l]) => `<option value="${k}">${l}</option>`).join("");
pwSel.addEventListener("change", () => { if (pwSel.value === "custom") { toast("Drag the right edge of the page to any width."); pwSel.value = pageCfg().w; return; } setPage({ w: pwSel.value }); });
function makeRoom() {
  const p = pageCfg(), need = p.w === "fill" ? Infinity : (p.w === "custom" ? p.px : PAGE_W[p.w] || 794) + 60; let folded = [];
  if (need > viewer.clientWidth) for (const id of ["left", "right"]) { const el = $("#" + id); if (!el.classList.contains("closed") && need > viewer.clientWidth) { el.classList.add("closed"); folded.push(id === "left" ? "Pages" : "Notes"); } }
  if (folded.length) toast(`Folded the ${folded.join(" and ")} panel${folded.length > 1 ? "s" : ""} to make room for the page.`);
}
{ const sp = setPage; setPage = function (patch, asDefault) { sp(patch, asDefault); if (patch.w && patch.w !== "a4" && patch.w !== "letter") setTimeout(() => { makeRoom(); applyPage(); }, 30); pwSel.value = pageCfg().w; wvPage(); }; }
{ const ap = applyPage; applyPage = function () { ap(); if (S.doc?.kind === "flow") pwSel.value = pageCfg().w; }; }
function wvPage() {
  const d = S.webview && wvDoc(); if (!d || S.doc?.meta?.head) return; const p = pageCfg(), w = p.w === "fill" ? "none" : (p.w === "custom" ? p.px : PAGE_W[p.w] || 794) + "px";
  let st = d.getElementById("lp-pw"); if (!st) { st = d.createElement("style"); st.id = "lp-pw"; d.head.append(st); }
  st.textContent = `body{max-width:${w}!important;${p.w === "fill" ? "margin:24px!important;" : ""}${p.font ? `font-family:${p.font}!important;` : ""}${p.size ? `font-size:${p.size}pt!important;` : ""}${p.lh ? `line-height:${p.lh}!important;` : ""}}`;
}
$("#wvFrame").addEventListener("load", wvPage);

Object.assign(window, { setFont, setSize, setPage, pageCfg, spellRun, spellPanel, insertFootnote, insertToc, changeCase, wordCountDialog, shortcutsHelp, SP });
