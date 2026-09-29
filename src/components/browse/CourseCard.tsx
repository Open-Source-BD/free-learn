import { LANG_LABEL } from '@/lib/filter';
import { courseHref } from '@/lib/href';
import type { CourseCardData } from '@/lib/types';
import { thumbUrl } from '@/lib/youtube-url';

export default function CourseCard({ course, watchedCount = 0 }: { course: CourseCardData; watchedCount?: number }) {
  const external = course.kind === 'unknown';
  const badge = external ? '↗ YouTube' : course.videoCount > 1 ? `▶ ${course.videoCount}` : '1 video';
  const pct = course.videoCount > 0 ? Math.min(100, Math.round((watchedCount / course.videoCount) * 100)) : 0;
  const meta = [course.authors.join(', '), LANG_LABEL[course.lang]].filter(Boolean).join(' · ');

  return (
    <a
      href={courseHref(course)}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="glass lift block p-2"
      data-testid="course-card"
    >
      <div className="relative aspect-video overflow-hidden rounded-[10px] bg-white/5">
        {course.thumbVideoId && (
          <img
            src={thumbUrl(course.thumbVideoId)}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        )}
        <span className="absolute right-1.5 bottom-1.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-medium" data-testid="course-badge">
          {badge}
        </span>
        {pct > 0 && (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
            <span className="block h-full bg-red-500" style={{ width: `${pct}%` }} />
          </span>
        )}
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm leading-snug font-semibold">{course.title}</h3>
      <p className="mt-0.5 line-clamp-1 text-xs text-white/60" data-testid="course-meta">
        {meta}
      </p>
    </a>
  );
}
