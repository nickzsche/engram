'use client';

import { useMemo } from 'react';
import { Plus, FileText, Layers } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { Page, Space } from '@/types';
import Editor from '@/components/editor/Editor';

interface NotesViewProps {
  spaces: Space[];
  pages: Page[];
  activeSpace: Space | null;
  activePageId: string | null;
  onSelectSpace: (id: string | null) => void;
  onSelectPage: (id: string) => void;
  onNewPage: (spaceId?: string | null) => void;
  onOpenPalette: () => void;
}

export default function NotesView({
  spaces,
  pages,
  activeSpace,
  activePageId,
  onSelectPage,
  onNewPage,
}: NotesViewProps) {
  const spacePages = useMemo(
    () =>
      pages
        .filter((p) => !p.isTrashed && p.spaceId === activeSpace?.id)
        .sort((a, b) => b.lastEditedAt - a.lastEditedAt),
    [pages, activeSpace],
  );

  const activePage = useMemo(
    () => pages.find((p) => p.id === activePageId && !p.isTrashed) ?? null,
    [pages, activePageId],
  );

  if (!activeSpace) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center animate-fade-in">
        <Layers className="text-ink-500" size={32} />
        <h2 className="font-display text-2xl font-bold">Create your first space</h2>
        <p className="max-w-sm text-sm text-ink-400">
          Spaces group your notes — like Personal, Work or Ideas. Use the ＋ button next to “Spaces” in the sidebar.
        </p>
      </div>
    );
  }

  if (activePage) {
    return (
      <div className="flex h-full flex-col">
        <Editor key={activePage.id} pageId={activePage.id} />
      </div>
    );
  }

  const recent = spacePages.slice(0, 12);
  return (
    <div className="mx-auto max-w-4xl px-6 py-10 animate-fade-in">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: activeSpace.color }}>
          Space
        </p>
        <h1 className="font-display text-3xl font-bold">{activeSpace.name}</h1>
        <p className="mt-1 text-sm text-ink-400">
          {spacePages.length} note{spacePages.length === 1 ? '' : 's'}
        </p>
      </header>

      <button className="btn-primary mb-8" onClick={() => onNewPage(activeSpace.id)}>
        <Plus size={16} /> New note here
      </button>

      {recent.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-3 p-10 text-center">
          <FileText className="text-ink-500" size={28} />
          <p className="text-sm text-ink-400">Nothing here yet. Your first note is one keystroke away.</p>
          <kbd className="rounded bg-ink-800 px-2 py-1 font-mono text-xs text-ink-400">Ctrl K — command palette</kbd>
        </div>
      ) : (
        <>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-500">Recently edited</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((page) => (
              <button
                key={page.id}
                className={cn('card-hover !p-4 flex flex-col gap-1.5 text-left')}
                onClick={() => onSelectPage(page.id)}
              >
                <span className="truncate font-medium">{page.title || 'Untitled'}</span>
                <span className="text-xs text-ink-500">{formatDate(page.lastEditedAt)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
