import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCatalog } from './catalog';
import type { Catalog, PlaylistFile, RawCatalog } from './types';

let cached: Catalog | null = null;

export function loadCatalog(root: string = process.cwd()): Catalog {
  if (cached) return cached;
  const raw = JSON.parse(readFileSync(join(root, 'data/courses-all.json'), 'utf8')) as RawCatalog;
  const dir = join(root, 'data/playlists');
  const playlists = new Map<string, PlaylistFile>();
  if (existsSync(dir)) {
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.json')) continue;
      const pf = JSON.parse(readFileSync(join(dir, f), 'utf8')) as PlaylistFile;
      playlists.set(pf.courseId, pf);
    }
  }
  cached = buildCatalog(raw, playlists);
  return cached;
}
