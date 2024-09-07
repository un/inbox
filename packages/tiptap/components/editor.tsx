import type { EditorProviderProps, JSONContent } from '@tiptap/react';
import { EditorProvider, useCurrentEditor } from '@tiptap/react';
import { useRef, forwardRef, useImperativeHandle } from 'react';
import { EditorCommandTunnelContext } from './editor-command';
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
    return (
      <div className={className}>
        <EditorProvider
          immediatelyRender={false}
          content={initialContent}
          {...rest}>
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
