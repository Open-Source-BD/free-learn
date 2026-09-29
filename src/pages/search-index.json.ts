import type { APIRoute } from 'astro';
import { loadCatalog } from '@/lib/load-catalog';
import { buildSearchIndex } from '@/lib/search';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(buildSearchIndex(loadCatalog().courses)), {
    headers: { 'Content-Type': 'application/json' },
  });
