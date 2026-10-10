'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Search, Network, BarChart3, Layers, Trash2, Settings, FileText, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CommandItem } from '@/types';
import type { Page, Space, ViewType } from '@/types';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  spaces: Space[];
  pages: Page[];
  activeSpaceId: string | null;
  onOpenPage: (id: string) => void;
  onSelectSpace: (id: string | null) => void;
  onNewPage: (spaceId?: string | null) => void;
  onViewChange: (view: ViewType) => void;
}

export default function CommandPalette({
  open,
  onClose,
  spaces,
  pages,
  activeSpaceId,
  onOpenPage,
  onSelectSpace,
  onNewPage,
  onViewChange,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const live = pages.filter((p) => !p.isTrashed);
  const recentPages = useMemo(
    () => [...live].sort((a, b) => b.lastEditedAt - a.lastEditedAt),
    [live],
  );

  const items = useMemo<CommandItem[]>(() => {
    const q = query.trim().toLowerCase();
    const match = (item: CommandItem) =>
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.includes(q));

    const actions: CommandItem[] = [
      {
        id: 'new-note',
        title: 'New note',
        description: 'In current space',
        icon: <Plus size={16} />,
        shortcut: 'N',
        section: 'Actions',
        keywords: ['create', 'note', 'page'],
        action: () => onNewPage(activeSpaceId),
      },
      ...spaces.slice(0, 6).map((space, i): CommandItem => ({
        id: `new-note-${space.id}`,
        title: `New note in ${space.name}`,
        icon: <Plus size={16} />,
        section: 'Actions',
        keywords: ['create', space.name.toLowerCase()],
        action: () => onNewPage(space.id),
      })),
      {
        id: 'view-search',
        title: 'Search all notes',
        icon: <Search size={16} />,
        section: 'Go to',
        keywords: ['search', 'find', 'full text'],
        action: () => onViewChange('search'),
      },
      {
        id: 'view-graph',
        title: 'Open graph view',
        icon: <Network size={16} />,
        section: 'Go to',
        keywords: ['graph', 'map', 'links'],
        action: () => onViewChange('graph'),
      },
      {
        id: 'view-stats',
        title: 'Open writing stats',
        icon: <BarChart3 size={16} />,
        section: 'Go to',
        keywords: ['stats', 'streak', 'heatmap'],
        action: () => onViewChange('stats'),
      },
      {
        id: 'view-templates',
        title: 'Browse templates',
        icon: <Layers size={16} />,
        section: 'Go to',
        keywords: ['template', 'meeting', 'journal'],
        action: () => onViewChange('templates'),
      },
      {
        id: 'view-trash',
        title: 'Open trash',
        icon: <Trash2 size={16} />,
        section: 'Go to',
        keywords: ['trash', 'deleted'],
        action: () => onViewChange('trash'),
      },
      {
        id: 'view-settings',
        title: 'Settings & data',
        icon: <Settings size={16} />,
        section: 'Go to',
        keywords: ['settings', 'export', 'import'],
        action: () => onViewChange('settings'),
      },
    ].filter(match);

    const pageItems: CommandItem[] = (q ? recentPages : recentPages.slice(0, 8))
      .filter((p) => !q || p.title.toLowerCase().includes(q))
      .slice(0, q ? 12 : 8)
      .map((p): CommandItem => ({
        id: `page-${p.id}`,
        title: p.title || 'Untitled',
        description: spaces.find((s) => s.id === p.spaceId)?.name,
        icon: <FileText size={16} className="text-ink-500" />,
        section: 'Notes',
        keywords: ['open'],
        action: () => onOpenPage(p.id),
      }));

    const spaceItems: CommandItem[] = (q ? spaces : [])
      .filter((s) => s.name.toLowerCase().includes(q))
      .slice(0, 6)
      .map((s): CommandItem => ({
        id: `space-${s.id}`,
        title: s.name,
        description: `${live.filter((p) => p.spaceId === s.id).length} notes`,
        icon: <Layers size={16} style={{ color: s.color }} />,
        section: 'Spaces',
        keywords: ['space'],
        action: () => onSelectSpace(s.id),
      }));

    return [...actions, ...pageItems, ...spaceItems];
  }, [query, spaces, recentPages, activeSpaceId, onNewPage, onOpenPage, onSelectSpace, onViewChange]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-selected="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const runItem = (item: CommandItem | undefined) => {
    if (!item) return;
    onClose();
    item.action();
  };

  const sections = useMemo(() => {
    const map = new Map<string, { item: CommandItem; index: number }[]>();
    items.forEach((item, index) => {
      const list = map.get(item.section) ?? [];
      list.push({ item, index });
      map.set(item.section, list);
    });
    return map;
  }, [items]);

  return (
    <AnimatePresence>
      {open && (
        <div className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette">
          <motion.div
            className="command-palette-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="command-palette-window overflow-hidden"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-center gap-3 border-b border-ink-700/60 px-5">
              <Search size={18} className="shrink-0 text-ink-500" />
              <input
                ref={inputRef}
                className="command-palette-input"
                placeholder="Search notes, jump anywhere…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelected((i) => Math.min(items.length - 1, i + 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelected((i) => Math.max(0, i - 1));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    runItem(items[selected]);
                  } else if (e.key === 'Escape') {
                    onClose();
                  }
                }}
              />
              <kbd className="rounded bg-ink-800 px-2 py-1 font-mono text-[10px] text-ink-500">ESC</kbd>
            </div>

            <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2">
              {items.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-ink-500">No matches for “{query}”</p>
              ) : (
                [...sections.entries()].map(([section, entries]) => (
                  <div key={section}>
                    <p className="command-palette-section">{section}</p>
                    {entries.map(({ item, index }) => (
                      <button
                        key={item.id}
                        className={cn('command-palette-item w-full text-left border-none bg-transparent', index === selected && 'selected')}
                        data-selected={index === selected}
                        onMouseEnter={() => setSelected(index)}
                        onClick={() => runItem(item)}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-800">
                            {item.icon ?? <FileText size={15} />}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{item.title}</span>
                            {item.description && (
                              <span className="block truncate text-xs text-ink-500">{item.description}</span>
                            )}
                          </span>
                        </span>
                        {index === selected && <CornerDownLeft size={14} className="shrink-0 text-ink-500" />}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
