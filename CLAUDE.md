# Lab Potato: notes for Claude

Static site (GitHub Pages, served from `main`). Each tool is a single offline
HTML file per version under `tools/<tool>/<tool>-vN.html`; the homepage cards
are generated from `assets/tools.js` by `assets/app.js`. Full manual:
`HOW-TO-UPDATE.md`.

## Every time the owner hands over a new tool file to put on the homepage

1. **Version number.** Look at what is already published (the folder on `main`
   and the tool's `versions` in `assets/tools.js`). The new file is always the
   next number up; fix the owner's numbering if it would overwrite or skip one.
   If the upload's name clashes with a published file, compare them first: a
   different file with the same number is a new version, never a replacement.
   Update the version label inside the file too (header chip, export tags).
2. **Never overwrite or delete a published version.** Older versions stay as
   legacy releases.
3. **Read the new file** (diff its visible text, controls and functions against
   the previous version) to find what it adds.
4. **Update the card in `assets/tools.js`:**
   - `description`: one short sentence;
   - `features`: the 3 most important things the tool does;
   - new last `versions` entry with `date: "YYYY-MM-DD"` (release day) and
     `new: [...]`: the 1-3 headline additions, shown highlighted as
     "New in vN". Remove `new` from the previous latest entry.
5. Keep every card in this short format, not just the one being updated.
6. Check `node --check assets/tools.js assets/app.js`, render the homepage in
   a headless browser, and confirm every card and launch link works.
7. Commit only the files for this release. Do not commit unrelated leftovers.
