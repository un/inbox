'use client';

import {
  EditorRoot,
  EditorCommand,
  EditorCommandEmpty,
  EditorContent,
  EditorCommandList,
  EditorCommandItem,
  type EditorFunctions,
  type JSONContent,
  EditorBubble
} from '@u22n/tiptap/components';
import {
  ColorSelector,
  LinkSelector,
  NodeSelector,
  TextButtons
} from './selectors';
import { handleCommandNavigation } from '@u22n/tiptap/extensions/slash-command';
import { slashCommand, suggestionItems } from './slash-commands';
import { tipTapExtensions } from '@u22n/tiptap/extensions';
import { forwardRef, memo, useState } from 'react';

interface EditorProp {
  initialValue?: JSONContent;
  onChange: (value: JSONContent) => void;
}

const extensions = [...tipTapExtensions, slashCommand];

export const Editor = memo(
  forwardRef<EditorFunctions, EditorProp>(function Editor(
    { initialValue, onChange },
    ref
  ) {
    const [openNode, setOpenNode] = useState(false);
    const [openColor, setOpenColor] = useState(false);
    const [openLink, setOpenLink] = useState(false);

    return (
      <div className="overflow-y-auto">
        <EditorRoot>
          <EditorContent
            className="h-full w-full p-1"
            initialContent={initialValue}
            editorProps={{
              attributes: {
                class: `prose dark:prose-invert focus:outline-none max-w-full text-base-12 prose-p:my-0 prose-a:decoration-blue-9`,
                role: 'textbox',
                id: 'rich-editor'
              },
              handleDOMEvents: {
                keydown: (_, event) => handleCommandNavigation(event),
                contextmenu: (_, e) => {
                  const selection = window.getSelection();
                  if (
                    selection?.anchorNode?.nodeType === Node.TEXT_NODE &&
                    selection?.anchorNode?.textContent?.length !== 0
                  ) {
                    e.preventDefault();
                  }
                }
              }
            }}
            extensions={extensions}
            onUpdate={({ editor }) => onChange(editor.getJSON())}
            ref={ref}>
            <EditorCommand
              className="border-base-5 bg-base-1 z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border px-1 py-2 shadow-md transition-all"
              loop>
              <EditorCommandEmpty className="px-2">
                No results
              </EditorCommandEmpty>
              <EditorCommandList>
                {suggestionItems.map((item) => (
                  <EditorCommandItem
                    value={item.title}
                    onCommand={(val) => item.command?.(val)}
                    className="aria-selected:bg-accent-2 flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm"
                    key={item.title}>
                    <div className="border-base-7 bg-base-3 flex size-8 items-center justify-center rounded-md border">
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-base-8 text-xs">{item.description}</p>
                    </div>
                  </EditorCommandItem>
                ))}
              </EditorCommandList>
            </EditorCommand>

            <EditorBubble
              tippyOptions={{
                placement: 'auto',
                interactive: true,
                appendTo: () =>
                  document.querySelector('#rich-editor')?.parentElement ??
                  document.body
              }}
              className="border-base-2 bg-base-3 flex h-full w-fit max-w-[95vw] items-center justify-center overflow-hidden rounded-md border shadow-xl">
              <NodeSelector
                open={openNode}
                onOpenChange={setOpenNode}
              />
              <LinkSelector
                open={openLink}
                onOpenChange={setOpenLink}
              />
              <TextButtons />
              <ColorSelector
                open={openColor}
                onOpenChange={setOpenColor}
              />
            </EditorBubble>
          </EditorContent>
        </EditorRoot>
      </div>
    );
  })
);
