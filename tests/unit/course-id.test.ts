import { describe, expect, it } from 'vitest';
import { courseId } from '@/lib/course-id';

describe('courseId', () => {
  const url = 'https://www.youtube.com/playlist?list=PLv9sD0fPjvSHqIOLTIvHJWjkdH0IdzmXT';

  it('is slug + 6 hex chars and stable', () => {
    const id = courseId('Advanced Data Structures', url);
    expect(id).toMatch(/^advanced-data-structures-[0-9a-f]{6}$/);
    expect(courseId('Advanced Data Structures', url)).toBe(id);
  });

  it('differs for different URLs with the same title', () => {
    expect(courseId('Python', url)).not.toBe(courseId('Python', url + 'x'));
  });

  it('uses "course" for titles with no latin characters', () => {
    expect(courseId('পাইথন প্রোগ্রামিং', url)).toMatch(/^course-[0-9a-f]{6}$/);
  });

  it('caps the slug part at 60 chars without a trailing dash', () => {
    const id = courseId('a '.repeat(80), url);
    const slugPart = id.slice(0, -7);
    expect(slugPart.length).toBeLessThanOrEqual(60);
    expect(slugPart.endsWith('-')).toBe(false);
  });
});
