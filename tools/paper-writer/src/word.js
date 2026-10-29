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
  requestAnimationFrame(() => { placeGrip(); layoutMargin(); placeBar?.(); });
}
function setPage(patch, asDefault) { if (!S.doc) return; S.doc.meta = S.doc.meta || {}; S.doc.meta.page = { ...pageCfg(), ...patch }; if (asDefault) Prefs.set("pageDefaults", { ...S.doc.meta.page }); applyPage(); markDirty(); }
function placeGrip() { grip.style.left = (flowEl.offsetLeft + flowEl.offsetWidth - 5) + "px"; grip.style.height = flowEl.offsetHeight + "px"; }
grip.addEventListener("pointerdown", e => {
  e.preventDefault(); grip.setPointerCapture(e.pointerId); const x0 = e.clientX, w0 = flowEl.offsetWidth, z = S.flowZoom || 1; grip.classList.add("on");
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
Object.assign(window, { setFont, setSize, setPage, pageCfg, spellRun, spellPanel, insertFootnote, insertToc, changeCase, wordCountDialog, shortcutsHelp, SP });
