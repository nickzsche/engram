import type { Page, Space } from '@/types';
import { db } from '@/lib/db';
import { uid } from '@/lib/utils';

export async function createPage(spaceId: string, opts?: Partial<Page>): Promise<Page> {
  const now = Date.now();
  const siblings = await db.pages.where('spaceId').equals(spaceId).toArray();
  const page: Page = {
    id: uid('pg-'),
    spaceId,
    parentId: opts?.parentId ?? null,
    title: opts?.title ?? '',
    content: opts?.content ?? JSON.stringify({ type: 'doc', content: [] }),
    order: opts?.order ?? siblings.length,
    isFavorite: false,
    isTrashed: false,
    tagIds: [],
    createdAt: now,
    updatedAt: now,
    lastEditedAt: now,
    ...opts,
  };
  await db.pages.add(page);
  return page;
}

export async function savePageContent(id: string, content: string): Promise<void> {
  const now = Date.now();
  await db.pages.update(id, { content, updatedAt: now, lastEditedAt: now });
}

export async function renamePage(id: string, title: string): Promise<void> {
  await db.pages.update(id, { title, updatedAt: Date.now() });
}

export async function toggleFavorite(page: Page): Promise<void> {
  await db.pages.update(page.id, { isFavorite: !page.isFavorite });
}

export async function trashPage(id: string): Promise<void> {
  await db.pages.update(id, { isTrashed: true, updatedAt: Date.now() });
}

export async function restorePage(id: string): Promise<void> {
  await db.pages.update(id, { isTrashed: false, updatedAt: Date.now() });
}

export async function purgePage(id: string): Promise<void> {
  await db.pages.delete(id);
}

export async function emptyTrash(): Promise<void> {
  const all = await db.pages.toArray();
  const trashed = all.filter((p) => p.isTrashed);
  await db.pages.bulkDelete(trashed.map((p) => p.id));
}

export async function createSpace(name: string, icon: string, color: string): Promise<Space> {
  const now = Date.now();
  const all = await db.spaces.toArray();
  const space: Space = {
    id: uid('sp-'),
    name,
    icon,
    color,
    order: all.length,
    createdAt: now,
    updatedAt: now,
  };
  await db.spaces.add(space);
  return space;
}

export async function updateSpace(id: string, patch: Partial<Space>): Promise<void> {
  await db.spaces.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteSpace(id: string): Promise<void> {
  const pages = await db.pages.where('spaceId').equals(id).toArray();
  await db.transaction('rw', db.spaces, db.pages, async () => {
    await db.pages.bulkDelete(pages.map((p) => p.id));
    await db.spaces.delete(id);
  });
}

export async function upsertTag(name: string, color: string): Promise<string | null> {
  const trimmed = name.trim().toLowerCase().replace(/\s+/g, '-');
  if (!trimmed) return null;
  const existing = await db.tags.where('name').equals(trimmed).first();
  if (existing) return existing.id;
  const id = uid('tag-');
  await db.tags.add({ id, name: trimmed, color, createdAt: Date.now() });
  return id;
}
