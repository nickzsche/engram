'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search as SearchIcon, FileText, Star } from 'lucide-react';
import { db } from '@/lib/db';
import { highlightParts, searchPages } from '@/lib/search';
import { formatDate } from '@/lib/utils';
import type { Page, Space } from '@/types';

interface SearchViewProps {
  onSelectPage: (id: string) => void;
}

/** Renders a snippet with the matched query wrapped in <mark>. */
function Highlighted({ snippet, query }: { snippet: string; query: string }) {
  return (
    <>
      {highlightParts(snippet, query).map((part, i) =>
        part.hit ? (
          <mark key={i} className="search-hit">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

export default function SearchView({ onSelectPage }: SearchViewProps) {
  const pages = useLiveQuery(() => db.pages.toArray(), [], undefined as Page[] | undefined);
  const spaces = useLiveQuery(() => db.spaces.toArray(), [], undefined as Space[] | undefined);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(
    () => (pages && spaces ? searchPages(query, pages, spaces) : []),
    [query, pages, spaces],
  );

  const trimmed = query.trim();
  const liveCount = (pages ?? []).filter((p) => !p.isTrashed).length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 animate-fade-in">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-cyan">Find</p>
        <h1 className="font-display text-3xl font-bold">Search</h1>
      </header>

      <div className="glass-card mb-6 flex items-center gap-3 !p-2">
        <SearchIcon size={18} className="ml-2 shrink-0 text-ink-500" />
        <input
          ref={inputRef}
          className="w-full bg-transparent px-1 py-3 text-ink-100 outline-none placeholder:text-ink-500"
          placeholder="Search titles and note text…"
          aria-label="Search notes"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) onSelectPage(results[0].page.id);
            if (e.key === 'Escape') setQuery('');
          }}
        />
        {trimmed && (
          <span className="mr-2 shrink-0 text-xs text-ink-500">
            {results.length} result{results.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {!pages || !spaces ? (
        <p className="text-ink-500">Loading…</p>
      ) : !trimmed ? (
        <p className="text-sm text-ink-500">
          Type to search across {liveCount} note{liveCount === 1 ? '' : 's'}. Results rank title matches
          highest, then body matches with highlighted snippets.
        </p>
      ) : results.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-3 p-10 text-center">
          <FileText className="text-ink-500" size={28} />
          <p className="text-sm text-ink-400">No notes match “{query}”.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {results.map(({ page, space, highlights }) => (
            <li key={page.id}>
              <button
                className="glass-card w-full !p-4 text-left transition-colors hover:border-accent-violet/40"
                onClick={() => onSelectPage(page.id)}
              >
                <div className="flex items-center gap-2">
                  {page.isFavorite && (
                    <Star size={13} className="shrink-0 fill-amber-400 text-amber-400" />
                  )}
                  <span className="truncate font-medium">{page.title || 'Untitled'}</span>
                  <span className="badge-muted ml-auto shrink-0" style={{ color: space.color }}>
                    {space.name}
                  </span>
                </div>
                {highlights.length > 0 && (
                  <p className="mt-1.5 line-clamp-2 text-sm text-ink-400">
                    <Highlighted snippet={highlights[0]} query={trimmed} />
                  </p>
                )}
                <p className="mt-1 text-xs text-ink-500">{formatDate(page.lastEditedAt)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
