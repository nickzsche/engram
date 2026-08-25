'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layers } from 'lucide-react';
import { db } from '@/lib/db';
import { createPage } from '@/lib/db-actions';
import { toastBus } from '@/lib/toast';
import type { Space, Template } from '@/types';

interface TemplatesViewProps {
  defaultSpaceId: string | null;
  onCreated: (pageId: string) => void;
}

export default function TemplatesView({ defaultSpaceId, onCreated }: TemplatesViewProps) {
  const templates = useLiveQuery(() => db.templates.toArray(), [], undefined as Template[] | undefined);
  const spaces = useLiveQuery(() => db.spaces.toArray(), [], undefined as Space[] | undefined);
  const [spaceId, setSpaceId] = useState<string>(defaultSpaceId ?? '');

  const effectiveSpaceId = spaceId || defaultSpaceId || spaces?.[0]?.id || '';
  const grouped = useMemo(() => {
    const map = new Map<string, Template[]>();
    for (const tpl of templates ?? []) {
      const list = map.get(tpl.category) ?? [];
      list.push(tpl);
      map.set(tpl.category, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [templates]);

  const useTemplate = async (tpl: Template) => {
    if (!effectiveSpaceId) {
      toastBus.error('Create a space first');
      return;
    }
    const page = await createPage(effectiveSpaceId, {
      title: tpl.name,
      content: tpl.content,
      parentId: null,
    });
    toastBus.success(`Created from “${tpl.name}”`);
    onCreated(page.id);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 animate-fade-in">
      <header className="mb-8 flex flex-wrap items-end gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-cyan">Start fast</p>
          <h1 className="font-display text-3xl font-bold">Templates</h1>
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm text-ink-400">
          Create in
          <select
            className="input !w-auto !py-1.5 !text-sm"
            value={effectiveSpaceId}
            onChange={(e) => setSpaceId(e.target.value)}
          >
            {(spaces ?? []).map((s) => (
              <option key={s.id} value={s.id} className="bg-ink-900">
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      {!templates ? (
        <p className="text-ink-500">Loading…</p>
      ) : (
        <div className="flex flex-col gap-8">
          {grouped.map(([category, tpls]) => (
            <section key={category}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-500">{category}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tpls.map((tpl) => (
                  <button
                    key={tpl.id}
                    className="card-hover flex flex-col items-start gap-2 !p-5 text-left"
                    onClick={() => void useTemplate(tpl)}
                  >
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-xl"
                      style={{ background: `${tpl.color}22`, color: tpl.color }}
                    >
                      <Layers size={17} />
                    </span>
                    <span className="font-medium">{tpl.name}</span>
                    <span className="text-xs text-ink-500">
                      {tpl.isBuiltIn ? 'Built-in · ' : ''}click to instantiate
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
