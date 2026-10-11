import { describe, expect, test } from 'bun:test';
import type { Page, Space } from '@/types';
import { highlightParts, searchPages } from '@/lib/search';

function space(id: string): Space {
  return { id, name: `Space ${id}`, icon: 'folder', color: '#fff', order: 0, createdAt: 0, updatedAt: 0 };
}

function page(over: Partial<Page> & { id: string; spaceId: string; title: string; content: string }): Page {
  return {
    parentId: null,
    order: 0,
    isFavorite: false,
    isTrashed: false,
    createdAt: 0,
    updatedAt: 0,
    lastEditedAt: 0,
    ...over,
  };
}

function doc(...paragraphs: string[]): string {
  return JSON.stringify({
    type: 'doc',
    content: paragraphs.map((p) => ({ type: 'paragraph', content: p ? [{ type: 'text', text: p }] : undefined })),
  });
}

const spaces = [space('s1')];

describe('searchPages', () => {
  test('empty / whitespace query yields no results', () => {
    const pages = [page({ id: 'a', spaceId: 's1', title: 'Alpha', content: doc('x') })];
    expect(searchPages('', pages, spaces)).toEqual([]);
    expect(searchPages('   ', pages, spaces)).toEqual([]);
  });

  test('ranks an exact title match above a body-only match', () => {
    const pages = [
      page({ id: 'body', spaceId: 's1', title: 'Journal', content: doc('talked about rust today'), lastEditedAt: 100 }),
      page({ id: 'title', spaceId: 's1', title: 'Rust', content: doc('unrelated body'), lastEditedAt: 1 }),
    ];
    const results = searchPages('rust', pages, spaces);
    expect(results.map((r) => r.page.id)).toEqual(['title', 'body']);
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  test('is case-insensitive and attaches body highlights', () => {
    const pages = [page({ id: 'a', spaceId: 's1', title: 'Notes', content: doc('Learning RUST is fun') })];
    const results = searchPages('rust', pages, spaces);
    expect(results).toHaveLength(1);
    expect(results[0].highlights[0].toLowerCase()).toContain('rust');
  });

  test('skips trashed pages and pages with an unknown space', () => {
    const pages = [
      page({ id: 'trashed', spaceId: 's1', title: 'Rust', content: doc('rust'), isTrashed: true }),
      page({ id: 'orphan', spaceId: 'missing', title: 'Rust', content: doc('rust') }),
    ];
    expect(searchPages('rust', pages, spaces)).toEqual([]);
  });

  test('caps results at 50', () => {
    const pages = Array.from({ length: 60 }, (_, i) =>
      page({ id: `p${i}`, spaceId: 's1', title: `Rust ${i}`, content: doc('rust') }),
    );
    expect(searchPages('rust', pages, spaces)).toHaveLength(50);
  });
});

describe('highlightParts', () => {
  test('marks every case-insensitive occurrence of the query', () => {
    const parts = highlightParts('Rust and rust again', 'rust');
    expect(parts.filter((p) => p.hit).map((p) => p.text)).toEqual(['Rust', 'rust']);
    expect(parts.map((p) => p.text).join('')).toBe('Rust and rust again');
  });

  test('returns a single non-hit part when the query is absent', () => {
    expect(highlightParts('nothing here', 'zzz')).toEqual([{ text: 'nothing here', hit: false }]);
  });

  test('returns the whole snippet unmarked for an empty query', () => {
    expect(highlightParts('hello', '')).toEqual([{ text: 'hello', hit: false }]);
  });
});
