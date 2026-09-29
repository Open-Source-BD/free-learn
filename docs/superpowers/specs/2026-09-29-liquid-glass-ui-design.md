# FreeLearn — Liquid Glass UI Rebuild (Design Spec)

Date: 2026-09-29
Status: Approved in brainstorming, pending written-spec review
Builds on: `docs/superpowers/specs/2026-09-28-free-learn-site-design.md` (site as shipped on `main` @ bba5781)
Reference implementation: `demo/liquid-glass-player.html` (approved spike)

## 1. Goal

Replace the site's React Bits glass with kube.io's physically based liquid glass (Snell's-law bezel refraction + saturated coloured rim), and restyle the shell around it: floating glass pills over full-bleed scrolling content, an expanding icon rail instead of the sidebar, and a floating music-player-style control bar on the watch page.

**Success criteria**
- In Chrome/Edge every glass pill shows bezel refraction and a vivid saturated rim matching the approved demo at the default parameters.
- Safari, Firefox and `prefers-reduced-motion` users get a clean CSS-blur fallback with no broken frame.
- Every icon/label on glass stays legible over bright and busy thumbnails.
- Data, routes, progress storage and search are unchanged; all existing behaviours keep working.

## 2. Decisions

| Topic | Decision |
|---|---|
| Scope | Option B: glass engine swap + shell restyle. No data/routing changes. |
| Glass engine | Runtime map generation per element (canvas → PNG data URL), cached by size. |
| Filter chain | kube.io `#mixed-ui-player-filter`, verbatim order (§3.3). |
| Default params | specularOpacity 0 · specularSaturation 50 · refraction 1 · blur 1.8 · progressiveBlur 10 · glassBgOpacity 0 |
| Navigation | Icon rail (group icons) with a glass popover per group; drawer on mobile. |
| Watch controls | Floating glass bar fixed bottom-centre. |
| Fallback | `.glass` CSS blur for non-Chromium, reduced motion, and pre-hydration SSR paint. |
| Removed | `src/components/reactbits/GlassSurface.tsx`, `CategorySidebar` docked mode. |

## 3. Glass engine — `src/lib/liquid-glass/`

Pure TypeScript, no DOM except `maps.ts`'s canvas encoding (isolated in one function).

### 3.1 `physics.ts`
- `squircle(x) = (1 − (1 − x)^4)^(1/4)`, x ∈ [0,1] from rim to inner end of bezel.
- Constants: `SAMPLES = 127`, `IOR = 1.5`, `THICKNESS = 90` (px).
- `bezelProfile(bezelPx: number): { disp: Float32Array; max: number }` — for each sample: height `h = THICKNESS·f(x)`, slope `dh/dpx = THICKNESS/bezelPx · f′(x)` (central difference, δ = 1e-3, x clamped to [δ, 1−δ]), `θ1 = atan|slope|`, `θ2 = asin(sin θ1 / IOR)`, `disp = sign(slope)·tan(θ1 − θ2)·h`. `max = max|disp|` (1 if 0).

### 3.2 `maps.ts`
- `sdfRoundRect(px, py, hw, hh, r): { dist; gx; gy }` — signed distance (negative inside) and outward unit gradient.
- `computeMaps(W, H, radius): { disp: Uint8ClampedArray; spec: Uint8ClampedArray; max: number }` (pure, testable):
  - bezel = min(W,H)/2; r = min(radius, W/2, H/2).
  - Displacement RGBA: default (128,128,128,255). Inside the bezel: `m = disp[k]/max`, `R = round(128 − gx·m·127)`, `G = round(128 − gy·m·127)`.
  - Specular RGBA: white; alpha = `round(min(1, 1.15·max(0, 1 − inside/RIM_PX)) · 255)` with `RIM_PX = 3`; 0 outside the shape.
- `buildMaps(W, H, radius): { map: string; spec: string; max: number }` — encodes via canvas to PNG data URLs; memoised by `${W}x${H}x${radius}`.

### 3.3 `filter.ts`
`filterMarkup(id, maps, W, H, params): string` returns exactly:
```
feGaussianBlur(SourceGraphic, stdDeviation=blur) → blurred_source
feImage(maps.map, 0,0,W,H) → displacement_map
feDisplacementMap(blurred_source, displacement_map, R, G, scale = maps.max × refraction) → displaced
feColorMatrix(displaced, saturate, specularSaturation) → displaced_saturated
feImage(maps.spec, 0,0,W,H) → specular_layer
feComposite(displaced_saturated IN specular_layer) → specular_saturated
feComponentTransfer(specular_layer, feFuncA linear slope = specularOpacity) → specular_faded
feBlend(specular_saturated over displaced, normal) → withSaturation
feBlend(specular_faded over withSaturation, normal)
```
The wrapping `<svg>` sets `color-interpolation-filters="sRGB"`.

### 3.4 `params.ts`
`GLASS_DEFAULTS = { specularOpacity: 0, specularSaturation: 50, refraction: 1, blur: 1.8, progressiveBlur: 10, glassBgOpacity: 0 }` and type `GlassParams`.

### 3.5 `support.ts`
`supportsSvgBackdrop(ua: string): boolean` — false for Firefox and for Safari without Chrome; true otherwise.

## 4. Components

| Component | Responsibility |
|---|---|
| `glass/LiquidGlass.tsx` (rewritten) | Props unchanged (`children`, `className?`, `borderRadius?`, `height?`) plus optional `params?: Partial<GlassParams>`. Renders an outer box, an inner **lens** layer and a **content** layer. On mount (Chromium, no reduced motion): measures with ResizeObserver, `buildMaps`, renders a hidden `<svg><defs><filter id>` next to itself, applies `backdrop-filter: url(#id)` to the lens. Otherwise lens uses `.glass`. Unique id via `useId`. Rebuilds only on size change. |
| `glass/ProgressiveBlur.astro` | Fixed top band (≈120px) and bottom band (≈160px) of 6 stacked masked `backdrop-filter: blur()` layers; per-layer blur = `(strength/10)·2^i·0.25` px; `pointer-events: none`. Hidden with reduced motion. |
| `styles/glass.css` | Adds `.glass-icon` (three-layer drop-shadow: `0 0 1px rgba(0,0,0,.85)`, `0 1px 2px rgba(0,0,0,.6)`, `0 0 8px rgba(0,0,0,.45)`), applied to every icon/label inside glass pills; hover scale 1.12, active 0.94, focus-visible ring `#a9c4f5`. |
| `TopBar.tsx` | Fixed pill: top/left/right 12px, height 56, radius 28, `LiquidGlass`. Logo, search trigger (⌘K), ☰ button below 768px. |
| `browse/ChipBar.tsx` | Fixed, horizontally centred under the top bar (top 80px), content-width pill, `LiquidGlass` radius 999; horizontal scroll on narrow screens. Behaviour unchanged. |
| `nav/IconRail.tsx` (new, replaces docked sidebar) | Fixed pill left 12px, top 80px, width 56, `LiquidGlass`. `<nav aria-label="Categories">`: Home link + one button per `CategoryGroup` (lucide icon, tinted glass square). Opening a group (hover on `pointer: fine`, click/tap anywhere) shows `nav/RailPopover.tsx`: a `LiquidGlass` panel beside the rail listing that group's category links with counts. Esc, outside click, or pointer leaving both rail and popover (hover mode, 150ms grace) closes it. Group containing the active category is highlighted. Hidden below 768px. |
| `CategorySidebar.tsx` | Keeps only the mobile Sheet drawer (opened by `fl:open-sidebar`). |
| `layouts/AppShell.astro` | Full-bleed `<main>` with padding: top 136px, left 84px (0 + 16px on mobile), bottom 120px on watch pages / 40px elsewhere. Renders TopBar, IconRail, ChipBar slot position, ProgressiveBlur. |
| `watch/Player.tsx` | Adds an imperative handle via `forwardRef`: `{ play(): void; pause(): void; isPlaying(): boolean }` and an `onPlayingChange(playing: boolean)` callback fired on YT state PLAYING/PAUSED/ENDED. |
| `watch/PlayerMeta.tsx` | Title + course/author/language/category line only; no glass, no buttons. |
| `watch/WatchControlBar.tsx` (new) | Fixed bottom 20px, centred, width `min(720px, 92vw)`, height 64, `LiquidGlass` radius 32. Buttons (all `.glass-icon`, all with `aria-label`): Previous (disabled at first), Play/Pause (label toggles "Play"/"Pause"), Next (disabled at last), Mark watched (text; pressed → "✓ Watched"), Autoplay switch (only for playlists), Playlist toggle (`aria-pressed`; only for playlists), Share (copies URL; label "Link copied" for 1.5s), Open on YouTube (link). |
| `watch/WatchApp.tsx` | Owns playlist-visible state (default visible ≥1024px, hidden below), wires the bar to `select`, `goNext`, a new `goPrev`, `markWatched`, autoplay and the player handle. |

## 5. Behaviour details

- `goPrev` = previous video that is not in `unavailable`, pushed to history like manual selection.
- Playlist toggle hides/shows `PlaylistPanel`; when hidden the player column spans full width.
- Keyboard: every bar/rail control is a real `<button>`/`<a>`; the rail popover is reachable by Tab and closes on Esc returning focus to its group button.
- Glass filters never cover the YouTube iframe (cross-origin); the bar sits below the video area and over page content.

## 6. Error handling / fallbacks

| Case | Behaviour |
|---|---|
| Non-Chromium or reduced motion | `.glass` CSS blur; no SVG filter created. |
| Before hydration | Lens renders `.glass` (SSR); swaps to the SVG filter after the first measurement. |
| Canvas unavailable / map build throws | Catch, log once, keep `.glass`. |
| Element size 0 | Skip map build until measurable. |

## 7. Testing

- **Vitest:** `physics` (disp ≥ 0 across a convex squircle bezel, max > 0, value at x→1 ≈ 0); `maps.computeMaps` (pixel outside shape = 128/128 and spec alpha 0; rim pixel alpha 255; a pixel on the top edge has G ≠ 128 and R = 128 ± 1); `filter.filterMarkup` (contains every primitive in order, `scale` = max × refraction, `slope` = specularOpacity, `values` = specularSaturation); `params` defaults; `support` UA cases.
- **Playwright (Chromium):** update browse/watch specs for the rail and bar; new: rail group opens on click and closes on Esc; category link in popover navigates; each glass pill has a `<filter>` with an `feDisplacementMap`; watch bar Next/Previous change `?v=`; Play/Pause label toggles after clicking; Playlist toggle hides `[data-testid="playlist"]`; Mark watched still flips to "✓ Watched".
- **Manual (user, Chrome):** visual comparison with `demo/liquid-glass-player.html`.

## 8. Out of scope

Glass over the video iframe; light theme; changing data, routes, search or progress storage; the Continue-watching slider (separate pending item).
