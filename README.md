# ENGRAM

**A premium local-first note-taking PWA.** Your second brain, stored on your own hardware.

ENGRAM is a rich, keyboard-friendly notebook that runs entirely in your browser. No accounts, no servers, no telemetry — every note lives in IndexedDB on your device, and the app keeps working with the network switched off.

![theme](https://img.shields.io/badge/theme-Midnight_Ink-a855f7) ![license](https://img.shields.io/badge/license-MIT-green) ![stack](https://img.shields.io/badge/stack-Next.js_14_·_TipTap_·_Dexie-22d3ee)

## Features

- ✍️ **Rich editor** — headings, lists, to-dos, quotes, tables, syntax-highlighted code blocks, images, smart typography (TipTap / ProseMirror)
- 🧠 **Wikilinks & backlinks** — type `[[` to link any page; `[[Title]]` autolinks as you type; every page shows its linked references
- ⚡ **Command palette** — `Ctrl/Cmd + K` to search notes and jump anywhere
- 🕸️ **Graph view** — force-directed map of your notes, wired by hierarchy and wikilinks (canvas-rendered, draggable, zoomable)
- 📊 **Writing stats** — total words, weekly volume, current & longest streaks, a 26-week activity heatmap, words per space
- 🗂️ **Spaces & sub-pages** — group notes into colored spaces; nest pages one level deep
- 🏷️ **Tags & favorites** — lightweight tags per page; star pages for quick access
- 🧩 **Templates** — daily journal, meeting notes, project brief, book notes, weekly review
- 🗑️ **Trash** — soft delete with restore or purge
- 💾 **Local-first storage** — Dexie.js over IndexedDB; export/import full JSON backups from Settings
- 📱 **Installable PWA** — web app manifest, service worker shell caching, offline-ready, mobile bottom-nav UI
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

First launch seeds a small set of demo spaces and notes so nothing is empty. Delete them whenever you like — or wipe everything from **Settings → Danger zone**.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd K` | Command palette |
| `/` (in editor) | Block menu |
| `[[` (in editor) | Link another page |
| `Enter` (on title) | Focus editor |

## Tech stack

- **Next.js 14** (App Router) + React 18 + TypeScript
- **TipTap v3** editor (ProseMirror) with custom wikilink mark, slash menu and page-linker suggestions
- **Dexie 4** (`dexie-react-hooks`) for reactive IndexedDB storage
- **Tailwind CSS 3** with a custom *Midnight Ink* design system
- **Framer Motion**, **lucide-react**, **lowlight**, **date-fns**
- Zero-dependency PNG icon generator (`scripts/generate-icons.mjs`, pure Node zlib)

## Data & privacy

All data is stored locally in your browser's IndexedDB under the `engram` database. Nothing leaves the device — no analytics, no sync endpoints. Use **Settings → Export JSON** for portable backups.

> Tip: browsers can clear site data. Keep regular exports if your notes matter.

## Project layout

```
src/
  app/            # Next.js App Router (layout, page)
  components/     # AppShell, Sidebar, Editor, Graph, Stats, …
    editor/       # TipTap editor + suggestion menus
  lib/
    db.ts         # Dexie schema
    db-actions.ts # CRUD helpers
    seed.ts       # first-run demo content
    search.ts     # local full-text scoring + highlights
    stats.ts      # streaks, heatmap, per-space stats
    graph.ts      # graph builder + force layout tick
    extensions/   # custom TipTap extensions (wikilink, menus)
  types/          # shared TypeScript model
public/
  manifest.webmanifest, sw.js, icons/, favicon.svg
scripts/
  generate-icons.mjs
```

## License

[MIT](./LICENSE)
