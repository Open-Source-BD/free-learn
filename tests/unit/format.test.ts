import { describe, expect, it } from 'vitest';
import { formatDuration } from '@/lib/format';

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [51, '0:51'],
    [3068, '51:08'],
    [3725, '1:02:05'],
    [59.7, '0:59'],
  ])('%d → %s', (s, out) => expect(formatDuration(s)).toBe(out));

  it('returns empty string for unknown', () => {
    expect(formatDuration(null)).toBe('');
    expect(formatDuration(-1)).toBe('');
  });
});
