// Instagram comment replies.
//
// When someone comments on one of the account's posts, this sends them a link by direct message,
// using Instagram's own "private reply", and then answers the comment in public. Which message goes
// out is decided in two ways, both set in .github/instagram-keywords.json:
//   - per post: a post listed under "posts" has its own message, sent to everyone who comments on
//     it, or only to comments containing that post's keyword if it has one;
//   - per keyword: a comment containing a word under "keywords" (for example GEL), on a post that
//     asks for it: its caption, or one of the account's own comments on it, says "Comment GEL".
//     (Set "keywords_only_where_asked" to false to let keywords work on every post.)
// Each person gets one message per post, however many times they comment. The message follows the
// keyword-delivery shape: the link first with no gate, how to use it, and one easy question.
//
// The public answer is also how the script remembers a comment is done: nothing is stored anywhere,
// and nothing about a commenter is written to this repository or to the logs.
//
// It is run on a schedule by .github/workflows/instagram-replies.yml. Keywords and wording live in
// .github/instagram-keywords.json. No server and no paid service are involved.
//
//   node .github/scripts/instagram-replies.mjs            answer new keyword comments
//   node .github/scripts/instagram-replies.mjs refresh    renew the access token (see the workflow)
//
// Environment: IG_ACCESS_TOKEN (required), DRY_RUN=true (look, send nothing).
// For tests only: IG_API_BASE, IG_KEYWORDS_FILE, IG_LOGIN.
//
// Two kinds of token work. A token from Meta's "API setup with Instagram login" (it starts with
// IG) talks to graph.instagram.com. A token from "API setup with Unified login" (a business
// integration token, it starts with EAA) talks to graph.facebook.com, and the account is found
// through /me/assigned_instagram_accounts. The script tells them apart by the token itself.

import fs from "node:fs";

const TOKEN = (process.env.IG_ACCESS_TOKEN || "").trim();
const UNIFIED = process.env.IG_LOGIN ? process.env.IG_LOGIN === "unified" : /^EAA/.test(TOKEN);
const API = (process.env.IG_API_BASE || (UNIFIED ? "https://graph.facebook.com/v27.0" : "https://graph.instagram.com/v27.0")).replace(/\/$/, "");
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

// GEL as a whole word, in any letter case: it matches "gel!" but not "gelato".
// "Comment GEL", "comment gel", "Comment the word GEL", 'Comment "GEL"': the post asks for that keyword.
const askPattern = (word) =>
  new RegExp(`(?<![\\p{L}\\p{N}])comment(?:\\s+the\\s+word)?[\\s:]*["'“‘«]?${word.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "iu");
const wordPattern = (word) =>
  new RegExp(`(?<![\\p{L}\\p{N}])${word.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "iu");

// A post is named in the settings by its link (or just the code in the link). Both
// https://www.instagram.com/p/DfXyz123/ and https://www.instagram.com/reel/DfXyz123/ give "DfXyz123".
function postCode(linkOrCode) {
  const text = String(linkOrCode || "").trim();
  const m = text.match(/instagram\.com\/(?:[^/?#]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]+$/.test(text) ? text : "";
}

function loadConfig() {
  const file = process.env.IG_KEYWORDS_FILE || new URL("../instagram-keywords.json", import.meta.url);
  const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
  const usable = (k) => k && typeof k === "object" && k.url;
  // The keyword delivery: the link first, no gate, one line on how to use it, one easy question.
  //   {name}, here it is: {url}
  //   {how}
  //   {question}
  //   {sign_off}
  // "text" is still accepted in place of "how", for settings written before this layout.
  const message = (k) => (name) => [
    name ? `${name}, here it is: ${k.url}` : `Here it is: ${k.url}`,
    k.how || k.text,
    k.question,
    cfg.sign_off,
  ].filter(Boolean).join("\n\n");
  const list = (many, one, fallback) => (Array.isArray(many) && many.filter(Boolean).length ? many.filter(Boolean) : [one || fallback]);

  const keywords = Object.entries(cfg.keywords || {})
    .filter(([word, k]) => word.trim() && usable(k))
    .map(([word, k]) => ({ word: word.trim(), pattern: wordPattern(word), ask: askPattern(word), message: message(k) }));

  const posts = new Map();
  for (const [link, k] of Object.entries(cfg.posts || {})) {
    const code = postCode(link);
    if (!code || !usable(k)) continue;
    posts.set(code, {
      pattern: k.keyword && String(k.keyword).trim() ? wordPattern(String(k.keyword)) : null,   // none: every comment
      message: message(k),
    });
  }
  if (!keywords.length && !posts.size) throw new Error("Nothing to send: .github/instagram-keywords.json has no keyword or post with a url");
  return {
    keywords,
    posts,
    // Several wordings for the public answer, so the thread is not one sentence pasted over and over.
    publicReplies: list(cfg.public_replies, cfg.public_reply, "Sent. Check your messages."),
    fallbackReplies: list(cfg.fallback_replies, cfg.fallback_reply, "Thanks! If the message did not arrive, the link is in the bio."),
    onlyWhereAsked: cfg.keywords_only_where_asked !== false,
    postsToWatch: Math.max(1, Number(cfg.posts_to_watch) || 20),
    maxPerRun: Math.max(1, Number(cfg.max_messages_per_run) || 200),
  };
}

// The name to greet someone by: their username, which is all a comment gives. It goes only into
// the message to that person, never into a log.
const firstName = (c) => String(c.username || (c.from && c.from.username) || "").trim();

// The same comment always gets the same wording, so a re-run cannot change what was said.
function pickFor(id, options) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return options[h % options.length];
}

// The Instagram account the token speaks for: its ID (used to send messages) and its username.
async function whoAmI() {
  if (!UNIFIED) return call("GET", "/me", { query: { fields: "user_id,username" } });
  const accounts = await list("/me/assigned_instagram_accounts", { fields: "id,username" }, 25);
  if (!accounts.length) throw new Error("The token works, but no Instagram account was shared with the app. Generate the token again and pick the Instagram account.");
  const want = String(process.env.IG_USERNAME || "").toLowerCase();
  const a = accounts.find((x) => String(x.username || "").toLowerCase() === want) || accounts[0];
  return { user_id: a.id, username: a.username };
}

async function answerComments() {
  const cfg = loadConfig();
  const me = await whoAmI();
  const myName = String(me.username || "").toLowerCase();
  const mine = (c) => {
    if (!c) return false;
    const name = String(c.username || (c.from && c.from.username) || "").toLowerCase();
    return (name !== "" && name === myName) || Boolean(c.from && me.user_id && String(c.from.id) === String(me.user_id));
  };

  const who = (c) => String(c.username || (c.from && (c.from.username || c.from.id)) || "").toLowerCase();
  const answered = (c) => ((c.replies && c.replies.data) || []).some(mine);

  const stats = { posts: 0, comments: 0, matched: 0, sent: 0, fallback: 0, already: 0, repeat: 0, tooOld: 0, waiting: 0, notAsked: 0 };
  const posts = await list(UNIFIED ? `/${me.user_id}/media` : "/me/media", { fields: "id,comments_count,shortcode,permalink,caption", limit: 25 }, cfg.postsToWatch);
  let stop = false;

  for (const post of posts) {
    if (stop) break;
    stats.posts++;
    if (!post.comments_count) continue;
    const comments = await list(`/${post.id}/comments`,
      { fields: "id,text,timestamp,username,from,replies{username,from}", limit: 50 }, 2000);

    // This post's own message, if it has one, else the keywords this post asks for: the caption or
    // one of the account's own comments (a pinned comment, say) has to say "Comment GEL".
    const own = cfg.posts.get(post.shortcode || postCode(post.permalink));
    const asks = [post.caption || "", ...comments.filter(mine).map((c) => c.text || "")].join("\n");
    const active = cfg.onlyWhereAsked ? cfg.keywords.filter((k) => k.ask.test(asks)) : cfg.keywords;
    const pick = (text) => (own && (!own.pattern || own.pattern.test(text)) ? own : active.find((k) => k.pattern.test(text)));
    // People already answered on this post: they are not messaged again for a second comment.
    const served = new Set(comments.filter((c) => !mine(c) && answered(c)).map(who).filter(Boolean));

    for (const c of comments) {
      stats.comments++;
      if (mine(c)) continue;
      const kw = pick(c.text || "");
      if (!kw) { if (cfg.keywords.some((k) => k.pattern.test(c.text || ""))) stats.notAsked++; continue; }
      stats.matched++;
      if (answered(c)) { stats.already++; continue; }
      if (who(c) && served.has(who(c))) { stats.repeat++; continue; }
      if (Date.now() - Date.parse(c.timestamp) > REPLY_WINDOW_MS) { stats.tooOld++; continue; }
      if (DRY_RUN || stats.sent + stats.fallback >= cfg.maxPerRun) { stats.waiting++; if (who(c)) served.add(who(c)); continue; }
      if (who(c)) served.add(who(c));

      let delivered = true;
      try {
        await call("POST", `/${me.user_id || "me"}/messages`,
          { body: { recipient: { comment_id: c.id }, message: { text: kw.message(firstName(c)) } } });
      } catch (err) {
        if (!(err instanceof ApiError) || err.badToken) throw err;
        if (err.rateLimited) { stats.waiting++; stop = true; break; }
        // Instagram would not deliver it (the person does not accept messages, or one was already
        // sent for this comment). Answer in public instead, so the comment is not tried again.
        delivered = false;
        console.log(`  A message could not be delivered (Instagram code ${err.code ?? err.status}).`);
      }
      try {
        await call("POST", `/${c.id}/replies`, { body: { message: pickFor(c.id, delivered ? cfg.publicReplies : cfg.fallbackReplies) } });
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
    `Posts looked at: ${stats.posts}. Comments read: ${stats.comments}. To be answered: ${stats.matched}.`,
    `Messages sent: ${stats.sent}. Answered in public only: ${stats.fallback}. Already answered: ${stats.already}. Same person again: ${stats.repeat}.`,
    `Older than the 7-day limit: ${stats.tooOld}. ${DRY_RUN ? "Would be answered" : "Left for the next run"}: ${stats.waiting}.`,
    `Keyword on a post that does not ask for it (left alone): ${stats.notAsked}.`,
  ];
  console.log(lines.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n\n") + "\n");
  return stats;
}

// Long-lived tokens last 60 days. Renewing gives one that lasts 60 days from now. The new token is
// written to the file named by TOKEN_OUT (never printed), for the workflow to save as the secret.
async function refreshToken() {
  if (UNIFIED) {
    console.log("This token comes from Unified login, which Meta does not renew this way. "
      + "Its expiry is shown in the app dashboard (API setup with Unified login > the configuration). Nothing to do here.");
    return;
  }
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
