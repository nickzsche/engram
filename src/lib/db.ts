import { Dexie } from 'dexie';
import type { Space, Page, Tag, Template, Settings, Block } from '@/types';

export class EngramDB extends Dexie {
  spaces!: Dexie.Table<Space, string>;
  pages!: Dexie.Table<Page, string>;
  tags!: Dexie.Table<Tag, string>;
  templates!: Dexie.Table<Template, string>;
  settings!: Dexie.Table<Settings, string>;
  blocks!: Dexie.Table<Block, string>;

  constructor() {
    super('engram');
    // NOTE: IndexedDB cannot index booleans (isFavorite/isTrashed/isBuiltIn),
    // so those fields are filtered in JS instead of queried by index.
    this.version(1).stores({
      spaces: 'id, name, order',
      pages: 'id, spaceId, parentId, title, order',
      tags: 'id, name',
      templates: 'id, name, category',
      settings: 'id, key',
      blocks: 'id, pageId, order',
    });
  }
}

export const db = new EngramDB();
