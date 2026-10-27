# Doc Reader

Read, mark up and edit PDFs, Markdown files, web pages and images, in one offline HTML file.
Nothing leaves the browser: documents autosave in the browser's own storage (IndexedDB), and
you can save a `.lpdoc` project file to keep or move your work.

- `doc-reader-v2.html`: the tool (v1 stays as a legacy release). Open it from the homepage or directly.
- `doc-reader-extension-v2.zip`: the Chrome extension (unzip, then `chrome://extensions` →
  Developer mode → Load unpacked). It works on top of any page, like Liner: a small potato opens
  the toolbar; select text to highlight or comment, or edit the page's text. Marks are kept per
  address and come back when the page is opened again. It also opens any page or PDF link in the
  reader with one click, including pages you are signed in to.

Built from `src/` with `node build.mjs` (libraries: pdf.js, pdf-lib, marked, DOMPurify,
Turndown, Readability). The source lives in the Claude session that made it; the built file
is what is published.
