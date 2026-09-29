import MiniSearch from 'minisearch';
import { useEffect, useMemo, useState } from 'react';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { LANG_LABEL } from '@/lib/filter';
import { createSearch } from '@/lib/search';
import type { SearchEntry } from '@/lib/types';
import { thumbUrl } from '@/lib/youtube-url';

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
}

export default function SearchDialog({ open, onOpenChange }: Props) {
  const [ms, setMs] = useState<MiniSearch<SearchEntry> | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!open || ms) return;
    setFailed(false);
    fetch('/search-index.json')
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<SearchEntry[]>;
      })
      .then((entries) => setMs(createSearch(entries)))
      .catch(() => setFailed(true));
  }, [open, ms]);

  const results = useMemo(
    () => (ms && q.trim() ? (ms.search(q.trim()).slice(0, 30) as unknown as SearchEntry[]) : []),
    [ms, q],
  );

  const go = (e: SearchEntry) => {
    if (e.h.startsWith('/')) window.location.href = e.h;
    else window.open(e.h, '_blank', 'noopener,noreferrer');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-white/10 bg-black/60 p-0 backdrop-blur-2xl sm:max-w-xl">
        <DialogTitle className="sr-only">Search courses</DialogTitle>
        <Command shouldFilter={false} className="bg-transparent">
          <CommandInput value={q} onValueChange={setQ} placeholder="Search courses, authors, topics…" />
          <CommandList className="max-h-[60vh]">
            {failed && <p className="p-4 text-sm text-white/60">Search is unavailable right now.</p>}
            {!failed && q.trim() && <CommandEmpty>No courses found.</CommandEmpty>}
            {results.map((e) => (
              <CommandItem key={e.id} value={e.id} onSelect={() => go(e)} className="gap-3">
                {e.v ? (
                  <img src={thumbUrl(e.v)} alt="" className="aspect-video w-20 shrink-0 rounded-md object-cover" loading="lazy" />
                ) : (
                  <span className="aspect-video w-20 shrink-0 rounded-md bg-white/5" />
                )}
                <span className="min-w-0">
                  <span className="line-clamp-1 font-medium">{e.t}</span>
                  <span className="line-clamp-1 text-xs text-white/55">
                    {[e.a, e.c, LANG_LABEL[e.l]].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
