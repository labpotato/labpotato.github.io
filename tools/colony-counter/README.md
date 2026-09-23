Colony Counter is a single-file, offline browser tool for counting bacterial colonies from a plate photograph and turning the count into CFU/mL. Open the HTML file in a browser — nothing to install, and the image never leaves your machine.

Load a photo (drop it, paste it, or pick a file) and the tool finds the dish by itself and counts. From there you correct anything it got wrong by clicking, and log the plate to a table that works out CFU/mL for you.

What it does:

- **Finds the dish automatically** — one click, no careful dragging round the rim. You can also draw a circle or a box, or count the whole frame.
- **Corrects uneven lighting** before counting, with a morphological top-hat, so a plate lit from one side counts the same as one lit evenly.
- **Works out the colony appearance itself** — pale colonies on dark agar, dark colonies on pale agar, or chromogenic colonies that differ from the agar only in hue.
- **Separates touching colonies** by marker-controlled watershed, with the markers chosen by topological persistence so a single round colony is never split in half.
- **Estimates colonies inside solid clumps** that no distance-based method can cut apart, from their area, and flags them separately rather than folding them silently into the total.
- **Rejects plate furniture** — the dish wall, condensation rings, scratches and marker strokes — before it can be counted or mistaken for a clump.
- **Keeps your manual corrections** when you change a setting and re-count, with undo and redo.
- **Exports** the table as CSV and the marked-up image as a PNG carrying the count, the settings and how many colonies you changed by hand.

Accuracy, on 17 synthetic plates with known colony counts: mean absolute count error **0.59%**, precision **100%**, recall **99.5%**. The harness that measures this ships alongside the tool in `validation/` and reads the detection core out of the published HTML, so you can re-run it yourself. It has **not** yet been benchmarked against a manually counted reference plate — treat an automatic count as a first pass.

Everything runs in the page: no account, no upload, no server, no network request except the one-pixel analytics tag shared by the rest of the site.
