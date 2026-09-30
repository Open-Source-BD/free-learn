import LiquidGlass from '@/components/glass/LiquidGlass';
import { PANEL_GLASS, PANEL_TINT } from '@/lib/liquid-glass/params';
import type { CategoryNode } from '@/lib/types';

interface Props {
  id: string;
  node: CategoryNode;
  activeSlug?: string;
}

export default function RailPopover({ id, node, activeSlug }: Props) {
  return (
    <div id={id} role="group" aria-label={node.group} className="absolute top-0 left-[64px] w-64">
      <LiquidGlass borderRadius={20} params={PANEL_GLASS} tint={PANEL_TINT}>
        <div className="max-h-[calc(100dvh-120px)] w-full overflow-y-auto">
          <p className="glass-icon px-2 pb-1 text-[11px] font-semibold tracking-wider text-white/75 uppercase">{node.group}</p>
          <ul>
            {node.items.map((i) => (
              <li key={i.slug}>
                <a
                  href={`/c/${i.slug}`}
                  aria-current={i.slug === activeSlug ? 'page' : undefined}
                  className={`glass-icon flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/10 ${i.slug === activeSlug ? 'bg-white/15 font-medium' : ''}`}
                >
                  <span className="truncate">{i.name}</span>
                  <span className="text-xs text-white/60">{i.count}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </LiquidGlass>
    </div>
  );
}
