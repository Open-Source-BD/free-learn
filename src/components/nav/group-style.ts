import { Brain, Cloud, Code2, Cpu, Globe, Shapes, Smartphone, Wrench, type LucideIcon } from 'lucide-react';
import type { CategoryGroup } from '@/lib/types';

export const GROUP_ICONS: Record<CategoryGroup, LucideIcon> = {
  Languages: Code2,
  'CS Fundamentals': Cpu,
  Web: Globe,
  Mobile: Smartphone,
  'Data & AI': Brain,
  'Cloud & DevOps': Cloud,
  Tools: Wrench,
  Other: Shapes,
};

export const GROUP_TINTS: Record<CategoryGroup, [string, string]> = {
  Languages: ['#60a5fa', '#2563eb'],
  'CS Fundamentals': ['#a78bfa', '#7c3aed'],
  Web: ['#34d399', '#059669'],
  Mobile: ['#f472b6', '#db2777'],
  'Data & AI': ['#fbbf24', '#d97706'],
  'Cloud & DevOps': ['#38bdf8', '#0284c7'],
  Tools: ['#94a3b8', '#475569'],
  Other: ['#fb7185', '#e11d48'],
};
