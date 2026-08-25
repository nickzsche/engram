import type { JSONContent } from '@tiptap/react';
import type { Page, Space, SearchResult } from '@/types';
import { extractText } from '@/lib/utils';

function normalize(s: string): string {
  return s.toLowerCase();
}

/** Score a page against a query; returns null when it doesn't match. */
function scorePage(page: Page, plainText: string, q: string): { score: number; highlights: string[] } | null {
  const title = normalize(page.title);
  const body = normalize(plainText);
  let score = 0;

  if (title === q) score += 100;
  else if (title.startsWith(q)) score += 60;
  else if (title.includes(q)) score += 30;

  if (q.length >= 2) {
    let idx = body.indexOf(q);
    let occurrences = 0;
    const highlights: string[] = [];
    while (idx !== -1 && occurrences < 3) {
      score += 10;
      const start = Math.max(0, idx - 40);
      const end = Math.min(body.length, idx + q.length + 60);
      const snippet =
        (start > 0 ? '…' : '') +
        plainText.slice(start, end).replace(/\s+/g, ' ').trim() +
        (end < body.length ? '…' : '');
      highlights.push(snippet);
      occurrences += 1;
      idx = body.indexOf(q, idx + q.length);
    }
    // also match in title-only case
    if (score <= 0) return null;
    return { score, highlights };
  }

  if (score <= 0) return null;
  return { score, highlights: [] };
}

export function searchPages(query: string, pages: Page[], spaces: Space[]): SearchResult[] {
  const q = normalize(query.trim());
  if (!q) return [];
  const spaceById = new Map(spaces.map((s) => [s.id, s]));
  const results: SearchResult[] = [];

  for (const page of pages) {
    if (page.isTrashed) continue;
    let plainText = '';
    try {
      const doc = JSON.parse(page.content) as JSONContent;
      plainText = extractText(doc);
    } catch {
      plainText = page.content;
    }
    const hit = scorePage(page, `${page.title}\n${plainText}`, q);
    if (hit && spaceById.has(page.spaceId)) {
      results.push({
        page,
        space: spaceById.get(page.spaceId)!,
        highlights: hit.highlights,
        score: hit.score,
      });
    }
  }

  results.sort((a, b) => b.score - a.score || b.page.lastEditedAt - a.page.lastEditedAt);
  return results.slice(0, 50);
}

/** Split a highlight snippet into parts for rendering with <mark>. */
export function highlightParts(
  snippet: string,
  query: string,
): { text: string; hit: boolean }[] {
  if (!query.trim()) return [{ text: snippet, hit: false }];
  const lowerSnippet = snippet.toLowerCase();
  const q = query.toLowerCase().trim();
  const parts: { text: string; hit: boolean }[] = [];
  let i = 0;
  while (i < snippet.length) {
    const found = lowerSnippet.indexOf(q, i);
    if (found === -1) {
      parts.push({ text: snippet.slice(i), hit: false });
      break;
    }
    if (found > i) parts.push({ text: snippet.slice(i, found), hit: false });
    parts.push({ text: snippet.slice(found, found + q.length), hit: true });
    i = found + q.length;
  }
  return parts;
}
