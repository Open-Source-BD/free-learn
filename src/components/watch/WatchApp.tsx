import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { classifyPlayerError, nextVideoId, resolveStartVideo, type PlayerErrorAction } from '@/lib/player-logic';
import { createProgressStore } from '@/lib/progress';
import type { PlaylistVideo, WatchCourse } from '@/lib/types';
import { youtubeWatchUrl } from '@/lib/youtube-url';
import Player from './Player';
import PlayerMeta from './PlayerMeta';
import PlaylistPanel from './PlaylistPanel';

interface Props {
  course: WatchCourse;
  videos: PlaylistVideo[];
  children?: ReactNode;
}

export default function WatchApp({ course, videos, children }: Props) {
  const store = useMemo(() => createProgressStore(), []);
  const [current, setCurrent] = useState<string | null>(null);
  const [startAt, setStartAt] = useState(0);
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());
  const [autoplay, setAutoplay] = useState(true);
  const [error, setError] = useState<PlayerErrorAction | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const isList = videos.length > 1;

  useEffect(() => {
    const saved = store.get(course.id);
    const requested = new URLSearchParams(window.location.search).get('v');
    const id = resolveStartVideo(videos, requested, saved?.lastVideo ?? null);
    if (id && requested !== id) history.replaceState(null, '', `?v=${id}`);
    setCurrent(id);
    setStartAt(id && saved && id === saved.lastVideo ? saved.t : 0);
    setWatched(new Set(saved?.watched ?? []));
    setAutoplay(store.getPrefs().autoplay);

    const onPop = () => {
      setError(null);
      setCurrent(resolveStartVideo(videos, new URLSearchParams(window.location.search).get('v'), null));
      setStartAt(0);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const select = (id: string, replace = false) => {
    setError(null);
    setCurrent(id);
    setStartAt(0);
    if (replace) history.replaceState(null, '', `?v=${id}`);
    else history.pushState(null, '', `?v=${id}`);
  };

  const goNext = (skip: Set<string> = unavailable, replace = false) => {
    const next = nextVideoId(videos, current, skip);
    if (next) select(next, replace);
  };

  const markWatched = () => {
    if (!current) return;
    store.markWatched(course.id, current);
    setWatched(new Set(store.get(course.id)?.watched ?? []));
  };

  const onProgress = (t: number, duration: number) => {
    if (!current) return;
    if (store.reportTime(course.id, current, t, duration)) setWatched(new Set(store.get(course.id)?.watched ?? []));
  };

  const onEnded = () => {
    markWatched();
    if (autoplay) goNext();
  };

  const onError = (code: number) => {
    const action = classifyPlayerError(code);
    if (action === 'skip' && current) {
      const skip = new Set(unavailable).add(current);
      setUnavailable(skip);
      if (nextVideoId(videos, current, skip)) {
        goNext(skip, true);
        return;
      }
    }
    setError(action === 'skip' ? 'embed-blocked' : action);
  };

  const video = videos.find((v) => v.id === current);
  const hasNext = !!nextVideoId(videos, current, unavailable);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-4 lg:col-start-1">
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
          {current && (
            <Player
              key={reloadKey}
              videoId={current}
              startSeconds={startAt}
              onProgress={onProgress}
              onEnded={onEnded}
              onError={onError}
            />
          )}
          {error && current && (
            <div className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center">
              <div className="glass max-w-sm space-y-3 p-5">
                <p>{error === 'embed-blocked' ? "This video can't be played here." : 'Something went wrong loading this video.'}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {error === 'retry' && (
                    <button type="button" className="chip" onClick={() => { setError(null); setReloadKey((k) => k + 1); }}>
                      Retry
                    </button>
                  )}
                  <a className="chip" href={youtubeWatchUrl(current, course.listId)} target="_blank" rel="noopener noreferrer">
                    Watch on YouTube ↗
                  </a>
                  {hasNext && (
                    <button type="button" className="chip" onClick={() => goNext()}>
                      Skip to next
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        {current && (
          <PlayerMeta
            course={course}
            videoId={current}
            videoTitle={video?.title ?? course.title}
            isWatched={watched.has(current)}
            autoplay={autoplay}
            showAutoplay={isList}
            onMarkWatched={markWatched}
            onAutoplayChange={(v) => {
              setAutoplay(v);
              store.setPrefs({ autoplay: v });
            }}
          />
        )}
      </div>
      {isList && (
        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <PlaylistPanel
            title={course.title}
            videos={videos}
            current={current}
            watched={watched}
            unavailable={unavailable}
            onSelect={select}
          />
        </div>
      )}
      <div className="min-w-0 lg:col-start-1">{children}</div>
    </div>
  );
}
