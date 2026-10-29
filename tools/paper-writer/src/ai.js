/* ---------- Paper Writer demo: ask an AI about a selection, get the answer back as tracked changes ----------
   Runs inside Doc Reader's scope (inserted by build.py), so it uses S, flowEl, $, EL, modal, menu, toast...
   One chat per document lives in S.doc.ai: the thread sent to the AI (append-only), the changes it proposed,
   and the log shown in the chat panel. A change in the text is <span class="ai-chg" data-ai="id">; its
   original HTML and every suggestion are kept in S.doc.ai.changes[id], so undo, reload and reject all work. */

const AI_PROVIDERS = {
  demo: { label: "Demo", sub: "No key, no AI: canned edits made in the browser, to try the tools" },
  claude: { label: "Claude", sub: "Anthropic API, your own key", models: ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5", "claude-fable-5-1"], def: "claude-opus-5-5" },
  openai: { label: "OpenAI", sub: "OpenAI API, your own key", base: "https://api.openai.com/v1" },
  gemini: { label: "Gemini", sub: "Google AI Studio key (OpenAI-compatible endpoint)", base: "https://generativelanguage.googleapis.com/v1beta/openai" },
  custom: { label: "Other", sub: "Any OpenAI-compatible server: OpenRouter, Ollama, LM Studio…" }
};
const AI_FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-fable-5-1", "claude-sonnet-5-5"]);   // server-side refusal fallbacks
const AI_PRESETS = ["Better logical flow", "Make it more concise", "More formal academic tone", "Fix grammar and spelling", "Clarify the meaning", "Add appropriate hedging", "Strengthen the argument", "Simplify for a broad audience"];
const AI_SYSTEM = `You are a meticulous academic editor working with the author of a scientific manuscript, inside their editor. During this conversation you receive the manuscript (sent once, and again when it has changed a lot) and requests about passages the author has selected, each with the paragraph around it.

For a request about a selected passage:
- Rewrite only the selected passage. The paragraph is context: your text replaces the selection in place, so it must join the text before and after it (capitalisation, spacing and punctuation at both ends).
- Follow the instruction. Keep the scientific meaning, data, numbers, units, statistics, citations and reference markers, gene, protein and species nomenclature, and abbreviations defined elsewhere in the manuscript. Do not invent findings or references.
- Keep the author's voice, spelling variant (British or American) and terminology, consistent with the rest of the manuscript.
- The passage may contain the inline tags <i>, <b>, <sup>, <sub> and <code>. Keep them where they belong; use no other markup and no Markdown.
- Reply in exactly this form:
<revision>the new passage</revision>
<note>one short sentence on what you changed and why</note>
- If the passage is best left as it is, return it unchanged and say why in the note.

For a message marked QUESTION, answer briefly in plain prose, with reference to the manuscript, and do not use the revision form.`;

/* ---- settings and keys ---- */
const AIKeys = { mem: {} };
function aiCfg() { const c = Prefs.get("ai", {}); return { provider: c.provider || "demo", models: c.models || {}, base: c.base || "", effort: c.effort || "", remember: !!c.remember, presets: c.presets?.length ? c.presets : AI_PRESETS }; }
function aiSetCfg(c) { Prefs.set("ai", c); }
function aiModel(c = aiCfg()) { return c.models[c.provider] || AI_PROVIDERS[c.provider]?.def || ""; }
function aiBase(c = aiCfg()) { return (c.provider === "custom" ? c.base : AI_PROVIDERS[c.provider]?.base || "").replace(/\/+$/, ""); }
function aiKey(p) {
  if (AIKeys.mem[p]) return AIKeys.mem[p];
  try { const k = sessionStorage.getItem("lpw-key-" + p); if (k) return (AIKeys.mem[p] = k); } catch (e) { /* storage blocked */ }
  return (Prefs.get("aiKeys", {}) || {})[p] || "";
}
function aiSetKey(p, k, remember) {
  AIKeys.mem[p] = k;
  try { if (k) sessionStorage.setItem("lpw-key-" + p, k); else sessionStorage.removeItem("lpw-key-" + p); } catch (e) { /* storage blocked */ }
  const all = { ...(Prefs.get("aiKeys", {}) || {}) }; if (remember && k) all[p] = k; else delete all[p]; Prefs.set("aiKeys", all);
}
function aiWho(c = aiCfg()) { return c.provider === "demo" ? "Demo mode (no AI)" : AI_PROVIDERS[c.provider].label + (aiModel(c) ? " · " + aiModel(c) : ""); }

/* ---- the chat of the open document ---- */
function aiState() {
  const d = S.doc; if (!d) return null;
  if (!d.ai) d.ai = { thread: [], changes: {}, log: [], n: 0, paper: null, feedback: [], usage: { in: 0, out: 0, cacheRead: 0, cacheWrite: 0, calls: 0 } };
  return d.ai;
}
const aiChange = id => aiState()?.changes[id];
const aiSpan = id => flowEl.querySelector(`.ai-chg[data-ai="${id}"]`);
let aiActive = null;   // id of the change the review bar is for

/* ---- light HTML: text with only i, b, sup, sub, code (what the AI sees and returns) ---- */
const AI_STY = { I: "i", EM: "i", B: "b", STRONG: "b", SUP: "sup", SUB: "sub", CODE: "code" };
function toLight(node) {
  let s = "";
  for (const n of node.childNodes) {
    if (n.nodeType === 3) s += esc(n.data);
    else if (n.nodeType === 1) {
      if (n.tagName === "BR") { s += " "; continue; }
      if (n.matches("del.ai-d,.ai-old")) continue;
      const t = AI_STY[n.tagName]; const inner = toLight(n); s += t ? `<${t}>${inner}</${t}>` : inner;
    }
  }
  return s;
}
function lightFrag(light) { const t = document.createElement("template"); t.innerHTML = light; return t.content; }
function lightText(light) { return lightFrag(light).textContent; }
function cleanLight(s) {
  const clean = DOMPurify.sanitize(s, { ALLOWED_TAGS: ["i", "b", "em", "strong", "sup", "sub", "code"], ALLOWED_ATTR: [] });
  const d = document.createElement("div"); d.innerHTML = clean; return toLight(d);
}
const AI_TOK = /\s+|[\p{L}\p{N}]+(?:['’‐-][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu;
function lightTokens(light) {
  const out = [];
  (function walk(node, sty) {
    for (const n of node.childNodes) {
      if (n.nodeType === 3) { for (const m of n.data.matchAll(AI_TOK)) out.push({ t: m[0], s: sty }); }
      else if (n.nodeType === 1) { const t = AI_STY[n.tagName]; walk(n, t ? [...new Set([...sty.split(",").filter(Boolean), t])].sort().join(",") : sty); }
    }
  })(lightFrag(light), "");
  return out;
}
function renderTokens(toks) {
  let h = "", i = 0;
  while (i < toks.length) {
    let j = i, txt = ""; while (j < toks.length && toks[j].s === toks[i].s) txt += toks[j++].t;
    let piece = esc(txt); for (const t of toks[i].s.split(",").filter(Boolean).reverse()) piece = `<${t}>${piece}</${t}>`;
    h += piece; i = j;
  }
  return h;
}

/* ---- word diff (longest common subsequence), Word-style hunks ---- */
const isWs = t => /^\s+$/.test(t.t);
function aiDiff(oldL, newL) {
  const a = lightTokens(oldL), b = lightTokens(newL), key = t => t.t + "\u0001" + t.s;
  let p = 0; while (p < a.length && p < b.length && key(a[p]) === key(b[p])) p++;
  let sa = a.length, sb = b.length; while (sa > p && sb > p && key(a[sa - 1]) === key(b[sb - 1])) { sa--; sb--; }
  const A = a.slice(p, sa), B = b.slice(p, sb), n = A.length, m = B.length;
  const ops = a.slice(0, p).map(t => ({ op: "=", t }));
  if (n * m > 4e6) { A.forEach(t => ops.push({ op: "-", t })); B.forEach(t => ops.push({ op: "+", t })); }
  else {
    const W = m + 1, L = new Uint16Array((n + 1) * W);
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i * W + j] = key(A[i]) === key(B[j]) ? L[(i + 1) * W + j + 1] + 1 : Math.max(L[(i + 1) * W + j], L[i * W + j + 1]);
    let i = 0, j = 0;
    while (i < n && j < m) { if (key(A[i]) === key(B[j])) { ops.push({ op: "=", t: B[j] }); i++; j++; } else if (L[(i + 1) * W + j] >= L[i * W + j + 1]) ops.push({ op: "-", t: A[i++] }); else ops.push({ op: "+", t: B[j++] }); }
    while (i < n) ops.push({ op: "-", t: A[i++] }); while (j < m) ops.push({ op: "+", t: B[j++] });
  }
  a.slice(sa).forEach(t => ops.push({ op: "=", t }));
  // a space or one short word left between two edits joins them, so the result reads as one change
  for (let k = 1; k < ops.length - 1; k++) {
    if (ops[k].op !== "=" || ops[k - 1].op === "=") continue;
    let e = k; while (e < ops.length && ops[e].op === "=") e++;
    if (e >= ops.length) break;
    const run = ops.slice(k, e), words = run.filter(o => !isWs(o.t));
    if (words.length <= 1 && words.every(o => o.t.t.length <= 3)) { ops.splice(k, e - k, ...run.flatMap(o => [{ op: "-", t: o.t }, { op: "+", t: o.t }])); k += run.length * 2 - 1; }
  }
  // runs: equal text, or a hunk with its deletions first, then its insertions
  const runs = []; let cur = null;
  for (const o of ops) { const kind = o.op === "=" ? "=" : "x"; if (!cur || cur.kind !== kind) runs.push(cur = { kind, eq: [], del: [], ins: [] }); (o.op === "=" ? cur.eq : o.op === "-" ? cur.del : cur.ins).push(o.t); }
  const chars = ts => ts.filter(t => !isWs(t)).reduce((s, t) => s + t.t.length, 0);
  const eq = runs.filter(r => r.kind === "=").reduce((s, r) => s + chars(r.eq), 0);
  const sim = eq / Math.max(1, chars(a), chars(b)), hunks = runs.filter(r => r.kind === "x").length, words = a.filter(t => /[\p{L}\p{N}]/u.test(t.t)).length;
  const html = runs.map(r => r.kind === "=" ? renderTokens(r.eq) : (r.del.length ? `<del class="ai-d">${renderTokens(r.del)}</del>` : "") + (r.ins.length ? `<ins class="ai-i">${renderTokens(r.ins)}</ins>` : "")).join("");
  return { html, sim, hunks, same: hunks === 0, big: sim < 0.5 || (hunks >= 4 && hunks / Math.max(1, words) > 0.3), oldHtml: renderTokens(a), newHtml: renderTokens(b) };
}

/* ---- the selection → a target inside one paragraph ---- */
const AI_BLOCK = "p,li,td,th,h1,h2,h3,h4,h5,h6,blockquote,figcaption,pre,dd,dt,caption";
const elOf = n => n && (n.nodeType === 1 ? n : n.parentElement);
function aiTarget() {
  const sel = getSelection(); if (!sel || sel.isCollapsed || !sel.rangeCount) return { err: "Select the words you want help with first." };
  const range = sel.getRangeAt(0).cloneRange(); if (!flowEl.contains(range.commonAncestorContainer)) return { err: "Select text in the document first." };
  const sb = elOf(range.startContainer).closest(AI_BLOCK) || elOf(range.startContainer).closest("#flow > *");
  // a triple-click selection ends at the start of the next paragraph: keep it to the first
  if (sb && range.endOffset === 0 && !sb.contains(range.endContainer)) range.setEnd(sb, sb.childNodes.length);
  const eb = elOf(range.endContainer).closest(AI_BLOCK) || elOf(range.endContainer).closest("#flow > *");
  if (!sb || sb !== eb) return { err: "Select text inside one paragraph (for a longer part, one paragraph at a time)." };
  if (elOf(range.commonAncestorContainer).closest(".ai-chg") || range.cloneContents().querySelector?.(".ai-chg")) return { err: "That text already has an AI suggestion: accept or reject it first." };
  const text = range.toString(); if (!text.trim()) return { err: "Select some words first." };
  if (text.length > 8000) return { err: "That selection is long: select one paragraph at a time." };
  return { range, block: sb, text };
}
function aiSection(block) {
  let n = block; while (n && n.parentElement !== flowEl) n = n.parentElement;
  for (let p = n; p; p = p.previousElementSibling) if (/^H[1-4]$/.test(p.tagName)) return p.textContent.trim();
  return "";
}
function aiParagraph(span) {
  const block = span.closest(AI_BLOCK) || span.parentElement, c = block.cloneNode(true);
  for (const s of c.querySelectorAll(".ai-chg")) {
    const mine = s.dataset.ai === span.dataset.ai, ch = aiChange(s.dataset.ai);
    s.replaceWith(document.createTextNode(mine ? "⟦" + lightText(ch.oldLight) + "⟧" : (ch ? lightText(ch.oldLight) : s.textContent)));
  }
  return c.textContent.replace(/\s+/g, " ").trim();
}

/* ---- the request box ---- */
let aiAskEl = null, aiAskRange = null;
function aiSelHighlight(range) { try { if (range) CSS.highlights.set("ai-sel", new Highlight(range)); else CSS.highlights.delete("ai-sel"); } catch (e) { /* no highlight API */ } }
function aiAskClose() { if (aiAskEl) { aiAskEl.remove(); aiAskEl = null; } aiSelHighlight(null); aiAskRange = null; }
function aiAskOpen() {
  if (!S.doc) return;
  if (S.doc.kind !== "flow") return toast("The AI edits documents: use “Edit as document” to turn this PDF into one first.");
  if (S.webview) return toast("Switch to the Editor view to use the AI.");
  const t = aiTarget(); if (t.err) return toast(t.err);
  closeSelPop(); aiAskClose(); aiAskRange = t.range; aiSelHighlight(t.range);
  const c = aiCfg(), box = EL("div", { class: "ai-ask", role: "dialog", "aria-label": "Ask AI" });
  box.append(EL("div", { class: "ah" }, ICON("i-ai"), EL("b", {}, "Ask AI"), EL("span", { class: "sp" }), EL("button", { class: "who", title: "AI settings", onclick: () => { aiAskClose(); aiSettings(); } }, aiWho(c))));
  box.append(EL("div", { class: "quote" }, t.text.length > 220 ? t.text.slice(0, 220) + "…" : t.text));
  const chips = EL("div", { class: "ai-chips" }); c.presets.forEach(p => chips.append(EL("button", { type: "button", onclick: () => go(p) }, p))); box.append(chips);
  const ta = EL("textarea", { placeholder: "Or tell the AI what to do… (Enter sends, Shift+Enter new line)", rows: 2 }); box.append(ta);
  box.append(EL("div", { class: "arow" }, EL("span", { class: "hint" }, "Sends this paragraph with the request; the AI keeps the whole paper from this document's chat."), EL("button", { class: "btn small ai", onclick: () => go(ta.value.trim()) }, "Send")));
  function go(instr) { if (!instr) { ta.focus(); return toast("Pick a request or type one."); } const r = aiAskRange; aiAskClose(); aiRequest(r, instr); }
  ta.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); go(ta.value.trim()); } if (e.key === "Escape") { aiAskClose(); flowEl.focus(); } });
  box.addEventListener("keydown", e => { if (e.key === "Escape") { e.stopPropagation(); aiAskClose(); } });
  document.body.append(box); aiAskEl = box;
  const r = t.range.getBoundingClientRect(), h = box.offsetHeight, w = box.offsetWidth;
  let x = clamp(r.left, 8, innerWidth - w - 8), y = r.bottom + 8; if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 8);
  box.style.left = x + "px"; box.style.top = y + "px";
  setTimeout(() => ta.focus(), 20);
}
document.addEventListener("pointerdown", e => { if (aiAskEl && !e.target.closest(".ai-ask")) aiAskClose(); }, true);

/* ---- a request: put the selection in a busy span, ask, show the answer as a change ---- */
async function aiRequest(range, instr) {
  const ai = aiState(); if (!range || !flowEl.contains(range.commonAncestorContainer)) return toast("The selection changed; select the text again.");
  const id = uid(), frag = range.extractContents(), hold = EL("div"); hold.append(frag.cloneNode(true));
  const span = EL("span", { class: "ai-chg busy", "data-ai": id, contenteditable: "false" }); span.append(frag); range.insertNode(span);
  const ch = ai.changes[id] = { id, n: ++ai.n, at: Date.now(), instr, oldHtml: hold.innerHTML, oldLight: toLight(hold), sugg: [], cur: -1, status: "busy", via: aiCfg().provider };
  getSelection().removeAllRanges();
  ai.log.push({ t: "req", id, at: ch.at });
  aiRenderChat();
  try { await aiAsk(ch, {}); }
  catch (e) { console.warn(e); const s = aiSpan(id); if (s) { s.replaceWith(lightOrHtml(ch.oldHtml)); flowEl.normalize(); } ch.status = "failed"; ch.error = String(e.message || e); aiRenderChat(); toast("AI request failed: " + ch.error); }
}
const lightOrHtml = html => { const t = document.createElement("template"); t.innerHTML = html; return t.content; };
async function aiAgain(id, extra) {
  const ch = aiChange(id), s = aiSpan(id); if (!ch || !s || s.classList.contains("busy")) return;
  s.classList.add("busy"); aiBar();
  try { await aiAsk(ch, { retry: true, extra }); }
  catch (e) { console.warn(e); s.classList.remove("busy"); aiBar(); toast("AI request failed: " + (e.message || e)); }
}
async function aiAsk(ch, o) {
  const ai = aiState(), c = aiCfg(), span = aiSpan(ch.id); if (!span) return;
  const section = aiSection(span), para = aiParagraph(span), prev = ch.sugg[ch.cur];
  let res;
  if (c.provider === "demo") res = await aiDemoRevise(ch, o);
  else {
    let msg = `Request ${ch.n}${o.retry ? " (asking again)" : ""}\n` + (section ? `Section: ${section}\n` : "") + `Instruction: ${ch.instr}\n\nParagraph, with the selected passage between ⟦ and ⟧:\n${para}\n\nSelected passage:\n<selection>${ch.oldLight}</selection>`;
    if (o.retry) msg += `\n\nYour last version, which the author has not accepted:\n<previous>${prev?.light || ""}</previous>\n${o.extra ? "Extra instructions: " + o.extra : "Write a different version."}`;
    res = await aiTurn(msg);
  }
  const s = aiSpan(ch.id); if (!s) return;   // the change was removed (undo, delete) while we waited
  let light = cleanLight(res.revision ?? res.text), note = res.note || "";
  // keep the selection's own spaces at both ends
  const ot = lightText(ch.oldLight), lead = ot.match(/^\s*/)[0], trail = ot.match(/\s*$/)[0];
  light = lead + light.replace(/^\s+|\s+$/g, "") + trail;
  const d = aiDiff(ch.oldLight, light);
  if (d.same && o.retry) { s.classList.remove("busy"); aiPaint(ch); aiBar(); aiRenderChat(); toast("The AI gave the same text back" + (note ? ": " + note : ".")); return; }
  if (d.same) {
    s.replaceWith(lightOrHtml(ch.oldHtml)); flowEl.normalize(); ch.status = "unchanged"; ch.sugg.push({ light, note, at: Date.now() }); ch.cur = 0;
    aiRenderChat(); toast("The AI suggests leaving this as it is" + (note ? ": " + note : ".")); return;
  }
  ch.sugg.push({ light, note, at: Date.now(), big: d.big }); ch.cur = ch.sugg.length - 1; ch.status = "pending"; ch.view = null;
  aiPaint(ch); aiSetActive(ch.id); aiCommit(); aiRenderChat();
}
/* draw the current suggestion of a change into its span */
function aiPaint(ch) {
  const s = aiSpan(ch.id), sg = ch.sugg[ch.cur]; if (!s || !sg) return;
  const d = aiDiff(ch.oldLight, sg.light), rw = ch.view ? ch.view === "rw" : d.big;
  s.className = "ai-chg" + (rw ? " rw" : "") + (ch.id === aiActive ? " on" : "");
  s.innerHTML = rw ? `<del class="ai-d ai-old">${d.oldHtml}</del><ins class="ai-i ai-new">${d.newHtml}</ins>` : d.html;
  s.title = (rw ? "AI rewrite" : "AI suggestion") + (sg.note ? ": " + sg.note : "") + " (Tab accepts)";
}
function aiCommit() { S.doc.html = flowEl.innerHTML; changed({ quiet: true }); layoutMarginSoon(); refreshNotesSoon(); }

/* ---- accept, reject ---- */
function aiAccept(id = aiActive) {
  const ch = aiChange(id), s = aiSpan(id); if (!ch || !s || s.classList.contains("busy")) return;
  const frag = lightFrag(ch.sugg[ch.cur].light), last = frag.lastChild;
  s.replaceWith(frag); ch.status = "accepted"; if (ch.via !== "demo") aiState().feedback.push(`accepted your version for request ${ch.n}`);
  if (last) { const r = document.createRange(); r.setStartAfter(last); r.collapse(true); flowEl.focus({ preventScroll: true }); getSelection().removeAllRanges(); getSelection().addRange(r); }
  aiAfterResolve(id);
}
function aiReject(id = aiActive) {
  const ch = aiChange(id), s = aiSpan(id); if (!ch || !s || s.classList.contains("busy")) return;
  s.replaceWith(lightOrHtml(ch.oldHtml)); ch.status = "rejected"; if (ch.via !== "demo") aiState().feedback.push(`rejected your version for request ${ch.n}`);
  aiAfterResolve(id);
}
function aiAfterResolve(id) {
  aiCommit(); const left = $$(".ai-chg[data-ai]:not(.busy)", flowEl);
  aiSetActive(left.length ? left[0].dataset.ai : null); aiRenderChat();
}

/* ---- the review bar ---- */
const aiBarEl = EL("div", { class: "ai-bar", hidden: "", role: "toolbar", "aria-label": "AI suggestion" }); document.body.append(aiBarEl);
function aiSetActive(id) {
  aiActive = id && aiSpan(id) ? id : null;
  $$(".ai-chg.on", flowEl).forEach(e => e.classList.remove("on")); if (aiActive) aiSpan(aiActive).classList.add("on");
  aiBar();
}
function aiBar() {
  const ch = aiActive && aiChange(aiActive), s = aiActive && aiSpan(aiActive);
  if (!ch || !s || S.doc?.kind !== "flow" || S.webview) { aiBarEl.hidden = true; return; }
  const busy = s.classList.contains("busy"), sg = ch.sugg[ch.cur], rw = s.classList.contains("rw"), keepAgain = aiBarEl.querySelector(".again input");
  const againVal = keepAgain?.value || "", againOpen = !!keepAgain && aiBarEl.dataset.for === ch.id;
  aiBarEl.innerHTML = ""; aiBarEl.dataset.for = ch.id;
  const B = (lbl, fn, title, cls = "", dis = false) => { const b = EL("button", { type: "button", class: cls, title, onclick: e => { e.preventDefault(); fn(); }, onpointerdown: e => e.preventDefault() }); b.innerHTML = lbl; b.disabled = dis; return b; };
  const row = EL("div", { class: "br" });
  const tag = EL("span", { class: "tag" }, ICON("i-ai"), busy ? "Thinking…" : rw ? "Rewrite" : "Suggestion"); row.append(tag);
  if (ch.sugg.length > 1) row.append(B("‹", () => { ch.cur = (ch.cur - 1 + ch.sugg.length) % ch.sugg.length; ch.view = null; aiPaint(ch); aiCommit(); aiBar(); }, "Previous version", "", busy), EL("span", { class: "ver" }, `${ch.cur + 1}/${ch.sugg.length}`), B("›", () => { ch.cur = (ch.cur + 1) % ch.sugg.length; ch.view = null; aiPaint(ch); aiCommit(); aiBar(); }, "Next version", "", busy));
  row.append(EL("span", { class: "bsep" }));
  row.append(B("✓ Accept <kbd>Tab</kbd>", () => aiAccept(ch.id), "Accept this change (Tab)", "ok", busy));
  row.append(B("✕ Reject <kbd>Esc</kbd>", () => aiReject(ch.id), "Reject: put the original text back (Esc)", "no", busy));
  row.append(B("↻ Ask again…", () => { againRow.hidden = !againRow.hidden; if (!againRow.hidden) inp.focus(); placeBar(); }, "Send the same passage back, optionally with extra instructions", "", busy));
  row.append(EL("span", { class: "bsep" }));
  if (rw) row.append(B(s.classList.contains("showold") ? "Hide original" : "Original", () => { s.classList.toggle("showold"); aiBar(); }, "Show the original text crossed out next to the rewrite", "", busy));
  row.append(B(rw ? "As edits" : "As rewrite", () => { ch.view = rw ? "edits" : "rw"; aiPaint(ch); aiCommit(); aiBar(); }, rw ? "Show word-by-word deletions and insertions" : "Hide the crossed-out words and label it a rewrite", "", busy));
  aiBarEl.append(row);
  if (sg?.note && !busy) aiBarEl.append(EL("div", { class: "bnote", title: sg.note }, sg.note.length > 180 ? sg.note.slice(0, 180) + "…" : sg.note));
  const inp = EL("input", { type: "text", placeholder: "Extra instructions (optional), Enter sends", "aria-label": "Extra instructions" }); inp.value = againVal;
  const again = () => { const x = inp.value.trim(); againRow.hidden = true; aiAgain(ch.id, x); };
  const againRow = EL("div", { class: "again" }, inp, B("Send", again, "Ask again", "ok")); againRow.hidden = !againOpen;
  inp.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); again(); } if (e.key === "Escape") { againRow.hidden = true; placeBar(); } });
  aiBarEl.append(againRow); aiBarEl.hidden = false; placeBar();
}
function placeBar() {
  if (aiBarEl.hidden) return; const s = aiActive && aiSpan(aiActive); if (!s) { aiBarEl.hidden = true; return; }
  const rs = s.getClientRects(), last = rs[rs.length - 1] || s.getBoundingClientRect(), first = rs[0] || last, vr = viewer.getBoundingClientRect();
  const w = aiBarEl.offsetWidth, h = aiBarEl.offsetHeight; let y = last.bottom + 6;
  if (y + h > vr.bottom - 4) y = first.top - h - 6;
  aiBarEl.style.visibility = (last.bottom < vr.top || first.top > vr.bottom) ? "hidden" : "visible";
  aiBarEl.style.left = clamp(Math.min(first.left, last.left), 8, innerWidth - w - 8) + "px"; aiBarEl.style.top = clamp(y, vr.top + 2, innerHeight - h - 4) + "px";
}
viewer.addEventListener("scroll", () => requestAnimationFrame(placeBar), { passive: true });
addEventListener("resize", debounce(placeBar, 80));
flowEl.addEventListener("click", e => { const c = e.target.closest(".ai-chg"); if (c && c.dataset.ai) { aiSetActive(c.dataset.ai); const ch = aiChange(c.dataset.ai); if (ch) aiRenderChat(); } });
flowEl.addEventListener("input", debounce(() => { if (aiActive && !aiSpan(aiActive)) aiSetActive(null); else placeBar(); }, 150));

/* keys: Tab accepts, Esc rejects, Alt+A asks (before the editor's own Tab = indent) */
document.addEventListener("keydown", e => {
  if (!S.doc || S.doc.kind !== "flow" || S.webview) return;
  const inField = e.target.closest("input,textarea,select") || (e.target.closest("[contenteditable=true]") && !e.target.closest("#flow"));
  if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === "KeyA" && !inField) { e.preventDefault(); e.stopPropagation(); aiAskOpen(); return; }
  if (!aiActive || inField || aiAskEl || !$("#modalBack").hidden || !$("#menu").hidden || !$("#pop").hidden) return;
  if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); e.stopPropagation(); aiAccept(); }
  else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); aiReject(); }
}, true);

/* ---- the conversation with the AI ---- */
function aiPaperText() { let md = flowToMarkdown({}); md = md.replace(/^<!-- source:.*?-->\s*/, ""); return md; }
const wordCount = s => (s.match(/[\p{L}\p{N}]+/gu) || []).length;
/* one user turn + the answer; the thread only grows (earlier turns are never edited), so the cache keeps working */
async function aiTurn(text) {
  const ai = aiState(), c = aiCfg(), key = aiKey(c.provider);
  if (!key && c.provider !== "custom") { aiSettings("Add your API key to use " + AI_PROVIDERS[c.provider].label + ", or pick Demo."); throw new Error("no API key yet"); }
  if (!aiModel(c)) { aiSettings("Choose a model first."); throw new Error("no model chosen"); }
  const content = [], paper = aiPaperText(), words = wordCount(paper); let paperNow = null;
  if (!ai.paper || ai.paper.stale || Math.abs(words - ai.paper.words) > Math.max(40, ai.paper.words * 0.15)) {
    content.push({ type: "text", text: `${ai.paper ? "An updated copy of the manuscript (it has changed since the last copy)" : "The manuscript I am working on, for reference during this session"}:\n<manuscript title="${esc(S.doc.name)}">\n${paper}\n</manuscript>` });
    paperNow = { words, at: Date.now() };
  }
  const fb = ai.feedback.length ? `(Since the last request the author ${ai.feedback.join("; ")}.)\n\n` : "";
  content.push({ type: "text", text: fb + text });
  const user = { role: "user", content }, res = await aiCall([...ai.thread, user], c, key);
  ai.thread.push(user, { role: "assistant", content: res.content }); ai.feedback = [];
  if (paperNow) { ai.paper = paperNow; ai.log.push({ t: "info", at: Date.now(), text: (ai.thread.length > 2 ? "Sent an updated copy of the paper" : "Sent the paper to start this chat") + ` (${words.toLocaleString("en")} words).` }); }
  const u = ai.usage; u.calls++; u.in += res.usage.in || 0; u.out += res.usage.out || 0; u.cacheRead += res.usage.cacheRead || 0; u.cacheWrite += res.usage.cacheWrite || 0; u.last = res.usage.total || 0;
  const rev = res.text.match(/<revision>([\s\S]*?)<\/revision>/i), note = res.text.match(/<note>([\s\S]*?)<\/note>/i);
  return { text: res.text.replace(/<\/?(revision|note)>/gi, "").trim(), revision: rev ? rev[1] : null, note: note ? note[1].trim() : "" };
}
const textOf = content => typeof content === "string" ? content : content.filter(b => b.type === "text").map(b => b.text).join("\n\n");
async function aiCall(messages, c, key) {
  const model = aiModel(c);
  try {
    if (c.provider === "claude") {
      const headers = { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2026-10-21", "anthropic-dangerous-direct-browser-access": "true" };
      const body = { model, max_tokens: 16000, system: AI_SYSTEM, messages: messages.map(m => ({ role: m.role, content: m.content })), cache_control: { type: "ephemeral" } };
      if (c.effort) body.output_config = { effort: c.effort };
      if (AI_FALLBACK_MODELS.has(model)) { headers["anthropic-beta"] = "server-side-fallback-2026-07-01"; body.fallbacks = "default"; }
      let r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers, body: JSON.stringify(body) }), data = await r.json().catch(() => ({}));
      if (r.status === 400 && body.fallbacks && /fallback/i.test(data.error?.message || "")) {   // an account without the fallback option: ask once more without it
        delete body.fallbacks; delete headers["anthropic-beta"]; r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers, body: JSON.stringify(body) }); data = await r.json().catch(() => ({}));
      }
      if (!r.ok) throw aiHttpErr(r.status, data.error?.message);
      if (data.stop_reason === "refusal") throw new Error("the model declined this request" + (data.stop_details?.category ? ` (${data.stop_details.category})` : "") + ". Rephrase it, or try another model.");
      const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
      if (!text.trim()) throw new Error(data.stop_reason === "max_tokens" ? "the answer was cut off (too long)" : "the answer was empty");
      const u = data.usage || {};
      return { text, content: data.content, usage: { in: u.input_tokens || 0, out: u.output_tokens || 0, cacheRead: u.cache_read_input_tokens || 0, cacheWrite: u.cache_creation_input_tokens || 0, total: (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0) } };
    }
    const base = aiBase(c); if (!base) throw new Error("set the server address in AI settings");
    const headers = { "content-type": "application/json" }; if (key) headers.authorization = "Bearer " + key;
    const r = await fetch(base + "/chat/completions", { method: "POST", headers, body: JSON.stringify({ model, messages: [{ role: "system", content: AI_SYSTEM }, ...messages.map(m => ({ role: m.role, content: textOf(m.content) }))] }) });
    const data = await r.json().catch(() => ({})); if (!r.ok) throw aiHttpErr(r.status, data.error?.message || data.message);
    const text = data.choices?.[0]?.message?.content || ""; if (!text.trim()) throw new Error("the answer was empty");
    const u = data.usage || {}, cached = u.prompt_tokens_details?.cached_tokens || 0;
    return { text, content: text, usage: { in: (u.prompt_tokens || 0) - cached, out: u.completion_tokens || 0, cacheRead: cached, cacheWrite: 0, total: u.prompt_tokens || 0 } };
  } catch (e) {
    if (e instanceof TypeError) throw new Error(`could not reach ${c.provider === "claude" ? "api.anthropic.com" : aiBase(c) || "the server"} (offline, blocked, or the server does not accept calls from a browser)`);
    throw e;
  }
}
function aiHttpErr(status, msg) {
  const hint = status === 401 || status === 403 ? "the key was not accepted" : status === 404 ? "model or address not found" : status === 429 ? "rate limited: wait a moment and try again" : status >= 500 ? "the service is busy or down: try again shortly" : "request refused";
  return new Error(hint + (msg ? ` (${status}: ${msg})` : ` (${status})`));
}
async function aiListModels(p, key, base) {
  if (p === "claude") {
    const r = await fetch("https://api.anthropic.com/v1/models?limit=100", { headers: { "x-api-key": key, "anthropic-version": "2026-10-21", "anthropic-dangerous-direct-browser-access": "true" } });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw aiHttpErr(r.status, d.error?.message); return (d.data || []).map(m => m.id);
  }
  const r = await fetch(base.replace(/\/+$/, "") + "/models", { headers: key ? { authorization: "Bearer " + key } : {} });
  const d = await r.json().catch(() => ({})); if (!r.ok) throw aiHttpErr(r.status, d.error?.message); return (d.data || d.models || []).map(m => (m.id || m.name || "").replace(/^models\//, "")).filter(Boolean);
}

/* a free question about the paper, answered in the chat panel */
async function aiQuestion(q) {
  const ai = aiState(); if (!ai || !q) return;
  ai.log.push({ t: "you", at: Date.now(), text: q }); const wait = { t: "info", at: Date.now(), text: "Thinking…", wait: true }; ai.log.push(wait); aiRenderChat();
  try {
    const ans = aiCfg().provider === "demo" ? await aiDemoAnswer(q) : (await aiTurn("QUESTION: " + q)).text;
    ai.log.splice(ai.log.indexOf(wait), 1); ai.log.push({ t: "ans", at: Date.now(), text: ans });
  } catch (e) { ai.log.splice(ai.log.indexOf(wait), 1); ai.log.push({ t: "err", at: Date.now(), text: "Could not ask: " + (e.message || e) }); }
  markDirty(); aiRenderChat();
}

/* ---- demo mode: edits made by simple rules, so every control can be tried without a key ---- */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DEMO = {
  concise: [[/\bin order to\b/gi, "to"], [/\bdue to the fact that\b/gi, "because"], [/\bit is (?:important|worth) (?:to note|noting) that\s*/gi, ""], [/\ba (?:large|great) number of\b/gi, "many"], [/\bis able to\b/gi, "can"], [/\bare able to\b/gi, "can"], [/\bhas the ability to\b/gi, "can"], [/\bat this point in time\b/gi, "now"], [/\bfor the purpose of\b/gi, "for"], [/\ba majority of\b/gi, "most"], [/\bprior to\b/gi, "before"], [/\bsubsequent to\b/gi, "after"], [/\bwith regard to\b/gi, "regarding"], [/\bin the case of\b/gi, "for"], [/\butili[sz]ed\b/gi, "used"], [/\butili[sz]e\b/gi, "use"], [/\b(?:very|really|basically|quite) /gi, ""], [/\bin fact, /gi, ""], [/\bthe fact that\b/gi, "that"], [/\bit can be seen that\s*/gi, ""], [/\bwas found to be\b/gi, "was"], [/\bwere found to be\b/gi, "were"], [/\ba(?= [aeiou])/g, "an"]],
  formal: [[/\bdon't\b/gi, "do not"], [/\bdoesn't\b/gi, "does not"], [/\bdidn't\b/gi, "did not"], [/\bcan't\b/gi, "cannot"], [/\bisn't\b/gi, "is not"], [/\baren't\b/gi, "are not"], [/\bwon't\b/gi, "will not"], [/\bit's\b/gi, "it is"], [/\ba lot of\b/gi, "considerable"], [/\blots of\b/gi, "many"], [/\bbig\b/gi, "large"], [/\bhuge\b/gi, "substantial"], [/\bgot\b/gi, "obtained"], [/\bget\b/gi, "obtain"], [/\bseems\b/gi, "appears"], [/\bpretty\b/gi, "fairly"], [/\bkind of\b/gi, "somewhat"], [/^So, /, "Therefore, "], [/^But /, "However, "], [/^Also, /, "In addition, "], [/\bthings\b/gi, "factors"], [/\blooked at\b/gi, "examined"], [/\bfound out\b/gi, "determined"]],
  hedge: [[/\bproves\b/gi, "suggests"], [/\bproved\b/gi, "indicated"], [/\bshows that\b/gi, "suggests that"], [/\bshowed that\b/gi, "indicated that"], [/\bdemonstrates that\b/gi, "indicates that"], [/\bclearly /gi, ""], [/\bobviously /gi, ""], [/\balways\b/gi, "generally"], [/\bnever\b/gi, "rarely"], [/\bis the cause of\b/gi, "may contribute to"], [/\bcauses\b/gi, "may cause"], [/\bwill\b/gi, "may"]],
  grammar: [[/ {2,}/g, " "], [/ ([,.;:])/g, "$1"], [/\b(\w+) \1\b/gi, "$1"], [/\ba(?= [aeiou])/g, "an"], [/\balot\b/gi, "a lot"], [/\bseperate/gi, "separate"], [/\brecieve/gi, "receive"], [/\boccured\b/gi, "occurred"], [/\bteh\b/gi, "the"], [/\bdont\b/gi, "do not"], [/\bthier\b/gi, "their"], [/\bwich\b/gi, "which"]]
};
const LINKS = [["Moreover, ", "As a result, ", "In addition, ", "Consequently, "], ["Furthermore, ", "Therefore, ", "Notably, ", "Accordingly, "], ["In turn, ", "Thus, ", "Likewise, ", "Hence, "]];
function swaps(s, list) { for (const [re, to] of list) s = s.replace(re, (m, ...g) => { const out = to.replace(/\$1/g, g[0]); return m[0] === m[0].toUpperCase() && m[0] !== m[0].toLowerCase() && out ? out[0].toUpperCase() + out.slice(1) : out; }); return s; }
const sentences = s => s.split(/(?<=[.!?])\s+(?=[A-Z<])/);
const lowerFirst = s => s.replace(/^(<[^>]+>)*([A-Z])(?=[a-z])/, (m, t, c) => (t || "") + c.toLowerCase());
const upperFirst = s => s.replace(/^(<[^>]+>)*([a-z])/, (m, t, c) => (t || "") + c.toUpperCase());
function demoKind(instr) { const i = instr.toLowerCase(); return /flow|logic|transition|link|connect/.test(i) ? "flow" : /concise|short|tight|wordy|trim|cut/.test(i) ? "concise" : /formal|academic|tone|register/.test(i) ? "formal" : /grammar|spell|typo|proofread/.test(i) ? "grammar" : /hedg|cautio|overclaim|soften/.test(i) ? "hedge" : "rewrite"; }
function demoRevise(light, instr, attempt) {
  const kind = demoKind(instr); let s = light, note = "";
  if (kind === "flow") {
    const ss = sentences(s), links = LINKS[attempt % LINKS.length]; let k = 0;
    s = ss.map((x, i) => i > 0 && !/^(<[^>]+>)*(However|Moreover|Thus|Therefore|In |As |Furthermore|Notably|Consequently|Accordingly|Hence|Likewise|Finally|First|Second|Third|Together|Here|Overall)\b/.test(x) && (i % 2 === 1 || ss.length === 2) ? links[k++ % links.length] + lowerFirst(x) : x).join(" ");
    s = swaps(s, DEMO.concise); note = "Added linking words between sentences and removed filler phrases.";
    if (s === light && ss.length < 2) { s = swaps(s, DEMO.formal); note = "One sentence: little to link; tightened the wording instead."; }
  } else if (kind === "concise") { s = swaps(s, DEMO.concise); note = "Cut filler phrases and wordy constructions."; }
  else if (kind === "formal") { s = swaps(swaps(s, DEMO.formal), DEMO.concise); note = "Replaced informal words and contractions with formal equivalents."; }
  else if (kind === "grammar") { s = upperFirst(swaps(s, DEMO.grammar)); note = "Fixed spacing, doubled words, articles and common misspellings."; }
  else if (kind === "hedge") { s = swaps(s, DEMO.hedge); note = "Softened claims that the data may not fully support."; }
  else {
    let ss = sentences(swaps(swaps(s, DEMO.formal), DEMO.concise));
    if (ss.length > 1) ss = attempt % 2 ? [...ss.slice(1), ss[0]] : ss.slice().reverse();
    else { const p = ss[0].split(/,\s+/); if (p.length > 1) ss = [upperFirst(p.slice(1).join(", ").replace(/[.!?]?$/, "")) + ", " + lowerFirst(p[0]) + "."]; }
    s = (attempt % 2 ? "Taken together, " : "In brief, ") + lowerFirst(ss.join(" ")); note = "Restructured the passage (demo: sentences reordered, not truly rewritten).";
  }
  if (attempt > 0 && kind !== "flow" && kind !== "rewrite") { s = swaps(s, DEMO.formal); note += " Second pass also formalised the wording."; }
  return { revision: s, note: "Demo: " + note };
}
async function aiDemoRevise(ch, o) {
  await sleep(500 + Math.random() * 700);
  const instr = o.retry && o.extra ? o.extra + " " + ch.instr : ch.instr;
  return demoRevise(ch.oldLight, instr, ch.sugg.length);
}
async function aiDemoAnswer() {
  await sleep(600); const md = aiPaperText(), ss = md.replace(/^#.*$/gm, "").split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => wordCount(s) > 3);
  const long = ss.slice().sort((a, b) => wordCount(b) - wordCount(a))[0] || "", passive = (md.match(/\b(?:is|are|was|were|been|being)\s+\w+ed\b/gi) || []).length;
  return `Demo mode cannot read your question (no AI is connected; open AI settings to add a key). What it can tell you about the paper:\n\n• ${wordCount(md).toLocaleString("en")} words, ${ss.length} sentences, ${(wordCount(md) / Math.max(1, ss.length)).toFixed(1)} words per sentence on average.\n• About ${passive} passive constructions.\n• Longest sentence (${wordCount(long)} words): “${long.slice(0, 160)}${long.length > 160 ? "…" : ""}”`;
}

/* ---- chat panel ---- */
const aiPanel = $("#aiPanel");
function aiTogglePanel(on) { const open = on ?? aiPanel.classList.contains("closed"); aiPanel.classList.toggle("closed", !open); $("#aiPanelBtn")?.classList.toggle("on", open); Prefs.set("aiPanel", open); if (open) { aiRenderChat(); if (innerWidth < 1500) $("#right").classList.add("closed"); } setTimeout(() => { layoutMargin(); placeBar(); }, 200); }
function aiStatus(ch) { return aiSpan(ch.id) ? (aiSpan(ch.id).classList.contains("busy") ? "busy" : "pending") : ch.status === "busy" || ch.status === "pending" ? "removed" : ch.status; }
function aiRenderChat() {
  const ai = S.doc ? aiState() : null, c = aiCfg(); if (!ai) return;
  const who = $("#aiWho"); who.textContent = aiWho(c); who.classList.toggle("demo", c.provider === "demo");
  const u = ai.usage, k = n => n >= 1e4 ? (n / 1e3).toFixed(0) + "k" : n >= 1e3 ? (n / 1e3).toFixed(1) + "k" : String(n);
  const pend = $$(".ai-chg[data-ai]", flowEl).length;
  $("#aiStats").innerHTML = (ai.paper ? `Paper in this chat: ${ai.paper.words.toLocaleString("en")} words, sent ${fmtTime(ai.paper.at)}.` : c.provider === "demo" ? "Demo mode: nothing is sent anywhere." : "The paper is sent with your first request.") +
    (u.calls ? ` ${u.calls} request${u.calls === 1 ? "" : "s"}` + (u.in || u.cacheRead ? `, tokens in ${k(u.in + u.cacheRead + u.cacheWrite)} (${k(u.cacheRead)} from cache), out ${k(u.out)}.` : ".") : "") + (pend ? ` <b>${pend} suggestion${pend === 1 ? "" : "s"} to review.</b>` : "") +
    (u.last > 150000 ? ` The chat is getting long: consider <button data-aiact="newchat">a new chat</button>.` : "");
  const log = $("#aiLog"); log.innerHTML = "";
  if (!ai.log.length) log.innerHTML = `<div class="empty"><b>One chat for this document.</b> Select words in a paragraph, then press <b>Ask AI</b> (or Alt+A) and pick a request. The answer appears in the text as tracked changes: <b>Tab</b> accepts, <b>Esc</b> rejects, <b>Ask again</b> sends it back.<br><br>The AI receives the whole paper once, then each request with its paragraph, so it keeps the full paper as reference. You can also ask questions about the paper below.</div>`;
  for (const e of ai.log) {
    if (e.t === "req") {
      const ch = ai.changes[e.id]; if (!ch) continue; const st = aiStatus(ch), sg = ch.sugg[ch.cur];
      const m = EL("div", { class: "ai-msg req", title: st === "pending" ? "Show this change in the text" : "" });
      m.append(EL("div", { class: "mh" }, EL("span", {}, "#" + ch.n), EL("span", { class: "ai-st " + st }, { busy: "thinking", pending: "to review", accepted: "accepted", rejected: "rejected", unchanged: "no change", failed: "failed", removed: "removed" }[st] || st), EL("span", { class: "sp" }), EL("span", {}, fmtTime(ch.at))));
      m.append(EL("div", { class: "in" }, ch.instr), EL("div", { class: "q" }, lightText(ch.oldLight).trim().slice(0, 200)));
      if (ch.error && st === "failed") m.append(EL("div", { class: "nt" }, ch.error));
      else if (sg?.note) m.append(EL("div", { class: "nt" }, (ch.sugg.length > 1 ? `v${ch.cur + 1}/${ch.sugg.length}: ` : "") + sg.note));
      m.addEventListener("click", () => { const s = aiSpan(ch.id); if (!s) return; s.scrollIntoView({ block: "center", behavior: "smooth" }); aiSetActive(ch.id); afterScroll(viewer, placeBar); });
      log.append(m);
    } else log.append(EL("div", { class: "ai-msg " + e.t }, e.text));
  }
  log.scrollTop = log.scrollHeight;
}
function aiChatMenu(anchor) {
  menu([
    { label: "AI settings…", icon: "i-ai", fn: () => aiSettings() },
    { label: "Send the paper again", sub: "Gives the AI the current text before your next request", fn: () => { const ai = aiState(); if (ai.paper) ai.paper.stale = true; toast("The current paper goes with your next request."); } },
    { label: "Copy the chat", fn: () => { navigator.clipboard.writeText(aiState().log.map(e => e.t === "req" ? (c => `#${c.n} ${c.instr}\n> ${lightText(c.oldLight).trim()}\n${c.sugg[c.cur] ? "→ " + lightText(c.sugg[c.cur].light).trim() + (c.sugg[c.cur].note ? `\n(${c.sugg[c.cur].note})` : "") : ""}`)(aiState().changes[e.id] || { sugg: [], oldLight: "" }) : e.text).join("\n\n")); toast("Copied the chat."); } },
    { sep: true },
    { label: "Start a new chat", danger: true, sub: "The AI forgets this chat; suggestions in the text stay", fn: aiNewChat }
  ], anchor, { right: true });
}
async function aiNewChat() {
  if (!(await modal(`<h3>Start a new chat?</h3><p>The AI forgets the requests so far and gets a fresh copy of the paper with your next request. Suggestions still in the text stay there to accept or reject.</p><div class="mrow"><button class="btn" data-cancel>Keep this chat</button><button class="btn danger" data-ok="ok">New chat</button></div>`))) return;
  const ai = aiState(); ai.thread = []; ai.paper = null; ai.feedback = []; ai.usage = { in: 0, out: 0, cacheRead: 0, cacheWrite: 0, calls: 0 };
  ai.log = ai.log.filter(e => e.t === "req" && aiSpan(e.id)); ai.log.push({ t: "info", at: Date.now(), text: "New chat started." }); markDirty(); aiRenderChat();
}
aiPanel.addEventListener("click", e => {
  const a = e.target.closest("[data-aiact]")?.dataset.aiact; if (!a) return;
  if (a === "settings") aiSettings(); else if (a === "menu") aiChatMenu(e.target.closest("button")); else if (a === "newchat") aiNewChat(); else if (a === "close") aiTogglePanel(false);
  else if (a === "send") { const ta = $("#aiQ"); const q = ta.value.trim(); if (!q) return ta.focus(); ta.value = ""; aiQuestion(q); }
});
$("#aiQ").addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("[data-aiact=send]", aiPanel).click(); } });

/* ---- settings ---- */
async function aiSettings(msg) {
  const c = aiCfg(), p0 = c.provider;
  const provs = Object.entries(AI_PROVIDERS).map(([k, v]) => `<label class="opt"><input type="radio" name="provider" value="${k}"${k === p0 ? " checked" : ""}><div><b>${esc(v.label)}</b><span>${esc(v.sub)}</span></div></label>`).join("");
  const pr = modal(`<div class="ai-set-wrap"><h3>AI for this editor</h3>${msg ? `<p class="ai-msgline err">${esc(msg)}</p>` : `<p>Pick the AI that answers your requests. Keys stay in this browser and are sent only to that provider.</p>`}
    <div class="ai-provs">${provs}</div>
    <div class="ai-f" data-for="key"><label for="aiKeyIn">API key</label><div class="inrow"><input type="password" id="aiKeyIn" name="key" autocomplete="off" spellcheck="false"><button class="btn small" type="button" data-aitest>Check key, load models</button></div>
      <small data-keyhelp></small><label class="chk" style="margin-top:5px"><input type="checkbox" name="remember"${c.remember ? " checked" : ""}> Remember the key in this browser (otherwise it is forgotten when you close the tab)</label></div>
    <div class="ai-f" data-for="base"><label for="aiBaseIn">Server address</label><input type="text" id="aiBaseIn" name="base" placeholder="https://openrouter.ai/api/v1  or  http://localhost:11434/v1" value="${esc(c.base)}"><small>The part before /chat/completions. The server must accept calls from a web page (CORS); Ollama needs OLLAMA_ORIGINS=*.</small></div>
    <div class="ai-grid2"><div class="ai-f" data-for="model"><label for="aiModelIn">Model</label><input type="text" id="aiModelIn" name="model" list="aiModelList" spellcheck="false"><datalist id="aiModelList"></datalist><small data-modelhelp></small></div>
      <div class="ai-f" data-for="effort"><label for="aiEffortIn">Effort (Claude)</label><select id="aiEffortIn" name="effort">${["", "low", "medium", "high", "xhigh", "max"].map(x => `<option value="${x}"${x === c.effort ? " selected" : ""}>${x ? x[0].toUpperCase() + x.slice(1) : "Model default"}</option>`).join("")}</select><small>How hard the model thinks; lower is faster and cheaper.</small></div></div>
    <div class="ai-f"><label for="aiPresetsIn">Quick requests in the menu (one per line)</label><textarea class="presets" id="aiPresetsIn" name="presets">${esc(c.presets.join("\n"))}</textarea></div>
    <p class="ai-msgline" data-aimsg></p>
    <div class="mrow"><button class="btn" data-cancel>Cancel</button><button class="btn primary" data-ok="ok">Save</button></div></div>`, { focus: msg ? "#aiKeyIn" : "button[data-ok]" });
  const m = $("#modal"); m.classList.add("ai-set");
  const val = () => $("input[name=provider]:checked", m).value, keys = {}, models = { ...c.models }; let shown = null;
  const line = (t, cls = "") => { const l = $("[data-aimsg]", m); l.textContent = t; l.className = "ai-msgline " + cls; };
  function show() {
    const p = val(), P = AI_PROVIDERS[p];
    if (shown) { keys[shown] = $("#aiKeyIn").value; models[shown] = $("#aiModelIn").value.trim(); } shown = p;
    $("#aiKeyIn").value = keys[p] ?? aiKey(p); $("#aiModelIn").value = models[p] ?? P.def ?? "";
    $(".ai-f[data-for=key]", m).hidden = p === "demo"; $(".ai-f[data-for=model]", m).hidden = p === "demo"; $(".ai-f[data-for=base]", m).hidden = p !== "custom"; $(".ai-f[data-for=effort]", m).hidden = p !== "claude";
    $("[data-keyhelp]", m).innerHTML = p === "claude" ? 'From <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noopener">platform.claude.com → API keys</a>. Usage is billed to your Anthropic account.' : p === "openai" ? 'From <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">platform.openai.com → API keys</a>.' : p === "gemini" ? 'From <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com → API key</a>.' : "Leave empty if the server needs none.";
    $("[data-modelhelp]", m).textContent = p === "claude" ? "claude-opus-5-5 is the most capable everyday choice; sonnet is faster, haiku cheapest." : "Type the model ID, or load the list with your key.";
    $("#aiModelList").innerHTML = (P.models || []).map(x => `<option value="${x}">`).join(""); line("");
  }
  $$("input[name=provider]", m).forEach(r => r.addEventListener("change", show)); show();
  $("[data-aitest]", m).addEventListener("click", async () => {
    const p = val(); line("Checking…");
    try { const ids = await aiListModels(p, $("#aiKeyIn").value.trim(), p === "custom" ? $("#aiBaseIn").value.trim() : AI_PROVIDERS[p].base || ""); $("#aiModelList").innerHTML = ids.map(x => `<option value="${esc(x)}">`).join(""); line(`Key works. ${ids.length} models available: pick one in the Model box.`, "ok"); }
    catch (e) { line("Did not work: " + (e instanceof TypeError ? "could not reach the server" : e.message), "err"); }
  });
  const v = await pr; m.classList.remove("ai-set"); if (!v) return;
  keys[shown] = v.key; models[shown] = (v.model || "").trim();
  for (const [p, k] of Object.entries(keys)) if (p !== "demo") aiSetKey(p, (k || "").trim(), v.remember);
  aiSetCfg({ provider: v.provider, models: Object.fromEntries(Object.entries(models).filter(([, x]) => x)), base: (v.base || "").trim(), effort: v.effort, remember: v.remember, presets: (() => { const l = (v.presets || "").split("\n").map(x => x.trim()).filter(Boolean).slice(0, 16); return l.length ? l : AI_PRESETS; })() });
  aiHome(); if (S.doc) aiRenderChat(); toast("AI: " + aiWho());
}

function aiHome() { const w = $("#aiHomeWho"); if (w) w.textContent = aiWho(); }

/* ---- keep exports, the web view and undo honest about pending suggestions ---- */
/* exports and saves write the text without unreviewed suggestions (their original text), like Word's "Original" view */
function withOriginals(fn) {
  return function (...args) {
    const chg = S.doc?.kind === "flow" ? $$(".ai-chg[data-ai]", flowEl) : []; if (!chg.length) return fn.apply(this, args);
    const saved = chg.map(el => { const ch = aiChange(el.dataset.ai), f = ch ? lightOrHtml(ch.oldHtml) : document.createTextNode(el.textContent), nodes = f.nodeType === 11 ? [...f.childNodes] : [f]; if (!nodes.length) nodes.push(document.createTextNode("")); el.replaceWith(...nodes); return { el, nodes }; });
    const back = () => { for (const { el, nodes } of saved) { nodes[0].before(el); nodes.forEach(n => n.remove()); } };
    let r; try { r = fn.apply(this, args); } catch (e) { back(); throw e; }
    if (r && typeof r.then === "function") return r.finally(back);
    back(); return r;
  };
}
flowToMarkdown = withOriginals(flowToMarkdown); exportHtmlString = withOriginals(exportHtmlString); printFlow = withOriginals(printFlow);
{ const sb = sourceBlob; sourceBlob = async function (ext) { if (S.doc?.kind === "flow" && $(".ai-chg", flowEl)) toast("Suggestions you have not reviewed are saved as the original text."); return withOriginals(sb)(ext); }; }
{ const ew = enterWebView; enterWebView = function () { if (S.doc?.kind === "flow" && $(".ai-chg", flowEl)) return toast("Accept or reject the AI suggestions first (Tab or Esc on each), then open the web view."); return ew(); }; }
{ const rs = restore; restore = function (s) { rs(s); aiSync(); }; }
{ const sp = showSelPop; showSelPop = function () {
    sp(); const p = $(".selpop"); if (!p || S.doc?.kind !== "flow" || S.webview) return;
    const b = EL("button", { class: "ai-sp", title: "Ask AI about the selection (Alt+A)", onpointerdown: e => e.preventDefault(), onclick: e => { e.preventDefault(); aiAskOpen(); } }); b.append(ICON("i-ai")); b.append(" Ask AI"); b.querySelector("svg").style.cssText = "width:13px;height:13px;vertical-align:-2px";
    p.prepend(b);
  }; }
/* a change still marked busy in a saved copy (closed mid-request) goes back to its original text */
function aiSync() {
  if (S.doc?.kind !== "flow") { aiActive = null; aiBar(); return; }
  for (const s of $$(".ai-chg", flowEl)) { const ch = aiChange(s.dataset.ai); if (!ch || s.classList.contains("busy") || !ch.sugg[ch.cur]) { s.replaceWith(ch ? lightOrHtml(ch.oldHtml) : document.createTextNode(s.textContent)); continue; } if (ch.status !== "pending") ch.status = "pending"; }
  if (aiActive && !aiSpan(aiActive)) aiActive = null; aiSetActive(aiActive || $(".ai-chg[data-ai]", flowEl)?.dataset.ai || null); aiRenderChat();
}
{ const sd = showDoc; showDoc = async function () {
    aiActive = null; aiAskClose();
    if (S.doc?.kind === "flow" && /ai-chg/.test(S.doc.html || "")) { const t = EL("div", { html: S.doc.html }); for (const s of t.querySelectorAll(".ai-chg")) { const ch = S.doc.ai?.changes?.[s.dataset.ai]; if (!ch || s.classList.contains("busy") || !ch.sugg?.[ch.cur]) s.replaceWith(ch ? lightOrHtml(ch.oldHtml) : document.createTextNode(s.textContent)); else s.classList.remove("on"); } S.doc.html = t.innerHTML; }
    const r = await sd(); aiSync(); return r;
  }; }
{ const gh = goHome; goHome = function () { aiActive = null; aiBar(); aiAskClose(); return gh(); }; }

/* ---- the sample paper (made up, for trying the tools) ---- */
const AI_SAMPLE = `<h1>Sub-inhibitory ciprofloxacin and biofilm formation in <i>Pseudomonas aeruginosa</i></h1>
<p><i>A made-up draft for trying the AI tools. The study, numbers and wording are invented, and the prose is deliberately rough.</i></p>
<h2>Abstract</h2>
<p>Biofilms are a big problem in hospitals. Bacteria in biofilms are very hard to kill with antibiotics. We looked at what happens to <i>P. aeruginosa</i> PAO1 when it is grown with low doses of ciprofloxacin. It is important to note that we used doses below the MIC. Biofilm biomass went up by 2.1-fold at 0.25× MIC (p &lt; 0.01). This proves that low antibiotic levels cause biofilm formation and it will make infections worse.</p>
<h2>Introduction</h2>
<p><i>Pseudomonas aeruginosa</i> is an opportunistic pathogen. It causes a lot of infections in people with cystic fibrosis. It forms biofilms on surfaces like catheters. Biofilms are communities of cells in a matrix of polysaccharides, proteins and eDNA. Cells in biofilms are up to 1000 times more tolerant to antibiotics than planktonic cells. In order to treat these infections, doctors use high doses of antibiotics for a long time.</p>
<p>Antibiotic concentrations are not the same everywhere in the body. Some bacteria see concentrations below the minimum inhibitory concentration (MIC). Sub-MIC antibiotics don't kill bacteria, but they can change gene expression. Previous work has shown that some antibiotics increase biofilm formation at low doses. The effect of ciprofloxacin is not clear. Some studies found more biofilm and some found less. Due to the fact that results are mixed we wanted to test it again with a better method.</p>
<h2>Methods</h2>
<p>PAO1 was grown overnight in LB at 37 °C with shaking. Cultures were diluted 1:100 into fresh medium with ciprofloxacin at 0, 0.0625, 0.125 and 0.25× MIC (MIC = 0.125 µg mL<sup>−1</sup>). Biofilms were grown in 96-well plates for 24 h. Biomass was measured with crystal violet staining at OD<sub>595</sub>. Each condition had six wells and the experiment was done three times on different days.</p>
<h2>Results</h2>
<p>Ciprofloxacin at sub-MIC levels increased biofilm biomass. The increase was dose-dependent. At 0.25× MIC biomass was 2.1-fold higher than the control (p &lt; 0.01, one-way ANOVA with Dunnett's test). At 0.0625× MIC there was no significant difference. Planktonic growth was not changed at any concentration, so the effect is not due to differences in cell number. We also saw that the biofilms looked thicker under the microscope but we did not measure this.</p>
<h2>Discussion</h2>
<p>Our results show clearly that ciprofloxacin at low doses causes <i>P. aeruginosa</i> to make more biofilm. This is a really important finding. It means that patients who get low doses of antibiotics will always get worse infections. One possible mechanism is the SOS response, which is induced by DNA damage from fluoroquinolones. The SOS response may increase the release of eDNA, which is part of the biofilm matrix. However we did not test this. Future work should look at other strains and also use flow cells to look at biofilm structure.</p>`;

/* ---- wiring ---- */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (a === "aiAsk") { e.preventDefault(); aiAskOpen(); }
  else if (a === "aiPanel") aiTogglePanel();
  else if (a === "aiSettings") aiSettings();
  else if (a === "aiSample") openDoc(newDoc("flow", "Sample paper (made up)", { html: AI_SAMPLE }));
});
$("[data-act=aiAsk]")?.addEventListener("pointerdown", e => e.preventDefault());
{ const bs = buildSwatches; let once = false; buildSwatches = function () { bs(); if (once) return; once = true; aiHome(); if (Prefs.get("aiPanel", true) === false) aiTogglePanel(false); else { $("#aiPanelBtn")?.classList.add("on"); if (innerWidth < 1500) $("#right").classList.add("closed"); } }; }
Object.assign(window, { aiAskOpen, aiRequest, aiAccept, aiReject, aiAgain, aiSettings, aiDiff, aiState, aiTarget, demoRevise });
