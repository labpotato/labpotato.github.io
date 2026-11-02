/* ============================================================
   Support Lab Potato (후원): Buy Me a Coffee and PayPal buttons.

   SET UP: paste your links below and save. Leave a link empty to hide that button;
   with both empty nothing is shown anywhere.
     coffee: your Buy Me a Coffee page, e.g. "https://buymeacoffee.com/yourname"
     paypal: your PayPal.Me link,       e.g. "https://paypal.me/yourname"

   The homepage shows a "Support Lab Potato" card above the footer. Each tool shows a small
   "☕ Support" pill in the bottom-left corner after a minute of use; its ✕ hides it for 30 days.
   This file is loaded by the homepage and by the latest version of every tool.
   ============================================================ */
(function () {
  const SUPPORT = {
    coffee: "",
    paypal: "",
  };
  const cfg = Object.assign({}, SUPPORT, window.LP_SUPPORT || {});   // LP_SUPPORT: for testing only
  const links = [
    cfg.coffee && { href: cfg.coffee, cls: "coffee", icon: "☕", label: "Buy me a coffee" },
    cfg.paypal && { href: cfg.paypal, cls: "paypal", icon: "♥", label: "Donate with PayPal" },
  ].filter(Boolean);
  if (!links.length) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const btn = l => `<a class="lps-btn lps-${l.cls}" href="${esc(l.href)}" target="_blank" rel="noopener"><span aria-hidden="true">${l.icon}</span>${l.label}</a>`;
  const css = `
.lps-card{max-width:760px;margin:0 auto 34px;padding:22px 24px;border-radius:20px;text-align:center;background:linear-gradient(135deg,#fff7ec,#fdf1e2);border:1px solid #f1dcc0;box-shadow:0 14px 34px -22px rgba(120,70,20,.45);color:#2b2118;font-family:inherit}
.lps-card h3{margin:0 0 6px;font-size:20px;letter-spacing:-.01em}.lps-card p{margin:0 auto 14px;max-width:52ch;font-size:15px;line-height:1.5;color:#5a4a3a}
.lps-row{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
.lps-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:12px;font:650 15px/1 system-ui,-apple-system,"Segoe UI",sans-serif;text-decoration:none!important;transition:transform .15s,box-shadow .15s}
.lps-btn:hover{transform:translateY(-1px)}
.lps-coffee{background:#ffdd00;color:#1b1b1b!important;box-shadow:0 6px 16px -8px rgba(160,130,0,.7)}
.lps-paypal{background:#0070ba;color:#fff!important;box-shadow:0 6px 16px -8px rgba(0,80,160,.7)}
@media print{.lps-card,#lp-support{display:none!important}}
`;
  const st = document.createElement("style"); st.textContent = css; document.head.append(st);

  const home = document.getElementById("support-box");
  if (home) {   // the homepage: a card above the footer
    home.innerHTML = `<div class="lps-card"><h3>Support Lab Potato</h3><p>Every tool here is free, with no ads and no account. If one saved you an afternoon, a coffee keeps the next one coming.</p><div class="lps-row">${links.map(btn).join("")}</div></div>`;
    return;
  }
  // a tool: a small pill after a minute of use. It lives in its own shadow root, so no tool's styles reach it,
  // and it only takes a corner where nothing of the tool's own is (re-checked for a while, as tools show
  // messages a moment later); no free corner, no pill.
  const KEY = "lp-support-hidden";
  try { if (Date.now() - (+localStorage.getItem(KEY) || 0) < 30 * 864e5) return; } catch (e) { /* storage blocked: still show */ }
  const pillCss = `:host{all:initial}
.p{display:flex;align-items:center;gap:2px;padding:3px;border-radius:999px;background:rgba(255,255,255,.96);border:1px solid rgba(0,0,0,.12);box-shadow:0 6px 18px -8px rgba(0,0,0,.35);font:600 12.5px/1 system-ui,-apple-system,"Segoe UI",sans-serif;opacity:0;transform:translateY(8px);transition:opacity .3s,transform .3s;white-space:nowrap}
.p.in{opacity:.92;transform:none}.p:hover{opacity:1}
a{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:999px;color:#3a2a1a;text-decoration:none}a:hover{background:#fff4d6}
button{all:unset;display:grid;place-items:center;color:#888;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:13px}button:hover{background:#eee;color:#333}
@media (prefers-color-scheme:dark){.p{background:rgba(30,36,46,.96);border-color:rgba(255,255,255,.14)}a{color:#f2e8dc}a:hover{background:#3a3226}}`;
  const start = () => {
    const host = document.createElement("div"); host.id = "lp-support"; host.setAttribute("role", "complementary"); host.setAttribute("aria-label", "Support Lab Potato");
    host.style.cssText = "position:fixed!important;z-index:2147483000!important;left:12px;bottom:12px;width:auto!important;height:auto!important;margin:0!important;padding:0!important;visibility:hidden";
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${pillCss}</style><div class="p"><span class="links"><a href="${esc(links[0].href)}" target="_blank" rel="noopener" title="${links.map(l => l.label).join(" or ")}"><span aria-hidden="true">☕</span>Support</a></span><button type="button" aria-label="Hide for 30 days" title="Hide for 30 days">✕</button></div>`;
    const pill = root.querySelector(".p");
    if (links.length > 1) root.querySelector("a").addEventListener("click", e => {   // two links: a tiny choice
      e.preventDefault(); root.querySelector(".links").innerHTML = links.map(l => `<a href="${esc(l.href)}" target="_blank" rel="noopener"><span aria-hidden="true">${l.icon}</span>${l.label}</a>`).join("");
    }, { once: true });
    let stop = false;
    root.querySelector("button").addEventListener("click", () => { stop = true; host.remove(); try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* not remembered */ } });
    document.body.append(host);
    const m = 12, spots = [{ left: m, bottom: m }, { right: m, bottom: m }, { left: m, bottom: 64 }, { right: m, bottom: 64 }];
    // busy: something of the tool's own overlaps the spot: a control, or a small floating, positioned or boxed
    // element (a note, toast, chip or toolbar), even one the mouse passes through. Plain text is fine.
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
    // hidden while it checks, so its own body never counts as "busy"
    const check = () => { if (stop || !host.isConnected) return; host.style.visibility = "hidden"; place(); };
    setTimeout(place, 800);   // after the tool's own messages have finished fading in
    [2500, 6000, 12000, 25000, 45000].forEach(t => setTimeout(check, t));
    addEventListener("resize", () => { clearTimeout(check.t); check.t = setTimeout(check, 300); });
    addEventListener("scroll", () => { clearTimeout(check.t); check.t = setTimeout(check, 500); }, { passive: true, capture: true });   // scrolling may free a corner, or fill one
  };
  setTimeout(start, (window.LP_SUPPORT && window.LP_SUPPORT.delay != null) ? window.LP_SUPPORT.delay : 60000);
})();
