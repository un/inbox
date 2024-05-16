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
import {
  type Editor as EditorType,
  useCurrentEditor
} from '@u22n/tiptap/react';

interface EditorProp {
  initialValue?: JSONContent;
  onChange: (value: JSONContent) => void;
  setEditor: (editor: EditorType) => void;
}

const Editor = ({ initialValue, onChange, setEditor }: EditorProp) => {
  return (
    <ScrollArea className="border-gray-7 dark:border-graydark-7 rounded-md border">
      <EditorRoot>
        <EditorContent
          className="h-full w-full p-2"
          {...(initialValue && { initialContent: initialValue })}
          editorProps={{
            attributes: {
              class: `prose dark:prose-invert focus:outline-none max-w-full dark:text-white text-black prose-p:my-0 prose-a:decoration-blue-9`
            }
          }}
          onUpdate={({ editor }) => {
            onChange(editor.getJSON());
          }}>
          <EditorCommand className="border-gray-10 dark:border-graydark-10 bg-background z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border px-1 py-2 shadow-md transition-all">
            <EditorCommandEmpty className="px-2">No results</EditorCommandEmpty>
          </EditorCommand>
          <EditorForwarder setEditor={setEditor} />
        </EditorContent>
      </EditorRoot>
    </ScrollArea>
  );
};

function EditorForwarder({
  setEditor
}: {
  setEditor: (editor: EditorType) => void;
}) {
  const { editor } = useCurrentEditor();
  if (editor) setEditor(editor);
  return null;
}

export default Editor;
