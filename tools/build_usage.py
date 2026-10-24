#!/usr/bin/env python3
"""Build assets/usage.json for the homepage usage section.

Runs once a day in GitHub Actions (.github/workflows/usage.yml). It reads the
site's statistics from the GoatCounter API with a read-only key, kept as the
repository secret GOATCOUNTER_TOKEN, and writes one small JSON file that the
homepage reads from this site (so ad blockers and rate limits do not matter).

What goes in the file (no personal data: GoatCounter stores none):
  days          the last 400 days, oldest first (UTC)
  paths         visits per day for every page, e.g. "/tools/gel-labeler"
  stats         visitors per country and per referring site (search, social,
                other sites, direct) for the last 7 days, 30 days, 365 days and all time

Run by hand:  GOATCOUNTER_TOKEN=... python3 tools/build_usage.py
Standard library only.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

SITE = os.environ.get("GOATCOUNTER_SITE", "https://labpotato.goatcounter.com")
# the key as pasted into the secret: spaces, line breaks or a leading "Bearer" are ignored
TOKEN = os.environ.get("GOATCOUNTER_TOKEN", "").strip().removeprefix("Bearer ").strip()
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "usage.json")
DAYS = 400
PAGES = ["locations", "toprefs"]   # countries and referring sites; GoatCounter can also give browsers, systems, sizes, languages


def api(path, **query):
    """GET one API endpoint; waits and retries on the 4-requests-a-second limit."""
    url = f"{SITE}/api/v0/{path}?{urllib.parse.urlencode(query)}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                time.sleep(0.3)
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(float(e.headers.get("X-Rate-Limit-Reset", "2")) + 0.5)
                continue
            body = e.read().decode("utf-8", "replace")[:300]
            if e.code == 401:
                sys.exit(f"GoatCounter {path}: HTTP 401 {body}\n"
                         f"The key in GOATCOUNTER_TOKEN ({len(TOKEN)} characters long) is not a key of {SITE}.\n"
                         "In GoatCounter open Settings → API, click 'show' in the Token column and copy that long text "
                         "(not the key's name), then paste it into the GitHub secret again.")
            if e.code == 403:
                sys.exit(f"GoatCounter {path}: HTTP 403 {body}\n"
                         "The key exists but may not read statistics or this site: make a new key with 'Read statistics' ticked.")
            sys.exit(f"GoatCounter {path}: HTTP {e.code} {body}")
    sys.exit(f"GoatCounter {path}: still rate-limited after retries")


def stamp(d):
    return d.strftime("%Y-%m-%dT%H:%M:%SZ")


def main():
    if not TOKEN:
        sys.exit("Set GOATCOUNTER_TOKEN (GoatCounter → API → new key with 'Read statistics').")
    now = datetime.now(timezone.utc)
    end = now.replace(hour=23, minute=59, second=59, microsecond=0)
    start = (end - timedelta(days=DAYS - 1)).replace(hour=0, minute=0, second=0)
    days = [(start + timedelta(days=k)).strftime("%Y-%m-%d") for k in range(DAYS)]
    index = {d: k for k, d in enumerate(days)}

    # visits per page per day, all pages in one go (paged 100 at a time)
    paths, exclude = {}, []
    while True:
        q = {"start": stamp(start), "end": stamp(end), "group": "day", "limit": 100}
        if exclude:
            q["exclude_paths"] = ",".join(exclude)
        res = api("stats/hits", **q)
        for h in res.get("hits", []):
            if h.get("event"):
                continue
            row = paths.setdefault(h["path"], [0] * DAYS)
            for s in h.get("stats", []):
                k = index.get(s.get("day"))
                if k is not None:
                    row[k] += int(s.get("daily", 0))
            exclude.append(str(h["path_id"]))
        if not res.get("more"):
            break

    # where visitors are and how they found the site, for each range
    ranges = {"week": 7, "month": 30, "year": 365, "all": None}
    stats = {}
    for name, n in ranges.items():
        s = (end - timedelta(days=n - 1)).replace(hour=0, minute=0, second=0) if n else datetime(2020, 1, 1, tzinfo=timezone.utc)
        stats[name] = {}
        for page in PAGES:
            res = api(f"stats/{page}", start=stamp(s), end=stamp(end), limit=100)
            stats[name][page] = [{"id": x.get("id", ""), "name": x.get("name", ""), "count": x.get("count", 0),
                                  **({"scheme": x["ref_scheme"]} if x.get("ref_scheme") else {})}
                                 for x in res.get("stats", []) if x.get("count")]

    data = {"generated": now.strftime("%Y-%m-%dT%H:%M:%SZ"), "days": days, "paths": paths, "stats": stats}
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"))
    print(f"wrote {OUT}: {len(paths)} pages, {sum(map(sum, paths.values()))} visits in {DAYS} days")


if __name__ == "__main__":
    main()
