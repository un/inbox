import StarterKit from '@tiptap/starter-kit';
import ExtensionTextSyle from '@tiptap/extension-text-style';
import ExtensionColor from '@tiptap/extension-color';
import type { AnyExtension } from '@tiptap/vue-3';
export const tipTapExtensions: AnyExtension[] = [StarterKit];
export const tipTapExtensions: AnyExtension[] = [
  StarterKit,
  ExtensionTextSyle,
  ExtensionColor
];
