'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Network } from 'lucide-react';
import { buildGraphData, tickLayout } from '@/lib/graph';
import type { GraphNode } from '@/types';
import type { Page, Space } from '@/types';

interface GraphViewProps {
  spaces: Space[];
  pages: Page[];
  onSelectPage: (id: string) => void;
}

export default function GraphView({ spaces, pages, onSelectPage }: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<{ source: string; target: string; strength: number }[]>([]);
  const viewRef = useRef({ x: 0, y: 0, zoom: 1 });
  const dragRef = useRef<{ node: GraphNode | null; panning: boolean; lastX: number; lastY: number; moved: boolean }>({
    node: null,
    panning: false,
    lastX: 0,
    lastY: 0,
    moved: false,
  });
  const [hovered, setHovered] = useState<GraphNode | null>(null);
  const [ready, setReady] = useState(false);

  const spaceColorById = useMemo(() => new Map(spaces.map((s) => [s.id, s.color])), [spaces]);

  // (Re)build graph data when pages change
  useEffect(() => {
    const { nodes, links } = buildGraphData(pages, spaceColorById);
    const prev = new Map(nodesRef.current.map((n) => [n.id, n]));
    for (const n of nodes) {
      const old = prev.get(n.id);
      if (old) {
        n.x = old.x;
        n.y = old.y;
      }
    }
    nodesRef.current = nodes;
    linksRef.current = links;
    setReady(nodes.length > 0);
  }, [pages, spaceColorById]);

  // Simulation + render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let alpha = 1;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      // warm-up then gentle idle ticks
      tickLayout(nodesRef.current, linksRef.current, alpha);
      alpha = Math.max(0.05, alpha * 0.995);

      const view = viewRef.current;
      const cx = width / 2 + view.x;
      const cy = height / 2 + view.y;

      // links
      const byId = new Map(nodesRef.current.map((n) => [n.id, n]));
      ctx.lineWidth = 1;
      for (const link of linksRef.current) {
        const s = byId.get(link.source);
        const t = byId.get(link.target);
        if (!s || !t) continue;
        ctx.strokeStyle = 'rgba(101, 116, 142, 0.35)';
        ctx.beginPath();
        ctx.moveTo(cx + s.x * view.zoom, cy + s.y * view.zoom);
        ctx.lineTo(cx + t.x * view.zoom, cy + t.y * view.zoom);
        ctx.stroke();
      }

      // nodes
      for (const n of nodesRef.current) {
        const x = cx + n.x * view.zoom;
        const y = cy + n.y * view.zoom;
        const r = n.radius * view.zoom;

        if (n.isFavorite || hovered?.id === n.id) {
          ctx.beginPath();
          ctx.arc(x, y, r + 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(168, 85, 247, 0.18)';
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = n.spaceColor;
        ctx.fill();
        ctx.strokeStyle = 'rgba(11, 14, 20, 0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // label
        const fontSize = Math.max(10, Math.min(13, r * 0.8));
        ctx.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillStyle = 'rgba(232, 235, 240, 0.85)';
        ctx.textAlign = 'center';
        const label = n.title.length > 22 ? `${n.title.slice(0, 21)}…` : n.title;
        ctx.fillText(label, x, y - r - 6);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [hovered]);

  const hitTest = (clientX: number, clientY: number): GraphNode | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const { width, height } = rect;
    const view = viewRef.current;
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const cx = width / 2 + view.x;
    const cy = height / 2 + view.y;
    let best: GraphNode | null = null;
    let bestDist = Infinity;
    for (const n of nodesRef.current) {
      const x = cx + n.x * view.zoom;
      const y = cy + n.y * view.zoom;
      const d = Math.hypot(mx - x, my - y);
      if (d < n.radius * view.zoom + 4 && d < bestDist) {
        best = n;
        bestDist = d;
      }
    }
    return best;
  };

  return (
    <div ref={containerRef} className="relative h-full min-h-[60vh] w-full">
      <canvas
        ref={canvasRef}
        className="graph-canvas"
        onPointerDown={(e) => {
          const node = hitTest(e.clientX, e.clientY);
          dragRef.current = { node, panning: !node, lastX: e.clientX, lastY: e.clientY, moved: false };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const drag = dragRef.current;
          const dx = e.clientX - drag.lastX;
          const dy = e.clientY - drag.lastY;
          if (drag.node) {
            drag.node.x += dx / viewRef.current.zoom;
            drag.node.y += dy / viewRef.current.zoom;
            drag.moved = true;
          } else if (drag.panning && (e.buttons & 1)) {
            viewRef.current.x += dx;
            viewRef.current.y += dy;
            drag.moved = true;
          } else {
            setHovered(hitTest(e.clientX, e.clientY));
            return;
          }
          drag.lastX = e.clientX;
          drag.lastY = e.clientY;
        }}
        onPointerUp={(e) => {
          const drag = dragRef.current;
          if (drag.node && !drag.moved) onSelectPage(drag.node.id);
          dragRef.current = { node: null, panning: false, lastX: 0, lastY: 0, moved: false };
          void e;
        }}
        onWheel={(e) => {
          e.preventDefault();
          const zoom = viewRef.current.zoom * (e.deltaY > 0 ? 0.92 : 1.08);
          viewRef.current.zoom = Math.min(3, Math.max(0.3, zoom));
        }}
      />

      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-ink-500">
          <Network size={28} />
          <p className="text-sm">No pages to graph yet.</p>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-ink-900/80 px-4 py-1.5 text-xs text-ink-400 backdrop-blur">
        Drag nodes · scroll to zoom · click a node to open
      </div>

      {/* Legend */}
      <div className="absolute right-4 top-4 flex flex-col gap-1.5 rounded-xl bg-ink-900/70 p-3 backdrop-blur">
        {spaces.map((s) => (
          <span key={s.id} className="flex items-center gap-2 text-xs text-ink-300">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
