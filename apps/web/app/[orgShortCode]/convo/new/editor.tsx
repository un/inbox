'use client';

import {
  EditorRoot,
  EditorCommand,
  // EditorCommandItem,
  EditorCommandEmpty,
  EditorContent,
  type JSONContent
  // EditorCommandList,
  // EditorBubble
} from '@u22n/tiptap/react/components';
import { ScrollArea } from '@radix-ui/themes';

interface EditorProp {
  initialValue?: JSONContent;
  onChange: (value: JSONContent) => void;
}
const Editor = ({ initialValue, onChange }: EditorProp) => {
  return (
    <ScrollArea className="border-gray-7 dark:border-graydark-7 rounded-md border">
      <EditorRoot>
        <EditorContent
          className="h-full w-full p-2 *:h-10"
          {...(initialValue && { initialContent: initialValue })}
          editorProps={{
            attributes: {
              class: `prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full`
            }
          }}
          onUpdate={({ editor }) => {
            onChange(editor.getJSON());
          }}>
          <EditorCommand className="border-gray-10 dark:border-graydark-10 bg-background z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border px-1 py-2 shadow-md transition-all">
            <EditorCommandEmpty className="text-muted-foreground px-2">
              No results
            </EditorCommandEmpty>
          </EditorCommand>
        </EditorContent>
      </EditorRoot>
    </ScrollArea>
  );
};

export default Editor;
