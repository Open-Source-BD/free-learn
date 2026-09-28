import { describe, expect, it } from 'vitest';
import { createProgressStore, type StorageLike } from '@/lib/progress';

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
}

describe('progress store', () => {
  it('persists position across store instances', () => {
    const s = new MemoryStorage();
    createProgressStore(s, () => 100).savePosition('c1', 'v1', 42.5);
    expect(createProgressStore(s).get('c1')).toEqual({ watched: [], lastVideo: 'v1', t: 42.5, updatedAt: 100 });
  });

  it('marks watched at 90% but not before', () => {
    const st = createProgressStore(new MemoryStorage());
    expect(st.reportTime('c1', 'v1', 50, 100)).toBe(false);
    expect(st.isWatched('c1', 'v1')).toBe(false);
    expect(st.reportTime('c1', 'v1', 90, 100)).toBe(true);
    expect(st.isWatched('c1', 'v1')).toBe(true);
    expect(st.reportTime('c1', 'v1', 95, 100)).toBe(false);
    expect(st.reportTime('c1', 'v2', 10, 0)).toBe(false);
  });

  it('markWatched is idempotent', () => {
    const st = createProgressStore(new MemoryStorage());
    st.markWatched('c1', 'v1');
    st.markWatched('c1', 'v1');
    expect(st.get('c1')!.watched).toEqual(['v1']);
  });

  it('recovers from corrupt JSON and malformed entries', () => {
    const s = new MemoryStorage();
    s.setItem('fl:progress:v1', '{not json');
    expect(createProgressStore(s).all()).toEqual({});

    s.setItem('fl:progress:v1', JSON.stringify({
      good: { watched: ['a', 5], lastVideo: 'a', t: 1, updatedAt: 2 },
      bad1: 'x',
      bad2: { watched: 'nope', lastVideo: 'a', t: 1, updatedAt: 2 },
    }));
    expect(createProgressStore(s).all()).toEqual({ good: { watched: ['a'], lastVideo: 'a', t: 1, updatedAt: 2 } });

    s.setItem('fl:progress:v1', '[1,2,3]');
    expect(createProgressStore(s).all()).toEqual({});
  });

  it('keeps working in memory when storage throws or is missing', () => {
    const throwing: StorageLike = {
      getItem() { throw new Error('SecurityError'); },
      setItem() { throw new Error('QuotaExceededError'); },
    };
    const st = createProgressStore(throwing);
    expect(() => st.savePosition('c1', 'v1', 3)).not.toThrow();
    expect(st.get('c1')?.t).toBe(3);

    const none = createProgressStore(null);
    none.markWatched('c2', 'v');
    expect(none.isWatched('c2', 'v')).toBe(true);
  });

  it('returns most recent courses first, limited', () => {
    let t = 0;
    const st = createProgressStore(new MemoryStorage(), () => ++t);
    st.savePosition('a', 'v', 1);
    st.savePosition('b', 'v', 1);
    st.savePosition('c', 'v', 1);
    st.savePosition('a', 'v', 2);
    expect(st.recent(2).map((r) => r.courseId)).toEqual(['a', 'c']);
  });

  it('stores prefs with autoplay defaulting to true', () => {
    const s = new MemoryStorage();
    expect(createProgressStore(s).getPrefs()).toEqual({ autoplay: true });
    createProgressStore(s).setPrefs({ autoplay: false });
    expect(createProgressStore(s).getPrefs()).toEqual({ autoplay: false });
    s.setItem('fl:prefs:v1', '{"autoplay":"yes"}');
    expect(createProgressStore(s).getPrefs()).toEqual({ autoplay: true });
  });
});
