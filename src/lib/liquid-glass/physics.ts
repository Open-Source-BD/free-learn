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
