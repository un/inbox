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
import BulletList from '@tiptap/extension-bullet-list';
import Blockquote from '@tiptap/extension-blockquote';
import Code from '@tiptap/extension-code';
import CodeBlock from '@tiptap/extension-code-block';
import HardBreak from '@tiptap/extension-hard-break';
import ListItem from '@tiptap/extension-list-item';
import OrderedList from '@tiptap/extension-ordered-list';

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
  Placeholder,
  Underline,
  Subscript,
  Superscript,
  BulletList,
  Blockquote,
  Code,
  CodeBlock,
  HardBreak,
  ListItem,
  OrderedList
];
