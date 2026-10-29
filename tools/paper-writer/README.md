# Paper Writer (now part of Doc Reader)

Paper Writer's AI editor and Word-style editing are part of **Doc Reader from v3** on; it is no longer
a separate tool on the homepage, and `tools/paper-writer/` opens Doc Reader.

The files `paper-writer-v1.html` to `paper-writer-v5.html` stay so that old links keep working. Their
source now lives in `tools/doc-reader/src/`. The first time Doc Reader v3 opens in a browser, it copies
the documents, AI chats and settings that Paper Writer kept there (its own browser database,
`lp-paperwriter`) into Doc Reader's; the old database is left untouched.
