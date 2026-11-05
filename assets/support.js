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


  /* An arm is one piece: a lab-coat sleeve from the shoulder, a cuff, and the hand coming out of it.
     The whole piece turns about the shoulder, so the sleeve always follows the hand.
     p = [shoulder x,y, control 1 x,y, control 2 x,y, cuff x,y]; inner = what the hand holds. */
  const ARM = (cls, p, inner = "") => {
    const [sx, sy, ax, ay, bx, by, ex, ey] = p, L = Math.hypot(ex - bx, ey - by) || 1, ux = (ex - bx) / L, uy = (ey - by) / L;
    const hx = ex + ux * 9, hy = ey + uy * 9, ang = Math.atan2(uy, ux) * 180 / Math.PI, d = `M${sx} ${sy}C${ax} ${ay} ${bx} ${by} ${ex} ${ey}`;
    const cx = ex - ux * 2.5, cy = ey - uy * 2.5;
    return `<g class="${cls}" style="transform-origin:${sx}px ${sy}px">
      <ellipse cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" rx="8.2" ry="7" transform="rotate(${ang.toFixed(0)} ${hx.toFixed(1)} ${hy.toFixed(1)})" fill="#c58a4e" stroke="#9e6832" stroke-width="1.4"/>${inner}
      <path d="${d}" fill="none" stroke="#b4bfcf" stroke-width="18" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#fbfcfe" stroke-width="14.6" stroke-linecap="round"/>
      <path d="M${(cx - uy * 7.3).toFixed(1)} ${(cy + ux * 7.3).toFixed(1)}L${(cx + uy * 7.3).toFixed(1)} ${(cy - ux * 7.3).toFixed(1)}" stroke="#d3dae5" stroke-width="3" stroke-linecap="round"/></g>`;
  };
  /* the mascot's coat, the same in the desk scene and in the card */
  const COAT = `<path class="coat" d="M94 158C76 162 58 166 51 177C43 191 41 203 42 216C80 223 176 223 214 216C215 203 213 191 205 177C198 166 180 162 162 157L126 190Z" fill="#fbfcfe" stroke="#ccd4e0" stroke-width="1.8"/>
        <path d="M94 158L126 190M162 157L126 190" stroke="#ccd4e0" stroke-width="2" fill="none" stroke-linecap="round"/>
        <rect x="64" y="184" width="28" height="20" rx="3" fill="none" stroke="#ccd4e0" stroke-width="1.8"/>
        <path d="M74 179v10" stroke="#1f66cc" stroke-width="3.6" stroke-linecap="round"/>
        <circle cx="126" cy="199" r="2.6" fill="#ccd4e0"/><circle cx="126" cy="210" r="2.6" fill="#ccd4e0"/>`;
  const BODY_D = "M46 128C44 104 64 84 92 78C120 72 150 75 172 89C190 101 195 121 187 141C178 162 149 176 117 178C85 180 59 169 50 151C47 143 46 136 46 128Z";
  const GOGGLES = `<g class="goggles"><path d="M70 127L44 132M174 123L200 118" stroke="#39444e" stroke-width="11" stroke-linecap="round" fill="none"/>
          <rect x="72" y="102" width="100" height="45" rx="22" fill="none" stroke="#39444e" stroke-width="5"/>
          <rect x="79" y="108" width="86" height="33" rx="16" fill="#cfe6f2" fill-opacity=".3"/>
          <ellipse cx="76" cy="124" rx="3" ry="5.6" fill="#2b343d"/><ellipse cx="168" cy="124" rx="3" ry="5.6" fill="#2b343d"/></g>`;

  /* the card's potato is the mascot too: asleep at its desk with its arms down (eyes shut under the goggles,
     a few z's drifting up) until the card appears, then it wakes, smiles and waves; the sleeve swings with the hand */
  const SPUD = (cls) => `<svg class="${cls}" viewBox="24 64 216 164" aria-hidden="true">
    <defs><linearGradient id="lpc-skin" x1="0.2" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#d09760"/><stop offset="100%" stop-color="#bc8148"/></linearGradient></defs>
    <g class="zz"><text x="192" y="98">z</text><text x="210" y="82">z</text></g>
    <g class="body"><ellipse cx="128" cy="223" rx="80" ry="5" fill="rgba(60,40,20,.12)"/>
      <g class="up">${ARM("wave", [188, 180, 202, 168, 210, 150, 212, 134])}</g>
      <path d="${BODY_D}" fill="url(#lpc-skin)"/>
      <ellipse cx="80" cy="146" rx="8" ry="4.6" fill="#f2937f" opacity=".55"/><ellipse cx="164" cy="144" rx="8" ry="4.6" fill="#f2937f" opacity=".55"/>
      <g class="shut"><path d="M93 126q7 6 14 0M137 124q7 6 14 0"/><path d="M116 153h14"/></g>
      <g class="open"><ellipse class="eye" cx="100" cy="125" rx="6.6" ry="8.2"/><ellipse class="eye" cx="144" cy="123" rx="6.6" ry="8.2"/><circle cx="102.4" cy="121.4" r="2.2" fill="#fff"/><circle cx="146.4" cy="119.4" r="2.2" fill="#fff"/><path class="smile" d="M110 149Q123 163 137 148"/></g>
      ${GOGGLES}
      ${COAT}
      ${ARM("rest-l", [64, 176, 56, 186, 53, 196, 54, 205])}
      <g class="down">${ARM("rest-r", [192, 176, 200, 186, 203, 196, 202, 205])}</g>
    </g></svg>`;
  const SPUD_CSS = `
.zz text{font:800 30px/1 system-ui,sans-serif;fill:#b5753a;opacity:0;animation:lps-z 3s ease-in infinite}.zz text:nth-child(2){font-size:22px;animation-delay:1.4s}
@keyframes lps-z{0%{opacity:0;transform:translate(0,8px)}30%{opacity:.8}100%{opacity:0;transform:translate(10px,-18px)}}
.body{transform-origin:50% 95%;animation:lps-breathe 3.2s ease-in-out infinite}
@keyframes lps-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.02,.975)}}
.shut path{fill:none;stroke:#2a2018;stroke-width:3.6;stroke-linecap:round}
.up{display:none}.awake .up{display:inline}.awake .down{display:none}
.awake .wave{animation:lps-wave 1.1s ease-in-out .35s infinite}
@keyframes lps-wave{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(9deg)}}
.open{display:none}.open .eye{fill:#2a2018;transform-box:fill-box;transform-origin:center;animation:lps-blink 4s infinite}.open .smile{fill:none;stroke:#2a2018;stroke-width:4.4;stroke-linecap:round}
@keyframes lps-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
.awake .shut,.awake .zz{display:none}.awake .open{display:inline}.awake .body{animation:lps-hop .5s cubic-bezier(.3,1.6,.5,1)}
@keyframes lps-hop{0%{transform:translateY(0)}40%{transform:translateY(-12px)}100%{transform:translateY(0)}}
@media (prefers-reduced-motion:reduce){.zz text,.body,.open .eye,.wave{animation:none!important}.zz text{opacity:.7}}`;

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
    /* the homepage panel: a desk scene. The potato is burned out (eye bags, droopy eyes, sweat,
       a tall paper stack, an empty mug); pointing at a button brings coffee and it perks up; pressing one is a
       little celebration. */
    /* The site mascot itself: same body, goggles, lab coat and deadpan face as the hero on the
       homepage, only sat at a desk. Pointing at a button brings coffee and it looks up; pressing
       one is a small celebration. */
    const SCENE = `<svg class="scene" viewBox="0 0 260 220" aria-hidden="true">
      <defs><linearGradient id="lps-skin" x1="0.2" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#d09760"/><stop offset="100%" stop-color="#bc8148"/></linearGradient>
        <clipPath id="lps-clip"><path d="M46 128C44 104 64 84 92 78C120 72 150 75 172 89C190 101 195 121 187 141C178 162 149 176 117 178C85 180 59 169 50 151C47 143 46 136 46 128Z"/></clipPath></defs>
      <g class="papers"><rect x="10" y="166" width="60" height="31" rx="3" transform="rotate(-3 40 181)" fill="#fffdf8" stroke="#e3d4c2"/><path class="ink" d="M19 175h36M19 182h42M19 189h30" stroke="#c9b49a" stroke-width="2" stroke-linecap="round"/></g>
      <g class="pot">
        <!-- body -->
        <path class="body" d="${BODY_D}" fill="url(#lps-skin)"/>
        <g clip-path="url(#lps-clip)"><ellipse cx="58" cy="136" rx="6" ry="3.4" transform="rotate(-18 58 136)" fill="#8d5c24" opacity=".28"/><ellipse cx="180" cy="134" rx="5.6" ry="3.1" transform="rotate(18 180 134)" fill="#8d5c24" opacity=".28"/></g>
        <!-- face -->
        <g class="tired">
          <ellipse cx="100" cy="126" rx="7.2" ry="9" fill="#2a2018"/><ellipse cx="144" cy="124" rx="7.2" ry="9" fill="#2a2018"/>
          <path d="M92 139q8 5 16 -1M136 137q8 5 16 -1" stroke="#2a2018" stroke-width="2.2" stroke-linecap="round" fill="none" opacity=".34"/>
          <path d="M112 152h22" stroke="#2a2018" stroke-width="4" stroke-linecap="round" fill="none"/>
          <path class="sweat" d="M186 98c3.6 5.4 6 8.2 6 11.2a6 6 0 0 1-12 0c0-3 2.4-5.8 6-11.2z" fill="#9fd0ff" stroke="#5aa0e6" stroke-width="1.3"/>
        </g>
        <g class="happy">
          <path d="M92 130q8 -10 16 0M136 128q8 -10 16 0" fill="none" stroke="#2a2018" stroke-width="4.2" stroke-linecap="round"/>
          <ellipse cx="80" cy="144" rx="8.5" ry="5" fill="#f2937f" opacity=".7"/><ellipse cx="164" cy="142" rx="8.5" ry="5" fill="#f2937f" opacity=".7"/>
          <path d="M110 148q12 15 26 0z" fill="#5a2418"/><path d="M116 155q8 6 14 0q-7-2.5-14 0z" fill="#ff9a9a"/>
        </g>
        <!-- regulation eye protection, as on the homepage -->
        ${GOGGLES}
        <!-- raised arms sit under the coat, so each sleeve comes out of the shoulder -->
        <g class="arms-up">${ARM("wave-l", [72, 180, 58, 168, 46, 150, 42, 134], '<path class="hold-heart" d="M38 104c-3-4-9-2-9 3 0 4 9 9 9 9s9-5 9-9c0-5-6-7-9-3z" fill="#ff6b8a"/>')}${ARM("wave-r", [188, 180, 202, 168, 210, 150, 212, 134])}</g>
        <!-- lab coat -->
        ${COAT}
        <!-- at work: the left hand writes on the papers, the right rests on the desk; both sleeves cross the coat -->
        <g class="arms-down">${ARM("pen-arm", [66, 174, 58, 184, 57, 188, 50, 188], '<line class="pen" x1="31" y1="195" x2="49" y2="177" stroke="#3a6ea5" stroke-width="3.6" stroke-linecap="round"/>')}${ARM("rest-arm", [192, 174, 210, 180, 205, 189, 192, 189])}</g>
      </g>
      <rect class="desk" x="0" y="197" width="260" height="23" rx="6" fill="#e2c39d"/><rect x="0" y="197" width="260" height="5" rx="3" fill="#d2ad82"/>
      <g class="mug" transform="translate(12 0)"><path d="M200 163h26v22a8 8 0 0 1-8 8h-10a8 8 0 0 1-8-8z" fill="#fff" stroke="#d9c7b2" stroke-width="2"/><path d="M226 169h4a6 6 0 0 1 0 12h-4" fill="none" stroke="#d9c7b2" stroke-width="3"/>
        <rect class="coffee" x="202" y="167" width="22" height="6" rx="2" fill="#7a4a22"/>
        <g class="steam"><path d="M207 156c-4-5 4-8 0-13M215 156c-4-5 4-8 0-13M223 156c-4-5 4-8 0-13" stroke="#c9b6a2" stroke-width="2.5" fill="none" stroke-linecap="round"/></g></g>
      <g class="spark"><path d="M30 60l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/><path d="M228 52l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><path d="M60 26l2 4 4 2-4 2-2 4-2-4-4-2 4-2z"/></g>
    </svg>`;
    const st = document.createElement("style");
    st.textContent = `
.lps-card{position:relative;max-width:820px;margin:8px auto 40px;display:grid;grid-template-columns:240px minmax(0,1fr);gap:28px;align-items:center;padding:22px 30px 22px 22px;border-radius:24px;background:var(--surface,#fff);border:1px solid var(--border,#e4e7ec);box-shadow:0 1px 2px rgba(16,24,40,.04),0 24px 48px -32px rgba(90,55,20,.45);color:var(--text,#1b2230);overflow:hidden}
.lps-stage{position:relative;border-radius:18px;background:radial-gradient(120% 90% at 30% 10%,#fff3e1 0%,#f7e4cb 55%,#f0d6b4 100%);aspect-ratio:260/220;overflow:hidden}
.lps-stage .scene{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.lps-tag{display:inline-block;margin-bottom:8px;font-size:11.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#b5753a}
.lps-card h3{margin:0 0 8px;font-size:21px;line-height:1.25;letter-spacing:-.015em}
.lps-card p{margin:0 0 16px;font-size:14.5px;line-height:1.6;color:var(--text-muted,#5a6272)}
.lps-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.lps-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:12px;font-weight:650;font-size:14.5px;line-height:1;font-family:inherit;text-decoration:none!important;color:#6b3f14!important;background:linear-gradient(180deg,#fdf1e2,#f8e1c3);border:1px solid #edcfa8;box-shadow:0 1px 0 rgba(255,255,255,.7) inset,0 6px 14px -10px rgba(140,80,20,.6);transition:transform .15s,box-shadow .15s,filter .15s}
.lps-btn:hover,.lps-btn:focus-visible{transform:translateY(-2px);box-shadow:0 1px 0 rgba(255,255,255,.7) inset,0 12px 22px -12px rgba(140,80,20,.7)}
.lps-btn:active{transform:translateY(0) scale(.97)}
.lps-btn.alt{color:#174a80!important;background:linear-gradient(180deg,#f0f6fd,#e1edfa);border-color:#c9dcf2;box-shadow:0 1px 0 rgba(255,255,255,.7) inset,0 6px 14px -10px rgba(30,80,140,.55)}
.lps-btn .ic{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.lps-free{display:block;margin-top:12px;font-size:12.5px;color:var(--text-muted,#7a8190)}
/* the potato: tired and hard at work by default */
.scene{--eased:cubic-bezier(.3,1.6,.5,1)}
.scene .pot{transform-origin:130px 190px;animation:lps-breathe 3.6s ease-in-out infinite}
.scene .tired{animation:lps-nod 6s ease-in-out infinite;transform-origin:130px 140px}
.scene:not(.up) .body{filter:saturate(.85) brightness(.97)}
.scene .sweat{animation:lps-sweat 3.2s ease-in infinite}
.scene .pen-arm{animation:lps-write 1.5s ease-in-out infinite}
.scene .papers .ink{stroke-dasharray:46;stroke-dashoffset:46;animation:lps-ink 6s ease-in-out infinite}
.scene .happy,.scene .arms-up,.scene .steam,.scene .spark,.scene .hold-heart{opacity:0;transition:opacity .25s}
.scene .coffee{transform-origin:212px 161px;transform:scaleY(0);transition:transform .45s ease}
@keyframes lps-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.015,.985)}}
@keyframes lps-nod{0%,64%,100%{transform:translateY(0) rotate(0)}74%{transform:translateY(4px) rotate(-2deg)}84%{transform:translateY(0) rotate(0)}}
@keyframes lps-sweat{0%{transform:translateY(-4px);opacity:0}20%{opacity:1}80%{opacity:1}100%{transform:translateY(13px);opacity:0}}
@keyframes lps-write{0%,100%{transform:rotate(0)}25%{transform:rotate(-4deg)}50%{transform:rotate(3deg)}75%{transform:rotate(-2deg)}}
@keyframes lps-ink{0%,70%{stroke-dashoffset:46}90%,100%{stroke-dashoffset:0}}
/* both buttons wake the potato: happy face, arms up, pen set down */
.scene.up .tired,.scene.up .arms-down{opacity:0}
.scene.up .happy,.scene.up .arms-up{opacity:1}
.scene.up .pot{animation:lps-bounce .9s ease-in-out infinite}
.scene.up .wave-l{animation:lps-wave-l .9s ease-in-out infinite}.scene.up .wave-r{animation:lps-wave-r .9s ease-in-out infinite}
@keyframes lps-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes lps-wave-l{0%,100%{transform:rotate(0)}50%{transform:rotate(-10deg)}}
@keyframes lps-wave-r{0%,100%{transform:rotate(0)}50%{transform:rotate(10deg)}}
/* coffee button: a fresh mug, steam and sparkles */
.scene.motivated .steam,.scene.motivated .spark{opacity:1}
.scene.motivated .coffee{transform:scaleY(1)}
.scene.motivated .steam path{animation:lps-steam 1.6s ease-in-out infinite}.scene.motivated .steam path:nth-child(2){animation-delay:.3s}.scene.motivated .steam path:nth-child(3){animation-delay:.6s}
.scene.motivated .spark path{fill:#ffc53d;transform-box:fill-box;transform-origin:center;animation:lps-twinkle 1.2s ease-in-out infinite}.scene.motivated .spark path:nth-child(2){animation-delay:.4s}.scene.motivated .spark path:nth-child(3){animation-delay:.8s}
@keyframes lps-steam{0%{opacity:0;transform:translateY(6px)}40%{opacity:.9}100%{opacity:0;transform:translateY(-10px)}}
@keyframes lps-twinkle{0%,100%{transform:scale(.6);opacity:.5}50%{transform:scale(1.15);opacity:1}}
/* paypal button: the potato lifts a little heart and rocks happily */
.scene.loved .hold-heart{opacity:1;transform-box:fill-box;transform-origin:center;animation:lps-beat 1s ease-in-out infinite}
.scene.loved .wave-l{animation:lps-hug-l 1.2s ease-in-out infinite}.scene.loved .wave-r{animation:lps-hug-r 1.2s ease-in-out infinite}
@keyframes lps-hug-l{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(5deg)}}
@keyframes lps-hug-r{0%,100%{transform:rotate(3deg)}50%{transform:rotate(-5deg)}}
@keyframes lps-beat{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}
@keyframes lps-rock{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
/* pressed: coffee → a jump; paypal → a happy wiggle */
.scene.cheer .pot{animation:lps-jump .6s var(--eased)}
.scene.cheer-love .pot{animation:lps-wiggle .7s ease-in-out}
@keyframes lps-jump{0%{transform:translateY(0)}40%{transform:translateY(-22px)}100%{transform:translateY(0)}}
@keyframes lps-wiggle{0%,100%{transform:rotate(0)}20%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}80%{transform:rotate(-4deg)}}
.lps-heart{position:absolute;width:16px;height:16px;pointer-events:none;animation:lps-float 1.4s ease-out forwards}
.lps-heart svg{width:100%;height:100%;fill:#ff6b8a}
@keyframes lps-float{0%{opacity:0;transform:translate(0,0) scale(.4)}15%{opacity:1}100%{opacity:0;transform:translate(var(--dx),-120px) scale(1.1) rotate(var(--r))}}
@media (max-width:640px){.lps-card{grid-template-columns:1fr;padding:18px;gap:16px;text-align:center}.lps-stage{max-width:260px;margin:0 auto;width:100%}.lps-row{justify-content:center}}
@media (prefers-reduced-motion:reduce){.scene *,.lps-heart{animation:none!important;transition:none!important}}
@media print{.lps-card{display:none!important}}
:root[data-theme="dark"] .lps-stage{background:radial-gradient(120% 90% at 30% 10%,#4a3a28 0%,#3a2d20 60%,#30261b 100%)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .lps-stage{background:radial-gradient(120% 90% at 30% 10%,#4a3a28 0%,#3a2d20 60%,#30261b 100%)}}`;
    document.head.append(st);
    home.innerHTML = `<div class="lps-card"><div class="lps-stage">${SCENE}</div><div>
      <span class="lps-tag">Support Lab Potato</span>
      <h3>Running on caffeine and approaching thesis deadlines</h3>
      <p>${esc(line)} If one of these tools gave you an afternoon back, it would be great if you could buy this potato a coffee. Your generous support helps motivate me to keep updating these tools and building new ones.</p>
      <div class="lps-row">${links.map((l, i) => `<a class="lps-btn${i ? " alt" : ""}" href="${esc(l.href)}" target="_blank" rel="noopener">${ICON[l.icon]}${esc(l.label)}</a>`).join("")}</div>
      <span class="lps-free">No pressure. The tools stay free either way.</span></div></div>`;
    const scene = home.querySelector(".scene"), stage = home.querySelector(".lps-stage");
    // the two buttons wake the potato in their own way: coffee brings a fresh mug and steam,
    // PayPal has it lift a little heart. Pressing each plays its own celebration.
    const mood = b => b.classList.contains("alt") ? "loved" : "motivated";
    const hover = (b, on) => () => { scene.classList.toggle("up", on); scene.classList.toggle(mood(b), on); if (!on) scene.classList.remove("motivated", "loved"); };
    const burst = (n, emoji) => { for (let k = 0; k < n; k++) {
        const h = document.createElement("span"); h.className = "lps-heart";
        h.style.left = (36 + Math.random() * 28) + "%"; h.style.top = (38 + Math.random() * 20) + "%";
        h.style.setProperty("--dx", (Math.random() * 90 - 45) + "px"); h.style.setProperty("--r", (Math.random() * 60 - 30) + "deg"); h.style.animationDelay = (k * 55) + "ms";
        h.innerHTML = emoji;
        stage.append(h); setTimeout(() => h.remove(), 1700);
      } };
    const HEART = '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z"/></svg>';
    const COIN = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#f6c343"/><text x="12" y="16.5" text-anchor="middle" font-size="12" font-weight="800" fill="#9a6c12">$</text></svg>';
    home.querySelectorAll(".lps-btn").forEach(b => {
      b.addEventListener("pointerenter", hover(b, true)); b.addEventListener("pointerleave", hover(b, false));
      b.addEventListener("focus", hover(b, true)); b.addEventListener("blur", hover(b, false));
      b.addEventListener("click", () => {   // the link opens in a new tab; the potato celebrates here
        const love = b.classList.contains("alt"), cls = love ? "cheer-love" : "cheer";
        scene.classList.add("up", mood(b)); scene.classList.remove(cls); void scene.getBoundingClientRect(); scene.classList.add(cls);
        burst(love ? 10 : 8, love ? HEART : COIN);
      });
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
