/* cite.html controller: pull the active tab's citation, let the user tidy it,
   then download RIS/.enw/BibTeX or send it to Lab Entry's research map. */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const LAB_ENTRY = "https://labpotato.github.io/tools/lab-entry/lab-entry-v13.html";
  const qs = new URLSearchParams(location.search);
  const tabId = +qs.get("tab") || null;
  let rec = null;
  const status = (m, cls) => { const s = $("#status"); s.textContent = m; s.className = "note" + (cls ? " " + cls : ""); };
  const b64url = obj => { const b = btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); return b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
  const dl = (name, text, mime) => { const blob = new Blob([text], { type: mime || "text/plain" }), u = URL.createObjectURL(blob), a = document.createElement("a"); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); };

  // metadata extraction runs inside the target page; cite.js is injected there and returns the record
  async function readTab(){
    if (!tabId){ status("No page to read.", "err"); return null; }
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["cite.js"] });
      const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func: () => window.LPCite.extract(document, location.href) });
      return result;
    } catch (e){ status("This page would not let the extension read it (a browser or store page, perhaps). You can still type the details in.", "err");
      try { const t = (await chrome.tabs.get(tabId)); return { kind: "web", title: t.title || "", authors: [], year: "", url: t.url || "", journal: "", doi: "", pages: "", volume: "", issue: "", publisher: "", abstract: "", fig: "" }; } catch (x){ return null; } }
  }
  function fromInputs(base){
    const r = Object.assign({}, base);
    r.title = $("#e-title").value.trim();
    r.authors = $("#e-auth").value.split(/[;,]/).map(s => s.trim()).filter(Boolean);
    r.year = $("#e-year").value.trim();
    const u = $("#e-url").value.trim();
    if (/^10\.\S+/.test(u)) r.doi = u; else if (/^https?:/.test(u)){ r.url = u; } else if (u) r.doi = u.replace(/^doi:/i, "");
    return r;
  }
  function paint(r){
    rec = r;
    $("#card").innerHTML = `<span class="kind">${({ paper: "Paper", book: "Book", web: "Web page" })[r.kind] || "Source"}</span>
      <div class="ttl">${r.title ? r.title.replace(/[<>&]/g, "") : "(no title found)"}</div>
      <div class="meta">${[r.authors.slice(0, 5).join(", "), r.year, r.journal].filter(Boolean).join(" · ")}</div>
      <div class="cite">${window.LPCite.plain(r) || "No citation details found — type them below."}</div>`;
    $("#e-title").value = r.title || "";
    $("#e-auth").value = r.authors.join("; ");
    $("#e-year").value = r.year || "";
    $("#e-url").value = r.doi || r.url || "";
    $("#editwrap").hidden = false; $("#dls").hidden = false;
    status(r.title ? "" : "No citation metadata on this page; fill in what you can.", r.title ? "" : "err");
  }

  document.addEventListener("click", async e => {
    const b = e.target.closest("[data-dl]"); if (b){ const r = fromInputs(rec), s = window.LPCite.slug(r);
      if (b.dataset.dl === "ris") dl(s + ".ris", window.LPCite.toRIS(r), "application/x-research-info-systems");
      else if (b.dataset.dl === "enw") dl(s + ".enw", window.LPCite.toEnw(r), "application/x-endnote-refer");
      else if (b.dataset.dl === "bib") dl(s + ".bib", window.LPCite.toBibTeX(r), "application/x-bibtex");
      else if (b.dataset.dl === "copy"){ navigator.clipboard.writeText(window.LPCite.plain(r)).then(() => status("Citation copied.", "ok")); }
      return; }
    if (e.target.id === "send"){
      const r = fromInputs(rec); if (!r.title){ status("Add a title first.", "err"); return; }
      const src = window.LPCite.toSource(r);
      // hand it to Lab Entry via a URL param its research map reads on load (cross-tab safe)
      const url = LAB_ENTRY + "?lpsource=" + b64url(src) + "#map";
      try { chrome.tabs.create({ url }); status("Opening Lab Entry — it will land in your research map sources.", "ok"); }
      catch (x){ window.open(url, "_blank"); }
    }
  });

  (async () => { const r = await readTab(); if (r) paint(r); })();
})();
