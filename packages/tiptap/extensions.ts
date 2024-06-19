import StarterKit from '@tiptap/starter-kit';
import ExtensionTextStyle from '@tiptap/extension-text-style';
import ExtensionColor from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Markdown } from 'tiptap-markdown';
import type { AnyExtension } from '@tiptap/react';

export const tipTapExtensions: AnyExtension[] = [
  StarterKit,
  ExtensionTextStyle,
  ExtensionColor,
  Image.configure({
    inline: true,
    HTMLAttributes: {
      crossorigin: 'use-credentials'
    }
  }),
  Markdown.configure({
    html: false,
    transformCopiedText: true
  }),
  Link.configure({
    linkOnPaste: true,
    autolink: true,
    openOnClick: true,
    HTMLAttributes: {
      class: 'text-blue-12'
    }
  }),
  Placeholder.configure({
    // placeholder: 'My Custom Placeholder',
    emptyEditorClass: 'is-editor-empty'
  }),
  Underline,
  Subscript,
  Superscript
];
