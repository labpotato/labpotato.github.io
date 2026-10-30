/* ---------- Doc Reader AI editor: ask an AI about a selection, get the answer back as tracked changes ----------
   Runs inside Doc Reader's scope (inserted by build.py), so it uses S, flowEl, $, EL, modal, menu, toast...
   One chat per document lives in S.doc.ai: the thread sent to the AI (append-only), the changes it proposed,
   and the log shown in the chat panel. A change in the text is <span class="ai-chg" data-ai="id">; its
   original HTML and every suggestion are kept in S.doc.ai.changes[id], so undo, reload and reject all work. */

const AI_PROVIDERS = {
  demo: { label: "Demo", sub: "No key, no AI: canned edits made in the browser, to try the tools" },
  claude: { label: "Claude", sub: "Anthropic API, your own key", def: "claude-opus-5-5" },
  openai: { label: "OpenAI", sub: "OpenAI API, your own key", base: "https://api.openai.com/v1" },
  gemini: { label: "Gemini", sub: "Google AI Studio key (OpenAI-compatible endpoint)", base: "https://generativelanguage.googleapis.com/v1beta/openai" },
  custom: { label: "Other", sub: "Any OpenAI-compatible server: OpenRouter, Ollama, LM Studio…" }
};
const AI_FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-fable-5-1", "claude-sonnet-5-5"]);   // server-side refusal fallbacks
/* Claude models: id, name, what it is for, price per million tokens in / out (Anthropic API) */
const CLAUDE_MODELS = [
  ["claude-opus-5-5", "Opus 5.5", "Default: the best everyday choice", "$4 / $20"],
  ["claude-fable-5-1", "Fable 5.1", "Most capable; slower and dearer", "$10 / $50"],
  ["claude-sonnet-5-5", "Sonnet 5.5", "Fast and capable", "$2 / $10"],
  ["claude-haiku-5-5", "Haiku 5.5", "Fastest and cheapest, for quick fixes", "$0.10 / $0.50"],
  ["claude-fable-5", "Fable 5", "Earlier generation", "$10 / $50"],
  ["claude-opus-5", "Opus 5", "Earlier generation", "$5 / $25"],
  ["claude-sonnet-5", "Sonnet 5", "Earlier generation", "$2 / $10"],
  ["claude-opus-4-8", "Opus 4.8", "Earlier generation", "$5 / $25"],
  ["claude-opus-4-7", "Opus 4.7", "Earlier generation", "$5 / $25"],
  ["claude-opus-4-6", "Opus 4.6", "Earlier generation", "$5 / $25"],
  ["claude-sonnet-4-6", "Sonnet 4.6", "Earlier generation", "$3 / $15"],
  ["claude-haiku-4-5", "Haiku 4.5", "Earlier generation", "$1 / $5"]
];
const claudeName = id => (CLAUDE_MODELS.find(m => m[0] === id) || [])[1] || id;
const NO_EFFORT = new Set(["claude-haiku-4-5"]), NO_XHIGH = new Set(["claude-opus-4-6", "claude-sonnet-4-6"]);
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
- When the author asks you to redo one marked part of your earlier version, put only the new text for that part in <revision>, written to fit between the text before and after it.

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
function aiWho(c = aiCfg()) { return c.provider === "demo" ? "Demo mode (no AI)" : AI_PROVIDERS[c.provider].label + (aiModel(c) ? " · " + (c.provider === "claude" ? claudeName(aiModel(c)) : aiModel(c)) : ""); }
/* quick switch of model from the chat panel or the request box */
function aiModelMenu(anchor) {
  const c = aiCfg(), cur = aiModel(c), pick = id => { aiSetCfg({ ...c, provider: "claude", models: { ...c.models, claude: id } }); aiHome(); if (S.doc) aiRenderChat(); toast("AI: " + aiWho()); };
  menu([{ head: c.provider === "claude" ? "Claude model" : "AI: " + aiWho(c) }, ...(c.provider === "claude" ? CLAUDE_MODELS.map(([id, n, d, p]) => ({ label: "Claude " + n, sub: `${d} · ${p}`, on: id === cur, fn: () => pick(id) })) : []), { sep: true }, { label: "AI settings…", sub: "Provider, key, model, effort", fn: () => aiSettings() }], anchor);
}

/* ---- the chat of the open document ---- */
function aiState() {
  const d = S.doc; if (!d) return null;
  if (!d.ai) d.ai = { thread: [], changes: {}, log: [], n: 0, paper: null, feedback: [], usage: { in: 0, out: 0, cacheRead: 0, cacheWrite: 0, calls: 0 } };
  return d.ai;
}
const aiChange = id => aiState()?.changes[id];
let aiExtraRoot = null;   // v8: the AI stage holds suggestions too (stage.js)
const aiSpan = id => flowEl.querySelector(`.ai-chg[data-ai="${id}"]`) || (aiExtraRoot && aiExtraRoot.querySelector(`.ai-chg[data-ai="${id}"]`));
const aiRoots = () => aiExtraRoot && aiExtraRoot.isConnected ? [flowEl, aiExtraRoot] : [flowEl];
const inAiRoot = n => aiRoots().some(r => r.contains(n));
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
  const html = runs.map(r => r.kind === "=" ? renderTokens(r.eq) : `<span class="ai-h">${r.del.length ? `<del class="ai-d">${renderTokens(r.del)}</del>` : ""}${r.ins.length ? `<ins class="ai-i">${renderTokens(r.ins)}</ins>` : ""}</span>`).join("");
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
    s.replaceWith(document.createTextNode(mine ? "⟦" + lightText(ch.oldLight) + "⟧" : (ch ? aiOrigFrag(s).textContent : s.textContent)));
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
  const ai = aiState(); if (!range || !inAiRoot(range.commonAncestorContainer)) return toast("The selection changed; select the text again.");
  const id = uid(), frag = range.extractContents(), hold = EL("div"); hold.append(frag.cloneNode(true));
  const span = EL("span", { class: "ai-chg busy", "data-ai": id, contenteditable: "false" }); span.append(frag); range.insertNode(span);
  const ch = ai.changes[id] = { id, n: ++ai.n, at: Date.now(), instr, oldHtml: hold.innerHTML, oldLight: toLight(hold), sugg: [], cur: -1, status: "busy", via: aiCfg().provider };
  getSelection().removeAllRanges();
  ai.log.push({ t: "req", id, at: ch.at });
  if (!Prefs.get("aiPanelSeen")) { Prefs.set("aiPanelSeen", 1); aiTogglePanel(true); }
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
/* draw the current suggestion of a change into its span: each edit is its own <span class="ai-h"> to review */
function aiPaint(ch) {
  const s = aiSpan(ch.id), sg = ch.sugg[ch.cur]; if (!s || !sg) return;
  const d = aiDiff(ch.oldLight, sg.light), rw = ch.view ? ch.view === "rw" : d.big;
  s.className = "ai-chg" + (rw ? " rw" : ""); delete s.dataset.acc; delete s.dataset.rej;
  s.innerHTML = rw ? `<span class="ai-h"><del class="ai-d ai-old">${d.oldHtml}</del><ins class="ai-i ai-new">${d.newHtml}</ins></span>` : d.html;
  s.title = (rw ? "AI rewrite" : "AI suggestion") + (sg.note ? ": " + sg.note : "");
}
function aiCommit() { S.doc.html = flowEl.innerHTML; changed({ quiet: true }); layoutMarginSoon(); refreshNotesSoon(); }

/* ---- accept, reject: one edit at a time, or the whole suggestion ---- */
let aiHunk = null;   // the edit the review bar is for
const hunksIn = s => $$(".ai-h", s), allHunks = () => aiRoots().flatMap(r => $$(".ai-chg:not(.busy) .ai-h", r));
const partOf = (h, sel) => { const f = document.createDocumentFragment(); const e = h.querySelector(sel); if (e) f.append(...e.childNodes); return f; };
/* the text a suggestion stands for if its open edits are rejected (for exports and the AI): exact original if nothing was decided */
function aiOrigFrag(s) {
  const ch = aiChange(s.dataset.ai);
  if (ch && !s.dataset.acc && !s.dataset.rej) return lightOrHtml(ch.oldHtml);
  const c = s.cloneNode(true); hunksIn(c).forEach(h => h.replaceWith(partOf(h, "del"))); const f = document.createDocumentFragment(); f.append(...c.childNodes); return f;
}
function aiDecide(h, accept) {
  const s = h?.closest(".ai-chg"); if (!s || s.classList.contains("busy") || h.classList.contains("busy")) return;
  const ch = aiChange(s.dataset.ai), all = allHunks(), i = all.indexOf(h);
  h.replaceWith(partOf(h, accept ? "ins" : "del")); s.dataset[accept ? "acc" : "rej"] = "1";
  if (!hunksIn(s).length) aiFinish(s, ch);
  aiCommit(); const rest = allHunks(); aiSetHunk(rest[Math.min(i, rest.length - 1)] || null); aiRenderChat();
}
/* every edit decided: the suggestion becomes plain text again */
function aiFinish(s, ch) {
  const acc = !!s.dataset.acc, rej = !!s.dataset.rej;
  if (!acc) s.replaceWith(lightOrHtml(ch.oldHtml)); else { const last = s.lastChild; s.replaceWith(...s.childNodes); if (last && aiActive === ch.id && flowEl.contains(last)) { const r = document.createRange(); r.setStartAfter(last); r.collapse(true); flowEl.focus({ preventScroll: true }); getSelection().removeAllRanges(); getSelection().addRange(r); } }
  flowEl.normalize(); ch.status = acc && rej ? "partly" : acc ? "accepted" : "rejected";
  if (ch.via !== "demo") aiState().feedback.push(`${ch.status === "partly" ? "accepted part of" : ch.status} your version for request ${ch.n}`);
}
function aiAccept(id = aiActive) {
  const ch = aiChange(id), s = aiSpan(id); if (!ch || !s || s.classList.contains("busy")) return;
  if (!s.dataset.acc && !s.dataset.rej) { const frag = lightFrag(ch.sugg[ch.cur].light); s.innerHTML = ""; s.append(frag); s.dataset.acc = "1"; }
  else hunksIn(s).forEach(h => h.replaceWith(partOf(h, "ins"))), s.dataset.acc = "1";
  aiFinish(s, ch); aiAfterResolve();
}
function aiReject(id = aiActive) {
  const ch = aiChange(id), s = aiSpan(id); if (!ch || !s || s.classList.contains("busy")) return;
  hunksIn(s).forEach(h => h.replaceWith(partOf(h, "del"))); s.dataset.rej = "1";
  aiFinish(s, ch); aiAfterResolve();
}
function aiAfterResolve() { aiCommit(); aiSetHunk(allHunks()[0] || null); aiRenderChat(); }
function aiDecideAll(accept) {
  const ids = [...new Set(aiRoots().flatMap(r => $$(".ai-chg[data-ai]:not(.busy)", r)).map(s => s.dataset.ai))]; if (!ids.length) return toast("No AI suggestions to review.");
  ids.forEach(id => accept ? aiAccept(id) : aiReject(id)); toast(`${accept ? "Accepted" : "Rejected"} ${ids.length} suggestion${ids.length === 1 ? "" : "s"}.`);
}
function aiStep(d) { const all = allHunks(); if (!all.length) return toast("No AI suggestions to review."); const i = all.indexOf(aiHunk); const h = all[(i < 0 ? (d > 0 ? 0 : all.length - 1) : i + d + all.length) % all.length]; aiSetHunk(h); h.scrollIntoView({ block: "center", behavior: "smooth" }); afterScroll(viewer, placeBar); }

/* revise one edit: the AI rewrites just that part of its version */
async function aiReviseHunk(h, extra) {
  const s = h?.closest(".ai-chg"), ch = s && aiChange(s.dataset.ai); if (!ch || h.classList.contains("busy")) return;
  const ins = h.querySelector("ins"), del = h.querySelector("del"), part = ins ? toLight(ins) : "", orig = del ? toLight(del) : "";
  const c = s.cloneNode(true), PH = "\u0000PART\u0000"; hunksIn(c)[hunksIn(s).indexOf(h)].replaceWith(document.createTextNode(PH));
  const passage = toLight(c).replace(PH, "⟦" + part + "⟧");
  h.classList.add("busy"); aiBar();
  try {
    let res;
    if (aiCfg().provider === "demo") { await sleep(500 + Math.random() * 500); res = demoPart(part, orig, extra || ch.instr); }
    else res = await aiTurn(`Request ${ch.n}, one part again\nInstruction for the passage: ${ch.instr}\n\nYour current version of the passage, with the part to redo between ⟦ and ⟧:\n${passage}\n\nThe author's original text for that part: «${orig || "(nothing: you added this part)"}»\n${extra ? "What the author wants: " + extra : "The author is not happy with this part: write it differently."}\n\nReply with the new text for the marked part only, in <revision>, so it fits between the text before and after it.`);
    if (!h.isConnected) return;
    const sp = (part || orig).match(/^\s*/)[0], tr = (part || orig).match(/\s*$/)[0], body = cleanLight(res.revision ?? res.text).replace(/^\s+|\s+$/g, "");
    const html = body ? renderTokens(lightTokens(sp + body + tr)) : "";
    if (html) { let i2 = h.querySelector("ins"); if (!i2) { i2 = EL("ins", { class: "ai-i" }); h.append(i2); } i2.innerHTML = html; } else h.querySelector("ins")?.remove();
    if (res.note) h.dataset.note = res.note.replace(/^Demo: /, ch.via === "demo" ? "Demo: " : "");
    h.classList.remove("busy"); aiCommit(); aiSetHunk(h); flashEl(h); aiRenderChat();
  } catch (e) { console.warn(e); h.classList.remove("busy"); aiBar(); toast("AI request failed: " + (e.message || e)); }
}

/* ---- show changes on / off: off shows the text as it would read with every suggestion accepted ---- */
function aiMarkup(on) { if (on != null) Prefs.set("aiMarkup", on); const show = Prefs.get("aiMarkup", true); flowEl.classList.toggle("markup-off", !show); $("#aiMarkupBtn")?.classList.toggle("on", show); placeBar(); return show; }

/* ---- the review bar, under the edit being reviewed ---- */
const aiBarEl = EL("div", { class: "ai-bar", hidden: "", role: "toolbar", "aria-label": "AI suggestion" }); document.body.append(aiBarEl);
function aiSetHunk(h) {
  aiHunk = h && h.isConnected ? h : null; aiActive = aiHunk ? aiHunk.closest(".ai-chg").dataset.ai : null;
  $$(".ai-h.on,.ai-chg.on", flowEl).forEach(e => e.classList.remove("on")); if (aiHunk) { aiHunk.classList.add("on"); aiHunk.closest(".ai-chg").classList.add("on"); }
  aiBar();
}
function aiSetActive(id) { const s = id && aiSpan(id); aiSetHunk(s ? (hunksIn(s)[0] || null) : null); if (s && !aiHunk) { aiActive = id; aiBar(); } }
/* the review remote: a slim column of buttons in the page margin, level with the change being reviewed.
   The AI's note and the "revise" box open beside it only when asked for, so nothing covers the passage. */
let aiNoteOpen = false;
function aiBar() {
  const ch = aiActive && aiChange(aiActive), s = aiActive && aiSpan(aiActive);
  if (!ch || !s || S.doc?.kind !== "flow" || S.webview) { aiBarEl.hidden = true; return; }
  const h = aiHunk && aiHunk.isConnected ? aiHunk : null, busy = s.classList.contains("busy") || !!h?.classList.contains("busy"), sg = ch.sugg[ch.cur], rw = s.classList.contains("rw");
  const all = allHunks(), here = hunksIn(s), keep = aiBarEl.querySelector(".again input"), keepMode = aiBarEl.dataset.mode, againVal = keep?.value || "", againOpen = !!keep && !keep.closest(".again").hidden && aiBarEl.dataset.for === ch.id;
  aiBarEl.innerHTML = ""; aiBarEl.dataset.for = ch.id;
  const B = (lbl, fn, title, cls = "", dis = false) => { const b = EL("button", { type: "button", class: cls, title, "aria-label": title, onclick: e => { e.preventDefault(); fn(); }, onpointerdown: e => e.preventDefault() }); b.innerHTML = lbl; b.disabled = dis; return b; };
  const note = !busy && (h?.dataset.note || sg?.note) || "";
  const row = EL("div", { class: "br" });
  row.append(EL("span", { class: "tag" + (busy ? " busy" : ""), title: busy ? "The AI is working on it…" : rw ? "AI rewrite: the passage was rewritten as a whole" : "AI change" }, ICON("i-ai")));
  row.append(B("✓", () => aiDecide(h, true), "Accept this change (Tab)", "ok", busy || !h));
  row.append(B("✕", () => aiDecide(h, false), "Reject this change and keep your words (Esc)", "no", busy || !h));
  row.append(B("✎", () => openAgain("part"), "Ask the AI to redo this change, optionally saying what is wrong", "", busy || !h));
  if (note) row.append(B("?", () => { aiNoteOpen = !aiNoteOpen; aiBar(); }, aiNoteOpen ? "Hide the AI's reason" : "Why did the AI change this?", aiNoteOpen ? "on" : ""));
  if (all.length > 1 && h) row.append(EL("span", { class: "bsep" }), B("↑", () => aiStep(-1), "Previous change (Alt+↑)", "", busy), EL("span", { class: "ver", title: "Change " + (all.indexOf(h) + 1) + " of " + all.length }, `${all.indexOf(h) + 1}/${all.length}`), B("↓", () => aiStep(1), "Next change (Alt+↓)", "", busy));
  row.append(EL("span", { class: "bsep" }));
  /* v7: one click between the marked-up text and the text as it would read with the changes */
  const mk = Prefs.get("aiMarkup", true);
  row.append(B(mk ? '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'
    : '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
    () => { aiMarkup(!Prefs.get("aiMarkup", true)); aiBar(); }, mk ? "Showing the changes in colour. Click to read the changed version only (Alt+M)" : "Showing the changed version only. Click to show the changes in colour (Alt+M)", mk ? "" : "on"));
  const more = B("⋯", () => menu([
    ...(here.length > 1 ? [{ label: `Accept all ${here.length} changes in this passage`, fn: () => aiAccept(ch.id) }, { label: `Reject all ${here.length} changes in this passage`, fn: () => aiReject(ch.id) }, { sep: true }] : []),
    { label: "Ask again for the whole passage…", sub: "Get a new version of everything you selected", fn: () => openAgain("all") },
    ...(ch.sugg.length > 1 ? [{ label: `Version ${ch.cur + 1} of ${ch.sugg.length}: show the ${ch.cur + 1 < ch.sugg.length ? "next" : "first"}`, sub: "Your accept/reject choices in this passage start over", fn: () => { ch.cur = (ch.cur + 1) % ch.sugg.length; ch.view = null; aiPaint(ch); aiCommit(); aiSetActive(ch.id); } }] : []),
    { label: rw ? "Show word by word" : "Show as one rewrite", sub: "Your accept/reject choices in this passage start over", fn: () => { ch.view = rw ? "edits" : "rw"; aiPaint(ch); aiCommit(); aiSetActive(ch.id); } },
    ...(rw ? [{ label: s.classList.contains("showold") ? "Hide my original text" : "Show my original text", fn: () => { s.classList.toggle("showold"); aiBar(); } }] : []),
    { sep: true }, { label: (Prefs.get("aiMarkup", true) ? "✓ " : "") + "Show changes in colour", sub: "Off: read the text as if every change were accepted", fn: () => aiMarkup(!Prefs.get("aiMarkup", true)) },
    { label: "Accept every AI change in the document", fn: () => aiDecideAll(true) }, { label: "Reject every AI change in the document", fn: () => aiDecideAll(false) }
  ], more), "More: whole passage, versions, view", "", busy);
  row.append(more);
  aiBarEl.append(row);
  const side = EL("div", { class: "side" });
  if (note && aiNoteOpen) side.append(EL("div", { class: "bnote" }, note));
  const inp = EL("input", { type: "text", "aria-label": "Instructions for the AI" }); inp.value = againVal;
  let mode = keepMode || "part";
  const ph = m => m === "part" ? "What should change? (optional) Enter sends" : "Extra instructions for the whole passage (optional) Enter sends";
  const send = () => { const x = inp.value.trim(); againRow.hidden = true; inp.value = ""; mode === "part" ? aiReviseHunk(h, x) : aiAgain(ch.id, x); };
  const againRow = EL("div", { class: "again" }, inp, EL("button", { type: "button", onclick: e => { e.preventDefault(); send(); }, onpointerdown: e => e.preventDefault() }, "Send")); againRow.hidden = !againOpen;
  function openAgain(m) { mode = m; aiBarEl.dataset.mode = m; inp.placeholder = ph(m); againRow.hidden = false; side.hidden = false; inp.focus(); placeBar(); }
  if (againOpen) inp.placeholder = ph(mode);
  inp.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); send(); } if (e.key === "Escape") { againRow.hidden = true; side.hidden = !side.querySelector(".bnote"); placeBar(); } });
  side.append(againRow); side.hidden = !(note && aiNoteOpen) && !againOpen;
  aiBarEl.append(side); aiBarEl.hidden = false; placeBar();
}
/* beside the page, level with the change: the margin right of the page, then left; with no margin (side panels open,
   page as wide as the window) the page's blank border; never over the text column */
function placeBar() {
  if (aiBarEl.hidden) return; const s = aiActive && aiSpan(aiActive); if (!s) { aiBarEl.hidden = true; return; }
  const onStage = aiExtraRoot && aiExtraRoot.contains(s), box = onStage ? aiExtraRoot : viewer, page = onStage ? aiExtraRoot : flowEl;
  const t = aiHunk && aiHunk.isConnected ? aiHunk : s, rs = t.getClientRects(), first = rs[0] || t.getBoundingClientRect(), last = rs[rs.length - 1] || first, vr = box.getBoundingClientRect(), pg = page.getBoundingClientRect();
  const w = aiBarEl.offsetWidth, h = aiBarEl.offsetHeight, gap = 12, sideW = 256;
  let x, left = false;
  const cs = getComputedStyle(page), padR = parseFloat(cs.paddingRight) || 0, padL = parseFloat(cs.paddingLeft) || 0;
  if (vr.right - pg.right >= w + gap + 4) x = pg.right + gap;                          // the margin right of the page
  else if (pg.left - vr.left >= w + gap + 4) { x = pg.left - gap - w; left = true; }   // the margin left of the page
  else if (padR >= w + 8) x = pg.right - padR + (padR - w) / 2;                        // no margin: the page's blank right border
  else if (padL >= w + 8) { x = pg.left + (padL - w) / 2; left = true; }
  else x = vr.right - w - 18;
  if (!left && x + w + sideW > Math.min(innerWidth, vr.right + 400)) left = true;   // the note and the revise box open to whichever side has room
  aiBarEl.classList.toggle("left", left);
  aiBarEl.style.visibility = (last.bottom < vr.top || first.top > vr.bottom) ? "hidden" : "visible";
  aiBarEl.style.left = clamp(x, 4, innerWidth - w - 4) + "px"; aiBarEl.style.top = clamp(first.top - 4, vr.top + 4, Math.max(vr.top + 4, vr.bottom - h - 4)) + "px";
}
viewer.addEventListener("scroll", () => requestAnimationFrame(placeBar), { passive: true });
addEventListener("resize", debounce(placeBar, 80));
flowEl.addEventListener("click", e => { const c = e.target.closest(".ai-chg"); if (c && c.dataset.ai) { const h = e.target.closest(".ai-h"); if (h) aiSetHunk(h); else aiSetActive(c.dataset.ai); aiRenderChat(); } });
flowEl.addEventListener("input", debounce(() => { if (aiActive && !aiSpan(aiActive)) aiSetHunk(null); else placeBar(); }, 150));

/* keys: Tab accepts and Esc rejects the change at hand, Alt+↓/↑ move between changes, Alt+A asks */
document.addEventListener("keydown", e => {
  if (!S.doc || S.doc.kind !== "flow" || S.webview) return;
  const inField = e.target.closest("input,textarea,select") || (e.target.closest("[contenteditable=true]") && !e.target.closest("#flow"));
  if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === "KeyA" && !inField) { e.preventDefault(); e.stopPropagation(); aiAskOpen(); return; }
  if (inField || aiAskEl || !$("#modalBack").hidden || !$("#menu").hidden || !$("#pop").hidden) return;
  if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.code === "KeyM" && aiRoots().some(r => $(".ai-chg", r))) { e.preventDefault(); e.stopPropagation(); aiMarkup(!Prefs.get("aiMarkup", true)); aiBar(); toast(Prefs.get("aiMarkup", true) ? "Showing the changes in colour." : "Showing the changed version only."); return; }
  if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && (e.key === "ArrowDown" || e.key === "ArrowUp") && allHunks().length) { e.preventDefault(); e.stopPropagation(); aiStep(e.key === "ArrowDown" ? 1 : -1); return; }
  if (!aiHunk || !aiHunk.isConnected) return;
  if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); e.stopPropagation(); aiDecide(aiHunk, true); }
  else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); aiDecide(aiHunk, false); }
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
      if (c.effort && !NO_EFFORT.has(model)) body.output_config = { effort: c.effort === "xhigh" && NO_XHIGH.has(model) ? "high" : c.effort };
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
/* demo: redo one part. Short parts: tidy the wording, or go back to the author's own words */
function demoPart(part, orig, instr) {
  const src = part || orig, out = swaps(swaps(src, DEMO.concise), DEMO.formal);
  if (out !== src && out.trim()) return { revision: out, note: "Demo: tightened the wording of this part." };
  return { revision: orig || "", note: orig ? "Demo: went back to your original words for this part." : "Demo: dropped this addition." };
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
    (u.last > 150000 ? ` The chat is getting long: consider <button data-aiact="newchat">a new chat</button>.` : "") +
    ` <button data-aiact="where">Where is this chat?</button>`;
  const log = $("#aiLog"); log.innerHTML = "";
  if (!ai.log.length) log.innerHTML = `<div class="empty"><b>One chat for this document.</b> Select words in a paragraph, then press <b>Ask AI</b> (or Alt+A) and pick a request. The answer appears in the text as tracked changes: <b>Tab</b> accepts, <b>Esc</b> rejects, <b>Ask again</b> sends it back.<br><br>The AI receives the whole paper once, then each request with its paragraph, so it keeps the full paper as reference. You can also ask questions about the paper below.<br><br><b>Where the chat is kept:</b> with this document, in this browser (and inside a saved .lpdoc project). Requests go to the AI's own API with your key, so they do not appear on claude.ai; <b>⋯ → Download the chat</b> keeps a copy.</div>`;
  for (const e of ai.log) {
    if (e.t === "req") {
      const ch = ai.changes[e.id]; if (!ch) continue; const st = aiStatus(ch), sg = ch.sugg[ch.cur];
      const m = EL("div", { class: "ai-msg req", title: st === "pending" ? "Show this change in the text" : "" });
      m.append(EL("div", { class: "mh" }, EL("span", {}, "#" + ch.n), EL("span", { class: "ai-st " + st }, { busy: "thinking", pending: "to review", accepted: "accepted", partly: "partly accepted", rejected: "rejected", unchanged: "no change", failed: "failed", removed: "removed" }[st] || st), EL("span", { class: "sp" }), EL("span", {}, fmtTime(ch.at))));
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
    { label: "Where is this chat?", sub: "Kept with this document in this browser, not on claude.ai", fn: aiWhere },
    { label: "Continue on claude.ai ↗", sub: "Copies the paper and this chat, opens a new claude.ai chat to paste into", fn: aiToClaudeAi },
    { label: "Download the chat (.md)", sub: "Requests, the AI's versions and notes, questions and answers", fn: () => download(new Blob([aiChatMarkdown()], { type: "text/markdown" }), baseName(S.doc.name) + "-ai-chat.md") },
    { label: "Copy the chat", fn: () => { navigator.clipboard.writeText(aiState().log.map(e => e.t === "req" ? (c => `#${c.n} ${c.instr}\n> ${lightText(c.oldLight).trim()}\n${c.sugg[c.cur] ? "→ " + lightText(c.sugg[c.cur].light).trim() + (c.sugg[c.cur].note ? `\n(${c.sugg[c.cur].note})` : "") : ""}`)(aiState().changes[e.id] || { sugg: [], oldLight: "" }) : e.text).join("\n\n")); toast("Copied the chat."); } },
    { sep: true },
    { label: "Start a new chat", danger: true, sub: "The AI forgets this chat; suggestions in the text stay", fn: aiNewChat }
  ], anchor, { right: true });
}
/* where the chat lives, said plainly, with what was actually sent */
function aiWhere() {
  const ai = aiState(), c = aiCfg(), P = AI_PROVIDERS[c.provider], kb = Math.max(1, Math.round(JSON.stringify(ai).length / 1024));
  const sent = ai.thread.length / 2, where = c.provider === "claude" ? "Anthropic's API" : c.provider === "demo" ? "" : P.label + "'s API";
  const usage = c.provider === "claude" ? `Usage and cost appear on <a href="https://platform.claude.com/" target="_blank" rel="noopener">platform.claude.com</a> (the Claude Console), as token counts, not as conversations.` : c.provider === "openai" ? `Usage and cost appear in your OpenAI account, not as conversations.` : c.provider === "gemini" ? `Usage appears in Google AI Studio, not as conversations.` : "";
  const v = modal(`<h3>Where is this chat?</h3>
    <div class="where-map"><div class="wm-box on"><b>This document</b><span>in this browser${S.doc.handle || S.fileHandle ? ", and your autosave file" : ""}</span><small>${ai.log.length} entries · ${kb} KB</small></div>
      <div class="wm-arrow">${c.provider === "demo" ? "✕" : "⇄"}</div>
      <div class="wm-box">${c.provider === "demo" ? "<b>Nothing is sent</b><span>Demo mode works in the browser</span>" : `<b>${esc(where)}</b><span>your key · ${esc(aiWho(c))}</span><small>${sent} request${sent === 1 ? "" : "s"} in this chat</small>`}</div>
      <div class="wm-arrow">✕</div><div class="wm-box off"><b>claude.ai</b><span>chats there are separate</span></div></div>
    <ul class="where-list">
      <li><b>Kept with this document, in this browser.</b> The chat is saved in the browser's storage for this site, together with the document, and inside an .lpdoc project file if you save one (Save menu). Open the document on another computer or browser and the chat is not there unless you bring the .lpdoc.</li>
      ${c.provider === "demo" ? "" : `<li><b>Sent to ${esc(where)} with your key, one request at a time.</b> The API answers and keeps no chat history you can open later, so the chat never appears on claude.ai, which only lists conversations made in the claude.ai app. ${usage}</li>`}
      <li><b>Lost if you clear this site's data</b> in the browser (or use a private window). Keep a copy with <b>Download the chat</b> below, or save the project file.</li>
      <li><b>Want it on claude.ai?</b> claude.ai has no way for other apps to add chats to your account. <b>Continue on claude.ai</b> below copies the paper and this chat and opens a new claude.ai chat: paste (Ctrl+V) and send, and it is a claude.ai chat from then on (a copy: what you write there does not come back here). For a lasting place, make a claude.ai Project for the paper and add the downloaded chat and the paper as project files.</li>
      <li><b>Start a new chat</b> (⋯ menu) to make the AI forget it; the document keeps the suggestions already in the text.</li>
    </ul>
    <div class="mrow"><button class="btn" data-where="sent"${ai.thread.length ? "" : " disabled"}>See exactly what was sent</button><button class="btn" data-where="dl">Download the chat (.md)</button><button class="btn" data-where="claude">Continue on claude.ai ↗</button><span class="sp"></span><button class="btn primary" data-cancel>Close</button></div>`);
  $$("#modal [data-where]").forEach(b => { b.onclick = () => { const w = b.dataset.where; if (w === "dl") download(new Blob([aiChatMarkdown()], { type: "text/markdown" }), baseName(S.doc.name) + "-ai-chat.md"); else if (w === "claude") { closeModal(null); aiToClaudeAi(); } else { closeModal(null); aiSentView(); } }; });
  return v;
}
/* the conversation exactly as the AI receives it: every request and reply, the paper copies folded */
function aiSentView() {
  const ai = aiState(), msgs = ai.thread.map((m, i) => {
    const blocks = typeof m.content === "string" ? [{ type: "text", text: m.content }] : m.content.filter(b => b.type === "text");
    const body = blocks.map(b => b.text.startsWith("The manuscript") || b.text.startsWith("An updated copy of the manuscript") ? `<details><summary>${esc(b.text.split("\n")[0])} (${wordCount(b.text).toLocaleString("en")} words)</summary><pre>${esc(b.text)}</pre></details>` : `<pre>${esc(b.text)}</pre>`).join("");
    return `<div class="sent-msg ${m.role}"><div class="sent-who">${m.role === "user" ? "Sent by Doc Reader" : "The AI's reply"} · message ${i + 1}</div>${body}</div>`;
  }).join("");
  modal(`<h3>What was sent to the AI</h3><p>Every message in this document's chat, in order. Each request also carries the editing instructions shown first (the system prompt).</p><details class="sent-sys"><summary>System prompt</summary><pre>${esc(AI_SYSTEM)}</pre></details><div class="sent-list">${msgs || "<p>Nothing sent yet.</p>"}</div><div class="mrow"><button class="btn primary" data-cancel>Close</button></div>`);
  $("#modal").classList.add("sent-modal"); const off = () => { if ($("#modalBack").hidden) $("#modal").classList.remove("sent-modal"); else setTimeout(off, 300); }; setTimeout(off, 300);
}
/* claude.ai has no way for other apps to add chats, so: copy the paper and this chat, open a new claude.ai chat, paste */
async function aiToClaudeAi() {
  const text = `I am writing this paper and used an AI editor (Lab Potato Doc Reader) on it. Below are the current manuscript and our editing chat. Please read both and continue as my editor; I will ask follow-up questions here.\n\n<manuscript>\n${aiPaperText()}\n</manuscript>\n\n<editing_chat>\n${aiChatMarkdown()}</editing_chat>\n`;
  let copied = true; try { await navigator.clipboard.writeText(text); } catch (e) { copied = false; }
  window.open("https://claude.ai/new", "_blank", "noopener");
  if (copied) toast("Copied the paper and this chat. In the new claude.ai chat, press Ctrl+V (⌘V) to paste it, then send.");
  else { download(new Blob([text], { type: "text/markdown" }), baseName(S.doc.name) + "-for-claude.md"); toast("Saved the paper and this chat as a file: attach it in the new claude.ai chat."); }
}
function aiChatMarkdown() {
  const ai = aiState(), c = aiCfg();
  return `# AI chat: ${S.doc.name}\n\n_${aiWho(c)} · kept with this document in Doc Reader (not on claude.ai)_\n\n` + ai.log.map(e => {
    if (e.t !== "req") return (e.t === "you" ? "**You:** " : e.t === "ans" ? "**AI:** " : "_") + e.text + (e.t === "info" || e.t === "err" ? "_" : "");
    const ch = ai.changes[e.id]; if (!ch) return "";
    return `### #${ch.n} ${ch.instr} (${aiStatus(ch)})\n\n> ${lightText(ch.oldLight).trim()}\n\n` + ch.sugg.map((v, i) => `**Version ${i + 1}:** ${lightText(v.light).trim()}${v.note ? `\n\n_${v.note}_` : ""}`).join("\n\n");
  }).filter(Boolean).join("\n\n") + "\n";
}
async function aiNewChat() {
  if (!(await modal(`<h3>Start a new chat?</h3><p>The AI forgets the requests so far and gets a fresh copy of the paper with your next request. Suggestions still in the text stay there to accept or reject.</p><div class="mrow"><button class="btn" data-cancel>Keep this chat</button><button class="btn danger" data-ok="ok">New chat</button></div>`))) return;
  const ai = aiState(); ai.thread = []; ai.paper = null; ai.feedback = []; ai.usage = { in: 0, out: 0, cacheRead: 0, cacheWrite: 0, calls: 0 };
  ai.log = ai.log.filter(e => e.t === "req" && aiSpan(e.id)); ai.log.push({ t: "info", at: Date.now(), text: "New chat started." }); markDirty(); aiRenderChat();
}
aiPanel.addEventListener("click", e => {
  const a = e.target.closest("[data-aiact]")?.dataset.aiact; if (!a) return;
  if (a === "settings") aiModelMenu(e.target.closest("button")); else if (a === "menu") aiChatMenu(e.target.closest("button")); else if (a === "newchat") aiNewChat(); else if (a === "where") aiWhere(); else if (a === "close") aiTogglePanel(false);
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
    <div class="ai-grid2"><div class="ai-f" data-for="model"><label for="aiModelIn">Model</label><select id="aiModelSel" aria-label="Claude model"></select><input type="text" id="aiModelIn" name="model" list="aiModelList" spellcheck="false"><datalist id="aiModelList"></datalist><small data-modelhelp></small></div>
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
    $("[data-modelhelp]", m).textContent = p === "claude" ? "Price per million tokens in / out. A paragraph request is usually a few thousand tokens in (mostly cached) and a few hundred out." : "Type the model ID, or load the list with your key.";
    $("#aiModelList").innerHTML = ""; line(""); claudeSel(p === "claude" ? [] : null);
  }
  function claudeSel(extra) {
    const sel = $("#aiModelSel"), inp = $("#aiModelIn"); if (!extra) { sel.hidden = true; inp.hidden = false; return; }
    const more = extra.filter(id => !CLAUDE_MODELS.some(x => x[0] === id) && /^claude/.test(id));
    sel.innerHTML = `<optgroup label="Current">${CLAUDE_MODELS.slice(0, 4).map(([id, n, d, pr]) => `<option value="${id}">Claude ${n}: ${d} (${pr})</option>`).join("")}</optgroup><optgroup label="Earlier">${CLAUDE_MODELS.slice(4).map(([id, n, d, pr]) => `<option value="${id}">Claude ${n} (${pr})</option>`).join("")}</optgroup>${more.length ? `<optgroup label="Also on your account">${more.map(id => `<option value="${esc(id)}">${esc(id)}</option>`).join("")}</optgroup>` : ""}<option value="__other">Other: type a model ID…</option>`;
    const v = inp.value.trim() || AI_PROVIDERS.claude.def; sel.value = [...sel.options].some(o => o.value === v) ? v : "__other"; sel.hidden = false; inp.hidden = sel.value !== "__other";
  }
  $("#aiModelSel").addEventListener("change", e => { const v = e.target.value, inp = $("#aiModelIn"); if (v === "__other") { inp.hidden = false; inp.value = ""; inp.focus(); } else { inp.hidden = true; inp.value = v; } });
  $$("input[name=provider]", m).forEach(r => r.addEventListener("change", show)); show();
  $("[data-aitest]", m).addEventListener("click", async () => {
    const p = val(); line("Checking…");
    try { const ids = await aiListModels(p, $("#aiKeyIn").value.trim(), p === "custom" ? $("#aiBaseIn").value.trim() : AI_PROVIDERS[p].base || ""); if (p === "claude") claudeSel(ids); $("#aiModelList").innerHTML = ids.map(x => `<option value="${esc(x)}">`).join(""); line(`Key works. ${ids.length} models available: pick one in the Model box.`, "ok"); }
    catch (e) { line("Did not work: " + (e instanceof TypeError ? "could not reach the server" : e.message), "err"); }
  });
  const v = await pr; m.classList.remove("ai-set"); if (!v) return;
  keys[shown] = v.key; models[shown] = (v.model || "").trim();
  for (const [p, k] of Object.entries(keys)) if (p !== "demo") aiSetKey(p, (k || "").trim(), v.remember);
  aiSetCfg({ provider: v.provider, models: Object.fromEntries(Object.entries(models).filter(([, x]) => x)), base: (v.base || "").trim(), effort: v.effort, remember: v.remember, presets: (() => { const l = (v.presets || "").split("\n").map(x => x.trim()).filter(Boolean).slice(0, 16); return l.length ? l : AI_PRESETS; })() });
  aiHome(); if (S.doc) aiRenderChat(); toast("AI: " + aiWho());
}

function aiReviewMenu(anchor) {
  const n = $$(".ai-chg[data-ai]:not(.busy)", flowEl).length, h = allHunks().length;
  menu([{ head: n ? `${h} change${h === 1 ? "" : "s"} in ${n} AI suggestion${n === 1 ? "" : "s"}` : "No AI suggestions to review" },
    { label: (Prefs.get("aiMarkup", true) ? "✓ " : "") + "Show changes", sub: "Off: the text reads as if every change were accepted", fn: () => aiMarkup(!Prefs.get("aiMarkup", true)) },
    { sep: true }, { label: "Next change", k: "Alt+↓", fn: () => aiStep(1) }, { label: "Previous change", k: "Alt+↑", fn: () => aiStep(-1) },
    { label: "Accept change", k: "Tab", fn: () => aiDecide(aiHunk, true) }, { label: "Reject change", k: "Esc", fn: () => aiDecide(aiHunk, false) },
    { sep: true }, { label: "Accept all changes in the document", fn: () => aiDecideAll(true) }, { label: "Reject all changes in the document", fn: () => aiDecideAll(false) },
    { sep: true }, { label: "Ask AI about the selection", k: "Alt+A", fn: () => { useRange?.(); aiAskOpen(); } }, { label: "AI chat panel", fn: () => aiTogglePanel() }, { label: "AI model…", sub: aiWho(), fn: () => aiModelMenu(anchor) }, { label: "AI settings…", fn: () => aiSettings() }], anchor);
}
function aiHome() { const w = $("#aiHomeWho"); if (w) w.textContent = aiWho(); }

/* ---- keep exports, the web view and undo honest about pending suggestions ---- */
/* exports and saves write the text without unreviewed suggestions (their original text), like Word's "Original" view */
function withOriginals(fn) {
  return function (...args) {
    const chg = S.doc?.kind === "flow" ? $$(".ai-chg[data-ai]", flowEl) : []; if (!chg.length) return fn.apply(this, args);
    const saved = chg.map(el => { const f = aiChange(el.dataset.ai) ? aiOrigFrag(el) : document.createTextNode(el.textContent), nodes = f.nodeType === 11 ? [...f.childNodes] : [f]; if (!nodes.length) nodes.push(document.createTextNode("")); el.replaceWith(...nodes); return { el, nodes }; });
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
    aiActive = null; aiHunk = null; aiAskClose();
    if (S.doc?.kind === "flow" && /ai-chg/.test(S.doc.html || "")) { const t = EL("div", { html: S.doc.html }); for (const s of t.querySelectorAll(".ai-chg")) { const ch = S.doc.ai?.changes?.[s.dataset.ai]; if (!ch || s.classList.contains("busy") || !ch.sugg?.[ch.cur]) s.replaceWith(ch ? lightOrHtml(ch.oldHtml) : document.createTextNode(s.textContent)); else s.classList.remove("on"); } S.doc.html = t.innerHTML; }
    const r = await sd(); aiMarkup(); aiSync(); return r;
  }; }
{ const gh = goHome; goHome = function () { aiActive = null; aiHunk = null; aiBar(); aiAskClose(); return gh(); }; }

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
  else if (a === "aiMarkup") aiMarkup(!Prefs.get("aiMarkup", true));
  else if (a === "wReview") aiReviewMenu(b);
  else if (a === "aiSample") openDoc(newDoc("flow", "Sample paper (made up)", { html: AI_SAMPLE }));
});
$("[data-act=aiAsk]")?.addEventListener("pointerdown", e => e.preventDefault());
{ const bs = buildSwatches; let once = false; buildSwatches = function () { bs(); if (once) return; once = true; aiHome(); if (!Prefs.get("aiPanel", false)) aiTogglePanel(false); else { $("#aiPanelBtn")?.classList.add("on"); if (innerWidth < 1500) $("#right").classList.add("closed"); } }; }
Object.assign(window, { aiAskOpen, aiRequest, aiAccept, aiReject, aiAgain, aiSettings, aiDiff, aiState, aiTarget, demoRevise });
