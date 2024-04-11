import StarterKit from '@tiptap/starter-kit';
import ExtensionTextStyle from '@tiptap/extension-text-style';
import ExtensionColor from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import type { AnyExtension } from '@tiptap/vue-3';

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
  Link.configure({
    linkOnPaste: true,
    autolink: true,
    openOnClick: true,
    HTMLAttributes: {
      class: 'text-blue-12'
    }
  }),
  Placeholder,
  Underline,
  Subscript,
  Superscript
];
