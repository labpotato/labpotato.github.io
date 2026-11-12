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

/* A tool updated in the last 14 days wears a glowing star until this browser opens its new version.
   What was opened is kept in this browser only (localStorage "lp-seen": tool id → version). */
const SEEN_KEY = "lp-seen";
function seenMap() { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}") || {}; } catch (e) { return {}; } }
function isUnseen(tool) { const l = latestOf(tool); return !!(l && isFresh(l.date) && seenMap()[tool.id] !== l.v); }
function markSeen(tool) {
  const l = latestOf(tool); if (!l) return; const m = seenMap(); if (m[tool.id] === l.v) return;
  m[tool.id] = l.v; try { localStorage.setItem(SEEN_KEY, JSON.stringify(m)); } catch (e) { /* storage blocked: the star just stays */ }
  document.querySelectorAll(`[data-tool="${tool.id}"].updated`).forEach((el) => {   // the star bursts once, then the card is back to normal
    el.classList.remove("updated"); el.classList.add("just-seen"); setTimeout(() => el.classList.remove("just-seen"), 1200);
  });
}
const starSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.7 6.1 6.6.6-5 4.4 1.5 6.5L12 16.8l-5.8 3.3 1.5-6.5-5-4.4 6.6-.6z"/></svg>`;

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
      ? `<details class="tool-new">
           <summary class="tool-new-h">${sparkSvg}New in ${latest.v} <span class="tool-new-n">${fresh.length} change${fresh.length > 1 ? "s" : ""}</span></summary>
           <ul>${fresh.map((f, i) => `<li style="--i:${i + 3}">${f}</li>`).join("")}</ul>
         </details>`
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
      <article class="tool-card reveal${isUnseen(tool) ? " updated" : ""}" data-tool="${tool.id}" style="--card:${accentOf(tool)}">
        <span class="upd-star" title="Updated to ${latest.v}${latest.date ? " on " + fmtDate(latest.date) : ""}: not opened yet">${starSvg}</span>
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
        setTimeout(() => {
          entry.target.classList.add("in");
          // a tool card's icon plays its little animation once as it arrives
          if (entry.target.classList.contains("tool-card")) {
            setTimeout(() => entry.target.classList.add("play"), 250);
            setTimeout(() => entry.target.classList.remove("play"), 1600);
          }
        }, delay);
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

/* A mound of soil under a mascot button. Asleep, the potato sinks into it; woken, it shakes,
   pops back out like it grew there, throws a little dirt and the mound sinks away. */
function addPit(btn) {
  const svg = btn.querySelector("svg");
  if (!svg || btn.querySelector(".pit")) return;
  const pit = document.createElement("span");
  pit.className = "pit";
  svg.replaceWith(pit);
  pit.appendChild(svg);
  const soil = document.createElement("span");
  soil.className = "soil";
  soil.setAttribute("aria-hidden", "true");
  soil.innerHTML = "<i></i><i></i><i></i><i></i><i></i>";
  btn.appendChild(soil);
}
function popOut(btn) {
  btn.classList.add("waking");
  setTimeout(() => btn.classList.remove("asleep"), 380);   // shake in the ground first, then rise
  setTimeout(() => btn.classList.remove("waking"), 1500);
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

  // Left alone for long enough, it nods off. A click wakes it.
  const SLEEP_AFTER_MS = 75000;
  const DOZE_LINES = ["Long incubation. Wake me when it's done.", "Resting my eyes. For science.", "Just until the gel finishes."];
  const WAKE_LINES = [
    "I wasn't asleep. I was incubating.",
    "What year is it? Is my PCR done?",
    "Five more minutes. The gel's still running.",
    "I was thinking with my eyes closed.",
    "You woke me for this?",
  ];
  let sleepTimer;
  let asleep = false;

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
  const pickDoze = makeNoRepeatPicker(DOZE_LINES);
  const pickWake = makeNoRepeatPicker(WAKE_LINES);

  addPit(mascot);
  const zzz = document.createElement("span");
  zzz.className = "zzz";
  zzz.setAttribute("aria-hidden", "true");
  zzz.innerHTML = "<i>z</i><i>z</i><i>z</i>";
  mascot.appendChild(zzz);

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

  function scheduleSleep() {
    clearTimeout(sleepTimer);
    sleepTimer = setTimeout(() => {
      asleep = true;
      clearTimeout(idleTimer);
      say(pickDoze(), 3200);
      mascot.classList.add("asleep");
      mascot.setAttribute("aria-label", "Wake the mascot");
    }, SLEEP_AFTER_MS);
  }

  mascot.addEventListener("click", () => {
    if (!asleep) hop();

    // Any real interaction resets the "are you still there" clock.
    idleCount = 0;
    scheduleIdleNag();
    scheduleSleep();

    // asleep -> eyes open, goggles straightened (or back on), and an excuse
    if (asleep) {
      asleep = false;
      popOut(mascot);
      mascot.setAttribute("aria-label", "Interact with the mascot");
      if (goggles && !gogglesOn) {
        gogglesOn = true;
        goggles.classList.remove("thrown");
        void goggles.getBoundingClientRect();
        goggles.classList.add("snap");
      }
      say(pickWake(), 3400);
      return;
    }

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
  scheduleSleep();

  // lets the tool guide speak through this mascot while it is on screen
  return { say, isAsleep: () => asleep, el: mascot };
}

/* The tool guide. Point at a tool anywhere on the page and the potato says what it is, how it
   helps, or what it thinks of the person who built it. The hero mascot does the talking while it
   is on screen; once you scroll past it, a small one sits in the corner and takes over.
   Pointer devices only: there is no hovering on a phone. */
const TOOL_REMARKS = {
  "lab-entry": [
    "Lab Entry. A lab notebook laid out on a timeline. Write it down, or it didn't happen.",
    "It links every experiment to its to-dos, so \"I'll remember that\" stops being the plan.",
    "He says it keeps him organised. I've seen his bench.",
  ],
  "colony-counter": [
    "Colony Counter. Drop in a plate photo, get the count and CFU/mL.",
    "It finds the dish and counts, even colonies that touch. Click to fix what it missed.",
    "He built it after losing count one time too many. He's still not over it.",
  ],
  "gel-labeler": [
    "Gel Labeler. Lanes, ladders and band arrows, placed on your gel.",
    "Exports a PNG or an editable PowerPoint slide. No more arrows drawn at 1am.",
    "His old gel figures were a crime. This is the apology.",
  ],
  "gibson-assembly": [
    "Gibson Assembly. Paste your fragments in order, get primers with matched Tm.",
    "You see the expected gel and a live plasmid map before you order anything.",
    "He trusts this more than his own primer design. So do I.",
  ],
  "microscopy-image-labeler": [
    "Microscopy Image Labeler. Channel images in, one labelled figure out.",
    "The crop stays synced across a row, so the panels finally line up.",
    "Reviewer 2 will still find something. He's made his peace with that.",
  ],
  "protein-quant": [
    "Protein Quant. A280 or a standard curve in, concentration and yield out.",
    "It checks your yield per litre against your expression host. No spreadsheet needed.",
    "He made this to stop rebuilding the same Excel sheet every prep.",
  ],
  "cryobox-labeler": [
    "Cryobox Labeler. Every tube in your -80 and -20, from rack to box to tube.",
    "One search across all your freezers. Your fingers stay warm.",
    "He once remade a construct he already had. Then he made this.",
  ],
  "doc-reader": [
    "Doc Reader. Open a PDF or a web page, then highlight, comment and edit.",
    "There's an AI editor if you connect one. Its edits show up as tracked changes.",
    "He built a paper reader to avoid reading papers. Bold strategy.",
  ],
  "sequence-studio": [
    "Sequence Studio. Opens SnapGene, GenBank and FASTA files right in the tab.",
    "Maps, digests, primers, even folding. No download, no licence.",
    "He got tired of walking to the one PC with the licence. Now he doesn't.",
  ],
};
const GUIDE_LINES = [
  "I'm the guide. Point at a tool and I'll tell you what it does.",
  "Everything here is free. He insists. I just work here.",
  "He's a PhD student. Be nice, he's tired.",
  "He builds these between experiments. The experiments are fine. Probably.",
  "Found a bug? Tell him. He actually fixes them.",
  "No sign-up. I checked. Twice.",
];

function initGuide(hero) {
  if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const heroSvg = hero && hero.el.querySelector("svg");
  if (!heroSvg) return;
  let off = false;
  try { off = sessionStorage.getItem("lp-guide") === "off"; } catch (e) {}
  if (off) return;

  // a small copy of the mascot for the corner (it borrows the hero's skin gradient)
  const svg = heroSvg.cloneNode(true);
  svg.querySelectorAll("defs").forEach((d) => d.remove());
  svg.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
  svg.querySelector(".m-goggles").classList.remove("thrown", "snap");

  const guide = document.createElement("aside");
  guide.className = "guide";
  guide.setAttribute("aria-label", "Tool guide");
  guide.innerHTML = `<div class="guide-say" role="status" aria-live="polite"></div>
    <button class="guide-x" type="button" aria-label="Hide the guide" title="Hide the guide">\u00d7</button>
    <button class="guide-pot mascot" type="button" aria-label="Ask the guide"><span class="zzz" aria-hidden="true"><i>z</i><i>z</i><i>z</i></span></button>`;
  const pot = guide.querySelector(".guide-pot");
  const bubble = guide.querySelector(".guide-say");
  pot.prepend(svg);
  addPit(pot);
  document.body.appendChild(guide);

  const SLEEP_AFTER_MS = 90000;
  let asleep = false, sleepTimer, hideTimer, hoverTimer, lastTool = "";
  let heroInView = true;
  function scheduleSleep() {
    clearTimeout(sleepTimer);
    sleepTimer = setTimeout(() => { asleep = true; guide.classList.add("asleep"); pot.classList.add("asleep"); pot.setAttribute("aria-label", "Wake the guide"); }, SLEEP_AFTER_MS);
  }
  // The big mascot does the talking while its speech bubble is fully on screen (clear of the
  // top bar); otherwise the corner guide comes out and takes over.
  const speechSlot = document.querySelector(".speech-slot");
  const topBar = document.querySelector(".site-header");
  function heroOnScreen() {
    const r = (speechSlot || hero.el).getBoundingClientRect(), m = hero.el.getBoundingClientRect();
    const bar = topBar ? topBar.getBoundingClientRect().bottom : 0;
    return r.top >= bar + 2 && m.bottom <= window.innerHeight;
  }
  let ticking = false;
  function place() {
    ticking = false;
    const now = heroOnScreen();
    if (now === heroInView && guide.classList.contains("on") === !now) return;
    heroInView = now;
    guide.classList.toggle("on", !heroInView);
    if (heroInView) { bubble.classList.remove("show"); clearTimeout(sleepTimer); }
    else if (!asleep) scheduleSleep();   // the nap clock only runs while the guide is on duty
  }
  function onMove() { if (!ticking) { ticking = true; requestAnimationFrame(place); } }
  window.addEventListener("scroll", onMove, { passive: true });
  window.addEventListener("resize", onMove);
  place();

  function guideSay(text, ms) {
    bubble.textContent = text;
    bubble.classList.add("show");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => bubble.classList.remove("show"), ms);
  }
  function hop() { pot.classList.remove("hop"); void pot.offsetWidth; pot.classList.add("hop"); }
  pot.addEventListener("animationend", (e) => { if (e.target === pot) pot.classList.remove("hop"); });

  const pickers = {};
  const pickGuide = makeNoRepeatPicker(GUIDE_LINES);
  function remark(id) {
    const tool = TOOLS.find((t) => t.id === id);
    const lines = TOOL_REMARKS[id] || (tool ? [`${tool.name}. ${tool.description}`] : null);
    if (!lines) return "";
    pickers[id] = pickers[id] || { i: 0 };
    return lines[pickers[id].i++ % lines.length];   // what it is, then how it helps, then the opinion
  }

  function onTool(id) {
    const text = remark(id);
    if (!text) return;
    if (heroInView) { if (!hero.isAsleep()) hero.say(text, 5200); return; }
    if (asleep) { guideSay("Zzz. (Click me.)", 2600); return; }
    scheduleSleep();
    guideSay(text, 5200);
  }
  function overTool(e) {
    const el = e.target.closest && e.target.closest("[data-tool]");
    const id = el ? el.getAttribute("data-tool") : "";
    if (id === lastTool) return;
    lastTool = id;
    clearTimeout(hoverTimer);
    if (id) hoverTimer = setTimeout(() => onTool(id), 280);   // only when the pointer settles on it
  }
  document.addEventListener("mouseover", overTool);
  document.addEventListener("focusin", overTool);

  pot.addEventListener("click", () => {
    if (!asleep) hop();
    scheduleSleep();
    if (asleep) {
      asleep = false;
      guide.classList.remove("asleep");
      popOut(pot);
      pot.setAttribute("aria-label", "Ask the guide");
      guideSay("I'm up. I'm up.", 2600);
      return;
    }
    guideSay(pickGuide(), 4200);
  });
  guide.querySelector(".guide-x").addEventListener("click", () => {
    guide.remove();
    document.removeEventListener("mouseover", overTool);
    document.removeEventListener("focusin", overTool);
    window.removeEventListener("scroll", onMove);
    window.removeEventListener("resize", onMove);
    clearTimeout(sleepTimer);
    try { sessionStorage.setItem("lp-guide", "off"); } catch (e) {}
  });
}

/* Quick launch: app icons like a phone home screen. Each tool has its own solid, two-tone glyph:
   white shapes on the tool's colour, details in the tool's colour. */
const C = 'style="fill:var(--card)"', CS = 'style="stroke:var(--card)"';
const APP_GLYPH = {
  flask: `<rect x="12" y="8" width="25" height="32" rx="4" fill="#fff"/><rect x="12" y="8" width="6" height="32" rx="3" ${C} opacity=".22"/>
    <path class="g-write" d="M22.5 17h9M22.5 22h9M22.5 27h6" ${CS} stroke-width="2.4" stroke-linecap="round" fill="none"/><path class="g-tab" d="M30 8v10l2.75-2.2L35.5 18V8z" fill="#ffcf6b"/>`,
  colony: `<circle cx="24" cy="24" r="15.5" fill="#fff"/><circle cx="24" cy="24" r="12" fill="none" ${CS} stroke-opacity=".22" stroke-width="1.6"/>
    <circle class="g-pop" cx="19" cy="20" r="2.6" ${C}/><circle class="g-pop" cx="27.5" cy="17.5" r="1.8" ${C} opacity=".8"/><circle class="g-pop" cx="29.5" cy="26.5" r="3" ${C}/>
    <circle class="g-pop" cx="20.5" cy="29" r="2" ${C} opacity=".75"/><circle class="g-pop" cx="25" cy="23.5" r="1.3" ${C} opacity=".6"/><circle class="g-pop" cx="16.5" cy="25.5" r="1.4" ${C} opacity=".55"/>`,
  gel: `<rect x="9" y="10" width="30" height="28" rx="4" fill="#fff"/>
    <g ${C}><rect x="13" y="13" width="4.5" height="2" rx="1" opacity=".3"/><rect x="21.75" y="13" width="4.5" height="2" rx="1" opacity=".3"/><rect x="30.5" y="13" width="4.5" height="2" rx="1" opacity=".3"/>
    <rect class="g-band" x="13" y="19" width="4.5" height="2.4" rx="1.2"/><rect class="g-band" x="13" y="24" width="4.5" height="2.4" rx="1.2" opacity=".55"/><rect class="g-band" x="13" y="29" width="4.5" height="2.4" rx="1.2" opacity=".35"/><rect class="g-band" x="13" y="33" width="4.5" height="2" rx="1" opacity=".25"/>
    <rect class="g-band" x="21.75" y="22" width="4.5" height="2.6" rx="1.3"/><rect class="g-band" x="30.5" y="22" width="4.5" height="2.6" rx="1.3" opacity=".7"/><rect class="g-band" x="30.5" y="27" width="4.5" height="2.4" rx="1.2"/></g>`,
  gibson: `<g class="g-arc" style="--i:0"><circle cx="24" cy="24" r="13" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="22 59.7" transform="rotate(4 24 24)"/></g>
    <g class="g-arc" style="--i:1"><circle cx="24" cy="24" r="13" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="22 59.7" transform="rotate(124 24 24)"/></g>
    <g class="g-arc" style="--i:2"><circle cx="24" cy="24" r="13" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="22 59.7" transform="rotate(244 24 24)"/></g>
    <g class="g-seal" style="--i:3"><circle cx="24" cy="24" r="13" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="6.2 75.5" stroke-opacity=".62" transform="rotate(100 24 24)"/></g>
    <g class="g-seal" style="--i:4"><circle cx="24" cy="24" r="13" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="6.2 75.5" stroke-opacity=".62" transform="rotate(220 24 24)"/></g>
    <g class="g-seal" style="--i:5"><circle cx="24" cy="24" r="13" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="6.2 75.5" stroke-opacity=".62" transform="rotate(340 24 24)"/></g>`,

  microscopy: `<rect x="9" y="9" width="14" height="14" rx="3" fill="#fff"/><rect x="25" y="9" width="14" height="14" rx="3" fill="#fff" fill-opacity=".85"/>
    <rect x="9" y="25" width="14" height="14" rx="3" fill="#fff" fill-opacity=".85"/><rect x="25" y="25" width="14" height="14" rx="3" fill="#fff"/>
    <circle class="g-pop" cx="15" cy="15" r="3" ${C}/><circle class="g-pop" cx="32" cy="16" r="2.4" ${C} opacity=".7"/><circle class="g-pop" cx="16" cy="32" r="2.6" ${C} opacity=".55"/><circle class="g-pop" cx="31" cy="31" r="3.2" ${C}/><circle class="g-pop" cx="34" cy="34.5" r="1.4" ${C} opacity=".6"/>`,
  protein: `<path d="M10 37.5h28" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><rect class="g-bar" x="12.5" y="26" width="6" height="9" rx="2" fill="#fff" fill-opacity=".7"/>
    <rect class="g-bar" x="21" y="19" width="6" height="16" rx="2" fill="#fff" fill-opacity=".85"/><rect class="g-bar" x="29.5" y="11" width="6" height="24" rx="2" fill="#fff"/>
    <rect x="31" y="14" width="3" height="5" rx="1.2" ${C} opacity=".55"/>`,
  dna: `<circle cx="24" cy="24" r="14" fill="none" stroke="#fff" stroke-width="2.2" opacity=".45"/>
    <circle class="g-pop" cx="24" cy="24" r="14" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-dasharray="19 69" transform="rotate(-70 24 24)"/>
    <circle class="g-pop" cx="24" cy="24" r="14" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-dasharray="12 76" transform="rotate(40 24 24)" opacity=".8"/>
    <circle class="g-pop" cx="24" cy="24" r="14" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-dasharray="22 66" transform="rotate(125 24 24)" opacity=".6"/>
    <circle cx="24" cy="24" r="6.5" fill="#fff"/><path class="g-pop" d="M20.5 24h7M25 21.5l2.5 2.5-2.5 2.5" fill="none" ${CS} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  reader: `<rect x="11" y="7" width="26" height="34" rx="4" fill="#fff"/>
    <rect x="16" y="14" width="16" height="2.6" rx="1.3" ${C} opacity=".3"/><rect x="16" y="20" width="16" height="2.6" rx="1.3" ${C} opacity=".3"/><rect x="16" y="26" width="10" height="2.6" rx="1.3" ${C} opacity=".3"/>
    <rect class="g-hl" x="15" y="19" width="12" height="4.6" rx="1.6" fill="#ffd84d" opacity=".85"/>
    <path d="M30 30.5a4.5 4.5 0 1 1 1.6 3.4L29 35l.6-2.6A4.5 4.5 0 0 1 30 30.5z" ${C}/>`,
  cryobox: `<rect x="9" y="9" width="30" height="30" rx="4.5" fill="#fff"/>
    <g ${C}><circle class="g-pop" cx="17" cy="17" r="3"/><circle class="g-pop" cx="24" cy="17" r="3" opacity=".7"/><circle class="g-pop" cx="31" cy="17" r="3"/><circle class="g-pop" cx="17" cy="24" r="3" opacity=".45"/><circle class="g-pop" cx="24" cy="24" r="3"/>
    <circle class="g-pop" cx="31" cy="24" r="3" opacity=".7"/><circle class="g-pop" cx="17" cy="31" r="3"/><circle class="g-pop" cx="24" cy="31" r="3" opacity=".25"/><circle class="g-pop" cx="31" cy="31" r="3" opacity=".25"/></g>`,
};
function appGlyph(tool) {   // parts tagged g-* get a stagger index (--i) for their little hover animation
  let i = 0; const raw = APP_GLYPH[tool.icon];
  const g = raw && raw.replace(/<(\w+) class="(g-\w+)"([^>]*)>/g, (m, el, c, rest) => /style="/.test(rest)
    ? `<${el} class="${c}"${rest.replace('style="', `style="--i:${i++};`)}>` : `<${el} class="${c}" style="--i:${i++}"${rest}>`);
  return g ? `<svg viewBox="0 0 48 48" aria-hidden="true">${g}</svg>` : iconSvg(tool.icon);
}

function renderFlow() {
  document.querySelectorAll("[data-glyph]").forEach(el => {
    const t = TOOLS.find(x => x.id === el.dataset.glyph); if (!t) return;
    el.innerHTML = appGlyph(t); el.style.setProperty("--card", accentOf(t)); el.style.background = accentOf(t);
  });
}
function renderQuick() {
  const row = document.getElementById("quick-grid");
  if (!row) return;
  row.innerHTML = TOOLS.map((tool) => {
    const latest = latestOf(tool);
    return `<a class="app${isUnseen(tool) ? " updated" : ""}" data-tool="${tool.id}" style="--card:${accentOf(tool)}" href="${toolPath(tool, latest)}" target="_blank" rel="noopener" title="Open ${tool.name} ${latest.v}${isUnseen(tool) ? " (updated)" : ""}">
        <span class="app-icon">${appGlyph(tool)}<span class="upd-star" aria-hidden="true">${starSvg}</span></span>
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
  const go = card.querySelector(".tool-open"); if (go) { window.open(go.href, "_blank", "noopener"); const t = TOOLS.find((x) => x.id === card.dataset.tool); if (t) markSeen(t); }
});
/* opening the latest version from any link on the page (Launch, quick launch, the usage list) counts as seen */
function seenFromLink(e) {
  const a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
  const href = a.getAttribute("href") || "";
  for (const t of TOOLS) { const l = latestOf(t); if (l && href.endsWith(toolPath(t, l))) { markSeen(t); break; } }
}
document.addEventListener("click", seenFromLink, true);
document.addEventListener("auxclick", (e) => { if (e.button === 1) seenFromLink(e); }, true);   // middle-click opens a new tab too

/* ---------- phones: these tools are made for a computer ----------
   A slim card at the bottom: send yourself the link (share sheet, or copy). Inside Instagram's (or
   Facebook's, TikTok's) own browser it also says how to open the page in the real browser, where saved
   work stays put. Closing it hides it for 14 days. */
(function phoneHint() {
  const KEY = "lp-phone-hint", inApp = /Instagram|FBAN|FBAV|FB_IAB|TikTok|Line\//i.test(navigator.userAgent || "");
  const small = window.matchMedia && window.matchMedia("(max-width: 820px), (pointer: coarse) and (max-width: 1024px)").matches;
  if (!small) return;
  try { const t = +localStorage.getItem(KEY) || 0; if (Date.now() - t < 14 * 864e5) return; } catch (e) { /* storage blocked: show it */ }
  const url = "https://labpotato.github.io/";
  const el = document.createElement("aside"); el.className = "phone-hint"; el.setAttribute("role", "note");
  el.innerHTML = `<div class="ph-text"><b>Best on a computer.</b> ${inApp ? "You are in Instagram's browser: tap <b>⋯</b> and <b>Open in external browser</b> so your work is kept. " : ""}Send yourself the link for later at the bench.</div>
    <div class="ph-btns"><button type="button" class="ph-send">${navigator.share ? "Send to myself" : "Copy link"}</button><button type="button" class="ph-x" aria-label="Close">✕</button></div>`;
  document.body.append(el); requestAnimationFrame(() => el.classList.add("in"));
  const close = () => { el.classList.remove("in"); setTimeout(() => el.remove(), 300); try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* nothing to remember */ } };
  el.querySelector(".ph-x").addEventListener("click", close);
  el.querySelector(".ph-send").addEventListener("click", async () => {
    if (navigator.share) { try { await navigator.share({ title: "Lab Potato", text: "Free browser tools for the wet lab", url }); close(); } catch (e) { /* cancelled */ } return; }
    try { await navigator.clipboard.writeText(url); toast("Link copied. Paste it into a note or a chat with yourself."); close(); }
    catch (e) { toast(url); }
  });
})();

/* ---------- how to cite: copy buttons ---------- */
document.addEventListener("click", async (e) => {
  const b = e.target.closest && e.target.closest(".cite-btn"); if (!b) return;
  const src = document.getElementById(b.dataset.copy); if (!src) return;
  try { await navigator.clipboard.writeText(src.textContent.trim()); toast(b.dataset.copy === "cite-bib" ? "BibTeX copied." : "Citation copied."); }
  catch (err) { src.hidden = false; toast("Select the text and copy it."); }
});

/* ---------- feedback without a GitHub account ----------
   Paste a form address here (Google Forms, Tally, Microsoft Forms...) and a "Send feedback, no account needed"
   link appears under the support cards. Empty: nothing is shown. */
const FEEDBACK_FORM = "";
(function feedbackForm() {
  const p = document.querySelector(".feedback-general"); if (!p || !FEEDBACK_FORM) return;
  const a = document.createElement("p"); a.className = "feedback-easy reveal in";
  a.innerHTML = `No GitHub account? <a href="${FEEDBACK_FORM}" target="_blank" rel="noopener">Send feedback with a short form</a>. It takes a minute and needs no account.`;
  p.after(a);
})();

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

renderTools();
renderQuick(); renderFlow();
renderFeedback();
renderQuotes();
renderSpecs();
renderSupport();
initReveal();
const heroMascot = initMascot();
initGuide(heroMascot);
initTrustStrip();
initFooterPotato();
initSecretPotato();


/* Colour theme: Auto follows the system; Light or Dark is remembered on this device. */
/* ---------- the top bar: a Tools menu (every tool, newest version, opens in a new tab) ---------- */
(function navTools() {
  const btn = document.getElementById("nav-tools-btn"), menu = document.getElementById("nav-tools-menu");
  if (!btn || !menu) return;
  const draw = () => {
    menu.innerHTML = `<div class="nt-grid">${TOOLS.map((t) => { const l = latestOf(t); return `<a class="nt-item" role="menuitem" data-tool="${t.id}" style="--card:${accentOf(t)}" href="${toolPath(t, l)}" target="_blank" rel="noopener">
        <span class="app-icon nt-ic">${appGlyph(t)}</span><span class="nt-t"><b>${t.name}</b><small>${t.short || t.tagline}</small></span>${isUnseen(t) ? '<i class="nt-new">New</i>' : ""}</a>`; }).join("")}</div>
      <a class="nt-all" href="#tools" role="menuitem">All tools, versions and what's new<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>`;
  };
  const open = (on) => { if (on) draw(); menu.hidden = !on; btn.setAttribute("aria-expanded", String(on)); if (on) menu.querySelector("a")?.focus({ preventScroll: true }); };
  btn.addEventListener("click", () => open(menu.hidden));
  document.addEventListener("click", (e) => { if (!menu.hidden && !e.target.closest(".nav-tools")) open(false); });
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setTimeout(() => open(false), 0); });
  document.addEventListener("keydown", (e) => {
    if (menu.hidden) return;
    if (e.key === "Escape") { open(false); btn.focus(); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { const items = [...menu.querySelectorAll("a")], i = items.indexOf(document.activeElement); e.preventDefault(); items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus(); }
  });
})();

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
  /* one button instead of three: it shows the current choice and moves to the next (system, light, dark) */
  const group = document.querySelector(".theme-switch"); if (!group || !btns.length) return;
  const order = [...btns], cyc = document.createElement("button"); cyc.type = "button"; cyc.className = "theme-cycle";
  const NAMES = { auto: "Theme: match my system", light: "Theme: light", dark: "Theme: dark" };
  const show = () => { const cur = root.dataset.theme || "auto", b = order.find((x) => x.dataset.themeSet === cur) || order[0]; cyc.innerHTML = b.innerHTML; cyc.title = NAMES[cur] + " (click to change)"; cyc.setAttribute("aria-label", cyc.title); };
  cyc.addEventListener("click", () => { const cur = root.dataset.theme || "auto", i = order.findIndex((x) => x.dataset.themeSet === cur); order[(i + 1) % order.length].click(); show(); });
  group.classList.add("collapsed"); group.append(cyc); show();
})();

/* Find a tool: type what you need to do; cards that do not match step aside. Nothing is sent anywhere. */
(function () {
  var box = document.getElementById("tool-find"), grid = document.getElementById("tools-grid"), count = document.getElementById("tool-find-n");
  if (!box || !grid || typeof TOOLS === "undefined") return;
  var WORDS = { "colony-counter": "count colonies cfu plate petri agar transformation efficiency", "gel-labeler": "gel western blot ladder lanes bands agarose sds-page figure",
    "gibson-assembly": "gibson primers cloning pcr assembly overlap plasmid construct", "microscopy-image-labeler": "microscopy microscope images panels scale bar channels figure fluorescence",
    "protein-quant": "protein concentration a280 nanodrop bradford bca standard curve yield", "cryobox-labeler": "freezer box inventory glycerol stock -80 cryovial rack samples",
    "lab-entry": "notebook journal diary planner to-do experiments report", "doc-reader": "pdf paper read annotate highlight comment write cite markdown",
    "sequence-studio": "snapgene genbank fasta plasmid map sequence annotate restriction digest primers dna" };
  var text = {};
  TOOLS.forEach(function (t) { text[t.id] = [t.name, t.tagline, t.short, t.description, (t.features || []).join(" "), WORDS[t.id] || ""].join(" ").toLowerCase(); });
  var none = null;
  function apply() {
    var q = box.value.trim().toLowerCase().split(/\s+/).filter(Boolean), shown = 0, cards = grid.querySelectorAll(".tool-card");
    cards.forEach(function (c) {
      var hay = text[c.getAttribute("data-tool")] || c.textContent.toLowerCase();
      var ok = q.every(function (w) { return hay.indexOf(w) >= 0 || (w.length > 3 && hay.indexOf(w.replace(/(ies|es|s|ing)$/, "")) >= 0); });
      c.hidden = !ok; if (ok) { shown++; c.classList.add("in"); }
    });
    if (count) count.textContent = q.length ? shown + " of " + cards.length : "";
    if (!shown && !none) { none = document.createElement("p"); none.className = "tool-none"; none.innerHTML = 'No tool does that yet. <a href="#feedback">Tell me what is missing</a> and it may become the next one.'; grid.appendChild(none); }
    if (none) none.hidden = shown > 0;
  }
  box.addEventListener("input", apply);
  box.addEventListener("keydown", function (e) { if (e.key === "Escape") { box.value = ""; apply(); } });
  document.querySelectorAll(".tool-find-tips button").forEach(function (b) { b.addEventListener("click", function () { box.value = b.getAttribute("data-q"); apply(); box.focus(); }); });
})();
