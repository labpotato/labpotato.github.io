#!/usr/bin/env python3
"""Build the Paper Writer demo: Doc Reader v2 plus the AI layer (ai.css, ai.js).

    python3 demos/paper-writer/src/build.py

Reads tools/doc-reader/doc-reader-v2.html (never changes it) and writes
demos/paper-writer/paper-writer-demo.html. Each edit must match exactly once, so
a newer Doc Reader that moved things fails loudly instead of building a broken file.
"""
import pathlib, re, sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SRC = ROOT / "tools/doc-reader/doc-reader-v2.html"
OUT = HERE.parent / "paper-writer-demo.html"

s = SRC.read_text(encoding="utf-8")
css = (HERE / "ai.css").read_text(encoding="utf-8")
js = (HERE / "ai.js").read_text(encoding="utf-8")


def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        sys.exit(f"build.py: expected {count} match(es), found {n}: {old[:80]!r}")
    s = s.replace(old, new)


# head
rep("<title>Doc Reader · Lab Potato</title>", "<title>Paper Writer (demo) · Lab Potato</title>")
rep('<meta name="description" content="Read, highlight, comment on and edit PDFs, Markdown, web pages and images. Works offline; everything stays on your computer.">',
    '<meta name="description" content="In-house demo: Doc Reader with an AI editor. Select text, ask for a change, review it as tracked changes.">\n<meta name="robots" content="noindex,nofollow">')
i = s.index("</style>\n</head>")
s = s[:i] + "\n" + css + s[i:]

# icon, header
rep("  </defs>\n</svg>", '    <symbol id="i-ai" viewBox="0 0 24 24"><path d="M11 3.5l1.9 5.1 5.1 1.9-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9z"/><path d="M18.5 15l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/></symbol>\n  </defs>\n</svg>')
rep('<h1 class="brand-tool">Doc Reader</h1>\n  <span class="ver-chip">v2</span>',
    '<h1 class="brand-tool">Paper Writer</h1>\n  <span class="ver-chip demo" title="In-house demo built on Doc Reader v2; not on the Lab Potato homepage">demo</span>')

# start page
rep("<h2>Open a paper, report or web page</h2>", "<h2>Write your paper with an AI editor</h2>")
rep('<button class="btn big" data-act="newBlank"><svg><use href="#i-new"/></svg>Blank document</button>',
    '<button class="btn big" data-act="newBlank"><svg><use href="#i-new"/></svg>Blank document</button>\n        <button class="btn big" data-act="aiSample"><svg><use href="#i-ai"/></svg>Try the sample paper</button>')
s, n = re.subn(r'<div class="home-card" id="extCard">.*?</details>\s*</div>',
               '''<div class="home-card ai-card" id="aiCard">
        <h3><svg><use href="#i-ai"/></svg>AI editor (in-house demo)</h3>
        <p>Select words in a paragraph and press <b>Ask AI</b> (Alt+A); pick a request such as <i>Better logical flow</i>, or type your own. The answer comes back in place as tracked changes, or labelled <b>Rewrite</b> when it changes a lot. <b>Tab</b> accepts, <b>Esc</b> rejects, <b>Ask again</b> sends it back with extra instructions.</p>
        <p>Each document keeps one chat: the AI gets the whole paper once, then each request with its paragraph. Markdown, Word-style documents and PDFs turned into documents all work.</p>
        <button class="btn small" data-act="aiSettings">AI settings…</button> <span class="muted" style="font-size:12px">Now: <span id="aiHomeWho">Demo mode (no AI)</span></span>
      </div>''', s, count=1, flags=re.S)
if n != 1:
    sys.exit("build.py: extension card not found")

# toolbar: Ask AI with the editor tools, AI chat beside the notes button
rep('<button class="tb fb" data-act="flowComment" title="Comment on selection (Ctrl+Alt+M)"><svg><use href="#i-comment"/></svg></button>',
    '<button class="tb fb" data-act="flowComment" title="Comment on selection (Ctrl+Alt+M)"><svg><use href="#i-comment"/></svg></button>\n      <span class="tsep"></span>\n      <button class="tb fb ai-btn" data-act="aiAsk" title="Ask AI about the selection (Alt+A)"><svg><use href="#i-ai"/></svg><span class="lbl">Ask AI</span></button>')
rep('<button class="tb" data-act="toggleRight" title="Comments and highlights">',
    '<button class="tb flow-only ai-btn" data-act="aiPanel" id="aiPanelBtn" title="AI chat for this document"><svg><use href="#i-ai"/></svg><span class="lbl">AI</span></button>\n    <button class="tb" data-act="toggleRight" title="Comments and highlights">')

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

# app script: own database (separate from the real Doc Reader on the same site), names, the AI layer
rep('indexedDB.open("lp-docreader", 1)', 'indexedDB.open("lp-paperwriter", 1)')
rep('document.title = d.name + " · Doc Reader";', 'document.title = d.name + " · Paper Writer";')
rep('document.title = "Doc Reader · Lab Potato";', 'document.title = "Paper Writer (demo) · Lab Potato";')
rep('app: "Lab Potato Doc Reader v2"', 'app: "Lab Potato Paper Writer demo (Doc Reader v2)"')
rep("/* a few names on window, for the tests and the console */", js + "\n/* a few names on window, for the tests and the console */")

# an in-house demo is not counted with the public tools
s, n = re.subn(r'<script data-goatcounter=[^>]*>\s*</script>\n?', "", s)
if n != 1:
    sys.exit("build.py: GoatCounter snippet not found")

OUT.write_text(s, encoding="utf-8")
print(f"wrote {OUT.relative_to(ROOT)} ({len(s.encode()):,} bytes)")
