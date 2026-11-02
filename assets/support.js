/* ============================================================
   Support Lab Potato (후원): a gentle "Buy me a coffee", asked by the potato, not by the website.

   SET UP: the links below. Leave one empty to hide it; both empty shows nothing anywhere.
     coffee: your Buy Me a Coffee page
     paypal: your PayPal.Me link

   The homepage shows a small card above the footer: a sleepy potato that wakes up when you point
   at the button, a line about life at the bench, and "Buy me a coffee" in plain words.
   Each tool shows one line in small print at the end of the page, and, now and then, a friendlier card
   with the potato right after an export. Loaded by the homepage and every tool's latest version.
   ============================================================ */
(function () {
  const SUPPORT = {
    coffee: "https://buymeacoffee.com/bdongmin",
    paypal: "https://paypal.me/bdongmin",
  };
  const cfg = Object.assign({}, SUPPORT, window.LP_SUPPORT || {});   // LP_SUPPORT: for testing only
  const links = [
    cfg.coffee && { href: cfg.coffee, label: "Buy me a coffee", icon: "cup" },
    cfg.paypal && { href: cfg.paypal, label: "PayPal", icon: "heart" },
  ].filter(Boolean);
  if (!links.length) return;
  /* small line icons, drawn in the button's own colour */
  const ICON = {
    cup: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3.5c-.6.8.6 1.4 0 2.2M12 3.5c-.6.8.6 1.4 0 2.2"/></svg>',
    heart: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
  };
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
.lps-btn .ic{width:17px;height:17px;margin-right:7px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.lps-btn.alt{color:#1d4f86!important;background:#eaf2fb;border-color:#cfe0f3}.lps-btn.alt:hover,.lps-btn.alt:focus-visible{background:#dde9f8;box-shadow:0 8px 18px -10px rgba(30,80,140,.5)}
.lps-free{font-size:12.5px;color:var(--text-muted,#7a8190)}
@media (max-width:560px){.lps-card{flex-direction:column;text-align:center}.lps-row{justify-content:center}.lps-card .spud{width:96px}}
@media print{.lps-card{display:none!important}}`;
    document.head.append(st);
    const main = links[0], alt = links[1];
    home.innerHTML = `<div class="lps-card"><span class="spud-wrap">${SPUD("spud")}</span><div>
      <h3>Running on caffeine and approaching thesis deadlines</h3>
      <p>${esc(line)} If one of these tools gave you an afternoon back, it would be great if you could buy this potato a coffee. Your generous support helps motivate me to keep updating these tools and building new ones.</p>
      <div class="lps-row">${links.map((l, i) => `<a class="lps-btn${i ? " alt" : ""}" href="${esc(l.href)}" target="_blank" rel="noopener">${ICON[l.icon]}${esc(l.label)}</a>`).join("")}<span class="lps-free">No pressure. The tools stay free either way.</span></div></div></div>`;
    const spud = home.querySelector(".spud");
    const wake = on => () => spud.classList.toggle("awake", on);
    home.querySelectorAll(".lps-btn").forEach(b => {   // either button wakes the potato
      b.addEventListener("pointerenter", wake(true)); b.addEventListener("pointerleave", wake(false));
      b.addEventListener("focus", wake(true)); b.addEventListener("blur", wake(false)); b.addEventListener("click", wake(true));
    });
    return;
  }

  /* ---------- in a tool ----------
     1. a short line in small print at the end of the page (the tool's own footer, or the end of its main panel);
     2. right after an export, a friendlier card with the happy potato, now and then (at most every 3 days, and
        not for 60 days after someone has followed a support link). */
  const now = () => Date.now(), get = k => { try { return +localStorage.getItem(k) || 0; } catch (e) { return 0; } }, put = k => { try { localStorage.setItem(k, String(now())); } catch (e) { /* not remembered */ } };
  const GAVE = "lp-support-gave", SHOWN = "lp-support-export";
  const mark = e => { if (e.target.closest && e.target.closest("a.lps-go")) put(GAVE); };
  document.addEventListener("click", mark, true);

  // 1. the line at the end of the page
  const TARGETS = ["footer.site-footer", "footer.wm-footer", ".rail .footer", "#sbwrap", "aside#panel", "main#main", "main#home", "main#app", "footer"];
  const lineHtml = `Made between experiments by one tired potato. If this tool saved you some time, it would be great if you could <a class="lps-go" href="${esc(links[0].href)}" target="_blank" rel="noopener">${esc(links[0].label.toLowerCase())}</a>${links[1] ? ` or chip in on <a class="lps-go" href="${esc(links[1].href)}" target="_blank" rel="noopener">${esc(links[1].label)}</a>` : ""}. Your generous support helps motivate me to keep updating and building more tools.`;
  const lineCss = document.createElement("style");
  lineCss.textContent = `.lps-line{display:block;margin:14px auto 6px;padding:0 12px;max-width:640px;text-align:center;font-size:12px!important;line-height:1.5;opacity:.72;font-style:normal;letter-spacing:normal}
.lps-line a{color:inherit!important;text-decoration:underline!important;text-underline-offset:2px;font-weight:600}.lps-line a:hover{opacity:1;color:#b5753a!important}
@media print{.lps-line{display:none!important}}`;
  document.head.append(lineCss);
  const placeLine = () => {
    const host = TARGETS.map(sel => document.querySelector(sel)).find(Boolean); if (!host) return;
    let el = document.querySelector(".lps-line");
    if (el && el.parentElement === host && el === host.lastElementChild) return;
    if (!el) { el = document.createElement("p"); el.className = "lps-line"; el.innerHTML = lineHtml; }
    host.append(el);
  };
  const lineSoon = (() => { let t; return () => { clearTimeout(t); t = setTimeout(placeLine, 400); }; })();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(placeLine, 600)); else setTimeout(placeLine, 600);
  new MutationObserver(ms => { if (ms.some(m => !(m.target.closest && m.target.closest(".lps-line")))) lineSoon(); }).observe(document.documentElement, { childList: true, subtree: true });

  // 2. after an export: downloads (links with "download", saved files), the save dialog, print / save as PDF
  const cardCss = `:host{all:initial}` + SPUD_CSS + `
.c{position:relative;display:flex;gap:14px;align-items:center;width:min(380px,calc(100vw - 24px));box-sizing:border-box;padding:16px 16px 14px 12px;border-radius:18px;background:#fffaf3;border:1px solid #f0dcc2;box-shadow:0 22px 50px -18px rgba(90,55,20,.45);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;color:#2b2118;opacity:0;transform:translateY(14px) scale(.98);transition:opacity .35s,transform .35s cubic-bezier(.2,.9,.3,1.2)}
.c.in{opacity:1;transform:none}
.spud{flex:none;width:86px;height:auto;overflow:visible}
b{display:block;font-size:15px;margin-bottom:2px}p{margin:0 0 10px;color:#5a4a3a}
.r{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
a{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:10px;font-weight:650;font-size:13.5px;text-decoration:none;color:#7a4a1c;background:#fbefe0;border:1px solid #efd3b0}
a.alt{color:#1d4f86;background:#eaf2fb;border-color:#cfe0f3}a:hover{filter:brightness(.97);transform:translateY(-1px)}
.ic{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.later{all:unset;cursor:pointer;font-size:12.5px;color:#8a7a6a;padding:6px 4px}.later:hover{color:#2b2118}
.x{all:unset;position:absolute;top:6px;right:8px;width:24px;height:24px;display:grid;place-items:center;border-radius:50%;color:#a99;cursor:pointer;font-size:13px}.x:hover{background:#f3e6d6;color:#333}
@media (prefers-color-scheme:dark){.c{background:#2a241d;border-color:#4a3c2c;color:#f3e8da}p{color:#d8c8b4}.later{color:#b8a894}}`;
  let cardOpen = false;
  const exported = () => {
    if (cardOpen || now() - get(GAVE) < 60 * 864e5 || now() - get(SHOWN) < 3 * 864e5) return;
    cardOpen = true; put(SHOWN);
    setTimeout(() => {
      const host = document.createElement("div"); host.id = "lp-support-card"; host.setAttribute("role", "status");
      host.style.cssText = "position:fixed!important;z-index:2147483000!important;right:16px;bottom:16px;width:auto!important;height:auto!important;margin:0!important;padding:0!important";
      const root = host.attachShadow({ mode: "open" });
      root.innerHTML = `<style>${cardCss}</style><div class="c">${SPUD("spud awake")}<div><b>Saved! Your file is on its way.</b><p>If that just saved you an afternoon, it would be great if you could buy this potato a coffee. Your generous support helps motivate me to keep updating and building more tools.</p>
        <div class="r">${links.map((l, i) => `<a class="lps-go${i ? " alt" : ""}" href="${esc(l.href)}" target="_blank" rel="noopener">${ICON[l.icon]}${esc(l.label)}</a>`).join("")}<button class="later" type="button">Maybe later</button></div></div><button class="x" type="button" aria-label="Close">✕</button></div>`;
      const card = root.querySelector(".c");
      const close = () => { card.classList.remove("in"); setTimeout(() => { host.remove(); cardOpen = false; }, 350); };
      root.querySelectorAll(".later,.x").forEach(b => b.addEventListener("click", close));
      root.querySelectorAll("a").forEach(a => a.addEventListener("click", () => { put(GAVE); setTimeout(close, 300); }));
      let t = setTimeout(close, 15000);   // leaves by itself, unless the pointer is on it
      card.addEventListener("pointerenter", () => clearTimeout(t)); card.addEventListener("pointerleave", () => { t = setTimeout(close, 6000); });
      document.body.append(host); requestAnimationFrame(() => card.classList.add("in"));
    }, 1100);
  };
  const isDl = a => a && a.hasAttribute && a.hasAttribute("download");
  const ac = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (isDl(this)) exported(); return ac.apply(this, arguments); };
  const ad = EventTarget.prototype.dispatchEvent;
  HTMLAnchorElement.prototype.dispatchEvent = function (ev) { if (ev && ev.type === "click" && isDl(this)) exported(); return ad.apply(this, arguments); };
  document.addEventListener("click", e => { const a = e.target.closest && e.target.closest("a[download]"); if (a) exported(); }, true);
  if (window.showSaveFilePicker) { const sp = window.showSaveFilePicker; window.showSaveFilePicker = function () { const r = sp.apply(this, arguments); Promise.resolve(r).then(() => setTimeout(exported, 1500), () => {}); return r; }; }
  addEventListener("afterprint", exported);
})();
