# Doc Reader

Read, mark up and edit PDFs, Markdown files, web pages and images, in one offline HTML file.
Nothing leaves the browser: documents autosave in the browser's own storage (IndexedDB), and
you can save a `.lpdoc` project file to keep or move your work.

- `doc-reader-v8.html`: the tool (v1 to v7 stay as legacy releases). Open it from the homepage or directly.
  v3 took in Paper Writer (the AI editor and Word-style editing below); v4 keeps web pages from
  breaking Doc Reader (below); v5 links extension v4, shows AI edits in red and green with a slim
  accept/reject strip beside the page, and can save each written document as a Google Doc; v6 adds
  the safety nets below (Recently removed, Earlier versions) and links extension v5.
- `doc-reader-extension-v6.zip`: the Chrome extension (unzip, then `chrome://extensions` →
  Developer mode → Load unpacked; v1 to v5 stay as legacy zips; v6 is v5 repackaged). v4 has Lab Potato's Google
  OAuth client built in, so Sign in with Google needs no setup. v5 stays off on writing and
  chat sites by default (claude.ai, chatgpt.com, docs.google.com, notion.so, overleaf.com and
  the like; the list is in `content.js` as `OFF_DEFAULT`); the extension icon turns it on for a
  site, ⋯ → "Turn off on this site" turns it off, and the library lists both. The highlight
  bubble has ✕; look (light, dark, follow the system) and accent colour are under ⋯ and in the
  library. Removing a highlight offers Undo; "Remove everything" and the library's Remove keep
  the page under Recently removed for 30 days; the daily backup also writes one copy per weekday. It stays off Doc Reader's own pages
  (they carry `<meta name="lab-potato-app" content="doc-reader">`). Update by unzipping over the old
  folder and pressing reload on `chrome://extensions`: pressing Remove deletes the highlights kept on
  that computer (Google sign-in or the backup file brings them back). It works on top of any page, like
  Liner: a small potato opens the toolbar; select text to highlight or comment. Marks are kept per
  address and come back when the page is opened again. It also opens any page or PDF link in the
  reader with one click, including pages you are signed in to. Its reader is Doc Reader v4.
  From v3 it no longer edits the text of live pages (edit a copy in the reader instead); paragraphs
  edited with v2 still show, and **Revert edits** (toolbar, ⋯ menu or Notes panel) puts the page's
  own words back.

v1 and v2 were built with `node build.mjs` (libraries: pdf.js, pdf-lib, marked, DOMPurify,
Turndown, Readability) from a source that lives in the Claude session that made them. v3 and later are
`doc-reader-v2.html` plus the layers in `src/` (AI editor, Word-style editing, spell checker, the
Paper Writer import, and from v4 page isolation and document sync). The extension is the built page
split into files (extension pages may not run inline scripts) plus `src/extension/` (manifest,
background worker, on-page tools, library):

```
python3 tools/doc-reader/src/build.py v5
python3 tools/doc-reader/src/build-ext.py v5 v4
```

Never rebuild over a published version: pass the next numbers.

## Web pages in the editor (v4)

A web page's body is shown inside Doc Reader's own document, so before v4 its ids and classes met
Doc Reader's: a page with `<ul id="menu" class="menu">`, `<aside id="right">` or a cookie `#toast`
got Doc Reader's menu, notes-panel or toast styling, Doc Reader drew its menus into the page, and the
page's linked stylesheets were missing in the editor. `src/isolate.js` fixes this:

- Doc Reader's own style rules skip everything inside `#flow` (each gets `:where(:not(#flow *))`, which
  adds no specificity); only rules written for documents (they name `.flow`) reach the page.
- Lookups by id (`$("#menu")`) skip the page's elements of the same name.
- The page's linked stylesheets are fetched (with their `@import`s) and limited to the document, as
  its inline styles were; rules for `html.x` / `body.y` apply only when the page's own `<html>` /
  `<body>` match. `<style>` blocks in the page's body move to its head.
- Fixed banners and z-indexes stay inside the page (`contain: layout`).

The extension's capture also writes out shadow-DOM content (web components) in place, with the
component's styles limited to it, and uses the picture each lazy image actually loaded.

## Documents on every computer (extension v3)

With Google sign-in on (see below), each Doc Reader document in the extension is kept as one file,
`lpdoc-<id>.json`, in the same hidden app folder of the user's Google Drive, next to the highlights
file. A sync runs on start, a few seconds after each save, when the tab comes back into view, every
5 minutes, and from **Sync now** on the start page. The newer copy of each document wins; one removed on
one computer is removed on the others. The web page version has no Google sign-in; its documents stay
in that browser (move them with a `.lpdoc` project file).

## AI editor and Word-style editing (v3)

Formerly the separate Paper Writer tool. In a document (Markdown, a blank document, a web page in the
editor, or a PDF turned into a document with **Edit as document**):

- **Ask AI** (Alt+A) on a selection: quick requests or your own instruction. The answer replaces only the
  selection and shows as tracked changes in one colour; **Tab** accepts a change, **Esc** rejects it,
  **Revise…** sends just that part back. **Show changes** (eye button) off reads the text as changed.
- One AI chat per document, kept with it in this browser (not on claude.ai; **Where is this chat?**
  explains, **Continue on claude.ai** copies it there). Claude with your own key (any model), OpenAI,
  Gemini, any OpenAI-compatible server, or a demo mode with no key.
- Word-style editing: menu bar, fonts and sizes, footnotes, table of contents, symbols, page breaks,
  change case, spacing, format painter, word count, Word's shortcuts (Ctrl+/), paste that keeps the
  source formatting, page width A4 / Letter / wide / any / the whole window.
- Offline spell check (nspell with Hunspell en-GB and en-US, plus lab and medical terms; see
  `src/vendor/` for the licences), F7 to step through.
- Zoom resizes the text rather than magnifying it, so Grammarly and similar extensions stay aligned.
- The first start copies Paper Writer's documents, chats and settings (browser database
  `lp-paperwriter`) into Doc Reader's, once.

## Google Drive sync (extension 2.4 and later)

Highlights, comments, edits and page notes sync through one file,
`lab-potato-highlights.json`, in the hidden app folder of each user's own Google Drive
(scope `drive.appdata`, which Google lists as non-sensitive: the extension can see only that file).
For each page the newer copy wins, and a removed page stays removed for 90 days.
It syncs 15 s after a change, every 5 minutes, and on Chrome start.

The extension ID is fixed by the `key` in `manifest.json`: **`bpinomgodaijcohkedcjaddcokkpagen`**.
Sign-in needs one Google Cloud OAuth client, set up once:

1. [Google Cloud Console](https://console.cloud.google.com/): create a project (e.g. "Lab Potato"),
   then APIs & Services → Library → enable **Google Drive API**.
2. OAuth consent screen: User type **External**; app name, support email; add the scope
   `https://www.googleapis.com/auth/drive.appdata`; under Test users add every Google
   account that will sign in (while the app is in Testing). Publish the app later to let anyone sign in.
3. Credentials → Create credentials → OAuth client ID → Application type **Web application**;
   Authorized redirect URI: `https://bpinomgodaijcohkedcjaddcokkpagen.chromiumapp.org/`
4. Copy the client ID. Lab Potato's is built in as `DEFAULT_CLIENT_ID` in
   `src/extension/background.js` (extension v4 and later). To use a different project instead, open
   the extension's library page (right-click the toolbar icon → Options) → **Use your own Google
   Cloud project instead**, paste it, Save, then **Sign in with Google**.

While the consent screen is in **Testing**, only the Google accounts listed under Test users can sign in.

If the extension is later published on the Chrome Web Store, the Store assigns its own ID: put the
Store's public key in `manifest.json` as `key` and add the new `https://<id>.chromiumapp.org/`
redirect URI to the same OAuth client.

### Google Docs (extension v4, Doc Reader v5)

With Google sign-in on, Export → **Save as a Google Doc as I write** (or the switch on the start page)
keeps each written document as one Google Doc in a "Lab Potato Doc Reader" folder of My Drive,
updated about 15 s after typing stops. Turning it on asks Google once more for the
`https://www.googleapis.com/auth/drive.file` scope (only files the extension creates); add that
scope under Google Auth Platform → Data access. AI suggestions not yet accepted are left out of the
Google Doc.

### Safety nets (Doc Reader v6)

- **Recently removed:** a document removed from the list (here or on another computer through
  sync) is kept for 30 days (IndexedDB `kv` key `trash:<id>`) and can be restored from the
  start page. The extension keeps removed pages the same way (`lp:trash:<url>`).
- **Earlier versions:** while you write, a copy of the text is kept every 10 minutes (the last
  40, `kv` key `snap:<id>`), and always before accepting or rejecting every AI change.
  File menu → Earlier versions… previews and restores; restoring keeps the current text too.
  Unreviewed AI suggestions are stored as their original words, as exports are.

### Revision marks and the AI stage (Doc Reader v8, `src/stage.js`)

Mark the text in place, then send a passage to a second pane where the AI's version shows as tracked
changes while the original stays untouched:

| Key | Mark | Sent to the AI as |
|---|---|---|
| Alt+X | cross out (red) | `Remove: «…»` |
| Alt+W | cross out for better wording (amber) | `Replace «…» with better wording` |
| Alt+C | note to the AI (yellow) | `About «…»: <note>` |
| Alt+S | send the selection (one paragraph) to the stage | the marks above, plus anything typed in the Ask box |
| Alt+Enter | Send back | |

On the stage the usual review strip applies (Tab accepts, Esc rejects, ✎ asks for more, Alt+M shows
the changed version only). **Send back** is enabled once every change is decided and puts the result
where the passage was. The passage on the left is outlined while it is on the stage and stays editable;
if its text differs from what was sent, Send back shows both versions and the author chooses (Keep mine,
Keep both, Use the AI's): the AI's version never overwrites hand edits by itself. Discard closes the
stage and leaves the original. While a stage is open the Pages, Notes and chat panels fold away; ⇔ in
the stage's header brings them back. A `.rv-src` outline left in a saved document is removed on open;
the marks (`.rv`) stay until removed (click a mark). Demo mode honours the marks, so the stage can be
tried without a key.

