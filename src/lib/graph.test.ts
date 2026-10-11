import { describe, expect, test } from 'bun:test';
import type { Page } from '@/types';
import { buildGraphData, tickLayout } from '@/lib/graph';

function page(over: Partial<Page> & { id: string; spaceId: string }): Page {
  return {
    parentId: null,
    title: over.id,
    content: JSON.stringify({ type: 'doc', content: [] }),
    order: 0,
    isFavorite: false,
    isTrashed: false,
    createdAt: 0,
    updatedAt: 0,
    lastEditedAt: 0,
    ...over,
  };
}

function wikilinkDoc(targetId: string): string {
  return JSON.stringify({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'see',
            marks: [{ type: 'wikilink', attrs: { pageId: targetId, title: 'see' } }],
          },
        ],
      },
    ],
  });
}

const colors = new Map([['s1', '#abcdef']]);

describe('buildGraphData', () => {
  test('adds parent→child and wikilink edges, deduped and counted', () => {
    const pages = [
      page({ id: 'P', spaceId: 's1' }),
      page({ id: 'C', spaceId: 's1', parentId: 'P' }),
      page({ id: 'O', spaceId: 's1', content: wikilinkDoc('C') }),
    ];
    const { nodes, links } = buildGraphData(pages, colors);

    expect(nodes).toHaveLength(3);
    expect(links).toHaveLength(2);

    const node = (id: string) => nodes.find((n) => n.id === id)!;
    const parentEdgeStrength = 2;
    const wikilinkStrength = 1;
    expect(node('P').linkCount).toBe(parentEdgeStrength);
    expect(node('C').linkCount).toBe(parentEdgeStrength + wikilinkStrength);
    expect(node('O').linkCount).toBe(wikilinkStrength);
    expect(node('P').spaceColor).toBe('#abcdef');
    expect(node('P').radius).toBeGreaterThan(7);
  });

  test('ignores self-links, unknown targets and duplicates', () => {
    const pages = [
      page({ id: 'A', spaceId: 's1', content: wikilinkDoc('A') }),
      page({ id: 'B', spaceId: 's1', content: wikilinkDoc('missing') }),
    ];
    const { links } = buildGraphData(pages, colors);
    expect(links).toEqual([]);
  });

  test('excludes trashed pages', () => {
    const pages = [page({ id: 'A', spaceId: 's1' }), page({ id: 'T', spaceId: 's1', isTrashed: true })];
    const { nodes } = buildGraphData(pages, colors);
    expect(nodes.map((n) => n.id)).toEqual(['A']);
  });
});

describe('tickLayout', () => {
  test('updates positions with finite numbers across iterations', () => {
    const pages = [page({ id: 'A', spaceId: 's1' }), page({ id: 'B', spaceId: 's1', parentId: 'A' })];
    const { nodes, links } = buildGraphData(pages, colors);

    for (let i = 0; i < 20; i += 1) tickLayout(nodes, links, 1);

    for (const n of nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
    }
  });

  test('handles two nodes sharing the exact same position without NaN', () => {
    const nodes = [
      { id: 'A', title: 'A', spaceId: 's1', spaceColor: '#000', x: 0, y: 0, vx: 0, vy: 0, radius: 8, isFavorite: false, linkCount: 0 },
      { id: 'B', title: 'B', spaceId: 's1', spaceColor: '#000', x: 0, y: 0, vx: 0, vy: 0, radius: 8, isFavorite: false, linkCount: 0 },
    ];
    tickLayout(nodes, [], 1);
    for (const n of nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
    }
  });
});
