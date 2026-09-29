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
