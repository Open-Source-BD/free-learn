import { canonicalCategory, GROUP_ORDER, groupOf, refineCategory } from './categories';
import { assignSlugs } from './slug';
import { listSourceCourses } from './source';
import type {
  Catalog, CategoryNode, Course, CourseCardData, PlaylistFile, PlaylistVideo, RawCatalog, WatchCourse,
} from './types';

export { courseHref } from './href';

/** Source titles carry markdown escapes (e.g. `\\|`); ids still come from the raw title. */
const cleanTitle = (t: string) => t.replace(/\\(.)/g, '$1').replace(/\s+/g, ' ').trim();
const categoryOf = (raw: { category: string; title: string }) => refineCategory(canonicalCategory(raw.category), raw.title);

export function buildCatalog(raw: RawCatalog, playlists: Map<string, PlaylistFile>): Catalog {
  const sources = listSourceCourses(raw);
  const slugs = assignSlugs([...new Set(sources.map((s) => categoryOf(s.raw)))]);
  const courses: Course[] = [];
  const videos = new Map<string, PlaylistVideo[]>();

  for (const s of sources) {
    const categoryName = categoryOf(s.raw);
    const base = {
      id: s.id,
      title: cleanTitle(s.raw.title),
      url: s.raw.url,
      authors: s.raw.authors,
      notes: s.raw.notes,
      lang: s.lang,
      categoryName,
      categorySlug: slugs.get(categoryName)!,
      group: groupOf(categoryName),
    };
    const p = s.parsed;
    if (p.kind === 'video') {
      courses.push({ ...base, kind: 'video', listId: null, videoCount: 1, firstVideoId: p.videoId, thumbVideoId: p.videoId });
      videos.set(s.id, [{ id: p.videoId, title: base.title, duration: null }]);
    } else if (p.kind === 'playlist' || p.kind === 'channel') {
      const pf = playlists.get(s.id);
      if (!pf || pf.videos.length === 0) continue;
      const start =
        p.kind === 'playlist' && p.videoId && pf.videos.some((v) => v.id === p.videoId) ? p.videoId : pf.videos[0].id;
      courses.push({
        ...base,
        kind: p.kind,
        listId: p.kind === 'playlist' ? p.listId : null,
        videoCount: pf.videos.length,
        firstVideoId: start,
        thumbVideoId: start,
      });
      videos.set(s.id, pf.videos);
    } else {
      courses.push({ ...base, kind: 'unknown', listId: null, videoCount: 0, firstVideoId: null, thumbVideoId: null });
    }
  }

  return { courses, categories: buildCategoryTree(courses), videosFor: (id) => videos.get(id) ?? [] };
}

function buildCategoryTree(courses: Course[]): CategoryNode[] {
  const byGroup = new Map<string, Map<string, { name: string; slug: string; count: number }>>();
  for (const c of courses) {
    const items = byGroup.get(c.group) ?? new Map();
    byGroup.set(c.group, items);
    const item = items.get(c.categorySlug) ?? { name: c.categoryName, slug: c.categorySlug, count: 0 };
    item.count += 1;
    items.set(c.categorySlug, item);
  }
  return GROUP_ORDER.filter((g) => byGroup.has(g)).map((group) => ({
    group,
    items: [...byGroup.get(group)!.values()].sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

export function toCardData(c: Course): CourseCardData {
  return {
    id: c.id, title: c.title, url: c.url, authors: c.authors, lang: c.lang, kind: c.kind, videoCount: c.videoCount,
    thumbVideoId: c.thumbVideoId,
  };
}

export function toWatchCourse(c: Course): WatchCourse {
  return {
    id: c.id, title: c.title, url: c.url, authors: c.authors, lang: c.lang, categoryName: c.categoryName,
    categorySlug: c.categorySlug, kind: c.kind, listId: c.listId,
  };
}
