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
      "A research map: each experiment ringed by the papers and notes behind it",
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
      { v: "v12", file: "lab-entry-v12.html", date: "2026-10-27" },
      { v: "v13", file: "lab-entry-v13.html", date: "2026-11-04",
        new: [
          "Research map: every experiment and how they link, with the papers and notes behind them",
          "A Sources library, and arrows that carry the reason for every link",
          "Save file keeps itself in step, and a lighter save"
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
      { v: "v3", file: "colony-counter-v3.html", date: "2026-10-28" },
      { v: "v4", file: "colony-counter-v4.html", date: "2026-11-04",
        new: [
          "A potato-and-petri-dish welcome, clearer buttons, a table that fits",
          "Colonies light up as they are found, the count ticking up"
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
      { v: "v7", file: "gel-labeler-v7.html", date: "2026-10-21" },
      { v: "v8", file: "gel-labeler-v8.html", date: "2026-11-04",
        new: [
          "More label colours, and white by default on a dark-background gel",
          "Five clear steps, a docked ladder whose bands run into place"
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
      "One card per PCR product: both primers, its size and any fix",
      "Every primer held near the target Tm and scanned against its plasmid",
      "Expected gel and a live plasmid map"
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
      { v: "v10", file: "gibson-assembly-v10.html", date: "2026-10-21" },
      { v: "v11", file: "gibson-assembly-v11.html", date: "2026-11-04",
        new: [
          "Step 3 leads with the live map, and the animation lands exactly on it",
          "One card per PCR: primers, product and template size, problems and fixes",
          "Clearer primer alerts on the map, calmer Apple-like spacing"
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
      { v: "v4", file: "microscopy-image-labeler-v4.html", date: "2026-10-21" },
      { v: "v5", file: "microscopy-image-labeler-v5.html", date: "2026-11-04",
        new: [
          "The footer captions no longer collide, panels slide into the grid"
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
      { v: "v6", file: "protein-quant-v6.html", date: "2026-10-21" },
      { v: "v7", file: "protein-quant-v7.html", date: "2026-11-04",
        new: [
          "The standard curve draws itself through your points",
          "A compact intro, one look shared with every tool"
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
      { v: "v6", file: "cryobox-labeler-v6.html", date: "2026-10-27" },
      { v: "v7", file: "cryobox-labeler-v7.html", date: "2026-11-04" },
      { v: "v8", file: "cryobox-labeler-v8.html", date: "2026-11-05",
        new: [
          "A lab cart beside the freezers: a tube rack, a sample box and a flask of broth",
          "Rack and box are real public-domain models from NIH 3D",
          "Freezer names under the freezers no longer overlap"
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
      "Highlights, comment bubbles, text boxes, drawings and page edits on PDFs; a Chrome extension that keeps one set of notes per paper, through library proxies too",
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
      { v: "v8", file: "doc-reader-v8.html", date: "2026-10-30" },
      { v: "v9", file: "doc-reader-v9.html", date: "2026-11-04" },
      { v: "v10", file: "doc-reader-v10.html", date: "2026-11-05",
        new: [
          "Extension v9: a Cite button on the page toolbar saves the paper's citation (RIS, EndNote, BibTeX)",
          "Save citation is in the extension's ⋯ menu too, as well as on right-click"
        ] }
    ]
  },

  {
    id: "sequence-studio",
    short: "Plasmid maps & primers",
    name: "Sequence Studio",
    tagline: "SnapGene, minus the download",
    description:
      "Open your SnapGene, GenBank or FASTA files, see the map, the sequence and the circuit, annotate, cut, design primers, translate and fold, all in one tab.",
    icon: "dna",
    accent: "violet",
    folder: "tools/sequence-studio",
    features: [
      "Reads and writes SnapGene .dna, keeping the original file's data; GenBank, FASTA, EMBL and Xdna too",
      "A circuit view that draws each transcription unit as SBOL symbols and says what it is missing, and predicts ribosome binding strength from the Salis thermodynamic model",
      "Digests with overhangs and a ligation check, primer design, codon optimisation, protein properties, figures for papers, and folding by ESMFold or AlphaFold"
    ],
    versions: [
      { v: "v1", file: "sequence-studio-v1.html", date: "2026-11-04" },
      { v: "v2", file: "sequence-studio-v2.html", date: "2026-11-04" },
      { v: "v3", file: "sequence-studio-v3.html", date: "2026-11-04" },
      { v: "v4", file: "sequence-studio-v4.html", date: "2026-11-04" },
      { v: "v5", file: "sequence-studio-v5.html", date: "2026-11-04" },
      { v: "v6", file: "sequence-studio-v6.html", date: "2026-11-04" },
      { v: "v7", file: "sequence-studio-v7.html", date: "2026-11-04" },
      { v: "v8", file: "sequence-studio-v8.html", date: "2026-11-04",
        new: [
          "Translated open reading frames: every start codon in a stretch plotted by predicted rate, with the strongest traced to its terminator",
          "A strength chart to pick parts from, with constitutive, inducible and phage promoters divided",
          "Readable rows again: no grey stripes, heavy dividers, and both strands in the same ink"
        ] },
      { v: "v7x", file: "sequence-studio-v7.html", date: "2026-11-04",
        new: [
          "SEVA modules: find the swappable marker, origin and cargo spans by their flanking sites and exchange one",
          "Autosearch: translate every reading frame, match it locally, and send the rest to BLASTp one at a time",
          "Readable rows, stronger text, the rail at the top and the action bar off the bases",
          "Circuit drawn to the SBOL symbol table, and any part changed by clicking it in the diagram"
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
