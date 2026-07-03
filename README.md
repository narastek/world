# 0x45o.com

Source for [0x45o.com](https://0x45o.com) — homepage, mini projects, and serverless functions.

This repo was reconstructed from the live Netlify deploy (the site previously lived only on Netlify with no repo) and then extended with the new `/world` project. Connected to the existing Netlify site (`superb-stroopwafel-15fe02`), so the domain, functions, and all Blobs data (visit counts, subscribers, etc.) stay exactly as they were.

## layout

- `public/` — everything static, deployed as-is. `index.html` is the homepage; each mini project is an html file (with a pretty-url redirect in `netlify.toml`) or a folder.
- `netlify/functions/` — serverless functions. Each one declares its own route via `export const config = { path: ... }`.
- `netlify/shared/` — modules shared between functions (not deployed as functions themselves).

## world. (`public/world/`)

New mini project: a clickable SVG world map where you mark every country you have visited.

- stats: countries visited (`n / 179` + %), % of the world's land, % of the whole earth (land + oceans)
- selection persists in `localStorage`
- **save + compare** stores an anonymous submission in Netlify Blobs via `netlify/functions/world.mjs` (`/api/world`) and tells you things like "you visited more countries than X% of people", average countries visited, and the most visited country overall
- areas are recomputed server-side, so clients can't fake stats

Data sources: map from [simple-world-map](https://github.com/flekschas/simple-world-map) (CC BY-SA 3.0), country areas from [mledoze/countries](https://github.com/mledoze/countries) (ODbL).

## run locally

```bash
npm install
npm run dev
```

Opens on `http://localhost:8888`. Netlify Dev emulates functions and Blobs locally (local blob data is separate from production).

## deploy

Pushes to `main` auto-deploy via the Netlify GitHub integration. Manual deploy:

```bash
npx netlify deploy --prod
```

Environment variables (`RESEND_API_KEY`, `SUBSCRIBERS_TOKEN`, ...) live in Netlify site settings, not in this repo.
