import _ExtensionPlaceholder from '@tiptap/extension-placeholder';
import ExtensionImageResize from 'tiptap-extension-resize-image';
import ExtensionSuperscript from '@tiptap/extension-superscript';
import { Markdown as _ExtensionMarkdown } from 'tiptap-markdown';
import ExtensionTextStyle from '@tiptap/extension-text-style';
import ExtensionUnderline from '@tiptap/extension-underline';
import ExtensionSubscript from '@tiptap/extension-subscript';
import ExtensionStarterKit from '@tiptap/starter-kit';
import { UploadImagesPlugin } from './image-uploader';
import ExtensionColor from '@tiptap/extension-color';
import _ExtensionLink from '@tiptap/extension-link';
import { type AnyExtension } from '@tiptap/react';

type CreateExtensionSetOptions = {
  className?: {
    link?: string;
    image?: string;
    placeholderImage?: string;
  };
};

export const createExtensionSet = ({
  className
}: CreateExtensionSetOptions = {}) => {
  const ExtensionImage = ExtensionImageResize.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        width: {
          default: null
        },
        height: {
          default: null
        }
      };
    },
    addProseMirrorPlugins: () => {
      return [
        UploadImagesPlugin({
          imageClass: className?.placeholderImage ?? ''
        })
      ];
    }
  }).configure({
    inline: true,
    HTMLAttributes: { class: className?.image ?? undefined }
  });

  const ExtensionMarkdown = _ExtensionMarkdown.configure({
    html: false,
    transformCopiedText: true
  });

  const ExtensionLinks = _ExtensionLink.configure({
    linkOnPaste: true,
    autolink: true,
    openOnClick: true,
    HTMLAttributes: {
      class: className?.link ?? ''
    }
  });

  const ExtensionPlaceholder = _ExtensionPlaceholder.configure({
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

  const tipTapExtensions: AnyExtension[] = [
    ExtensionStarterKit,
    ExtensionTextStyle,
    ExtensionColor,
    ExtensionImage,
    ExtensionMarkdown,
    ExtensionLinks,
    ExtensionPlaceholder,
    ExtensionUnderline,
    ExtensionSubscript,
    ExtensionSuperscript
  ];

  return tipTapExtensions;
};
