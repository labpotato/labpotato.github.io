/* ============================================================
   Support Lab Potato (후원): a gentle "Buy me a coffee", asked by the potato, not by the website.

   SET UP: the links below. Leave one empty to hide it; both empty shows nothing anywhere.
     coffee: your Buy Me a Coffee page
     paypal: your PayPal.Me link (optional)

   The homepage shows a small card above the footer: a sleepy potato that wakes up when you point
   at the button, a line about life at the bench, and "Buy me a coffee" in plain words.
   Each tool shows a small pill (a tiny potato and "Buy me a coffee") after a minute of use, only in
   a free corner; its ✕ hides it for 30 days. Loaded by the homepage and every tool's latest version.
   ============================================================ */
(function () {
  const SUPPORT = {
    coffee: "https://buymeacoffee.com/bdongmin",
    paypal: "",
  };
  const cfg = Object.assign({}, SUPPORT, window.LP_SUPPORT || {});   // LP_SUPPORT: for testing only
  const links = [
    cfg.coffee && { href: cfg.coffee, label: "Buy me a coffee" },
    cfg.paypal && { href: cfg.paypal, label: "PayPal" },
  ].filter(Boolean);
  if (!links.length) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* the potato: asleep (eyes shut, a few z's drifting up) until you point at the button, then it wakes and smiles */
  const SPUD = (cls) => `<svg class="${cls}" viewBox="0 0 240 200" aria-hidden="true">
    <g class="zz"><text x="186" y="44">z</text><text x="204" y="26">z</text></g>
    <g class="body"><ellipse cx="122" cy="190" rx="70" ry="7" fill="rgba(60,40,20,.12)"/>
      <path d="M28 118C26 88 52 64 88 56C124 48 168 52 196 70C220 86 226 112 216 136C204 164 168 182 128 184C88 186 50 172 36 148C30 138 28 128 28 118Z" fill="#cd9050"/>
      <ellipse cx="74" cy="134" rx="12" ry="7" fill="#f2a08a" opacity=".55"/><ellipse cx="176" cy="130" rx="12" ry="7" fill="#f2a08a" opacity=".55"/>
      <g class="shut"><path d="M84 114q12 9 24 0" /><path d="M140 111q12 9 24 0" /><path d="M116 146q10 4 20 0" /></g>
      <g class="open"><ellipse class="eye" cx="96" cy="112" rx="11" ry="13"/><ellipse class="eye" cx="152" cy="109" rx="11" ry="13"/><circle cx="99" cy="107" r="3.5" fill="#fff"/><circle cx="155" cy="104" r="3.5" fill="#fff"/><path class="smile" d="M108 140Q126 158 144 138"/></g>
    </g></svg>`;
  const SPUD_CSS = `
.zz text{font:800 30px/1 system-ui,sans-serif;fill:#b5753a;opacity:0;animation:lps-z 3s ease-in infinite}.zz text:nth-child(2){font-size:22px;animation-delay:1.4s}
@keyframes lps-z{0%{opacity:0;transform:translate(0,8px)}30%{opacity:.8}100%{opacity:0;transform:translate(10px,-18px)}}
.body{transform-origin:50% 95%;animation:lps-breathe 3.2s ease-in-out infinite}
@keyframes lps-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.02,.975)}}
.shut path{fill:none;stroke:#2a2018;stroke-width:6;stroke-linecap:round}
.open{display:none}.open .eye{fill:#2a2018;transform-box:fill-box;transform-origin:center;animation:lps-blink 4s infinite}.open .smile{fill:none;stroke:#2a2018;stroke-width:8;stroke-linecap:round}
@keyframes lps-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
.awake .shut,.awake .zz{display:none}.awake .open{display:inline}.awake .body{animation:lps-hop .5s cubic-bezier(.3,1.6,.5,1)}
@keyframes lps-hop{0%{transform:translateY(0)}40%{transform:translateY(-12px)}100%{transform:translateY(0)}}
@media (prefers-reduced-motion:reduce){.zz text,.body,.open .eye{animation:none!important}.zz text{opacity:.7}}`;

  /* a line from the bench: a different one now and then */
  const LINES = [
    "This potato has been running on cold-room coffee since its last failed PCR.",
    "Built between incubations, debugged while the gel was running.",
    "No grant, no ads, no accounts. Just one tired potato and a lot of caffeine.",
    "Every tool here started as \"there has to be a better way than this\" at 1 a.m.",
    "Somewhere a PhD student is counting colonies by hand. This potato is trying to stop that.",
  ];
  const line = LINES[Math.floor(Date.now() / 36e5) % LINES.length];   // changes every hour

  const home = document.getElementById("support-box");
  if (home) {
    const st = document.createElement("style");
    st.textContent = SPUD_CSS + `
.lps-card{max-width:720px;margin:0 auto 34px;padding:20px 26px;border-radius:22px;display:flex;align-items:center;gap:22px;background:var(--surface,#fff);border:1px solid var(--border,#e4e7ec);box-shadow:0 14px 34px -26px rgba(60,40,20,.5);color:var(--text,#1b2230);text-align:left}
.lps-card .spud{flex:none;width:118px;height:auto;overflow:visible}
.lps-card h3{margin:0 0 4px;font-size:18px;letter-spacing:-.01em}.lps-card p{margin:0 0 12px;font-size:14.5px;line-height:1.5;color:var(--text-muted,#5a6272)}
.lps-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px}
.lps-btn{display:inline-flex;align-items:center;padding:10px 16px;border-radius:11px;font-weight:650;font-size:14.5px;line-height:1;font-family:inherit;text-decoration:none!important;color:#7a4a1c!important;background:#fbefe0;border:1px solid #efd3b0;transition:background .15s,transform .15s,box-shadow .15s}
.lps-btn:hover,.lps-btn:focus-visible{background:#f7e2c8;transform:translateY(-1px);box-shadow:0 8px 18px -10px rgba(160,100,40,.6)}
.lps-alt{font-size:13px;color:var(--text-muted,#667)!important}
.lps-free{font-size:12.5px;color:var(--text-muted,#7a8190)}
@media (max-width:560px){.lps-card{flex-direction:column;text-align:center}.lps-row{justify-content:center}.lps-card .spud{width:96px}}
@media print{.lps-card{display:none!important}}`;
    document.head.append(st);
    const main = links[0], alt = links[1];
    home.innerHTML = `<div class="lps-card"><span class="spud-wrap">${SPUD("spud")}</span><div>
      <h3>Running on caffeine and approaching thesis deadlines</h3>
      <p>${esc(line)} If one of these tools gave you an afternoon back, you could give this potato a coffee.</p>
      <div class="lps-row"><a class="lps-btn" href="${esc(main.href)}" target="_blank" rel="noopener">${esc(main.label)}</a>${alt ? `<a class="lps-alt" href="${esc(alt.href)}" target="_blank" rel="noopener">or ${esc(alt.label)}</a>` : ""}<span class="lps-free">No pressure. The tools stay free either way.</span></div></div></div>`;
    const spud = home.querySelector(".spud"), b = home.querySelector(".lps-btn");
    const wake = on => () => spud.classList.toggle("awake", on);
    b.addEventListener("pointerenter", wake(true)); b.addEventListener("pointerleave", wake(false));
    b.addEventListener("focus", wake(true)); b.addEventListener("blur", wake(false));
    b.addEventListener("click", wake(true));
    return;
  }

  // a tool: a small pill after a minute of use, in its own shadow root (no tool's styles reach it),
  // only in a corner where nothing of the tool's own is; no free corner, no pill.
  const KEY = "lp-support-hidden";
  try { if (Date.now() - (+localStorage.getItem(KEY) || 0) < 30 * 864e5) return; } catch (e) { /* storage blocked: still show */ }
  const pillCss = `:host{all:initial}` + SPUD_CSS + `
.p{display:flex;align-items:center;gap:2px;padding:3px 3px 3px 4px;border-radius:999px;background:rgba(255,255,255,.96);border:1px solid rgba(0,0,0,.12);box-shadow:0 6px 18px -8px rgba(0,0,0,.35);font:600 12.5px/1 system-ui,-apple-system,"Segoe UI",sans-serif;opacity:0;transform:translateY(8px);transition:opacity .3s,transform .3s;white-space:nowrap}
.p.in{opacity:.94;transform:none}.p:hover{opacity:1}
a{display:inline-flex;align-items:center;gap:6px;padding:4px 11px 4px 4px;border-radius:999px;color:#5a3a1a;text-decoration:none}a:hover{background:#fff4e6}
.mini{width:30px;height:26px;overflow:visible}.mini .zz{display:none}
button{all:unset;display:grid;place-items:center;color:#999;width:24px;height:24px;border-radius:50%;cursor:pointer;font-size:12px}button:hover{background:#eee;color:#333}
@media (prefers-color-scheme:dark){.p{background:rgba(30,36,46,.96);border-color:rgba(255,255,255,.14)}a{color:#f2e3cf}a:hover{background:#3a3226}}`;
  const start = () => {
    const host = document.createElement("div"); host.id = "lp-support"; host.setAttribute("role", "complementary"); host.setAttribute("aria-label", "Support Lab Potato");
    host.style.cssText = "position:fixed!important;z-index:2147483000!important;left:12px;bottom:12px;width:auto!important;height:auto!important;margin:0!important;padding:0!important;visibility:hidden";
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${pillCss}</style><div class="p"><a href="${esc(links[0].href)}" target="_blank" rel="noopener" title="${esc(line)} A coffee keeps the tools free.">${SPUD("mini")}${esc(links[0].label)}</a><button type="button" aria-label="Hide for 30 days" title="Hide for 30 days">✕</button></div>`;
    const pill = root.querySelector(".p"), a = root.querySelector("a"), mini = root.querySelector(".mini");
    a.addEventListener("pointerenter", () => mini.classList.add("awake")); a.addEventListener("pointerleave", () => mini.classList.remove("awake"));
    let stop = false;
    root.querySelector("button").addEventListener("click", () => { stop = true; host.remove(); try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* not remembered */ } });
    document.body.append(host);
    const m = 12, spots = [{ left: m, bottom: m }, { right: m, bottom: m }, { left: m, bottom: 64 }, { right: m, bottom: 64 }];
    const busy = (x0, y0, w, h) => {
      const R = { l: x0 - 4, t: y0 - 4, r: x0 + w + 4, b: y0 + h + 4 }, A = innerWidth * innerHeight * 0.25;
      for (const t of document.body.querySelectorAll("*")) {
        if (t === host) continue;
        const r = t.getBoundingClientRect();
        if (!r.width || !r.height || r.right <= R.l || r.left >= R.r || r.bottom <= R.t || r.top >= R.b || r.width * r.height > A) continue;
        const cs = getComputedStyle(t); if (cs.visibility === "hidden" || +cs.opacity === 0 || cs.display === "none") continue;
        if (t.matches("a,button,input,select,textarea,label,[role=button],[contenteditable=true]")) return true;
        if (/^(fixed|absolute|sticky)$/.test(cs.position)) return true;
        const bg = cs.backgroundColor.match(/[\d.]+/g);
        if ((bg && (bg.length < 4 || +bg[3] > 0.3)) || cs.boxShadow !== "none") return true;
      }
      return false;
    };
    const place = () => {
      if (stop || !host.isConnected) return;
      const w = host.offsetWidth, h = host.offsetHeight, W = innerWidth, H = innerHeight;
      const spot = spots.find(sp => !busy(sp.left != null ? sp.left : W - sp.right - w, H - sp.bottom - h, w, h));
      if (!spot) { host.style.visibility = "hidden"; pill.classList.remove("in"); return; }
      host.style.left = spot.left != null ? spot.left + "px" : "auto"; host.style.right = spot.right != null ? spot.right + "px" : "auto"; host.style.bottom = spot.bottom + "px";
      host.style.visibility = "visible"; requestAnimationFrame(() => pill.classList.add("in"));
    };
    const check = () => { if (stop || !host.isConnected) return; host.style.visibility = "hidden"; place(); };
    setTimeout(place, 800);   // after the tool's own messages have finished fading in
    [2500, 6000, 12000, 25000, 45000].forEach(t => setTimeout(check, t));
    addEventListener("resize", () => { clearTimeout(check.t); check.t = setTimeout(check, 300); });
    addEventListener("scroll", () => { clearTimeout(check.t); check.t = setTimeout(check, 500); }, { passive: true, capture: true });
  };
  setTimeout(start, (window.LP_SUPPORT && window.LP_SUPPORT.delay != null) ? window.LP_SUPPORT.delay : 60000);
})();
