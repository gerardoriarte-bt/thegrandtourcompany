# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The Grand Tour Company marketing site. It is **not** a conventional web project: there is no
`package.json`, no build step, no test suite, and no framework. The pages are Claude Design
artboards (`.dc.html`) rendered in the browser by a generated runtime (`support.js`).

Deployed on Vercel at https://thegrandtourcompany.vercel.app, auto-deploying on every push to
`main` (a push goes live in roughly 30 seconds).

## Running locally

```sh
node dev-server.mjs          # http://localhost:3000
PORT=4000 node dev-server.mjs
```

`dev-server.mjs` reads `vercel.json` and applies the same redirects, rewrites and headers, and
executes the `api/` function with a minimal `req`/`res` shim (the handler is re-required per
request, so edits take effect on reload). No dependencies and no Vercel login. It is excluded from
deployment via `.vercelignore`.

`vercel dev` also works and is the reference implementation, but requires a Vercel login.

Do **not** reach for a plain static server (`python3 -m http.server`): it serves the files but
cannot resolve `/` or any clean URL, since those exist only as `vercel.json` rewrites.

To exercise the dispatch endpoint end to end, pass the env vars listed under *Pending* below:

```sh
RESEND_API_KEY=re_xxx DISPATCH_TO=you@example.com DISPATCH_FROM=dispatch@yourdomain \
  node dev-server.mjs
```

## The dc runtime model

Every page has the same three-part shape, and you need all three to understand how a page works:

1. A **real `<head>`** — SEO tags, the vendor override script, then `<script src="./support.js">`.
2. An **`<x-dc>` template** — the markup, using a mustache-style template language.
3. A **`<script data-dc-script>`** — `class Component extends DCLogic`, whose `render()` returns a
   plain data object that the template binds to by key.

Template vocabulary: `{{ expr }}`, `<sc-for list="{{ items }}" as="x">`, `<sc-if>`.
`hint-placeholder-count` is a hint for the design canvas only and has no runtime effect.

`<helmet>` inside `<x-dc>` holds title and meta tags — but those only exist **after** JS runs, so a
crawler without JS sees nothing. That is why the SEO tags are duplicated in the real `<head>`. If
you add a page, duplicate them there too; editing `<helmet>` alone is not enough.

`data-props` on the script tag is a JSON manifest of editor-adjustable props (accent colors, map
settings), read at runtime via `this.props`. It is what the design canvas exposes as controls.

### support.js is generated — never edit it

Its header names the build (`cd dc-runtime && bun run build`), and that source is not in this repo.
To change runtime behaviour, use the hooks it already provides rather than patching the file.

### Self-hosted vendor bundles

`support.js` checks `window.__resources[cdnUrl]` before falling back to unpkg. Each page sets that
map in an inline script that **must run before `support.js` loads**. This is how React and ReactDOM
are served from `/vendor/` without patching the generated runtime; their SHA-384 hashes match the
SRI constants in `support.js`.

Babel Standalone is deliberately **not** mapped. It is only loaded by `ensureBabel()`, reached only
when the `x-import` system resolves a JSX module — and no page uses `x-import` or JSX. Mapping it
meant shipping 3.1 MB for an unreachable code path. If a JSX module is ever added, it falls back to
the CDN.

## Constraints that are easy to break

**Do not rename the `.dc.html` files.** `TGTC Site.dc.html` is the design canvas container, not a
page — it embeds each artboard via `data-dc-src="Name"` and resolves it to `./Name.dc.html` with the
extension hardcoded. Renaming the artboards breaks editing in Claude Design. Clean public URLs are
produced by `rewrites` in `vercel.json` instead, with `redirects` from the old `.dc.html` paths.

**`vercel.json` header rules: later wins.** Vercel applies every matching rule, and a later rule
overrides an earlier one on the same key. `/vendor/(.*)` must stay *after* the `/(.*)\.(js|svg|png)`
rule, or the immutable one-year cache is silently downgraded to `max-age=3600`.

**Only one `[data-track]` carousel per page.** The drag-rail logic binds via
`document.querySelector('[data-track]')`, so a second one on the same page would be inert.

**The home page hero map is data, not decoration.** In `TGTC Website.dc.html`, `coords` is
`[name, lon, lat]`; `coords[0]` is the origin every network arc radiates from, and the first six
entries are the hub cities that get concentric rings. Roma is first deliberately — it is the
headquarters declared in the footer. Reordering the array changes the drawing.

## Pending before the site is genuinely public

- **Domain.** The site declares itself at `https://grandtour.company` in the `canonical`, `og:url`
  and `og:image` tags of all seven pages, plus `robots.txt` and `sitemap.xml`. That domain is not
  yet attached to the Vercel project and its DNS is not pointed, so those tags currently reference a
  host that does not resolve. Until both are done the site is still reachable only at
  `thegrandtourcompany.vercel.app`, and search engines will get contradictory signals.
- **Dispatch form.** `api/dispatch.js` needs `RESEND_API_KEY`, `DISPATCH_TO` and `DISPATCH_FROM` in
  the Vercel project settings. Without them it returns 503 and the button shows `Failed — retry`,
  by design — it never confirms a submission that did not happen.
