import MiniSearch from 'minisearch';
import { courseHref } from './href';
import type { Course, SearchEntry } from './types';

export function buildSearchIndex(courses: Course[]): SearchEntry[] {
  return courses.map((c) => ({
    id: c.id,
    t: c.title,
    a: c.authors.join(', '),
    c: c.categoryName,
    l: c.lang,
    v: c.thumbVideoId,
    n: c.videoCount,
    h: courseHref(c),
  }));
}

export function createSearch(entries: SearchEntry[]): MiniSearch<SearchEntry> {
  const ms = new MiniSearch<SearchEntry>({
    fields: ['t', 'a', 'c'],
    storeFields: ['id', 't', 'a', 'c', 'l', 'v', 'n', 'h'],
    searchOptions: { prefix: true, fuzzy: 0.2, boost: { t: 3, c: 1.5 }, combineWith: 'AND' },
  });
  ms.addAll(entries);
  return ms;
}
