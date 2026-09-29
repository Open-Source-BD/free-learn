import { Menu, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import LiquidGlass from '@/components/glass/LiquidGlass';
import SearchDialog from '@/components/SearchDialog';

export default function TopBar({ menuOnDesktop = false }: { menuOnDesktop?: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="sticky top-2 z-40 mx-2 mt-2 md:mx-4">
      <LiquidGlass borderRadius={18}>
        <div className="flex w-full items-center gap-3 px-2">
          <button
            type="button"
            aria-label="Open categories"
            className={`rounded-lg p-2 hover:bg-white/10 ${menuOnDesktop ? '' : 'md:hidden'}`}
            onClick={() => window.dispatchEvent(new Event('fl:open-sidebar'))}
          >
            <Menu className="size-5" />
          </button>
          <a href="/" className="shrink-0 font-semibold tracking-tight">
            ◐ FreeLearn
          </a>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="ml-auto flex w-full max-w-md items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-left text-sm text-white/60 hover:bg-white/10"
          >
            <Search className="size-4" />
            <span className="flex-1">Search courses…</span>
            <kbd className="hidden text-xs text-white/40 sm:inline">⌘K</kbd>
          </button>
        </div>
      </LiquidGlass>
      <SearchDialog open={open} onOpenChange={setOpen} />
    </header>
  );
}
