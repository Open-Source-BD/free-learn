import { describe, expect, it } from 'vitest';
import { assignSlugs, slugify } from '@/lib/slug';

describe('slugify', () => {
  it.each([
    ['Algorithms & Data Structures', 'algorithms-data-structures'],
    ['C++', 'c-plus-plus'],
    ['C#', 'c-sharp'],
    ['C', 'c'],
    ['ASP.NET', 'asp-net'],
    ['Nest.js', 'nest-js'],
    ['Bash / Shell', 'bash-shell'],
    ['পাইথন', ''],
    ['  Hello   World  ', 'hello-world'],
  ])('%s → %s', (input, out) => expect(slugify(input)).toBe(out));
});

describe('assignSlugs', () => {
  it('suffixes collisions and falls back for empty slugs', () => {
    const m = assignSlugs(['C++', 'C ++', 'পাইথন', 'Go']);
    expect(m.get('C++')).toBe('c-plus-plus');
    expect(m.get('C ++')).toBe('c-plus-plus-2');
    expect(m.get('পাইথন')).toBe('category');
    expect(m.get('Go')).toBe('go');
  });
});
