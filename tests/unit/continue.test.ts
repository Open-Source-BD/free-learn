import { describe, expect, it } from 'vitest';
import { pickContinue } from '@/lib/continue';
import type { SearchEntry } from '@/lib/types';

const entry = (id: string, n: number, h = `/watch/${id}`): SearchEntry => ({ id, t: `T-${id}`, a: '', c: '', l: 'en', v: 'thumbthumb1', n, h });

describe('pickContinue', () => {
  const index = new Map([
    ['a', entry('a', 10)],
    ['b', entry('b', 1)],
    ['odd', entry('odd', 0, 'https://www.youtube.com/x')],
  ]);

  it('maps recent progress to items and drops unknown or link-out courses', () => {
    const recent = [
      { courseId: 'gone', progress: { watched: [], lastVideo: 'x', t: 0, updatedAt: 9 } },
      { courseId: 'a', progress: { watched: ['v1', 'v2'], lastVideo: 'v3', t: 12, updatedAt: 8 } },
      { courseId: 'odd', progress: { watched: [], lastVideo: 'x', t: 0, updatedAt: 7 } },
      { courseId: 'b', progress: { watched: [], lastVideo: 'bv', t: 0, updatedAt: 6 } },
    ];
    expect(pickContinue(recent, index)).toEqual([
      { id: 'a', title: 'T-a', videoId: 'v3', watchedCount: 2, total: 10, href: '/watch/a?v=v3' },
      { id: 'b', title: 'T-b', videoId: 'bv', watchedCount: 0, total: 1, href: '/watch/b?v=bv' },
    ]);
  });

  it('respects the limit', () => {
    const recent = ['a', 'b'].map((id) => ({ courseId: id, progress: { watched: [], lastVideo: 'v', t: 0, updatedAt: 1 } }));
    expect(pickContinue(recent, index, 1)).toHaveLength(1);
  });
});
