// Instagram comment replies.
//
// When someone comments a keyword (for example GEL) on one of the account's posts, this sends them
// the matching link by direct message, using Instagram's own "private reply", and then answers the
// comment in public. That public answer is also how the script remembers a comment is done: nothing
// is stored anywhere, and nothing about a commenter is written to this repository or to the logs.
//
// It is run on a schedule by .github/workflows/instagram-replies.yml. Keywords and wording live in
// .github/instagram-keywords.json. No server and no paid service are involved.
//
//   node .github/scripts/instagram-replies.mjs            answer new keyword comments
//   node .github/scripts/instagram-replies.mjs refresh    renew the access token (see the workflow)
//
// Environment: IG_ACCESS_TOKEN (required), DRY_RUN=true (look, send nothing), IG_API_BASE (tests).

import fs from "node:fs";

const API = (process.env.IG_API_BASE || "https://graph.instagram.com/v27.0").replace(/\/$/, "");
const TOKEN = (process.env.IG_ACCESS_TOKEN || "").trim();
const DRY_RUN = /^(1|true|yes|on)$/i.test(process.env.DRY_RUN || "");

// Instagram lets a private reply be sent for 7 days after the comment. Stop a little short of that.
const REPLY_WINDOW_MS = 6.5 * 24 * 60 * 60 * 1000;
// Meta's error codes: these mean "slow down" and "the token is no good".
const RATE_LIMIT_CODES = new Set([4, 17, 32, 613, 80002, 80006]);
const AUTH_CODES = new Set([102, 190]);

class ApiError extends Error {
  constructor(status, body) {
    const e = (body && body.error) || {};
    super(e.message || `HTTP ${status}`);
    this.status = status;
    this.code = e.code;
    this.subcode = e.error_subcode;
  }
  get rateLimited() { return this.status === 429 || RATE_LIMIT_CODES.has(this.code); }
  get badToken() { return this.status === 401 || AUTH_CODES.has(this.code); }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, path, { query, body, base = API } = {}) {
  const url = new URL(base + path);
  for (const [k, v] of Object.entries(query || {})) url.searchParams.set(k, String(v));
  for (let attempt = 1; ; attempt++) {
    let res, json;
    try {
      res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${TOKEN}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      json = await res.json().catch(() => ({}));
    } catch (err) {
      if (attempt >= 3) throw new Error(`Could not reach Instagram: ${err.message}`);
      await sleep(1500 * attempt);
      continue;
    }
    if (res.ok && !json.error) return json;
    if (res.status >= 500 && attempt < 3) { await sleep(1500 * attempt); continue; }
    throw new ApiError(res.status, json);
  }
}

// Read a whole list, a page at a time, up to `max` items.
async function list(path, query, max) {
  const out = [];
  let after;
  while (out.length < max) {
    const page = await call("GET", path, { query: { ...query, ...(after ? { after } : {}) } });
    out.push(...(page.data || []));
    after = page.paging && page.paging.cursors && page.paging.cursors.after;
    if (!after || !(page.data || []).length || !(page.paging && page.paging.next)) break;
  }
  return out.slice(0, max);
}

function loadConfig() {
  const file = new URL("../instagram-keywords.json", import.meta.url);
  const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
  const keywords = Object.entries(cfg.keywords || {})
    .filter(([word, k]) => word.trim() && k && k.url)
    .map(([word, k]) => ({
      word: word.trim(),
      // The keyword as a whole word, in any letter case: GEL matches "gel!" but not "gelato".
      pattern: new RegExp(`(?<![\\p{L}\\p{N}])${word.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "iu"),
      message: [k.text, k.url, cfg.sign_off].filter(Boolean).join("\n\n"),
    }));
  if (!keywords.length) throw new Error("No keywords with a url in .github/instagram-keywords.json");
  return {
    keywords,
    publicReply: cfg.public_reply || "Sent. Check your messages.",
    fallbackReply: cfg.fallback_reply || "Thanks! If the message did not arrive, the link is in the bio.",
    postsToWatch: Math.max(1, Number(cfg.posts_to_watch) || 20),
    maxPerRun: Math.max(1, Number(cfg.max_messages_per_run) || 200),
  };
}

async function answerComments() {
  const cfg = loadConfig();
  const me = await call("GET", "/me", { query: { fields: "user_id,username" } });
  const myName = String(me.username || "").toLowerCase();
  const mine = (c) => {
    if (!c) return false;
    const name = String(c.username || (c.from && c.from.username) || "").toLowerCase();
    return (name !== "" && name === myName) || Boolean(c.from && me.user_id && String(c.from.id) === String(me.user_id));
  };

  const stats = { posts: 0, comments: 0, matched: 0, sent: 0, fallback: 0, already: 0, tooOld: 0, waiting: 0 };
  const posts = await list("/me/media", { fields: "id,comments_count", limit: 25 }, cfg.postsToWatch);
  let stop = false;

  for (const post of posts) {
    if (stop) break;
    stats.posts++;
    if (!post.comments_count) continue;
    const comments = await list(`/${post.id}/comments`,
      { fields: "id,text,timestamp,username,from,replies{username,from}", limit: 50 }, 2000);

    for (const c of comments) {
      stats.comments++;
      if (mine(c)) continue;
      const kw = cfg.keywords.find((k) => k.pattern.test(c.text || ""));
      if (!kw) continue;
      stats.matched++;
      if (((c.replies && c.replies.data) || []).some(mine)) { stats.already++; continue; }
      if (Date.now() - Date.parse(c.timestamp) > REPLY_WINDOW_MS) { stats.tooOld++; continue; }
      if (DRY_RUN || stats.sent + stats.fallback >= cfg.maxPerRun) { stats.waiting++; continue; }

      let delivered = true;
      try {
        await call("POST", `/${me.user_id || "me"}/messages`,
          { body: { recipient: { comment_id: c.id }, message: { text: kw.message } } });
      } catch (err) {
        if (!(err instanceof ApiError) || err.badToken) throw err;
        if (err.rateLimited) { stats.waiting++; stop = true; break; }
        // Instagram would not deliver it (the person does not accept messages, or one was already
        // sent for this comment). Answer in public instead, so the comment is not tried again.
        delivered = false;
        console.log(`  A message could not be delivered (Instagram code ${err.code ?? err.status}).`);
      }
      try {
        await call("POST", `/${c.id}/replies`, { body: { message: delivered ? cfg.publicReply : cfg.fallbackReply } });
      } catch (err) {
        if (!(err instanceof ApiError) || err.badToken) throw err;
        if (err.rateLimited) { stop = true; }
        console.log(`  A public answer could not be posted (Instagram code ${err.code ?? err.status}).`);
      }
      if (delivered) stats.sent++; else stats.fallback++;
      await sleep(400);
    }
  }

  const lines = [
    `${DRY_RUN ? "Dry run: nothing was sent." : "Done."}`,
    `Posts looked at: ${stats.posts}. Comments read: ${stats.comments}. With a keyword: ${stats.matched}.`,
    `Messages sent: ${stats.sent}. Answered in public only: ${stats.fallback}. Already answered: ${stats.already}.`,
    `Older than the 7-day limit: ${stats.tooOld}. ${DRY_RUN ? "Would be answered" : "Left for the next run"}: ${stats.waiting}.`,
  ];
  console.log(lines.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n\n") + "\n");
  return stats;
}

// Long-lived tokens last 60 days. Renewing gives one that lasts 60 days from now. The new token is
// written to the file named by TOKEN_OUT (never printed), for the workflow to save as the secret.
async function refreshToken() {
  const root = API.replace(/\/v\d+\.\d+$/, "");
  const r = await call("GET", "/refresh_access_token", { base: root, query: { grant_type: "ig_refresh_token", access_token: TOKEN } });
  if (!r.access_token) throw new Error("Instagram did not return a token.");
  const days = Math.floor((r.expires_in || 0) / 86400);
  if (process.env.TOKEN_OUT) fs.writeFileSync(process.env.TOKEN_OUT, r.access_token, { mode: 0o600 });
  console.log(`Token renewed. It now lasts about ${days} days.`);
}

async function main() {
  if (!TOKEN) {
    console.log("Not set up yet: the IG_ACCESS_TOKEN secret is missing. Steps are at the top of .github/workflows/instagram-replies.yml");
    return;
  }
  try {
    if (process.argv[2] === "refresh") await refreshToken(); else await answerComments();
  } catch (err) {
    if (err instanceof ApiError && err.badToken) {
      console.error("::error::Instagram rejected the access token. It has probably expired (they last 60 days). "
        + "Make a new one in the Meta app dashboard and save it as the IG_ACCESS_TOKEN secret.");
    } else if (err instanceof ApiError) {
      console.error(`::error::Instagram answered with an error (code ${err.code ?? err.status}): ${err.message}`);
    } else {
      console.error(`::error::${err.message}`);
    }
    process.exitCode = 1;
  }
}

await main();
