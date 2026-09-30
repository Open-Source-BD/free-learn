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
