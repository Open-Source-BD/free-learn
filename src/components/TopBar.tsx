import { Menu, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import LiquidGlass from '@/components/glass/LiquidGlass';
import { CHROME_GLASS } from '@/lib/liquid-glass/params';
import SearchDialog from '@/components/SearchDialog';

export default function TopBar() {
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
    <header className="fixed inset-x-3 top-3 z-40">
      <LiquidGlass borderRadius={28} height="56px" params={CHROME_GLASS}>
        <div className="flex h-full w-full items-center gap-3 px-2">
          <button
            type="button"
            aria-label="Open categories"
            className="glass-btn glass-icon size-9 md:hidden"
            onClick={() => window.dispatchEvent(new Event('fl:open-sidebar'))}
          >
            <Menu className="size-5" />
          </button>
          <a href="/" className="glass-icon shrink-0 text-base font-semibold tracking-tight">
            ◐ FreeLearn
          </a>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="ml-auto flex w-full max-w-md items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-left text-sm text-white/85 hover:bg-white/10"
          >
            <Search className="glass-icon size-4" />
            <span className="glass-icon flex-1">Search courses…</span>
            <kbd className="glass-icon hidden text-xs text-white/60 sm:inline">⌘K</kbd>
          </button>
        </div>
      </LiquidGlass>
      <SearchDialog open={open} onOpenChange={setOpen} />
    </header>
  );
}
