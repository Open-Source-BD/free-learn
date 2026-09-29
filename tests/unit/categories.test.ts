import { describe, expect, it } from 'vitest';
import { canonicalCategory, cleanCategory, GROUP_ORDER, groupOf } from '@/lib/categories';

describe('cleanCategory', () => {
  it.each([
    ['<a id="cpp"></a>C++', 'C++'],
    ['<a id="csharp"></a>C\\#', 'C#'],
    ['<a id="asp.net"></a>ASP.NET', 'ASP.NET'],
    ['  Python ', 'Python'],
  ])('%s → %s', (raw, out) => expect(cleanCategory(raw)).toBe(out));
});

describe('canonicalCategory', () => {
  it.each([
    ['Algorithms and Data Structures', 'Algorithms & Data Structures'],
    ['Golang', 'Go'],
    ['Mongo DB', 'MongoDB'],
    ['Matlab', 'MATLAB'],
    ['Wordpress', 'WordPress'],
    ['Git and GitHub', 'Git'],
    ['Assembly Language', 'Assembly'],
    ['Bash and Shell', 'Bash / Shell'],
    ['Shell scripting', 'Bash / Shell'],
    ['Compiler Design', 'Compilers'],
    ['Cuda', 'CUDA'],
    ['<a id="c"></a>C', 'C'],
  ])('%s → %s', (raw, out) => expect(canonicalCategory(raw)).toBe(out));
});

describe('groupOf', () => {
  it('maps known categories', () => {
    expect(groupOf('Python')).toBe('Languages');
    expect(groupOf('C#')).toBe('Languages');
    expect(groupOf('Algorithms & Data Structures')).toBe('CS Fundamentals');
    expect(groupOf('HTML and CSS')).toBe('Web');
    expect(groupOf('Flutter')).toBe('Mobile');
    expect(groupOf('Machine Learning')).toBe('Data & AI');
    expect(groupOf('Kubernetes')).toBe('Cloud & DevOps');
    expect(groupOf('Git')).toBe('Tools');
  });

  it('puts unmapped categories in Other', () => {
    expect(groupOf('Underwater Basket Weaving')).toBe('Other');
  });

  it('has a fixed sidebar order', () => {
    expect(GROUP_ORDER).toEqual(['Languages', 'CS Fundamentals', 'Web', 'Mobile', 'Data & AI', 'Cloud & DevOps', 'Tools', 'Other']);
  });
});
