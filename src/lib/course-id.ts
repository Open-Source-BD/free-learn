import { createHash } from 'node:crypto';
import { slugify } from './slug';

export function courseId(title: string, url: string): string {
  const slug = slugify(title).slice(0, 60).replace(/-+$/, '') || 'course';
  const hash = createHash('sha1').update(url.trim()).digest('hex').slice(0, 6);
  return `${slug}-${hash}`;
}
