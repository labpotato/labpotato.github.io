# Accuracy harness

Measures the colony counter against synthetic plates whose colony count and
colony positions are known exactly. It reads the detection core straight out of
the published HTML file, so it always measures the tool as shipped.

```
cd tools/colony-counter/validation
node harness.js ../colony-counter-v2.html
```

No dependencies, no install. It takes a couple of minutes.

Options:

```
--sensitivity 70     run the whole suite at a different sensitivity
--margin 3           exclude the outer 3% of the dish, as the tool does by default
--reject             turn on "reject elongated objects"
```

## What the numbers mean

| Column | Meaning |
|---|---|
| `truth` | colonies actually placed on the plate |
| `count` | what the tool reported, clump estimates included |
| `err%` | count error — the number a user would see be wrong by |
| `TP` / `FP` / `FN` | per-colony matches within about one colony radius: colonies found, things found that are not colonies, colonies missed |
| `mode` | which appearance map the detector chose by itself |

`err%` can look good while `TP`/`FP` look bad, because a false positive and a
missed colony cancel out in the total. Read both.

## Results

`colony-counter-v2.html`, default settings:

```
mean |count error| 0.59%    precision 100.0%    recall 99.5%    F1 99.8%
```

`colony-counter-v1.html` is not comparable — it has no worker block of this
shape — but the pipeline that v2 replaced scored **48.31% mean count error,
61.6% precision and 54.2% recall** on this same suite. Most of that gap was one
bug: the automatic choice between the pale / dark / coloured appearance maps
picked the wrong map on 5 of 7 plates, because it scored each map by how round
and uniform its objects were, and on a bright-colony plate the dark map latches
onto the round, uniform gaps *between* the colonies.

## The other two scripts

```
node lowres.js ../colony-counter-v2.html        # is the low-resolution boost worth it?
node confidence.js ../colony-counter-v2.html    # does the confidence score track correctness?
```

**`lowres.js`** builds plates whose colonies are 1.8 to 3 px across and compares the boost off,
automatic, 2x and 3x. The count is already right without it, because an unresolved pair is counted
as a clump of two; what changes is whether the colonies are actually *resolved*. On the plate with
ten touching pairs at 2.5 px radius:

```
                      off        auto
colonies matched     40/50      50/50
```

It also confirms `auto` leaves a normal plate alone (control: 1x, unchanged).

**`confidence.js`** runs plates chosen so the detector makes real mistakes, then compares the score
of objects that matched a real colony against those that did not:

```
658 correct (mean score 0.929)    7 wrong (mean score 0.391)

cut-off   flags this share of the mistakes   of the correct ones
  0.50                 86%                          1%
  0.60                100%                          1%     <- the default
```

On the six plates the detector gets right, nothing is flagged at any cut-off up to 0.70. The score
is a way of directing attention, **not a probability**: 0.8 does not mean eight in ten such objects
are colonies, and no calibration against real plates exists.

## What this does not tell you

These are generated images. They have a dish wall, an illumination gradient, a
vignette, sensor noise, touching colonies, a scratch and a marker stroke — and
none of agar bubbles, lid condensation, reflections, motion blur, handwriting on
the lid, or a colony that is genuinely ambiguous to a human. **The tool has not
been benchmarked against a manually counted reference plate.** Treat an
automatic count as a first pass and confirm it with the Add and Remove tools
before reporting it.
