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


  /* ---------- the potato's arms ----------
     An arm has two parts that turn at real joints: the upper arm at the shoulder and the forearm at the elbow.
     A pose says where the wrist should be; the two angles are worked out from that (a two-link reach), so a hand
     lands exactly where the drawing needs it: on the mug, at the mouth, round the heart. The sleeve is drawn twice
     (edge, then cloth), both copies turning together, so the elbow never shows a seam.
     Whatever the hand holds stays upright on the page while the arm turns under it. */
  const DEG = 180 / Math.PI, norm = a => ((a + 180) % 360 + 360) % 360 - 180;
  const reach = (A, T) => {                          // A = {S: shoulder, U, F, mid}; T = wrist. Angles in degrees, 0 = hanging straight down
    const S = A.S, U = A.U, F = A.F, dx = T[0] - S[0], dy = T[1] - S[1];
    const d = Math.max(Math.abs(U - F) + .5, Math.min(U + F - .5, Math.hypot(dx, dy)));
    const phi = Math.atan2(dy, dx), al = Math.acos((U * U + d * d - F * F) / (2 * U * d));
    const W = [S[0] + d * Math.cos(phi), S[1] + d * Math.sin(phi)];
    const c = [1, -1].map(s => { const psi = phi + s * al; return { psi, E: [S[0] + U * Math.cos(psi), S[1] + U * Math.sin(psi)] }; });
    // the elbow hangs low; when both are level it points away from the body
    c.sort((a, b) => Math.abs(a.E[1] - b.E[1]) > 4 ? b.E[1] - a.E[1] : Math.abs(b.E[0] - A.mid) - Math.abs(a.E[0] - A.mid));
    const E = c[0].E, om = Math.atan2(W[1] - E[1], W[0] - E[0]), sh = norm(c[0].psi * DEG - 90), fa = norm(om * DEG - 90);
    return { sh, el: norm(fa - sh), fa, E, om };
  };
  const pose = (A, T, tilt = 0) => { const r = reach(A, T); return `--sh:${r.sh.toFixed(1)}deg;--el:${r.el.toFixed(1)}deg;--fa:${r.fa.toFixed(1)}deg;--tilt:${tilt}deg`; };
  const move = (A, T0, T1, n) => { const a = reach(A, T0), b = reach(A, T1); return `--${n}sh:${norm(b.sh - a.sh).toFixed(1)}deg;--${n}el:${norm(b.el - a.el).toFixed(1)}deg;--${n}fa:${norm(b.fa - a.fa).toFixed(1)}deg`; };
  const held = (A, T, off) => { const r = reach(A, T), d = A.F + 6 + off; return [r.E[0] + d * Math.cos(r.om), r.E[1] + d * Math.sin(r.om)]; };   // where a held thing sits on the page
  const arm = (side, A, thing = "", off = 0) => {
    const seg = (w, c) => `<g class="arm ${side}" transform="translate(${A.S[0]} ${A.S[1]})"><g class="sh"><g class="sh-a"><path d="M0 0V${A.U}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" fill="none"/>
      <g transform="translate(0 ${A.U})"><g class="el"><g class="el-a"><path d="M0 0V${A.F}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`, end = `</g></g></g></g></g></g>`;
    return seg(17.6, "#aab6c8") + end + seg(14.6, "#fbfcfe") + `<path d="M-7.3 ${A.F - 3}h14.6" stroke="#cfd8e4" stroke-width="3" stroke-linecap="round"/>
      ${thing ? `<g transform="translate(0 ${A.F + 6 + off})"><g class="grip">${thing}</g></g>` : ""}
      <ellipse cx="0" cy="${A.F + 6}" rx="7.8" ry="8.3" fill="#c58a4e" stroke="#9e6832" stroke-width="1.4"/>` + end;
  };
  const ARM_CSS = `
.arm .sh{transform:rotate(var(--sh,0deg));transition:transform .55s cubic-bezier(.3,1.25,.5,1)}
.arm .el{transform:rotate(var(--el,0deg));transition:transform .55s cubic-bezier(.3,1.25,.5,1)}
.arm .grip{transform:rotate(calc(var(--tilt,0deg) - var(--fa,0deg)));transition:transform .55s cubic-bezier(.3,1.25,.5,1)}`;

  /* the mascot's coat, the same in the desk scene and in the card */
  const COAT = `<path class="coat" d="M94 158C76 162 58 166 51 177C43 191 41 203 42 216C80 223 176 223 214 216C215 203 213 191 205 177C198 166 180 162 162 157L126 190Z" fill="#fbfcfe" stroke="#c3ccd9" stroke-width="1.8"/>
        <path d="M94 158L126 190M162 157L126 190" stroke="#c3ccd9" stroke-width="2" fill="none" stroke-linecap="round"/>
        <rect x="64" y="184" width="28" height="20" rx="3" fill="none" stroke="#c3ccd9" stroke-width="1.8"/>
        <path d="M74 179v10" stroke="#1f66cc" stroke-width="3.6" stroke-linecap="round"/>
        <circle cx="126" cy="199" r="2.6" fill="#c3ccd9"/><circle cx="126" cy="210" r="2.6" fill="#c3ccd9"/>`;
  const BODY_D = "M46 128C44 104 64 84 92 78C120 72 150 75 172 89C190 101 195 121 187 141C178 162 149 176 117 178C85 180 59 169 50 151C47 143 46 136 46 128Z";
  const GOGGLES = `<g class="goggles"><path d="M70 127L44 132M174 123L200 118" stroke="#39444e" stroke-width="11" stroke-linecap="round" fill="none"/>
          <rect x="72" y="102" width="100" height="45" rx="22" fill="none" stroke="#39444e" stroke-width="5"/>
          <rect x="79" y="108" width="86" height="33" rx="16" fill="#cfe6f2" fill-opacity=".3"/>
          <ellipse cx="76" cy="124" rx="3" ry="5.6" fill="#2b343d"/><ellipse cx="168" cy="124" rx="3" ry="5.6" fill="#2b343d"/></g>`;

  /* the card's potato is the mascot too: asleep on its feet with both arms down (eyes shut under the goggles,
     a few z's drifting up) until the card appears; then it wakes, smiles, lifts an arm and waves from the elbow */
  const CR = { S: [190, 176], U: 21, F: 21, mid: 126 }, CL = { S: [66, 176], U: 21, F: 21, mid: 126 };
  const SPUD = (cls) => `<svg class="${cls}" viewBox="24 64 216 172" aria-hidden="true">
    <defs><linearGradient id="lpc-skin" x1="0.2" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#d09760"/><stop offset="100%" stop-color="#bc8148"/></linearGradient></defs>
    <g class="zz"><text x="192" y="98">z</text><text x="210" y="82">z</text></g>
    <g class="body"><ellipse cx="128" cy="229" rx="80" ry="5" fill="rgba(30,40,60,.12)"/>
      <path d="${BODY_D}" fill="url(#lpc-skin)"/>
      <g class="shut"><path d="M93 126q7 6 14 0M137 124q7 6 14 0"/><path d="M116 153h14"/></g>
      <g class="open"><ellipse class="eye" cx="100" cy="125" rx="6.6" ry="8.2"/><ellipse class="eye" cx="144" cy="123" rx="6.6" ry="8.2"/><circle cx="102.4" cy="121.4" r="2.2" fill="#fff"/><circle cx="146.4" cy="119.4" r="2.2" fill="#fff"/><path class="smile" d="M111 150Q123 160 136 149"/></g>
      ${GOGGLES}
      ${COAT}
      ${arm("l", CL)}${arm("r", CR)}
    </g></svg>`;
  const SPUD_CSS = ARM_CSS + `
.spud .arm.l{${pose(CL, [58, 216])}}.spud .arm.r{${pose(CR, [198, 216])}}
.spud.awake .arm.r{${pose(CR, [217, 150])}}
.spud.awake .arm.r .el-a{animation:lps-wave 1s ease-in-out .6s infinite}
@keyframes lps-wave{0%,100%{transform:rotate(-13deg)}50%{transform:rotate(17deg)}}
.zz text{font:800 30px/1 system-ui,sans-serif;fill:#7d8ba1;opacity:0;animation:lps-z 3s ease-in infinite}.zz text:nth-child(2){font-size:22px;animation-delay:1.4s}
@keyframes lps-z{0%{opacity:0;transform:translate(0,8px)}30%{opacity:.8}100%{opacity:0;transform:translate(10px,-18px)}}
.body{transform-origin:50% 95%;animation:lps-breathe 3.2s ease-in-out infinite}
@keyframes lps-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.02,.975)}}
.shut path{fill:none;stroke:#2a2018;stroke-width:3.6;stroke-linecap:round}
.open{display:none}.open .eye{fill:#2a2018;transform-box:fill-box;transform-origin:center;animation:lps-blink 4s infinite}.open .smile{fill:none;stroke:#2a2018;stroke-width:4.2;stroke-linecap:round}
@keyframes lps-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
.awake .shut,.awake .zz{display:none}.awake .open{display:inline}.awake .body{animation:lps-hop .5s cubic-bezier(.3,1.6,.5,1)}
@keyframes lps-hop{0%{transform:translateY(0)}40%{transform:translateY(-10px)}100%{transform:translateY(0)}}
@media (prefers-reduced-motion:reduce){.zz text,.body,.open .eye,.arm *{animation:none!important;transition:none!important}.zz text{opacity:.7}}`;

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
    /* The homepage panel: the site mascot at its desk. Same body, goggles, lab coat and deadpan face as the hero.
       At rest it is worn out: heavy eyelids, a bead of sweat, one hand writing, the other round an empty mug.
       "Buy me a coffee": the mug fills and steams, and the potato lifts it to its mouth for a sip, again and again,
       writing faster in between. "PayPal": both hands come together and hold a beating heart.
       Pressing a button: a toast with the mug, or a squeeze of the heart. */
    const R = { S: [190, 172], U: 22, F: 22, mid: 126 }, L = { S: [66, 172], U: 22, F: 22, mid: 126 };
    const W = { rRest: [162, 187], rHold: [176, 177], rSip: [151, 167], rToast: [214, 128], rHeart: [146, 187],
                lWrite: [35, 186], lHeart: [106, 187], lCheer: [36, 136] };
    const MUG = `<g transform="translate(0 -5)"><g class="steam"><path d="M-7 -21c-4-5 4-8 0-13M0 -21c-4-5 4-8 0-13M7 -21c-4-5 4-8 0-13" stroke="#b9c4d4" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>
        <path d="M-13 -15h26v22a8 8 0 0 1-8 8h-10a8 8 0 0 1-8-8z" fill="#fff" stroke="#c3ccd9" stroke-width="2"/><path d="M13 -9h4a6 6 0 0 1 0 12h-4" fill="none" stroke="#c3ccd9" stroke-width="3"/>
        <rect class="coffee" x="-11" y="-12" width="22" height="6" rx="2" fill="#7a4a22"/></g>`;
    const PEN = `<path d="M-10 10L7 -8" stroke="#2f5f9f" stroke-width="3.6" stroke-linecap="round"/><path d="M-10 10l-2.4 2.4" stroke="#1b2a3f" stroke-width="2.2" stroke-linecap="round"/>`;
    const mugAt = held(R, W.rRest, 14), penAt = held(L, W.lWrite, 0);
    const SCENE = `<svg class="scene" viewBox="0 0 260 220" aria-hidden="true">
      <defs><linearGradient id="lps-skin" x1="0.2" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#d09760"/><stop offset="100%" stop-color="#bc8148"/></linearGradient>
        <clipPath id="lps-clip"><path d="${BODY_D}"/></clipPath>
        <clipPath id="lps-el"><ellipse cx="100" cy="126" rx="7.2" ry="9"/></clipPath><clipPath id="lps-er"><ellipse cx="144" cy="124" rx="7.2" ry="9"/></clipPath></defs>
      <g class="papers"><rect x="10" y="166" width="60" height="31" rx="3" transform="rotate(-3 40 181)" fill="#fffdf8" stroke="#d5dbe5"/><path class="ink" d="M19 175h36M19 182h42M19 189h30" stroke="#a9b4c4" stroke-width="2" stroke-linecap="round"/></g>
      <g class="rise"><g class="sway">
        <g class="pot">
          <path class="body" d="${BODY_D}" fill="url(#lps-skin)"/>
          <g clip-path="url(#lps-clip)"><ellipse cx="58" cy="136" rx="6" ry="3.4" transform="rotate(-18 58 136)" fill="#8d5c24" opacity=".28"/><ellipse cx="180" cy="134" rx="5.6" ry="3.1" transform="rotate(18 180 134)" fill="#8d5c24" opacity=".28"/></g>
          <!-- the face: the same two dark eyes always; only the lids, the mouth and the sweat change -->
          <g class="look"><ellipse cx="100" cy="126" rx="7.2" ry="9" fill="#2a2018"/><ellipse cx="144" cy="124" rx="7.2" ry="9" fill="#2a2018"/>
          <circle class="glint" cx="102.6" cy="122" r="2.1" fill="#fff"/><circle class="glint" cx="146.6" cy="120" r="2.1" fill="#fff"/></g>
          <g clip-path="url(#lps-el)"><g class="lid"><rect x="90" y="96" width="20" height="21" fill="#c68d54"/><path d="M90 117h20" stroke="#2a2018" stroke-width="2.4"/></g></g>
          <g clip-path="url(#lps-er)"><g class="lid"><rect x="134" y="94" width="20" height="21" fill="#c68d54"/><path d="M134 115h20" stroke="#2a2018" stroke-width="2.4"/></g></g>
          <path class="bags" d="M92 139q8 5 16 -1M136 137q8 5 16 -1" stroke="#2a2018" stroke-width="2.2" stroke-linecap="round" fill="none" opacity=".34"/>
          <path class="flat" d="M112 152h22" stroke="#2a2018" stroke-width="4" stroke-linecap="round" fill="none"/>
          <path class="smile" d="M110 150Q123 161 136 149" stroke="#2a2018" stroke-width="4" stroke-linecap="round" fill="none"/>
          <path class="sweat" d="M186 98c3.6 5.4 6 8.2 6 11.2a6 6 0 0 1-12 0c0-3 2.4-5.8 6-11.2z" fill="#9fd0ff" stroke="#5aa0e6" stroke-width="1.3"/>
          ${GOGGLES}
          ${COAT}
        </g>
        <g class="heart" transform="translate(126 178)"><g class="heart-in"><path d="M0 12C-19 -1 -16 -17 -7.5 -17C-3 -17 0 -13.5 0 -11C0 -13.5 3 -17 7.5 -17C16 -17 19 -1 0 12Z" fill="#ff5d7d" stroke="#d93a5e" stroke-width="1.4"/><path d="M-9 -10q-3 2 -2 7" stroke="#ffc2cf" stroke-width="2.2" stroke-linecap="round" fill="none"/></g></g>
        ${arm("l", L, `<g class="heldpen">${PEN}</g>`, 0)}
        ${arm("r", R, `<g class="heldmug">${MUG}</g>`, 14)}
      </g></g>
      <g class="minis" transform="translate(126 152)"><path class="mh" style="--dx:-16px" d="M0 4C-6 0 -5 -5 -2.4 -5C-1 -5 0 -4 0 -3.2C0 -4 1 -5 2.4 -5C5 -5 6 0 0 4Z"/><path class="mh" style="--dx:14px" d="M0 4C-6 0 -5 -5 -2.4 -5C-1 -5 0 -4 0 -3.2C0 -4 1 -5 2.4 -5C5 -5 6 0 0 4Z"/><path class="mh" style="--dx:-3px" d="M0 4C-6 0 -5 -5 -2.4 -5C-1 -5 0 -4 0 -3.2C0 -4 1 -5 2.4 -5C5 -5 6 0 0 4Z"/></g>
      <rect class="desk" x="0" y="197" width="260" height="23" rx="6" fill="#e2c39d"/><rect x="0" y="197" width="260" height="5" rx="3" fill="#d2ad82"/>
      <g class="deskmug" transform="translate(${mugAt[0].toFixed(1)} ${mugAt[1].toFixed(1)})">${MUG}</g>
      <g class="deskpen" transform="translate(${penAt[0].toFixed(1)} ${penAt[1].toFixed(1)})">${PEN}</g>
    </svg>`;
    const st = document.createElement("style");
    st.textContent = `
.lps-card{position:relative;max-width:820px;margin:8px auto 40px;display:grid;grid-template-columns:240px minmax(0,1fr);gap:28px;align-items:center;padding:22px 30px 22px 22px;border-radius:20px;background:var(--surface,#fff);border:1px solid var(--border,#dfe5ee);box-shadow:0 1px 2px rgba(16,24,40,.04),0 22px 44px -32px rgba(20,50,110,.4);color:var(--text,#1b2230);overflow:hidden}
.lps-stage{position:relative;border-radius:14px;background:linear-gradient(180deg,#eef4fc 0%,#dce8f8 100%);aspect-ratio:260/220;overflow:hidden}
.lps-stage .scene{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.lps-tag{display:inline-block;margin-bottom:8px;font-size:12.5px;font-weight:650;color:#1f5fc4}
.lps-card h3{margin:0 0 8px;font-size:21px;line-height:1.25;letter-spacing:-.015em}
.lps-card p{margin:0 0 16px;font-size:14.5px;line-height:1.6;color:var(--text-muted,#5a6272)}
.lps-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.lps-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:10px;font-weight:600;font-size:14.5px;line-height:1;font-family:inherit;text-decoration:none!important;color:#3a2500!important;background:#ffd257;border:1px solid #efb72c;transition:background-color .15s,border-color .15s,transform .15s}
.lps-btn:hover,.lps-btn:focus-visible{background:#ffc839;border-color:#e0a516;transform:translateY(-1px)}
.lps-btn:focus-visible{outline:2px solid #1b2230;outline-offset:2px}
.lps-btn:active{transform:translateY(0)}
.lps-btn.alt{color:#174ea6!important;background:#fff;border-color:#b9cdea}
.lps-btn.alt:hover,.lps-btn.alt:focus-visible{background:#eef4fc;border-color:#1f5fc4}
.lps-btn .ic{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.lps-free{display:block;margin-top:12px;font-size:12.5px;color:var(--text-muted,#7a8190)}
/* the main button catches the light now and then */
.lps-btn:not(.alt){position:relative;overflow:hidden}
.lps-btn:not(.alt)::after{content:"";position:absolute;top:0;bottom:0;left:-60%;width:45%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.75),transparent);transform:skewX(-18deg);animation:lps-shine 6.5s ease-in-out 2s infinite;pointer-events:none}
@keyframes lps-shine{0%,82%{left:-60%}100%{left:130%}}
/* the gauge: nearly empty until someone points at a button */
.lps-meter{position:absolute;left:10px;top:10px;z-index:1;display:flex;align-items:center;gap:7px;padding:5px 9px 5px 8px;border-radius:999px;background:var(--surface,#fff);border:1px solid var(--border,#dfe5ee);box-shadow:0 4px 10px -6px rgba(20,50,110,.35);font-size:10.5px;font-weight:700;line-height:1;letter-spacing:.04em;text-transform:uppercase;color:var(--text,#1b2230)}
.lps-meter-bar{position:relative;width:46px;height:7px;border-radius:99px;background:rgba(120,135,160,.22);overflow:hidden}
.lps-meter-bar i{position:absolute;inset:0;border-radius:99px;transform-origin:0 50%;transform:scaleX(.06);background:#e5484d;transition:transform .7s cubic-bezier(.3,1.2,.5,1),background-color .4s;animation:lps-low 1.3s steps(2,jump-none) infinite}
.lps-meter-n{min-width:30px;text-align:right;font-variant-numeric:tabular-nums;color:#c8343a;transition:color .3s}
.lps-meter.full .lps-meter-bar i{transform:scaleX(1);background:#2f9e5b;animation:none}.lps-meter.full .lps-meter-n{color:#237a45}
.lps-meter.love .lps-meter-bar i{background:#ff5d7d}.lps-meter.love .lps-meter-n{color:#d93a5e}
@keyframes lps-low{0%{opacity:1}100%{opacity:.35}}
/* ---- the potato ---- */
.scene{--pop:cubic-bezier(.3,1.4,.5,1)}` + ARM_CSS + `
.scene .arm.r{${pose(R, W.rRest)}}.scene .arm.l{${pose(L, W.lWrite)}}
.scene.motivated .arm.r{${pose(R, W.rHold)};${move(R, W.rHold, W.rSip, "d")};--dtilt:-27deg}
.scene.loved .arm.r{${pose(R, W.rHeart)}}.scene.loved .arm.l{${pose(L, W.lHeart)}}
.scene .arm.r{${move(R, W.rHold, W.rToast, "t")}}.scene .arm.l{${move(L, W.lWrite, W.lCheer, "t")}}
/* worn out and at work */
.scene .pot{transform-origin:130px 196px;animation:lps-breathe 3.8s ease-in-out infinite}
.scene .rise{transition:transform .5s var(--pop)}
.scene:not(.up) .body{filter:saturate(.86) brightness(.97)}
.scene .lid{transform:translateY(8.5px);animation:lps-droop 6s ease-in-out infinite}
.scene .glint,.scene .smile{opacity:0;transition:opacity .25s}
.scene .flat,.scene .bags,.scene .sweat{transition:opacity .25s}
.scene .sweat{animation:lps-sweat 3.4s ease-in infinite}
.scene .arm.l .el-a{animation:lps-write 1.1s ease-in-out infinite}
.scene .arm.l .sh-a{animation:lps-drift 4.4s ease-in-out infinite}
.scene .papers .ink{stroke-dasharray:46;stroke-dashoffset:46;animation:lps-ink 6s ease-in-out infinite}
.scene .coffee{transform-box:fill-box;transform-origin:50% 100%;transform:scaleY(0);transition:transform .4s ease}
.scene .steam path{opacity:0}
.scene .heart-in{transform:scale(0);opacity:0;transition:transform .4s var(--pop),opacity .2s}
.scene .mh{opacity:0;fill:#ff7f9a}
.scene .heldmug,.scene .heldpen{transition:opacity 0s .5s}
.scene .deskmug,.scene .deskpen{opacity:0;transition:opacity 0s .5s}
@keyframes lps-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.014,.986)}}
@keyframes lps-droop{0%,52%,100%{transform:translateY(8.5px)}66%,80%{transform:translateY(15.5px)}87%{transform:translateY(7px)}}
@keyframes lps-sweat{0%{transform:translateY(-4px);opacity:0}20%{opacity:1}80%{opacity:1}100%{transform:translateY(13px);opacity:0}}
@keyframes lps-write{0%,100%{transform:rotate(0deg)}22%{transform:rotate(-6deg)}48%{transform:rotate(3deg)}74%{transform:rotate(-4deg)}}
@keyframes lps-drift{0%,100%{transform:rotate(1.5deg)}50%{transform:rotate(-2.5deg)}}
@keyframes lps-ink{0%,70%{stroke-dashoffset:46}90%,100%{stroke-dashoffset:0}}
/* its eyes follow the pointer; at rest it nods off over the notes and jerks awake */
.scene .look{transform:translate(var(--lx,0px),var(--ly,0px));transition:transform .18s ease-out}
.scene:not(.up) .sway{transform-origin:130px 204px;animation:lps-nod 6s ease-in-out infinite}
@keyframes lps-nod{0%,52%,100%{transform:none}66%,80%{transform:translateY(3px) rotate(3.2deg)}86%{transform:translateY(-2.5px) rotate(-1.2deg)}92%{transform:none}}
.scene.motivated .papers .ink{animation-duration:1.5s}
/* either button: it wakes up */
.scene.up .rise{transform:translateY(-3px)}
.scene.up .lid{transform:translateY(0);animation:lps-blink 4.2s ease-in-out infinite}
.scene.up .glint,.scene.up .smile{opacity:1}
.scene.up .flat,.scene.up .bags,.scene.up .sweat{opacity:0;animation:none}
@keyframes lps-blink{0%,90%,100%{transform:translateY(0)}94%{transform:translateY(17.5px)}}
/* coffee: the mug fills and steams; lift, sip with eyes shut, lower, write faster */
.scene.motivated .coffee{transform:scaleY(1)}
.scene.motivated .steam path{animation:lps-steam 1.8s ease-in-out infinite}.scene.motivated .steam path:nth-child(1){animation-delay:0s}
.scene.motivated .arm.r .sh-a{animation:lps-sip-sh 3.6s ease-in-out .7s infinite}
.scene.motivated .arm.r .el-a{animation:lps-sip-el 3.6s ease-in-out .7s infinite}
.scene.motivated .arm.r .grip{animation:lps-sip-grip 3.6s ease-in-out .7s infinite}
.scene.motivated .lid{animation:lps-sip-lid 3.6s ease-in-out .7s infinite}
.scene.motivated .arm.l .el-a{animation-duration:.5s}
@keyframes lps-steam{0%{opacity:0;transform:translateY(5px)}40%{opacity:.9}100%{opacity:0;transform:translateY(-9px)}}
@keyframes lps-sip-sh{0%,62%,100%{transform:rotate(0deg)}24%,46%{transform:rotate(var(--dsh))}}
@keyframes lps-sip-el{0%,62%,100%{transform:rotate(0deg)}24%,46%{transform:rotate(var(--del))}}
@keyframes lps-sip-grip{0%,62%,100%{transform:rotate(calc(var(--tilt) - var(--fa)))}24%{transform:rotate(calc(var(--tilt) - var(--fa) - var(--dfa)))}31%,42%{transform:rotate(calc(var(--tilt) - var(--fa) - var(--dfa) + var(--dtilt)))}46%{transform:rotate(calc(var(--tilt) - var(--fa) - var(--dfa)))}}
@keyframes lps-sip-lid{0%,24%,50%,100%{transform:translateY(0)}30%,44%{transform:translateY(17.5px)}}
/* paypal: both hands hold a heart that beats; small hearts drift up; a slow happy sway */
.scene.loved .heart-in{transform:scale(1);opacity:1;transition-delay:.3s}
.scene.loved .heart-in path:first-child{transform-box:fill-box;transform-origin:50% 62%;animation:lps-beat 1.1s ease-in-out .8s infinite}
.scene.loved .mh{animation:lps-rise 2.4s ease-out infinite}.scene.loved .mh:nth-child(1){animation-delay:.9s}.scene.loved .mh:nth-child(2){animation-delay:1.7s}.scene.loved .mh:nth-child(3){animation-delay:2.5s}
.scene.loved .sway{transform-origin:130px 204px;animation:lps-sway 2.6s ease-in-out .5s infinite}
.scene.loved .heldmug,.scene.loved .heldpen{opacity:0;transition:opacity 0s}
.scene.loved .deskmug,.scene.loved .deskpen{opacity:1;transition:opacity 0s}
.scene.loved .arm.l .el-a,.scene.loved .arm.l .sh-a{animation:none}
@keyframes lps-beat{0%,100%{transform:scale(1)}14%{transform:scale(1.16)}28%{transform:scale(1)}42%{transform:scale(1.09)}56%{transform:scale(1)}}
@keyframes lps-rise{0%{opacity:0;transform:translate(0,0) scale(.5)}20%{opacity:.95}100%{opacity:0;transform:translate(var(--dx),-46px) scale(1.1)}}
@keyframes lps-sway{0%,100%{transform:rotate(-1.8deg)}50%{transform:rotate(1.8deg)}}
/* pressed: a toast with the mug and a small hop; or a squeeze of the heart */
.scene.cheer .sway{animation:lps-jump .7s var(--pop)}
.scene.cheer .arm.r .sh-a{animation:lps-toast-sh 1s ease-in-out}.scene.cheer .arm.l .sh-a{animation:lps-toast-sh 1s ease-in-out}
.scene.cheer .arm.r .el-a{animation:lps-toast-el 1s ease-in-out}.scene.cheer .arm.l .el-a{animation:lps-toast-el 1s ease-in-out}
.scene.cheer .arm.r .grip{animation:lps-toast-grip 1s ease-in-out}.scene.cheer .arm.l .grip{animation:lps-toast-grip 1s ease-in-out}
.scene.cheer .lid{animation:none}
.scene.cheer-love .sway{transform-origin:130px 204px;animation:lps-wiggle .8s ease-in-out}
.scene.cheer-love .heart-in{animation:lps-squeeze .8s var(--pop)}
@keyframes lps-toast-sh{0%,100%{transform:rotate(0deg)}30%,72%{transform:rotate(var(--tsh))}}
@keyframes lps-toast-el{0%,100%{transform:rotate(0deg)}30%,72%{transform:rotate(var(--tel))}}
@keyframes lps-toast-grip{0%,100%{transform:rotate(calc(var(--tilt) - var(--fa)))}30%,72%{transform:rotate(calc(var(--tilt) - var(--fa) - var(--tfa)))}}
@keyframes lps-jump{0%,100%{transform:translateY(0)}40%{transform:translateY(-13px)}}
@keyframes lps-wiggle{0%,100%{transform:rotate(0deg)}20%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}80%{transform:rotate(-3deg)}}
@keyframes lps-squeeze{0%,100%{transform:scale(1)}35%{transform:scale(1.4)}}
.lps-heart{position:absolute;width:16px;height:16px;pointer-events:none;animation:lps-float 1.4s ease-out forwards}
.lps-heart svg{width:100%;height:100%;fill:#ff6b8a}
@keyframes lps-float{0%{opacity:0;transform:translate(0,0) scale(.4)}15%{opacity:1}100%{opacity:0;transform:translate(var(--dx),-120px) scale(1.1) rotate(var(--r))}}
@media (max-width:640px){.lps-card{grid-template-columns:1fr;padding:18px;gap:16px;text-align:center}.lps-stage{max-width:260px;margin:0 auto;width:100%}.lps-row{justify-content:center}}
@media (prefers-reduced-motion:reduce){.scene *,.lps-heart,.lps-meter *,.lps-btn::after{animation:none!important;transition:none!important}}
@media print{.lps-card{display:none!important}}
:root[data-theme="dark"] .lps-stage{background:linear-gradient(180deg,#1d2a40 0%,#152033 100%)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .lps-stage{background:linear-gradient(180deg,#1d2a40 0%,#152033 100%)}}`;
    document.head.append(st);
    home.innerHTML = `<div class="lps-card"><div class="lps-stage"><div class="lps-meter" aria-hidden="true"><span class="lps-meter-l">Caffeine</span><span class="lps-meter-bar"><i></i></span><span class="lps-meter-n">3%</span></div>${SCENE}</div><div>
      <span class="lps-tag">Support Lab Potato</span>
      <h3>Running on caffeine and approaching thesis deadlines</h3>
      <p>${esc(line)} If one of these tools gave you an afternoon back, it would be great if you could buy this potato a coffee. Your generous support helps motivate me to keep updating these tools and building new ones.</p>
      <div class="lps-row">${links.map((l, i) => `<a class="lps-btn${i ? " alt" : ""}" href="${esc(l.href)}" target="_blank" rel="noopener">${ICON[l.icon]}${esc(l.label)}</a>`).join("")}</div>
      <span class="lps-free">No pressure. The tools stay free either way.</span></div></div>`;
    const scene = home.querySelector(".scene"), stage = home.querySelector(".lps-stage");
    // each button wakes the potato in its own way; pressing one plays its own small celebration
    const mood = b => b.classList.contains("alt") ? "loved" : "motivated";
    // the gauge: caffeine at 3% until the coffee button, morale for the other one
    const meter = home.querySelector(".lps-meter"), meterL = meter.querySelector(".lps-meter-l"), meterN = meter.querySelector(".lps-meter-n");
    let level = 3, meterRaf = 0;
    const gauge = (kind) => {
      const to = kind ? 100 : 3, from = level, t0 = performance.now();
      meter.classList.toggle("full", !!kind); meter.classList.toggle("love", kind === "loved");
      meterL.textContent = kind === "loved" ? "Morale" : "Caffeine";
      cancelAnimationFrame(meterRaf);
      const step = (now) => { const k = Math.min(1, (now - t0) / 600); level = Math.round(from + (to - from) * k); meterN.textContent = level + "%"; if (k < 1) meterRaf = requestAnimationFrame(step); };
      meterRaf = requestAnimationFrame(step);
    };
    let hello = 0;
    const hover = (b, on) => () => { clearTimeout(hello); scene.classList.remove("motivated", "loved", "cheer"); scene.classList.toggle("up", on); scene.classList.toggle(mood(b), on); gauge(on ? mood(b) : ""); };
    // the first time the card comes into view, it looks up and raises the mug; then back to the notes
    let inView = false;
    if ("IntersectionObserver" in window) {
      let greeted = false;
      new IntersectionObserver((es) => {
        inView = es[0].isIntersecting;
        if (inView && !greeted && es[0].intersectionRatio > 0.6 && !scene.classList.contains("up")) {
          greeted = true;
          scene.classList.add("up", "cheer");
          hello = setTimeout(() => scene.classList.remove("up", "cheer"), 1300);
        }
      }, { threshold: [0, 0.65] }).observe(stage);
    }
    let lookRaf = 0;
    document.addEventListener("pointermove", (e) => {
      if (!inView || lookRaf) return;
      lookRaf = requestAnimationFrame(() => {
        lookRaf = 0;
        const r = stage.getBoundingClientRect(), dx = e.clientX - (r.left + r.width * 0.47), dy = e.clientY - (r.top + r.height * 0.57), d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 160);
        scene.style.setProperty("--lx", ((dx / d) * 2.6 * k).toFixed(1) + "px"); scene.style.setProperty("--ly", ((dy / d) * 2 * k).toFixed(1) + "px");
      });
    }, { passive: true });
    const burst = (n, emoji) => { for (let k = 0; k < n; k++) {
        const h = document.createElement("span"); h.className = "lps-heart";
        h.style.left = (36 + Math.random() * 28) + "%"; h.style.top = (38 + Math.random() * 20) + "%";
        h.style.setProperty("--dx", (Math.random() * 90 - 45) + "px"); h.style.setProperty("--r", (Math.random() * 60 - 30) + "deg"); h.style.animationDelay = (k * 55) + "ms";
        h.innerHTML = emoji;
        stage.append(h); setTimeout(() => h.remove(), 1700);
      } };
    const HEART = '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z"/></svg>';
    const COIN = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#f6c343"/><text x="12" y="16.5" text-anchor="middle" font-size="12" font-weight="800" fill="#9a6c12">$</text></svg>';
    let cheerT = 0;
    home.querySelectorAll(".lps-btn").forEach(b => {
      b.addEventListener("pointerenter", hover(b, true)); b.addEventListener("pointerleave", hover(b, false));
      b.addEventListener("focus", hover(b, true)); b.addEventListener("blur", hover(b, false));
      b.addEventListener("click", () => {   // the link opens in a new tab; the potato celebrates here
        const love = b.classList.contains("alt"), cls = love ? "cheer-love" : "cheer";
        scene.classList.add("up", mood(b)); scene.classList.remove("cheer", "cheer-love"); void scene.getBoundingClientRect(); scene.classList.add(cls);
        gauge(mood(b)); clearTimeout(hello); clearTimeout(cheerT); cheerT = setTimeout(() => scene.classList.remove("cheer", "cheer-love"), 1100);
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
.lps-line a{color:inherit!important;text-decoration:underline!important;text-underline-offset:2px;font-weight:600}.lps-line a:hover{opacity:1;color:#1f5fc4!important}
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
.c{position:relative;display:flex;gap:14px;align-items:center;width:min(380px,calc(100vw - 24px));box-sizing:border-box;padding:16px 16px 14px 12px;border-radius:18px;background:#f8fbff;border:1px solid #d5e2f3;box-shadow:0 22px 50px -18px rgba(20,50,110,.42);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;color:#2b2118;opacity:0;transform:translateY(14px) scale(.98);transition:opacity .35s,transform .35s cubic-bezier(.2,.9,.3,1.2)}
.c.in{opacity:1;transform:none}
.spud{flex:none;width:86px;height:auto;overflow:visible}
b{display:block;font-size:15px;margin-bottom:2px}p{margin:0 0 10px;color:#4a5568}
.r{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
a{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:10px;font-weight:650;font-size:13.5px;text-decoration:none;color:#3a2500;background:#ffd257;border:1px solid #efb72c}
a.alt{color:#174ea6;background:#fff;border-color:#b9cdea}a:hover{filter:brightness(.97);transform:translateY(-1px)}
.ic{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.later{all:unset;cursor:pointer;font-size:12.5px;color:#6b778a;padding:6px 4px}.later:hover{color:#1b2230}
.x{all:unset;position:absolute;top:6px;right:8px;width:24px;height:24px;display:grid;place-items:center;border-radius:50%;color:#8a94a6;cursor:pointer;font-size:13px}.x:hover{background:#e6eefa;color:#1b2230}
@media (prefers-color-scheme:dark){.c{background:#1a2233;border-color:#2f3d55;color:#eef2f8}p{color:#c3ccda}.later{color:#9aa6b8}a.alt{background:#222c40;color:#bcd3f5;border-color:#3a4a66}}`;
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
