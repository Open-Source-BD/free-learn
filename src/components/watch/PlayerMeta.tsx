import { LANG_LABEL } from '@/lib/filter';
import type { WatchCourse } from '@/lib/types';

interface Props {
  course: WatchCourse;
  videoTitle: string;
}

export default function PlayerMeta({ course, videoTitle }: Props) {
  return (
    <div className="space-y-1 px-1">
      <h1 className="text-lg leading-snug font-semibold">{videoTitle}</h1>
      <p className="text-sm text-white/60">
        {course.title !== videoTitle && <>{course.title} · </>}
        {course.authors.length > 0 && <>{course.authors.join(', ')} · </>}
        {LANG_LABEL[course.lang]} ·{' '}
        <a className="underline-offset-2 hover:underline" href={`/c/${course.categorySlug}`}>
          {course.categoryName}
        </a>
      </p>
    </div>
  );
}
