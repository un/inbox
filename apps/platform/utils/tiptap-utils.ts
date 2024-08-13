import type { JSONContent } from '@u22n/tiptap/react';
import { validateTypeId } from '@u22n/utils/typeid';

export function walkAndReplaceImages(
  jsonContent: JSONContent,
  callback: (url: string) => string
) {
  for (const element of jsonContent.content ?? []) {
    if (element.type === 'image' && typeof element.attrs?.src === 'string') {
      const newUrl = callback(element.attrs.src);
      if (element.attrs) {
        element.attrs.src = newUrl;
      }
    }
    if (element.content) {
      walkAndReplaceImages(element, callback);
    }
  }
}

export function tryParseInlineProxyUrl(url: string) {
  try {
    const urlObject = new URL(url);
    const [base, orgShortcode, attachmentPublicId, fileName] =
      urlObject.pathname.split('/').splice(1);
    if (
      base !== 'inline-proxy' ||
      !orgShortcode ||
      !validateTypeId('convoAttachments', attachmentPublicId) ||
      !fileName
    )
      return null;
    const fileType = decodeURIComponent(
      urlObject.searchParams.get('type') ?? 'image/png'
    );
    const size = Number(urlObject.searchParams.get('size') ?? 0) || 0;

    return {
      orgShortcode,
      attachmentPublicId,
      fileName,
      fileType,
      size,
      inline: true
    };
  } catch (e) {
    return null;
  }
}
