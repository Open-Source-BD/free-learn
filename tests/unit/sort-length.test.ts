import { describe, expect, it } from 'vitest';
import { courseLength, formatLength, formatLengthLong } from '@/lib/length';
import { parseSort, SORT_OPTIONS, sortCourses, withSort } from '@/lib/sort';

describe('courseLength', () => {
  it('sums durations when at least 80% of videos have one', () => {
    expect(courseLength([{ duration: 60 }, { duration: 120 }, { duration: 30 }, { duration: 30 }, { duration: null }])).toBe(240);
  });
  it('returns null when durations are mostly missing or the list is empty', () => {
    expect(courseLength([{ duration: 60 }, { duration: null }])).toBeNull();
    expect(courseLength([])).toBeNull();
  });
});

describe('formatLength', () => {
  it.each([
    [null, ''],
    [59, '1 m'],
    [45 * 60, '45 m'],
    [3600 * 21 + 60 * 12, '21 h'],
    [3600 + 60 * 40, '2 h'],
  ])('%s → %s', (s, out) => expect(formatLength(s)).toBe(out));

  it.each([
    [null, ''],
    [45 * 60, '45 m'],
    [3600 * 21 + 60 * 12, '21 h 12 m'],
    [7200, '2 h'],
  ])('long %s → %s', (s, out) => expect(formatLengthLong(s)).toBe(out));
});

describe('sort', () => {
  const items = [
    { id: 'a', videoCount: 10, totalSeconds: 3000 },
    { id: 'b', videoCount: 84, totalSeconds: null },
    { id: 'c', videoCount: 30, totalSeconds: 600 },
    { id: 'd', videoCount: 1, totalSeconds: 90000 },
  ];
  const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

  it('keeps source order by default and does not mutate the input', () => {
    expect(ids(sortCourses(items, 'default'))).toEqual(['a', 'b', 'c', 'd']);
    sortCourses(items, 'most');
    expect(ids(items)).toEqual(['a', 'b', 'c', 'd']);
  });
  it('orders by most videos, shortest and longest (unknown length last)', () => {
    expect(ids(sortCourses(items, 'most'))).toEqual(['b', 'c', 'a', 'd']);
    expect(ids(sortCourses(items, 'short'))).toEqual(['c', 'a', 'd', 'b']);
    expect(ids(sortCourses(items, 'long'))).toEqual(['d', 'a', 'c', 'b']);
  });
  it('reads and writes ?sort= next to other params', () => {
    expect(parseSort('?lang=bn&sort=short')).toBe('short');
    expect(parseSort('?sort=nope')).toBe('default');
    expect(withSort('?lang=bn', 'long')).toBe('?lang=bn&sort=long');
    expect(withSort('', 'default')).toBe('');
    expect(withSort('?sort=most', 'default')).toBe('');
  });
  it('labels the options', () => {
    expect(SORT_OPTIONS.map((o) => o.label)).toEqual(['Default', 'Most videos', 'Shortest', 'Longest']);
  });
});
