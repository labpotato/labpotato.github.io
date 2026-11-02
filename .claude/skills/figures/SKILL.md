---
name: figures
description: Workflow for any request to draw, generate, or make an image, figure, diagram, schematic, plasmid map, genetic circuit, pathway, flowchart, plot, illustration, poster graphic, or icon. Use it before writing any drawing code. Covers which tool to use, the render-and-check loop, and lab figure conventions.
---

# Making images for the owner

Claude cannot paint pixels. Every image is code that gets rendered (SVG,
matplotlib, draw.io XML, Mermaid, tldraw shapes) or a call to an external
image tool. Quality comes from two things: choosing the right medium, and
looking at the rendered result before handing it over.

## 1. Pick the medium

| Content | Use | Notes |
|---|---|---|
| Data plots | matplotlib / seaborn (load the `dataviz` or `scientific-visualization` skill) | Exact, reproducible; never hand-draw data |
| Plasmid maps | `dna_features_viewer` (circular/linear, reads GenBank) or `plasmidcanvas` | Get GenBank from the Addgene connector when the plasmid is on Addgene |
| Genetic circuits | SBOL Visual glyphs in hand-written SVG (or `dnaplotlib` if installable) | Promoter = bent arrow, RBS = semicircle, CDS = pentagon arrow, terminator = T |
| Pathways, workflows, cloning strategies, flowcharts | Mermaid (Mermaid Chart connector) or draw.io | Let the layout engine place nodes |
| Editable diagrams the owner will tweak | `.drawio` XML file (opens at app.diagrams.net); draw.io MCP if loaded | Keep everything editable |
| Quick sketches / whiteboarding together | tldraw connector | Informal, interactive |
| Biological illustration (cells, organelles, animals, lab equipment) | BioRender connector | Claude's own organic shapes look poor |
| Posters, flyers, slides | Adobe connector (`create_visual_design_express_skill`) | |
| Photorealistic / artistic images | Diffusion model tool (Adobe Firefly, or an image MCP if connected) | Never for anything with labels, numbers, or data |

If a needed connector is missing or failed to connect, say so and fall back
to SVG or matplotlib rather than silently degrading.

## 2. Plan before drawing

For any schematic, first list the elements, their order and positions, and
every arrow (source → target, activation or repression). Check the biology
is right at this stage: a wrong regulatory arrow is a scientific error, not a
cosmetic one. Ask only if a fact that changes the figure is genuinely missing.

## 3. Render, look, fix (mandatory)

Never deliver a figure you have not looked at.

1. Render to PNG: matplotlib `savefig`; SVG/HTML via Playwright
   (`require('playwright')`, `chromium.launch()`, `page.screenshot`).
2. Read the PNG with the Read tool and check against the plan: overlapping
   or clipped labels, leader lines crossing features, arrows missing their
   targets, wrong strand or orientation, illegible text, colour clashes.
3. Fix and re-render. Usually 2–3 rounds. Stop when nothing on the checklist
   fails, not when it "looks fine".
4. When the owner critiques, apply the specific correction and re-check.

## 4. Conventions

- Deliver SVG (editable) plus PNG at 300 dpi; PDF on request.
- Sans-serif (Arial/Helvetica), ≥ 7 pt at final print size.
- Colour-blind-safe palette (Okabe–Ito); never encode meaning by red/green alone.
- SVG with named groups (`<g id="promoter">`) so it can be edited in Inkscape/Illustrator.
- Consistent colour per part type across figures in one project.
- No chartjunk: no 3D, drop shadows, or gradients on data.
- Write deliverables to the scratchpad (or a folder the owner names), give the
  full absolute path, and send the file with SendUserFile. Do not commit
  figures to this website repo unless asked.

## 5. Environment setup (cloud sessions are wiped on exit)

Install on demand, in a scratch directory:

```
pip install -q dna_features_viewer plasmidcanvas biopython matplotlib
```

`dnaplotlib` fails to build on Python ≥ 3.12 (its `setup.py` imports the
removed `distutils`); installing it needs a patched copy and the owner's
approval. Drawing SBOL glyphs directly in SVG is the default instead.

The draw.io MCP (`claude mcp add drawio -- npx -y @drawio/mcp`) only loads
after a restart and does not survive a cloud session; prefer writing `.drawio`
XML files, or the hosted connector `https://mcp.draw.io` if the owner has added it.
