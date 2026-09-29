import { courseId } from './course-id';
import type { LangCode, ParsedUrl, RawCatalog, RawCourse } from './types';
import { parseYouTubeUrl } from './youtube-url';

export const LANG_CODES: LangCode[] = ['en', 'bn', 'hi'];

export interface SourceCourse {
  id: string;
  lang: LangCode;
  raw: RawCourse;
  parsed: ParsedUrl;
}

export function listSourceCourses(raw: RawCatalog): SourceCourse[] {
  const seenUrls = new Set<string>();
  const out: SourceCourse[] = [];
  for (const lang of LANG_CODES) {
    for (const c of raw[lang]?.courses ?? []) {
      const url = c.url.trim();
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);
      out.push({ id: courseId(c.title, url), lang, raw: { ...c, url }, parsed: parseYouTubeUrl(url) });
    }
  }
  return out;
}
