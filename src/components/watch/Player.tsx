import { useEffect, useRef, useState } from 'react';
import { loadYouTubeApi } from '@/lib/yt-api';

interface Props {
  videoId: string;
  startSeconds: number;
  onProgress(t: number, duration: number): void;
  onEnded(): void;
  onError(code: number): void;
}

const POLL_MS = 5000;

export default function Player({ videoId, startSeconds, onProgress, onEnded, onError }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YT.Player | null>(null);
  const ready = useRef(false);
  const want = useRef({ videoId, startSeconds });
  const loaded = useRef(videoId);
  const cb = useRef({ onProgress, onEnded, onError });
  cb.current = { onProgress, onEnded, onError };
  want.current = { videoId, startSeconds };
  const [apiFailed, setApiFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi()
      .then((api) => {
        if (cancelled || !host.current) return;
        const el = document.createElement('div');
        host.current.appendChild(el);
        player.current = new api.Player(el, {
          host: 'https://www.youtube-nocookie.com',
          videoId: want.current.videoId,
          width: '100%',
          height: '100%',
          playerVars: { rel: 0, playsinline: 1, start: Math.floor(want.current.startSeconds) },
          events: {
            onReady: () => {
              ready.current = true;
              if (want.current.videoId !== loaded.current) {
                loaded.current = want.current.videoId;
                player.current?.loadVideoById({ videoId: want.current.videoId, startSeconds: want.current.startSeconds });
              }
            },
            onStateChange: (e) => {
              if (e.data === api.PlayerState.ENDED) cb.current.onEnded();
            },
            onError: (e) => cb.current.onError(e.data),
          },
        } as YT.PlayerOptions);
      })
      .catch(() => !cancelled && setApiFailed(true));
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
      ready.current = false;
      if (host.current) host.current.innerHTML = '';
    };
  }, []);

  useEffect(() => {
    if (!ready.current || videoId === loaded.current) return;
    loaded.current = videoId;
    player.current?.loadVideoById({ videoId, startSeconds });
  }, [videoId, startSeconds]);

  useEffect(() => {
    const report = () => {
      const p = player.current;
      if (!ready.current || !p) return;
      const d = p.getDuration();
      if (d > 0) cb.current.onProgress(p.getCurrentTime(), d);
    };
    const timer = window.setInterval(() => {
      if (player.current?.getPlayerState?.() === 1) report();
    }, POLL_MS);
    window.addEventListener('pagehide', report);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', report);
    };
  }, []);

  if (apiFailed) {
    return (
      <div className="grid size-full place-items-center p-6 text-center text-sm text-white/70">
        <p>
          The YouTube player could not load.{' '}
          <a className="underline" href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer">
            Watch on YouTube ↗
          </a>
        </p>
      </div>
    );
  }
  return <div ref={host} className="size-full [&>iframe]:size-full" />;
}
