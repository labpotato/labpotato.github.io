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
