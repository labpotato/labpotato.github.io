/* ============================================================
   LAB POTATO — page behaviour
   You shouldn't need to edit this file to add a tool or version.
   Edit assets/tools.js instead.
   ============================================================ */

const REPO = "https://github.com/bdongmin10/bdongmin10.github.io";

// SUPPORT_URL / SUPPORT_LABEL are defined at the top of tools.js

const ACCENTS = {
  emerald: "#0f9d76",
  violet: "#7257e8",
  blue: "#2f6fed",
  cyan: "#0e93a8",
  amber: "#cf8215",
  rose: "#dd4f75",
  indigo: "#5350d4",
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
  const known = ["colony", "gel", "gibson", "microscopy", "protein", "flask", "dna", "chart", "calculator"];
  const key = known.includes(name) ? name : "flask";
  return `<svg viewBox="0 0 24 24" stroke="currentColor"><use href="#icon-${key}"></use></svg>`;
}

const arrowSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>`;

function renderTools() {
  const grid = document.getElementById("tools-grid");
  if (!grid) return;

  grid.innerHTML = TOOLS.map((tool) => {
    const latest = latestOf(tool);
    const older = tool.versions.slice(0, -1).reverse();

    const olderBlock = older.length
      ? `<details class="versions-detail">
           <summary>${older.length} legacy release${older.length > 1 ? "s" : ""}</summary>
           <ul>
             ${older.map((v) => `<li><a href="${toolPath(tool, v)}" target="_blank" rel="noopener">${v.v}</a></li>`).join("")}
           </ul>
         </details>`
      : "";

    return `
      <article class="tool-card reveal" style="--card:${accentOf(tool)}">
        <div class="tool-icon">${iconSvg(tool.icon)}</div>
        <h3>${tool.name}</h3>
        <p class="tool-tagline">${tool.tagline}</p>
        <p class="tool-desc">${tool.description}</p>
        <div class="tool-meta">
          <span class="version-pill">${latest.v} · stable</span>
        </div>
        ${olderBlock}
        <a class="tool-open" href="${toolPath(tool, latest)}" target="_blank" rel="noopener">Launch module ${arrowSvg}</a>
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

function renderSpecs() {
  const table = document.getElementById("spec-table");
  if (!table) return;

  table.innerHTML = SPECS.map(
    ([k, v]) => `<div class="spec-row"><dt>${k}</dt><dd>${v}</dd></div>`
  ).join("");
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

function initMascot() {
  const mascot = document.getElementById("mascot");
  const speech = document.getElementById("speech");
  if (!mascot || !speech) return;

  const lines = [
    // at the movies
    "You're gonna need a bigger centrifuge.",
    "Life, uh, finds a way. Usually in my negative control.",
    "I see dead cells.",
    "One does not simply walk into the −80.",
    "You either die a PhD student, or live long enough to become the PI.",
    "Keep your friends close and your aliquots closer.",
    "Say hello to my little pipette.",
    "First rule of lab meeting: do not talk about your results.",
    "Just keep pipetting. Just keep pipetting.",
    "Houston, we have a contamination.",
    "I'll be back. After this incubation.",
    "Nobody puts the ladder in lane one.",
    "Toto, I don't think we're within error anymore.",
    "My precious. (the last aliquot)",
    "I know kung fu. I do not know the FACS.",

    // at the bench
    "p = 0.051. We're calling it a trend.",
    "The gel looked fine yesterday.",
    "Labsolutely tired.",
    "My PCR has been running since March.",
    "It worked once. That's reproducible enough.",
    "Started at 9am. It's 9pm. I ran one gel.",
    "Yes, I labelled that tube 'tube'.",
    "Someone used my aliquots. I know who.",
    "Ran the stats until they agreed with me.",
    "'Quick experiment,' he said. In April.",
    "This figure took longer than the experiment.",
    "Repeated it. Got the opposite result. Repeating again.",
    "My thesis is failed controls in a nice font.",
    "Technically that's within error.",
    "Cited myself. Twice. In one paragraph.",
    "Dropped the plate. We don't talk about it.",
    "Slides made at 3am, presented at 9am.",
    "Three years in. Still can't pipette 0.5 µL.",
    "The freezer that broke had my only stock.",
  ];

  let index = Math.floor(Math.random() * lines.length);
  let hideTimer;

  // The goggles are worn correctly at all times, except when they aren't.
  const goggles = document.getElementById("goggles");
  let gogglesOn = true;

  const COAST_CLEAR = [
    "Safety officer has left the building.",
    "Inspection over. These are coming off.",
    "She's gone. We're free.",
    "Nobody saw that.",
    "Risk assessment complete. Result: nah.",
    "Audit passed. Goggles now optional.",
  ];
  const INSPECTION = [
    "INSPECTION. ACT NATURAL.",
    "She's coming back — goggles on, goggles on.",
    "I have always been wearing these.",
    "Safety first. Obviously. Always.",
    "Compliance is a lifestyle, not an event.",
  ];

  // Once they're off, they stay off for at least this many jokes before
  // the inspector comes back round.
  const JOKES_BEFORE_INSPECTION = 5;
  let jokesSinceThrow = 0;

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function say(text, ms) {
    speech.textContent = text;
    speech.classList.add("show");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => speech.classList.remove("show"), ms);
  }

  function hop() {
    mascot.classList.remove("hop");
    void mascot.offsetWidth; // restart the animation
    mascot.classList.add("hop");
  }

  mascot.addEventListener("click", () => {
    hop();

    // goggles on -> fling them off, and start counting
    if (goggles && gogglesOn) {
      gogglesOn = false;
      jokesSinceThrow = 0;
      goggles.classList.remove("snap");
      goggles.classList.add("thrown");
      say(pick(COAST_CLEAR), 3600);
      return;
    }

    // enough jokes have gone by — the inspector is back
    if (goggles && !gogglesOn && jokesSinceThrow >= JOKES_BEFORE_INSPECTION) {
      gogglesOn = true;
      goggles.classList.remove("thrown");
      void goggles.getBoundingClientRect(); // restart the animation
      goggles.classList.add("snap");
      say(pick(INSPECTION), 2800);
      return;
    }

    say(lines[index], 3600);
    index = (index + 1) % lines.length;
    jokesSinceThrow++;
  });

  mascot.addEventListener("animationend", (e) => {
    if (e.target === mascot) mascot.classList.remove("hop");
  });
}

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

renderTools();
renderFeedback();
renderQuotes();
renderSpecs();
renderSupport();
initReveal();
initMascot();
