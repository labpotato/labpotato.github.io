#!/usr/bin/env python3
"""Build Paper Writer: Doc Reader v2 plus the AI editor (ai.css, ai.js) and Word-style editing
(word.css, word.js, the nspell spell checker and its en-GB / en-US dictionaries in vendor/).

    python3 tools/paper-writer/src/build.py [vN]

Reads tools/doc-reader/doc-reader-v2.html (never changes it) and writes
tools/paper-writer/paper-writer-vN.html (default v1). Each edit must match exactly once, so a
newer Doc Reader that moved things fails loudly instead of building a broken file.
Never rebuild over a published version: pass the next number.
"""
import pathlib, re, sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
VER = sys.argv[1] if len(sys.argv) > 1 else "v1"
SRC = ROOT / "tools/doc-reader/doc-reader-v2.html"
OUT = HERE.parent / f"paper-writer-{VER}.html"
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
rep("<title>Doc Reader · Lab Potato</title>", "<title>Paper Writer · Lab Potato</title>")
rep('<meta name="description" content="Read, highlight, comment on and edit PDFs, Markdown, web pages and images. Works offline; everything stays on your computer.">',
    '<meta name="description" content="Write a paper in a Word-style editor with an AI editor: select text, ask for a change, review it as tracked changes. Works offline.">')
i = s.index("</style>\n</head>")
s = s[:i] + "\n" + css + s[i:]

# icons, header
rep("  </defs>\n</svg>", '''    <symbol id="i-ai" viewBox="0 0 24 24"><path d="M11 3.5l1.9 5.1 5.1 1.9-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9z"/><path d="M18.5 15l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/></symbol>
    <symbol id="i-spacing" viewBox="0 0 24 24"><path d="M10 6h10M10 12h10M10 18h10"/><path d="M5 4v16M3 6.5 5 4l2 2.5M3 17.5 5 20l2-2.5"/></symbol>
    <symbol id="i-eye" viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></symbol>
    <symbol id="i-brush" viewBox="0 0 24 24"><rect x="4" y="3" width="13" height="6" rx="1.5"/><path d="M17 6h3v5h-8v3"/><rect x="10.5" y="14" width="3" height="7" rx="1"/></symbol>
  </defs>
</svg>''')
rep('<h1 class="brand-tool">Doc Reader</h1>\n  <span class="ver-chip">v2</span>',
    f'<h1 class="brand-tool">Paper Writer</h1>\n  <span class="ver-chip" title="Demo built on Doc Reader v2">{VER} · demo</span>')

# start page
rep("<h2>Open a paper, report or web page</h2>", "<h2>Write your paper with an AI editor</h2>")
rep('<button class="btn big" data-act="newBlank"><svg><use href="#i-new"/></svg>Blank document</button>',
    '<button class="btn big" data-act="newBlank"><svg><use href="#i-new"/></svg>Blank document</button>\n        <button class="btn big" data-act="aiSample"><svg><use href="#i-ai"/></svg>Try the sample paper</button>')
s, n = re.subn(r'<div class="home-card" id="extCard">.*?</details>\s*</div>',
               '''<div class="home-card ai-card" id="aiCard">
        <h3><svg><use href="#i-ai"/></svg>AI editor</h3>
        <p>Select words in a paragraph and press <b>Ask AI</b> (Alt+A); pick a request such as <i>Better logical flow</i>, or type your own. The answer comes back in place as tracked changes, or labelled <b>Rewrite</b> when it changes a lot. <b>Tab</b> accepts, <b>Esc</b> rejects, <b>Ask again</b> sends it back with extra instructions.</p>
        <p>Each document keeps one chat: the AI gets the whole paper once, then each request with its paragraph. Use your own Claude (Anthropic) key, another AI, or the demo mode with no key.</p>
        <button class="btn small" data-act="aiSettings">AI settings…</button> <span class="muted" style="font-size:12px">Now: <span id="aiHomeWho">Demo mode (no AI)</span></span>
      </div>''', s, count=1, flags=re.S)
if n != 1:
    sys.exit("build.py: extension card not found")
s, n = re.subn(r'<h3>What you can do</h3>\s*<ul class="ticks">.*?</ul>', '''<h3>What you can do</h3>
        <ul class="ticks">
          <li>Word-style editing: fonts, sizes, headings, lists, tables, images, footnotes, contents, symbols</li>
          <li>Page width: A4, Letter, wide, any width (drag the page edge) or fill the whole window</li>
          <li>Offline spell check in English (UK) or (US), with lab and medical terms; F7 steps through</li>
          <li>Word's keyboard shortcuts (Ctrl+/ lists them); word count; format painter; change case</li>
          <li>Highlights and comment bubbles; export to PDF, HTML or Markdown; autosaves in this browser</li>
          <li>Open a PDF and turn it into an editable document; open Markdown, HTML or web pages</li>
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
# the start page's "load a web page" fallback: this tool has no Chrome extension
rep("Three ways round it: use the <b>Chrome extension</b> (right), or open the page in another tab, select all (Ctrl+A), copy, and press <b>Paste</b> here, or save the page as PDF from the browser's print dialog and drop it in.",
    "Two ways round it: open the page in another tab, select all (Ctrl+A), copy, and press <b>Paste</b> here (or paste into a blank document), or save the page as PDF from the browser's print dialog and drop it in.")
rep('''
      <label class="opt"><input type="radio" name="how" value="ext"><div><b>Use the Chrome extension</b><span>One click opens any page, including ones you are signed in to.</span></div></label></div>''', '''</div>''')

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

# app script: own database (separate from Doc Reader on the same site), names, the AI and Word layers
rep('indexedDB.open("lp-docreader", 1)', 'indexedDB.open("lp-paperwriter", 1)')
rep('document.title = d.name + " · Doc Reader";', 'document.title = d.name + " · Paper Writer";')
rep('document.title = "Doc Reader · Lab Potato";', 'document.title = "Paper Writer · Lab Potato";')
rep('app: "Lab Potato Doc Reader v2"', f'app: "Lab Potato Paper Writer {VER}"')
rep("/* a few names on window, for the tests and the console */", read("ai.js") + "\n" + read("word.js") + "\n/* a few names on window, for the tests and the console */")

# visits are counted under this tool's own path
rep('''data-goatcounter-settings='{"path":"/tools/doc-reader"}\'''', '''data-goatcounter-settings='{"path":"/tools/paper-writer"}\'''')

if OUT.exists() and "--force" not in sys.argv:
    print(f"note: overwriting {OUT.name} (fine before it is published; never after)")
OUT.write_text(s, encoding="utf-8")
print(f"wrote {OUT.relative_to(ROOT)} ({len(s.encode()):,} bytes)")
