'use client';

import { useMemo, useState } from 'react';
import {
  Heart,
  Briefcase,
  Lightbulb,
  BookOpen,
  Layers,
  FileText,
  Star,
  Plus,
  Trash2,
  Settings,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { createSpace } from '@/lib/db-actions';
import { cn } from '@/lib/utils';
import type { Page, Space, ViewType } from '@/types';

const SPACE_ICONS: Record<string, typeof Heart> = {
  heart: Heart,
  briefcase: Briefcase,
  lightbulb: Lightbulb,
  'book-open': BookOpen,
  layers: Layers,
};

function SpaceIcon({ icon, color }: { icon: string; color: string }) {
  const Icon = SPACE_ICONS[icon] ?? Layers;
  return <Icon size={15} style={{ color }} />;
}

interface SidebarProps {
  spaces: Space[];
  pages: Page[];
  favoritePages: Page[];
  activeSpaceId: string | null;
  activePageId: string | null;
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  onSelectSpace: (id: string | null) => void;
  onSelectPage: (id: string) => void;
  onNewPage: () => void;
  onClose?: () => void;
}

export default function Sidebar({
  spaces,
  pages,
  favoritePages,
  activeSpaceId,
  activePageId,
  view,
  onViewChange,
  onSelectSpace,
  onSelectPage,
  onNewPage,
  onClose,
}: SidebarProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const pagesBySpace = useMemo(() => {
    const map = new Map<string, Page[]>();
    for (const p of pages) {
      if (p.isTrashed) continue;
      const list = map.get(p.spaceId) ?? [];
      list.push(p);
      map.set(p.spaceId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
    }
    return map;
  }, [pages]);

  const submitNewSpace = async () => {
    const name = newName.trim();
    if (!name) {
      setCreating(false);
      return;
    }
    const palette = ['#a855f7', '#22d3ee', '#f59e0b', '#34d399', '#f472b6', '#818cf8'];
    const space = await createSpace(name, 'layers', palette[spaces.length % palette.length]);
    setNewName('');
    setCreating(false);
    onSelectSpace(space.id);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-accent shadow-glow-violet">
          <Sparkles className="h-5 w-5 text-ink-950" />
        </div>
        <span className="font-display text-lg font-bold tracking-wide gradient-text">ENGRAM</span>
        {onClose && (
          <button className="btn-ghost ml-auto !p-1.5" onClick={onClose} aria-label="Close sidebar">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="px-3">
        <button className="btn-primary w-full" onClick={onNewPage}>
          <Plus size={16} /> New note
        </button>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto px-3 pb-4 scrollbar-hide">
        {/* Favorites */}
        {favoritePages.length > 0 && (
          <section className="mb-4">
            <h3 className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">Favorites</h3>
            {favoritePages.map((page) => (
              <button
                key={page.id}
                className={cn(
                  'group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                  activePageId === page.id && view === 'notes'
                    ? 'bg-accent-violet/15 text-accent-violet'
                    : 'text-ink-300 hover:bg-ink-800/50 hover:text-ink-100',
                )}
                onClick={() => onSelectPage(page.id)}
              >
                <Star size={13} className="shrink-0 fill-current text-amber-400" />
                <span className="truncate">{page.title || 'Untitled'}</span>
              </button>
            ))}
          </section>
        )}

        {/* Spaces */}
        <section>
          <div className="mb-1 flex items-center justify-between px-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Spaces</h3>
            <button
              className="rounded-md p-1 text-ink-500 hover:bg-ink-800 hover:text-ink-200"
              onClick={() => setCreating(true)}
              aria-label="New space"
            >
              <Plus size={14} />
            </button>
          </div>

          {creating && (
            <div className="mb-1 px-1">
              <input
                autoFocus
                className="input !border-accent-violet/40 !bg-ink-800 !py-1.5 !text-sm"
                placeholder="Space name…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submitNewSpace();
                  if (e.key === 'Escape') {
                    setCreating(false);
                    setNewName('');
                  }
                }}
                onBlur={() => void submitNewSpace()}
              />
            </div>
          )}

          {spaces.map((space) => {
            const isActive = space.id === activeSpaceId;
            const spacePages = pagesBySpace.get(space.id) ?? [];
            return (
              <div key={space.id}>
                <button
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-ink-800/80 text-ink-100'
                      : 'text-ink-300 hover:bg-ink-800/50 hover:text-ink-100',
                  )}
                  onClick={() => onSelectSpace(space.id)}
                >
                  <SpaceIcon icon={space.icon} color={space.color} />
                  <span className="truncate">{space.name}</span>
                  <span className="ml-auto text-xs text-ink-500">{spacePages.length}</span>
                </button>

                {/* Page tree of the active space */}
                {isActive &&
                  spacePages
                    .filter((p) => !p.parentId)
                    .map((page) => {
                      const children = spacePages.filter((c) => c.parentId === page.id);
                      return (
                        <div key={page.id}>
                          <PageRow page={page} depth={0} activePageId={activePageId} onSelectPage={onSelectPage} />
                          {children.map((child) => (
                            <PageRow
                              key={child.id}
                              page={child}
                              depth={1}
                              activePageId={activePageId}
                              onSelectPage={onSelectPage}
                            />
                          ))}
                        </div>
                      );
                    })}
              </div>
            );
          })}
        </section>
      </div>

      {/* Footer utilities */}
      <div className="border-t border-ink-800/60 p-3">
        {([
          ['search', 'Search', Search],
          ['templates', 'Templates', Layers],
          ['stats', 'Writing stats', Sparkles],
          ['trash', 'Trash', Trash2],
          ['settings', 'Settings', Settings],
        ] as [ViewType, string, typeof Layers][]).map(([v, label, Icon]) => (
          <button
            key={v}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors',
              view === v ? 'bg-accent-violet/15 text-accent-violet' : 'text-ink-400 hover:bg-ink-800/50 hover:text-ink-100',
            )}
            onClick={() => onViewChange(v)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PageRow({
  page,
  depth,
  activePageId,
  onSelectPage,
}: {
  page: Page;
  depth: number;
  activePageId: string | null;
  onSelectPage: (id: string) => void;
}) {
  return (
    <button
      className={cn(
        'flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 text-left text-sm transition-colors',
        activePageId === page.id
          ? 'bg-accent-violet/15 text-accent-violet'
          : 'text-ink-400 hover:bg-ink-800/50 hover:text-ink-100',
      )}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
      onClick={() => onSelectPage(page.id)}
    >
      <FileText size={13} className="shrink-0 opacity-60" />
      <span className="truncate">{page.title || 'Untitled'}</span>
    </button>
  );
}
