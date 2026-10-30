/* ---------- v8: revision marks and the AI stage ----------
   Mark the text up in place: cross out (Alt+X, "remove this"), cross out for better wording (Alt+W,
   "replace this"), or a note to the AI (Alt+C). Select the passage and send it to the stage (Alt+S): a second
   pane on the right where the AI's version shows as tracked changes with the review strip, while the original
   stays untouched on the left. When every change is decided, Send back puts the result where the passage was.
   If the passage on the left was edited by hand in the meantime, both versions are shown and the author
   chooses; the AI's version never overwrites hand edits on its own. */
const RV = { X: ["rv-x", "Remove"], W: ["rv-w", "Replace with better wording"], C: ["rv-c", "Note to the AI"] };
/* a note to the AI is an ordinary comment (Alt+C, the Comment button): the stage reads the comments in the passage */
let stage = null;   // the open stage: { id, srcLight, instr }
const stageEl = $("#aiStage"), stageBody = EL("div", { class: "flow st-body", id: "stBody" });
aiExtraRoot = stageBody;

/* --- marks on the left --- */
async function rvMark(kind) {
  if (!S.doc || S.doc.kind !== "flow" || S.webview) return;
  const sel = getSelection(); if (!sel || sel.isCollapsed || !sel.rangeCount || !flowEl.contains(sel.anchorNode)) return toast("Select the words first.");
  const r = sel.getRangeAt(0).cloneRange(); if (!r.toString().trim()) return toast("Select some words first.");
  const sb = elOf(r.startContainer).closest(AI_BLOCK), eb = elOf(r.endContainer).closest(AI_BLOCK);
  if (!sb || sb !== eb) return toast("Mark inside one paragraph at a time.");
  if (elOf(r.commonAncestorContainer).closest(".ai-chg,.rv") || r.cloneContents().querySelector?.(".ai-chg,.rv")) return toast("That text is already marked.");
  let note = "";
  if (kind === "C") return flowComment();
  if (kind === "C_") { const v = await modal(`<h3>Note to the AI</h3><p class="muted">About: <i>${esc(r.toString().trim().slice(0, 160))}</i></p><textarea name="note" rows="3" placeholder="What should change here? e.g. make this the topic sentence, cite the control experiment, too strong a claim"></textarea><div class="mrow"><button class="btn" data-cancel>Cancel</button><button class="btn ai" data-ok>Add note</button></div>`); if (!v || !v.note?.trim()) return; note = v.note.trim(); }
  const id = uid(), span = EL("span", { class: "rv " + RV[kind][0], "data-rv": id, title: RV[kind][1] + (note ? ": " + note : "") + " · click to change" });
  if (note) span.dataset.note = note;
  try { span.append(r.extractContents()); r.insertNode(span); } catch (e) { return toast("Could not mark that: select whole words."); }
  sel.removeAllRanges(); flowEl.normalize(); aiCommit();
  if (!Prefs.get("rvSeen")) { Prefs.set("rvSeen", 1); toast("Marked. Select the passage and press Alt+S to send it, with its marks, to the AI stage."); }
}
function rvUnwrap(el) { el.replaceWith(...el.childNodes); flowEl.normalize(); }
flowEl.addEventListener("click", e => {
  const m = e.target.closest(".rv"); if (!m || !flowEl.contains(m)) return; const s = getSelection(); if (s && !s.isCollapsed) return;
  e.preventDefault(); e.stopPropagation();
  menu([{ head: RV[m.classList.contains("rv-x") ? "X" : m.classList.contains("rv-w") ? "W" : "C"][1] + (m.dataset.note ? ": " + m.dataset.note : "") },
    ...(m.classList.contains("rv-c") ? [{ label: "Change the note…", fn: async () => { const v = await modal(`<h3>Note to the AI</h3><textarea name="note" rows="3">${esc(m.dataset.note || "")}</textarea><div class="mrow"><button class="btn" data-cancel>Cancel</button><button class="btn ai" data-ok>Save</button></div>`); if (v && v.note?.trim()) { m.dataset.note = v.note.trim(); m.title = "Note to the AI: " + m.dataset.note + " · click to change"; aiCommit(); } } }] : []),
    { label: "Send this paragraph to the AI stage", k: "Alt+S", fn: () => { const r = document.createRange(); r.selectNodeContents(m.closest(AI_BLOCK) || m.parentElement); const g = getSelection(); g.removeAllRanges(); g.addRange(r); stageSend(""); } },
    { sep: true }, { label: "Remove this mark", sub: "The words stay", fn: () => { rvUnwrap(m); aiCommit(); } },
    { label: "Remove every mark in the document", fn: () => { $$(".rv", flowEl).forEach(rvUnwrap); aiCommit(); } }], m);
}, true);
/* the marks as instructions for the AI */
function rvInstructions(root) {
  const out = [], T = m => m.textContent.replace(/\s+/g, " ").trim();
  for (const m of $$(".rv, .cmt[data-id], s, strike, del:not(.ai-d):not(.ai-old)", root)) { const t = T(m); if (!t) continue;
    if (m.classList.contains("rv-w")) out.push(`Replace «${t}» with better wording`);
    else if (m.classList.contains("rv-x") || /^(S|STRIKE|DEL)$/.test(m.tagName)) out.push(`Remove: «${t}»`);
    else if (m.classList.contains("cmt")) { const c = S.doc.comments?.[m.dataset.id], note = (c && (c.text || c.note)) || m.dataset.note || ""; if (note.trim()) out.push(`About «${t}»: ${note.trim()}`); }
    else if (m.classList.contains("rv-c")) out.push(`About «${t}»: ${m.dataset.note || "see the note"}`); }
  return [...new Set(out)];
}
/* the bar that appears on a selection, for written documents: highlight and comment, the two marks, the AI.
   Each button is an icon with a short word; the key is in the tooltip. PDFs keep their own bar. */
{ const sp = showSelPop; showSelPop = function () {
    if (!S.doc || S.doc.kind !== "flow" || S.webview) return sp.apply(this, arguments);
    closeSelPop(); const sel = getSelection(); if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const r = sel.getRangeAt(0).getBoundingClientRect(); if (!r.width) return;
    const p = EL("div", { class: "imgtools selpop selpro", role: "toolbar", "aria-label": "Selection" });
    const B = (icon, lbl, fn, title, cls = "") => p.append(EL("button", { type: "button", class: cls, title, "aria-label": title, onclick: e => { e.preventDefault(); closeSelPop(); fn(); }, onpointerdown: e => e.preventDefault() }, ICON(icon), EL("span", { class: "lbl" }, lbl)));
    const sep = () => p.append(EL("span", { class: "sp-sep", "aria-hidden": "true" }));
    B("i-hl", "Highlight", () => flowHighlight(), "Highlight in the current colour");
    B("i-comment", "Comment", () => flowComment(), "Comment: a note on these words, which the AI reads too (Alt+C)");
    sep();
    B("i-strike", "Cross out", () => rvMark("X"), "Cross out: tell the AI to remove these words (Alt+X)", "rvx");
    B("i-rotate", "Reword", () => rvMark("W"), "Cross out for better wording: tell the AI to replace these words (Alt+W)", "rvw");
    sep();
    B("i-ai", "Ask AI", () => aiAskOpen(), "Ask the AI about these words, in place (Alt+A)", "ai");
    B("i-next", "AI stage", () => stageSend(""), "Send the passage, with its marks and comments, to the AI stage beside the text (Alt+S)", "ai stage");
    document.body.append(p);
    const w = p.offsetWidth, h = p.offsetHeight, x = clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8), y = r.top - h - 10 > 56 ? r.top - h - 10 : r.bottom + 10;
    p.style.cssText = `position:fixed;left:${x}px;top:${y}px`;
  }; }
if (typeof SHORTCUTS !== "undefined") SHORTCUTS.push(["Revision marks and the AI stage", [["Alt+X", "Cross out (remove)"], ["Alt+W", "Cross out for better wording (replace)"], ["Alt+C", "Comment, which the AI reads as a note"], ["Alt+S", "Send the selection to the AI stage"], ["Alt+Enter", "Send back"], ["Alt+M", "Changes in colour / the changed version"], ["Alt+A", "Ask AI in place"]]], ["On the AI stage", [["Tab / Esc", "Accept / roll back the change at hand (a rewrite goes sentence by sentence)"], ["Select + Tab", "Accept just the selected words, then edit them"], ["Select + Esc", "Roll back the changes the selection touches"], ["Select + Alt+A", "Redo the selection with the AI"]]]);

/* --- the stage --- */
const aiRequestRaw = aiRequest;   // the in-place request, used only inside the stage
function stageDraw() {
  stageEl.innerHTML = "";
  stageEl.append(EL("div", { class: "st-head" }, ICON("i-ai"), EL("b", {}, "AI stage"), EL("span", { class: "muted st-n" }), EL("span", { style: "flex:1" }),
    EL("button", { class: "tb", id: "stFold", title: "Fold the other panels away", onclick: () => stageFold(!stage?.folded) }, "⇔"),
    EL("button", { class: "tb", title: "Hide the stage; the AI stage button in the toolbar brings it back", onclick: () => stageHide() }, ICON("i-x"))));
  stageEl.append(EL("div", { class: "st-instr", id: "stInstr" }));
  stageEl.append(stageBody);
  stageEl.append(EL("div", { class: "st-foot" }, EL("span", { class: "st-status", id: "stStatus" }),
    EL("button", { class: "btn ai st-back", id: "stBack", disabled: "", onclick: stageBack, title: "Put the result where the passage was (Alt+Enter)" }, "← Send back"),
    EL("span", { class: "st-foot-r" }, EL("button", { class: "btn small", onclick: () => stageClose(true), title: "Throw the AI's version away and keep the original" }, "Discard"))));
}
/* the stage shows the whole document, greyed, with the passage's block in focus: lines can be compared side by side */
function stageContext(id, srcLight) {
  const c = flowEl.cloneNode(true);
  $$("[id]", c).forEach(e => e.removeAttribute("id")); $$("[contenteditable]", c).forEach(e => e.removeAttribute("contenteditable"));
  $$(".ai-chg", c).forEach(x => x.replaceWith(aiOrigFrag(x)));
  const src = c.querySelector(`.rv-src[data-stage="${id}"]`); if (!src) return null;
  const block = src.closest(AI_BLOCK) || src.parentElement; block.classList.add("st-p");
  const focus = EL("span", { class: "st-focus", contenteditable: "true", spellcheck: "true" }); focus.append(lightFrag(srcLight)); src.replaceWith(focus);
  stageBody.className = "flow st-body " + [...flowEl.classList].filter(x => x !== "flow").join(" "); stageBody.id = "stBody";
  stageBody.style.cssText = flowEl.style.cssText; stageBody.style.font = getComputedStyle(flowEl).font; stageBody.style.padding = "";
  stageBody.innerHTML = ""; stageBody.append(...c.childNodes);
  return focus;
}
function stageSend(extra) {
  if (!S.doc || S.doc.kind !== "flow" || S.webview) return toast("The AI stage works in the Editor view of a written document.");
  const t = aiTarget(); if (t.err) return toast(t.err);
  closeSelPop(); aiAskClose();
  return stageSendRange(t.range, extra);
}
async function stageSendRange(range, extra) {
  if (stage && flowEl.querySelector(`.rv-src[data-stage="${stage.id}"]`)) { stageShow(); return toast("Finish the open stage first: Send back or Discard."); }
  $$(".rv-src", flowEl).forEach(rvUnwrap);
  const id = uid(), src = EL("span", { class: "rv-src", "data-stage": id, title: "On the AI stage. Edit it here if you like: your edits win over the AI's version." });
  src.append(range.extractContents()); range.insertNode(src); getSelection().removeAllRanges(); flowEl.normalize();
  const srcLight = toLight(src), marks = rvInstructions(src);
  const instr = [extra && extra.trim(), ...marks].filter(Boolean).join("\n") || "Improve the wording and the logical flow; keep the meaning, the facts and the citations.";
  stage = { id, srcLight, instr };
  stageDraw(); $(".st-n", stageEl).textContent = marks.length ? `${marks.length} mark${marks.length === 1 ? "" : "s"}` : "";
  $("#stInstr").innerHTML = instr.split("\n").map(l => `<div>${esc(l)}</div>`).join("");
  const focus = stageContext(id, srcLight); if (!focus) { stage = null; return toast("Could not open the stage for that passage."); }
  stageShow(); Prefs.set("aiPanelSeen", 1); stageFold(true); aiCommit();
  const r = document.createRange(); r.selectNodeContents(focus);
  stageAlign("viewer");
  await aiRequestRaw(r, instr);
  stageStatus(); stageAlign("viewer", true); setTimeout(() => stageAlign("viewer", true), 150); setTimeout(() => stageAlign("viewer", true), 600);   // once the fonts and the strip have settled
}
/* every AI request from the text opens on the stage; requests made inside the stage (revise a part, ask again) stay there */
aiRequest = async function (range, instr) {
  if (range && flowEl.contains(range.commonAncestorContainer) && !stageBody.contains(range.commonAncestorContainer)) return stageSendRange(range, instr);
  return aiRequestRaw.apply(this, arguments);
};
function stageShow() { stageEl.classList.remove("closed"); $(".work")?.classList.add("has-stage"); stageBtn(); if (stage && stage.folded) stageFold(true); placeBar(); stageAlign("viewer", true); }
function stageHide() { stageEl.classList.add("closed"); $(".work")?.classList.remove("has-stage"); if (stage) { const f = stage.folded; stageFold(false); stage.folded = f; } stageBtn(); placeBar(); }
/* the toolbar button: open or hide the stage, with a dot while one is waiting */
function stageBtn() {
  let b = $("#stageBtn"); const anchor = $("#aiPanelBtn"); if (!b && anchor) { b = EL("button", { class: "tb flow-only ai-btn", id: "stageBtn", title: "AI stage (Alt+S on a selection)", onclick: () => { if (!stage) return toast("Select text and press AI stage on the bar, or Alt+S."); stageEl.classList.contains("closed") ? stageShow() : stageHide(); } }, ICON("i-next"), EL("span", { class: "lbl" }, "Stage")); anchor.after(b); }
  if (!b) return; b.classList.toggle("on", !!stage && !stageEl.classList.contains("closed")); b.classList.toggle("waiting", !!stage && stageEl.classList.contains("closed"));
}
/* the two panes scroll together: the passage's block on the stage stays level with the original on the left */
let stageSyncing = false;
function stageAlign(from, force) {
  if (!stage || stageEl.classList.contains("closed") || stageSyncing) return;
  const L = flowEl.querySelector(`.rv-src[data-stage="${stage.id}"]`), R = stageBody.querySelector(".st-p"); if (!L || !R) return;
  // the same height on screen, so the eye moves straight across
  const lb = (L.closest(AI_BLOCK) || L).getBoundingClientRect(), rb = R.getBoundingClientRect();
  const d = rb.top - lb.top; if (Math.abs(d) < 1) return;
  stageSyncing = true;
  if (from === "stage") viewer.scrollTop -= d; else stageBody.scrollTop += d;
  // the stage could not move that far (it is at its top or bottom): on opening, the text pane gives way instead
  if (force) { let rem = R.getBoundingClientRect().top - (L.closest(AI_BLOCK) || L).getBoundingClientRect().top; if (Math.abs(rem) > 1) viewer.scrollTop += rem;
    // both panes already at their top and the stage's block still higher: push the stage's content down instead
    rem = R.getBoundingClientRect().top - (L.closest(AI_BLOCK) || L).getBoundingClientRect().top;
    if (rem < -1 && stageBody.scrollTop === 0) stageBody.style.paddingTop = (parseFloat(getComputedStyle(stageBody).paddingTop) - rem) + "px"; }
  requestAnimationFrame(() => { stageSyncing = false; });
}
viewer.addEventListener("scroll", () => stageAlign("viewer"), { passive: true });
stageBody.addEventListener("scroll", () => stageAlign("stage"), { passive: true });
addEventListener("resize", debounce(() => stageAlign("viewer"), 80));
/* either pane reflowing (panels folding, fonts arriving, the AI's answer) nudges the stage back level */
new ResizeObserver(debounce(() => stageAlign("viewer", true), 40)).observe(flowEl);
new ResizeObserver(debounce(() => stageAlign("viewer", true), 40)).observe(stageBody);
new ResizeObserver(debounce(() => stageAlign("viewer", true), 40)).observe(viewer);
/* fold: the Pages, Notes and chat panels go away so only the text and the stage are on screen; unfold brings
   back the ones that were open. The button in the stage's header switches between the two. */
function stageFold(on) {
  if (!stage) return; const L = $("#left"), R = $("#right"), C = $(".ai-panel");
  if (on && stageEl.classList.contains("closed")) { stage.folded = true; return; }
  if (on) { if (!stage.panels) stage.panels = { left: L && !L.classList.contains("closed"), right: R && !R.classList.contains("closed"), chat: C && !C.classList.contains("closed") };
    L?.classList.add("closed"); R?.classList.add("closed"); if (C && !C.classList.contains("closed")) aiTogglePanel(false); stage.folded = true; }
  else { const p = stage.panels || {}; if (p.left) L?.classList.remove("closed"); if (p.right) R?.classList.remove("closed"); if (p.chat) aiTogglePanel(true); stage.folded = false; stage.panels = null; }
  const b = $("#stFold"); if (b) { b.classList.toggle("on", !!stage.folded); b.title = stage.folded ? "Show the Pages, Notes and chat panels again" : "Fold the other panels away: only the text and the stage"; }
  placeBar(); stageAlign("viewer");
}
/* show changes / the changed version: the stage follows the switch too */
{ const am = aiMarkup; aiMarkup = function (on) { const r = am.apply(this, arguments); stageBody.classList.toggle("markup-off", !Prefs.get("aiMarkup", true)); return r; }; }
function stageStatus() {
  if (!stage) return; const busy = !!stageBody.querySelector(".busy"), open = $$(".ai-h", stageBody).length, back = $("#stBack"), st = $("#stStatus");
  if (!back) return;
  back.disabled = busy || open > 0;
  st.textContent = busy ? "The AI is working…" : open ? `${open} change${open === 1 ? "" : "s"} to review · Tab accepts, Esc rolls back · select part of a change to take just that and edit it` : stageBody.querySelector(".ai-chg") ? "" : "All decided. Send back puts this where the passage was.";
  stageBtn();
}
new MutationObserver(debounce(() => { stageStatus(); stageAlign("viewer"); }, 60)).observe(stageBody, { childList: true, subtree: true, attributes: true });
stageBody.addEventListener("click", e => { const c = e.target.closest(".ai-chg"); if (c && c.dataset.ai) { const h = e.target.closest(".ai-h"); if (h) aiSetHunk(h); else aiSetActive(c.dataset.ai); aiRenderChat(); } });
stageBody.addEventListener("scroll", () => requestAnimationFrame(placeBar), { passive: true });
/* the result, as clean html for the document: only the passage, not the greyed context */
function stageResultHtml() { const f = stageBody.querySelector(".st-focus"); if (!f) return ""; const c = f.cloneNode(true); $$(".ai-chg", c).forEach(x => x.replaceWith(...x.childNodes)); aiUnwrapOk(c); c.querySelectorAll("[contenteditable]").forEach(e => e.removeAttribute("contenteditable")); return c.innerHTML; }
async function stageBack() {
  if (!stage) return; stageShow(); if (stageBody.querySelector(".busy, .ai-h")) return toast("Decide every change first (Tab accepts, Esc rejects).");
  const src = flowEl.querySelector(`.rv-src[data-stage="${stage.id}"]`), html = stageResultHtml();
  if (!src) { await modal(`<h3>The passage is no longer in the document</h3><p>It was removed or undone while the stage was open. Copy the result below if you still want it.</p><div class="tr-peek">${html}</div><div class="mrow"><button class="btn" data-cancel>Close</button></div>`); return stageClose(false); }
  const now = toLight(src);
  if (now !== stage.srcLight) {   // edited by hand on the left: the author decides, nothing is overwritten
    const v = await modal(`<h3>You changed this passage yourself</h3><p class="muted">While the AI worked, the passage on the left was edited by hand, so the AI's version is not put in by itself.</p>
      <p><b>Yours now</b></p><div class="tr-peek">${src.innerHTML}</div><p><b>The AI's version</b></p><div class="tr-peek">${html}</div>
      <div class="mrow"><button class="btn" data-cancel>Keep mine</button><button class="btn" data-ok name="both" value="1">Keep both, the AI's after mine</button><button class="btn ai" data-ok name="ai" value="1">Use the AI's</button></div>`);
    if (!v) { stageClose(false); return toast("Kept your version. The AI's version is gone with the stage."); }
    if (v.both) { src.after(document.createTextNode(" "), lightOrHtml(html)); } else { src.innerHTML = ""; src.append(lightOrHtml(html)); }
  } else { src.innerHTML = ""; src.append(lightOrHtml(html)); }
  const kids = [...src.childNodes]; src.replaceWith(...kids); flowEl.normalize(); aiCommit();
  kids.filter(n => n.nodeType === 1).forEach(flashEl); stageClose(false); toast("Sent back: the passage now reads as the AI's version.");
}
function stageClose(keepMarks) {
  const src = stage && flowEl.querySelector(`.rv-src[data-stage="${stage.id}"]`); if (src) rvUnwrap(src);
  $$(".ai-chg[data-ai]", stageBody).forEach(x => { const ch = aiChange(x.dataset.ai); if (ch && ch.status === "pending") ch.status = "discarded"; });
  if (stage) stageFold(false);
  stageBody.innerHTML = ""; stageEl.classList.add("closed"); $(".work")?.classList.remove("has-stage"); stage = null; stageBtn();
  if (aiActive && !aiSpan(aiActive)) aiSetHunk(null); aiCommit(); aiRenderChat();
}
/* a stage left in a saved document is stale: the source marker goes, the marks stay */
{ const od = openDoc; openDoc = async function () { const r = await od.apply(this, arguments); $$(".rv-src", flowEl).forEach(rvUnwrap); stageBody.innerHTML = ""; stageEl.classList.add("closed"); $(".work")?.classList.remove("has-stage"); stage = null; stageBtn(); return r; }; }
{ const gh = goHome; goHome = function () { stageBody.innerHTML = ""; stageEl.classList.add("closed"); $(".work")?.classList.remove("has-stage"); stage = null; stageBtn(); return gh.apply(this, arguments); }; }

/* --- the ask box gets a "to the stage" button; the AI menu gets the marks --- */
{ const ao = aiAskOpen; aiAskOpen = function () { const r = ao.apply(this, arguments); if (!aiAskEl) return r;
    const ta = aiAskEl.querySelector("textarea"), row = aiAskEl.querySelector(".arow");
    if (row) row.insertBefore(EL("button", { class: "btn small", title: "Open the AI's version on a stage beside the text instead of in place (Alt+S)", onclick: () => stageSend(ta.value.trim()) }, "On the stage →"), row.lastChild);
    return r; }; }
/* demo mode honours the marks, so the stage can be tried without a key */
{ const dr = aiDemoRevise; aiDemoRevise = async function (ch, o) { const res = await dr.apply(this, arguments);
    const take = re => [...ch.instr.matchAll(re)].map(m => m[1]); let t = res.revision ?? res.text ?? "";
    for (const x of take(/^Remove: «(.+?)»$/gm)) t = t.replace(x, "").replace(/\s{2,}/g, " ").replace(/\s+([,.;:])/g, "$1");
    for (const x of take(/^Replace «(.+?)» with better wording$/gm)) { let y = x.replace(/\bvery\s+/gi, "").replace(/\bin order to\b/gi, "to").replace(/\ba large number of\b/gi, "many").replace(/\bdue to the fact that\b/gi, "because").replace(/\bis able to\b/gi, "can"); if (y === x) y = x.replace(/^(\w+)/, (m, w) => ({ big: "substantial", good: "effective", bad: "poor", shows: "demonstrates", got: "obtained", used: "employed", examined: "scrutinised" })[w.toLowerCase()] || w) ; if (y === x) y = "notably, " + x; t = t.replace(x, y); }
    if (res.revision != null) res.revision = t; else res.text = t; return res; }; }
{ const am = aiChatMenu; aiChatMenu = function (anchor) { const m0 = menu; menu = (items, ...rest) => { menu = m0; return m0([
    { head: "Revision marks → AI stage" },
    { label: "Cross out", k: "Alt+X", sub: "Tell the AI to remove these words", fn: () => rvMark("X") },
    { label: "Cross out for better wording", k: "Alt+W", sub: "Tell the AI to replace these words", fn: () => rvMark("W") },
    { label: "Comment, as a note to the AI", k: "Alt+C", sub: "The AI reads the comments in the passage you send", fn: () => flowComment() },
    { label: "Send the selection to the AI stage", k: "Alt+S", sub: "The AI's version beside the text; Send back when decided", fn: () => stageSend("") },
    { sep: true }, ...items], ...rest); }; try { return am.apply(this, arguments); } finally { menu = m0; } }; }

/* --- take part of the AI's version: select inside it on the stage, then
   Accept & edit: the selected words are yours now (editable at once), the rest of that change stays to review;
   Roll back: the changes the selection touches go back to your words;
   Redo with AI: those changes (joined into one) are written again, with an optional note. On text already
   decided, Redo asks the AI for a new version of just that selection. */
const stHunks = range => $$(".ai-h", stageBody).filter(h => !h.classList.contains("busy") && range.intersectsNode(h));
const stHasText = f => /\S/.test(f.textContent);
function stCaretAfter(node) {
  if (!node || !node.isConnected) return; const host = node.parentElement?.closest("[contenteditable=true]"); host?.focus({ preventScroll: true });
  const r = document.createRange(); r.setStartAfter(node); r.collapse(true); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
}
function stagePartAccept(range) {
  const hs = stHunks(range); if (!hs.length) return false;
  const spans = new Set(); let last = null;
  for (const h of hs) {
    const s = h.closest(".ai-chg"), ins = h.querySelector("ins"), del = h.querySelector("del"); spans.add(s);
    if (!ins) { h.remove(); s.dataset.acc = "1"; continue; }   // a sentence the AI dropped: taking the selection over it takes the removal
    const r = document.createRange(); r.selectNodeContents(ins);
    if (range.compareBoundaryPoints(Range.START_TO_START, r) > 0) r.setStart(range.startContainer, range.startOffset);
    if (range.compareBoundaryPoints(Range.END_TO_END, r) < 0) r.setEnd(range.endContainer, range.endOffset);
    if (r.collapsed || !stHasText(r.cloneContents())) continue;
    const piece = (a, b) => { const x = document.createRange(); x.setStart(...a); x.setEnd(...b); return x.cloneContents(); };
    const bef = piece([ins, 0], [r.startContainer, r.startOffset]), aft = piece([r.endContainer, r.endOffset], [ins, ins.childNodes.length]), mid = r.cloneContents();
    // once part of a sentence is taken, your sentence is replaced: rolling back the rest drops the AI's leftover
    // words instead of putting your whole sentence back beside the part you kept. It stays readable on hover.
    const was = (del ? del.textContent.trim() : "") || (h.title || "").replace(/^Your sentence: /, "");
    const keepB = stHasText(bef), keepA = stHasText(aft), mk = f => { const n = EL("span", { class: "ai-h part", title: was ? "Your sentence was: " + was : "Added by the AI" }); const i2 = EL("ins", { class: ins.className }); i2.append(f); n.append(i2); return n; };
    const ok = EL("span", { class: "ai-ok", contenteditable: "true", spellcheck: "true" });
    if (!keepB) ok.append(bef); ok.append(mid); if (!keepA) ok.append(aft);
    const nodes = []; if (keepB) nodes.push(mk(bef)); nodes.push(ok); if (keepA) nodes.push(mk(aft));
    h.replaceWith(...nodes); s.dataset.acc = "1"; last = ok.lastChild;
  }
  for (const s of spans) if (s.isConnected && !hunksIn(s).length) aiFinish(s, aiChange(s.dataset.ai));
  stageBody.querySelector(".st-focus")?.normalize(); aiCommit();
  const rest = allHunks().filter(h => stageBody.contains(h)); aiSetHunk(rest.find(h => last && last.isConnected && (last.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING)) || rest[0] || null); aiRenderChat();
  stCaretAfter(last); return true;
}
function stagePartReject(range) { const hs = stHunks(range); hs.forEach(h => h.isConnected && aiDecide(h, false)); return hs.length > 0; }
/* the changes a selection touches, with the unchanged words between them, joined into one change */
function stJoin(hs) {
  const s = hs[0].closest(".ai-chg"); hs = hs.filter(h => h.closest(".ai-chg") === s); if (hs.length === 1) return hs[0];
  const n = EL("span", { class: "ai-h" }), d = EL("del", { class: "ai-d ai-old" }), i = EL("ins", { class: "ai-i ai-new" }), first = hs[0], lastH = hs[hs.length - 1];
  let x = first; const gone = [];
  while (x) { gone.push(x);
    if (x.nodeType === 1 && x.classList.contains("ai-h")) { const xd = x.querySelector("del"), xi = x.querySelector("ins"); if (xd) d.append(...xd.cloneNode(true).childNodes); if (xi) i.append(...xi.cloneNode(true).childNodes); }
    else if (x.nodeType === 1 && x.classList.contains("ai-ok")) { d.append(...x.cloneNode(true).childNodes); i.append(...x.cloneNode(true).childNodes); }
    else { d.append(x.cloneNode(true)); i.append(x.cloneNode(true)); }
    if (x === lastH) break; x = x.nextSibling; }
  if (d.textContent) n.append(d); if (i.textContent) n.append(i);
  first.before(n); gone.forEach(g => g.remove()); return n;
}
function stagePartRedo(range, extra) {
  const hs = stHunks(range);
  if (hs.length) { const h = stJoin(hs); aiSetHunk(h); return aiReviseHunk(h, extra); }
  return aiRequestRaw(range, extra || "Write this part differently; keep the meaning, the facts and the citations.");
}
function stageSelPop() {
  closeSelPop(); $$(".st-pop").forEach(x => x.remove()); if (!stage) return; const sel = getSelection(); if (!sel || sel.isCollapsed || !sel.rangeCount) return;
  const range = sel.getRangeAt(0), focus = stageBody.querySelector(".st-focus"); if (!focus || !focus.contains(range.commonAncestorContainer) && !range.intersectsNode(focus)) return;
  const r = range.getBoundingClientRect(); if (!r.width) return;
  const keep = range.cloneRange(), hs = stHunks(keep), p = EL("div", { class: "imgtools selpop selpro st-pop", role: "toolbar", "aria-label": "Part of the AI's version" });
  const B = (icon, lbl, fn, title, cls = "") => p.append(EL("button", { type: "button", class: cls, title, "aria-label": title, onclick: e => { e.preventDefault(); fn(); }, onpointerdown: e => e.preventDefault() }, icon === "tick" ? lightOrHtml('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>') : ICON(icon), EL("span", { class: "lbl" }, lbl)));
  // the note box survives the selection going away (focus moves into it); it closes itself
  const redoBox = () => { p.classList.remove("selpop"); p.innerHTML = ""; const inp = EL("input", { type: "text", placeholder: "What should change? (optional) Enter sends", "aria-label": "Instructions for the AI" });
    const shut = () => p.remove(), go = () => { const x = inp.value.trim(); shut(); stagePartRedo(keep, x); };
    inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); go(); } else if (e.key === "Escape") { e.preventDefault(); shut(); } e.stopPropagation(); });
    p.addEventListener("focusout", () => setTimeout(() => { if (!p.contains(document.activeElement)) shut(); }, 150));
    p.append(ICON("i-ai"), inp, EL("button", { type: "button", class: "ai stage", onclick: e => { e.preventDefault(); go(); } }, EL("span", { class: "lbl" }, "Redo"))); inp.focus(); };
  if (hs.length) {
    B("tick", "Accept & edit", () => { closeSelPop(); stagePartAccept(keep); }, "Take the selected words; you can edit them straight away. The rest of the change stays to review (Tab)", "ok");
    B("i-undo", "Roll back", () => { closeSelPop(); stagePartReject(keep); }, "Put your own words back for the changes the selection touches (Esc)", "rvx");
    p.append(EL("span", { class: "sp-sep", "aria-hidden": "true" }));
  }
  B("i-ai", "Redo with AI", redoBox, hs.length ? "Ask the AI to write the selected change(s) again, optionally saying what is wrong (Alt+A)" : "Ask the AI for a new version of just these words (Alt+A)", "ai");
  document.body.append(p);
  const w = p.offsetWidth, h = p.offsetHeight, x = clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8), y = r.top - h - 10 > 56 ? r.top - h - 10 : r.bottom + 10;
  p.style.cssText = `position:fixed;left:${x}px;top:${y}px`; p._range = keep; p._redo = redoBox; p._hunks = hs.length;
}
stageBody.addEventListener("mouseup", () => setTimeout(stageSelPop, 10));
stageBody.addEventListener("keyup", e => { if (e.shiftKey && /^(Arrow|Home|End)/.test(e.key)) stageSelPop(); });
stageBody.addEventListener("mousedown", () => { closeSelPop(); $$(".st-pop").forEach(x => x.remove()); });
stageBody.addEventListener("input", () => { closeSelPop(); stageStatus(); });
/* the passage on the stage is one editing area: no locked islands inside it (a drag that starts on a locked
   island selects nothing once the passage has the focus). Changes still under review are guarded instead:
   typing into one, or deleting across one, is stopped with a hint. Everything else, the accepted words
   included, edits freely. */
const stUnlock = () => $$(".st-focus [contenteditable]", stageBody).forEach(e => e.removeAttribute("contenteditable"));
new MutationObserver(stUnlock).observe(stageBody, { childList: true, subtree: true, attributes: true, attributeFilter: ["contenteditable"] });
let stHintAt = 0;
stageBody.addEventListener("beforeinput", e => {
  const f = stageBody.querySelector(".st-focus"); if (!f || !f.contains(e.target === f ? f : e.target)) return;
  const pend = $$(".ai-h, .ai-chg.busy", f); if (!pend.length) return;
  const rs = e.getTargetRanges ? e.getTargetRanges() : []; const ranges = rs.length ? rs : (getSelection().rangeCount ? [getSelection().getRangeAt(0)] : []);
  const hit = ranges.some(sr => { const r = document.createRange(); try { r.setStart(sr.startContainer, sr.startOffset); r.setEnd(sr.endContainer, sr.endOffset); } catch (x) { return false; }
    if (r.collapsed) return !!elOf(r.startContainer)?.closest(".ai-h, .ai-chg.busy");
    return pend.some(h => r.intersectsNode(h)); });
  if (!hit) return;
  e.preventDefault();
  if (Date.now() - stHintAt > 2500) { stHintAt = Date.now(); toast("That part is still a suggestion: Tab or Accept & edit takes it, then you can change it."); }
});
/* keys on the stage, before the in-place review keys: with the bar up, Tab takes the selection, Esc rolls it
   back, Alt+A redoes it. While you type in accepted words, Tab moves on to the next change and Esc stops editing. */
addEventListener("keydown", e => {
  if (!stage || !$("#modalBack").hidden || e.ctrlKey || e.metaKey) return;
  const p = $(".st-pop"); if (p && e.target.closest?.(".st-pop")) return;
  if (p && p._range) {
    if (e.key === "Tab" && !e.altKey && !e.shiftKey && p._hunks) { e.preventDefault(); e.stopPropagation(); closeSelPop(); stagePartAccept(p._range); return; }
    if (e.key === "Escape" && !e.altKey && p._hunks) { e.preventDefault(); e.stopPropagation(); closeSelPop(); stagePartReject(p._range); return; }
    if (e.altKey && !e.shiftKey && e.code === "KeyA") { e.preventDefault(); e.stopPropagation(); p._redo(); return; }
  }
  if (!stageBody.contains(e.target) || e.altKey || e.shiftKey) return;
  if (e.key !== "Tab" && e.key !== "Escape") return;
  const editing = getSelection().anchorNode && elOf(getSelection().anchorNode)?.closest?.(".ai-ok");
  const next = () => { const rest = allHunks().filter(h => stageBody.contains(h)); return rest.find(h => !aiHunk || h === aiHunk) || rest[0] || null; };
  e.preventDefault(); e.stopPropagation();
  if (editing || !aiHunk || !aiHunk.isConnected) { e.target.blur?.(); getSelection().removeAllRanges(); if (e.key === "Tab") { const h = next(); if (h) { aiSetHunk(h); h.scrollIntoView({ block: "nearest" }); } } return; }
  aiDecide(aiHunk, e.key === "Tab");
}, true);

/* keys (before the Word layer): Alt+X / W / C mark, Alt+S sends, Alt+Enter sends back */
document.addEventListener("keydown", e => {
  if (!S.doc || S.doc.kind !== "flow" || S.webview || !e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  if (e.target.closest("input,textarea,select") || !$("#modalBack").hidden) return;
  const k = e.code;
  if (k === "KeyX") { e.preventDefault(); e.stopPropagation(); rvMark("X"); }
  else if (k === "KeyW") { e.preventDefault(); e.stopPropagation(); rvMark("W"); }
  else if (k === "KeyC") { e.preventDefault(); e.stopPropagation(); flowComment(); }
  else if (k === "KeyS") { e.preventDefault(); e.stopPropagation(); stageSend(""); }
  else if (e.key === "Enter" && stage) { e.preventDefault(); e.stopPropagation(); stageBack(); }
}, true);
Object.assign(window, { aiChange, aiPaint, aiSetActive, stagePartAccept, stagePartReject, stagePartRedo, stageSelPop, aiSentenceHunks, rvMark, stageSend, stageBack, stageClose, stageHide, stageShow, stageAlign, showSelPop, closeSelPop, get stage() { return stage; } });
setTimeout(stageBtn, 0);   // for the tests and the console
