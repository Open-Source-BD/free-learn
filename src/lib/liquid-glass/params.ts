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

/** Large text panels (rail popover): gentler bend and more blur so text stays readable. */
export const PANEL_GLASS: Partial<GlassParams> = { specularOpacity: 0.3, refraction: 0.45, blur: 4 };

/** Dark wash behind panel text. */
export const PANEL_TINT = 'rgba(10, 10, 12, 0.55)';
