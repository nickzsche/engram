'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Highlight } from '@tiptap/extension-highlight';
import { Image as TiptapImage } from '@tiptap/extension-image';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Typography } from '@tiptap/extension-typography';
import { TableKit } from '@tiptap/extension-table';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  Code,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Link2,
  Minus,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { lowlight } from '@/lib/lowlight';
import { Wikilink } from '@/lib/extensions/wikilink';
import { SlashMenu, WikilinkMenu } from '@/lib/extensions/menus';
import { createPage, renamePage, savePageContent, toggleFavorite, trashPage, upsertTag } from '@/lib/db-actions';
import { toastBus } from '@/lib/toast';
import { cn, countWordsInDoc, debounce, formatDate, readingTime } from '@/lib/utils';

interface EditorProps {
  pageId: string;
}

type SaveState = 'saved' | 'dirty' | 'saving';

export default function Editor({ pageId }: EditorProps) {
  const page = useLiveQuery(() => db.pages.get(pageId), [pageId]);
  const spaces = useLiveQuery(() => db.spaces.toArray(), []);
  const tags = useLiveQuery(() => db.tags.toArray(), []);
  const allPages = useLiveQuery(
    () => db.pages.filter((p) => !p.isTrashed).toArray(),
    [],
  );

  const [title, setTitle] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [words, setWords] = useState(0);
  const [tagDraft, setTagDraft] = useState('');
  const pagesRef = useRef<{ id: string; title: string; spaceName?: string }[]>([]);
  const loadedPageRef = useRef<string | null>(null);

  const space = useMemo(() => spaces?.find((s) => s.id === page?.spaceId) ?? null, [spaces, page]);

  // Keep wikilink autocomplete fed with fresh page titles
  useEffect(() => {
    const spaceNameById = new Map((spaces ?? []).map((s) => [s.id, s.name]));
    pagesRef.current = (allPages ?? [])
      .filter((p) => p.id !== pageId)
      .map((p) => ({ id: p.id, title: p.title || 'Untitled', spaceName: spaceNameById.get(p.spaceId) }));
  }, [allPages, spaces, pageId]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true },
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: "Type '/' for commands…  '[[ ' to link a page…",
      }),
      Highlight.configure({ multicolor: true }),
      TiptapImage.configure({ allowBase64: true }),
      CodeBlockLowlight.configure({ lowlight }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Typography,
      TableKit.configure({
        table: { resizable: false },
        tableCell: {},
        tableHeader: {},
        tableRow: {},
      }),
      Wikilink,
      SlashMenu,
      WikilinkMenu.configure({ getPages: () => pagesRef.current }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
        'aria-label': 'Note editor',
      },
      handleDOMEvents: {
        mousedown: (view, event) => {
          const target = event.target as HTMLElement | null;
          const anchor = target?.closest?.('a[data-wikilink]') as HTMLElement | null;
          if (!anchor) return false;
          event.preventDefault();
          const attrs = view.state.doc
            .resolve(view.posAtDOM(anchor, 0))
            .marks()
            .find((m) => m.type.name === 'wikilink');
          const pageIdAttr = (attrs?.attrs.pageId as string | null) ?? anchor.getAttribute('data-page-id');
          const pageTitle = (attrs?.attrs.title as string) ?? anchor.getAttribute('data-title') ?? '';
          void followWikilink(pageIdAttr && pageIdAttr !== 'null' ? pageIdAttr : null, pageTitle);
          return true;
        },
      },
    },
    onUpdate: ({ editor: ed }) => {
      setSaveState('dirty');
      setWords(countWordsInDoc(ed.getJSON()));
      debouncedSave(ed.getJSON());
    },
  });

  const debouncedSave = useMemo(
    () =>
      debounce(async (json: Record<string, unknown>) => {
        if (!pageId) return;
        setSaveState('saving');
        await savePageContent(pageId, JSON.stringify(json));
        setSaveState('saved');
      }, 600),
    [pageId],
  );

  // Load page content when switching pages
  useEffect(() => {
    if (!editor || !page) return;
    if (loadedPageRef.current === pageId) return;
    loadedPageRef.current = pageId;
    setTitle(page.title);
    try {
      editor.commands.setContent(JSON.parse(page.content) as Record<string, unknown>, { emitUpdate: false });
    } catch {
      editor.commands.setContent('', { emitUpdate: false });
    }
    setWords(countWordsInDoc(page.content));
    setSaveState('saved');
  }, [editor, page, pageId]);

  useEffect(() => () => debouncedSave.cancel(), [debouncedSave]);

  // Live-update sidebar when the title changes
  const commitTitle = async (value: string) => {
    await renamePage(pageId, value);
  };

  const followWikilink = async (targetPageId: string | null, targetTitle: string): Promise<void> => {
    if (!targetPageId) {
      const byTitle = (allPages ?? []).find(
        (p) => p.title.toLowerCase() === targetTitle.toLowerCase().trim(),
      );
      if (byTitle) {
        window.dispatchEvent(new CustomEvent('engram:navigate', { detail: byTitle.id }));
        return;
      }
      const spaceId = page?.spaceId;
      if (!spaceId) return;
      const created = await createPage(spaceId, { title: targetTitle });
      toastBus.success(`Created “${targetTitle}”`);
      window.dispatchEvent(new CustomEvent('engram:navigate', { detail: created.id }));
      return;
    }
    window.dispatchEvent(new CustomEvent('engram:navigate', { detail: targetPageId }));
  };

  const backlinks = useMemo(() => {
    if (!page) return [];
    return (allPages ?? []).filter((p) => {
      if (p.id === page.id || p.isTrashed) return false;
      let doc: unknown;
      try {
        doc = JSON.parse(p.content);
      } catch {
        return false;
      }
      return JSON.stringify(doc).includes(`"pageId":"${page.id}"`);
    });
  }, [allPages, page]);

  if (!page) {
    return <div className="flex h-full items-center justify-center text-sm text-ink-500">Note not found.</div>;
  }

  const addTag = async () => {
    const name = tagDraft.trim();
    if (!name) return;
    const tagId = await upsertTag(name, '#818cf8');
    setTagDraft('');
    if (!tagId) return;
    const current = new Set(page.tagIds ?? []);
    if (current.has(tagId)) return;
    current.add(tagId);
    await db.pages.update(pageId, { tagIds: [...current] });
  };

  const removeTag = async (tagId: string) => {
    await db.pages.update(pageId, { tagIds: (page.tagIds ?? []).filter((t) => t !== tagId) });
  };

  const toolbarBtn = (
    label: string,
    icon: React.ReactNode,
    active: boolean,
    action: () => void,
  ) => (
    <button
      key={label}
      type="button"
      className={cn('editor-toolbar-btn', active && 'active')}
      onClick={action}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );

  if (!editor) {
    return <div className="flex h-full items-center justify-center text-sm text-ink-500">Loading editor…</div>;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 glass px-4 py-2 md:px-8">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <span className="badge-muted truncate" style={space ? { color: space.color } : undefined}>
            {space?.name ?? 'Unfiled'}
          </span>
          <span className="ml-auto text-xs text-ink-500">
            {saveState === 'saved' ? `Saved · ${formatDate(page.updatedAt)}` : saveState === 'saving' ? 'Saving…' : 'Editing…'}
          </span>
          <button
            className="btn-ghost !p-1.5"
            onClick={() => void toggleFavorite(page)}
            aria-label={page.isFavorite ? 'Remove favorite' : 'Add favorite'}
          >
            <Star size={16} className={cn(page.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-ink-400')} />
          </button>
          <button
            className="btn-ghost !p-1.5 hover:!text-red-400"
            onClick={async () => {
              await trashPage(pageId);
              toastBus.success('Moved to trash');
              window.dispatchEvent(new CustomEvent('engram:navigate', { detail: '' }));
            }}
            aria-label="Move to trash"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-6 md:px-8">
        <article className="mx-auto max-w-3xl">
          <input
            className="mb-2 w-full bg-transparent font-display text-3xl font-bold text-ink-100 outline-none placeholder:text-ink-600 md:text-4xl"
            placeholder="Untitled"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title !== page.title) void commitTitle(title);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
                editor.commands.focus('start');
              }
            }}
          />

          {/* Tags */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {(page.tagIds ?? []).map((tagId) => {
              const tag = tags?.find((t) => t.id === tagId);
              if (!tag) return null;
              return (
                <span key={tagId} className="badge-cyan group">
                  #{tag.name}
                  <button
                    className="ml-0.5 opacity-50 transition-opacity hover:opacity-100"
                    onClick={() => void removeTag(tagId)}
                    aria-label={`Remove tag ${tag.name}`}
                  >
                    <X size={11} />
                  </button>
                </span>
              );
            })}
            <input
              className="w-28 bg-transparent text-xs text-ink-300 outline-none placeholder:text-ink-600"
              placeholder="+ tag"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void addTag();
              }}
              onBlur={() => void addTag()}
            />
          </div>

          {/* Desktop toolbar */}
          <div className="mb-2 hidden flex-wrap items-center gap-0.5 rounded-xl border border-ink-700/60 bg-ink-900/50 p-1 backdrop-blur md:flex">
            {toolbarBtn('Bold', <Bold size={15} />, editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
            {toolbarBtn('Italic', <Italic size={15} />, editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
            {toolbarBtn('Underline', <UnderlineIcon size={15} />, editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run())}
            {toolbarBtn('Strikethrough', <Strikethrough size={15} />, editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run())}
            {toolbarBtn('Highlight', <Highlighter size={15} />, editor.isActive('highlight'), () => editor.chain().focus().toggleHighlight().run())}
            {toolbarBtn('Inline code', <Code size={15} />, editor.isActive('code'), () => editor.chain().focus().toggleCode().run())}
            <Divider />
            {toolbarBtn('Heading 1', <Heading1 size={15} />, editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
            {toolbarBtn('Heading 2', <Heading2 size={15} />, editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
            <Divider />
            {toolbarBtn('Bullet list', <List size={15} />, editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
            {toolbarBtn('Numbered list', <ListOrdered size={15} />, editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}
            {toolbarBtn('To-do list', <ListTodo size={15} />, editor.isActive('taskList'), () => editor.chain().focus().toggleTaskList().run())}
            {toolbarBtn('Quote', <Quote size={15} />, editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run())}
            {toolbarBtn('Code block', <Code size={15} />, editor.isActive('codeBlock'), () => editor.chain().focus().toggleCodeBlock().run())}
            <Divider />
            {toolbarBtn('Link to page ([[ ]])', <Link2 size={15} />, false, () => editor.commands.insertContent('[['))}
            {toolbarBtn('Divider', <Minus size={15} />, false, () => editor.chain().focus().setHorizontalRule().run())}
          </div>

          <EditorContent editor={editor} />

          {/* Backlinks */}
          {backlinks.length > 0 && (
            <section className="mt-10 mb-8">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
                Linked references — {backlinks.length}
              </h3>
              <div className="flex flex-col gap-1.5">
                {backlinks.map((b) => (
                  <button
                    key={b.id}
                    className="glass rounded-lg px-3 py-2 text-left text-sm text-ink-200 transition-colors hover:border-accent-violet/40 hover:text-accent-violet"
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent('engram:navigate', { detail: b.id }))
                    }
                  >
                    {b.title || 'Untitled'}
                  </button>
                ))}
              </div>
            </section>
          )}

          <footer className="pb-6 text-xs text-ink-500">
            {words} words · {readingTime(words)} min read · edited {formatDate(page.lastEditedAt)}
          </footer>
        </article>
      </div>

      {/* Mobile toolbar */}
      <div className="editor-toolbar md:hidden">
        {toolbarBtn('Bold', <Bold size={17} />, editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
        {toolbarBtn('Italic', <Italic size={17} />, editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
        {toolbarBtn('Heading', <Heading2 size={17} />, editor.isActive('heading'), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        {toolbarBtn('To-do', <ListTodo size={17} />, editor.isActive('taskList'), () => editor.chain().focus().toggleTaskList().run())}
        {toolbarBtn('Highlight', <Highlighter size={17} />, editor.isActive('highlight'), () => editor.chain().focus().toggleHighlight().run())}
      </div>
    </div>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-ink-700" />;
}
