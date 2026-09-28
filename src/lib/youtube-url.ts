import type { ParsedUrl } from './types';

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const UNKNOWN: ParsedUrl = { kind: 'unknown' };

export function isVideoId(s: string): boolean {
  return VIDEO_ID.test(s);
}

function isYouTubeHost(host: string): boolean {
  return (
    host === 'youtube.com' ||
    host.endsWith('.youtube.com') ||
    host === 'youtu.be' ||
    host === 'youtube-nocookie.com' ||
    host.endsWith('.youtube-nocookie.com')
  );
}

export function parseYouTubeUrl(raw: string): ParsedUrl {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return UNKNOWN;
  }
  const host = url.hostname.toLowerCase();
  if (!isYouTubeHost(host)) return UNKNOWN;

  const parts = url.pathname.split('/').filter(Boolean);
  if (host === 'youtu.be') {
    const id = parts[0];
    return id && isVideoId(id) ? { kind: 'video', videoId: id } : UNKNOWN;
  }

  const first = parts[0] ?? '';
  const list = url.searchParams.get('list');
  const v = url.searchParams.get('v');

  if (list && (first === 'playlist' || first === 'watch')) {
    return v && isVideoId(v) ? { kind: 'playlist', listId: list, videoId: v } : { kind: 'playlist', listId: list };
  }
  if (first === 'watch') {
    return v && isVideoId(v) ? { kind: 'video', videoId: v } : UNKNOWN;
  }
  if (['embed', 'shorts', 'live', 'v'].includes(first) && parts[1] && isVideoId(parts[1])) {
    return { kind: 'video', videoId: parts[1] };
  }
  if (first.startsWith('@')) {
    return { kind: 'channel', channelUrl: `https://www.youtube.com/${first}/videos` };
  }
  if (['channel', 'c', 'user'].includes(first) && parts[1]) {
    return { kind: 'channel', channelUrl: `https://www.youtube.com/${first}/${parts[1]}/videos` };
  }
  return UNKNOWN;
}

export function thumbUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

export function youtubeWatchUrl(videoId: string, listId?: string | null): string {
  return `https://www.youtube.com/watch?v=${videoId}${listId ? `&list=${listId}` : ''}`;
}
