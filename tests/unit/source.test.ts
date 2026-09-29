import { describe, expect, it } from 'vitest';
import { listSourceCourses } from '@/lib/source';
import type { RawCatalog, RawCourse } from '@/lib/types';

const course = (title: string, url: string, category = 'Python'): RawCourse => ({
  title, url, authors: [], notes: [], category, section_path: [category], language: 'x',
});
const block = (courses: RawCourse[]) => ({ language: 'x', code: 'x', source: '', license: '', count: courses.length, courses });

describe('listSourceCourses', () => {
  it('lists courses in en, bn, hi order with ids and parsed urls', () => {
    const raw: RawCatalog = {
      hi: block([course('C', 'https://youtu.be/QnbsCC8wvJk')]),
      en: block([course('A', 'https://www.youtube.com/playlist?list=PLa')]),
      bn: block([course('B', 'https://www.youtube.com/watch?v=8hly31xKli0')]),
    };
    const out = listSourceCourses(raw);
    expect(out.map((c) => [c.lang, c.raw.title, c.parsed.kind])).toEqual([
      ['en', 'A', 'playlist'],
      ['bn', 'B', 'video'],
      ['hi', 'C', 'video'],
    ]);
    expect(out[0].id).toMatch(/^a-[0-9a-f]{6}$/);
  });

  it('keeps only the first occurrence of a URL across languages and categories', () => {
    const url = 'https://www.youtube.com/playlist?list=PLdup';
    const raw: RawCatalog = {
      en: block([course('Algorithms', url, 'Algorithms'), course('Algorithms again', ` ${url} `, 'Computer Science')]),
      hi: block([course('Algorithms (Hindi list)', url)]),
    };
    const out = listSourceCourses(raw);
    expect(out).toHaveLength(1);
    expect(out[0].lang).toBe('en');
    expect(out[0].raw.category).toBe('Algorithms');
  });

  it('tolerates missing language blocks', () => {
    expect(listSourceCourses({})).toEqual([]);
  });
});
