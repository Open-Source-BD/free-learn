import { Check, ExternalLink, ListVideo, Pause, Play, Share2, SkipBack, SkipForward } from 'lucide-react';
import { useState } from 'react';
import LiquidGlass from '@/components/glass/LiquidGlass';
import { Switch } from '@/components/ui/switch';

interface Props {
  isList: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  playing: boolean;
  isWatched: boolean;
  autoplay: boolean;
  playlistOpen: boolean;
  youtubeUrl: string;
  onPrev(): void;
  onNext(): void;
  onTogglePlay(): void;
  onMarkWatched(): void;
  onAutoplayChange(v: boolean): void;
  onTogglePlaylist(): void;
}

export default function WatchControlBar(p: Props) {
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
    <div className="fixed bottom-5 left-1/2 z-40 w-[min(720px,92vw)] -translate-x-1/2" data-testid="control-bar">
      <LiquidGlass borderRadius={32} height="64px">
        <div className="flex h-full w-full items-center gap-1 px-2 sm:gap-2">
          {p.isList && (
            <button type="button" aria-label="Previous" disabled={!p.hasPrev} onClick={p.onPrev} className="glass-btn glass-icon size-10 shrink-0">
              <SkipBack className="size-5 fill-current" />
            </button>
          )}
          <button type="button" aria-label={p.playing ? 'Pause' : 'Play'} onClick={p.onTogglePlay} className="glass-btn glass-icon size-11 shrink-0">
            {p.playing ? <Pause className="size-7 fill-current" /> : <Play className="size-7 fill-current" />}
          </button>
          {p.isList && (
            <button type="button" aria-label="Next" disabled={!p.hasNext} onClick={p.onNext} className="glass-btn glass-icon size-10 shrink-0">
              <SkipForward className="size-5 fill-current" />
            </button>
          )}
          <span className="flex-1" />
          <button
            type="button"
            className="chip glass-icon min-w-10 shrink-0 justify-center"
            aria-label={p.isWatched ? '✓ Watched' : 'Mark watched'}
            aria-pressed={p.isWatched}
            disabled={p.isWatched}
            onClick={p.onMarkWatched}
          >
            <Check className="size-5 sm:hidden" aria-hidden="true" />
            <span className="hidden sm:inline">{p.isWatched ? '✓ Watched' : 'Mark watched'}</span>
          </button>
          {p.isList && (
            <label className="chip glass-icon hidden cursor-pointer sm:inline-flex">
              <Switch checked={p.autoplay} onCheckedChange={p.onAutoplayChange} aria-label="Autoplay next" />
              Autoplay
            </label>
          )}
          <span className="flex-1" />
          {p.isList && (
            <button
              type="button"
              aria-label="Playlist"
              aria-pressed={p.playlistOpen}
              onClick={p.onTogglePlaylist}
              className={`glass-btn glass-icon size-10 shrink-0 ${p.playlistOpen ? 'bg-white/20' : ''}`}
            >
              <ListVideo className="size-5" />
            </button>
          )}
          <button type="button" aria-label={copied ? 'Link copied' : 'Share'} onClick={share} className="glass-btn glass-icon hidden size-10 shrink-0 sm:inline-grid">
            <Share2 className="size-5" />
          </button>
          <a
            href={p.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open on YouTube"
            className="glass-btn glass-icon hidden size-10 shrink-0 sm:inline-grid"
          >
            <ExternalLink className="size-5" />
          </a>
        </div>
        <span className="sr-only" aria-live="polite">
          {copied ? 'Link copied' : ''}
        </span>
      </LiquidGlass>
    </div>
  );
}
