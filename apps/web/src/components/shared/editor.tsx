'use client';

import {
  EditorRoot,
  EditorCommand,
  EditorCommandEmpty,
  EditorContent,
  type JSONContent,
  type EditorFunctions
} from '@u22n/tiptap/react/components';
import { ScrollArea } from '@/src/components/shadcn-ui/scroll-area';
import { forwardRef } from 'react';

interface EditorProp {
  initialValue?: JSONContent;
  onChange: (value: JSONContent) => void;
}

export const Editor = forwardRef<EditorFunctions, EditorProp>(
  ({ initialValue, onChange }, ref) => {
    return (
      <ScrollArea>
        <EditorRoot>
          <EditorContent
            className="h-full w-full p-2"
            initialContent={initialValue}
            editorProps={{
              attributes: {
                class: `prose dark:prose-invert focus:outline-none max-w-full text-base-12 prose-p:my-0 prose-a:decoration-blue-9`
              }
            }}
            onUpdate={({ editor }) => onChange(editor.getJSON())}
            ref={ref}>
            <EditorCommand className="border-base-5 bg-base-1 z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border px-1 py-2 shadow-md transition-all">
              <EditorCommandEmpty className="px-2">
                No results
              </EditorCommandEmpty>
            </EditorCommand>
          </EditorContent>
        </EditorRoot>
      </ScrollArea>
    );
  }
);

Editor.displayName = 'Editor';
