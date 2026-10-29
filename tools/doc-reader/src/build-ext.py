#!/usr/bin/env python3
"""Build the Chrome extension from a built Doc Reader page and the extension's own files.

    python3 tools/doc-reader/src/build-ext.py v4 v3

Takes tools/doc-reader/doc-reader-<page>.html (made by build.py) and src/extension/ (manifest,
background worker, on-page tools, library), and writes tools/doc-reader/doc-reader-extension-<ext>.zip.
The reader page is the same file split up, because extension pages may not run inline scripts:
the style becomes reader.css, the libraries vendor.js, the spell checker nspell.js, the app reader.js;
the PDF worker becomes pdf.worker.min.js. Dictionaries stay inline (type="text/plain" is data, not code).
Never rebuild over a published zip: pass the next number.
"""
import pathlib, re, sys, zipfile, io

HERE = pathlib.Path(__file__).resolve().parent
OUTDIR = HERE.parent
if len(sys.argv) < 3: sys.exit("build-ext.py: give the page version and the extension version, e.g. v4 v3")
PAGE, EXT = sys.argv[1], sys.argv[2]
h = (OUTDIR / f"doc-reader-{PAGE}.html").read_text(encoding="utf-8")
files = {}


def cut(start_tag, end_tag, start=0):
    i = h.index(start_tag, start); j = h.index(end_tag, i + len(start_tag)); return i, j


# the style block
i, j = cut("<style>", "</style>")
files["reader.css"] = h[i + 7:j].strip() + "\n"
h = h[:i] + '<link rel="stylesheet" href="reader.css">' + h[j + 8:]
# the PDF worker (text/plain) becomes its own file
i, j = cut('<script type="text/plain" id="pdfworker">', "</script>")
files["pdf.worker.min.js"] = h[i + len('<script type="text/plain" id="pdfworker">'):j].strip() + "\n"
h = h[:i] + h[j + 9:].lstrip("\n")
# GoatCounter is for the website only
h, n = re.subn(r'<script data-goatcounter=[^>]*>\s*</script>\n?', "", h)
assert n == 1, "GoatCounter snippet not found"
# the executable inline scripts, in order: libraries, nspell, the app
names = ["vendor.js", "nspell.js", "reader.js"]
out, pos, k = [], 0, 0
for m in re.finditer(r"<script>", h):
    if m.start() < pos: continue
    e = h.index("</script>", m.end())
    body = h[m.end():e]
    name = names[k]; k += 1
    if name == "reader.js": body = 'window.PDF_WORKER_SRC = "pdf.worker.min.js";\n' + body.strip() + "\n"
    files[name] = body.strip() + "\n" if name != "reader.js" else body
    out.append(h[pos:m.start()] + f'<script src="{name}"></script>'); pos = e + 9
    if k == len(names): break
out.append(h[pos:]); h = "".join(out)
assert k == 3, f"expected 3 inline scripts, found {k}"
assert "<script>" not in h, "an inline script is left"
files["reader.html"] = h
for f in (HERE / "extension").iterdir():
    if f.is_file(): files[f.name] = f.read_bytes()

zp = OUTDIR / f"doc-reader-extension-{EXT}.zip"
if zp.exists() and "--force" not in sys.argv: sys.exit(f"{zp.name} exists: never rebuild a published zip (use --force only before publishing)")
buf = io.BytesIO()
with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
    for name in sorted(files):
        v = files[name]; z.writestr(name, v if isinstance(v, bytes) else v.encode("utf-8"))
zp.write_bytes(buf.getvalue())
print(f"wrote {zp.relative_to(OUTDIR.parents[1])} ({len(buf.getvalue()):,} bytes, {len(files)} files)")
if "--dir" in sys.argv:   # also unpacked, for testing
    d = pathlib.Path(sys.argv[sys.argv.index("--dir") + 1]); d.mkdir(parents=True, exist_ok=True)
    for name, v in files.items(): (d / name).write_bytes(v if isinstance(v, bytes) else v.encode("utf-8"))
