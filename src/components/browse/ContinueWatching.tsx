import { useEffect, useState } from 'react';
import { pickContinue, type ContinueItem } from '@/lib/continue';
import { createProgressStore } from '@/lib/progress';
import type { SearchEntry } from '@/lib/types';
import { formatDuration } from '@/lib/format';
import { thumbUrl } from '@/lib/youtube-url';
import ShelfRow from './ShelfRow';

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
    <ShelfRow title="Continue watching">
      {items.map((i) => (
        <a key={i.id} href={i.href} className="group block w-[280px] shrink-0 snap-start" data-testid="continue-card">
          <div className="thumb-skeleton relative aspect-video overflow-hidden rounded-md">
            <img src={thumbUrl(i.videoId)} alt="" loading="lazy" className="size-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <span className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
              <span className="block h-full bg-red-500" style={{ width: `${i.total ? (i.watchedCount / i.total) * 100 : 0}%` }} />
            </span>
          </div>
          <h3 className="mt-2 line-clamp-1 text-sm font-semibold">{i.title}</h3>
          <p className="text-xs text-white/60">
            {i.resumeAt >= 5 && <>Resume at {formatDuration(i.resumeAt)} · </>}
            {i.watchedCount} of {i.total} done
          </p>
        </a>
      ))}
    </ShelfRow>
  );
}
