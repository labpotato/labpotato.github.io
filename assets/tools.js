/* ============================================================
   LAB POTATO — TOOL LIST
   This is the ONLY file you edit to add a tool or a new version.
   Full instructions: see HOW-TO-UPDATE.md in the repo root.

   Adding a NEW VERSION -> add one line to that tool's `versions`.
                           The LAST entry in the list is the latest.
                           Give it the release date as date: "YYYY-MM-DD";
                           the homepage shows it next to the version.
   features             -> the bullet list on the tool's card. Keep each
                           line short; four to six lines reads best.
   Adding a NEW TOOL    -> copy a whole { ... } block and edit it.

   Folder / file names are written exactly as they appear on disk.
   Keep them lowercase with hyphens and no spaces — spaces in URLs get
   mangled by chat apps, email clients and some static hosts.
   ============================================================ */

/* ============================================================
   SUPPORT BUTTON  (footer)
   Paste your donation link between the quotes and the button
   appears next to the email address. Leave it empty -> no button.

     Buy Me a Coffee   https://buymeacoffee.com/yourname
     Ko-fi             https://ko-fi.com/yourname
     PayPal            https://paypal.me/yourname

   Setup steps are in HOW-TO-UPDATE.md, section 3.
   ============================================================ */
const SUPPORT_URL = "";
const SUPPORT_LABEL = "Buy me a coffee";


const TOOLS = [
  {
    id: "colony-counter",
    name: "Colony Counter",
    tagline: "Stop squinting at plates",
    description:
      "Drop in a plate photo and it finds the dish, corrects the lighting, separates the touching ones and counts. Correct anything it got wrong by clicking, then export the marked-up image and your CFU/mL. Your eyes deserve better than tally marks on a Post-it.",
    icon: "colony",
    accent: "emerald",
    folder: "tools/colony-counter",
    features: [
      "Finds the dish on its own and evens out uneven lighting",
      "Separates touching colonies, and flags clumps it can only estimate",
      "Click to add or remove any colony it got wrong, with undo",
      "Ignores the dish wall and meniscus with an adjustable edge margin",
      "Exports the marked-up image with your count and CFU/mL"
    ],
    versions: [
      { v: "v1", file: "colony-counter-v1.html" },
      { v: "v2", file: "colony-counter-v2.html", date: "2026-09-23" }
    ]
  },

  {
    id: "gel-labeler",
    name: "Gel Labeler",
    tagline: "Gels that don't embarrass you",
    description:
      "Crop and rotate your gel, set lanes, drop in ladder markers, and export as PNG or a fully editable PowerPoint slide. Then compare band intensity between lanes, ImageJ-style, without opening ImageJ. No more arrows drawn in Word at 1am.",
    icon: "gel",
    accent: "violet",
    folder: "tools/gel-labeler",
    features: [
      "Crop, rotate and flip, then drag to set the lanes",
      "Built-in DNA and protein ladders, placed on your gel automatically",
      "Arrow band legend and lane-name table, both draggable",
      "Snapshot panels for western-blot style figures",
      "Band densitometry: relative and loading-control-normalised intensity, CSV out",
      "Export PNG, JPEG or fully editable PowerPoint"
    ],
    versions: [
      { v: "v1", file: "gel-labeler-v1.html" },
      { v: "v2", file: "gel-labeler-v2.html" },
      { v: "v3", file: "gel-labeler-v3.html" },
      { v: "v4", file: "gel-labeler-v4.html" },
      { v: "v5", file: "gel-labeler-v5.html", date: "2026-09-22" },
      { v: "v6", file: "gel-labeler-v6.html", date: "2026-09-26" }
    ]
  },

  {
    id: "gibson-assembly",
    name: "Gibson Assembly",
    tagline: "Primers that actually anneal",
    description:
      "Paste fragments in assembly order and get Gibson-ready primers with matched Tm and an annotated map. Every stretch of every primer, flap included, is checked against your whole source plasmid, and anything that could bind elsewhere comes with alternatives you can swap in. Can also build primers with no flaps when the template already carries the overlap.",
    icon: "gibson",
    accent: "blue",
    folder: "tools/gibson-assembly",
    features: [
      "Tm first: every primer held near target, never knowingly above the ceiling",
      "Every substring of each primer, flap included, scanned against the whole template",
      "Homology report per primer, with alternative primers you can exchange in one click",
      "Step 3 shows the whole primer table with status marks first, then a detailed card for every primer",
      "Short or no flaps option in Step 3, also when no plasmid is attached (assumed, marked not verified)",
      "Primers with no flaps where the template already carries the overlap, verified to overlap",
      "Move or resize the overlap, or add a unique spacer for non-coding junctions",
      "Current primer highlighted on the alignment and map, the rest shaded"
    ],
    versions: [
      { v: "v1", file: "gibson-assembly-v1.html" },
      { v: "v2", file: "gibson-assembly-v2.html" },
      { v: "v3", file: "gibson-assembly-v3.html" },
      { v: "v4", file: "gibson-assembly-v4.html" },
      { v: "v5", file: "gibson-assembly-v5.html" },
      { v: "v6", file: "gibson-assembly-v6.html" },
      { v: "v7", file: "gibson-assembly-v7.html", date: "2026-09-25" },
      { v: "v8", file: "gibson-assembly-v8.html", date: "2026-09-29" }
    ]
  },

  {
    id: "microscopy-image-labeler",
    name: "Microscopy Image Labeler",
    tagline: "Panels that line up, finally",
    description:
      "Load channel images, drag them into rows, crop them in sync, and add a scale bar measured from the one already in your image. Export to PNG or editable PowerPoint. Reviewer 2 will find something else to complain about.",
    icon: "microscopy",
    accent: "cyan",
    folder: "tools/microscopy-image-labeler",
    features: [
      "Arrange panels in rows and reorder them by dragging",
      "Square crop synced across every image in a row",
      "Scale bar measured from the bar in your image, drawn to true length",
      "Labels, panel letters, row and column titles",
      "Export PNG at 2× or editable PowerPoint"
    ],
    versions: [
      { v: "v1", file: "microscopy-image-labeler-v1.html" },
      { v: "v2", file: "microscopy-image-labeler-v2.html", date: "2026-09-22" },
      { v: "v3", file: "microscopy-image-labeler-v3.html", date: "2026-09-26" }
    ]
  },

  {
    id: "protein-quant",
    name: "Protein Quant",
    tagline: "Numbers in, plot out",
    description:
      "Paste a sequence to get MW and extinction coefficient, then turn A280 or a Bradford/BCA curve into concentration and yield, without opening a spreadsheet and slowly losing your will to live.",
    icon: "protein",
    accent: "amber",
    folder: "tools/protein-quant",
    features: [
      "Paste a sequence to get MW and extinction coefficient",
      "A280 to concentration, with replicates averaged, in any unit",
      "Bradford/BCA standard curve with blank subtraction and linear or quadratic fit",
      "Yield per litre, checked against benchmarks for your expression host",
      "Export to CSV or copy straight into Excel"
    ],
    versions: [
      { v: "v1", file: "protein-quant-v1.html" },
      { v: "v2", file: "protein-quant-v2.html" },
      { v: "v3", file: "protein-quant-v3.html" },
      { v: "v4", file: "protein-quant-v4.html", date: "2026-09-22" },
      { v: "v5", file: "protein-quant-v5.html", date: "2026-09-26" }
    ]
  },

  {
    id: "lab-journal",
    name: "Lab Journal",
    tagline: "Write it down, or it did not happen",
    description:
      "A lab report for the day in a calm notebook layout. Experiments sit side by side and new ones are added to the right. Each starts with its figures, then what it is about, a table of strains, plasmids and constructs, how it was done with steps and sub steps, changes from the normal protocol, results, issue and follow up. Names from the table are suggested as you type.",
    icon: "flask",
    accent: "indigo",
    folder: "tools/lab-journal",
    features: [
      "Figures first, three across; crop only, one caption each",
      "Strains, plasmids and constructs table; names suggested as you type (Tab to accept)",
      "Steps 1., 1.1., 1.1.1. and sub bullets with Tab and Shift+Tab",
      "Protocol changes recorded as before and this time",
      "Your own filler sentences with _ blanks; everything saved offline"
    ],
    versions: [
      { v: "v1", file: "lab-journal-v1.html", date: "2026-09-28" },
      { v: "v2", file: "lab-journal-v2.html", date: "2026-09-28" },
      { v: "v3", file: "lab-journal-v3.html", date: "2026-09-28" },
      { v: "v4", file: "lab-journal-v4.html", date: "2026-09-28" },
      { v: "v5", file: "lab-journal-v5.html", date: "2026-09-28" }
    ]
  },

  {
    id: "lab-entry",
    name: "Lab Entry",
    tagline: "Experiments, to-dos and reports in one notebook",
    description:
      "The full lab notebook: one page per experiment with project and experiment tags, figures you can crop, rotate and adjust, strains and plasmids, steps, results and follow ups. Create tomorrow's entry from today's with the to-dos carried over, and export the report as Word (.docx), PDF, or Markdown with figure images for Notion, Google Docs or Claude.",
    icon: "flask",
    accent: "rose",
    folder: "tools/lab-entry",
    features: [
      "Project and experiment tags; tags suggest the usual to-dos and results",
      "Follow up tomorrow: a linked new entry with tags, strains and plasmids copied and to-dos at the top",
      "Crop, rotate, brightness and contrast for figures; the original is kept",
      "Export to Word .docx, print or PDF, or Markdown with figure images (.zip)",
      "Save to a file and open later; back up fillers, tags and names; works offline"
    ],
    versions: [
      { v: "v1", file: "lab-entry-v1.html", date: "2026-09-30" }
    ]
  }

  /* ---------- TEMPLATE: copy this block for a new tool ----------
  ,{
    id: "my-new-tool",                  // lowercase-with-dashes, must be unique
    name: "My New Tool",                // shown on the card
    tagline: "One short line",          // small coloured text under the title
    description: "What it does, in a sentence or two.",
    features: ["First thing it does", "Second thing"],   // bullets on the card
    icon: "flask",                      // colony | gel | gibson | microscopy |
                                        // protein | flask | dna | chart | calculator
    accent: "rose",                     // emerald | violet | blue | cyan |
                                        // amber | rose | indigo
    folder: "tools/my-new-tool",        // folder path, no spaces please
    versions: [
      { v: "v1", file: "my-new-tool-v1.html", date: "2026-01-31" }   // last one = latest
    ]
  }
  --------------------------------------------------------------- */
];
