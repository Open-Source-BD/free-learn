import { describe, expect, it } from 'vitest';
import { classifyPlayerError, nextVideoId, resolveStartVideo } from '@/lib/player-logic';

const vids = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

describe('resolveStartVideo', () => {
  it('prefers requested, then resume, then first', () => {
    expect(resolveStartVideo(vids, 'c', 'b')).toBe('c');
    expect(resolveStartVideo(vids, null, 'b')).toBe('b');
    expect(resolveStartVideo(vids, null, null)).toBe('a');
  });

  it('ignores requested/resume ids that are not in the list', () => {
    expect(resolveStartVideo(vids, 'gone', 'b')).toBe('b');
    expect(resolveStartVideo(vids, 'gone', 'also-gone')).toBe('a');
  });

  it('returns null for an empty list', () => {
    expect(resolveStartVideo([], 'a', 'a')).toBeNull();
  });
});

describe('nextVideoId', () => {
  it('returns the next available video', () => {
    expect(nextVideoId(vids, 'a')).toBe('b');
    expect(nextVideoId(vids, 'a', new Set(['b', 'c']))).toBe('d');
  });

  it('returns null at the end or when nothing is left', () => {
    expect(nextVideoId(vids, 'd')).toBeNull();
    expect(nextVideoId(vids, 'b', new Set(['c', 'd']))).toBeNull();
  });

  it('starts from the beginning when current is unknown', () => {
    expect(nextVideoId(vids, 'zzz')).toBe('a');
  });
});

describe('classifyPlayerError', () => {
  it.each([
    [101, 'embed-blocked'],
    [150, 'embed-blocked'],
    [153, 'embed-blocked'],
    [100, 'skip'],
    [2, 'retry'],
    [5, 'retry'],
  ] as const)('%i → %s', (code, action) => expect(classifyPlayerError(code)).toBe(action));
});
