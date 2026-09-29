import { describe, expect, it } from 'vitest';
import { buildSearchIndex, createSearch } from '@/lib/search';
import type { Course } from '@/lib/types';

const course = (over: Partial<Course>): Course => ({
  id: 'x', title: 'X', url: 'https://youtu.be/QnbsCC8wvJk', authors: [], notes: [], lang: 'en', categoryName: 'Python',
  categorySlug: 'python', group: 'Languages', kind: 'playlist', listId: 'PL', videoCount: 3, firstVideoId: 'QnbsCC8wvJk',
  thumbVideoId: 'QnbsCC8wvJk', ...over,
});

describe('search', () => {
  const courses = [
    course({ id: 'py', title: 'Python for Everybody', authors: ['Charles Severance'] }),
    course({ id: 'algo', title: 'Algorithms', authors: ['Abdul Bari'], categoryName: 'Algorithms & Data Structures' }),
    course({ id: 'odd', title: 'Odd link', kind: 'unknown', url: 'https://www.youtube.com/results?q=1', videoCount: 0, thumbVideoId: null }),
  ];
  const index = buildSearchIndex(courses);

  it('builds compact entries with hrefs', () => {
    expect(index[0]).toEqual({ id: 'py', t: 'Python for Everybody', a: 'Charles Severance', c: 'Python', l: 'en', v: 'QnbsCC8wvJk', n: 3, h: '/watch/py' });
    expect(index[2].h).toBe('https://www.youtube.com/results?q=1');
  });

  it('finds by fuzzy title, author and category', () => {
    const ms = createSearch(index);
    expect(ms.search('pythn')[0].id).toBe('py');
    expect(ms.search('bari')[0].id).toBe('algo');
    expect(ms.search('data struct')[0].id).toBe('algo');
  });
});
