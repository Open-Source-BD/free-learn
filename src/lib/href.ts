import type { Course } from './types';

export function courseHref(c: Pick<Course, 'id' | 'kind' | 'url'>): string {
  return c.kind === 'unknown' ? c.url : `/watch/${c.id}`;
}
