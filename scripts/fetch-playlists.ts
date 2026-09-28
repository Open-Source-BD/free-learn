import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { listSourceCourses } from '../src/lib/source';
import type { FetchReport, PlaylistFile, PlaylistVideo, RawCatalog } from '../src/lib/types';
import { isVideoId } from '../src/lib/youtube-url';

export type YtDlpRunner = (url: string, maxItems?: number) => Promise<unknown>;

const CHANNEL_CAP = 200;
const DEAD_TITLE = /^\[(Private|Deleted) video\]$/i;

export const defaultRunner: YtDlpRunner = (url, maxItems) =>
  new Promise((resolve, reject) => {
    const args = ['--flat-playlist', '-J', '--no-warnings', ...(maxItems ? ['--playlist-end', String(maxItems)] : []), url];
    execFile('yt-dlp', args, { maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        const last = stderr.trim().split('\n').pop();
        reject(new Error(last || err.message));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(e);
      }
    });
  });

export function toPlaylistFile(
  courseId: string,
  sourceUrl: string,
  kind: 'playlist' | 'channel',
  json: unknown,
): PlaylistFile {
  const j = (json ?? {}) as { title?: unknown; channel?: unknown; uploader?: unknown; entries?: unknown };
  const entries = Array.isArray(j.entries) ? j.entries : [];
  const seen = new Set<string>();
  const videos: PlaylistVideo[] = [];
  for (const e of entries as Record<string, unknown>[]) {
    if (!e || typeof e.id !== 'string' || !isVideoId(e.id)) continue;
    const title = typeof e.title === 'string' ? e.title : 'Untitled';
    if (DEAD_TITLE.test(title) || seen.has(e.id)) continue;
    seen.add(e.id);
    videos.push({ id: e.id, title, duration: typeof e.duration === 'number' ? e.duration : null });
  }
  return {
    courseId,
    sourceUrl,
    kind,
    fetchedAt: new Date().toISOString(),
    title: typeof j.title === 'string' ? j.title : '',
    channel: typeof j.channel === 'string' ? j.channel : typeof j.uploader === 'string' ? j.uploader : '',
    videos,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchAll(opts: {
  raw: RawCatalog;
  outDir: string;
  refresh?: boolean;
  runner?: YtDlpRunner;
  sleepMs?: number;
  log?: (msg: string) => void;
}): Promise<FetchReport> {
  const { raw, outDir, refresh = false, runner = defaultRunner, sleepMs = 1500, log = console.log } = opts;
  await mkdir(outDir, { recursive: true });
  const report: FetchReport = { ok: [], skipped: [], empty: [], failed: [] };
  const targets = listSourceCourses(raw).filter((c) => c.parsed.kind === 'playlist' || c.parsed.kind === 'channel');

  for (const [i, c] of targets.entries()) {
    const p = c.parsed;
    if (p.kind !== 'playlist' && p.kind !== 'channel') continue;
    const file = join(outDir, `${c.id}.json`);
    if (!refresh && existsSync(file)) {
      report.skipped.push(c.id);
      continue;
    }
    const target = p.kind === 'channel' ? p.channelUrl : `https://www.youtube.com/playlist?list=${p.listId}`;
    const tag = `[${i + 1}/${targets.length}]`;
    try {
      const json = await runner(target, p.kind === 'channel' ? CHANNEL_CAP : undefined);
      const pf = toPlaylistFile(c.id, c.raw.url, p.kind, json);
      if (pf.videos.length === 0) {
        report.empty.push(c.id);
        if (existsSync(file)) await rm(file);
        log(`${tag} EMPTY   ${c.raw.title}`);
      } else {
        await writeFile(file, JSON.stringify(pf, null, 2) + '\n');
        report.ok.push(c.id);
        log(`${tag} ${String(pf.videos.length).padStart(4)} videos  ${c.raw.title}`);
      }
    } catch (e) {
      report.failed.push({ courseId: c.id, url: c.raw.url, error: e instanceof Error ? e.message : String(e) });
      log(`${tag} FAILED  ${c.raw.title}`);
    }
    if (sleepMs) await sleep(sleepMs);
  }
  return report;
}

async function main() {
  try {
    await new Promise<void>((resolve, reject) => execFile('yt-dlp', ['--version'], (err) => (err ? reject(err) : resolve())));
  } catch {
    console.error('yt-dlp is not installed or not on PATH. Install it with: brew install yt-dlp');
    process.exit(1);
  }
  const root = process.cwd();
  const raw = JSON.parse(await readFile(join(root, 'data/courses-all.json'), 'utf8')) as RawCatalog;
  const report = await fetchAll({ raw, outDir: join(root, 'data/playlists'), refresh: process.argv.includes('--refresh') });
  await writeFile(join(root, 'data/fetch-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(
    `done: ${report.ok.length} ok, ${report.skipped.length} skipped, ${report.empty.length} empty, ${report.failed.length} failed`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
