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
