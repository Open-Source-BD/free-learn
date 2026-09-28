export interface CourseProgress {
  watched: string[];
  lastVideo: string;
  t: number;
  updatedAt: number;
}
export type ProgressMap = Record<string, CourseProgress>;
export interface Prefs {
  autoplay: boolean;
}
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export interface ProgressStore {
  all(): ProgressMap;
  get(courseId: string): CourseProgress | undefined;
  savePosition(courseId: string, videoId: string, t: number): void;
  markWatched(courseId: string, videoId: string): void;
  reportTime(courseId: string, videoId: string, t: number, duration: number): boolean;
  isWatched(courseId: string, videoId: string): boolean;
  recent(n: number): { courseId: string; progress: CourseProgress }[];
  getPrefs(): Prefs;
  setPrefs(p: Prefs): void;
}

const PROGRESS_KEY = 'fl:progress:v1';
const PREFS_KEY = 'fl:prefs:v1';
const WATCHED_RATIO = 0.9;

function browserStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined') return null;
    const s = window.localStorage;
    s.getItem('fl:probe');
    return s;
  } catch {
    return null;
  }
}

function readJson(storage: StorageLike | null, key: string): unknown {
  try {
    const v = storage?.getItem(key);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

function writeJson(storage: StorageLike | null, key: string, value: unknown): void {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked: keep the in-memory copy
  }
}

function sanitize(v: unknown): ProgressMap {
  const out: ProgressMap = {};
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  for (const [k, e] of Object.entries(v as Record<string, unknown>)) {
    if (!e || typeof e !== 'object') continue;
    const x = e as Record<string, unknown>;
    if (typeof x.lastVideo !== 'string' || typeof x.t !== 'number' || typeof x.updatedAt !== 'number' || !Array.isArray(x.watched)) {
      continue;
    }
    out[k] = {
      lastVideo: x.lastVideo,
      t: x.t,
      updatedAt: x.updatedAt,
      watched: x.watched.filter((w): w is string => typeof w === 'string'),
    };
  }
  return out;
}

export function createProgressStore(
  storage: StorageLike | null = browserStorage(),
  now: () => number = Date.now,
): ProgressStore {
  const map: ProgressMap = sanitize(readJson(storage, PROGRESS_KEY));
  const rawPrefs = readJson(storage, PREFS_KEY) as { autoplay?: unknown } | null;
  let prefs: Prefs = { autoplay: typeof rawPrefs?.autoplay === 'boolean' ? rawPrefs.autoplay : true };

  const persist = () => writeJson(storage, PROGRESS_KEY, map);
  const entry = (courseId: string, videoId: string): CourseProgress =>
    (map[courseId] ??= { watched: [], lastVideo: videoId, t: 0, updatedAt: 0 });

  const store: ProgressStore = {
    all: () => map,
    get: (courseId) => map[courseId],
    savePosition(courseId, videoId, t) {
      const e = entry(courseId, videoId);
      e.lastVideo = videoId;
      e.t = Math.max(0, t);
      e.updatedAt = now();
      persist();
    },
    markWatched(courseId, videoId) {
      const e = entry(courseId, videoId);
      if (!e.watched.includes(videoId)) e.watched.push(videoId);
      e.updatedAt = now();
      persist();
    },
    reportTime(courseId, videoId, t, duration) {
      store.savePosition(courseId, videoId, t);
      if (duration > 0 && t / duration >= WATCHED_RATIO && !store.isWatched(courseId, videoId)) {
        store.markWatched(courseId, videoId);
        return true;
      }
      return false;
    },
    isWatched: (courseId, videoId) => map[courseId]?.watched.includes(videoId) ?? false,
    recent: (n) =>
      Object.entries(map)
        .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
        .slice(0, n)
        .map(([courseId, progress]) => ({ courseId, progress })),
    getPrefs: () => prefs,
    setPrefs(p) {
      prefs = { autoplay: p.autoplay };
      writeJson(storage, PREFS_KEY, prefs);
    },
  };
  return store;
}
