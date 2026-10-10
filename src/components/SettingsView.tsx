'use client';

import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Upload, Database, WifiOff, AlertTriangle, Sparkles } from 'lucide-react';
import { db } from '@/lib/db';
import { toastBus } from '@/lib/toast';
import type { Page, Space, Tag, Template, Settings, Block } from '@/types';

interface Backup {
  version: 1;
  exportedAt: number;
  spaces: Space[];
  pages: Page[];
  tags: Tag[];
  templates: Template[];
  settings: Settings[];
  blocks?: Block[];
}

export default function SettingsView() {
  const all = useLiveQuery(
    async () => ({
      spaces: await db.spaces.toArray(),
      pages: await db.pages.toArray(),
      tags: await db.tags.toArray(),
      templates: await db.templates.toArray(),
      settings: await db.settings.toArray(),
    }),
    [],
  );
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  useEffect(() => {
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then((est) => {
        setStorage({ usage: est.usage ?? 0, quota: est.quota ?? 0 });
      });
    }
  }, []);

  const exportData = async () => {
    const backup: Backup = {
      version: 1,
      exportedAt: Date.now(),
      spaces: await db.spaces.toArray(),
      pages: await db.pages.toArray(),
      tags: await db.tags.toArray(),
      templates: await db.templates.toArray(),
      settings: await db.settings.toArray(),
      blocks: await db.blocks.toArray(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `engram-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toastBus.success('Backup downloaded');
  };

  const importData = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as Backup;
      if (data.version !== 1 || !Array.isArray(data.pages)) throw new Error('bad shape');
      await db.transaction('rw', db.spaces, db.pages, db.tags, db.templates, async () => {
        if (data.spaces) await db.spaces.bulkPut(data.spaces);
        if (data.pages) await db.pages.bulkPut(data.pages);
        if (data.tags) await db.tags.bulkPut(data.tags);
        if (data.templates) await db.templates.bulkPut(data.templates);
      });
      toastBus.success(`Imported ${data.pages.length} notes`);
    } catch {
      toastBus.error('Import failed — not an ENGRAM backup');
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 animate-fade-in">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-violet">Your data, your device</p>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
      </header>

      <section className="glass-card mb-4 !p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink-200">
          <Database size={15} className="text-accent-cyan" /> Storage
        </h2>
        <p className="text-sm text-ink-400">
          {all ? `${all.pages.length} notes · ${all.spaces.length} spaces · ${all.tags.length} tags` : '…'}
          {storage
            ? ` · ${(storage.usage / 1024 / 1024).toFixed(1)} MB used of ~${Math.round(storage.quota / 1024 / 1024 / 1024 * 10) / 10} GB available`
            : ''}
        </p>
        <p className="mt-2 text-xs text-ink-500">
          Everything is stored locally in IndexedDB. No account, no telemetry, works offline.
        </p>
      </section>

      <section className="glass-card mb-4 !p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink-200">Backup & restore</h2>
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary" onClick={() => void exportData()}>
            <Download size={15} /> Export JSON
          </button>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importData(file);
              e.target.value = '';
            }}
          />
        </div>
      </section>

      <section className="glass-card mb-4 !p-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-200">
          <WifiOff size={15} className="text-accent-cyan" /> Install as app
        </h2>
        <p className="text-sm text-ink-400">
          ENGRAM is a PWA. In Chrome/Edge use the install icon in the address bar; on iOS Safari choose
          “Add to Home Screen”. Installed, it runs full-screen and fully offline.
        </p>
      </section>

      <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-300">
          <AlertTriangle size={15} /> Danger zone
        </h2>
        <p className="mb-3 text-sm text-ink-400">Wipes every note, space and tag from this device.</p>
        <button
          className="btn-danger"
          onClick={async () => {
            if (!confirmWipe) {
              setConfirmWipe(true);
              setTimeout(() => setConfirmWipe(false), 4000);
              return;
            }
            await db.delete();
            window.location.reload();
          }}
        >
          {confirmWipe ? 'Press again to wipe everything' : 'Delete all local data'}
        </button>
      </section>

      <footer className="mt-8 flex items-center gap-2 pb-6 text-xs text-ink-500">
        <Sparkles size={13} className="text-accent-violet" />
        ENGRAM v1.0 · local-first · Midnight Ink theme
      </footer>
    </div>
  );
}
