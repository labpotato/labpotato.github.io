/* ============================================================
   LAB POTATO — TOOL LIST
   This is the ONLY file you edit to add a tool or a new version.
   Full instructions: see HOW-TO-UPDATE.md in the repo root.

   Adding a NEW VERSION -> add one line to that tool's `versions`.
                           The LAST entry in the list is the latest.
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
    versions: [
      { v: "v1", file: "colony-counter-v1.html" },
      { v: "v2", file: "colony-counter-v2.html" }
    ]
  },

  {
    id: "gel-labeler",
    name: "Gel Labeler",
    tagline: "Gels that don't embarrass you",
    description:
      "Crop and rotate your gel, set lanes, drop in ladder markers, and export as PNG or a fully editable PowerPoint slide. No more arrows drawn in Word at 1am.",
    icon: "gel",
    accent: "violet",
    folder: "tools/gel-labeler",
    versions: [
      { v: "v1", file: "gel-labeler-v1.html" },
      { v: "v2", file: "gel-labeler-v2.html" },
      { v: "v3", file: "gel-labeler-v3.html" },
      { v: "v4", file: "gel-labeler-v4.html" },
      { v: "v5", file: "gel-labeler-v5.html" }
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
    versions: [
      { v: "v1", file: "gibson-assembly-v1.html" },
      { v: "v2", file: "gibson-assembly-v2.html" },
      { v: "v3", file: "gibson-assembly-v3.html" },
      { v: "v4", file: "gibson-assembly-v4.html" },
      { v: "v5", file: "gibson-assembly-v5.html" },
      { v: "v6", file: "gibson-assembly-v6.html" },
      { v: "v7", file: "gibson-assembly-v7.html" }
    ]
  },

  {
    id: "microscopy-image-labeler",
    name: "Microscopy Image Labeler",
    tagline: "Panels that line up, finally",
    description:
      "Load channel images, crop them in sync across each row, add scale bars and labels, then export to PNG or editable PowerPoint. Reviewer 2 will find something else to complain about.",
    icon: "microscopy",
    accent: "cyan",
    folder: "tools/microscopy-image-labeler",
    versions: [
      { v: "v1", file: "microscopy-image-labeler-v1.html" },
      { v: "v2", file: "microscopy-image-labeler-v2.html" }
    ]
  },

  {
    id: "protein-quant",
    name: "Protein Quant",
    tagline: "Numbers in, plot out",
    description:
      "Organize protein quantification data and generate plots and summaries without opening a spreadsheet and slowly losing your will to live.",
    icon: "protein",
    accent: "amber",
    folder: "tools/protein-quant",
    versions: [
      { v: "v1", file: "protein-quant-v1.html" },
      { v: "v2", file: "protein-quant-v2.html" },
      { v: "v3", file: "protein-quant-v3.html" },
      { v: "v4", file: "protein-quant-v4.html" }
    ]
  }

  /* ---------- TEMPLATE: copy this block for a new tool ----------
  ,{
    id: "my-new-tool",                  // lowercase-with-dashes, must be unique
    name: "My New Tool",                // shown on the card
    tagline: "One short line",          // small coloured text under the title
    description: "What it does, in a sentence or two.",
    icon: "flask",                      // colony | gel | gibson | microscopy |
                                        // protein | flask | dna | chart | calculator
    accent: "rose",                     // emerald | violet | blue | cyan |
                                        // amber | rose | indigo
    folder: "tools/my-new-tool",        // folder path, no spaces please
    versions: [
      { v: "v1", file: "my-new-tool-v1.html" }   // last one = latest
    ]
  }
  --------------------------------------------------------------- */
];
