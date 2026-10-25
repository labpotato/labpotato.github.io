# Doc Reader

Read, mark up and edit PDFs, Markdown files, web pages and images, in one offline HTML file.
Nothing leaves the browser: documents autosave in the browser's own storage (IndexedDB), and
you can save a `.lpdoc` project file to keep or move your work.

- `doc-reader-v1.html`: the tool. Open it from the homepage or directly.
- `doc-reader-extension-v1.zip`: the Chrome extension (unzip, then `chrome://extensions` →
  Developer mode → Load unpacked). It opens any page or PDF link in the reader with one click,
  including pages you are signed in to, and pages this site is not allowed to fetch.

Built from `src/` with `node build.mjs` (libraries: pdf.js, pdf-lib, marked, DOMPurify,
Turndown, Readability). The source lives in the Claude session that made it; the built file
is what is published.
