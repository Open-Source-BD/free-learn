import { useEffect, useRef } from 'react';
import { formatDuration } from '@/lib/format';
import { courseLength, formatLengthLong } from '@/lib/length';
import type { PlaylistVideo } from '@/lib/types';
import { thumbUrl } from '@/lib/youtube-url';

interface Props {
  title: string;
  videos: PlaylistVideo[];
  current: string | null;
  watched: Set<string>;
  unavailable: Set<string>;
  onSelect(id: string): void;
}

export default function PlaylistPanel({ title, videos, current, watched, unavailable, onSelect }: Props) {
  const active = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    active.current?.scrollIntoView({ block: 'nearest' });
  }, [current]);

  const index = videos.findIndex((v) => v.id === current);
  const done = videos.filter((v) => watched.has(v.id)).length;
  const total = formatLengthLong(courseLength(videos));

  return (
    <aside className="glass flex max-h-[70vh] flex-col lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)]" data-testid="playlist">
      <div className="border-b border-white/10 p-3">
        <h2 className="line-clamp-1 font-semibold">{title}</h2>
        <p className="text-xs text-white/60">
          {index + 1} / {videos.length}
          {total && <> · {total} total</>} · {done} watched
        </p>
        <div className="mt-2 h-1 rounded bg-white/15">
          <div className="h-full rounded bg-white" style={{ width: `${(done / videos.length) * 100}%` }} />
        </div>
      </div>
      <ol className="flex-1 overflow-y-auto p-1.5">
        {videos.map((v, i) => {
          const on = v.id === current;
          const off = unavailable.has(v.id);
          return (
            <li key={v.id}>
              <button
                ref={on ? active : undefined}
                type="button"
                disabled={off}
                aria-current={on ? 'true' : undefined}
                onClick={() => onSelect(v.id)}
                className={`flex w-full items-center gap-2 rounded-lg p-1.5 text-left text-sm hover:bg-white/10 disabled:cursor-not-allowed ${on ? 'bg-white/15' : ''} ${off ? 'opacity-40' : ''}`}
              >
                <span className="w-6 shrink-0 text-center text-xs text-white/60">
                  {on ? '▶' : watched.has(v.id) ? <span className="text-emerald-400">✓</span> : i + 1}
                </span>
                <img src={thumbUrl(v.id)} alt="" loading="lazy" className="aspect-video w-24 shrink-0 rounded-md bg-white/5 object-cover" />
                <span className="min-w-0">
                  <span className="line-clamp-2 leading-snug">{v.title}</span>
                  {v.duration != null && <span className="text-xs text-white/50">{formatDuration(v.duration)}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
