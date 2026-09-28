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
