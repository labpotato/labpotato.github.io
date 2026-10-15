# Instagram reels

Two 9:16 reels (1080 × 1920, 30 fps, H.264 + AAC), pixel-art Lab Potato.

| File | Length | What it is |
|---|---|---|
| `video/reel1-potato-lab-life.mp4` | 25 s | Bouncy potato in four lab sketches (centrifuge, forgotten ladder, p = 0.051, 3 AM figure), ends on the site |
| `video/reel2-gel-labeler.mp4` | 28 s | Gel Labeler walkthrough built from real screens of v6: crop, lanes, labels, auto ladder, quantify, export |
| `*_sfx-only.mp4` | | Same videos with sound effects only and no music loop, so you can add a trending track in Instagram |
| `video/*-cover.png` | | Cover frames to upload as the reel thumbnail |

Captions, mascot and key visuals sit inside the Reels safe zone: below 270 px from
the top, above 1440 px from the bottom, and left of x = 940 (clear of the like and
share buttons).

## Posting notes

- Upload the `_sfx-only` file if you want trending audio. Keep the original audio at
  about 30 % so the 8-bit hops and pops stay audible.
- Suggested caption, reel 1: `A day in the lab, as told by a potato 🥔 Free lab tools that run in your browser, link in bio.`
- Suggested caption, reel 2: `Stop drawing arrows on gels in PowerPoint. Gel Labeler: lanes, ladder, band quantification and editable PowerPoint export. Free, runs in your browser, your gel never leaves your computer. Link in bio.`
- Hashtags: `#phdlife #labmemes #westernblot #sdspage #molecularbiology #gradschool #labtools #openscience`

## Re-rendering

Everything is generated from `src/`. Each frame is a pure function of time, so renders
are reproducible. You need Node with Playwright (Chromium), Python 3 with NumPy and Pillow,
and ffmpeg. `render.js` and `still.js` load Playwright from `/opt/node-tools`; change that
path if yours lives somewhere else.

```sh
cd marketing/reels/src
python3 mkgel.py                 # synthetic Coomassie gel used in the demo
mkdir -p cap && node capture.js  # drives gel-labeler-v6.html and screenshots each step
python3 make-assets.py           # embeds the exported figure for the pixel layer
mkdir -p out
node render.js reel1.html out/reel1 && ./mux.sh out/reel1 25
node render.js reel2.html out/reel2 && ./mux.sh out/reel2 28
```

Preview a single frame with `node still.js reel1.html frame_%.png 13.5`. Prefix the
command with `SAFE=1` to overlay the safe zone in red.

- `common.js`: mascot rig (squash-and-stretch hops, expressions, goggles), captions,
  speech bubbles, and the pixel renderer (art at 1/6 resolution, upscaled nearest-neighbour).
- `PX` in `common.js` sets the pixel size. Larger values give a chunkier look.
- `sfx.py`: 8-bit sound effects and the chiptune loop. Edit `window.SFX` in each reel to
  change the cue timings.
- Fonts: Pixelify Sans (SIL Open Font License) for the captions.
