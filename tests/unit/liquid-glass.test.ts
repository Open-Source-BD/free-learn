import { describe, expect, it } from 'vitest';
import { filterMarkup } from '@/lib/liquid-glass/filter';
import { computeMaps } from '@/lib/liquid-glass/maps';
import { GLASS_DEFAULTS, PANEL_GLASS, PANEL_TINT } from '@/lib/liquid-glass/params';
import { bezelProfile, SAMPLES } from '@/lib/liquid-glass/physics';
import { supportsSvgBackdrop } from '@/lib/liquid-glass/support';

describe('params', () => {
  it('uses the approved defaults', () => {
    expect(GLASS_DEFAULTS).toEqual({
      specularOpacity: 0, specularSaturation: 50, refraction: 1, blur: 1.8, progressiveBlur: 10, glassBgOpacity: 0,
    });
  });
});

describe('glass presets', () => {
  it('makes large panels readable: gentler bend, more blur, dark tint', () => {
    expect(PANEL_GLASS).toEqual({ specularOpacity: 0.3, refraction: 0.45, blur: 4 });
    expect(PANEL_TINT).toBe('rgba(10, 10, 12, 0.55)');
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
  it('displaces the left cap mostly horizontally (inward = +x)', () => {
    const [r, g] = at(m.disp, 5, 20);
    expect(r).toBeGreaterThan(128);
    expect(Math.abs(g - 128)).toBeLessThan(Math.abs(r - 128) / 4);
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
