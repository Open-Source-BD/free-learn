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
