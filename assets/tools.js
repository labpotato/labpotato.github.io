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
      "Paste fragments in assembly order and get Gibson-ready primers with Tm calculations, off-target homology screening, and an annotated map. Also logs what worked, so future-you stops repeating past-you's mistakes.",
    icon: "gibson",
    accent: "blue",
    folder: "tools/gibson-assembly",
    features: [
      "Build a construct part by part, or paste the finished plasmid",
      "Primers with NEB-style Tm and overlap checks",
      "Screens every primer against the whole source plasmid for off-target binding",
      "Live plasmid map that updates as you add fragments",
      "Primer table you can edit here or in Excel",
      "Keeps a bench log of what actually worked"
    ],
    versions: [
      { v: "v1", file: "gibson-assembly-v1.html" },
      { v: "v2", file: "gibson-assembly-v2.html" },
      { v: "v3", file: "gibson-assembly-v3.html" },
      { v: "v4", file: "gibson-assembly-v4.html" },
      { v: "v5", file: "gibson-assembly-v5.html" },
      { v: "v6", file: "gibson-assembly-v6.html" },
      { v: "v7", file: "gibson-assembly-v7.html", date: "2026-09-25" }
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
