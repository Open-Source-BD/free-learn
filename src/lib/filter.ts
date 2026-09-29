import type { LangCode } from './types';

export interface GridFilter {
  lang: 'all' | LangCode;
  type: 'all' | 'playlist';
}

export const DEFAULT_FILTER: GridFilter = { lang: 'all', type: 'all' };

export const LANG_OPTIONS: readonly { value: GridFilter['lang']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'en', label: 'English' },
  { value: 'bn', label: 'বাংলা' },
  { value: 'hi', label: 'हिन्दी' },
];

export const LANG_LABEL: Record<LangCode, string> = { en: 'English', bn: 'বাংলা', hi: 'हिन्दी' };

export function parseFilter(search: string): GridFilter {
  const p = new URLSearchParams(search);
  const l = p.get('lang');
  return {
    lang: l === 'en' || l === 'bn' || l === 'hi' ? l : 'all',
    type: p.get('type') === 'playlist' ? 'playlist' : 'all',
  };
}

export function filterToSearch(f: GridFilter): string {
  const p = new URLSearchParams();
  if (f.lang !== 'all') p.set('lang', f.lang);
  if (f.type !== 'all') p.set('type', f.type);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function applyFilter<T extends { lang: LangCode; videoCount: number }>(items: T[], f: GridFilter): T[] {
  return items.filter((c) => (f.lang === 'all' || c.lang === f.lang) && (f.type === 'all' || c.videoCount > 1));
}
