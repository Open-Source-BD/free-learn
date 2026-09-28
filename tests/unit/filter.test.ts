import { describe, expect, it } from 'vitest';
import { applyFilter, DEFAULT_FILTER, filterToSearch, LANG_OPTIONS, parseFilter } from '@/lib/filter';

describe('filter', () => {
  it('parses and ignores junk', () => {
    expect(parseFilter('')).toEqual(DEFAULT_FILTER);
    expect(parseFilter('?lang=bn&type=playlist')).toEqual({ lang: 'bn', type: 'playlist' });
    expect(parseFilter('?lang=fr&type=nope')).toEqual({ lang: 'all', type: 'all' });
  });

  it('round-trips to a query string', () => {
    expect(filterToSearch(DEFAULT_FILTER)).toBe('');
    expect(filterToSearch({ lang: 'hi', type: 'all' })).toBe('?lang=hi');
    expect(filterToSearch({ lang: 'all', type: 'playlist' })).toBe('?type=playlist');
    expect(parseFilter(filterToSearch({ lang: 'en', type: 'playlist' }))).toEqual({ lang: 'en', type: 'playlist' });
  });

  it('filters by language and playlist-ness', () => {
    const items = [
      { id: 1, lang: 'en' as const, videoCount: 1 },
      { id: 2, lang: 'bn' as const, videoCount: 30 },
      { id: 3, lang: 'en' as const, videoCount: 12 },
      { id: 4, lang: 'hi' as const, videoCount: 0 },
    ];
    expect(applyFilter(items, DEFAULT_FILTER).map((i) => i.id)).toEqual([1, 2, 3, 4]);
    expect(applyFilter(items, { lang: 'en', type: 'all' }).map((i) => i.id)).toEqual([1, 3]);
    expect(applyFilter(items, { lang: 'all', type: 'playlist' }).map((i) => i.id)).toEqual([2, 3]);
    expect(applyFilter(items, { lang: 'hi', type: 'playlist' })).toEqual([]);
  });

  it('exposes the chip labels in order', () => {
    expect(LANG_OPTIONS.map((o) => o.label)).toEqual(['All', 'English', 'বাংলা', 'हिन्दी']);
  });
});
