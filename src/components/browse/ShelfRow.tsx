import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  title: string;
  /** "View all" target; omitted for rows without a page (e.g. Continue watching) */
  href?: string;
  children: ReactNode;
}

/**
 * Horizontal, snap-scrolling row with glass ‹ › arrows. The track is padded past the
 * glass rail on desktop so the first tile starts clear of it and later tiles slide under it.
 */
export default function ShelfRow({ title, href, children }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => {
      setCanPrev(el.scrollLeft > 4);
      setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, []);

  const slide = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: reduced ? 'auto' : 'smooth' });
  };

  const arrow = 'glass glass-btn glass-icon size-9 rounded-full';

  return (
    <section className="space-y-3" data-testid="shelf" aria-label={title}>
      <div className="flex items-center gap-3 px-1 md:pl-[68px]">
        <h2 className="text-lg font-semibold">{title}</h2>
        {href && (
          <a href={href} className="text-sm text-white/60 hover:text-white">
            View all →
          </a>
        )}
        {(canPrev || canNext) && (
          <div className="ml-auto flex gap-2">
            <button type="button" aria-label="Previous" disabled={!canPrev} onClick={() => slide(-1)} className={arrow}>
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" aria-label="Next" disabled={!canNext} onClick={() => slide(1)} className={arrow}>
              <ChevronRight className="size-5" />
            </button>
          </div>
        )}
      </div>
      <div
        ref={track}
        data-testid="shelf-track"
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 [scrollbar-width:none] md:scroll-pl-[68px] md:pl-[68px] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </section>
  );
}
