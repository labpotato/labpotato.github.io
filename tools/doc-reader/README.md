# Doc Reader

Read, mark up and edit PDFs, Markdown files, web pages and images, in one offline HTML file.
Nothing leaves the browser: documents autosave in the browser's own storage (IndexedDB), and
you can save a `.lpdoc` project file to keep or move your work.

- `doc-reader-v3.html`: the tool (v1 and v2 stay as legacy releases). Open it from the homepage or directly.
  v3 takes in Paper Writer: the AI editor and Word-style editing below.
- `doc-reader-extension-v2.zip`: the Chrome extension (unzip, then `chrome://extensions` →
  Developer mode → Load unpacked). It works on top of any page, like Liner: a small potato opens
  the toolbar; select text to highlight or comment, or edit the page's text. Marks are kept per
  address and come back when the page is opened again. It also opens any page or PDF link in the
  reader with one click, including pages you are signed in to.

v1 and v2 were built with `node build.mjs` (libraries: pdf.js, pdf-lib, marked, DOMPurify,
Turndown, Readability) from a source that lives in the Claude session that made them. v3 and later are
`doc-reader-v2.html` plus the layers in `src/` (AI editor, Word-style editing, spell checker, the
Paper Writer import):

```
python3 tools/doc-reader/src/build.py v4
```

Never rebuild over a published version: pass the next number.

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

## Google Drive sync (extension 2.4)

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
4. Copy the client ID. In the extension's library page (right-click the toolbar icon →
   Options) open **Setup**, paste it, Save, then **Sign in with Google**.
   (Or send it to be built in as the default, so nobody has to paste it.)

If the extension is later published on the Chrome Web Store, the Store assigns its own ID: put the
Store's public key in `manifest.json` as `key` and add the new `https://<id>.chromiumapp.org/`
redirect URI to the same OAuth client.
