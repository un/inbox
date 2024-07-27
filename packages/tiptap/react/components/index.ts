export { useCurrentEditor as useEditor } from '@tiptap/react';
export { type Editor as EditorInstance } from '@tiptap/core';
export type { JSONContent } from '@tiptap/react';

export {
  EditorRoot,
  EditorContent,
  type EditorContentProps,
  type EditorFunctions
} from './editor';
export { EditorBubble } from './editor-bubble';
export { EditorBubbleItem } from './editor-bubble-item';
export { EditorCommand, EditorCommandList } from './editor-command';
export { EditorCommandItem, EditorCommandEmpty } from './editor-command-item';

export const emptyTiptapEditorContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }]
};
