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


RETRY_WAITS = [5, 15, 30, 60]   # seconds to wait before trying a flaky request again
WINDOW_DAYS = 100               # the page-by-page numbers are asked for in pieces this long


def api(path, **query):
    """GET one API endpoint. Waits and retries on the 4-requests-a-second limit, and on the
    errors GoatCounter gives now and then for a request that works a moment later
    (a 404 'not found' on a stats call, a 5xx, a dropped connection)."""
    url = f"{SITE}/api/v0/{path}?{urllib.parse.urlencode(query)}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"})
    flaky = 0
    for attempt in range(12):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                time.sleep(0.3)
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(float(e.headers.get("X-Rate-Limit-Reset", "2")) + 0.5)
                continue
            if (e.code == 404 or e.code >= 500) and flaky < len(RETRY_WAITS):
                print(f"GoatCounter {path}: HTTP {e.code}, trying again in {RETRY_WAITS[flaky]} s", flush=True)
                time.sleep(RETRY_WAITS[flaky]); flaky += 1
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
            print(f"GoatCounter {path}: HTTP {e.code} {body}\n  asked: {url}")
            probe()
            sys.exit(1)
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:   # network hiccup, not an answer
            if flaky < len(RETRY_WAITS):
                print(f"GoatCounter {path}: {e}, trying again in {RETRY_WAITS[flaky]} s", flush=True)
                time.sleep(RETRY_WAITS[flaky]); flaky += 1
                continue
            sys.exit(f"GoatCounter {path}: {e}")
    sys.exit(f"GoatCounter {path}: still rate-limited after retries")


def probe():
    """After an unexpected error: which parts of the API answer, to see where it goes wrong (no key is printed)."""
    print("Checking other GoatCounter API calls:")
    for p in ["me", "sites", "paths?limit=3", "stats/total", "stats/hits?limit=3", "stats/hits?limit=3&group=day", "stats/locations?limit=3"]:
        req = urllib.request.Request(f"{SITE}/api/v0/{p}", headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                print(f"  {p}: {r.status} {r.read(160).decode('utf-8', 'replace')!r}")
        except urllib.error.HTTPError as e:
            print(f"  {p}: {e.code} {e.read(200).decode('utf-8', 'replace')!r}")
        except Exception as e:  # network
            print(f"  {p}: {e}")
        time.sleep(0.4)


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

    # visits per page per day, a window of WINDOW_DAYS at a time (a lighter question than all 400 days at once),
    # each window paged 100 pages at a time
    paths = {}
    for w0 in range(0, DAYS, WINDOW_DAYS):
        ws = start + timedelta(days=w0)
        we = min(end, (start + timedelta(days=min(DAYS, w0 + WINDOW_DAYS))).replace(hour=0, minute=0, second=0) - timedelta(seconds=1))
        exclude = []
        while True:
            q = {"start": stamp(ws), "end": stamp(we), "group": "day", "limit": 100}
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
