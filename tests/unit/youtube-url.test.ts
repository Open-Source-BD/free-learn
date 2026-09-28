import { describe, expect, it } from 'vitest';
import { parseYouTubeUrl, thumbUrl, youtubeWatchUrl } from '@/lib/youtube-url';

describe('parseYouTubeUrl', () => {
  it.each([
    ['https://www.youtube.com/watch?v=8hly31xKli0', '8hly31xKli0'],
    ['https://youtube.com/watch?v=QE5oQh63gGE', 'QE5oQh63gGE'],
    ['https://youtu.be/QnbsCC8wvJk?si=sRyiRRehGb_qv2wR', 'QnbsCC8wvJk'],
    ['https://www.youtube.com/live/Pb25WCwFHGQ', 'Pb25WCwFHGQ'],
    ['https://www.youtube.com/embed/Pb25WCwFHGQ', 'Pb25WCwFHGQ'],
    ['https://www.youtube.com/shorts/Pb25WCwFHGQ', 'Pb25WCwFHGQ'],
    ['https://m.youtube.com/watch?v=8hly31xKli0&t=42s', '8hly31xKli0'],
  ])('%s → video %s', (url, id) => {
    expect(parseYouTubeUrl(url)).toEqual({ kind: 'video', videoId: id });
  });

  it('parses a playlist URL', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/playlist?list=PLv9sD0fPjvSHqIOLTIvHJWjkdH0IdzmXT')).toEqual({
      kind: 'playlist',
      listId: 'PLv9sD0fPjvSHqIOLTIvHJWjkdH0IdzmXT',
    });
    expect(parseYouTubeUrl('https://youtube.com/playlist?list=PLBlnK6fEyqRj9lld8sWIUNwlKfdUoPd1Y')).toEqual({
      kind: 'playlist',
      listId: 'PLBlnK6fEyqRj9lld8sWIUNwlKfdUoPd1Y',
    });
  });

  it('keeps the start video of watch?v=…&list=…', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/watch?v=cKZEgtQUxlU&list=PL2HX_yT71umB_oqitnmDgYSKltddPfZ-k')).toEqual({
      kind: 'playlist',
      listId: 'PL2HX_yT71umB_oqitnmDgYSKltddPfZ-k',
      videoId: 'cKZEgtQUxlU',
    });
  });

  it.each([
    ['https://www.youtube.com/channel/UCozCCU3b1HmcmCf2gLN_7HA/videos', 'https://www.youtube.com/channel/UCozCCU3b1HmcmCf2gLN_7HA/videos'],
    ['https://www.youtube.com/@freecodecamp', 'https://www.youtube.com/@freecodecamp/videos'],
    ['https://www.youtube.com/@freecodecamp/playlists', 'https://www.youtube.com/@freecodecamp/videos'],
    ['https://www.youtube.com/c/Telusko', 'https://www.youtube.com/c/Telusko/videos'],
    ['https://www.youtube.com/user/thenewboston', 'https://www.youtube.com/user/thenewboston/videos'],
  ])('%s → channel', (url, channelUrl) => {
    expect(parseYouTubeUrl(url)).toEqual({ kind: 'channel', channelUrl });
  });

  it.each([
    'https://example.com/watch?v=8hly31xKli0',
    'https://www.youtube.com/results?search_query=python',
    'https://www.youtube.com/watch?v=short',
    'not a url',
    '',
    'https://notyoutube.com/watch?v=8hly31xKli0',
  ])('%s → unknown', (url) => {
    expect(parseYouTubeUrl(url)).toEqual({ kind: 'unknown' });
  });
});

describe('url helpers', () => {
  it('builds thumbnail and watch URLs', () => {
    expect(thumbUrl('8hly31xKli0')).toBe('https://i.ytimg.com/vi/8hly31xKli0/mqdefault.jpg');
    expect(youtubeWatchUrl('8hly31xKli0')).toBe('https://www.youtube.com/watch?v=8hly31xKli0');
    expect(youtubeWatchUrl('8hly31xKli0', 'PLx')).toBe('https://www.youtube.com/watch?v=8hly31xKli0&list=PLx');
  });
});
