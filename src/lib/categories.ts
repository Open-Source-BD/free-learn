import type { CategoryGroup } from './types';

export const GROUP_ORDER: CategoryGroup[] = [
  'Languages',
  'CS Fundamentals',
  'Web',
  'Mobile',
  'Data & AI',
  'Cloud & DevOps',
  'Tools',
  'Other',
];

const ALIASES: Record<string, string> = {
  'Algorithms and Data Structures': 'Algorithms & Data Structures',
  'Assembly Language': 'Assembly',
  'Bash and Shell': 'Bash / Shell',
  'Shell scripting': 'Bash / Shell',
  'Compiler Design': 'Compilers',
  Golang: 'Go',
  'Git and GitHub': 'Git',
  Matlab: 'MATLAB',
  'Mongo DB': 'MongoDB',
  Wordpress: 'WordPress',
  Cuda: 'CUDA',
};

const GROUPS: Record<Exclude<CategoryGroup, 'Other'>, string[]> = {
  Languages: [
    'APL', 'Assembly', 'AutoIt', 'Ballerina', 'Bash / Shell', 'C', 'C++', 'C#', 'Clojure', 'Dart', 'Fortran', 'Go',
    'Java', 'JavaScript', 'Julia', 'Kotlin', 'Lua', 'MATLAB', 'OCaml', 'Perl', 'PHP', 'Python', 'R', 'Ruby', 'Rust',
    'Scala', 'Scratch', 'Solidity', 'Swift', 'TypeScript', 'YAML',
  ],
  'CS Fundamentals': [
    'Algorithms & Data Structures', 'Competitive Programming', 'Compilers', 'Computer Graphics',
    'Computer Organization and Architecture', 'Computer Science', 'Cryptography', 'Digital Electronics', 'Graph Theory',
    'Mathematics', 'Networking', 'Operating Systems', 'Programming paradigms', 'Security', 'Software Architecture',
    'Software Engineering', 'System Design', 'Theory',
  ],
  Web: [
    'Angular', 'ASP.NET', 'Astro', 'Blockchain', 'CodeIgniter', 'Figma', 'HTML and CSS', 'Laravel', 'Nest.js',
    'Spring Boot', 'UI/UX', 'Web Development', 'Web3', 'WordPress',
  ],
  Mobile: ['Android', 'Flutter', 'iOS'],
  'Data & AI': [
    'Artificial Intelligence', 'CUDA', 'Data Science', 'Databases', 'Deep Learning', 'Machine Learning', 'MongoDB',
    'MySQL', 'Natural Language Processing', 'PostgreSQL', 'Redis', 'Spark',
  ],
  'Cloud & DevOps': ['Cloud Computing', 'DevOps', 'Docker', 'Kubernetes', 'Linux', 'Terraform'],
  Tools: ['Cypress', 'Git', 'IDE and editors', 'Open Source'],
};

const GROUP_BY_NAME = new Map<string, CategoryGroup>(
  Object.entries(GROUPS).flatMap(([group, names]) => names.map((n) => [n, group as CategoryGroup])),
);

export function cleanCategory(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/\\(.)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function canonicalCategory(raw: string): string {
  const c = cleanCategory(raw);
  return ALIASES[c] ?? c;
}

export function groupOf(name: string): CategoryGroup {
  return GROUP_BY_NAME.get(name) ?? 'Other';
}
