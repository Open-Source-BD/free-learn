export function resolveStartVideo(
  videos: { id: string }[],
  requested: string | null,
  resume: string | null,
): string | null {
  if (videos.length === 0) return null;
  const has = (id: string | null): id is string => !!id && videos.some((v) => v.id === id);
  if (has(requested)) return requested;
  if (has(resume)) return resume;
  return videos[0].id;
}

export function nextVideoId(
  videos: { id: string }[],
  current: string | null,
  unavailable: Set<string> = new Set(),
): string | null {
  const i = videos.findIndex((v) => v.id === current);
  for (let j = i + 1; j < videos.length; j++) {
    if (!unavailable.has(videos[j].id)) return videos[j].id;
  }
  return null;
}

export type PlayerErrorAction = 'embed-blocked' | 'skip' | 'retry';

export function classifyPlayerError(code: number): PlayerErrorAction {
  if (code === 101 || code === 150 || code === 153) return 'embed-blocked';
  if (code === 100) return 'skip';
  return 'retry';
}
