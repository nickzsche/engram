import type { JSONContent } from '@tiptap/react';
import type { Page, GraphNode, GraphLink } from '@/types';
import { countWordsInDoc, collectWikilinks } from '@/lib/utils';

/** Build nodes & links for the graph view from live pages. */
export function buildGraphData(pages: Page[], spaceColorById: Map<string, string>): {
  nodes: GraphNode[];
  links: GraphLink[];
} {
  const live = pages.filter((p) => !p.isTrashed);
  const byId = new Map(live.map((p) => [p.id, p]));

  const linkCount = new Map<string, number>();
  const edges: { source: string; target: string }[] = [];
  const seen = new Set<string>();

  const addEdge = (a: string, b: string, strength: number) => {
    if (a === b || !byId.has(a) || !byId.has(b)) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ source: a, target: b });
    linkCount.set(a, (linkCount.get(a) ?? 0) + strength);
    linkCount.set(b, (linkCount.get(b) ?? 0) + strength);
  };

  for (const page of live) {
    // parent → child hierarchy
    if (page.parentId && byId.has(page.parentId)) {
      addEdge(page.parentId, page.id, 2);
    }
    // wikilinks
    let doc: JSONContent | null = null;
    try {
      doc = JSON.parse(page.content) as JSONContent;
    } catch {
      doc = null;
    }
    for (const wl of collectWikilinks(doc)) {
      if (byId.has(wl.pageId)) addEdge(page.id, wl.pageId, 1);
    }
  }

  const wordsById = new Map(live.map((p) => [p.id, countWordsInDoc(p.content)]));
  const maxWords = Math.max(1, ...wordsById.values());
  const nodes: GraphNode[] = live.map((page) => {
    const words = wordsById.get(page.id) ?? 0;
    return {
      id: page.id,
      title: page.title || 'Untitled',
      spaceId: page.spaceId,
      spaceColor: spaceColorById.get(page.spaceId) ?? '#8e9ab0',
      x: (Math.random() - 0.5) * 600,
      y: (Math.random() - 0.5) * 400,
      vx: 0,
      vy: 0,
      radius: 7 + Math.sqrt(words / maxWords) * 16 + Math.min(6, (linkCount.get(page.id) ?? 0)),
      isFavorite: page.isFavorite,
      linkCount: linkCount.get(page.id) ?? 0,
    };
  });

  const links: GraphLink[] = edges.map((e) => ({ source: e.source, target: e.target, strength: 1 }));
  return { nodes, links };
}

/** One step of force-directed layout (mutates node x/y/vx/vy in place). */
export function tickLayout(nodes: GraphNode[], links: GraphLink[], alpha: number): void {
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // repulsion
  for (let i = 0; i < nodes.length; i += 1) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j += 1) {
      const b = nodes[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let d2 = dx * dx + dy * dy;
      if (d2 === 0) {
        dx = Math.random() - 0.5;
        dy = Math.random() - 0.5;
        d2 = dx * dx + dy * dy + 0.01;
      }
      const minDist = a.radius + b.radius + 14;
      const d = Math.sqrt(d2);
      const repulse = ((minDist * minDist) / d2) * 900 * alpha;
      const fx = (dx / d) * repulse;
      const fy = (dy / d) * repulse;
      a.vx -= fx;
      a.vy -= fy;
      b.vx += fx;
      b.vy += fy;
    }
  }

  // springs
  for (const link of links) {
    const s = byId.get(link.source);
    const t = byId.get(link.target);
    if (!s || !t) continue;
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    const target = 110;
    const k = (d - target) / d * 0.06 * alpha;
    const fx = dx * k;
    const fy = dy * k;
    s.vx += fx;
    s.vy += fy;
    t.vx -= fx;
    t.vy -= fy;
  }

  // centering + integrate
  for (const n of nodes) {
    n.vx += -n.x * 0.0015 * alpha;
    n.vy += -n.y * 0.0015 * alpha;
    n.vx *= 0.82;
    n.vy *= 0.82;
    n.x += n.vx;
    n.y += n.vy;
  }
}
