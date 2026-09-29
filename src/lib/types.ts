export type ParsedUrl =
  | { kind: 'video'; videoId: string }
  | { kind: 'playlist'; listId: string; videoId?: string }
  | { kind: 'channel'; channelUrl: string }
  | { kind: 'unknown' };

export type CategoryGroup =
  | 'Languages'
  | 'CS Fundamentals'
  | 'Web'
  | 'Mobile'
  | 'Data & AI'
  | 'Cloud & DevOps'
  | 'Tools'
  | 'Other';

export type LangCode = 'en' | 'bn' | 'hi';

export interface RawCourse {
  title: string;
  url: string;
  authors: string[];
  notes: string[];
  category: string;
  section_path: string[];
  language: string;
}

export interface RawLanguageBlock {
  language: string;
  code: string;
  source: string;
  license: string;
  count: number;
  courses: RawCourse[];
}

export type RawCatalog = Partial<Record<LangCode, RawLanguageBlock>>;

export interface PlaylistVideo {
  id: string;
  title: string;
  duration: number | null;
}

export interface PlaylistFile {
  courseId: string;
  sourceUrl: string;
  kind: 'playlist' | 'channel';
  fetchedAt: string;
  title: string;
  channel: string;
  videos: PlaylistVideo[];
}

export interface FetchReport {
  ok: string[];
  skipped: string[];
  empty: string[];
  failed: { courseId: string; url: string; error: string }[];
}

export type CourseKind = 'video' | 'playlist' | 'channel' | 'unknown';

export interface Course {
  id: string;
  title: string;
  url: string;
  authors: string[];
  notes: string[];
  lang: LangCode;
  categoryName: string;
  categorySlug: string;
  group: CategoryGroup;
  kind: CourseKind;
  listId: string | null;
  videoCount: number;
  firstVideoId: string | null;
  thumbVideoId: string | null;
}

export interface CategoryNode {
  group: CategoryGroup;
  items: { name: string; slug: string; count: number }[];
}

export interface Catalog {
  courses: Course[];
  categories: CategoryNode[];
  videosFor(courseId: string): PlaylistVideo[];
}

export type CourseCardData = Pick<Course, 'id' | 'title' | 'url' | 'authors' | 'lang' | 'kind' | 'videoCount' | 'thumbVideoId'>;

export type WatchCourse = Pick<
  Course,
  'id' | 'title' | 'url' | 'authors' | 'lang' | 'categoryName' | 'categorySlug' | 'kind' | 'listId'
>;

export interface SearchEntry {
  id: string;
  t: string;
  a: string;
  c: string;
  l: LangCode;
  v: string | null;
  n: number;
  h: string;
}
