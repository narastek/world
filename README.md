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

Push to a Netlify-connected repo, or:

```bash
npx netlify deploy --prod
```

No environment variables or database setup required — Netlify Blobs is provisioned automatically.
