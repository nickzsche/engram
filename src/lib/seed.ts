import type { Space, Page, Tag } from '@/types';
import { db } from '@/lib/db';
import { t as tt, BUILT_IN_TEMPLATES } from '@/lib/templates';

const DAY = 24 * 60 * 60 * 1000;

const SEED_FLAG = 'seed:v1';

/** Rich demo content so the app feels alive on first boot. */
export async function ensureSeedData(): Promise<void> {
  const flag = await db.settings.get(SEED_FLAG);
  if (flag) return;

  const spaceCount = await db.spaces.count();
  if (spaceCount > 0) {
    // DB already has user data; never seed over it.
    await db.settings.put({ id: SEED_FLAG, key: SEED_FLAG, value: true, updatedAt: Date.now() });
    return;
  }

  const now = Date.now();

  const spaces: Space[] = [
    { id: 'sp-personal', name: 'Personal', icon: 'heart', color: '#a855f7', order: 0, createdAt: now - 90 * DAY, updatedAt: now },
    { id: 'sp-work', name: 'Work', icon: 'briefcase', color: '#22d3ee', order: 1, createdAt: now - 90 * DAY, updatedAt: now },
    { id: 'sp-ideas', name: 'Ideas', icon: 'lightbulb', color: '#f59e0b', order: 2, createdAt: now - 80 * DAY, updatedAt: now },
    { id: 'sp-reading', name: 'Reading', icon: 'book-open', color: '#34d399', order: 3, createdAt: now - 75 * DAY, updatedAt: now },
  ];

  const tags: Tag[] = [
    { id: 'tag-q3', name: 'q3-planning', color: '#22d3ee', createdAt: now - 30 * DAY },
    { id: 'tag-ink', name: 'midnight-ink', color: '#a855f7', createdAt: now - 25 * DAY },
    { id: 'tag-someday', name: 'someday', color: '#65748e', createdAt: now - 20 * DAY },
    { id: 'tag-pwa', name: 'pwa', color: '#34d399', createdAt: now - 15 * DAY },
  ];

  // Edit-day offsets (days before now) — clustered to create streaks & heatmap texture
  const edits = (...offsetsDays: number[]) => offsetsDays.map((d) => now - d * DAY);

  const pages: Page[] = [
    {
      id: 'pg-welcome',
      spaceId: 'sp-personal',
      parentId: null,
      title: 'Welcome to ENGRAM',
      isFavorite: true,
      isTrashed: false,
      tagIds: ['tag-ink'],
      order: 0,
      createdAt: now - 30 * DAY,
      updatedAt: edits(0)[0],
      lastEditedAt: edits(0)[0],
      content: JSON.stringify(
        tt.doc(
          tt.h(1, 'Welcome to ENGRAM'),
          tt.p('This is your local-first notebook. Everything you write lives in your browser’s IndexedDB — no accounts, no servers, works offline.'),
          tt.h(2, 'Quick start'),
          tt.tasks([
            { done: true, text: 'Open the command palette with Ctrl+K' },
            { done: false, text: 'Type / for the block menu' },
            { done: false, text: 'Type [[ to link another page' },
            { done: false, text: 'Install it as an app from your browser menu' },
          ]),
          tt.h(2, 'Linking pages'),
          tt.p2(
            'Notes connect like a second brain. Start with ',
            tt.wikilink('Why local-first?', 'pg-philosophy'),
            ', then skim the ',
            tt.wikilink('Q3 roadmap', 'pg-q3-roadmap'),
            ' to see links, backlinks and the graph in action.',
          ),
          tt.quote('An engram is a unit of cognitive memory imprinted in a neural substance — this app keeps yours on your own hardware.'),
        ),
      ),
    },
    {
      id: 'pg-philosophy',
      spaceId: 'sp-personal',
      parentId: null,
      title: 'Why local-first?',
      isFavorite: false,
      isTrashed: false,
      tagIds: ['tag-ink'],
      order: 1,
      createdAt: now - 21 * DAY,
      updatedAt: edits(1)[0],
      lastEditedAt: edits(1)[0],
      content: JSON.stringify(
        tt.doc(
          tt.h(2, 'Local-first manifesto, abridged'),
          tt.bullet([
            'Your notes are yours: stored on your device, readable without us.',
            'The network is optional: full functionality offline.',
            'Speed is a feature: reads and writes hit local disk, not a datacenter.',
            'Longevity: plain JSON you can export any time from Settings.',
          ]),
          tt.divider(),
          tt.p2(
            'Related: see ',
            tt.wikilink('Welcome to ENGRAM', 'pg-welcome'),
            ' for the tour, or skim the ',
            tt.wikilink('Q3 roadmap', 'pg-q3-roadmap'),
            ' for how we work.',
          ),
        ),
      ),
    },
    {
      id: 'pg-morning-pages',
      spaceId: 'sp-personal',
      parentId: null,
      title: 'Morning pages',
      isFavorite: false,
      isTrashed: false,
      tagIds: [],
      order: 2,
      createdAt: now - 14 * DAY,
      updatedAt: edits(0)[0],
      lastEditedAt: edits(0)[0],
      content: JSON.stringify(
        tt.doc(
          tt.h(2, 'Today'),
          tt.p('Coffee first. Then the hard thing on the list, before email gets a vote.'),
          tt.tasks([{ done: true, text: 'Stretch' }, { done: true, text: 'Write three pages' }, { done: false, text: 'Deep work block: ENGRAM graph view polish' }]),
        ),
      ),
    },
    {
      id: 'pg-q3-roadmap',
      spaceId: 'sp-work',
      parentId: null,
      title: 'Q3 roadmap',
      isFavorite: true,
      isTrashed: false,
      tagIds: ['tag-q3'],
      order: 0,
      createdAt: now - 40 * DAY,
      updatedAt: edits(2)[0],
      lastEditedAt: edits(2)[0],
      content: JSON.stringify(
        tt.doc(
          tt.h(1, 'Q3 roadmap'),
          tt.table([
            ['Initiative', 'Owner', 'Status'],
            ['Offline sync engine', 'Ada', 'In review'],
            ['Graph view v2', 'You', 'Shipped'],
            ['Mobile toolbar polish', 'Rae', 'Blocked'],
          ]),
          tt.h(3, 'Principles'),
          tt.bullet(['Local-first by default', 'Fast on cheap hardware', 'Keyboard-first UX']),
          tt.p2('Kickoff deck notes live in ', tt.wikilink('Design offsite 2026', 'pg-offsite'), '.'),
        ),
      ),
    },
    {
      id: 'pg-offsite',
      spaceId: 'sp-work',
      parentId: null,
      title: 'Design offsite 2026',
      isFavorite: false,
      isTrashed: false,
      tagIds: ['tag-q3'],
      order: 1,
      createdAt: now - 35 * DAY,
      updatedAt: edits(4)[0],
      lastEditedAt: edits(4)[0],
      content: JSON.stringify(
        tt.doc(
          tt.h(2, 'Offsite decisions'),
          tt.bullet(['Midnight Ink stays the default theme', 'Ship PWA install prompt after first save', 'Cut feature scope, not quality']),
          tt.code('ts', 'const theme = {\n  background: "#0b0e14",\n  accent: ["#a855f7", "#22d3ee"],\n} as const;'),
          tt.p2('Follow-ups tracked in ', tt.wikilink('Q3 roadmap', 'pg-q3-roadmap'), '.'),
        ),
      ),
    },
    {
      id: 'pg-standup',
      spaceId: 'sp-work',
      parentId: 'pg-q3-roadmap',
      title: 'Standup log',
      isFavorite: false,
      isTrashed: false,
      tagIds: [],
      order: 0,
      createdAt: now - 12 * DAY,
      updatedAt: edits(3)[0],
      lastEditedAt: edits(3)[0],
      content: JSON.stringify(
        tt.doc(
          tt.h(3, 'This week'),
          tt.tasks([
            { done: true, text: 'Service worker cache strategy' },
            { done: true, text: 'Wikilink input rule' },
            { done: false, text: 'Heatmap tooltips' },
          ]),
        ),
      ),
    },
    {
      id: 'pg-app-idea',
      spaceId: 'sp-ideas',
      parentId: null,
      title: 'Ambient soundscape timer',
      isFavorite: false,
      isTrashed: false,
      tagIds: ['tag-someday'],
      order: 0,
      createdAt: now - 18 * DAY,
      updatedAt: edits(6)[0],
      lastEditedAt: edits(6)[0],
      content: JSON.stringify(
        tt.doc(
          tt.h(2, 'Idea: ambient soundscape timer'),
          tt.p2('A focus timer where the soundscape evolves with your session length — rain intensifies as you near deep-work threshold. Pair with ', tt.wikilink('Pomodoro, reconsidered', 'pg-pomodoro'), '.'),
        ),
      ),
    },
    {
      id: 'pg-pomodoro',
      spaceId: 'sp-ideas',
      parentId: null,
      title: 'Pomodoro, reconsidered',
      isFavorite: false,
      isTrashed: false,
      tagIds: [],
      order: 1,
      createdAt: now - 17 * DAY,
      updatedAt: edits(5)[0],
      lastEditedAt: edits(5)[0],
      content: JSON.stringify(
        tt.doc(
          tt.h(2, 'Pomodoro, reconsidered'),
          tt.quote('Timers measure anxiety better than attention.'),
          tt.p2('What if sessions ended when the task reached a natural checkpoint instead of an arbitrary bell? Notes in ', tt.wikilink('Ambient soundscape timer', 'pg-app-idea'), '.'),
        ),
      ),
    },
    {
      id: 'pg-thinking-tools',
      spaceId: 'sp-ideas',
      parentId: null,
      title: 'Tools for thinking',
      isFavorite: true,
      isTrashed: false,
      tagIds: ['tag-pwa'],
      order: 2,
      createdAt: now - 10 * DAY,
      updatedAt: edits(1)[0],
      lastEditedAt: edits(1)[0],
      content: JSON.stringify(
        tt.doc(
          tt.h(2, 'Tools for thinking'),
          tt.bullet(['Writing is compressed thinking', 'Links are cheap; reviews are expensive', 'A note that can’t be found is a diary']),
          tt.p2('ENGRAM’s ', tt.wikilink('Why local-first?', 'pg-philosophy'), ' stance shapes all of these.'),
        ),
      ),
    },
    {
      id: 'pg-book-memory',
      spaceId: 'sp-reading',
      parentId: null,
      title: 'Moonwalking with Einstein',
      isFavorite: false,
      isTrashed: false,
      tagIds: [],
      order: 0,
      createdAt: now - 26 * DAY,
      updatedAt: edits(8)[0],
      lastEditedAt: edits(8)[0],
      content: JSON.stringify(
        tt.doc(
          tt.h(2, 'Moonwalking with Einstein'),
          tt.p('Joshua Foer · finished ★★★★☆'),
          tt.h(3, 'Big ideas'),
          tt.bullet(['Memory palaces work because spatial memory predates language', 'Attention, not retention, is the bottleneck']),
        ),
      ),
    },
    {
      id: 'pg-book-localfirst',
      spaceId: 'sp-reading',
      parentId: null,
      title: 'Ink & Switch: Local-first software',
      isFavorite: false,
      isTrashed: false,
      tagIds: ['tag-pwa'],
      order: 1,
      createdAt: now - 9 * DAY,
      updatedAt: edits(2)[0],
      lastEditedAt: edits(2)[0],
      content: JSON.stringify(
        tt.doc(
          tt.h(2, 'Local-first software (essay)'),
          tt.quote('We should expect more from our applications: speed, privacy, and multi-device support by default.'),
          tt.p2('The seven ideals map neatly onto ENGRAM — see ', tt.wikilink('Why local-first?', 'pg-philosophy'), '.'),
        ),
      ),
    },
    {
      id: 'pg-old-draft',
      spaceId: 'sp-personal',
      parentId: null,
      title: 'Old draft (deleted)',
      isFavorite: false,
      isTrashed: true,
      tagIds: [],
      order: 3,
      createdAt: now - 45 * DAY,
      updatedAt: now - 15 * DAY,
      lastEditedAt: now - 15 * DAY,
      content: JSON.stringify(tt.doc(tt.p('A draft that was moved to trash — restore it from Trash.'))),
    },
  ];

  // Give pages varied edit history so stats/heatmap look organic
  const historyOffsets: Record<string, number[]> = {
    'pg-welcome': [0, 1, 2, 4, 7, 8, 11],
    'pg-philosophy': [1, 3, 5, 9, 14],
    'pg-morning-pages': [0, 1, 2, 3, 5, 6, 8, 9, 10],
    'pg-q3-roadmap': [2, 3, 6, 10, 13, 17],
    'pg-offsite': [4, 5, 12, 19],
    'pg-standup': [3, 4, 9, 10, 11],
    'pg-app-idea': [6, 13, 27],
    'pg-pomodoro': [5, 16, 28],
    'pg-thinking-tools': [1, 2, 7, 15, 22],
    'pg-book-memory': [8, 20, 33],
    'pg-book-localfirst': [2, 9, 23],
  };
  for (const page of pages) {
    const offs = historyOffsets[page.id];
    if (offs?.length) {
      // earliest edit ≈ creation
      page.createdAt = Math.min(page.createdAt, now - offs[offs.length - 1] * DAY);
      page.updatedAt = page.lastEditedAt;
    }
  }

  await db.transaction('rw', db.spaces, db.pages, db.tags, db.templates, db.settings, async () => {
    await db.spaces.bulkAdd(spaces);
    await db.pages.bulkAdd(pages);
    await db.tags.bulkAdd(tags);
    if ((await db.templates.count()) === 0) {
      await db.templates.bulkAdd(
        BUILT_IN_TEMPLATES.map((tpl) => ({
          id: tpl.id,
          name: tpl.name,
          category: tpl.category,
          icon: tpl.icon,
          color: tpl.color,
          isBuiltIn: true,
          createdAt: now,
          content: JSON.stringify(tpl.content),
        })),
      );
    }
    await db.settings.put({ id: SEED_FLAG, key: SEED_FLAG, value: true, updatedAt: now });
  });
}

export const WELCOME_PAGE_ID = 'pg-welcome';
