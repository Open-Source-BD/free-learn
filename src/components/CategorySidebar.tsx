import { Brain, Cloud, Code2, Cpu, Globe, House, Shapes, Smartphone, Wrench, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import LiquidGlass from '@/components/glass/LiquidGlass';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { CategoryGroup, CategoryNode } from '@/lib/types';

const ICONS: Record<CategoryGroup, LucideIcon> = {
  Languages: Code2,
  'CS Fundamentals': Cpu,
  Web: Globe,
  Mobile: Smartphone,
  'Data & AI': Brain,
  'Cloud & DevOps': Cloud,
  Tools: Wrench,
  Other: Shapes,
};

const TINTS: Record<CategoryGroup, [string, string]> = {
  Languages: ['#60a5fa', '#2563eb'],
  'CS Fundamentals': ['#a78bfa', '#7c3aed'],
  Web: ['#34d399', '#059669'],
  Mobile: ['#f472b6', '#db2777'],
  'Data & AI': ['#fbbf24', '#d97706'],
  'Cloud & DevOps': ['#38bdf8', '#0284c7'],
  Tools: ['#94a3b8', '#475569'],
  Other: ['#fb7185', '#e11d48'],
};

interface Props {
  categories: CategoryNode[];
  activeSlug?: string;
  docked?: boolean;
}

function Nav({ categories, activeSlug }: Omit<Props, 'docked'>) {
  const item = (active: boolean) =>
    `flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/10 ${active ? 'bg-white/10 font-medium' : 'text-white/80'}`;
  return (
    <nav aria-label="Categories" className="w-full space-y-3 text-left">
      <a href="/" className={item(!activeSlug)}>
        <span className="flex items-center gap-2">
          <House className="size-4" /> Home
        </span>
      </a>
      {categories.map((g) => {
        const Icon = ICONS[g.group];
        const [c1, c2] = TINTS[g.group];
        return (
          <section key={g.group}>
            <h2 className="mb-1 flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
              <span
                className="grid size-5 place-items-center rounded-md text-white"
                style={{ background: `linear-gradient(135deg, ${c1}, ${c2})`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.45), 0 2px 8px ${c2}66` }}
              >
                <Icon className="size-3" />
              </span>
              {g.group}
            </h2>
            <ul>
              {g.items.map((i) => (
                <li key={i.slug}>
                  <a href={`/c/${i.slug}`} className={item(i.slug === activeSlug)} aria-current={i.slug === activeSlug ? 'page' : undefined}>
                    <span className="truncate">{i.name}</span>
                    <span className="text-xs text-white/40">{i.count}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </nav>
  );
}

export default function CategorySidebar({ categories, activeSlug, docked = true }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('fl:open-sidebar', onOpen);
    return () => window.removeEventListener('fl:open-sidebar', onOpen);
  }, []);

  return (
    <>
      {docked && (
        <aside className="sticky top-20 hidden h-[calc(100dvh-6rem)] w-60 shrink-0 md:block">
          <LiquidGlass borderRadius={18} height="100%">
            <div className="h-full w-full overflow-y-auto p-1">
              <Nav categories={categories} activeSlug={activeSlug} />
            </div>
          </LiquidGlass>
        </aside>
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 overflow-y-auto border-white/10 bg-black/60 p-3 backdrop-blur-2xl">
          <SheetHeader className="px-2">
            <SheetTitle>Categories</SheetTitle>
          </SheetHeader>
          <Nav categories={categories} activeSlug={activeSlug} />
        </SheetContent>
      </Sheet>
    </>
  );
}
