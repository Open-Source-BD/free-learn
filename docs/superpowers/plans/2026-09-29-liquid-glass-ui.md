# Liquid Glass UI Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace React Bits glass with kube.io's physically based liquid glass and restyle FreeLearn's shell into floating glass pills, an expanding icon rail, and a floating watch-page control bar.

**Architecture:** A pure `src/lib/liquid-glass/` engine (Snell's-law bezel physics → displacement + specular maps → kube.io's SVG filter chain). A rewritten `LiquidGlass` React component builds maps per element at its measured size and applies them via `backdrop-filter: url(#id)`, falling back to CSS `.glass`. Shell components (TopBar, ChipBar, new IconRail, new WatchControlBar) become fixed pills over full-bleed scrolling content with a progressive blur.

**Tech Stack:** Astro 7 static · React 19 islands · Tailwind v4 · lucide-react · Vitest · Playwright · pnpm

**Spec:** `docs/superpowers/specs/2026-09-29-liquid-glass-ui-design.md`
**Reference implementation:** `demo/liquid-glass-player.html` (approved spike — the engine code below is a port of its script)

## Global Constraints

- Work on branch `feat/liquid-glass-ui`. Stage explicit paths only. End every commit with the `Co-Authored-By:` trailer your session instructions specify (second `-m`).
- Default params exactly: `specularOpacity 0`, `specularSaturation 50`, `refraction 1`, `blur 1.8`, `progressiveBlur 10`, `glassBgOpacity 0`.
- Physics constants exactly: `SAMPLES = 127`, `IOR = 1.5`, `THICKNESS = 90`, `RIM_PX = 3`, squircle `(1 − (1 − x)^4)^(1/4)`, bezel = `min(W, H) / 2`.
- Filter chain order exactly as kube.io `#mixed-ui-player-filter` (Task 1 `filter.ts`); wrapping `<svg>` has `color-interpolation-filters="sRGB"`.
- SVG glass only in Chromium (`supportsSvgBackdrop`) and without `prefers-reduced-motion: reduce`; otherwise the lens uses CSS `.glass`. SSR/first paint uses `.glass`.
- Every icon and label placed on a glass pill carries the `glass-icon` class (three-layer drop shadow); interactive glass icons also carry `glass-btn`.
- Do NOT change data, routes, search, or progress storage modules (`src/lib/{catalog,load-catalog,search,progress,continue,filter,source}.ts`).
- E2E in an agent shell: Astro 7 auto-backgrounds `astro preview`. Run `pnpm build && pnpm preview --port 4321`, then `pnpm e2e`, then `lsof -ti :4321 | xargs kill`. Never leave the server running. Type-check with `pnpm --package=typescript@5 dlx tsc --noEmit -p .`.

## Review Focus

1. **A glass pill changes size** (window resize, popover per group) → maps are rebuilt at the new size; never a stretched map. Pinned: Task 2 e2e "rebuilds the map when the pill resizes".
2. **Visitors with reduced motion (or Safari/Firefox)** → plain CSS glass, no SVG filter, no broken frame. Pinned: Task 2 e2e "reduced motion falls back to CSS glass" + Task 1 `support` tests.
3. **Keyboard-only rail use** → Tab to a group, Enter opens its popover, Esc closes it and returns focus to the group button. Pinned: Task 3 e2e.
4. **Content hidden under fixed pills** → the first course card starts below the language pill and right of the rail; on the watch page the last "More" card ends above the control bar. Pinned: Task 3 and Task 4 e2e.
5. **Phone width / hidden (zero-size) glass** → rail hidden, drawer works, no runtime errors from map building on zero-size elements. Pinned: Task 3 e2e "phone width".

---

## File Structure

```
src/lib/liquid-glass/
  params.ts        GlassParams type + GLASS_DEFAULTS
  support.ts       supportsSvgBackdrop(ua)
  physics.ts       squircle, bezelProfile (Snell's law), constants
  maps.ts          sdfRoundRect, computeMaps (pure), buildMaps (canvas → PNG, memoised)
  filter.ts        filterMarkup (kube.io chain as SVG string)
src/lib/player-logic.ts                 + prevVideoId
src/components/glass/LiquidGlass.tsx    rewritten (engine-backed)
src/components/glass/ProgressiveBlur.astro  new
src/components/nav/group-style.ts       GROUP_ICONS / GROUP_TINTS (moved out of CategorySidebar)
src/components/nav/IconRail.tsx         new (replaces docked sidebar)
src/components/nav/RailPopover.tsx      new
src/components/CategorySidebar.tsx      drawer only
src/components/TopBar.tsx               fixed pill
src/components/browse/ChipBar.tsx       fixed centred pill
src/layouts/AppShell.astro              full-bleed main, rail, progressive blur
src/components/watch/Player.tsx         forwardRef handle + onPlayingChange
src/components/watch/PlayerMeta.tsx     title + meta only
src/components/watch/WatchControlBar.tsx new floating bar
src/components/watch/WatchApp.tsx       wires bar, prev, playlist toggle
src/styles/glass.css                    + .glass-icon, .glass-btn, .progressive-blur
DELETE src/components/reactbits/GlassSurface.tsx
tests/unit/liquid-glass.test.ts         new
tests/unit/player-logic.test.ts         + prevVideoId
tests/e2e/glass.spec.ts                 new
tests/e2e/shell.spec.ts                 new
tests/e2e/browse.spec.ts                category test via rail
tests/e2e/watch.spec.ts                 + control bar tests
playwright.config.ts                    autoplay launch flag
```

---

### Task 1: Liquid glass engine (pure modules)

**Files:**
- Create: `src/lib/liquid-glass/params.ts`, `support.ts`, `physics.ts`, `maps.ts`, `filter.ts`
- Test: `tests/unit/liquid-glass.test.ts`

**Interfaces:**
- Produces:
  - `interface GlassParams { specularOpacity: number; specularSaturation: number; refraction: number; blur: number; progressiveBlur: number; glassBgOpacity: number }`, `GLASS_DEFAULTS: GlassParams`
  - `supportsSvgBackdrop(ua: string): boolean`
  - `SAMPLES`, `IOR`, `THICKNESS`, `squircle(x: number): number`, `bezelProfile(bezelPx: number): { disp: Float32Array; max: number }`
  - `RIM_PX`, `sdfRoundRect(px, py, hw, hh, r): { dist: number; gx: number; gy: number }`, `computeMaps(W: number, H: number, radius: number): { disp: Uint8ClampedArray; spec: Uint8ClampedArray; max: number }`, `interface GlassMaps { map: string; spec: string; max: number }`, `buildMaps(W, H, radius): GlassMaps`
  - `filterMarkup(id: string, maps: GlassMaps, W: number, H: number, p: GlassParams): string`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/liquid-glass.test.ts
import { describe, expect, it } from 'vitest';
import { filterMarkup } from '@/lib/liquid-glass/filter';
import { computeMaps } from '@/lib/liquid-glass/maps';
import { GLASS_DEFAULTS } from '@/lib/liquid-glass/params';
import { bezelProfile, SAMPLES } from '@/lib/liquid-glass/physics';
import { supportsSvgBackdrop } from '@/lib/liquid-glass/support';

describe('params', () => {
  it('uses the approved defaults', () => {
    expect(GLASS_DEFAULTS).toEqual({
      specularOpacity: 0, specularSaturation: 50, refraction: 1, blur: 1.8, progressiveBlur: 10, glassBgOpacity: 0,
    });
  });
});

describe('supportsSvgBackdrop', () => {
  it.each([
    ['Mozilla/5.0 (Macintosh) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36', true],
    ['Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 Edg/140.0', true],
    ['Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15', false],
    ['Mozilla/5.0 (Macintosh; rv:140.0) Gecko/20100101 Firefox/140.0', false],
  ])('%s → %s', (ua, ok) => expect(supportsSvgBackdrop(ua)).toBe(ok));
});

describe('bezelProfile', () => {
  const p = bezelProfile(31.5);
  it('has one sample per SAMPLES and a positive maximum', () => {
    expect(p.disp).toHaveLength(SAMPLES);
    expect(p.max).toBeGreaterThan(0);
  });
  it('bends inward across a convex squircle bezel and fades to ~0 at its inner end', () => {
    for (const v of p.disp) expect(v).toBeGreaterThanOrEqual(0);
    expect(p.disp[SAMPLES - 1]).toBeLessThan(p.max * 0.02);
  });
});

describe('computeMaps', () => {
  const W = 100, H = 40, R = 20;
  const m = computeMaps(W, H, R);
  const at = (arr: Uint8ClampedArray, x: number, y: number) => Array.from(arr.slice((y * W + x) * 4, (y * W + x) * 4 + 4));

  it('produces W×H RGBA buffers', () => {
    expect(m.disp).toHaveLength(W * H * 4);
    expect(m.spec).toHaveLength(W * H * 4);
  });
  it('leaves pixels outside the rounded shape neutral and transparent', () => {
    expect(at(m.disp, 0, 0)).toEqual([128, 128, 128, 255]);
    expect(at(m.spec, 0, 0)[3]).toBe(0);
  });
  it('lights the rim and leaves the middle without specular', () => {
    expect(at(m.spec, 50, 0)[3]).toBeGreaterThan(200);
    expect(at(m.spec, 50, 20)[3]).toBe(0);
  });
  it('displaces the top edge vertically only (inward = +y)', () => {
    const [r, g] = at(m.disp, 50, 2);
    expect(Math.abs(r - 128)).toBeLessThanOrEqual(1);
    expect(g).toBeGreaterThan(128);
  });
  it('displaces the left edge horizontally only (inward = +x)', () => {
    const [r, g] = at(m.disp, 22, 20);
    expect(r).toBeGreaterThan(128);
    expect(Math.abs(g - 128)).toBeLessThanOrEqual(1);
  });
});

describe('filterMarkup', () => {
  const maps = { map: 'data:image/png;base64,AAA', spec: 'data:image/png;base64,BBB', max: 37.5 };
  const out = filterMarkup('lg-x', maps, 640, 63, { ...GLASS_DEFAULTS, refraction: 0.5, specularOpacity: 0.3 });

  it('emits kube.io primitives in order', () => {
    const order = ['feGaussianBlur', 'feImage', 'feDisplacementMap', 'feColorMatrix', 'feImage', 'feComposite', 'feComponentTransfer', 'feBlend', 'feBlend'];
    let from = 0;
    for (const tag of order) {
      const i = out.indexOf(`<${tag}`, from);
      expect(i, tag).toBeGreaterThan(-1);
      from = i + 1;
    }
  });
  it('applies the parameters', () => {
    expect(out).toContain('id="lg-x"');
    expect(out).toContain('stdDeviation="1.8"');
    expect(out).toContain('scale="18.750"');
    expect(out).toContain('values="50"');
    expect(out).toContain('slope="0.3"');
    expect(out).toContain('operator="in"');
    expect(out).toContain('width="640" height="63"');
    expect(out).toContain(maps.map);
    expect(out).toContain(maps.spec);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test tests/unit/liquid-glass.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/liquid-glass/filter"`.

- [ ] **Step 3: Implement `src/lib/liquid-glass/params.ts`**

```ts
export interface GlassParams {
  specularOpacity: number;
  specularSaturation: number;
  refraction: number;
  blur: number;
  progressiveBlur: number;
  glassBgOpacity: number;
}

export const GLASS_DEFAULTS: GlassParams = {
  specularOpacity: 0,
  specularSaturation: 50,
  refraction: 1,
  blur: 1.8,
  progressiveBlur: 10,
  glassBgOpacity: 0,
};
```

- [ ] **Step 4: Implement `src/lib/liquid-glass/support.ts`**

```ts
/** SVG filters inside `backdrop-filter` only work in Chromium-based browsers. */
export function supportsSvgBackdrop(ua: string): boolean {
  if (/Firefox\//.test(ua)) return false;
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return false;
  return true;
}
```

- [ ] **Step 5: Implement `src/lib/liquid-glass/physics.ts`**

```ts
export const SAMPLES = 127;
export const IOR = 1.5;
export const THICKNESS = 90;

export const squircle = (x: number): number => Math.pow(Math.max(0, 1 - (1 - x) ** 4), 0.25);

/**
 * Snell's law across a convex squircle bezel. Returns the lateral displacement (px, along the
 * inward normal) at SAMPLES points from the rim (x = 0) to the inner end of the bezel (x = 1).
 */
export function bezelProfile(bezelPx: number): { disp: Float32Array; max: number } {
  const disp = new Float32Array(SAMPLES);
  const d = 1e-3;
  for (let i = 0; i < SAMPLES; i++) {
    const x = Math.min(1 - d, Math.max(d, i / (SAMPLES - 1)));
    const h = THICKNESS * squircle(x);
    const slope = (THICKNESS / bezelPx) * ((squircle(x + d) - squircle(x - d)) / (2 * d));
    const t1 = Math.atan(Math.abs(slope));
    const t2 = Math.asin(Math.sin(t1) / IOR);
    disp[i] = Math.sign(slope) * Math.tan(t1 - t2) * h;
  }
  let max = 0;
  for (const v of disp) max = Math.max(max, Math.abs(v));
  return { disp, max: max || 1 };
}
```

- [ ] **Step 6: Implement `src/lib/liquid-glass/maps.ts`**

```ts
import { bezelProfile, SAMPLES } from './physics';

export const RIM_PX = 3;

export interface GlassMaps {
  map: string;
  spec: string;
  max: number;
}

/** Signed distance to a rounded rect centred at the origin (negative inside) and its outward unit gradient. */
export function sdfRoundRect(px: number, py: number, hw: number, hh: number, r: number) {
  const qx = Math.abs(px) - (hw - r);
  const qy = Math.abs(py) - (hh - r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  const out = Math.hypot(ox, oy);
  let gx: number;
  let gy: number;
  if (qx > 0 && qy > 0) {
    gx = ox / out;
    gy = oy / out;
  } else if (qx > qy) {
    gx = 1;
    gy = 0;
  } else {
    gx = 0;
    gy = 1;
  }
  return { dist: out + Math.min(Math.max(qx, qy), 0) - r, gx: gx * Math.sign(px || 1), gy: gy * Math.sign(py || 1) };
}

/** Pure RGBA buffers: displacement (R = x, G = y, 128 = none) and a white specular rim. */
export function computeMaps(W: number, H: number, radius: number) {
  const r = Math.min(radius, W / 2, H / 2);
  const bezel = Math.min(W, H) / 2;
  const prof = bezelProfile(bezel);
  const disp = new Uint8ClampedArray(W * H * 4);
  const spec = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      disp[i] = disp[i + 1] = disp[i + 2] = 128;
      disp[i + 3] = 255;
      const s = sdfRoundRect(x + 0.5 - W / 2, y + 0.5 - H / 2, W / 2, H / 2, r);
      const inside = -s.dist;
      if (inside <= 0) continue;
      const a = Math.max(0, 1 - inside / RIM_PX);
      spec[i] = spec[i + 1] = spec[i + 2] = 255;
      spec[i + 3] = Math.round(Math.min(1, a * 1.15) * 255);
      if (inside >= bezel) continue;
      const k = Math.min(SAMPLES - 1, Math.round((inside / bezel) * (SAMPLES - 1)));
      const m = prof.disp[k] / prof.max;
      disp[i] = Math.round(128 - s.gx * m * 127);
      disp[i + 1] = Math.round(128 - s.gy * m * 127);
    }
  }
  return { disp, spec, max: prof.max };
}

const cache = new Map<string, GlassMaps>();

/** Encodes computeMaps() as PNG data URLs (browser only). Memoised by size + radius. */
export function buildMaps(W: number, H: number, radius: number): GlassMaps {
  const key = `${W}x${H}x${radius}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const raw = computeMaps(W, H, radius);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  const png = (data: Uint8ClampedArray) => {
    ctx.putImageData(new ImageData(new Uint8ClampedArray(data), W, H), 0, 0);
    return canvas.toDataURL('image/png');
  };
  const maps = { map: png(raw.disp), spec: png(raw.spec), max: raw.max };
  cache.set(key, maps);
  return maps;
}
```

- [ ] **Step 7: Implement `src/lib/liquid-glass/filter.ts`**

```ts
import type { GlassMaps } from './maps';
import type { GlassParams } from './params';

/** kube.io's #mixed-ui-player-filter, verbatim order, as an SVG <filter> string. */
export function filterMarkup(id: string, maps: GlassMaps, W: number, H: number, p: GlassParams): string {
  return `<filter id="${id}">
  <feGaussianBlur in="SourceGraphic" stdDeviation="${p.blur}" result="blurred_source"/>
  <feImage href="${maps.map}" x="0" y="0" width="${W}" height="${H}" result="displacement_map"/>
  <feDisplacementMap in="blurred_source" in2="displacement_map" xChannelSelector="R" yChannelSelector="G" result="displaced" scale="${(maps.max * p.refraction).toFixed(3)}"/>
  <feColorMatrix in="displaced" type="saturate" result="displaced_saturated" values="${p.specularSaturation}"/>
  <feImage href="${maps.spec}" x="0" y="0" width="${W}" height="${H}" result="specular_layer"/>
  <feComposite in="displaced_saturated" in2="specular_layer" operator="in" result="specular_saturated"/>
  <feComponentTransfer in="specular_layer" result="specular_faded"><feFuncA type="linear" slope="${p.specularOpacity}"/></feComponentTransfer>
  <feBlend in="specular_saturated" in2="displaced" mode="normal" result="withSaturation"/>
  <feBlend in="specular_faded" in2="withSaturation" mode="normal"/>
</filter>`;
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `pnpm test tests/unit/liquid-glass.test.ts`
Expected: PASS (all). Then `pnpm test` — all suites pass.

- [ ] **Step 9: Commit**

```bash
git add src/lib/liquid-glass tests/unit/liquid-glass.test.ts
git commit -m "feat: kube.io liquid glass engine (physics, maps, filter)"
```

---

### Task 2: `LiquidGlass` on the new engine, progressive blur, icon shadows

**Files:**
- Modify: `src/components/glass/LiquidGlass.tsx` (full rewrite), `src/styles/glass.css` (append)
- Create: `src/components/glass/ProgressiveBlur.astro`, `tests/e2e/glass.spec.ts`
- Delete: `src/components/reactbits/GlassSurface.tsx` (and the empty `src/components/reactbits/` dir)

**Interfaces:**
- Consumes: Task 1 `buildMaps`, `filterMarkup`, `GLASS_DEFAULTS`, `GlassParams`, `supportsSvgBackdrop`.
- Produces:
  - `LiquidGlass` default export, props `{ children: ReactNode; className?: string; borderRadius?: number; height?: string; params?: Partial<GlassParams> }`. Renders `<div data-liquid-glass="svg"|"css">` containing (when svg) a hidden `<svg>` with the `<filter>`, a lens `<div data-glass-lens>`, and a content `<div>` (`relative flex h-full w-full items-center p-2`).
  - `ProgressiveBlur.astro` (prop `strength?: number`, default `GLASS_DEFAULTS.progressiveBlur`).
  - CSS classes `.glass-icon`, `.glass-btn`, `.progressive-blur(.top|.bottom)`.

- [ ] **Step 1: Write the failing e2e test**

```ts
// tests/e2e/glass.spec.ts
import { expect, test } from '@playwright/test';

const pill = (page: import('@playwright/test').Page) => page.locator('header [data-liquid-glass]').first();

test('top bar uses the SVG liquid glass filter in Chromium', async ({ page }) => {
  await page.goto('/');
  await expect(pill(page)).toHaveAttribute('data-liquid-glass', 'svg');
  await expect(pill(page).locator('filter feDisplacementMap')).toHaveCount(1);
  const id = await pill(page).locator('filter').getAttribute('id');
  const bf = await pill(page).locator('[data-glass-lens]').evaluate((el) => getComputedStyle(el).backdropFilter);
  expect(bf).toContain(`#${id}`);
});

test('rebuilds the map when the pill resizes', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/');
  await expect(pill(page)).toHaveAttribute('data-liquid-glass', 'svg');
  await page.setViewportSize({ width: 1000, height: 900 });
  await expect
    .poll(async () => {
      const w = await pill(page).evaluate((el) => Math.round((el as HTMLElement).offsetWidth));
      const fe = await pill(page).locator('feImage').first().getAttribute('width');
      return Number(fe) === w;
    })
    .toBe(true);
});

test('reduced motion falls back to CSS glass', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(pill(page)).toHaveAttribute('data-liquid-glass', 'css');
  await expect(pill(page).locator('filter')).toHaveCount(0);
  await expect(pill(page).locator('[data-glass-lens]')).toHaveClass(/\bglass\b/);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm build && pnpm preview --port 4321`, then `pnpm e2e tests/e2e/glass.spec.ts`, then stop the server.
Expected: FAIL — no element matches `header [data-liquid-glass]`.

- [ ] **Step 3: Rewrite `src/components/glass/LiquidGlass.tsx`**

```tsx
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { filterMarkup } from '@/lib/liquid-glass/filter';
import { buildMaps } from '@/lib/liquid-glass/maps';
import { GLASS_DEFAULTS, type GlassParams } from '@/lib/liquid-glass/params';
import { supportsSvgBackdrop } from '@/lib/liquid-glass/support';

interface Props {
  children: ReactNode;
  className?: string;
  borderRadius?: number;
  height?: string;
  params?: Partial<GlassParams>;
}

let warned = false;

export default function LiquidGlass({ children, className = '', borderRadius = 16, height = 'auto', params }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const filterId = `lg-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [enabled, setEnabled] = useState(false);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const p = { ...GLASS_DEFAULTS, ...params };

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setEnabled(supportsSvgBackdrop(navigator.userAgent) && !mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el || !enabled) return;
    const measure = () => {
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      setSize((s) => (s && s.w === w && s.h === h ? s : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [enabled]);

  const markup = useMemo(() => {
    if (!enabled || !size || size.w <= 0 || size.h <= 0) return null;
    try {
      const r = Math.min(borderRadius, size.w / 2, size.h / 2);
      return filterMarkup(filterId, buildMaps(size.w, size.h, r), size.w, size.h, p);
    } catch (e) {
      if (!warned) {
        warned = true;
        console.warn('LiquidGlass: falling back to CSS glass', e);
      }
      return null;
    }
    // p is rebuilt each render; its fields are the real dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, size, borderRadius, filterId, p.blur, p.refraction, p.specularSaturation, p.specularOpacity]);

  const lens: CSSProperties = markup
    ? {
        borderRadius,
        backdropFilter: `url(#${filterId})`,
        WebkitBackdropFilter: `url(#${filterId})`,
        background: `rgba(255,255,255,${p.glassBgOpacity})`,
        boxShadow: '0 4px 19px rgba(0,0,0,.35)',
      }
    : { borderRadius };

  return (
    <div ref={box} className={`relative ${className}`} style={{ borderRadius, height }} data-liquid-glass={markup ? 'svg' : 'css'}>
      {markup && (
        <svg
          aria-hidden="true"
          width="0"
          height="0"
          style={{ position: 'absolute' }}
          colorInterpolationFilters="sRGB"
          dangerouslySetInnerHTML={{ __html: `<defs>${markup}</defs>` }}
        />
      )}
      <div className={`absolute inset-0 ${markup ? '' : 'glass'}`} style={lens} data-glass-lens="" />
      <div className="relative flex h-full w-full items-center p-2" style={{ borderRadius }}>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/glass/ProgressiveBlur.astro`**

```astro
---
import { GLASS_DEFAULTS } from '@/lib/liquid-glass/params';

interface Props {
  strength?: number;
}
const { strength = GLASS_DEFAULTS.progressiveBlur } = Astro.props;
const layers = Array.from({ length: 6 }, (_, i) => ({
  blur: (strength / 10) * 2 ** i * 0.25,
  from: (i / 6) * 100,
  to: ((i + 1) / 6) * 100,
}));
const style = (dir: 'top' | 'bottom', l: (typeof layers)[number]) => {
  const mask = `linear-gradient(to ${dir}, transparent ${l.from}%, #000 ${l.to}%)`;
  return `backdrop-filter:blur(${l.blur}px);-webkit-backdrop-filter:blur(${l.blur}px);mask-image:${mask};-webkit-mask-image:${mask}`;
};
---

<div class="progressive-blur top" aria-hidden="true">
  {layers.map((l) => <div style={style('top', l)} />)}
</div>
<div class="progressive-blur bottom" aria-hidden="true">
  {layers.map((l) => <div style={style('bottom', l)} />)}
</div>
```

- [ ] **Step 5: Append to `src/styles/glass.css`**

```css
@layer components {
  /* keep icons/labels readable on liquid glass: tight dark edge + small drop + soft halo */
  .glass-icon {
    filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.85)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 8px rgba(0, 0, 0, 0.45));
  }
  .glass-btn {
    display: inline-grid;
    place-items: center;
    border-radius: 999px;
    color: #fff;
    transition: transform 0.15s ease;
  }
  .glass-btn:hover:not(:disabled) {
    transform: scale(1.12);
  }
  .glass-btn:active:not(:disabled) {
    transform: scale(0.94);
  }
  .glass-btn:focus-visible {
    outline: 2px solid #a9c4f5;
    outline-offset: 3px;
  }
  .glass-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .progressive-blur {
    position: fixed;
    left: 0;
    right: 0;
    z-index: 20;
    pointer-events: none;
  }
  .progressive-blur.top {
    top: 0;
    height: 120px;
  }
  .progressive-blur.bottom {
    bottom: 0;
    height: 160px;
  }
  .progressive-blur > div {
    position: absolute;
    inset: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .progressive-blur {
    display: none;
  }
  .glass-btn:hover:not(:disabled),
  .glass-btn:active:not(:disabled) {
    transform: none;
  }
}
```

- [ ] **Step 6: Delete the React Bits component**

```bash
git rm src/components/reactbits/GlassSurface.tsx
```
Then confirm nothing imports it: `grep -rn "reactbits" src || echo "no references"` → `no references`.

- [ ] **Step 7: Type-check, build, run the glass e2e**

Run: `pnpm --package=typescript@5 dlx tsc --noEmit -p .` → exit 0.
Run: `pnpm build && pnpm preview --port 4321`, `pnpm e2e tests/e2e/glass.spec.ts` → 3 passed. Then run `pnpm e2e` (all specs) → all pass (existing specs still use the old shell and must keep passing). Stop the server.

- [ ] **Step 8: Commit**

```bash
git add src/components/glass/LiquidGlass.tsx src/components/glass/ProgressiveBlur.astro src/styles/glass.css tests/e2e/glass.spec.ts
git commit -m "feat: LiquidGlass on the kube.io engine with CSS fallback; progressive blur; icon shadows"
```
(`git rm` in Step 6 already staged the deletion.)

---

### Task 3: Floating shell — top bar, language pill, icon rail, full-bleed layout

**Files:**
- Create: `src/components/nav/group-style.ts`, `src/components/nav/IconRail.tsx`, `src/components/nav/RailPopover.tsx`, `tests/e2e/shell.spec.ts`
- Modify: `src/components/TopBar.tsx`, `src/components/browse/ChipBar.tsx`, `src/components/CategorySidebar.tsx`, `src/layouts/AppShell.astro`, `src/pages/watch/[courseId].astro`, `src/pages/404.astro`, `tests/e2e/browse.spec.ts`

**Interfaces:**
- Consumes: Task 2 `LiquidGlass`, `ProgressiveBlur.astro`, `.glass-icon`, `.glass-btn`; existing `CategoryNode`, `CategoryGroup` (src/lib/types.ts), `loadCatalog`.
- Produces:
  - `GROUP_ICONS: Record<CategoryGroup, LucideIcon>`, `GROUP_TINTS: Record<CategoryGroup, [string, string]>`
  - `IconRail` props `{ categories: CategoryNode[]; activeSlug?: string }`; renders `<nav aria-label="Categories">` with a Home link (`aria-label="Home"`) and one `<button aria-label={group} aria-expanded aria-controls="rail-popover">` per group; open popover has `id="rail-popover"`.
  - `RailPopover` props `{ id: string; node: CategoryNode; activeSlug?: string }`
  - `CategorySidebar` props `{ categories: CategoryNode[]; activeSlug?: string }` (drawer only)
  - `TopBar` takes no props.
  - `AppShell.astro` props `{ title: string; description?: string; activeSlug?: string; hasChips?: boolean (default true); bottomBar?: boolean (default false) }`

- [ ] **Step 1: Write the failing e2e tests**

```ts
// tests/e2e/shell.spec.ts
import { expect, test } from '@playwright/test';

test('rail group opens with the keyboard, Esc closes and returns focus', async ({ page }) => {
  await page.goto('/');
  const btn = page.getByRole('navigation', { name: 'Categories' }).getByRole('button', { name: 'Languages' });
  await expect(async () => {
    await btn.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#rail-popover')).toBeVisible({ timeout: 500 });
  }).toPass();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#rail-popover')).toHaveCount(0);
  await expect(btn).toBeFocused();
});

test('a popover category link navigates to its page', async ({ page }) => {
  await page.goto('/');
  const rail = page.getByRole('navigation', { name: 'Categories' });
  await expect(async () => {
    await rail.getByRole('button', { name: 'Languages' }).click();
    await expect(page.locator('#rail-popover')).toBeVisible({ timeout: 500 });
  }).toPass();
  const link = page.locator('#rail-popover a[href^="/c/"]').first();
  const name = (await link.locator('span').first().textContent())!.trim();
  await link.click();
  await expect(page).toHaveURL(/\/c\//);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
});

test('content starts below the language pill and right of the rail', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const card = await page.getByTestId('course-card').first().boundingBox();
  const chips = await page.locator('[aria-label="Language"]').boundingBox();
  const rail = await page.getByRole('navigation', { name: 'Categories' }).boundingBox();
  expect(card!.y).toBeGreaterThanOrEqual(chips!.y + chips!.height);
  expect(card!.x).toBeGreaterThanOrEqual(rail!.x + rail!.width);
});

test('phone width: rail hidden, drawer works, no runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('div:has(> nav[aria-label="Categories"])').first()).toBeHidden();
  await expect(async () => {
    await page.getByRole('button', { name: 'Open categories' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 500 });
  }).toPass();
  await expect(page.getByRole('dialog').locator('a[href^="/c/"]').first()).toBeVisible();
  expect(errors).toEqual([]);
});
```

- [ ] **Step 2: Update the category test in `tests/e2e/browse.spec.ts`**

Replace the whole `test('category page shows only that category', …)` block with:

```ts
test('category page shows only that category', async ({ page }) => {
  await page.goto('/');
  const rail = page.getByRole('navigation', { name: 'Categories' });
  await expect(async () => {
    await rail.getByRole('button', { name: 'Languages' }).click();
    await expect(page.locator('#rail-popover')).toBeVisible({ timeout: 500 });
  }).toPass();
  const link = page.locator('#rail-popover a[href^="/c/"]').first();
  const name = (await link.locator('span').first().textContent())!.trim();
  await link.click();
  await expect(page).toHaveURL(/\/c\//);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
  await expect(page.getByTestId('course-card').first()).toBeVisible();
});
```

- [ ] **Step 3: Run the e2e to verify it fails**

Run (server procedure from Global Constraints): `pnpm e2e tests/e2e/shell.spec.ts tests/e2e/browse.spec.ts`
Expected: FAIL — no button named "Languages" in the Categories navigation.

- [ ] **Step 4: Create `src/components/nav/group-style.ts`**

```ts
import { Brain, Cloud, Code2, Cpu, Globe, Shapes, Smartphone, Wrench, type LucideIcon } from 'lucide-react';
import type { CategoryGroup } from '@/lib/types';

export const GROUP_ICONS: Record<CategoryGroup, LucideIcon> = {
  Languages: Code2,
  'CS Fundamentals': Cpu,
  Web: Globe,
  Mobile: Smartphone,
  'Data & AI': Brain,
  'Cloud & DevOps': Cloud,
  Tools: Wrench,
  Other: Shapes,
};

export const GROUP_TINTS: Record<CategoryGroup, [string, string]> = {
  Languages: ['#60a5fa', '#2563eb'],
  'CS Fundamentals': ['#a78bfa', '#7c3aed'],
  Web: ['#34d399', '#059669'],
  Mobile: ['#f472b6', '#db2777'],
  'Data & AI': ['#fbbf24', '#d97706'],
  'Cloud & DevOps': ['#38bdf8', '#0284c7'],
  Tools: ['#94a3b8', '#475569'],
  Other: ['#fb7185', '#e11d48'],
};
```

- [ ] **Step 5: Create `src/components/nav/RailPopover.tsx`**

```tsx
import LiquidGlass from '@/components/glass/LiquidGlass';
import type { CategoryNode } from '@/lib/types';

interface Props {
  id: string;
  node: CategoryNode;
  activeSlug?: string;
}

export default function RailPopover({ id, node, activeSlug }: Props) {
  return (
    <div id={id} role="group" aria-label={node.group} className="absolute top-0 left-[64px] w-64">
      <LiquidGlass borderRadius={20}>
        <div className="max-h-[calc(100dvh-120px)] w-full overflow-y-auto">
          <p className="glass-icon px-2 pb-1 text-[11px] font-semibold tracking-wider text-white/75 uppercase">{node.group}</p>
          <ul>
            {node.items.map((i) => (
              <li key={i.slug}>
                <a
                  href={`/c/${i.slug}`}
                  aria-current={i.slug === activeSlug ? 'page' : undefined}
                  className={`glass-icon flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/10 ${i.slug === activeSlug ? 'bg-white/15 font-medium' : ''}`}
                >
                  <span className="truncate">{i.name}</span>
                  <span className="text-xs text-white/60">{i.count}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </LiquidGlass>
    </div>
  );
}
```

- [ ] **Step 6: Create `src/components/nav/IconRail.tsx`**

```tsx
import { House } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import LiquidGlass from '@/components/glass/LiquidGlass';
import type { CategoryGroup, CategoryNode } from '@/lib/types';
import { GROUP_ICONS, GROUP_TINTS } from './group-style';
import RailPopover from './RailPopover';

interface Props {
  categories: CategoryNode[];
  activeSlug?: string;
}

const CLOSE_GRACE_MS = 150;
const hoverCapable = () => window.matchMedia('(pointer: fine)').matches;

export default function IconRail({ categories, activeSlug }: Props) {
  const [open, setOpen] = useState<CategoryGroup | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<CategoryGroup, HTMLButtonElement>());
  const closeTimer = useRef<number | undefined>(undefined);
  const activeGroup = categories.find((g) => g.items.some((i) => i.slug === activeSlug))?.group ?? null;

  const cancelClose = () => window.clearTimeout(closeTimer.current);
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(null), CLOSE_GRACE_MS);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      buttons.current.get(open)?.focus();
      setOpen(null);
    };
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(null);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  useEffect(() => cancelClose, []);

  const openNode = categories.find((g) => g.group === open);

  return (
    <div
      ref={root}
      className="fixed top-[80px] left-3 z-40 hidden md:block"
      onPointerEnter={cancelClose}
      onPointerLeave={() => hoverCapable() && scheduleClose()}
    >
      <nav aria-label="Categories">
        <LiquidGlass borderRadius={28}>
          <ul className="flex w-10 flex-col items-center gap-2 py-1">
            <li>
              <a
                href="/"
                aria-label="Home"
                aria-current={!activeSlug ? 'page' : undefined}
                className={`glass-btn glass-icon size-9 ${!activeSlug ? 'bg-white/20' : ''}`}
              >
                <House className="size-5" />
              </a>
            </li>
            {categories.map((g) => {
              const Icon = GROUP_ICONS[g.group];
              const [c1, c2] = GROUP_TINTS[g.group];
              const highlighted = activeGroup === g.group || open === g.group;
              return (
                <li key={g.group}>
                  <button
                    ref={(el) => {
                      if (el) buttons.current.set(g.group, el);
                    }}
                    type="button"
                    aria-label={g.group}
                    aria-expanded={open === g.group}
                    aria-controls="rail-popover"
                    className={`glass-btn glass-icon size-9 rounded-xl ${highlighted ? 'ring-2 ring-white/70' : ''}`}
                    style={{ background: `linear-gradient(135deg, ${c1}, ${c2})`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.45)` }}
                    onPointerEnter={() => {
                      if (!hoverCapable()) return;
                      cancelClose();
                      setOpen(g.group);
                    }}
                    onClick={() => setOpen((o) => (o === g.group && !hoverCapable() ? null : g.group))}
                  >
                    <Icon className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </LiquidGlass>
        {openNode && <RailPopover id="rail-popover" node={openNode} activeSlug={activeSlug} />}
      </nav>
    </div>
  );
}
```

- [ ] **Step 7: Replace `src/components/CategorySidebar.tsx` (drawer only)**

```tsx
import { House } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { CategoryNode } from '@/lib/types';
import { GROUP_ICONS, GROUP_TINTS } from './nav/group-style';

interface Props {
  categories: CategoryNode[];
  activeSlug?: string;
}

function Nav({ categories, activeSlug }: Props) {
  const item = (active: boolean) =>
    `flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/10 ${active ? 'bg-white/10 font-medium' : 'text-white/80'}`;
  return (
    <nav aria-label="Categories" className="w-full space-y-3 text-left">
      <a href="/" className={item(!activeSlug)}>
        <span className="flex items-center gap-2">
          <House className="size-4" /> Home
        </span>
      </a>
      {categories.map((g) => {
        const Icon = GROUP_ICONS[g.group];
        const [c1, c2] = GROUP_TINTS[g.group];
        return (
          <section key={g.group}>
            <h2 className="mb-1 flex items-center gap-2 px-2 text-[11px] font-semibold tracking-wider text-white/50 uppercase">
              <span className="grid size-5 place-items-center rounded-md text-white" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                <Icon className="size-3" />
              </span>
              {g.group}
            </h2>
            <ul>
              {g.items.map((i) => (
                <li key={i.slug}>
                  <a href={`/c/${i.slug}`} className={item(i.slug === activeSlug)} aria-current={i.slug === activeSlug ? 'page' : undefined}>
                    <span className="truncate">{i.name}</span>
                    <span className="text-xs text-white/40">{i.count}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </nav>
  );
}

export default function CategorySidebar({ categories, activeSlug }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('fl:open-sidebar', onOpen);
    return () => window.removeEventListener('fl:open-sidebar', onOpen);
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-72 overflow-y-auto border-white/10 bg-black/60 p-3 backdrop-blur-2xl">
        <SheetHeader className="px-2">
          <SheetTitle>Categories</SheetTitle>
        </SheetHeader>
        <Nav categories={categories} activeSlug={activeSlug} />
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 8: Replace `src/components/TopBar.tsx`**

```tsx
import { Menu, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import LiquidGlass from '@/components/glass/LiquidGlass';
import SearchDialog from '@/components/SearchDialog';

export default function TopBar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="fixed inset-x-3 top-3 z-40">
      <LiquidGlass borderRadius={28} height="56px">
        <div className="flex h-full w-full items-center gap-3 px-2">
          <button
            type="button"
            aria-label="Open categories"
            className="glass-btn glass-icon size-9 md:hidden"
            onClick={() => window.dispatchEvent(new Event('fl:open-sidebar'))}
          >
            <Menu className="size-5" />
          </button>
          <a href="/" className="glass-icon shrink-0 text-base font-semibold tracking-tight">
            ◐ FreeLearn
          </a>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="ml-auto flex w-full max-w-md items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-left text-sm text-white/85 hover:bg-white/10"
          >
            <Search className="glass-icon size-4" />
            <span className="glass-icon flex-1">Search courses…</span>
            <kbd className="glass-icon hidden text-xs text-white/60 sm:inline">⌘K</kbd>
          </button>
        </div>
      </LiquidGlass>
      <SearchDialog open={open} onOpenChange={setOpen} />
    </header>
  );
}
```

- [ ] **Step 9: Replace `src/components/browse/ChipBar.tsx`**

```tsx
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import LiquidGlass from '@/components/glass/LiquidGlass';
import { LANG_OPTIONS, type GridFilter } from '@/lib/filter';

interface Props {
  value: GridFilter;
  onChange(f: GridFilter): void;
}

export default function ChipBar({ value, onChange }: Props) {
  return (
    <div className="fixed top-[80px] left-1/2 z-30 w-max max-w-[calc(100vw-24px)] -translate-x-1/2 md:left-[calc(50%+34px)] md:max-w-[calc(100vw-120px)]">
      <LiquidGlass borderRadius={999} height="48px">
        <div className="flex h-full max-w-full items-center gap-1.5 overflow-x-auto">
          <ToggleGroup.Root
            type="single"
            value={value.lang}
            onValueChange={(v) => v && onChange({ ...value, lang: v as GridFilter['lang'] })}
            aria-label="Language"
            className="flex gap-1.5"
          >
            {LANG_OPTIONS.map((o) => (
              <ToggleGroup.Item key={o.value} value={o.value} className="chip">
                {o.label}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
          <span className="mx-1 h-5 w-px bg-white/25" aria-hidden="true" />
          <button
            type="button"
            className="chip"
            aria-pressed={value.type === 'playlist'}
            onClick={() => onChange({ ...value, type: value.type === 'playlist' ? 'all' : 'playlist' })}
          >
            Playlists
          </button>
        </div>
      </LiquidGlass>
    </div>
  );
}
```

- [ ] **Step 10: Replace `src/layouts/AppShell.astro`**

```astro
---
import '@/styles/global.css';
import '@fontsource-variable/inter';
import '@fontsource-variable/noto-sans-bengali';
import '@fontsource-variable/noto-sans-devanagari';
import CategorySidebar from '@/components/CategorySidebar';
import ProgressiveBlur from '@/components/glass/ProgressiveBlur.astro';
import IconRail from '@/components/nav/IconRail';
import TopBar from '@/components/TopBar';
import { loadCatalog } from '@/lib/load-catalog';

interface Props {
  title: string;
  description?: string;
  activeSlug?: string;
  hasChips?: boolean;
  bottomBar?: boolean;
}

const {
  title,
  description = 'Free programming courses from YouTube, organised by topic.',
  activeSlug,
  hasChips = true,
  bottomBar = false,
} = Astro.props;
const { categories } = loadCatalog();
const mainClass = [
  'min-w-0 px-4 md:pr-6 md:pl-[84px]',
  hasChips ? 'pt-[136px]' : 'pt-[84px]',
  bottomBar ? 'pb-[120px]' : 'pb-10',
].join(' ');
---

<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} />
    <title>{title} · FreeLearn</title>
  </head>
  <body class="min-h-dvh antialiased">
    <div class="bg-glows" aria-hidden="true"></div>
    <main class={mainClass}>
      <slot />
    </main>
    <ProgressiveBlur />
    <TopBar client:load />
    <IconRail client:load categories={categories} activeSlug={activeSlug} />
    <CategorySidebar client:load categories={categories} activeSlug={activeSlug} />
  </body>
</html>
```

- [ ] **Step 11: Update the two pages that used the old `docked` prop**

In `src/pages/watch/[courseId].astro` replace
`<AppShell title={course.title} description={`Watch ${course.title} for free.`} docked={false}>`
with
`<AppShell title={course.title} description={`Watch ${course.title} for free.`} hasChips={false} bottomBar>`.

In `src/pages/404.astro` replace `<AppShell title="Not found">` with `<AppShell title="Not found" hasChips={false}>`.

Then confirm no other callers: `grep -rn "docked\|menuOnDesktop" src || echo "none"` → `none`.

- [ ] **Step 12: Type-check, build, run e2e**

Run: `pnpm --package=typescript@5 dlx tsc --noEmit -p .` → exit 0.
Run: server procedure, `pnpm e2e` (all specs) → all pass (shell 4, browse 4, glass 3, watch 6). Stop the server.

- [ ] **Step 13: Commit**

```bash
git add src/components/nav src/components/CategorySidebar.tsx src/components/TopBar.tsx src/components/browse/ChipBar.tsx src/layouts/AppShell.astro "src/pages/watch/[courseId].astro" src/pages/404.astro tests/e2e/shell.spec.ts tests/e2e/browse.spec.ts
git commit -m "feat: floating liquid-glass shell with icon rail and full-bleed layout"
```

---

### Task 4: Watch page floating control bar

**Files:**
- Create: `src/components/watch/WatchControlBar.tsx`
- Modify: `src/lib/player-logic.ts` (append `prevVideoId`), `tests/unit/player-logic.test.ts`, `src/components/watch/Player.tsx`, `src/components/watch/PlayerMeta.tsx`, `src/components/watch/WatchApp.tsx`, `tests/e2e/watch.spec.ts`, `playwright.config.ts`

**Interfaces:**
- Consumes: Task 2 `LiquidGlass`, `.glass-icon`, `.glass-btn`; existing `nextVideoId`, `resolveStartVideo`, `classifyPlayerError`, `createProgressStore`, `youtubeWatchUrl`, `Switch` (`src/components/ui/switch.tsx`, props `checked`, `onCheckedChange`, `aria-label`), `LANG_LABEL`.
- Produces:
  - `prevVideoId(videos: { id: string }[], current: string | null, unavailable?: Set<string>): string | null`
  - `export interface PlayerHandle { play(): void; pause(): void; isPlaying(): boolean }`; `Player` is `forwardRef<PlayerHandle, Props>` with new optional prop `onPlayingChange?(playing: boolean): void`
  - `PlayerMeta` props `{ course: WatchCourse; videoTitle: string }`
  - `WatchControlBar` props `{ isList: boolean; hasPrev: boolean; hasNext: boolean; playing: boolean; isWatched: boolean; autoplay: boolean; playlistOpen: boolean; youtubeUrl: string; onPrev(): void; onNext(): void; onTogglePlay(): void; onMarkWatched(): void; onAutoplayChange(v: boolean): void; onTogglePlaylist(): void }`; root has `data-testid="control-bar"`.

- [ ] **Step 1: Write the failing unit test for `prevVideoId`**

In `tests/unit/player-logic.test.ts` change the import line to:

```ts
import { classifyPlayerError, nextVideoId, prevVideoId, resolveStartVideo } from '@/lib/player-logic';
```

and append:

```ts
describe('prevVideoId', () => {
  it('returns the previous available video', () => {
    expect(prevVideoId(vids, 'c')).toBe('b');
    expect(prevVideoId(vids, 'd', new Set(['c', 'b']))).toBe('a');
  });

  it('returns null at the start, when all earlier are unavailable, or when current is unknown', () => {
    expect(prevVideoId(vids, 'a')).toBeNull();
    expect(prevVideoId(vids, 'c', new Set(['a', 'b']))).toBeNull();
    expect(prevVideoId(vids, 'zzz')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test tests/unit/player-logic.test.ts`
Expected: FAIL — `prevVideoId is not a function` / not exported.

- [ ] **Step 3: Append `prevVideoId` to `src/lib/player-logic.ts`**

```ts
export function prevVideoId(
  videos: { id: string }[],
  current: string | null,
  unavailable: Set<string> = new Set(),
): string | null {
  const i = videos.findIndex((v) => v.id === current);
  for (let j = i - 1; j >= 0; j--) {
    if (!unavailable.has(videos[j].id)) return videos[j].id;
  }
  return null;
}
```

Run: `pnpm test tests/unit/player-logic.test.ts` → PASS.

- [ ] **Step 4: Write the failing e2e tests**

In `playwright.config.ts` replace the `projects` line with:

```ts
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } },
    },
  ],
```

Append to `tests/e2e/watch.spec.ts`:

```ts
test('control bar: next and previous move through the playlist', async ({ page }) => {
  await openFirstPlaylist(page);
  await expect(page).toHaveURL(/\?v=[A-Za-z0-9_-]{11}/);
  const bar = page.getByTestId('control-bar');
  const first = new URL(page.url()).searchParams.get('v')!;
  await expect(bar.getByRole('button', { name: 'Next' })).toBeEnabled();
  await bar.getByRole('button', { name: 'Next' }).click();
  await expect(page).not.toHaveURL(new RegExp(`v=${first}`));
  await bar.getByRole('button', { name: 'Previous' }).click();
  await expect(page).toHaveURL(new RegExp(`v=${first}`));
});

test('control bar: play/pause label follows the player', async ({ page }) => {
  await openFirstPlaylist(page);
  await expect(page.locator('iframe[src*="youtube"]')).toBeVisible({ timeout: 20_000 });
  const bar = page.getByTestId('control-bar');
  await expect(async () => {
    await bar.getByRole('button', { name: 'Play' }).click();
    await expect(bar.getByRole('button', { name: 'Pause' })).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  await bar.getByRole('button', { name: 'Pause' }).click();
  await expect(bar.getByRole('button', { name: 'Play' })).toBeVisible({ timeout: 10_000 });
});

test('control bar: playlist toggle hides and shows the list', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openFirstPlaylist(page);
  const bar = page.getByTestId('control-bar');
  await expect(page.getByTestId('playlist')).toBeVisible();
  await bar.getByRole('button', { name: 'Playlist' }).click();
  await expect(page.getByTestId('playlist')).toHaveCount(0);
  await expect(bar.getByRole('button', { name: 'Playlist' })).toHaveAttribute('aria-pressed', 'false');
  await bar.getByRole('button', { name: 'Playlist' }).click();
  await expect(page.getByTestId('playlist')).toBeVisible();
});

test('the last "More" card ends above the control bar', async ({ page }) => {
  await openFirstPlaylist(page);
  const bar = page.getByTestId('control-bar');
  await expect(bar).toBeVisible();
  const cards = page.getByTestId('course-card');
  test.skip((await cards.count()) === 0, 'no related courses on this page');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  const card = await cards.last().boundingBox();
  const barBox = await bar.boundingBox();
  expect(card!.y + card!.height).toBeLessThanOrEqual(barBox!.y);
});
```

- [ ] **Step 5: Run to verify they fail**

Run: server procedure, `pnpm e2e tests/e2e/watch.spec.ts`.
Expected: the 4 new tests FAIL — no `data-testid="control-bar"`.

- [ ] **Step 6: Update `src/components/watch/Player.tsx`**

Replace the import line and the component signature/handle, keeping all other logic identical:

```tsx
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { loadYouTubeApi } from '@/lib/yt-api';

export interface PlayerHandle {
  play(): void;
  pause(): void;
  isPlaying(): boolean;
}

interface Props {
  videoId: string;
  startSeconds: number;
  onProgress(t: number, duration: number): void;
  onEnded(): void;
  onError(code: number): void;
  onPlayingChange?(playing: boolean): void;
}

const POLL_MS = 5000;

const Player = forwardRef<PlayerHandle, Props>(function Player(
  { videoId, startSeconds, onProgress, onEnded, onError, onPlayingChange },
  ref,
) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YT.Player | null>(null);
  const ready = useRef(false);
  const want = useRef({ videoId, startSeconds });
  const loaded = useRef(videoId);
  const cb = useRef({ onProgress, onEnded, onError, onPlayingChange });
  cb.current = { onProgress, onEnded, onError, onPlayingChange };
  want.current = { videoId, startSeconds };
  const [apiFailed, setApiFailed] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      // YT.Player methods only exist after onReady; optional-call so an early click is a no-op
      play: () => player.current?.playVideo?.(),
      pause: () => player.current?.pauseVideo?.(),
      isPlaying: () => player.current?.getPlayerState?.() === 1,
    }),
    [],
  );
```

In the `onStateChange` handler replace its body with:

```tsx
            onStateChange: (e) => {
              if (e.data === api.PlayerState.ENDED) cb.current.onEnded();
              if (e.data === api.PlayerState.PLAYING) cb.current.onPlayingChange?.(true);
              else if (e.data === api.PlayerState.PAUSED || e.data === api.PlayerState.ENDED) cb.current.onPlayingChange?.(false);
            },
```

Replace the final lines of the file (`return <div ref={host} … />;` and the closing `}`) with:

```tsx
  return <div ref={host} className="size-full [&>iframe]:size-full" />;
});

export default Player;
```

(The `if (apiFailed) { … }` block and every `useEffect` stay exactly as they are.)

- [ ] **Step 7: Replace `src/components/watch/PlayerMeta.tsx`**

```tsx
import { LANG_LABEL } from '@/lib/filter';
import type { WatchCourse } from '@/lib/types';

interface Props {
  course: WatchCourse;
  videoTitle: string;
}

export default function PlayerMeta({ course, videoTitle }: Props) {
  return (
    <div className="space-y-1 px-1">
      <h1 className="text-lg leading-snug font-semibold">{videoTitle}</h1>
      <p className="text-sm text-white/60">
        {course.title !== videoTitle && <>{course.title} · </>}
        {course.authors.length > 0 && <>{course.authors.join(', ')} · </>}
        {LANG_LABEL[course.lang]} ·{' '}
        <a className="underline-offset-2 hover:underline" href={`/c/${course.categorySlug}`}>
          {course.categoryName}
        </a>
      </p>
    </div>
  );
}
```

- [ ] **Step 8: Create `src/components/watch/WatchControlBar.tsx`**

```tsx
import { ExternalLink, ListVideo, Pause, Play, Share2, SkipBack, SkipForward } from 'lucide-react';
import { useState } from 'react';
import LiquidGlass from '@/components/glass/LiquidGlass';
import { Switch } from '@/components/ui/switch';

interface Props {
  isList: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  playing: boolean;
  isWatched: boolean;
  autoplay: boolean;
  playlistOpen: boolean;
  youtubeUrl: string;
  onPrev(): void;
  onNext(): void;
  onTogglePlay(): void;
  onMarkWatched(): void;
  onAutoplayChange(v: boolean): void;
  onTogglePlaylist(): void;
}

export default function WatchControlBar(p: Props) {
  const [copied, setCopied] = useState(false);
  const share = () =>
    navigator.clipboard
      ?.writeText(window.location.href)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});

  return (
    <div className="fixed bottom-5 left-1/2 z-40 w-[min(720px,92vw)] -translate-x-1/2" data-testid="control-bar">
      <LiquidGlass borderRadius={32} height="64px">
        <div className="flex h-full w-full items-center gap-1 px-2 sm:gap-2">
          {p.isList && (
            <button type="button" aria-label="Previous" disabled={!p.hasPrev} onClick={p.onPrev} className="glass-btn glass-icon size-10">
              <SkipBack className="size-5 fill-current" />
            </button>
          )}
          <button type="button" aria-label={p.playing ? 'Pause' : 'Play'} onClick={p.onTogglePlay} className="glass-btn glass-icon size-11">
            {p.playing ? <Pause className="size-7 fill-current" /> : <Play className="size-7 fill-current" />}
          </button>
          {p.isList && (
            <button type="button" aria-label="Next" disabled={!p.hasNext} onClick={p.onNext} className="glass-btn glass-icon size-10">
              <SkipForward className="size-5 fill-current" />
            </button>
          )}
          <span className="flex-1" />
          <button type="button" className="chip glass-icon" aria-pressed={p.isWatched} disabled={p.isWatched} onClick={p.onMarkWatched}>
            {p.isWatched ? '✓ Watched' : 'Mark watched'}
          </button>
          {p.isList && (
            <label className="chip glass-icon hidden cursor-pointer sm:inline-flex">
              <Switch checked={p.autoplay} onCheckedChange={p.onAutoplayChange} aria-label="Autoplay next" />
              Autoplay
            </label>
          )}
          <span className="flex-1" />
          {p.isList && (
            <button
              type="button"
              aria-label="Playlist"
              aria-pressed={p.playlistOpen}
              onClick={p.onTogglePlaylist}
              className={`glass-btn glass-icon size-10 ${p.playlistOpen ? 'bg-white/20' : ''}`}
            >
              <ListVideo className="size-5" />
            </button>
          )}
          <button type="button" aria-label={copied ? 'Link copied' : 'Share'} onClick={share} className="glass-btn glass-icon size-10">
            <Share2 className="size-5" />
          </button>
          <a
            href={p.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open on YouTube"
            className="glass-btn glass-icon size-10"
          >
            <ExternalLink className="size-5" />
          </a>
        </div>
      </LiquidGlass>
    </div>
  );
}
```

- [ ] **Step 9: Update `src/components/watch/WatchApp.tsx`**

Replace the imports with:

```tsx
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { classifyPlayerError, nextVideoId, prevVideoId, resolveStartVideo, type PlayerErrorAction } from '@/lib/player-logic';
import { createProgressStore } from '@/lib/progress';
import type { PlaylistVideo, WatchCourse } from '@/lib/types';
import { youtubeWatchUrl } from '@/lib/youtube-url';
import Player, { type PlayerHandle } from './Player';
import PlayerMeta from './PlayerMeta';
import PlaylistPanel from './PlaylistPanel';
import WatchControlBar from './WatchControlBar';
```

Add state after `const [reloadKey, setReloadKey] = useState(0);`:

```tsx
  const [playing, setPlaying] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(true);
  const playerRef = useRef<PlayerHandle>(null);
```

Inside the mount `useEffect`, directly after `setAutoplay(store.getPrefs().autoplay);`, add:

```tsx
    setPlaylistOpen(window.matchMedia('(min-width: 1024px)').matches);
```

After the `goNext` function add:

```tsx
  const goPrev = () => {
    const prev = prevVideoId(videos, current, unavailable);
    if (prev) select(prev);
  };

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (p.isPlaying()) p.pause();
    else p.play();
  };
```

Replace `const hasNext = !!nextVideoId(videos, current, unavailable);` with:

```tsx
  const hasNext = !!nextVideoId(videos, current, unavailable);
  const hasPrev = !!prevVideoId(videos, current, unavailable);
  const showList = isList && playlistOpen;
```

Replace the whole `return ( … );` block with:

```tsx
  return (
    <>
      <div className={`grid gap-4 ${showList ? 'lg:grid-cols-[minmax(0,1fr)_380px]' : ''}`}>
        <div className="min-w-0 space-y-4 lg:col-start-1">
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
            {current && (
              <Player
                key={reloadKey}
                ref={playerRef}
                videoId={current}
                startSeconds={startAt}
                onProgress={onProgress}
                onEnded={onEnded}
                onError={onError}
                onPlayingChange={setPlaying}
              />
            )}
            {error && current && (
              <div className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center">
                <div className="glass max-w-sm space-y-3 p-5">
                  <p>{error === 'embed-blocked' ? "This video can't be played here." : 'Something went wrong loading this video.'}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {error === 'retry' && (
                      <button type="button" className="chip" onClick={() => { setError(null); setReloadKey((k) => k + 1); }}>
                        Retry
                      </button>
                    )}
                    <a className="chip" href={youtubeWatchUrl(current, course.listId)} target="_blank" rel="noopener noreferrer">
                      Watch on YouTube ↗
                    </a>
                    {hasNext && (
                      <button type="button" className="chip" onClick={() => goNext()}>
                        Skip to next
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          {current && <PlayerMeta course={course} videoTitle={video?.title ?? course.title} />}
        </div>
        {showList && (
          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <PlaylistPanel
              title={course.title}
              videos={videos}
              current={current}
              watched={watched}
              unavailable={unavailable}
              onSelect={select}
            />
          </div>
        )}
        <div className="min-w-0 lg:col-start-1">{children}</div>
      </div>
      {current && (
        <WatchControlBar
          isList={isList}
          hasPrev={hasPrev}
          hasNext={hasNext}
          playing={playing}
          isWatched={watched.has(current)}
          autoplay={autoplay}
          playlistOpen={playlistOpen}
          youtubeUrl={youtubeWatchUrl(current, course.listId)}
          onPrev={goPrev}
          onNext={() => goNext()}
          onTogglePlay={togglePlay}
          onMarkWatched={markWatched}
          onAutoplayChange={(v) => {
            setAutoplay(v);
            store.setPrefs({ autoplay: v });
          }}
          onTogglePlaylist={() => setPlaylistOpen((o) => !o)}
        />
      )}
    </>
  );
```

- [ ] **Step 10: Type-check, unit tests, e2e**

Run: `pnpm --package=typescript@5 dlx tsc --noEmit -p .` → exit 0.
Run: `pnpm test` → all pass.
Run: server procedure, `pnpm e2e` (all specs) → all pass. Stop the server.

- [ ] **Step 11: Full verification**

Run: `pnpm verify` → unit tests pass, build passes, `OK: … courses …`.

- [ ] **Step 12: Commit**

```bash
git add src/lib/player-logic.ts tests/unit/player-logic.test.ts src/components/watch playwright.config.ts tests/e2e/watch.spec.ts
git commit -m "feat: floating liquid-glass control bar on the watch page"
```

---

## Spec coverage map

| Spec section | Task |
|---|---|
| §3.1 physics, §3.2 maps, §3.3 filter, §3.4 params, §3.5 support | 1 |
| §4 LiquidGlass, ProgressiveBlur, `.glass-icon` | 2 |
| §4 TopBar, ChipBar, IconRail/RailPopover, CategorySidebar drawer, AppShell | 3 |
| §4 Player handle, PlayerMeta, WatchControlBar, WatchApp; §5 goPrev + playlist toggle | 4 |
| §6 fallbacks (non-Chromium, reduced motion, SSR, canvas failure, size 0) | 1 (support), 2 (component + e2e), 3 (phone e2e) |
| §7 testing | 1–4 |
| §2 remove GlassSurface | 2 |

Minor naming deviation from spec §4: hover/active/focus styles live on a separate `.glass-btn` class (so non-interactive labels can carry `.glass-icon` without hover scaling).
