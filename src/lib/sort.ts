export type SortKey = 'default' | 'most' | 'short' | 'long';

export const SORT_OPTIONS: readonly { value: SortKey; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'most', label: 'Most videos' },
  { value: 'short', label: 'Shortest' },
  { value: 'long', label: 'Longest' },
];

const KEYS = new Set<SortKey>(['default', 'most', 'short', 'long']);

export function parseSort(search: string): SortKey {
  const s = new URLSearchParams(search).get('sort') as SortKey | null;
  return s && KEYS.has(s) ? s : 'default';
}

/** Adds/replaces/removes `sort` in a query string, keeping every other param. */
export function withSort(search: string, sort: SortKey): string {
  const p = new URLSearchParams(search);
  if (sort === 'default') p.delete('sort');
  else p.set('sort', sort);
  const s = p.toString();
  return s ? `?${s}` : '';
}

type Sortable = { videoCount: number; totalSeconds: number | null };

/** Returns a new array; unknown lengths always sort last. */
export function sortCourses<T extends Sortable>(items: T[], sort: SortKey): T[] {
  const out = [...items];
  const byLength = (dir: 1 | -1) => (a: T, b: T) => {
    if (a.totalSeconds == null) return b.totalSeconds == null ? 0 : 1;
    if (b.totalSeconds == null) return -1;
    return dir * (a.totalSeconds - b.totalSeconds);
  };
  if (sort === 'most') out.sort((a, b) => b.videoCount - a.videoCount);
  else if (sort === 'short') out.sort(byLength(1));
  else if (sort === 'long') out.sort(byLength(-1));
  return out;
}
