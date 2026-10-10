# ENGRAM

**A premium local-first note-taking PWA.** Your second brain, stored on your own hardware.

ENGRAM is a rich, keyboard-friendly notebook that runs entirely in your browser. No accounts, no servers, no telemetry — every note lives in IndexedDB on your device, and the app keeps working with the network switched off.

![theme](https://img.shields.io/badge/theme-Midnight_Ink-a855f7) ![local--first](https://img.shields.io/badge/local--first-100%25-22d3ee) ![privacy](https://img.shields.io/badge/telemetry-none-34d399) ![stack](https://img.shields.io/badge/stack-Next.js_14_·_TipTap_·_Dexie-818cf8)

## Features

- ✍️ **Rich editor** — headings, lists, to-dos, quotes, tables, syntax-highlighted code blocks, images, smart typography (TipTap / ProseMirror)
- 🧠 **Wikilinks & backlinks** — type `[[` to link any page; every page lists the notes that link back to it
- 🔎 **Full-text search** — ranked search across titles and note bodies with highlighted snippets (`Ctrl/Cmd + K` for the palette, or open the Search view)
- ⚡ **Command palette** — `Ctrl/Cmd + K` to create, search and jump anywhere without touching the mouse
- 🕸️ **Graph view** — force-directed map of your notes, wired by hierarchy and wikilinks (canvas-rendered, draggable, zoomable)
- 📊 **Writing stats** — total words, weekly volume, current & longest streaks, a 26-week activity heatmap, words per space
- 🗂️ **Spaces & sub-pages** — group notes into colored spaces; nest pages one level deep
- 🏷️ **Tags & favorites** — lightweight tags per page; star pages for quick access
- 🧩 **Templates** — daily journal, meeting notes, project brief, book notes, weekly review
- 🗑️ **Trash** — soft delete with restore or permanent purge
- 💾 **Local-first storage** — Dexie.js over IndexedDB, autosaved as you type; export/import full JSON backups from Settings
- 📱 **Installable PWA** — web app manifest, service-worker shell caching, offline-ready, mobile bottom-nav UI
- 🌙 **Midnight Ink theme** — deep ink-dark UI with violet→cyan accents, glassmorphism, motion via Framer Motion

## Quick start

```bash
npm install
npm run build     # production build
npm start         # serves on http://localhost:3410
```

Development:

```bash
npm run dev       # dev server on http://localhost:3410
```

Other scripts:

```bash
npm run typecheck # tsc --noEmit
npm run icons     # regenerate PWA PNG icons (pure Node, no deps)
```

First launch seeds a small set of demo spaces and notes so nothing is empty. They already contain real wikilinks, so backlinks and the graph are populated from the first minute. Delete them whenever you like — or wipe everything from **Settings → Danger zone**. Seeding only ever runs once and never overwrites existing data.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd K` | Command palette (create, search, navigate) |
| `/` (in editor) | Block menu |
| `[[` (in editor) | Link another page |
| `Enter` (on title) | Focus the editor |
| `Esc` | Close palette / clear search |

## Architecture

ENGRAM is a single static Next.js App Router page. There is no backend and no API routes — the browser *is* the database.

```
UI (React 18)  ──►  Dexie 4  ──►  IndexedDB
     ▲                 │
     └── useLiveQuery ─┘   (components re-render on any table change)
```

- **State & persistence** — all reads happen in React components via `useLiveQuery`, so any write to Dexie re-renders every view that reads the affected table. The editor debounces writes (600 ms) and flushes the pending write on unmount so a page switch never drops the last keystrokes.
- **Schema** — six tables (`spaces`, `pages`, `tags`, `templates`, `settings`, `blocks`). Page content is stored as TipTap JSON in a single `content` string column. IndexedDB cannot index booleans, so `isFavorite` / `isTrashed` are filtered in JS rather than queried.
- **Routing** — no client-side router; a `ViewType` union (`notes | search | graph | stats | templates | trash | settings`) drives which view renders. The last view / space / page is persisted to the `settings` table and restored on reload.
- **Editor** — TipTap v3 (ProseMirror) with a custom `wikilink` mark, a `/` slash-block menu and a `[[` page-linker, both built on `@tiptap/suggestion` with a dependency-free popup renderer.
- **Navigation events** — wikilinks, backlinks and the trash view bubble navigation up to the shell through a `engram:navigate` custom DOM event, keeping the editor decoupled from routing.
- **Offline** — a hand-rolled service worker (`public/sw.js`) precaches the app shell and serves a cache-first strategy for same-origin GETs; the manifest makes the app installable to the home screen / desktop.
- **Zero-dependency icons** — `scripts/generate-icons.mjs` rasterizes the app icon and encodes PNGs with Node's built-in `zlib` (no image libraries).

## Data & privacy

All data is stored locally in your browser's IndexedDB under the `engram` database. Nothing leaves the device — no analytics, no sync endpoints, no network calls after the app has loaded. Use **Settings → Export JSON** for portable backups and **Import JSON** to restore them.

> Tip: browsers can clear site data. Keep regular exports if your notes matter.

## Project layout

```
src/
  app/              # Next.js App Router (layout, page)
  components/       # AppShell, Sidebar, NotesView, SearchView, GraphView, StatsView, …
    editor/         # TipTap editor + suggestion menus
  lib/
    db.ts           # Dexie schema
    db-actions.ts   # CRUD helpers
    seed.ts         # first-run demo content (with real wikilinks)
    search.ts       # local full-text scoring + snippet highlighting
    stats.ts        # streaks, heatmap, per-space stats
    graph.ts        # graph builder + force layout tick
    templates.ts    # built-in templates + TipTap JSON builders
    extensions/     # custom TipTap extensions (wikilink, slash & linker menus)
  types/            # shared TypeScript model
public/
  manifest.webmanifest, sw.js, icons/, favicon.svg
scripts/
  generate-icons.mjs
```

## Roadmap

Ideas that would deepen the local-first story — none block day-to-day use:

- **Cross-page rename propagation** — updating a wikilink target's title currently leaves existing links pointing at the old text.
- **Block table** — the `blocks` table exists for future block-level references/transclusion; nothing writes to it yet.
- **Export formats** — Markdown and static-HTML export alongside the JSON backup.
- **Graph filters** — filter the graph by space or tag, and hover-highlight neighbours.
- **Sync** — optional end-to-end-encrypted multi-device sync (kept strictly opt-in to preserve the no-server default).
- **Rich paste** — convert pasted HTML/Markdown into native TipTap nodes.
