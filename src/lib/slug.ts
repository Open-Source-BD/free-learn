export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\+/g, '-plus')
    .replace(/#/g, '-sharp')
    .normalize('NFKD')
    .replace(/[^\x00-\x7f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function assignSlugs(names: string[]): Map<string, string> {
  const used = new Map<string, number>();
  const out = new Map<string, string>();
  for (const name of names) {
    if (out.has(name)) continue;
    const base = slugify(name) || 'category';
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    out.set(name, n === 1 ? base : `${base}-${n}`);
  }
  return out;
}
