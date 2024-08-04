import ExtensionTextStyle from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import Superscript from '@tiptap/extension-superscript';
import ExtensionColor from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import Subscript from '@tiptap/extension-subscript';
import type { AnyExtension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Markdown } from 'tiptap-markdown';
import Link from '@tiptap/extension-link';

const starterKitExtension = StarterKit;
const textStyleExtension = ExtensionTextStyle;
const colorExtension = ExtensionColor;
const underlineExtension = Underline;
const subscriptExtension = Subscript;
const superscriptExtension = Superscript;

const imageExtension = Image.configure({
  inline: true,
  HTMLAttributes: {
    crossorigin: 'use-credentials'
  }
});

const markdownExtension = Markdown.configure({
  html: false,
  transformCopiedText: true
});

const linkExtension = Link.configure({
  linkOnPaste: true,
  autolink: true,
  openOnClick: true,
  HTMLAttributes: {
    class: 'text-blue-12'
  }
});

const placeholderExtension = Placeholder.configure({
  placeholder: ({ node }) => {
    if (node.type.name === 'heading') {
      return `Heading ${node.attrs.level}`;
    }
    return 'Press / for commands';
  },
  includeChildren: true,
  emptyEditorClass: 'is-editor-empty',
  emptyNodeClass: 'is-empty'
});

export const tipTapExtensions: AnyExtension[] = [
  starterKitExtension,
  textStyleExtension,
  colorExtension,
  imageExtension,
  markdownExtension,
  linkExtension,
  placeholderExtension,
  underlineExtension,
  subscriptExtension,
  superscriptExtension
];

export {
  starterKitExtension,
  textStyleExtension,
  colorExtension,
  imageExtension,
  markdownExtension,
  linkExtension,
  placeholderExtension,
  underlineExtension,
  subscriptExtension,
  superscriptExtension
};
