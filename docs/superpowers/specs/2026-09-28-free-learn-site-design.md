# FreeLearn — Design Spec

Date: 2026-09-28
Status: Approved in brainstorming, pending written-spec review

## 1. Goal

A public, no-login learning website where visitors browse free YouTube programming courses by category (roadmap.sh-style grouping) and watch them with a YouTube-like experience. Visual style: dark, subtle liquid glass.

**Success criteria**
- Every course in `data/courses-all.json` (691 en, 176 bn, 495 hi — all YouTube) is reachable from a category page and plays on-site, or clearly links out if embedding is impossible.
- Playlists show their full video list beside the player, like YouTube.
- Progress (watched videos, resume position) persists per visitor without accounts.
- Fast static site, deployable free.

## 2. Decisions

| Topic | Decision |
|---|---|
| Framework | Astro (static output) + React islands |
| UI primitives | shadcn/ui (Radix + Tailwind CSS) |
| Signature glass | React Bits `GlassSurface` on top bar, chip bar, sidebar, player meta panel only |
| Other glass | Plain CSS glass (`backdrop-filter: blur + saturate`, hairline border, inset highlight) for cards, playlist panel, dialogs |
| Theme | Dark subtle only (near-black, faint indigo/slate glows). No light theme. |
| Home/category layout | YouTube-style: left category sidebar + top chip bar + course grid |
| Watch layout | Classic YouTube: player left, playlist panel right, "More in category" below |
| Language filter | YouTube-style chips: All · English · বাংলা · हिन्दी · Playlists |
| Playlist data | Pre-fetched at build time with `yt-dlp --flat-playlist -J` |
| Progress | `localStorage` only |
| Hosting | Static build on Vercel or GitHub Pages |

Browser note: `GlassSurface` refraction (SVG displacement in `backdrop-filter`) renders in Chromium only; Safari/Firefox get the frosted-blur fallback. Accepted.

## 3. Data pipeline

### 3.1 Source
`data/courses-all.json` — object keyed by language code (`en`, `bn`, `hi`), each with `language`, `code`, `source`, `license`, `count`, `courses[]`. Each course: `title`, `url`, `authors[]`, `notes[]`, `category`, `section_path[]`, `language`.

### 3.2 URL parser — `src/lib/youtube-url.ts`
`parseYouTubeUrl(url) → { kind, videoId?, listId?, channelRef? }`

| Pattern | kind |
|---|---|
| `youtube.com/watch?v=ID` (no `list`), `youtu.be/ID`, `youtube.com/embed/ID`, `youtube.com/shorts/ID`, `youtube.com/live/ID` | `video` |
| `youtube.com/playlist?list=L`, `watch?v=ID&list=L` | `playlist` (keeps `videoId` as start video if present) |
| `youtube.com/@handle…`, `/channel/UC…`, `/c/name`, `/user/name` | `channel` |
| anything else | `unknown` |

Hosts accepted: `youtube.com`, any `*.youtube.com`, `youtu.be`, `youtube-nocookie.com`.

### 3.3 Course ID — `src/lib/course-id.ts`
`courseId = slugify(title) + "-" + first 6 hex chars of sha1(url)`. Slug is ASCII-only; if the title yields an empty slug (e.g. pure Bengali/Hindi), use `course`. IDs are stable across rebuilds as long as the URL is unchanged.

### 3.4 Fetch script — `scripts/fetch-playlists.ts`
- Reads `data/courses-all.json`, parses every URL.
- For `playlist` and `channel` (channel → uploads, `--playlist-end 200`), runs `yt-dlp --flat-playlist -J <url>`.
- Writes `data/playlists/<courseId>.json`:
  ```json
  { "courseId": "...", "sourceUrl": "...", "kind": "playlist",
    "fetchedAt": "ISO", "title": "...", "channel": "...",
    "videos": [ { "id": "...", "title": "...", "duration": 123 } ] }
  ```
  Thumbnails are derived at render time from `https://i.ytimg.com/vi/<id>/mqdefault.jpg`; not stored.
- Skips courses whose file already exists unless `--refresh`.
- Sleeps ~1.5 s between requests; concurrency 1–2.
- Entries whose title is `[Private video]` / `[Deleted video]` are dropped.
- Writes `data/fetch-report.json`: `{ ok: [...], failed: [{ courseId, url, error }], empty: [...] }`. Failed or empty courses are excluded from the site.
- Requires `yt-dlp` on PATH; exits with a clear message if missing.

### 3.5 Category grouping — `src/lib/categories.ts`
Hand-maintained map from raw `category` → `{ group, label, slug, icon }`.
Groups (sidebar order): Languages, CS Fundamentals, Web, Mobile, Data & AI, Cloud & DevOps, Tools, Other.
Unmapped categories fall into **Other** with their raw name as label — no course is ever dropped by mapping. Category slug = slugify(raw category); collisions get a numeric suffix.

### 3.6 Build-time catalog — `src/lib/catalog.ts`
Loads source data + playlist files once at build and exposes:
- `allCourses(): Course[]` — normalized courses (id, title, authors, notes, language code, category slug, kind, videoCount, firstVideoId, thumbnail video id).
- `getCourse(id)`, `getPlaylist(id)`, `coursesByCategory(slug)`, `categoryTree()`.
- Emits `public/search-index.json`: `[{ id, t: title, a: authors, c: category label, l: lang }]`.

A `video` course has `videoCount = 1`, `firstVideoId = videoId`, no playlist file.
An `unknown` course has `videoCount = 0` and renders as a link-out card.

## 4. Pages & routes

| Route | Page |
|---|---|
| `/` | Home: top bar, sidebar, chip bar, "Continue watching" row (client, only if progress exists), course grid (all). |
| `/c/[category]` | Same shell, grid filtered to the category; sidebar item active. |
| `/watch/[courseId]` | Watch page. Active video from `?v=` (client), default = resume video or first video. |
| `/404` | Glass "not found" page. |

Chip bar filtering is client-side over the rendered grid, reflected in `?lang=en|bn|hi` and `?type=playlist`. Pages are statically generated: 1 home + N categories + ~1,360 watch pages.

## 5. Components

| Component | Responsibility |
|---|---|
| `GlassSurface` (React Bits) | Liquid refraction surface. Used only by TopBar, ChipBar, CategorySidebar, PlayerMeta. |
| `styles/glass.css` | `.glass` CSS class + design tokens (colors, radii, blur, shadows). |
| `AppShell` (Astro) | Background glows, TopBar, CategorySidebar, main slot. |
| `TopBar` | Logo, search input; ⌘K/Ctrl+K opens `SearchDialog`. |
| `SearchDialog` | shadcn Command palette; loads `search-index.json` lazily; fuzzy search via MiniSearch; results link to `/watch/<id>`. |
| `CategorySidebar` | Grouped category list with glass icons; drawer (shadcn Sheet) below 768 px. |
| `ChipBar` | shadcn ToggleGroup for language/type; syncs URL query. |
| `CourseCard` | Thumbnail (lazy), badge ("▶ 84" / "1 video" / "↗ YouTube"), title, author · language, optional progress bar. |
| `CourseGrid` | Responsive grid (1–4 cols); applies chip filter. |
| `ContinueWatching` | Reads progressStore; renders up to 8 recent courses. |
| `Player` | YouTube IFrame API wrapper (see §6). |
| `PlaylistPanel` | Scrollable list: index/✓, thumbnail, title, duration; current highlighted and auto-scrolled into view; progress bar "12 / 84". |
| `PlayerMeta` | Title, author, language, category link, buttons: Mark watched, Autoplay toggle, Open on YouTube, Share (copy link). |
| `MoreInCategory` | Up to 9 other courses from the same category. |

Fonts: Inter, Noto Sans Bengali, Noto Sans Devanagari. `prefers-reduced-motion`: disable refraction and hover lift, keep static blur.

## 6. Player behavior

- Loads `https://www.youtube.com/iframe_api`; creates the player with `host: https://www.youtube-nocookie.com`, `playerVars: { rel: 0, modestbranding: 1, playsinline: 1 }`.
- Playlists are driven by our fetched list via `loadVideoById(id, startSeconds)` — not YouTube's `list` param.
- On `ENDED`: mark watched; if autoplay-next (persisted, default on) → next video.
- Selecting a video updates `?v=` via `history.pushState`; `popstate` switches video.
- Unknown `?v=` → first video.
- Errors:
  - `101` / `150` (embed disabled): overlay "Can't play here — Watch on YouTube ↗ / Skip to next".
  - `100` (removed/private): auto-skip to next; mark item as unavailable (greyed) for the session.
  - `2` / `5`: overlay with Retry + Open on YouTube.

## 7. Progress store — `src/lib/progress.ts`

Key `fl:progress:v1` → `{ [courseId]: { watched: string[], lastVideo: string, t: number, updatedAt: number } }`. Key `fl:prefs:v1` → `{ autoplay: boolean }`.

- Position saved every 5 s while playing and on `pagehide`.
- Watched when playback passes 90% of duration, on `ENDED`, or via "Mark watched".
- `recent(n)` sorts by `updatedAt` for ContinueWatching.
- All access wrapped in try/catch; failure → in-memory fallback, site fully usable.

## 8. Error handling summary

| Case | Behavior |
|---|---|
| Fetch failure / empty playlist | Excluded at build; listed in `fetch-report.json`. |
| `unknown` URL kind | Card shown with "↗ YouTube" badge, links out. |
| Embed disabled / removed video | See §6. |
| Unknown course route | 404 page. |
| localStorage unavailable | In-memory fallback. |
| Thumbnail load error | Neutral glass placeholder. |

## 9. Testing

- **Vitest unit:** `parseYouTubeUrl` (all patterns in §3.2 + junk), `courseId` (stability, non-Latin titles), category mapping (unmapped → Other, slug collisions), `progress` (save/restore/90% rule/storage failure), chip filter logic.
- **Fetch script:** run against a mocked `yt-dlp` JSON; asserts file shape, skip-if-exists, `--refresh`, private/deleted filtering, report entries.
- **Playwright e2e:** home → click "বাংলা" chip → grid filters → open a playlist course → player iframe present + current item highlighted → click next item → URL `?v=` changes → back to home → "Continue watching" shows the course.
- **Build check:** every non-excluded course produces a watch page with ≥1 playable video id, or is `unknown` with a link-out.

## 10. Project layout

```
free-learn/
  data/                      # existing source data + playlists/ + fetch-report.json
  scripts/fetch-playlists.ts
  src/
    lib/ youtube-url.ts course-id.ts categories.ts catalog.ts progress.ts
    components/ (React + Astro components from §5)
    components/ui/ (shadcn)
    components/reactbits/GlassSurface.tsx
    layouts/AppShell.astro
    pages/ index.astro  c/[category].astro  watch/[courseId].astro  404.astro
    styles/ glass.css global.css
  tests/ unit/ e2e/
```

## 11. Out of scope

Accounts, comments/likes, backend/database, translated UI strings, light theme, server-side progress sync, automatic scheduled re-fetching.
