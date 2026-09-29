/** SVG filters inside `backdrop-filter` only work in Chromium-based browsers. */
export function supportsSvgBackdrop(ua: string): boolean {
  if (/Firefox\//.test(ua)) return false;
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return false;
  return true;
}
