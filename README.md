# world.

A minimal "countries I've visited" map in the style of [0x45o.com](https://0x45o.com), meant to live at `/world`.

Click every country you have visited on the world map (or type its name) and get:

- countries visited: `n / 179` and the percentage
- % of the world's land you have visited
- % of the whole earth (land + oceans) you have visited

Hit **save + compare** and your (anonymous) selection is stored in a database and compared against everyone else:

- "you visited more countries than X% of people"
- "you covered more land than X% of people"
- average countries visited across all people
- the most visited country overall

## stack

- `world/index.html` — the whole frontend: plain HTML/CSS/JS, monospace, black on white, no frameworks.
- `world/world-map.svg` — clickable SVG world map with ISO 3166-1 alpha-2 ids per country ([simple-world-map](https://github.com/flekschas/simple-world-map), CC BY-SA 3.0).
- `world/countries.js` — country names + land areas in km² ([mledoze/countries](https://github.com/mledoze/countries), ODbL).
- `netlify/functions/world.mjs` — serverless function at `/api/world`. Stores submissions in [Netlify Blobs](https://docs.netlify.com/blobs/overview/) (no external database needed) and computes the comparison stats server-side.

Selections also persist locally in `localStorage`, so the page works fully offline/undeployed — only the compare feature needs the backend.

## run locally

```bash
npm install
npx netlify dev
```

Then open `http://localhost:8888/world`. Netlify Dev emulates Blobs locally, so save + compare works out of the box.

## deploy

No environment variables or database setup required — Netlify Blobs is provisioned automatically.

### option a: separate netlify site + proxy from 0x45o.com (this repo stays as-is)

1. In Netlify: **Add new project → Import an existing project → GitHub → this repo**. Leave the build command empty; `netlify.toml` already sets the publish dir and functions dir. Deploy.
2. In the repo of your main 0x45o.com site, proxy `/world` and its api to the new site (in `_redirects`, or the `[[redirects]]` equivalent in `netlify.toml`):

```
/world        https://YOUR-WORLD-SITE.netlify.app/world/      200
/world/*      https://YOUR-WORLD-SITE.netlify.app/world/:splat 200
/api/world    https://YOUR-WORLD-SITE.netlify.app/api/world   200
```

Visitors see `0x45o.com/world`, the URL never changes, and the two sites deploy independently.

### option b: fold it into the 0x45o.com repo (single site, no proxy)

Copy into your main site's repo:

- `world/` → `world/` (served at `/world` automatically)
- `netlify/functions/world.mjs` and `netlify/functions/country-areas.mjs` → your functions directory
- add `"@netlify/blobs"` to your site's `package.json` dependencies

If your functions directory isn't `netlify/functions`, adjust accordingly — the function's route is set by `export const config = { path: '/api/world' }`, so no redirect rules are needed.

### deploying from the cli instead

```bash
npx netlify login   # once
npx netlify init    # link this repo to a new site, once
npx netlify deploy --prod
```
