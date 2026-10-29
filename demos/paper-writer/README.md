# Paper Writer (in-house demo)

Doc Reader v2 with an AI editor for writing a paper. **Not on the Lab Potato homepage**: not in
`assets/tools.js`, no GoatCounter snippet, `noindex` in the page. It keeps its documents in its own
browser database (`lp-paperwriter`), separate from the real Doc Reader.

Open `paper-writer-demo.html` straight from disk (double-click), then **Try the sample paper**.

## What it adds to Doc Reader

| Part | How it works |
|---|---|
| AI connection | **AI settings** (the AI chip in the chat panel, or the start page): Demo (no key), Claude (your Anthropic key, any model; Opus 5.5 by default, effort selectable), OpenAI, Gemini, or any OpenAI-compatible server. Keys stay in the browser: forgotten when the tab closes unless "Remember" is ticked. |
| Ask from a selection | Select words inside one paragraph; **Ask AI** appears in the selection bar (or press **Alt+A**, or the toolbar button). Pick a quick request (editable list in settings) or type your own. |
| One chat per document | The chat lives with the document (autosave and `.lpdoc`). The whole paper goes with the first request, and again only when it has changed by more than about 15% (or from the chat menu). Every request also carries its paragraph with the selection marked, and the section heading. The thread only grows, so Claude's prompt cache keeps working; the chat panel shows token use and cached tokens. |
| Tracked changes in place | Only the selected part is replaced. Deletions are struck through in red, insertions underlined in green. When the answer changes most of the passage, the crossed-out words are hidden and it is labelled **Rewrite** (**Original** shows the old text; **As edits** / **As rewrite** switches the view). |
| Review | **Tab** accepts, **Esc** rejects, **Ask again…** sends the same passage back with optional extra instructions; every version is kept (‹ 1/2 ›). Accept and reject go into undo. The AI is told which suggestions were accepted or rejected. |

Pending suggestions are left out of exports and saves to the original file (the original text is written),
and the web view opens only once they are all reviewed.

## Building

The page is Doc Reader v2 with `src/ai.css` and `src/ai.js` inserted by `src/build.py`:

```
python3 demos/paper-writer/src/build.py
```

It reads `tools/doc-reader/doc-reader-v2.html` (never changes it) and stops with an error if any
insertion point has moved, so it can be pointed at a newer Doc Reader later.

## Notes

- Claude is called straight from the browser (`anthropic-dangerous-direct-browser-access`), API version
  `2026-10-21`, with prompt caching and, on Opus 5.5 / Sonnet 5.5 / Fable 5.1, server-side refusal
  fallbacks (`fallbacks: "default"`). Usage is billed to the key's Anthropic account.
- Demo mode makes rule-based edits in the browser (linking words, filler removal, formal wording,
  hedging, sentence reordering) so the review controls can be tried without a key. It is not an AI.
- Links, highlights and comments inside a passage the AI rewrites are replaced by its text when the
  change is accepted (they come back on reject).
