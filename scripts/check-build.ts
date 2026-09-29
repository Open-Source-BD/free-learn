import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadCatalog } from '../src/lib/load-catalog';

const dist = join(process.cwd(), 'dist');
const { courses, categories } = loadCatalog();
const problems: string[] = [];

if (!existsSync(join(dist, 'index.html'))) problems.push('missing dist/index.html — run `pnpm build` first');

for (const c of courses) {
  if (c.kind === 'unknown') {
    if (!/^https?:\/\//.test(c.url)) problems.push(`link-out course without a URL: ${c.id}`);
    continue;
  }
  if (!c.firstVideoId) problems.push(`no playable video: ${c.id}`);
  if (!existsSync(join(dist, 'watch', c.id, 'index.html'))) problems.push(`missing watch page: ${c.id}`);
}
for (const item of categories.flatMap((g) => g.items)) {
  if (!existsSync(join(dist, 'c', item.slug, 'index.html'))) problems.push(`missing category page: ${item.slug}`);
}
if (!existsSync(join(dist, 'search-index.json'))) problems.push('missing search-index.json');

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
const playable = courses.filter((c) => c.kind !== 'unknown').length;
console.log(`OK: ${courses.length} courses (${playable} playable), ${categories.flatMap((g) => g.items).length} categories`);
