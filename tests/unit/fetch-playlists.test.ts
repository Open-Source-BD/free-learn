import { mkdtemp, readFile, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { fetchAll, toPlaylistFile } from '../../scripts/fetch-playlists';
import { courseId } from '@/lib/course-id';
import type { RawCatalog } from '@/lib/types';

const PL = 'https://www.youtube.com/playlist?list=PLgood';
const EMPTY = 'https://www.youtube.com/playlist?list=PLdead';
const BROKEN = 'https://www.youtube.com/playlist?list=PLbroken';
const CHANNEL = 'https://www.youtube.com/@someone';
const VIDEO = 'https://www.youtube.com/watch?v=8hly31xKli0';

const raw: RawCatalog = {
  en: {
    language: 'English', code: 'en', source: '', license: '', count: 5,
    courses: [PL, EMPTY, BROKEN, CHANNEL, VIDEO].map((url, i) => ({
      title: `Course ${i}`, url, authors: [], notes: [], category: 'Python', section_path: ['Python'], language: 'English',
    })),
  },
};

const ytJson = (entries: unknown[]) => ({ title: 'List', channel: 'Chan', entries });
const good = ytJson([
  { id: 'aaaaaaaaaaa', title: 'One', duration: 60 },
  { id: 'bbbbbbbbbbb', title: '[Private video]', duration: null },
  { id: 'aaaaaaaaaaa', title: 'One (again)', duration: 60 },
  { id: 'ccccccccccc', title: '[Deleted video]' },
  { id: 'ddddddddddd', title: 'Two' },
]);

function fakeRunner() {
  return vi.fn(async (url: string, max?: number) => {
    if (url.includes('PLgood')) return good;
    if (url.includes('PLdead')) return ytJson([{ id: 'eeeeeeeeeee', title: '[Private video]' }]);
    if (url.includes('PLbroken')) throw new Error('ERROR: The playlist does not exist.');
    if (url === 'https://www.youtube.com/@someone/videos' && max === 200) return ytJson([{ id: 'fffffffffff', title: 'Ch' }]);
    throw new Error(`unexpected ${url} ${max}`);
  });
}

describe('toPlaylistFile', () => {
  it('drops private/deleted/duplicate/invalid entries and normalizes durations', () => {
    const pf = toPlaylistFile('id-1', PL, 'playlist', good);
    expect(pf.videos).toEqual([
      { id: 'aaaaaaaaaaa', title: 'One', duration: 60 },
      { id: 'ddddddddddd', title: 'Two', duration: null },
    ]);
    expect(pf.title).toBe('List');
    expect(pf.channel).toBe('Chan');
  });

  it('handles missing entries', () => {
    expect(toPlaylistFile('x', PL, 'playlist', {}).videos).toEqual([]);
  });
});

describe('fetchAll', () => {
  it('writes files for playlists and channels, reports empty and failed, ignores single videos', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fl-'));
    const runner = fakeRunner();
    const report = await fetchAll({ raw, outDir: dir, runner, sleepMs: 0, log: () => {} });

    const goodId = courseId('Course 0', PL);
    const chanId = courseId('Course 3', CHANNEL);
    expect(report.ok.sort()).toEqual([goodId, chanId].sort());
    expect(report.empty).toEqual([courseId('Course 1', EMPTY)]);
    expect(report.failed).toEqual([
      { courseId: courseId('Course 2', BROKEN), url: BROKEN, error: 'ERROR: The playlist does not exist.' },
    ]);
    expect(runner).toHaveBeenCalledTimes(4);
    expect((await readdir(dir)).sort()).toEqual([`${goodId}.json`, `${chanId}.json`].sort());

    const file = JSON.parse(await readFile(join(dir, `${goodId}.json`), 'utf8'));
    expect(file.courseId).toBe(goodId);
    expect(file.kind).toBe('playlist');
    expect(file.videos).toHaveLength(2);
  });

  it('skips existing files unless refresh is set', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fl-'));
    const goodId = courseId('Course 0', PL);
    await writeFile(join(dir, `${goodId}.json`), '{"stale":true}');

    const runner = fakeRunner();
    const report = await fetchAll({ raw, outDir: dir, runner, sleepMs: 0, log: () => {} });
    expect(report.skipped).toEqual([goodId]);
    expect(runner.mock.calls.some(([u]) => u.includes('PLgood'))).toBe(false);

    const runner2 = fakeRunner();
    await fetchAll({ raw, outDir: dir, runner: runner2, sleepMs: 0, refresh: true, log: () => {} });
    expect(runner2.mock.calls.some(([u]) => u.includes('PLgood'))).toBe(true);
    expect(JSON.parse(await readFile(join(dir, `${goodId}.json`), 'utf8')).stale).toBeUndefined();
  });
});
