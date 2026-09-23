Colony Counter is a single-file, offline browser tool for counting bacterial colonies from a plate photograph and turning the count into CFU/mL. Open the HTML file in a browser — nothing to install, and the image never leaves your machine.

Load a photo (drop it, paste it, or pick a file), then press **Find the dish** and it locates the plate and counts. Loading an image on its own starts nothing. From there you correct anything it got wrong by clicking, and log the plate to a table that works out CFU/mL for you.

What it does:

- **Finds the dish automatically** — one click, no careful dragging round the rim. You can also draw a circle, a box, or a freehand lasso around an irregular area, or count the whole frame.
- **Corrects uneven lighting** before counting, with a morphological top-hat, so a plate lit from one side counts the same as one lit evenly.
- **Works out the colony appearance itself** — pale colonies on dark agar, dark colonies on pale agar, or chromogenic colonies that differ from the agar only in hue.
- **Separates clustered colonies in three passes** — a waist between them where there is one, the arcs their outlines still show when there isn't, and finally the leftover area for a colony buried in the middle of a cluster. Against clusters this takes the count error from 19% to 7% and recall from 72% to 93%, without inventing a single colony on an ordinary plate.
- **Estimates colonies inside solid clumps** that no distance-based method can cut apart, from their area, and flags them separately rather than folding them silently into the total.
- **Rejects plate furniture** — the dish wall, condensation rings, scratches and marker strokes — before it can be counted or mistaken for a clump.
- **Colour-codes what it found** — green for confident, amber for anything worth a second look, vermillion for an estimated clump, black for marks you placed yourself. On deliberately hard test plates the score flagged every object the detector got wrong and nothing on the plates it got right.
- **Boosts low-resolution plates** — below about three pixels of colony radius it resamples onto a finer grid, which took ten touching pairs from 40 of 50 correctly resolved to 50 of 50. It adds no detail the camera did not record.
- **Recounts on its own** whenever anything that changes what's measured changes — brightness, contrast, gamma, local contrast, or the plate area — after you stop dragging. There's also a recount button that's always visible next to the colony count, so it never needs a trip back to the panel.
- **Lets you add or remove with one click** — while placing colonies by hand, clicking an existing mark removes it instead of adding a duplicate on top, so switching tools mid-correction is rarely needed. A dedicated Remove tool is still there for rapid-fire cleanup, and clicking picks the mark under the cursor correctly even when colonies sit close together.
- **Sensitivity is always on the stage and scrollable** — nudge it with the mouse wheel while the pointer is over the slider, without opening a menu, and the count updates a moment after you stop. A one-click **Auto** button next to the image-adjustment controls sets brightness, contrast and gamma from the image itself.
- **Two independent size controls** — one scales the circles drawn on colonies the detector found, the other (on the stage, next to the Add tool) sets the size of the mark your own click leaves.
- **Keeps your manual corrections** when you change a setting and re-count, with undo and redo.
- **A hand-placed mark starts at roughly the size the detector is already finding**, not an arbitrary default, and resets to that whenever a new photo is loaded rather than carrying over a size dialled in for a different plate.
- **Reset to defaults** on the colony-settings menu restores automatic detection — sensitivity, splitting, clustering, any taught examples — in one click, without touching the plate area you already selected or the photo.
- **Teaching can be cleared mid-pick**, wiping the circles drawn so far without leaving picking mode, so a bad set of examples costs one click to redo rather than a full stop-and-restart.
- **Rows can carry a title** — label each plate in the results table (e.g. a sample name or condition), and it carries through to the export.
- **Exports** the table as a tab-separated .txt file — title, row, count, dilution, volume, CFU/mL and the average, paste-ready into Excel as numbers, not as text carrying a unicode "×10ⁿ" — and the marked-up image as a PNG carrying the count, the settings and how many colonies you changed by hand.

Accuracy, on 17 synthetic plates with known colony counts: mean absolute count error **0.59%**, precision **100%**, recall **99.5%**. The harness that measures this ships alongside the tool in `validation/` and reads the detection core out of the published HTML, so you can re-run it yourself. It has **not** yet been benchmarked against a manually counted reference plate — treat an automatic count as a first pass.

Everything runs in the page: no account, no upload, no server, no network request except the one-pixel analytics tag shared by the rest of the site.
