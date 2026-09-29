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
