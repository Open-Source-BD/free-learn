import { useEffect, useRef, useState } from 'react';
import { createProgressStore, type ProgressMap } from '@/lib/progress';
import type { CourseCardData } from '@/lib/types';
import CourseCard from './CourseCard';

const PAGE = 48;

export default function CourseGrid({ courses }: { courses: CourseCardData[] }) {
  const [limit, setLimit] = useState(PAGE);
  const [progress, setProgress] = useState<ProgressMap>({});
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => setProgress(createProgressStore().all()), []);
  useEffect(() => setLimit(PAGE), [courses]);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setLimit((l) => l + PAGE);
    }, { rootMargin: '800px' });
    io.observe(el);
    return () => io.disconnect();
  }, [courses, limit]);

  if (courses.length === 0) {
    return <p className="glass p-6 text-center text-white/70">No courses match these filters.</p>;
  }
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {courses.slice(0, limit).map((c) => (
          <CourseCard key={c.id} course={c} watchedCount={progress[c.id]?.watched.length ?? 0} />
        ))}
      </div>
      {limit < courses.length && <div ref={sentinel} className="h-10" aria-hidden="true" />}
    </>
  );
}
