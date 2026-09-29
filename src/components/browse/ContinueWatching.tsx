import { useEffect, useState } from 'react';
import { pickContinue, type ContinueItem } from '@/lib/continue';
import { createProgressStore } from '@/lib/progress';
import type { SearchEntry } from '@/lib/types';
import { thumbUrl } from '@/lib/youtube-url';

export default function ContinueWatching() {
  const [items, setItems] = useState<ContinueItem[]>([]);

  useEffect(() => {
    const recent = createProgressStore().recent(20);
    if (recent.length === 0) return;
    fetch('/search-index.json')
      .then((r) => (r.ok ? (r.json() as Promise<SearchEntry[]>) : []))
      .then((entries) => setItems(pickContinue(recent, new Map(entries.map((e) => [e.id, e])))))
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;
  return (
    <section aria-labelledby="continue-h" className="space-y-2">
      <h2 id="continue-h" className="px-1 text-base font-semibold">
        Continue watching
      </h2>
      <div className="grid auto-cols-[minmax(220px,300px)] grid-flow-col justify-start gap-3 overflow-x-auto pb-2">
        {items.map((i) => (
          <a key={i.id} href={i.href} className="group block" data-testid="continue-card">
            <div className="relative aspect-video overflow-hidden rounded-md bg-white/5">
              <img src={thumbUrl(i.videoId)} alt="" loading="lazy" className="size-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <span className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                <span className="block h-full bg-red-500" style={{ width: `${i.total ? (i.watchedCount / i.total) * 100 : 0}%` }} />
              </span>
            </div>
            <h3 className="mt-2 line-clamp-1 text-sm font-semibold">{i.title}</h3>
            <p className="text-xs text-white/60">
              {i.watchedCount} / {i.total} watched
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}
