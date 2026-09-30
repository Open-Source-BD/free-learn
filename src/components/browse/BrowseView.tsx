import { useEffect, useMemo, useState } from 'react';
import { applyFilter, DEFAULT_FILTER, filterToSearch, parseFilter, type GridFilter } from '@/lib/filter';
import { parseSort, SORT_OPTIONS, sortCourses, withSort, type SortKey } from '@/lib/sort';
import type { CourseCardData } from '@/lib/types';
import ChipBar from './ChipBar';
import ContinueWatching from './ContinueWatching';
import CourseCard from './CourseCard';
import CourseGrid from './CourseGrid';
import ShelfRow from './ShelfRow';

export interface Shelf {
  slug: string;
  name: string;
}

interface Props {
  courses: CourseCardData[];
  heading?: string;
  /** home page: welcome line, continue watching and topic rows */
  home?: boolean;
  shelves?: Shelf[];
}

const SHELF_SIZE = 10;

export default function BrowseView({ courses, heading, home = false, shelves = [] }: Props) {
  const [filter, setFilter] = useState<GridFilter>(DEFAULT_FILTER);
  const [sort, setSort] = useState<SortKey>('default');

  useEffect(() => {
    setFilter(parseFilter(window.location.search));
    setSort(parseSort(window.location.search));
  }, []);

  const syncUrl = (f: GridFilter, s: SortKey) =>
    history.replaceState(null, '', window.location.pathname + withSort(filterToSearch(f), s));

  const updateFilter = (f: GridFilter) => {
    setFilter(f);
    syncUrl(f, sort);
  };
  const updateSort = (s: SortKey) => {
    setSort(s);
    syncUrl(filter, s);
  };

  const visible = useMemo(() => applyFilter(courses, filter), [courses, filter]);
  const sorted = useMemo(() => sortCourses(visible, sort), [visible, sort]);
  const rows = useMemo(
    () =>
      shelves
        .map((s) => ({ ...s, items: sortCourses(visible.filter((c) => c.categorySlug === s.slug), 'most').slice(0, SHELF_SIZE) }))
        .filter((r) => r.items.length > 0),
    [shelves, visible],
  );

  const sortControl = (
    <label className="ml-auto flex items-center gap-2 text-sm text-white/60">
      Sort
      <select
        aria-label="Sort courses"
        value={sort}
        onChange={(e) => updateSort(e.target.value as SortKey)}
        className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white focus-visible:outline-2 focus-visible:outline-[#a9c4f5]"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value} className="bg-black">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <>
      <ChipBar value={filter} onChange={updateFilter} />
      <div className="space-y-10">
        {/* text rows stay clear of the floating rail; thumbnails run under it */}
        {home && (
          <div className="px-1 md:pl-[68px]">
            <h1 className="text-3xl font-semibold tracking-tight">Learn to code for free</h1>
            <p className="mt-1 text-white/60">
              {courses.length.toLocaleString('en')} YouTube courses in English, বাংলা and हिन्दी.
            </p>
          </div>
        )}
        {home && <ContinueWatching />}
        {rows.map((r) => (
          <ShelfRow key={r.slug} title={r.name} href={`/c/${r.slug}`}>
            {r.items.map((c) => (
              <div key={c.id} className="w-[280px] shrink-0 snap-start">
                <CourseCard course={c} />
              </div>
            ))}
          </ShelfRow>
        ))}
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 px-1 md:pl-[68px]">
            {heading ? (
              <h1 className="text-2xl font-semibold">
                {heading} <span className="text-base font-normal text-white/50">· {visible.length} courses</span>
              </h1>
            ) : (
              <h2 className="text-lg font-semibold">
                All courses <span className="text-sm font-normal text-white/50">· {visible.length}</span>
              </h2>
            )}
            {sortControl}
          </div>
          <CourseGrid courses={sorted} />
        </div>
      </div>
    </>
  );
}
