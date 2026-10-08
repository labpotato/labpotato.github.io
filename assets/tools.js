/* ============================================================
   LAB POTATO — TOOL LIST
   This is the ONLY file you edit to add a tool or a new version.
   Full instructions: see HOW-TO-UPDATE.md in the repo root.

   Adding a NEW VERSION -> add one line to that tool's `versions`.
                           The LAST entry in the list is the latest.
                           Give it the release date as date: "YYYY-MM-DD"
                           and `new: [...]`, the 1-3 things this release
                           adds. They show in a highlighted "New in vX"
                           box; move older `new` items off the old line.
   description          -> ONE short sentence.
   features             -> the 3 most important things the tool does.
                           Short lines; keep it to three.
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
    id: "lab-entry",
    name: "Lab Entry",
    tagline: "Write it down, or it did not happen",
    description:
      "A lab notebook with one page per experiment, exported to Word, PDF or Markdown.",
    icon: "flask",
    accent: "rose",
    folder: "tools/lab-entry",
    features: [
      "Tag each entry by project and experiment",
      "To-dos that carry over to tomorrow's entry",
      "Figures you can crop and adjust; the original is kept"
    ],
    versions: [
      { v: "v2", file: "lab-entry-v2.html", date: "2026-09-30" },
      { v: "v3", file: "lab-entry-v3.html", date: "2026-10-01" },
      { v: "v4", file: "lab-entry-v4.html", date: "2026-10-01",
        new: [
          "General to-dos, not tied to an experiment",
          "Table editor: add rows and columns, paste from Excel",
          "Yesterday's plan shown in Results: tick it and write the result"
        ] }
    ]
  },

  {
    id: "colony-counter",
    name: "Colony Counter",
    tagline: "Stop squinting at plates",
    description:
      "Drop in a plate photo and get your count and CFU/mL. Your eyes deserve better than tally marks on a Post-it.",
    icon: "colony",
    accent: "emerald",
    folder: "tools/colony-counter",
    features: [
      "Finds the dish and counts, even colonies that touch",
      "Click to fix anything it missed, with undo",
      "Exports the marked-up plate with count and CFU/mL"
    ],
    versions: [
      { v: "v1", file: "colony-counter-v1.html" },
      { v: "v2", file: "colony-counter-v2.html", date: "2026-09-23",
        new: [
          "Rebuilt detection: under 1% count error on test plates (was 48%)",
          "Spot plates, manual count entry and replicate stats"
        ] }
    ]
  },

  {
    id: "gel-labeler",
    name: "Gel Labeler",
    tagline: "Gels that don't embarrass you",
    description:
      "Label lanes and ladders, build blot figures and measure band intensity. No more arrows drawn in Word at 1am.",
    icon: "gel",
    accent: "violet",
    folder: "tools/gel-labeler",
    features: [
      "Lanes, ladders and band arrows placed on your gel",
      "Snapshot panels for western-blot style figures",
      "Export PNG or fully editable PowerPoint"
    ],
    versions: [
      { v: "v1", file: "gel-labeler-v1.html" },
      { v: "v2", file: "gel-labeler-v2.html" },
      { v: "v3", file: "gel-labeler-v3.html" },
      { v: "v4", file: "gel-labeler-v4.html" },
      { v: "v5", file: "gel-labeler-v5.html", date: "2026-09-22" },
      { v: "v6", file: "gel-labeler-v6.html", date: "2026-09-26",
        new: [
          "Band quantification, ImageJ-style, with normalised intensity",
          "Band panels: blot strip plus bar chart for the figure"
        ] }
    ]
  },

  {
    id: "gibson-assembly",
    name: "Gibson Assembly",
    tagline: "Primers that actually anneal",
    description:
      "Paste fragments in order and get Gibson primers with matched Tm and an annotated map.",
    icon: "gibson",
    accent: "blue",
    folder: "tools/gibson-assembly",
    features: [
      "Every primer held near the target Tm",
      "Whole primer scanned against your source plasmid",
      "Editable primer table, with alternatives when one fails"
    ],
    versions: [
      { v: "v1", file: "gibson-assembly-v1.html" },
      { v: "v2", file: "gibson-assembly-v2.html" },
      { v: "v3", file: "gibson-assembly-v3.html" },
      { v: "v4", file: "gibson-assembly-v4.html" },
      { v: "v5", file: "gibson-assembly-v5.html" },
      { v: "v6", file: "gibson-assembly-v6.html" },
      { v: "v7", file: "gibson-assembly-v7.html", date: "2026-09-25" },
      { v: "v8", file: "gibson-assembly-v8.html", date: "2026-09-29" },
      { v: "v9", file: "gibson-assembly-v9.html", date: "2026-10-01",
        new: [
          "Click a junction on the map to move its overlap or add a spacer",
          "Shorten a primer's overhang and have it re-checked",
          "True Tm when the overhang also binds the template"
        ] }
    ]
  },

  {
    id: "microscopy-image-labeler",
    name: "Microscopy Image Labeler",
    tagline: "Panels that line up, finally",
    description:
      "Arrange channel images into a labelled figure. Reviewer 2 will find something else to complain about.",
    icon: "microscopy",
    accent: "cyan",
    folder: "tools/microscopy-image-labeler",
    features: [
      "Square crop synced across every image in a row",
      "Labels, panel letters, row and column titles",
      "Export PNG at 2\u00d7 or editable PowerPoint"
    ],
    versions: [
      { v: "v1", file: "microscopy-image-labeler-v1.html" },
      { v: "v2", file: "microscopy-image-labeler-v2.html", date: "2026-09-22" },
      { v: "v3", file: "microscopy-image-labeler-v3.html", date: "2026-09-26",
        new: [
          "Scale bar measured from the bar printed in your image",
          "Drag panels to reorder them"
        ] }
    ]
  },

  {
    id: "protein-quant",
    name: "Protein Quant",
    tagline: "Numbers in, plot out",
    description:
      "Concentration and yield from A280 or a standard curve, without slowly losing your will to live in a spreadsheet.",
    icon: "protein",
    accent: "amber",
    folder: "tools/protein-quant",
    features: [
      "A280 to concentration in any unit",
      "Yield per litre, checked against your expression host",
      "Export to CSV or straight into Excel"
    ],
    versions: [
      { v: "v1", file: "protein-quant-v1.html" },
      { v: "v2", file: "protein-quant-v2.html" },
      { v: "v3", file: "protein-quant-v3.html" },
      { v: "v4", file: "protein-quant-v4.html", date: "2026-09-22" },
      { v: "v5", file: "protein-quant-v5.html", date: "2026-09-26",
        new: [
          "Paste a sequence to get MW and extinction coefficient",
          "Bradford/BCA curves with blank subtraction and quadratic fit"
        ] }
    ]
  },

  {
    id: "cryobox-labeler",
    name: "Cryobox Labeler",
    tagline: "Find that glycerol stock",
    description:
      "Record glycerol stocks in a 3D freezer, from rack to box to vial, and search the lot.",
    icon: "flask",
    accent: "indigo",
    folder: "tools/cryobox-labeler",
    features: [
      "3D freezer, racks and cryoboxes with A1\u2013I9 positions",
      "Autofill, search by strain or plasmid, and a suggested place",
      "Excel export, save and share, and a trash for removed stock"
    ],
    versions: [
      { v: "v1", file: "cryobox-labeler-v1.html", date: "2026-10-08",
        new: [
          "First release: freezer, rack and box views with vial tracking",
          "Move boxes and vials, hold them while you rearrange, and bin the rest"
        ] }
    ]
  }

  /* ---------- TEMPLATE: copy this block for a new tool ----------
  ,{
    id: "my-new-tool",                  // lowercase-with-dashes, must be unique
    name: "My New Tool",                // shown on the card
    tagline: "One short line",          // small coloured text under the title
    description: "What it does, in a sentence or two.",
    features: ["Most important thing", "Second", "Third"],   // 3 key bullets
    icon: "flask",                      // colony | gel | gibson | microscopy |
                                        // protein | flask | dna | chart | calculator
    accent: "rose",                     // emerald | violet | blue | cyan |
                                        // amber | rose | indigo
    folder: "tools/my-new-tool",        // folder path, no spaces please
    versions: [
      { v: "v1", file: "my-new-tool-v1.html", date: "2026-01-31",
        new: ["What this release adds"] }   // last one = latest
    ]
  }
  --------------------------------------------------------------- */
];
