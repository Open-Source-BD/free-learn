import { House } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { CategoryNode } from '@/lib/types';
import { GROUP_ICONS, GROUP_TINTS } from './nav/group-style';

interface Props {
  categories: CategoryNode[];
  activeSlug?: string;
}

function Nav({ categories, activeSlug }: Props) {
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
        const Icon = GROUP_ICONS[g.group];
        const [c1, c2] = GROUP_TINTS[g.group];
        return (
          <section key={g.group}>
            <h2 className="mb-1 flex items-center gap-2 px-2 text-[11px] font-semibold tracking-wider text-white/50 uppercase">
              <span className="grid size-5 place-items-center rounded-md text-white" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
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

export default function CategorySidebar({ categories, activeSlug }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('fl:open-sidebar', onOpen);
    return () => window.removeEventListener('fl:open-sidebar', onOpen);
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-72 overflow-y-auto border-white/10 bg-black/60 p-3 backdrop-blur-2xl">
        <SheetHeader className="px-2">
          <SheetTitle>Categories</SheetTitle>
        </SheetHeader>
        <Nav categories={categories} activeSlug={activeSlug} />
      </SheetContent>
    </Sheet>
  );
}
