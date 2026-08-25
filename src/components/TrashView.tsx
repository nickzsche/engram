'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2, RotateCcw } from 'lucide-react';
import { db } from '@/lib/db';
import { emptyTrash, purgePage, restorePage } from '@/lib/db-actions';
import { toastBus } from '@/lib/toast';
import { formatDate } from '@/lib/utils';

interface TrashViewProps {
  onRestored: (pageId: string) => void;
}

export default function TrashView({ onRestored }: TrashViewProps) {
  const pages = useLiveQuery(() => db.pages.toArray(), []);
  const spaces = useLiveQuery(() => db.spaces.toArray(), []);
  const [confirming, setConfirming] = useState(false);

  const trashed = (pages ?? [])
    .filter((p) => p.isTrashed)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 animate-fade-in">
      <header className="mb-8 flex flex-wrap items-center gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400">Recoverable</p>
          <h1 className="font-display text-3xl font-bold">Trash</h1>
        </div>
        {trashed.length > 0 && (
          <button
            className={`btn-danger ml-auto ${confirming ? 'animate-pulse' : ''}`}
            onClick={async () => {
              if (!confirming) {
                setConfirming(true);
                setTimeout(() => setConfirming(false), 3000);
                return;
              }
              await emptyTrash();
              setConfirming(false);
              toastBus.success('Trash emptied');
            }}
          >
            {confirming ? 'Really delete everything?' : 'Empty trash'}
          </button>
        )}
      </header>

      {trashed.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-3 p-10 text-center">
          <Trash2 className="text-ink-500" size={28} />
          <p className="text-sm text-ink-400">Nothing here. Deleted notes wait in this limbo until you decide.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {trashed.map((page) => (
            <li key={page.id} className="glass-card flex items-center gap-3 !p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{page.title || 'Untitled'}</p>
                <p className="text-xs text-ink-500">
                  {spaces?.find((s) => s.id === page.spaceId)?.name ?? 'Unfiled'} · deleted {formatDate(page.updatedAt)}
                </p>
              </div>
              <button
                className="btn-secondary !px-3 !py-1.5"
                onClick={async () => {
                  await restorePage(page.id);
                  toastBus.success('Restored');
                  onRestored(page.id);
                }}
              >
                <RotateCcw size={14} /> Restore
              </button>
              <button
                className="btn-danger !px-3 !py-1.5"
                onClick={async () => {
                  await purgePage(page.id);
                  toastBus.success('Deleted forever');
                }}
              >
                Delete forever
              </button>
            </li>
          ))}
        </ul>
      )}
      {confirming && <p className="sr-only">Press again to confirm emptying the trash.</p>}
    </div>
  );
}
