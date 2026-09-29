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
