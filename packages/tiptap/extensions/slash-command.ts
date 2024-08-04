import tippy, {
  type GetReferenceClientRect,
  type Instance,
  type Props
} from 'tippy.js';
import { type Editor, type Range, Extension } from '@tiptap/core';
import { EditorCommandOut } from '../components/editor-command';
import type { RefObject, ReactNode } from 'react';
import { ReactRenderer } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';

type CommandExtensionOptions = {
  suggestion: {
    items?: () => SuggestionItem[];
    // TODO: fix types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render?: any;
    command?: (_: {
      editor: Editor;
      range: Range;
      props: {
        command: (props: { editor: Editor; range: Range }) => void;
      };
    }) => void;
  };
};

const Command = Extension.create<CommandExtensionOptions>({
  name: 'slash-command',
  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        }
      }
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion
      })
    ];
  }
});

const renderItems = (elementRef?: RefObject<Element> | null) => {
  let component: ReactRenderer | null = null;
  let popup: Instance<Props>[] | null = null;

  return {
    onStart: (props: { editor: Editor; clientRect: DOMRect }) => {
      component = new ReactRenderer(EditorCommandOut, {
        props,
        editor: props.editor
      });

      const { selection } = props.editor.state;

      const parentNode = selection.$from.node(selection.$from.depth);
      const blockType = parentNode.type.name;

      if (blockType === 'codeBlock') {
        return false;
      }

      // @ts-expect-error, TODO: fix types
      popup = tippy('body', {
        getReferenceClientRect: props.clientRect,
        appendTo: () => (elementRef ? elementRef.current : document.body),
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start'
      });
    },
    onUpdate: (props: {
      editor: Editor;
      clientRect: GetReferenceClientRect;
    }) => {
      component?.updateProps(props);

      popup?.[0]?.setProps({
        getReferenceClientRect: props.clientRect
      });
    },

    onKeyDown: (props: { event: KeyboardEvent }) => {
      if (props.event.key === 'Escape') {
        popup?.[0]?.hide();

        return true;
      }

      // @ts-expect-error, TODO: fix types
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return component?.ref?.onKeyDown(props);
    },
    onExit: () => {
      popup?.[0]?.destroy();
      component?.destroy();
    }
  };
};

export interface SuggestionItem {
  title: string;
  description: string;
  icon: ReactNode;
  searchTerms?: string[];
  command?: (props: { editor: Editor; range: Range }) => void;
}

export const createSuggestionItems = (items: SuggestionItem[]) => items;

export const handleCommandNavigation = (event: KeyboardEvent) => {
  if (['ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) {
    const slashCommand = document.querySelector('#slash-command');
    if (slashCommand) {
      return true;
    }
  }
};

export { Command, renderItems };
