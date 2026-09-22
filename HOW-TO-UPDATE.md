# How to update Lab Potato

The site lives at **https://bdongmin10.github.io/**. After any push, GitHub
rebuilds it automatically — usually live within a minute. There is no build
step, no npm, no deploy command.

Everything you normally touch is in **one file: `assets/tools.js`**.

### Repo layout

```
index.html              the homepage
assets/tools.js         <- the only file you normally edit
assets/app.js           rendering + interactions
assets/styles.css       all styling
.nojekyll               tells GitHub Pages to serve files as-is (do not delete)
tools/<tool-slug>/      one folder per tool, all lowercase-with-hyphens
```

**Do not delete `.nojekyll`.** Without it GitHub Pages pushes everything through
Jekyll, which can silently skip or mangle files.

---

## 1. Adding a new version of an existing tool

Say you just finished v6 of the Gel Labeler.

1. Put the file in that tool's existing folder, following the naming pattern:
   `tools/gel-labeler/gel-labeler-v6.html`
2. Open `assets/tools.js` and find the Gel Labeler block.
3. Add one line at the **end** of its `versions` list:

```js
versions: [
  { v: "v1", file: "gel-labeler-v1.html" },
  { v: "v2", file: "gel-labeler-v2.html" },
  { v: "v3", file: "gel-labeler-v3.html" },
  { v: "v4", file: "gel-labeler-v4.html" },
  { v: "v5", file: "gel-labeler-v5.html" },
  { v: "v6", file: "gel-labeler-v6.html" }   // <-- new, goes last
]
```

4. Commit and push.

**The last entry in the list is always treated as the latest.** It becomes the
big "Launch module" button; everything before it moves into the "legacy
releases" expander. You don't need to touch `index.html`.

---

## 2. Adding a brand new tool

Say you built a dilution calculator.

1. **Create a folder** under `tools/`, lowercase with hyphens:
   `tools/dilution-calculator/`
2. **Put your HTML file inside it:** `tools/dilution-calculator/dilution-calculator-v1.html`

   > **Never use spaces** in folder or file names. Spaces become `%20` in URLs,
   > which chat apps, email clients and some hosts mangle. Everything here is
   > lowercase-with-hyphens for exactly that reason.
3. **Open `assets/tools.js`** and add a new block (there's a ready-to-copy
   template commented out at the bottom of that file):

```js
{
  id: "dilution-calculator",
  name: "Dilution Calculator",
  tagline: "C1V1 = C2V2, minus the arithmetic",
  description: "Plan serial dilutions and working stocks, and print the worksheet.",
  icon: "calculator",
  accent: "rose",
  folder: "tools/dilution-calculator",
  versions: [
    { v: "v1", file: "dilution-calculator-v1.html" }
  ]
}
```

4. Make sure the previous block ends with a comma `,` before your new `{`.
5. Commit and push. The card and its feedback button appear automatically.

### Field reference

| Field | What it does |
|---|---|
| `id` | Internal name, lowercase-with-dashes. Must be unique. |
| `name` | Title on the card, and the tag used in feedback issues. |
| `tagline` | Short orange line under the title. Keep it to a few words. |
| `description` | One or two sentences of what it does. |
| `icon` | One of: `colony`, `gel`, `gibson`, `microscopy`, `protein`, `flask`, `dna`, `chart`, `calculator`. Unknown values fall back to `flask`. |
| `accent` | The card's colour: `emerald`, `violet`, `blue`, `cyan`, `amber`, `rose`, `indigo`. Sets the top bar, icon tint, tagline and button. Unknown values fall back to `blue`. |
| `folder` | The folder path **exactly as it appears in the repo**, e.g. `tools/dilution-calculator`. Lowercase, hyphens, no spaces. |
| `versions` | List of `{ v, file }`. Last = latest. |

---

## 3. Turning on the "Buy me a coffee" button

The button is **hidden until you give it a link**, so a dead donation link can
never ship. Nothing is wired to your bank directly — you sign up with a
donation service, they handle the payments and payouts, and you paste the link
they give you.

### Step 1 — pick a service and get your link

| Service | Sign up at | Your link looks like |
|---|---|---|
| Buy Me a Coffee | buymeacoffee.com | `https://buymeacoffee.com/yourname` |
| Ko-fi | ko-fi.com | `https://ko-fi.com/yourname` |
| PayPal | paypal.me | `https://paypal.me/yourname` |

- **Buy Me a Coffee / Ko-fi** — create an account, choose a username (that
  username becomes your link), then connect a payout method in their settings.
  Both support PayPal, and both also support Stripe if you'd rather take card
  payments directly to a bank account. You connect your bank *to them*, not to
  this website.
- **PayPal** — if you already have a PayPal account, creating a PayPal.me link
  is the fastest route. Money lands in your PayPal balance and you withdraw to
  your bank from there.

Fees and available payout countries differ between services, so check their
current terms before committing — Singapore is supported by all three, but the
details change.

### Step 2 — paste it in

Open **`assets/tools.js`** and edit the two lines at the very top:

```js
const SUPPORT_URL = "https://buymeacoffee.com/yourname";
const SUPPORT_LABEL = "Buy me a coffee";
```

Change `SUPPORT_LABEL` if you switch service (e.g. `"Support the potato"` or
`"Tip jar"`). Commit and push — the button appears in the footer next to your
email, in gold, and disappears again if you blank the URL.

**Security note:** never put bank details, card numbers or API keys in this
repo. It is a public website; everything in it is readable by anyone. A link
to a donation service is the only thing that belongs here.

---

## 4. Adding a new icon

If none of the built-in icons fit, open `index.html` and find the
`<!-- icon sprite -->` block near the top. Copy an existing `<symbol>`, give it
a new id like `icon-pipette`, paste in your SVG paths, then add `"pipette"` to
the `known` list at the top of `assets/app.js`. Then use `icon: "pipette"` in
`tools.js`.

---

## 5. Uploading files without using git

If you'd rather not use the command line:

1. Go to https://github.com/bdongmin10/bdongmin10.github.io
2. **Add a file → Upload files**, then drag your HTML in. To put it in a new
   folder, click **Add file → Create new file** and type
   `tools/dilution-calculator/dilution-calculator-v1.html` as the name — typing
   each `/` creates a folder.
3. To edit `assets/tools.js`, click the file, then the pencil icon.
4. Scroll down, write a short commit message, and hit **Commit changes**.

---

## 6. Reading feedback

Every "Leave feedback" button opens a pre-filled GitHub issue tagged with the
tool name, using the template in `.github/ISSUE_TEMPLATE/feedback.md`.
All incoming feedback shows up at:

https://github.com/bdongmin10/bdongmin10.github.io/issues

Each issue has its own comment thread, so you can reply, ask for a screenshot,
and close it when fixed.

### Gibson design-log contributions

The Gibson Assembly Designer has its own **Contribute** card (Assemblies tab)
that lets users send you their design log as ML training data. Two routes, both
manual and both requiring an explicit click:

- **Email** — writes `gibson_contribution_<name>.json` to their machine, then
  opens a draft addressed to `bdongmin10@gmail.com` for them to attach it to.
  Best for large logs. The files arrive in your inbox ready to download.
- **GitHub** — copies the log (comment + JSON in a collapsed `<details>` block)
  and opens a pre-titled issue for them to paste into. Best for small logs and
  plain comments; everything stays browsable in the Issues tab.

Both payloads carry the free-text comment inside the JSON, so a remark stays
attached to the data it refers to. Raw sequences are only included if the user
ticked **"Include raw sequences in exports"** — otherwise it's derived features
only (Tm, GC, lengths, flags), which is what the tool defaults to.

To change the address or target repo, edit `DEV_EMAIL` / `DEV_ISSUE` near the
top of the contribute block in `tools/gibson-assembly/gibson-assembly-v8.html`.

---

## 7. If something breaks

- **Card disappeared / page looks empty** → almost always a typo in
  `assets/tools.js` (a missing comma or quote). Open the site, press F12, and
  check the Console tab; it will name the line.
- **"Launch module" gives a 404** → the `folder` or `file` in `tools.js`
  doesn't match the real name on disk. Capitalisation matters, and there must
  be no spaces.
- **Changes not showing** → give it a minute, then hard-refresh
  (Ctrl+Shift+R / Cmd+Shift+R).
