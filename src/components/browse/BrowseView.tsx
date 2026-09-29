import { useEffect, useMemo, useState } from 'react';
import { applyFilter, DEFAULT_FILTER, filterToSearch, parseFilter, type GridFilter } from '@/lib/filter';
import type { CourseCardData } from '@/lib/types';
import ChipBar from './ChipBar';
import ContinueWatching from './ContinueWatching';
import CourseGrid from './CourseGrid';

interface Props {
  courses: CourseCardData[];
  heading?: string;
  showContinue?: boolean;
}

export default function BrowseView({ courses, heading, showContinue = false }: Props) {
  const [filter, setFilter] = useState<GridFilter>(DEFAULT_FILTER);

  useEffect(() => setFilter(parseFilter(window.location.search)), []);

  const update = (f: GridFilter) => {
    setFilter(f);
    history.replaceState(null, '', window.location.pathname + filterToSearch(f));
  };

  const visible = useMemo(() => applyFilter(courses, filter), [courses, filter]);

  return (
    <div className="space-y-5">
      <ChipBar value={filter} onChange={update} />
      {heading && (
        <h1 className="px-1 text-2xl font-semibold">
          {heading} <span className="text-base font-normal text-white/50">· {visible.length} courses</span>
        </h1>
      )}
      {showContinue && <ContinueWatching />}
      <CourseGrid courses={visible} />
    </div>
  );
}
