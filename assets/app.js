/* ============================================================
   LAB POTATO — page behaviour
   You shouldn't need to edit this file to add a tool or version.
   Edit assets/tools.js instead.
   ============================================================ */

const REPO = "https://github.com/labpotato/labpotato.github.io";

// SUPPORT_URL / SUPPORT_LABEL are defined at the top of tools.js

const ACCENTS = {
  emerald: "#139171",
  violet: "#6a55d6",
  blue: "#2f67d6",
  cyan: "#108a9e",
  amber: "#b8781c",
  rose: "#c94b6d",
  indigo: "#4f4dc6",
};

// Encode each path SEGMENT separately — encoding the whole string would
// turn the "/" in a nested folder into %2F and break the link.
function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function toolPath(tool, version) {
  return `${encodePath(tool.folder)}/${encodePath(version.file)}`;
}

function latestOf(tool) {
  return tool.versions[tool.versions.length - 1];
}

function accentOf(tool) {
  return ACCENTS[tool.accent] || ACCENTS.blue;
}

function iconSvg(name) {
  const known = ["colony", "gel", "gibson", "microscopy", "protein", "flask", "cryobox", "dna", "chart", "calculator"];
  const key = known.includes(name) ? name : "flask";
  return `<svg viewBox="0 0 24 24" stroke="currentColor"><use href="#icon-${key}"></use></svg>`;
}

// "2026-09-26" -> "26 Sep 2026". Parsed as a local date so it never slips a day.
function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

// Released within the last two weeks?
function isFresh(iso) {
  if (!iso) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const age = (Date.now() - new Date(y, m - 1, d).getTime()) / 86400000;
  return age >= 0 && age <= 14;
}

const checkSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;

const sparkSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.2 6.3L20.5 10.5l-6.3 2.2L12 19l-2.2-6.3L3.5 10.5l6.3-2.2z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" opacity=".7"/></svg>`;

const arrowSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>`;

function renderTools() {
  const grid = document.getElementById("tools-grid");
  if (!grid) return;

  grid.innerHTML = TOOLS.map((tool) => {
    const latest = latestOf(tool);
    const older = tool.versions.slice(0, -1).reverse();
    // Three key features, then what the latest release added, highlighted.
    const features = (tool.features || []).length
      ? `<ul class="tool-features">${tool.features.slice(0, 3).map((f, i) => `<li style="--i:${i}">${checkSvg}<span>${f}</span></li>`).join("")}</ul>`
      : "";
    const fresh = (latest.new || []).slice(0, 3);
    const newBlock = fresh.length
      ? `<div class="tool-new">
           <div class="tool-new-h">${sparkSvg}New in ${latest.v}</div>
           <ul>${fresh.map((f, i) => `<li style="--i:${i + 3}">${f}</li>`).join("")}</ul>
         </div>`
      : "";

    const olderBlock = older.length
      ? `<details class="versions-detail">
           <summary>${older.length} legacy release${older.length > 1 ? "s" : ""}</summary>
           <ul>
             ${older.map((v) => `<li><a href="${toolPath(tool, v)}" target="_blank" rel="noopener"${v.date ? ` title="Released ${fmtDate(v.date)}"` : ""}>${v.v}</a></li>`).join("")}
           </ul>
         </details>`
      : "";

    return `
      <article class="tool-card reveal" style="--card:${accentOf(tool)}">
        <div class="tc-main">
          <div class="tc-head">
            <div class="tool-icon app-icon">${appGlyph(tool)}</div>
            <div class="tc-title"><h3>${tool.name}</h3><p class="tool-tagline">${tool.tagline}</p></div>
          </div>
          <p class="tool-desc">${tool.description}</p>
          <div class="tc-foot">
            <a class="tool-open" href="${toolPath(tool, latest)}" target="_blank" rel="noopener">Launch module ${arrowSvg}</a>
            <div class="tool-meta">
              <span class="version-pill">${latest.v} · latest</span>
              ${latest.date ? `<span class="release-date${isFresh(latest.date) ? " fresh" : ""}">${isFresh(latest.date) ? '<span class="new-dot" aria-hidden="true"></span>New · ' : ""}${fmtDate(latest.date)}</span>` : ""}
            </div>
          </div>
          ${olderBlock}
        </div>
        <div class="tc-side">
          ${features}
          ${newBlock}
        </div>
      </article>`;
  }).join("");
}

function renderFeedback() {
  const grid = document.getElementById("feedback-grid");
  if (!grid) return;

  const bubble = `<span class="bubble"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/></svg></span>`;

  grid.innerHTML = TOOLS.map((tool) => {
    const url = `${REPO}/issues/new?template=feedback.md&title=${encodeURIComponent("[" + tool.name + "] ")}`;
    return `
      <a class="feedback-card reveal" style="--card:${accentOf(tool)}" href="${url}" target="_blank" rel="noopener">
        ${tool.name}
        ${bubble}
      </a>`;
  }).join("");
}

const QUOTES = [
  {
    quote: "I use it everyday. It saved my life. But what is Life when I'm in PhD",
    name: "Some lost Soul",
    org: "Structural Biology, year 3 of a 2-year contract",
  },
  {
    quote: "One reason why I don't cry myself to bed anymore.",
    name: "PhD Candidate",
    org: "Currently in year six of four",
  },
  {
    quote: "Finally, scientific software that does not ask me to create an account to export a PNG.",
    name: "Research Assistant",
    org: "Has made 41 accounts this year",
  },
  {
    quote: "My PI asked which vendor we were licensing this from. I said nobody. He looked concerned.",
    name: "Graduate Student",
    org: "Microbiology",
  },
  {
    quote: "Objectively better than the platform our department pays actual money for.",
    name: "Lab Manager",
    org: "Name withheld for procurement reasons",
  },
  {
    quote: "It opened immediately, but I keep procrastinating",
    name: "Senior Scientist",
    org: "Still waiting, apparently",
  },
];

function renderQuotes() {
  const grid = document.getElementById("quote-grid");
  if (!grid) return;

  grid.innerHTML = QUOTES.map(
    (q) => `
      <figure class="quote-card reveal">
        <div class="quote-stars" aria-label="5 out of 5">★★★★★</div>
        <blockquote>${q.quote}</blockquote>
        <figcaption>
          <strong>${q.name}</strong>
          <span>${q.org}</span>
        </figcaption>
      </figure>`
  ).join("");
}

const SPECS = [
  ["Uptime guarantee", "Whenever your browser is open"],
  ["Data residency", "Your Downloads folder"],
  ["Cloud infrastructure", "None. That is the feature."],
  ["SOC 2 Type II", "No"],
  ["ISO 27001", "Also no"],
  ["Average onboarding time", "Approximately one double-click"],
  ["Support SLA", "I reply when I see it"],
  ["Horizontal scalability", "Scales to exactly one scientist at a time"],
  ["Disaster recovery", "Press Ctrl+Z, then panic"],
  ["Pricing model", "Free. There is no tier two. There is no upsell."],
  ["Funding raised to date", "S$0 across 0 rounds"],
  ["Headcount", "One, and he is tired"],
];

// One extra aside per row, in the same order as SPECS — shown as a toast
// when that row is clicked.
const SPEC_ASIDES = [
  "Also whenever the WiFi is having a good day.",
  "It has never once asked to leave.",
  "There is a cloud. It is outside. We do not control it.",
  "We looked into it. Then we looked away.",
  "We do have an ISO. It just says “9001 problems.”",
  "Some users report it taking even less time to regret.",
  "Response times worsen during exam season.",
  "Vertical scalability: also one scientist, just standing.",
  "Step two is blaming the incubator.",
  "Still cheaper than what your department currently pays.",
  "Series A pending a very generous relative.",
  "Org chart available on request. It is one circle.",
];

function renderSpecs() {
  const table = document.getElementById("spec-table");
  if (!table) return;

  table.innerHTML = SPECS.map(
    ([k, v], i) => `<div class="spec-row" data-aside="${i}"><dt>${k}</dt><dd>${v}</dd></div>`
  ).join("");

  table.addEventListener("click", (e) => {
    const row = e.target.closest(".spec-row");
    if (!row) return;
    const aside = SPEC_ASIDES[Number(row.dataset.aside)];
    if (aside) toast(aside);
  });
}

function renderSupport() {
  const slot = document.getElementById("support-slot");
  if (!slot || typeof SUPPORT_URL !== "string" || !SUPPORT_URL.trim()) return;

  slot.outerHTML = `
    <a class="footer-support" href="${SUPPORT_URL}" target="_blank" rel="noopener">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 9h13v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/>
        <path d="M17 10h1.8a2.7 2.7 0 0 1 0 5.4H17"/>
        <path d="M7.5 3v2.5M11 3v2.5M14.5 3v2.5"/>
      </svg>
      ${SUPPORT_LABEL}
    </a>`;
}

// Shared floating toast, used by every click-driven aside that isn't the
// hero mascot's own speech bubble (that one stays anchored above it).
let toastHideTimer;
function toast(text, ms = 3200) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastHideTimer);
  toastHideTimer = setTimeout(() => el.classList.remove("show"), ms);
}

const TRUST_ASIDES = [
  "They know. They have chosen not to say anything.",
  "Let's keep it that way.",
  "We have not been able to independently confirm this.",
  "Growing to five, pending outreach.",
  "We remain hopeful.",
];

function initTrustStrip() {
  const list = document.getElementById("trust-logos");
  if (!list) return;

  [...list.children].forEach((li, i) => {
    li.addEventListener("click", () => toast(TRUST_ASIDES[i] || "Verified. Somehow."));
  });
}

const FOOTER_LINES = [
  "You scrolled all the way down here. Respect.",
  "This is the bottom. There is nothing else.",
  "Also a potato. Smaller. Somehow more tired.",
  "Footer potato, reporting for duty.",
  "Thanks for reading this far. Go home.",
  "Still cheaper than a SaaS subscription.",
  "There is no easter egg down here. Wait.",
];

function initFooterPotato() {
  const btn = document.getElementById("footer-potato");
  if (!btn) return;

  let i = Math.floor(Math.random() * FOOTER_LINES.length);
  btn.addEventListener("click", () => {
    btn.classList.remove("nod");
    void btn.offsetWidth;
    btn.classList.add("nod");
    toast(FOOTER_LINES[i], 3000);
    i = (i + 1) % FOOTER_LINES.length;
  });
}

// Type "potato" anywhere on the page for a small reward. Not documented,
// not advertised — that's the point.
function initSecretPotato() {
  const target = "potato";
  let buffer = "";

  const confettiHost = document.getElementById("confetti-layer");
  function spawnConfetti() {
    if (!confettiHost) return;
    for (let i = 0; i < 10; i++) {
      const piece = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      piece.setAttribute("viewBox", "22 46 208 144");
      piece.classList.add("confetti-piece");
      piece.style.left = `${Math.random() * 96}vw`;
      piece.style.animationDelay = `${Math.random() * 0.4}s`;
      piece.innerHTML = `<path d="M28 118C26 88 52 64 88 56C124 48 168 52 196 70C220 86 226 112 216 136C204 164 168 182 128 184C88 186 50 172 36 148C30 138 28 128 28 118Z" fill="currentColor"></path>`;
      confettiHost.appendChild(piece);
      piece.addEventListener("animationend", () => piece.remove());
    }
  }

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    // Ignore typing while a real text field is focused.
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    buffer = (buffer + e.key.toLowerCase()).slice(-target.length);
    if (buffer === target) {
      spawnConfetti();
      toast("You have found the secret potato mode. There is no prize.", 3600);
      const mascot = document.getElementById("mascot");
      if (mascot) {
        mascot.classList.remove("hop");
        void mascot.offsetWidth;
        mascot.classList.add("hop");
      }
      buffer = "";
    }
  });
}

function initReveal() {
  const items = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        // Stagger siblings slightly so grids cascade instead of popping.
        const siblings = [...entry.target.parentElement.children];
        const delay = Math.min(siblings.indexOf(entry.target), 5) * 70;
        setTimeout(() => entry.target.classList.add("in"), delay);
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );

  items.forEach((el) => observer.observe(el));
}

// Returns a picker that never repeats the immediately-previous item.
function makeNoRepeatPicker(arr) {
  let last = -1;
  return function pick() {
    if (arr.length === 1) return arr[0];
    let i;
    do { i = Math.floor(Math.random() * arr.length); } while (i === last);
    last = i;
    return arr[i];
  };
}

function initMascot() {
  const mascot = document.getElementById("mascot");
  const speech = document.getElementById("speech");
  if (!mascot || !speech) return;

  const lines = [
    // at the movies — kept lean, only the ones that land without explaining themselves
    "You're gonna need a bigger centrifuge.",
    "Life, uh, finds a way. Usually in my negative control.",
    "I see dead cells.",
    "You either die a PhD student, or live long enough to become the PI.",
    "Keep your friends close and your lab partner closer.",
    "First rule of lab meeting: do not talk about your results.",
    "Just keep pipetting. Just keep pipetting.",
    "Houston, we have a contamination.",
    "I'll be back. After this incubation.",
    "I once forgot to put a ladder in my gel.",
    "The last aliquot. My precious.",

    // things that actually happened
    "p = 0.051. I'm calling it.",
    "The machine looked fine yesterday.",
    "Labsolutely tired.",
    "My PCR has been running and I forgot about it.",
    "I think I used the expensive enzyme for a colony PCR.",
    "It worked once. That's reproducible enough.",
    "Started at 9am. It's 9pm. Shit.",
    "Yes, I labelled that tube '1'.",
    "Did you use my LB agar?",
    "Ran the stats until they agreed with me.",
    "'Quick experiment,' he said.",
    "This figure took longer than the experiment.",
    "Repeated it. Got the opposite result. Repeating again.",
    "My thesis is failed controls in a nice font.",
    "Technically negative result is still result.",
    "Cited my lab, all over the reivew.",
    "Dropped the plate. We don't talk about it.",
    "Slides made at 3am, presented at 9am.",
    "Three years in. Still can't read a full paper.",
    "The freezer that broke had my only stock.",

    // more at the bench
    "Genotyped the wrong mouse. Found out at imaging.",
    "The incubator's been in Fahrenheit since March.",
    "Forgot which flask was the wild-type. All of them, technically.",
    "Left the LC/MS running over the long weekend.",
    "Mixed up the primer tubes and sequenced my own contamination.",
    "The centrifuge was unbalanced. So was I.",
  ];

  // If nobody's clicked it in a while, the mascot starts asking for it.
  // First nag is always the same line; after that, a little variety.
  const IDLE_FIRST_MS = 18000;
  const IDLE_REPEAT_MS = 15000;
  const IDLE_MAX_NAGS = 3;
  const IDLE_LINES = ["Bite me, bite me, bite me.", "Still here.", "Click me. I'm bored."];

  let hideTimer;
  let idleTimer;
  let idleCount = 0;

  // The goggles are worn correctly at all times, except when they aren't.
  const goggles = document.getElementById("goggles");
  let gogglesOn = true;

  const COAST_CLEAR = [
    "Safety officer has left the building.",
    "Inspection over. These are coming off.",
    "They are gone. We're free.",
    "Nobody saw that.",
    "Are they gone?",
    "Audit passed. Goggles now optional.",
  ];
  const INSPECTION = [
    "INSPECTION. ACT NATURAL.",
    "They are here — goggles on, goggles on.",
    "I have always been wearing these.",
    "Safety first. Obviously. Always.",
    "Compliance is a lifestyle, not an event.",
  ];

  // Once they're off, they stay off for at least this many jokes before
  // the inspector comes back round.
  const JOKES_BEFORE_INSPECTION = 5;
  let jokesSinceThrow = 0;

  const pickLine = makeNoRepeatPicker(lines);
  const pickCoastClear = makeNoRepeatPicker(COAST_CLEAR);
  const pickInspection = makeNoRepeatPicker(INSPECTION);

  function say(text, ms) {
    speech.textContent = text;
    speech.classList.add("show");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => speech.classList.remove("show"), ms);
  }
  function scheduleIdleNag() {
    clearTimeout(idleTimer);
    if (idleCount >= IDLE_MAX_NAGS) return;
    idleTimer = setTimeout(() => {
      say(idleCount === 0 ? IDLE_LINES[0] : IDLE_LINES[Math.floor(Math.random() * IDLE_LINES.length)], 3200);
      idleCount++;
      scheduleIdleNag();
    }, idleCount === 0 ? IDLE_FIRST_MS : IDLE_REPEAT_MS);
  }

  function hop() {
    mascot.classList.remove("hop");
    void mascot.offsetWidth; // restart the animation
    mascot.classList.add("hop");
  }

  mascot.addEventListener("click", () => {
    hop();

    // Any real interaction resets the "are you still there" clock.
    idleCount = 0;
    scheduleIdleNag();

    // goggles on -> fling them off, and start counting
    if (goggles && gogglesOn) {
      gogglesOn = false;
      jokesSinceThrow = 0;
      goggles.classList.remove("snap");
      goggles.classList.add("thrown");
      say(pickCoastClear(), 3600);
      return;
    }

    // enough jokes have gone by — the inspector is back
    if (goggles && !gogglesOn && jokesSinceThrow >= JOKES_BEFORE_INSPECTION) {
      gogglesOn = true;
      goggles.classList.remove("thrown");
      void goggles.getBoundingClientRect(); // restart the animation
      goggles.classList.add("snap");
      say(pickInspection(), 2800);
      return;
    }

    say(pickLine(), 3600);
    jokesSinceThrow++;
  });

  mascot.addEventListener("animationend", (e) => {
    if (e.target === mascot) mascot.classList.remove("hop");
  });

  scheduleIdleNag();
}

/* Quick launch: app icons like a phone home screen. Each tool has its own solid, two-tone glyph:
   white shapes on the tool's colour, details in the tool's colour. */
const C = 'style="fill:var(--card)"', CS = 'style="stroke:var(--card)"';
const APP_GLYPH = {
  flask: `<rect x="12" y="8" width="25" height="32" rx="4" fill="#fff"/><rect x="12" y="8" width="6" height="32" rx="3" ${C} opacity=".22"/>
    <path d="M22.5 17h9M22.5 22h9M22.5 27h6" ${CS} stroke-width="2.4" stroke-linecap="round" fill="none"/><path d="M30 8v10l2.75-2.2L35.5 18V8z" fill="#ffcf6b"/>`,
  colony: `<circle cx="24" cy="24" r="15.5" fill="#fff"/><circle cx="24" cy="24" r="12" fill="none" ${CS} stroke-opacity=".22" stroke-width="1.6"/>
    <circle cx="19" cy="20" r="2.6" ${C}/><circle cx="27.5" cy="17.5" r="1.8" ${C} opacity=".8"/><circle cx="29.5" cy="26.5" r="3" ${C}/>
    <circle cx="20.5" cy="29" r="2" ${C} opacity=".75"/><circle cx="25" cy="23.5" r="1.3" ${C} opacity=".6"/><circle cx="16.5" cy="25.5" r="1.4" ${C} opacity=".55"/>`,
  gel: `<rect x="9" y="10" width="30" height="28" rx="4" fill="#fff"/>
    <g ${C}><rect x="13" y="13" width="4.5" height="2" rx="1" opacity=".3"/><rect x="21.75" y="13" width="4.5" height="2" rx="1" opacity=".3"/><rect x="30.5" y="13" width="4.5" height="2" rx="1" opacity=".3"/>
    <rect x="13" y="19" width="4.5" height="2.4" rx="1.2"/><rect x="13" y="24" width="4.5" height="2.4" rx="1.2" opacity=".55"/><rect x="13" y="29" width="4.5" height="2.4" rx="1.2" opacity=".35"/><rect x="13" y="33" width="4.5" height="2" rx="1" opacity=".25"/>
    <rect x="21.75" y="22" width="4.5" height="2.6" rx="1.3"/><rect x="30.5" y="22" width="4.5" height="2.6" rx="1.3" opacity=".7"/><rect x="30.5" y="27" width="4.5" height="2.4" rx="1.2"/></g>`,
  gibson: `<rect x="6" y="14" width="25" height="7" rx="3.5" fill="#fff"/><rect x="17" y="27" width="25" height="7" rx="3.5" fill="#fff" fill-opacity=".72"/>
    <path d="M19.5 21.5v5M23 21.5v5M26.5 21.5v5M30 21.5v5" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
    <rect x="6" y="14" width="9" height="7" rx="3.5" ${C} opacity=".28"/><rect x="33" y="27" width="9" height="7" rx="3.5" ${C} opacity=".28"/>`,
  microscopy: `<rect x="9" y="9" width="14" height="14" rx="3" fill="#fff"/><rect x="25" y="9" width="14" height="14" rx="3" fill="#fff" fill-opacity=".85"/>
    <rect x="9" y="25" width="14" height="14" rx="3" fill="#fff" fill-opacity=".85"/><rect x="25" y="25" width="14" height="14" rx="3" fill="#fff"/>
    <circle cx="15" cy="15" r="3" ${C}/><circle cx="32" cy="16" r="2.4" ${C} opacity=".7"/><circle cx="16" cy="32" r="2.6" ${C} opacity=".55"/><circle cx="31" cy="31" r="3.2" ${C}/><circle cx="34" cy="34.5" r="1.4" ${C} opacity=".6"/>`,
  protein: `<path d="M10 37.5h28" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><rect x="12.5" y="26" width="6" height="9" rx="2" fill="#fff" fill-opacity=".7"/>
    <rect x="21" y="19" width="6" height="16" rx="2" fill="#fff" fill-opacity=".85"/><rect x="29.5" y="11" width="6" height="24" rx="2" fill="#fff"/>
    <rect x="31" y="14" width="3" height="5" rx="1.2" ${C} opacity=".55"/>`,
  cryobox: `<rect x="9" y="9" width="30" height="30" rx="4.5" fill="#fff"/>
    <g ${C}><circle cx="17" cy="17" r="3"/><circle cx="24" cy="17" r="3" opacity=".7"/><circle cx="31" cy="17" r="3"/><circle cx="17" cy="24" r="3" opacity=".45"/><circle cx="24" cy="24" r="3"/>
    <circle cx="31" cy="24" r="3" opacity=".7"/><circle cx="17" cy="31" r="3"/><circle cx="24" cy="31" r="3" opacity=".25"/><circle cx="31" cy="31" r="3" opacity=".25"/></g>`,
};
function appGlyph(tool) { const g = APP_GLYPH[tool.icon]; return g ? `<svg viewBox="0 0 48 48" aria-hidden="true">${g}</svg>` : iconSvg(tool.icon); }

function renderQuick() {
  const row = document.getElementById("quick-grid");
  if (!row) return;
  row.innerHTML = TOOLS.map((tool) => {
    const latest = latestOf(tool);
    return `<a class="app" style="--card:${accentOf(tool)}" href="${toolPath(tool, latest)}" target="_blank" rel="noopener" title="Open ${tool.name} ${latest.v}">
        <span class="app-icon">${appGlyph(tool)}</span>
        <span class="app-name">${tool.name}</span>
        <span class="app-cap">${tool.short || tool.tagline}</span>
      </a>`;
  }).join("");
}

/* A click anywhere on a platform card opens the tool, except on its own links and the legacy-release list */
document.addEventListener("click", (e) => {
  const card = e.target.closest && e.target.closest(".tool-card");
  if (!card || e.target.closest("a, button, summary, details, input, select, textarea")) return;
  if (window.getSelection && String(window.getSelection()).trim()) return;   // selecting text is not a click to launch
  const go = card.querySelector(".tool-open"); if (go) window.open(go.href, "_blank", "noopener");
});

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

renderTools();
renderQuick();
renderFeedback();
renderQuotes();
renderSpecs();
renderSupport();
initReveal();
initMascot();
initTrustStrip();
initFooterPotato();
initSecretPotato();


/* Colour theme: Auto follows the system; Light or Dark is remembered on this device. */
(function themeSwitch() {
  const root = document.documentElement, btns = document.querySelectorAll("[data-theme-set]");
  const mark = () => { const cur = root.dataset.theme || "auto"; btns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.themeSet === cur))); };
  btns.forEach((b) => b.addEventListener("click", () => {
    const t = b.dataset.themeSet;
    if (t === "auto") delete root.dataset.theme; else root.dataset.theme = t;
    try { if (t === "auto") localStorage.removeItem("lp-theme"); else localStorage.setItem("lp-theme", t); } catch (e) {}
    mark();
  }));
  mark();
})();
