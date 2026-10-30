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
    short: "Notebook & day planner",
    name: "Lab Entry",
    tagline: "Write it down, or it did not happen",
    description:
      "A lab notebook that lays out your experiments as tiles on a timeline, linked by their to-dos.",
    icon: "flask",
    accent: "rose",
    folder: "tools/lab-entry",
    features: [
      "Timeline by day, by project or as a dateless flow",
      "Compact tiles: title, figure or table, and your highlights",
      "Autofill of your strains and plasmids everywhere you write"
    ],
    versions: [
      { v: "v2", file: "lab-entry-v2.html", date: "2026-09-30" },
      { v: "v3", file: "lab-entry-v3.html", date: "2026-10-01" },
      { v: "v4", file: "lab-entry-v4.html", date: "2026-10-01" },
      { v: "v5", file: "lab-entry-v5.html", date: "2026-10-14" },
      { v: "v6", file: "lab-entry-v6.html", date: "2026-10-14" },
      { v: "v7", file: "lab-entry-v7.html", date: "2026-10-15" },
      { v: "v8", file: "lab-entry-v8.html", date: "2026-10-15" },
      { v: "v9", file: "lab-entry-v9.html", date: "2026-10-20" },
      { v: "v10", file: "lab-entry-v10.html", date: "2026-10-20" },
      { v: "v11", file: "lab-entry-v11.html", date: "2026-10-21" },
      { v: "v12", file: "lab-entry-v12.html", date: "2026-10-27",
        new: [
          "Shows where your journal is loaded from and when it was last saved to a file; asks to save on close",
          "Reminds you about daily reports you have not exported",
          "Figures fill the panel and export as one picture per panel; long names wrap"
        ] }
    ]
  },

  {
    id: "colony-counter",
    short: "Plate counts & CFU/mL",
    name: "Colony Counter",
    tagline: "Stop squinting at plates",
    description:
      "Drop in a plate photo and get the count and CFU/mL. Your eyes deserve better than tally marks.",
    icon: "colony",
    accent: "emerald",
    folder: "tools/colony-counter",
    features: [
      "Finds the dish and counts, even colonies that touch",
      "Click to fix anything it missed, with undo",
      "Exports to Excel, and the marked-up plate with count and CFU/mL"
    ],
    versions: [
      { v: "v1", file: "colony-counter-v1.html" },
      { v: "v2", file: "colony-counter-v2.html", date: "2026-09-23" },
      { v: "v3", file: "colony-counter-v3.html", date: "2026-10-28",
        new: [
          "Export to Excel (.xlsx), with the same columns as the table",
          "Simpler settings, starting on Crowded plate without splitting; see-through rings with a centre dot",
          "Clear what the counter found and mark by hand, with or without a plate area; Auto enhance for the image"
        ] }
    ]
  },

  {
    id: "gel-labeler",
    short: "Gel & blot figures",
    name: "Gel Labeler",
    tagline: "Gels that don't embarrass you",
    description:
      "Label lanes and ladders, build blot figures and measure bands. No more arrows drawn in Word at 1am.",
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
      { v: "v6", file: "gel-labeler-v6.html", date: "2026-09-26" },
      { v: "v7", file: "gel-labeler-v7.html", date: "2026-10-21",
        new: [
          "GeneRuler 1 kb and one ladder list for every tool, your favourite first",
          "Add the manufacturer’s photo of your ladder",
          "Expected lane: check a digest or PCR against the gel"
        ] }
    ]
  },

  {
    id: "gibson-assembly",
    short: "Gibson primer design",
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
      { v: "v9", file: "gibson-assembly-v9.html", date: "2026-10-01" },
      { v: "v10", file: "gibson-assembly-v10.html", date: "2026-10-21",
        new: [
          "Watch the fragments assemble, then the live map",
          "A virtual gel of your PCRs at the bench step",
          "No-tail primers, and Send to Lab Entry"
        ] }
    ]
  },

  {
    id: "microscopy-image-labeler",
    short: "Microscopy figures",
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
      { v: "v3", file: "microscopy-image-labeler-v3.html", date: "2026-09-26" },
      { v: "v4", file: "microscopy-image-labeler-v4.html", date: "2026-10-21",
        new: [
          "Line profile: draw a line, get the intensity plot",
          "Send the figure to Lab Entry",
          "An example figure to try it on"
        ] }
    ]
  },

  {
    id: "protein-quant",
    short: "A280 & protein yield",
    name: "Protein Quant",
    tagline: "Numbers in, plot out",
    description:
      "Concentration and yield from A280 or a standard curve, without losing your will to live in a spreadsheet.",
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
      { v: "v5", file: "protein-quant-v5.html", date: "2026-09-26" },
      { v: "v6", file: "protein-quant-v6.html", date: "2026-10-21",
        new: [
          "Several proteins at once, in cards or a spreadsheet table",
          "A protein grinder: the amount flies around as particles (try naming one GFP)",
          "µM by default, error bars both ways"
        ] }
    ]
  },

  {
    id: "cryobox-labeler",
    short: "Freezer box inventory",
    name: "Cryobox Labeler",
    tagline: "Find that glycerol stock",
    description:
      "Every tube in a 3D −80 °C or −20 °C freezer, from rack to box to tube, and one search across them all.",
    icon: "cryobox",
    accent: "indigo",
    folder: "tools/cryobox-labeler",
    features: [
      "Freezers sized in cm around real racks, plus −20 °C drawers",
      "Edit a box like an Excel sheet, or switch to a plain 2D plan",
      "Import from and export to Excel"
    ],
    versions: [
      { v: "v1", file: "cryobox-labeler-v1.html", date: "2026-10-08" },
      { v: "v2", file: "cryobox-labeler-v2.html", date: "2026-10-13" },
      { v: "v3", file: "cryobox-labeler-v3.html", date: "2026-10-14" },
      { v: "v4", file: "cryobox-labeler-v4.html", date: "2026-10-20" },
      { v: "v5", file: "cryobox-labeler-v5.html", date: "2026-10-21" },
      { v: "v6", file: "cryobox-labeler-v6.html", date: "2026-10-27",
        new: [
          "Shows where your inventory is loaded from and when it was last saved to a file",
          "Asks before closing if there are changes not saved to a file"
        ] }
    ]
  },

  {
    id: "doc-reader",
    short: "Read & mark up papers",
    name: "Doc Reader",
    tagline: "Papers, reports and web pages, marked up",
    description:
      "Open a PDF, Markdown, HTML, web page or image to mark up and edit, or write a paper with an AI editor.",
    icon: "reader",
    accent: "cyan",
    folder: "tools/doc-reader",
    features: [
      "Highlights, comment bubbles, text boxes, drawings and page edits on PDFs; web pages as they look; a Chrome extension that syncs",
      "Write like in Word: fonts, footnotes, offline spell check, any page width, Word's shortcuts",
      "Ask AI on a selection with your own Claude key and review its changes one by one, as tracked changes"
    ],
    versions: [
      { v: "v1", file: "doc-reader-v1.html", date: "2026-10-25" },
      { v: "v2", file: "doc-reader-v2.html", date: "2026-10-28" },
      { v: "v3", file: "doc-reader-v3.html", date: "2026-10-29" },
      { v: "v4", file: "doc-reader-v4.html", date: "2026-10-29" },
      { v: "v5", file: "doc-reader-v5.html", date: "2026-10-29" },
      { v: "v6", file: "doc-reader-v6.html", date: "2026-10-30" },
      { v: "v7", file: "doc-reader-v7.html", date: "2026-10-30" },
      { v: "v8", file: "doc-reader-v8.html", date: "2026-10-30",
        new: [
          "Revision marks on your text: cross out (Alt+X), cross out for better wording (Alt+W), a note to the AI (Alt+C)",
          "Every AI request opens on the AI stage: your text left, the AI's version right in equal halves, the rest of the document greyed around it, the two scrolling together; Send back replaces the passage once every change is decided, never over your own hand edits",
          "The other panels fold away while a stage is open (⇔ brings them back); ✕ hides the stage and the Stage button in the toolbar brings it back"
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
    icon: "flask",                      // colony | gel | gibson | microscopy | cryobox |
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
