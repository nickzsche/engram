'use client';

import { forwardRef, useEffect, useState } from 'react';
import { ReactRenderer } from '@tiptap/react';
import type { SuggestionProps } from '@tiptap/suggestion';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Code2,
  Quote,
  Minus,
  Table,
  Image as ImageIcon,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MenuItem {
  id: string;
  label: string;
  hint?: string;
}

const ICONS: Record<string, LucideIcon> = {
  h1: Heading1,
  h2: Heading2,
  h3: Heading3,
  bulletList: List,
  orderedList: ListOrdered,
  taskList: ListTodo,
  codeBlock: Code2,
  blockquote: Quote,
  divider: Minus,
  table: Table,
  image: ImageIcon,
  page: FileText,
};

interface MenuListProps {
  items: MenuItem[];
  command: (item: MenuItem) => void;
}

export interface MenuListRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

export const MenuList = forwardRef<MenuListRef, MenuListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) props.command(item);
  };

  const itemRefs = new Map<number, HTMLButtonElement>();
  useEffect(() => {
    itemRefs.get(selectedIndex)?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Expose keyboard handler to TipTap's suggestion renderer
  useEffect(() => {
    const impl: MenuListRef = {
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((i) => (i + props.items.length - 1) % props.items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % props.items.length);
          return true;
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    };
    if (typeof ref === 'function') ref(impl);
    else if (ref) ref.current = impl;
  }); // runs every render so closures stay fresh

  return (
    <div className="slash-menu" role="listbox">
      {props.items.length === 0 ? (
        <div className="px-3 py-2 text-sm text-ink-500">No results</div>
      ) : (
        props.items.map((item, index) => {
          const Icon = ICONS[item.id] ?? FileText;
          return (
            <button
              key={item.id}
              ref={(el) => {
                if (el) itemRefs.set(index, el);
              }}
              className={cn('slash-menu-item w-full text-left border-none bg-transparent', index === selectedIndex && 'selected')}
              onClick={() => selectItem(index)}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-accent-violet">
                <Icon size={15} />
              </span>
              <span className="flex flex-col">
                <span className="font-medium">{item.label}</span>
                {item.hint ? <span className="text-xs text-ink-500">{item.hint}</span> : null}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
});

MenuList.displayName = 'MenuList';

/** Creates the render controller TipTap Suggestion expects (no tippy.js needed). */
export function createSuggestionRender() {
  let renderer: ReactRenderer | null = null;
  let popup: HTMLDivElement | null = null;

  const position = (clientRect: (() => DOMRect | null) | null | undefined) => {
    if (!popup || !renderer) return;
    const rect = clientRect?.();
    if (!rect) return;
    const margin = 8;
    let left = rect.left;
    const width = popup.offsetWidth || 240;
    if (left + width > window.innerWidth - margin) left = window.innerWidth - margin - width;
    let top = rect.bottom + 6;
    const height = popup.offsetHeight || 120;
    if (top + height > window.innerHeight - margin) top = Math.max(margin, rect.top - height - 6);
    popup.style.left = `${Math.round(left)}px`;
    popup.style.top = `${Math.round(top)}px`;
  };

  const repositionListener = () => {
    position(null);
  };

  return {
    onStart: (props: SuggestionProps<MenuItem>) => {
      popup = document.createElement('div');
      popup.style.position = 'fixed';
      popup.style.zIndex = '60';
      document.body.appendChild(popup);
      renderer = new ReactRenderer(MenuList, {
        props,
        editor: props.editor,
      });
      popup.appendChild(renderer.element);
      position(props.clientRect);
      window.addEventListener('resize', repositionListener);
      window.addEventListener('scroll', repositionListener, true);
    },
    onUpdate: (props: SuggestionProps<MenuItem>) => {
      renderer?.updateProps(props);
      position(props.clientRect);
    },
    onKeyDown: (props: { event: KeyboardEvent }) => {
      if (props.event.key === 'Escape') {
        popup?.style.setProperty('display', 'none');
        return true;
      }
      const ref = renderer?.ref as MenuListRef | null;
      return ref?.onKeyDown(props.event) ?? false;
    },
    onExit: () => {
      window.removeEventListener('resize', repositionListener);
      window.removeEventListener('scroll', repositionListener, true);
      renderer?.destroy();
      popup?.remove();
      renderer = null;
      popup = null;
    },
  };
}
