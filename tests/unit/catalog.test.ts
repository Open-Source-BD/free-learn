import { describe, expect, it } from 'vitest';
import { buildCatalog, courseHref, toCardData } from '@/lib/catalog';
import { courseId } from '@/lib/course-id';
import type { PlaylistFile, RawCatalog, RawCourse } from '@/lib/types';

const c = (title: string, url: string, category: string): RawCourse => ({
  title, url, authors: ['Author'], notes: [], category, section_path: [category], language: 'x',
});
const block = (courses: RawCourse[]) => ({ language: 'x', code: 'x', source: '', license: '', count: courses.length, courses });

const PL = 'https://www.youtube.com/watch?v=bbbbbbbbbbb&list=PLone';
const PL_MISSING = 'https://www.youtube.com/playlist?list=PLmissing';
const VIDEO = 'https://youtu.be/QnbsCC8wvJk';
const ODD = 'https://www.youtube.com/results?search_query=x';

const raw: RawCatalog = {
  en: block([c('Algo', PL, 'Algorithms and Data Structures'), c('Gone', PL_MISSING, 'Python'), c('Odd', ODD, 'Misc')]),
  bn: block([c('ভিডিও', VIDEO, '<a id="cpp"></a>C++')]),
};

const pf = (id: string, ids: string[]): PlaylistFile => ({
  courseId: id, sourceUrl: '', kind: 'playlist', fetchedAt: '', title: '', channel: '',
  videos: ids.map((v) => ({ id: v, title: v, duration: 10 })),
});

describe('buildCatalog', () => {
  const algoId = courseId('Algo', PL);
  const cat = buildCatalog(raw, new Map([[algoId, pf(algoId, ['aaaaaaaaaaa', 'bbbbbbbbbbb'])]]));

  it('excludes playlists without fetched videos and keeps the rest', () => {
    expect(cat.courses.map((x) => x.title)).toEqual(['Algo', 'Odd', 'ভিডিও']);
  });

  it('uses the URL start video when it is in the playlist', () => {
    const algo = cat.courses.find((x) => x.title === 'Algo')!;
    expect(algo).toMatchObject({
      kind: 'playlist', listId: 'PLone', videoCount: 2, firstVideoId: 'bbbbbbbbbbb', thumbVideoId: 'bbbbbbbbbbb',
      categoryName: 'Algorithms & Data Structures', categorySlug: 'algorithms-data-structures', group: 'CS Fundamentals', lang: 'en',
    });
    expect(cat.videosFor(algo.id).map((v) => v.id)).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb']);
  });

  it('turns single videos into 1-video courses', () => {
    const v = cat.courses.find((x) => x.lang === 'bn')!;
    expect(v).toMatchObject({ kind: 'video', videoCount: 1, firstVideoId: 'QnbsCC8wvJk', categoryName: 'C++', categorySlug: 'c-plus-plus' });
    expect(cat.videosFor(v.id)).toEqual([{ id: 'QnbsCC8wvJk', title: 'ভিডিও', duration: null }]);
  });

  it('keeps unknown URLs as link-out courses', () => {
    const odd = cat.courses.find((x) => x.title === 'Odd')!;
    expect(odd).toMatchObject({ kind: 'unknown', videoCount: 0, firstVideoId: null, group: 'Other' });
    expect(courseHref(odd)).toBe(ODD);
    expect(cat.videosFor(odd.id)).toEqual([]);
  });

  it('builds a category tree in group order with counts, omitting empty categories', () => {
    expect(cat.categories).toEqual([
      { group: 'Languages', items: [{ name: 'C++', slug: 'c-plus-plus', count: 1 }] },
      { group: 'CS Fundamentals', items: [{ name: 'Algorithms & Data Structures', slug: 'algorithms-data-structures', count: 1 }] },
      { group: 'Other', items: [{ name: 'Misc', slug: 'misc', count: 1 }] },
    ]);
  });

  it('produces unique ids', () => {
    const ids = cat.courses.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('builds hrefs and card data', () => {
    const algo = cat.courses.find((x) => x.title === 'Algo')!;
    expect(courseHref(algo)).toBe(`/watch/${algo.id}`);
    expect(toCardData(algo)).toEqual({
      id: algo.id, title: 'Algo', url: PL, authors: ['Author'], lang: 'en', kind: 'playlist', videoCount: 2, thumbVideoId: 'bbbbbbbbbbb',
    });
  });
});
