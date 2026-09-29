import { useState } from 'react';
import LiquidGlass from '@/components/glass/LiquidGlass';
import { Switch } from '@/components/ui/switch';
import { LANG_LABEL } from '@/lib/filter';
import type { WatchCourse } from '@/lib/types';
import { youtubeWatchUrl } from '@/lib/youtube-url';

interface Props {
  course: WatchCourse;
  videoId: string;
  videoTitle: string;
  isWatched: boolean;
  autoplay: boolean;
  showAutoplay: boolean;
  onMarkWatched(): void;
  onAutoplayChange(v: boolean): void;
}

export default function PlayerMeta(p: Props) {
  const [copied, setCopied] = useState(false);
  const share = () =>
    navigator.clipboard
      ?.writeText(window.location.href)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});

  return (
    <LiquidGlass borderRadius={18}>
      <div className="w-full space-y-2 p-2 text-left">
        <h1 className="text-lg leading-snug font-semibold">{p.videoTitle}</h1>
        <p className="text-sm text-white/60">
          {p.course.title !== p.videoTitle && <>{p.course.title} · </>}
          {p.course.authors.length > 0 && <>{p.course.authors.join(', ')} · </>}
          {LANG_LABEL[p.course.lang]} ·{' '}
          <a className="underline-offset-2 hover:underline" href={`/c/${p.course.categorySlug}`}>
            {p.course.categoryName}
          </a>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="chip" aria-pressed={p.isWatched} onClick={p.onMarkWatched} disabled={p.isWatched}>
            {p.isWatched ? '✓ Watched' : 'Mark watched'}
          </button>
          {p.showAutoplay && (
            <label className="chip cursor-pointer">
              <Switch checked={p.autoplay} onCheckedChange={p.onAutoplayChange} aria-label="Autoplay next" />
              Autoplay next
            </label>
          )}
          <a className="chip" href={youtubeWatchUrl(p.videoId, p.course.listId)} target="_blank" rel="noopener noreferrer">
            Open on YouTube ↗
          </a>
          <button type="button" className="chip" onClick={share}>
            {copied ? 'Link copied' : 'Share'}
          </button>
        </div>
      </div>
    </LiquidGlass>
  );
}
