# FreeLearn

Free programming courses from YouTube, organised by topic, in a dark liquid-glass UI. Static site, no accounts; progress is saved in your browser.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Local dev server at http://localhost:4321 |
| `pnpm run fetch` | Snapshot playlists with yt-dlp into `data/playlists/` (skips existing; add `-- --refresh` to re-fetch all) |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm e2e` | Browser tests (Playwright, builds first) |
| `pnpm verify` | Unit tests + build + page check |
| `pnpm build` | Static build into `dist/` |

## Testing with AI agents

When run by an AI agent, Astro 7 auto-backgrounds `astro preview`, so start it first with `pnpm build && pnpm preview --port 4321`, run `pnpm e2e`, then stop it with `lsof -ti :4321 | xargs kill`.

## Updating course data

1. Edit `data/courses-all.json`.
2. `brew install yt-dlp` (once), then `pnpm run fetch`.
3. Check `data/fetch-report.json` for failed or empty playlists (these are hidden from the site).
4. `pnpm verify`, then commit `data/`.

## Categories

Raw category names are cleaned and grouped in `src/lib/categories.ts`. Add aliases to `ALIASES` and group memberships to `GROUPS`; anything unmapped shows under **Other**.

## Deploying

`dist/` is plain static files. On Vercel, import the repo with the Astro preset (build `pnpm build`, output `dist`). On GitHub Pages, upload `dist/`.
