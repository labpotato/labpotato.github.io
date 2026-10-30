#!/usr/bin/env python3
"""Build Doc Reader v3 and later: Doc Reader v2 plus the AI editor (ai.css, ai.js), Word-style editing
(word.css, word.js, the nspell spell checker and its en-GB / en-US dictionaries in vendor/) and the
one-time import of Paper Writer's documents (merge.js); from v4 also isolate.js (a web page shown in the
editor can't take over Doc Reader's menus, panels and styles) and sync.js (the extension's Google Drive
sync of documents). Paper Writer v1-v5 were built from these files. The Chrome extension is made from
the built page by build-ext.py.

    python3 tools/doc-reader/src/build.py v5
    python3 tools/doc-reader/src/build-ext.py v5 v4

Reads tools/doc-reader/doc-reader-v2.html (never changes it) and writes
tools/doc-reader/doc-reader-vN.html. Each edit must match exactly once, so a
newer Doc Reader that moved things fails loudly instead of building a broken file.
Never rebuild over a published version: pass the next number.
"""
import pathlib, re, sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
VER = sys.argv[1] if len(sys.argv) > 1 else sys.exit("build.py: give the version to write, e.g. v3")
SRC = ROOT / "tools/doc-reader/doc-reader-v2.html"
OUT = HERE.parent / f"doc-reader-{VER}.html"
V = HERE / "vendor"

s = SRC.read_text(encoding="utf-8")
read = lambda p: (HERE / p).read_text(encoding="utf-8")
css = read("ai.css") + "\n" + read("word.css")


def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        sys.exit(f"build.py: expected {count} match(es), found {n}: {old[:80]!r}")
    s = s.replace(old, new)


# head
rep('<meta name="description" content="Read, highlight, comment on and edit PDFs, Markdown, web pages and images. Works offline; everything stays on your computer.">',
    '<meta name="description" content="Read, highlight, comment on and edit PDFs, Markdown, web pages and images, or write a paper with an AI editor and Word-style tools. Works offline; documents stay on your computer.">')
i = s.index("</style>\n</head>")
s = s[:i] + "\n" + css + s[i:]

# icons, header
rep("  </defs>\n</svg>", '''    <symbol id="i-ai" viewBox="0 0 24 24"><path d="M11 3.5l1.9 5.1 5.1 1.9-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9z"/><path d="M18.5 15l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/></symbol>
    <symbol id="i-spacing" viewBox="0 0 24 24"><path d="M10 6h10M10 12h10M10 18h10"/><path d="M5 4v16M3 6.5 5 4l2 2.5M3 17.5 5 20l2-2.5"/></symbol>
    <symbol id="i-eye" viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></symbol>
    <symbol id="i-brush" viewBox="0 0 24 24"><rect x="4" y="3" width="13" height="6" rx="1.5"/><path d="M17 6h3v5h-8v3"/><rect x="10.5" y="14" width="3" height="7" rx="1"/></symbol>
  </defs>
</svg>''')
rep('<h1 class="brand-tool">Doc Reader</h1>\n  <span class="ver-chip">v2</span>', f'<h1 class="brand-tool">Doc Reader</h1>\n  <span class="ver-chip">{VER}</span>')

# start page
rep("<h2>Open a paper, report or web page</h2>", "<h2>Open a paper, report or web page, or write one</h2>")
rep('<button class="btn big" data-act="newBlank"><svg><use href="#i-new"/></svg>Blank document</button>',
    '<button class="btn big" data-act="newBlank"><svg><use href="#i-new"/></svg>Blank document</button>\n        <button class="btn big" data-act="aiSample"><svg><use href="#i-ai"/></svg>AI editor sample</button>')
s, n = re.subn(r'(<div class="home-card" id="extCard">.*?</details>\s*</div>)',
               '''\\1
      <div class="home-card ai-card" id="aiCard">
        <h3><svg><use href="#i-ai"/></svg>AI editor</h3>
        <p>Select some text and press <b>Ask AI</b> (Alt+A). Pick a request such as <i>Better logical flow</i>, or type your own. The AI's edit appears right in your text: deleted words in red, new words in green, and a big change is labelled <b>Rewrite</b>. Press <b>Tab</b> to accept or <b>Esc</b> to reject; the small buttons beside the page do the same.</p>
        <p>Each document has its own chat, so the AI always knows the whole paper. Use your own Claude (Anthropic) key or another AI. Demo mode works without a key.</p>
        <button class="btn small" data-act="aiSettings">AI settings…</button> <span class="muted" style="font-size:12px">Now: <span id="aiHomeWho">Demo mode (no AI)</span></span>
      </div>''', s, count=1, flags=re.S)
if n != 1:
    sys.exit("build.py: extension card not found")
s, n = re.subn(r'<h3>What you can do</h3>\s*<ul class="ticks">.*?</ul>', '''<h3>What you can do</h3>
        <ul class="ticks">
          <li>Highlight in 6 colours, underline, strike, box any area or figure; comment bubbles with replies</li>
          <li>Edit the PDF's own text, rotate, delete or add pages; text boxes, pen, shapes, images</li>
          <li>Web view: HTML pages as they look, links and buttons working, a floating toolbar on top</li>
          <li>Write like in Word: fonts, sizes, footnotes, contents, symbols, Word's shortcuts (Ctrl+/)</li>
          <li>Ask AI on a selection and review its changes one by one; offline spell check (F7)</li>
          <li>Page width A4, Letter, wide or the whole window; export PDF, HTML or Markdown; autosaves here</li>
        </ul>''', s, count=1, flags=re.S)
if n != 1:
    sys.exit("build.py: feature list not found")

# menu bar above the toolbar
rep('''<div class="work" id="work" hidden>
  <div class="tbar" id="tbar">''', '''<div class="work" id="work" hidden>
  <div class="menubar" role="menubar" aria-label="Menus">
    <button data-act="wEdit">Edit</button><button data-act="wInsert">Insert</button><button data-act="wFormat">Format</button><button data-act="wReview">Review</button><button data-act="wTools">Tools</button><button data-act="wPage">Page</button><button data-act="wHelp">Help</button>
    <span class="mb-sp"></span><span class="mb-hint">Ctrl+/ shortcuts · F7 spelling · Alt+A ask AI · Tab / Esc accept or reject a change</span>
  </div>
  <div class="tbar" id="tbar">''')

# toolbar: font, size, bigger/smaller after the paragraph style; subscript; spacing; painter; Ask AI; AI chat
rep('''<option value="p">Normal text</option><option value="h1">Title</option><option value="h2">Heading 1</option><option value="h3">Heading 2</option><option value="h4">Heading 3</option><option value="blockquote">Quote</option><option value="pre">Code</option>
      </select>''', '''<option value="p">Normal text</option><option value="h1">Title</option><option value="h2">Heading 1</option><option value="h3">Heading 2</option><option value="h4">Heading 3</option><option value="blockquote">Quote</option><option value="pre">Code</option>
      </select>
      <select class="tsel w-font" id="fontSel" title="Font (Ctrl+Shift+F)" aria-label="Font"></select>
      <select class="tsel w-size" id="sizeSel" title="Font size in points (Ctrl+Shift+P)" aria-label="Font size"></select>
      <button class="tb fb" data-act="wGrow" title="Bigger text (Ctrl+Shift+&gt;)"><span class="w-a">A<sup>+</sup></span></button>
      <button class="tb fb" data-act="wShrink" title="Smaller text (Ctrl+Shift+&lt;)"><span class="w-a">A<sup>−</sup></span></button>
      <span class="tsep"></span>''')
rep('<button class="tb fb sup" data-cmd="superscript" title="Superscript">x²</button>',
    '<button class="tb fb sup" data-cmd="superscript" title="Superscript (Ctrl+Shift+=)">x²</button>\n      <button class="tb fb sup" data-cmd="subscript" title="Subscript (Ctrl+=)">x₂</button>')
rep('<button class="tb fb" data-act="alignMenu" id="alignBtn" title="Align"><svg><use href="#i-al"/></svg></button>',
    '<button class="tb fb" data-act="alignMenu" id="alignBtn" title="Align (Ctrl+L, E, R, J)"><svg><use href="#i-al"/></svg></button>\n      <button class="tb fb" data-act="wSpacing" title="Line and paragraph spacing"><svg><use href="#i-spacing"/></svg></button>\n      <button class="tb fb" data-act="wPainter" title="Format painter: copy the look of the text at the cursor, then select text to paint (Ctrl+Alt+C / Ctrl+Alt+V)"><svg><use href="#i-brush"/></svg></button>')
rep('<button class="tb fb" data-act="flowComment" title="Comment on selection (Ctrl+Alt+M)"><svg><use href="#i-comment"/></svg></button>',
    '<button class="tb fb" data-act="flowComment" title="Comment on selection (Ctrl+Alt+M)"><svg><use href="#i-comment"/></svg></button>\n      <span class="tsep"></span>\n      <button class="tb fb ai-btn" data-act="aiAsk" title="Ask AI about the selection (Alt+A)"><svg><use href="#i-ai"/></svg><span class="lbl">Ask AI</span></button>\n      <button class="tb fb on" data-act="aiMarkup" id="aiMarkupBtn" title="Show changes on / off: off shows the text as it reads with the AI changes"><svg><use href="#i-eye"/></svg></button>')
rep('<button class="tb" data-act="toggleRight" title="Comments and highlights">',
    '<button class="tb flow-only ai-btn" data-act="aiPanel" id="aiPanelBtn" title="AI chat for this document"><svg><use href="#i-ai"/></svg><span class="lbl">AI</span></button>\n    <button class="tb" data-act="toggleRight" title="Comments and highlights">')


# page width box next to zoom
rep('''      <button class="tb" data-act="zoomIn" title="Zoom in (Ctrl +)"><svg><use href="#i-plus"/></svg></button>
    </span>''', '''      <button class="tb" data-act="zoomIn" title="Zoom in (Ctrl +)"><svg><use href="#i-plus"/></svg></button>
      <select class="tsel w-page flow-only" id="pageWSel" title="Page width: A4, Letter, wide, or the whole window (or drag the right edge of the page)" aria-label="Page width"></select>
    </span>''')

# the chat panel, after the notes panel
rep('''      <div class="rfoot"><button class="btn small" data-act="copyNotes" title="Copy all highlights and comments as Markdown">Copy notes</button></div>
    </aside>''', '''      <div class="rfoot"><button class="btn small" data-act="copyNotes" title="Copy all highlights and comments as Markdown">Copy notes</button></div>
    </aside>
    <aside class="ai-panel" id="aiPanel" aria-label="AI chat">
      <div class="rhead"><h3><svg><use href="#i-ai"/></svg>AI chat</h3><button class="ai-who" id="aiWho" data-aiact="settings" title="AI settings"></button><span style="flex:1"></span><button class="tb" data-aiact="menu" title="More"><svg><use href="#i-more"/></svg></button><button class="tb" data-aiact="close" title="Close the chat"><svg><use href="#i-x"/></svg></button></div>
      <div class="ai-stats" id="aiStats"></div>
      <div class="ai-log" id="aiLog"></div>
      <div class="ai-chat-foot"><textarea id="aiQ" placeholder="Ask about the paper… (Enter sends)" aria-label="Ask about the paper"></textarea><div class="row"><span class="hint">Same chat, with the whole paper.</span><button class="btn small ai" data-aiact="send">Send</button></div></div>
    </aside>''')

# spell checker (nspell, MIT) and dictionaries (SCOWL / Hunspell en_GB-ise and en_US, see vendor/*.LICENSE.txt)
data = "".join(f'<script type="text/plain" id="{i}">{(V / f).read_text(encoding="utf-8")}</script>\n' for i, f in
               [("dic-gb-aff", "en-GB.aff"), ("dic-gb-dic", "en-GB.dic"), ("dic-us-aff", "en-US.aff"), ("dic-us-dic", "en-US.dic"), ("sci-words", "science-words.txt")])
lib = "<script>/* nspell 2.1.5, MIT, (c) Titus Wormer */\n" + (V / "nspell.min.js").read_text(encoding="utf-8") + "\n</script>\n"
rep('<script type="text/plain" id="pdfworker">', data + lib + '<script type="text/plain" id="pdfworker">')

# app script: the AI and Word layers, and Paper Writer's documents brought over once
# v4: extension v3 (no editing of live pages; documents sync through Google Drive)
rep("""<p>Works on top of any web page, like Liner: select text and press <b>Highlight</b>, add comments, edit the page's text like a Word document. Everything is kept per address and comes back when you open the page again, on every computer where you sign in with Google (kept in your own Google Drive); a daily backup file keeps a copy outside the browser. One click also opens the page or a PDF here.</p>
        <a class="btn small" id="extLink" href="doc-reader-extension-v2.zip" download>""",
    """<p>Highlight and comment on any web page, like Liner: select text and press <b>Highlight</b>. Your marks come back whenever you open that page again. One click opens the page here, to edit a copy with the Word tools and the AI editor. (The extension stays hidden on Doc Reader's own pages.)</p>
        <p>Sign in with Google in the extension to see your highlights and documents on every computer you use; they are stored in your own Google Drive. You can also save each document as a Google Doc.</p>
        <a class="btn small" id="extLink" href="doc-reader-extension-v4.zip" download>""")   # v5: extension v4
# v4: lookups by id skip a web page's elements of the same name (a page's #menu, #toast, #right)
rep('const $ = (s, r = document) => r.querySelector(s);',
    'const $ = (s, r = document) => { const e = r.querySelector(s); return e && r === document && s[0] === "#" && e.closest("#flow") ? [...document.querySelectorAll(s)].find(x => !x.closest("#flow")) || e : e; };')
rep('app: "Lab Potato Doc Reader v2"', f'app: "Lab Potato Doc Reader {VER}"')
# v5: updating the extension without losing highlights
rep('On any page, click the small potato (bottom right) or the toolbar icon to open the tools.</li></ol>',
    'On any page, click the small potato (bottom right) or the toolbar icon to open the tools.</li></ol>\n          <p><b>Updating to a new version:</b> unzip it over the old folder, then press ↻ (reload) on <code>chrome://extensions</code>. Your highlights stay. Don\'t press <b>Remove</b>: that deletes the highlights kept on this computer (unless you signed in with Google or have a backup file).</p>')
# v5: tells the Chrome extension (v4 and later) to stay off this page: Doc Reader has its own tools
rep('<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n', '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="lab-potato-app" content="doc-reader">\n')
rep("/* a few names on window, for the tests and the console */", read("ai.js") + "\n" + read("word.js") + "\n" + read("merge.js") + "\n" + read("isolate.js") + "\n" + read("sync.js") + "\n/* a few names on window, for the tests and the console */")

if OUT.exists() and "--force" not in sys.argv:
    print(f"note: overwriting {OUT.name} (fine before it is published; never after)")
OUT.write_text(s, encoding="utf-8")
print(f"wrote {OUT.relative_to(ROOT)} ({len(s.encode()):,} bytes)")
