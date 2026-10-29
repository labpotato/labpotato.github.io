# Paper Writer

Write a paper in a Word-style editor with an AI editor. One offline HTML file, built on Doc Reader v2
(its own browser database, `lp-paperwriter`, so documents never mix with Doc Reader's).

- `paper-writer-v3.html`: the tool (v1 and v2 stay as legacy releases). Open it from the homepage, or
  double-click it on disk, then **Try the sample paper** (made up, deliberately rough prose).
- `src/`: what the tool is built from (see Building).

## AI editor

| Part | How it works |
|---|---|
| AI connection | **AI settings** (Tools or Review menu, or the start page): Demo (no key), Claude (your Anthropic key), OpenAI, Gemini, or any OpenAI-compatible server. Claude models are listed with what they are for and their price (Opus 5.5 by default; Fable 5.1, Sonnet 5.5, Haiku 5.5 and earlier generations); the model chip in the chat panel switches model in one click. Keys stay in the browser: forgotten when the tab closes unless "Remember" is ticked. |
| Ask from a selection | Select words inside one paragraph; **Ask AI** appears in the selection bar (or **Alt+A**, or the toolbar). Pick a quick request (editable list in settings) or type your own. |
| One chat per document | The chat lives with the document, in this browser (autosave and `.lpdoc`), not on claude.ai: requests go to the API with your key. **⋯ → Download the chat** saves it as Markdown. The whole paper goes with the first request, and again only when it has changed by more than about 15% (or from the chat menu). Every request also carries its paragraph with the selection marked, and the section heading. The thread only grows, so Claude's prompt cache keeps working; the chat panel shows token use and cached tokens. |
| Tracked changes in place | Only the selected part is replaced, shown in one colour like one reviewer in Word: deleted words struck through, new words underlined. When the answer changes most of the passage, the crossed-out words are hidden and it is labelled **Rewrite**. **Show changes** (eye button, Review menu) off shows the text as it reads with the changes. |
| Review, one change at a time | Each edit is its own change. **Tab** accepts it and moves to the next, **Esc** rejects it, **Alt+↓ / Alt+↑** move between changes, **Revise…** sends just that part back to the AI (optionally saying what is wrong). **More** accepts or rejects the whole suggestion, asks again for the whole passage (versions are kept), or switches between word-by-word and rewrite views. Review menu: accept or reject everything. All of it goes into undo; the AI is told what was accepted, partly accepted or rejected. |

Pending suggestions are left out of exports and saves to the original file (the original text is written),
and the web view opens only once they are all reviewed.

## Word-style editing

- **Fonts and sizes** (toolbar), bigger/smaller, subscript and superscript, small caps, change case,
  line and paragraph spacing, first-line indent, format painter, clear formatting.
- **Page**: A4, US Letter, wide, any width (drag the right edge of the page), or **fill the stage**
  (no page edges), from the page box in the toolbar or the Page menu; wide pages fold the side panels to
  make room, and the web view follows the same width; narrow, normal or wide margins; default font, size and line spacing (Page setup,
  optionally for every new document).
- **Paste** keeps the source's look (fonts, sizes, bold, colours, heading sizes from Word or Google Docs);
  the chip that appears switches to **Match this document** or **Plain text**; **Ctrl+Shift+V** pastes plain text.
- **Links**: Ctrl+K or Insert → Link; Enter applies; a bare address gets https://, an e-mail gets mailto:;
  click a link for Open / Edit / Remove.
- **Insert**: footnotes (numbered automatically, listed at the end), table of contents (updates itself
  from the headings), page break, symbols (Greek, maths, units, arrows), date, tables, images, links, comments.
- **Spelling**: offline English (UK) or (US) dictionaries with red wavy underlines, a list of common
  lab and medical terms, words in italics skipped (species names), right-click for suggestions,
  **F7** steps through the document like Word's Spelling pane, personal dictionary. The browser's own
  checker can be used instead (Tools menu).
- **Zoom** scales the text and the comment margin, not the page box around them, so writing extensions
  such as Grammarly keep their underlines on the words at any zoom (they are told to re-measure after a
  zoom or page-width change). With Grammarly on, the built-in spell check can be turned off in Tools.
- **Word count** in the corner (selection too), Ctrl+Shift+G for the full count.
- **Shortcuts**: Word's keys in the text (Ctrl+/ lists them all); where a browser keeps one of Word's
  keys for itself, the Google Docs key works instead. In the text, Ctrl+= is subscript (Word) rather than zoom.

## Building

```
python3 tools/paper-writer/src/build.py v2
```

It reads `tools/doc-reader/doc-reader-v2.html` (never changes it), inserts `ai.css`, `ai.js`,
`word.css`, `word.js` and `vendor/` (nspell 2.1.5, MIT; SCOWL/Hunspell en_GB-ise and en_US
dictionaries, see the licence files; `science-words.txt`), and writes `paper-writer-vN.html`. It stops
with an error if any insertion point has moved. Never rebuild over a published version: pass the next number.

## Notes

- Claude is called straight from the browser (`anthropic-dangerous-direct-browser-access`), API version
  `2026-10-21`, with prompt caching and, on Opus 5.5 / Sonnet 5.5 / Fable 5.1, server-side refusal
  fallbacks (`fallbacks: "default"`). Usage is billed to the key's Anthropic account.
- Demo mode makes rule-based edits in the browser (linking words, filler removal, formal wording,
  hedging, sentence reordering) so the review controls can be tried without a key. It is not an AI.
- Links, highlights and comments inside a passage the AI rewrites are replaced by its text when the
  change is accepted (they come back on reject).
