import type { CourseProgress } from './progress';
import type { SearchEntry } from './types';

export interface ContinueItem {
  id: string;
  title: string;
  videoId: string;
  watchedCount: number;
  total: number;
  href: string;
}

export function pickContinue(
  recent: { courseId: string; progress: CourseProgress }[],
  index: Map<string, SearchEntry>,
  limit = 8,
): ContinueItem[] {
  const out: ContinueItem[] = [];
  for (const { courseId, progress } of recent) {
    const e = index.get(courseId);
    if (!e || !e.h.startsWith('/watch/')) continue;
    out.push({
      id: e.id,
      title: e.t,
      videoId: progress.lastVideo,
      watchedCount: progress.watched.length,
      total: e.n,
      href: `${e.h}?v=${encodeURIComponent(progress.lastVideo)}`,
    });
    if (out.length === limit) break;
  }
  return out;
}
