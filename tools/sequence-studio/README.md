# Sequence Studio

A single-file, offline plasmid editor for the browser, built to stand in for SnapGene on a machine that cannot spare the disk space.

**Files.** Opens SnapGene `.dna` and `.prot`, GenBank (`.gb .gbk .genbank .ape`), EMBL, FASTA (DNA or protein), plain text, Serial Cloner / DNA Strider `.xdna`, and its own `.json`. Saves SnapGene `.dna` (when the sequence came from a `.dna` file every packet of the original is kept and only the sequence, features, primers and notes are replaced, so annotations made here land in the same file SnapGene opens), GenBank with `/label` and colours, FASTA, and the map as SVG or PNG.

**Views.** Circular and linear maps with features, enzyme sites and primers, a sequence view with both strands, translations, enzyme sites and feature bars, and a Split view with map and sequence side by side and the selection synced. Drag to select on either; Find (DNA with IUPAC and mismatches, protein motifs in six frames, feature and enzyme names), Go to, keyboard navigation.

**Annotation and editing.** Features and primers with a dialog each; the selection becomes a feature (F) or a primer (P). Detect common features recognises standard backbone parts (origins, resistance genes, lacI, lacZα, CMV, T7, SP6, EGFP, polyA signals and more, taken from Addgene's annotated pUC19, pET-28b and pcDNA3-EGFP records) and tags and protease sites by translation. Typing, deleting, inserting and replacing sequence moves features along; undo and redo.

**Enzymes and digests.** About 230 common enzymes with sites and cut positions; sets for unique cutters, up to two cutters, all, or a chosen list, plus custom enzymes. The Digest tab lists fragments for any combination, draws a virtual gel, and opens a fragment as a new sequence.

**Primers and protein.** Nearest-neighbour Tm (SantaLucia 1998, salt-corrected), primer design for a selected amplicon with optional tails and restriction sites, binding-site search with 5′ tails tolerated. The Protein tab translates a selection, a CDS or a pasted protein and reports length, MW, pI, ε280 (Pace 1995), A 0.1%, GRAVY, aliphatic index, composition and a hydropathy plot, with a Send to AlphaFold 3 button that writes the AlphaFold Server job JSON and opens the site.

Everything runs in the page; nothing is uploaded. `v1` is the first release.
