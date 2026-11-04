/* Lab Potato — citation saver.
   Reads a page's citation metadata, writes it as RIS, EndNote (.enw) and BibTeX,
   and hands it to Lab Entry's research map. The extraction and the three formats are
   pure functions (LPCite.*) so they can be tested on their own. */
(function (root) {
  "use strict";
  const txt = s => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  const meta = (doc, names) => { for (const n of names){ const el = doc.querySelector(`meta[name="${n}"],meta[property="${n}"]`); if (el && el.content) return el.content; } return ""; };
  const metaAll = (doc, name) => [...doc.querySelectorAll(`meta[name="${name}"],meta[property="${name}"]`)].map(e => e.content).filter(Boolean);

  // ── read the citation from a page's <head> (Highwire tags, Dublin Core, Open Graph, JSON-LD) ──
  function extract(doc, url){
    const out = { kind: "paper", title: "", authors: [], year: "", journal: "", volume: "", issue: "", pages: "", doi: "", url: url || "", publisher: "", abstract: "" };
    // Highwire Press tags — what PubMed, journals and Google Scholar emit
    out.title = txt(meta(doc, ["citation_title"])) || "";
    let authors = metaAll(doc, "citation_author").map(txt);
    if (!authors.length) authors = metaAll(doc, "citation_authors").flatMap(a => a.split(";")).map(txt).filter(Boolean);
    if (!authors.length) authors = metaAll(doc, "dc.creator").map(txt);
    out.authors = authors;
    out.journal = txt(meta(doc, ["citation_journal_title", "citation_conference_title", "prism.publicationName", "dc.source"]));
    out.volume = txt(meta(doc, ["citation_volume", "prism.volume"]));
    out.issue = txt(meta(doc, ["citation_issue", "prism.number"]));
    const fp = txt(meta(doc, ["citation_firstpage", "prism.startingPage"])), lp = txt(meta(doc, ["citation_lastpage", "prism.endingPage"]));
    out.pages = fp && lp ? fp + "-" + lp : fp;
    out.doi = txt(meta(doc, ["citation_doi", "dc.identifier.doi", "prism.doi"])).replace(/^doi:/i, "").replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
    out.publisher = txt(meta(doc, ["citation_publisher", "dc.publisher"]));
    out.abstract = txt(meta(doc, ["citation_abstract", "dc.description", "og:description", "description"]));
    const date = txt(meta(doc, ["citation_publication_date", "citation_date", "dc.date", "prism.publicationDate", "article:published_time"]));
    const ym = date.match(/\d{4}/); out.year = ym ? ym[0] : "";
    // try JSON-LD for anything still missing
    try {
      for (const s of doc.querySelectorAll('script[type="application/ld+json"]')){
        let j; try { j = JSON.parse(s.textContent); } catch (e){ continue; }
        (Array.isArray(j) ? j : [j]).forEach(o => {
          if (!o || typeof o !== "object") return;
          const t = (o["@type"] || "").toString().toLowerCase();
          if (!out.title && o.headline) out.title = txt(o.headline);
          if (!out.title && o.name && (t.includes("article") || t.includes("book") || t.includes("scholarly"))) out.title = txt(o.name);
          if (!out.authors.length && o.author){ const a = Array.isArray(o.author) ? o.author : [o.author]; out.authors = a.map(x => txt(x.name || x)).filter(Boolean); }
          if (!out.year && (o.datePublished || o.dateCreated)){ const m = (o.datePublished || o.dateCreated).match(/\d{4}/); if (m) out.year = m[0]; }
          if (!out.publisher && o.publisher) out.publisher = txt(o.publisher.name || o.publisher);
          if (t.includes("book")) out.kind = "book";
        });
      }
    } catch (e){}
    // Open Graph / plain fallbacks for a non-scholarly web page
    const ogType = txt(meta(doc, ["og:type"]));
    if (!out.title) out.title = txt(meta(doc, ["og:title", "twitter:title"])) || txt(doc.title);
    if (!out.publisher) out.publisher = txt(meta(doc, ["og:site_name"]));
    if (!out.authors.length){ const a = txt(meta(doc, ["author", "article:author", "dc.creator"])); if (a && !/^https?:/.test(a)) out.authors = [a]; }
    // decide the kind
    if (out.doi || meta(doc, ["citation_title"])) out.kind = out.kind === "book" ? "book" : "paper";
    else if (/book/i.test(ogType)) out.kind = "book";
    else out.kind = out.journal ? "paper" : "web";
    out.fig = txt(meta(doc, ["og:image", "twitter:image", "citation_image"]));
    return out;
  }

  // authors as "Family, Given" where we can tell, else as given
  const splitName = n => { n = txt(n); if (n.includes(",")) return n; const p = n.split(" "); return p.length > 1 ? p.slice(-1)[0] + ", " + p.slice(0, -1).join(" ") : n; };
  const y = r => r.year || "";

  function toRIS(r){
    const L = [];
    const ty = r.kind === "book" ? "BOOK" : r.kind === "web" ? "ELEC" : "JOUR";
    L.push(["TY", ty]);
    r.authors.forEach(a => L.push(["AU", splitName(a)]));
    if (r.title) L.push(["TI", r.title]);
    if (r.journal) L.push(["JO", r.journal]);
    if (y(r)) L.push(["PY", y(r)]);
    if (r.volume) L.push(["VL", r.volume]);
    if (r.issue) L.push(["IS", r.issue]);
    if (r.pages){ const [sp, ep] = r.pages.split("-"); if (sp) L.push(["SP", sp]); if (ep) L.push(["EP", ep]); }
    if (r.doi) L.push(["DO", r.doi]);
    if (r.url) L.push(["UR", r.url]);
    if (r.publisher) L.push(["PB", r.publisher]);
    if (r.abstract) L.push(["AB", r.abstract]);
    L.push(["ER", ""]);
    return L.map(([k, v]) => `${k}  - ${v}`).join("\r\n") + "\r\n";
  }
  function toEnw(r){   // EndNote import (.enw), tagged
    const L = [];
    L.push(["%0", r.kind === "book" ? "Book" : r.kind === "web" ? "Web Page" : "Journal Article"]);
    r.authors.forEach(a => L.push(["%A", splitName(a)]));
    if (r.title) L.push(["%T", r.title]);
    if (r.journal) L.push(["%J", r.journal]);
    if (y(r)) L.push(["%D", y(r)]);
    if (r.volume) L.push(["%V", r.volume]);
    if (r.issue) L.push(["%N", r.issue]);
    if (r.pages) L.push(["%P", r.pages]);
    if (r.doi) L.push(["%R", r.doi]);
    if (r.url) L.push(["%U", r.url]);
    if (r.publisher) L.push(["%I", r.publisher]);
    if (r.abstract) L.push(["%X", r.abstract]);
    return L.map(([k, v]) => `${k} ${v}`).join("\r\n") + "\r\n";
  }
  function bibKey(r){
    const fam = (r.authors[0] || "anon").replace(/,.*/, "").split(" ").slice(-1)[0].replace(/[^A-Za-z]/g, "") || "anon";
    const w = (r.title.match(/[A-Za-z]{4,}/) || ["ref"])[0].toLowerCase();
    return (fam + (y(r) || "") + w).toLowerCase();
  }
  function bibEsc(s){ return String(s).replace(/[{}]/g, ""); }
  function toBibTeX(r){
    const type = r.kind === "book" ? "book" : r.kind === "web" ? "misc" : "article";
    const f = [];
    if (r.authors.length) f.push(["author", r.authors.map(splitName).join(" and ")]);
    if (r.title) f.push(["title", r.title]);
    if (r.journal) f.push([r.kind === "book" ? "publisher" : "journal", r.journal]);
    if (r.kind === "book" && r.publisher) f.push(["publisher", r.publisher]);
    if (y(r)) f.push(["year", y(r)]);
    if (r.volume) f.push(["volume", r.volume]);
    if (r.issue) f.push(["number", r.issue]);
    if (r.pages) f.push(["pages", r.pages.replace("-", "--")]);
    if (r.doi) f.push(["doi", r.doi]);
    if (r.url) f.push(["url", r.url]);
    return `@${type}{${bibKey(r)},\n` + f.map(([k, v]) => `  ${k} = {${bibEsc(v)}}`).join(",\n") + "\n}\n";
  }
  // a one-line human citation + the record Lab Entry's map stores
  function plain(r){
    const au = r.authors.length ? (r.authors.length > 3 ? splitName(r.authors[0]) + " et al." : r.authors.map(splitName).join("; ")) : "";
    return [au, y(r) ? "(" + y(r) + ")" : "", r.title ? r.title + "." : "", r.journal || "", r.volume ? r.volume + (r.issue ? "(" + r.issue + ")" : "") : "", r.pages, r.doi ? "doi:" + r.doi : ""].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }
  function toSource(r){
    return { kind: r.kind, title: r.title || "(untitled)", authors: r.authors.length ? (r.authors.length > 4 ? splitName(r.authors[0]).replace(/,.*/, "") + " et al." : r.authors.map(a => splitName(a).replace(/,.*/, "")).join(", ")) : "", year: y(r), url: r.doi ? "https://doi.org/" + r.doi : r.url, cite: plain(r), fig: /^https?:\/\//.test(r.fig || "") ? "" : "" };
  }
  const slug = r => (r.authors[0] ? r.authors[0].replace(/,.*/, "").split(" ").slice(-1)[0] : (r.title || "citation").slice(0, 20)).replace(/[^A-Za-z0-9]/g, "_") + (y(r) ? "_" + y(r) : "");

  root.LPCite = { extract, toRIS, toEnw, toBibTeX, plain, toSource, slug };
})(typeof window !== "undefined" ? window : this);
