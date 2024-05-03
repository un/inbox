'use client';
import { useMemo, useRef, forwardRef } from 'react';
import { EditorProvider } from '@tiptap/react';
import { Provider } from 'jotai';
import tunnel from 'tunnel-rat';
import { tipTapExtensions } from '../../extensions';
import { editorStore } from '../utils/store';
import { EditorCommandTunnelContext } from './editor-command';
import type { FC, ReactNode } from 'react';
import type { EditorProviderProps, JSONContent } from '@tiptap/react';

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

export const EditorContent = forwardRef<HTMLDivElement, EditorContentProps>(
  ({ className, children, initialContent, ...rest }, ref) => {
    const extensions = useMemo(() => {
      return [...tipTapExtensions, ...(rest.extensions ?? [])];
    }, [rest.extensions]);

    return (
      <div
        ref={ref}
        className={className}>
        <EditorProvider
          {...rest}
          content={initialContent}
          extensions={extensions}>
          {children}
        </EditorProvider>
      </div>
    );
  }
);

EditorContent.displayName = 'EditorContent';
