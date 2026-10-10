'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { PanelLeft, Plus, Search, Network, BarChart3, LayoutGrid, Settings, Sparkles } from 'lucide-react';
import { db } from '@/lib/db';
import { ensureSeedData, WELCOME_PAGE_ID } from '@/lib/seed';
import { createPage } from '@/lib/db-actions';
import { cn } from '@/lib/utils';
import type { Page, Space, ViewType } from '@/types';
import Sidebar from '@/components/Sidebar';
import NotesView from '@/components/NotesView';
import SearchView from '@/components/SearchView';
import GraphView from '@/components/GraphView';
import StatsView from '@/components/StatsView';
import TemplatesView from '@/components/TemplatesView';
import TrashView from '@/components/TrashView';
import SettingsView from '@/components/SettingsView';
import CommandPalette from '@/components/CommandPalette';
import ToastHost from '@/components/ToastHost';

const UI_STATE_KEY = 'ui:last';

export default function AppShell() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<ViewType>('notes');
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const spaces = useLiveQuery(() => db.spaces.orderBy('order').toArray(), [], undefined as Space[] | undefined);
  const pages = useLiveQuery(() => db.pages.toArray(), [], undefined as Page[] | undefined);

  // Boot: seed demo data on first run + restore session + register SW
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureSeedData();
      if (cancelled) return;
      try {
        const state = (await db.settings.get(UI_STATE_KEY))?.value as
          | { view?: ViewType; spaceId?: string; pageId?: string }
          | undefined;
        const allSpaces = await db.spaces.toArray();
        const allPages = await db.pages.toArray();
        const spaceOk = state?.spaceId && allSpaces.some((s) => s.id === state.spaceId);
        const pageOk =
          state?.pageId && allPages.some((p) => p.id === state.pageId && !p.isTrashed);
        setActiveSpaceId(spaceOk ? state!.spaceId! : allSpaces[0]?.id ?? null);
        setActivePageId(pageOk ? state!.pageId! : allPages.find((p) => p.id === WELCOME_PAGE_ID && !p.isTrashed)?.id ?? null);
        if (state?.view) setView(state.view);
      } catch {
        // fresh DB will be populated by ensureSeedData above
        const allSpaces = await db.spaces.toArray();
        setActiveSpaceId((cur) => cur ?? allSpaces[0]?.id ?? null);
      }
      if (!cancelled) setMounted(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Register service worker in production builds
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* offline-first still works without SW */
      });
    }
  }, []);

  // Persist UI session
  useEffect(() => {
    if (!mounted) return;
    void db.settings.put({
      id: UI_STATE_KEY,
      key: UI_STATE_KEY,
      value: { view, spaceId: activeSpaceId, pageId: activePageId },
      updatedAt: Date.now(),
    });
  }, [mounted, view, activeSpaceId, activePageId]);

  const openPage = useCallback((id: string) => {
    setActivePageId(id);
    setView('notes');
    setSidebarOpen(false);
  }, []);

  // Editor bubbles navigation (wikilinks, trash) up via this custom event
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (!id) {
        setActivePageId(null);
        return;
      }
      openPage(id);
    };
    window.addEventListener('engram:navigate', handler);
    return () => window.removeEventListener('engram:navigate', handler);
  }, [openPage]);

  const selectSpace = useCallback((id: string | null) => {
    setActiveSpaceId(id);
    setView('notes');
    setSidebarOpen(false);
  }, []);

  const newPage = useCallback(
    async (spaceId?: string | null) => {
      const targetSpace = spaceId ?? activeSpaceId ?? spaces?.[0]?.id ?? null;
      if (!targetSpace) return;
      const page = await createPage(targetSpace);
      setActiveSpaceId(targetSpace);
      openPage(page.id);
    },
    [activeSpaceId, spaces, openPage],
  );

  // Global shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const favoritePages = useMemo(
    () => (pages ?? []).filter((p) => p.isFavorite && !p.isTrashed).slice(0, 8),
    [pages],
  );

  const spaceById = useMemo(() => new Map((spaces ?? []).map((s) => [s.id, s])), [spaces]);
  const activeSpace = activeSpaceId ? spaceById.get(activeSpaceId) ?? null : null;

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-accent shadow-glow-violet">
            <Sparkles className="h-8 w-8 text-ink-950" />
          </div>
          <p className="font-display text-xl font-bold tracking-wide gradient-text">ENGRAM</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-ink-950 text-ink-100">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-72 shrink-0 flex-col border-r border-ink-800/60 bg-ink-900/40 backdrop-blur-glass">
        <Sidebar
          spaces={spaces ?? []}
          pages={pages ?? []}
          favoritePages={favoritePages}
          activeSpaceId={activeSpaceId}
          activePageId={activePageId}
          onSelectSpace={selectSpace}
          onSelectPage={openPage}
          onNewPage={() => void newPage()}
          view={view}
          onViewChange={setView}
        />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85vw] flex-col border-r border-ink-800 bg-ink-900 md:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
            >
              <Sidebar
                spaces={spaces ?? []}
                pages={pages ?? []}
                favoritePages={favoritePages}
                activeSpaceId={activeSpaceId}
                activePageId={activePageId}
                onSelectSpace={selectSpace}
                onSelectPage={openPage}
                onNewPage={() => void newPage()}
                view={view}
                onViewChange={setView}
                onClose={() => setSidebarOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-2 glass px-3 py-2.5 md:hidden">
          <button className="btn-ghost !px-2 !py-1.5" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
            <PanelLeft size={18} />
          </button>
          <span className="font-display text-sm font-bold tracking-wide gradient-text">ENGRAM</span>
          <span className="ml-auto" />
          <button className="btn-ghost !px-2 !py-1.5" onClick={() => setPaletteOpen(true)} aria-label="Command palette">
            <Search size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!spaces ? (
            <div className="flex h-full items-center justify-center p-10 text-ink-500">Loading…</div>
          ) : view === 'notes' ? (
            <NotesView
              spaces={spaces}
              pages={pages ?? []}
              activeSpace={activeSpace}
              activePageId={activePageId}
              onSelectSpace={selectSpace}
              onSelectPage={openPage}
              onNewPage={(spaceId) => void newPage(spaceId)}
              onOpenPalette={() => setPaletteOpen(true)}
            />
          ) : view === 'graph' ? (
            <GraphView
              spaces={spaces}
              pages={pages ?? []}
              onSelectPage={openPage}
            />
          ) : view === 'stats' ? (
            <StatsView spaces={spaces} pages={pages ?? []} onSelectPage={openPage} />
          ) : view === 'templates' ? (
            <TemplatesView defaultSpaceId={activeSpaceId ?? spaces[0]?.id ?? null} onCreated={openPage} />
          ) : view === 'search' ? (
            <SearchView onSelectPage={openPage} />
          ) : view === 'trash' ? (
            <TrashView onRestored={openPage} />
          ) : (
            <SettingsView />
          )}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav grid grid-cols-5 md:hidden">
        {([
          ['notes', 'Notes', LayoutGrid],
          ['search', 'Search', Search],
          ['graph', 'Graph', Network],
          ['stats', 'Stats', BarChart3],
          ['settings', 'Settings', Settings],
        ] as [ViewType, string, typeof LayoutGrid][]).map(([v, label, Icon]) => (
          <button
            key={v}
            className={cn('bottom-nav-item', view === v && 'active')}
            onClick={() => setView(v)}
            aria-current={view === v ? 'page' : undefined}
          >
            <Icon className="bottom-nav-item-icon" size={22} />
            <span className="bottom-nav-item-label">{label}</span>
          </button>
        ))}
      </nav>

      {/* Floating new-page button (desktop) */}
      <button
        className="btn-primary fixed bottom-6 right-6 z-30 hidden !rounded-full !px-4 !shadow-glow-violet md:inline-flex"
        onClick={() => void newPage()}
        title="New note (in current space)"
      >
        <Plus size={18} /> New note
      </button>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        spaces={spaces ?? []}
        pages={pages ?? []}
        activeSpaceId={activeSpaceId}
        onOpenPage={openPage}
        onSelectSpace={selectSpace}
        onNewPage={(spaceId) => void newPage(spaceId)}
        onViewChange={setView}
      />

      <ToastHost />
    </div>
  );
}
