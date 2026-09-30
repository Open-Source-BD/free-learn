const MIN_COVERAGE = 0.8;

/** Total seconds of a course, or null when too few videos report a duration to be trustworthy. */
export function courseLength(videos: { duration: number | null }[]): number | null {
  if (videos.length === 0) return null;
  const known = videos.filter((v) => typeof v.duration === 'number');
  if (known.length / videos.length < MIN_COVERAGE) return null;
  return known.reduce((sum, v) => sum + (v.duration as number), 0);
}

/** Compact length for cards: "45 m" or "21 h". */
export function formatLength(seconds: number | null): string {
  if (seconds == null) return '';
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} m`;
  return `${Math.round(seconds / 3600)} h`;
}

/** Precise length for headers: "45 m", "2 h" or "21 h 12 m". */
export function formatLengthLong(seconds: number | null): string {
  if (seconds == null) return '';
  const totalMin = Math.round(seconds / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${Math.max(1, m)} m`;
  return m === 0 ? `${h} h` : `${h} h ${m} m`;
}
