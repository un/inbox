'use client';
import { useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import type { EditorProviderProps, JSONContent } from '@tiptap/react';
import { EditorProvider, useCurrentEditor } from '@tiptap/react';
import { EditorCommandTunnelContext } from './editor-command';
import { tipTapExtensions } from '../../extensions';
import { editorStore } from '../utils/store';
import type { FC, ReactNode } from 'react';
import { Provider } from 'jotai';
import tunnel from 'tunnel-rat';

export interface EditorProps {
  readonly children: ReactNode;
  readonly className?: string;
}

interface EditorRootProps {
  readonly children: ReactNode;
}

export const EditorRoot: FC<EditorRootProps> = ({ children }) => {
  const tunnelInstance = useRef(tunnel()).current;

  return (
    <Provider store={editorStore}>
      <EditorCommandTunnelContext.Provider value={tunnelInstance}>
        {children}
      </EditorCommandTunnelContext.Provider>
    </Provider>
  );
};

export type EditorContentProps = Omit<EditorProviderProps, 'content'> & {
  readonly children?: ReactNode;
  readonly className?: string;
  readonly initialContent?: JSONContent;
};

export type EditorFunctions = {
  clearContent: () => void;
};

export const EditorContent = forwardRef<EditorFunctions, EditorContentProps>(
  ({ className, children, initialContent, ...rest }, ref) => {
    const extensions = useMemo(() => {
      return [...tipTapExtensions, ...(rest.extensions ?? [])];
    }, [rest.extensions]);

    return (
      <div className={className}>
        <EditorProvider
          {...rest}
          content={initialContent}
          extensions={extensions}>
          <EditorForwarder ref={ref} />
          {children}
        </EditorProvider>
      </div>
    );
  }
);

EditorContent.displayName = 'EditorContent';

export const EditorForwarder = forwardRef<EditorFunctions>((_, ref) => {
  const { editor } = useCurrentEditor();
  useImperativeHandle(ref, () => ({
    clearContent: () => editor?.commands.clearContent()
  }));
  return null;
});
