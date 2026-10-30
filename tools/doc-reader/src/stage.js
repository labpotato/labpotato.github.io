/* ---------- v8: revision marks and the AI stage ----------
   Mark the text up in place: cross out (Alt+X, "remove this"), cross out for better wording (Alt+W,
   "replace this"), or a note to the AI (Alt+C). Select the passage and send it to the stage (Alt+S): a second
   pane on the right where the AI's version shows as tracked changes with the review strip, while the original
   stays untouched on the left. When every change is decided, Send back puts the result where the passage was.
   If the passage on the left was edited by hand in the meantime, both versions are shown and the author
   chooses; the AI's version never overwrites hand edits on its own. */
const RV = { X: ["rv-x", "Remove"], W: ["rv-w", "Replace with better wording"], C: ["rv-c", "Note to the AI"] };
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
  if (kind === "C") { const v = await modal(`<h3>Note to the AI</h3><p class="muted">About: <i>${esc(r.toString().trim().slice(0, 160))}</i></p><textarea name="note" rows="3" placeholder="What should change here? e.g. make this the topic sentence, cite the control experiment, too strong a claim"></textarea><div class="mrow"><button class="btn" data-cancel>Cancel</button><button class="btn ai" data-ok>Add note</button></div>`); if (!v || !v.note?.trim()) return; note = v.note.trim(); }
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
  return $$(".rv", root).map(m => { const t = m.textContent.replace(/\s+/g, " ").trim(); if (!t) return "";
    return m.classList.contains("rv-x") ? `Remove: «${t}»` : m.classList.contains("rv-w") ? `Replace «${t}» with better wording` : `About «${t}»: ${m.dataset.note || "see the note"}`; }).filter(Boolean);
}

/* --- the stage --- */
function stageDraw() {
  stageEl.innerHTML = "";
  stageEl.append(EL("div", { class: "st-head" }, ICON("i-ai"), EL("b", {}, "AI stage"), EL("span", { class: "muted st-n" }), EL("span", { style: "flex:1" }),
    EL("button", { class: "tb", id: "stFold", title: "Fold the other panels away", onclick: () => stageFold(!stage?.folded) }, "⇔"),
    EL("button", { class: "tb", title: "Close the stage (the original on the left stays as it is)", onclick: () => stageClose(true) }, ICON("i-x"))));
  stageEl.append(EL("div", { class: "st-instr", id: "stInstr" }));
  stageEl.append(stageBody);
  stageEl.append(EL("div", { class: "st-foot" }, EL("span", { class: "st-status", id: "stStatus" }), EL("span", { style: "flex:1" }),
    EL("button", { class: "btn small", onclick: () => stageClose(true), title: "Close the stage and keep the original" }, "Discard"),
    EL("button", { class: "btn small ai", id: "stBack", disabled: "", onclick: stageBack, title: "Put the result where the passage was (Alt+Enter)" }, "← Send back")));
}
async function stageSend(extra) {
  if (!S.doc || S.doc.kind !== "flow" || S.webview) return toast("The AI stage works in the Editor view of a written document.");
  if (stage && stageBody.isConnected && flowEl.querySelector(`.rv-src[data-stage="${stage.id}"]`)) return toast("Finish the open stage first: Send back or Discard.");
  const t = aiTarget(); if (t.err) return toast(t.err);
  closeSelPop(); aiAskClose();
  $$(".rv-src", flowEl).forEach(rvUnwrap);
  const id = uid(), range = t.range, src = EL("span", { class: "rv-src", "data-stage": id, title: "On the AI stage. Edit it here if you like: your edits win over the AI's version." });
  src.append(range.extractContents()); range.insertNode(src); getSelection().removeAllRanges(); flowEl.normalize();
  const srcLight = toLight(src), marks = rvInstructions(src);
  const instr = [extra && extra.trim(), ...marks].filter(Boolean).join("\n") || "Improve the wording and the logical flow; keep the meaning, the facts and the citations.";
  stage = { id, srcLight, instr, block: (src.closest(AI_BLOCK) || src.parentElement).tagName.toLowerCase() };
  stageDraw(); $(".st-n", stageEl).textContent = marks.length ? `${marks.length} mark${marks.length === 1 ? "" : "s"}` : "";
  $("#stInstr").innerHTML = instr.split("\n").map(l => `<div>${esc(l)}</div>`).join("");
  const tag = /^(p|li|h[1-6]|blockquote|td|th|figcaption|pre|dd|dt|caption)$/.test(stage.block) ? stage.block : "p";
  stageBody.innerHTML = `<${tag} class="st-p"></${tag}>`; const p = stageBody.firstElementChild; p.append(lightFrag(srcLight));
  stageEl.classList.remove("closed"); $(".work")?.classList.add("has-stage"); aiCommit();
  Prefs.set("aiPanelSeen", 1); stageFold(true);   // only the text and the stage: the other panels fold away until the stage closes
  const r = document.createRange(); r.selectNodeContents(p);
  await aiRequest(r, instr);
  stageStatus();
}
/* fold: the Pages, Notes and chat panels go away so only the text and the stage are on screen; unfold brings
   back the ones that were open. The button in the stage's header switches between the two. */
function stageFold(on) {
  if (!stage) return; const L = $("#left"), R = $("#right"), C = $(".ai-panel");
  if (on) { stage.panels = { left: L && !L.classList.contains("closed"), right: R && !R.classList.contains("closed"), chat: C && !C.classList.contains("closed") };
    L?.classList.add("closed"); R?.classList.add("closed"); if (stage.panels.chat) aiTogglePanel(false); stage.folded = true; }
  else { const p = stage.panels || {}; if (p.left) L?.classList.remove("closed"); if (p.right) R?.classList.remove("closed"); if (p.chat) aiTogglePanel(true); stage.folded = false; }
  const b = $("#stFold"); if (b) { b.classList.toggle("on", !!stage.folded); b.title = stage.folded ? "Show the Pages, Notes and chat panels again" : "Fold the other panels away: only the text and the stage"; }
  placeBar();
}
function stageStatus() {
  if (!stage) return; const busy = !!stageBody.querySelector(".busy"), open = $$(".ai-h", stageBody).length, back = $("#stBack"), st = $("#stStatus");
  if (!back) return;
  back.disabled = busy || open > 0;
  st.textContent = busy ? "The AI is working…" : open ? `${open} change${open === 1 ? "" : "s"} to review · Tab accepts, Esc rejects, ✎ asks for more` : stageBody.querySelector(".ai-chg") ? "" : "All decided. Send back puts this where the passage was.";
}
new MutationObserver(debounce(stageStatus, 60)).observe(stageBody, { childList: true, subtree: true, attributes: true });
stageBody.addEventListener("click", e => { const c = e.target.closest(".ai-chg"); if (c && c.dataset.ai) { const h = e.target.closest(".ai-h"); if (h) aiSetHunk(h); else aiSetActive(c.dataset.ai); aiRenderChat(); } });
stageBody.addEventListener("scroll", () => requestAnimationFrame(placeBar), { passive: true });
/* the result, as clean html for the document */
function stageResultHtml() { const c = stageBody.firstElementChild.cloneNode(true); $$(".ai-chg", c).forEach(s => s.replaceWith(...s.childNodes)); return c.innerHTML; }
async function stageBack() {
  if (!stage) return; if (stageBody.querySelector(".busy, .ai-h")) return toast("Decide every change first (Tab accepts, Esc rejects).");
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
  $$(".ai-chg[data-ai]", stageBody).forEach(s => { const ch = aiChange(s.dataset.ai); if (ch && ch.status === "pending") ch.status = "discarded"; });
  if (stage) stageFold(false);
  stageBody.innerHTML = ""; stageEl.classList.add("closed"); $(".work")?.classList.remove("has-stage"); stage = null;
  if (aiActive && !aiSpan(aiActive)) aiSetHunk(null); aiCommit(); aiRenderChat();
}
/* a stage left in a saved document is stale: the source marker goes, the marks stay */
{ const od = openDoc; openDoc = async function () { const r = await od.apply(this, arguments); $$(".rv-src", flowEl).forEach(rvUnwrap); stageBody.innerHTML = ""; stageEl.classList.add("closed"); stage = null; return r; }; }
{ const gh = goHome; goHome = function () { stageBody.innerHTML = ""; stageEl.classList.add("closed"); stage = null; return gh.apply(this, arguments); }; }

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
    { label: "Note to the AI…", k: "Alt+C", sub: "An instruction about these words", fn: () => rvMark("C") },
    { label: "Send the selection to the AI stage", k: "Alt+S", sub: "The AI's version beside the text; Send back when decided", fn: () => stageSend("") },
    { sep: true }, ...items], ...rest); }; try { return am.apply(this, arguments); } finally { menu = m0; } }; }

/* keys (before the Word layer): Alt+X / W / C mark, Alt+S sends, Alt+Enter sends back */
document.addEventListener("keydown", e => {
  if (!S.doc || S.doc.kind !== "flow" || S.webview || !e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  if (e.target.closest("input,textarea,select") || !$("#modalBack").hidden) return;
  const k = e.code;
  if (k === "KeyX") { e.preventDefault(); e.stopPropagation(); rvMark("X"); }
  else if (k === "KeyW") { e.preventDefault(); e.stopPropagation(); rvMark("W"); }
  else if (k === "KeyC") { e.preventDefault(); e.stopPropagation(); rvMark("C"); }
  else if (k === "KeyS") { e.preventDefault(); e.stopPropagation(); stageSend(""); }
  else if (e.key === "Enter" && stage) { e.preventDefault(); e.stopPropagation(); stageBack(); }
}, true);
Object.assign(window, { rvMark, stageSend, stageBack, stageClose, get stage() { return stage; } });   // for the tests and the console
