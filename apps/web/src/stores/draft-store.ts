import { type NewConvoParticipant } from '../app/[orgShortcode]/convo/_components/create-convo-form';
import { type Attachment } from '../components/shared/attachments';
import { persist, type PersistStorage } from 'zustand/middleware';
import { emptyTiptapEditorContent } from '@u22n/tiptap';
import { useOrgShortcode } from '../hooks/use-params';
import { type JSONContent } from '@u22n/tiptap/react';
import { type TypeId } from '@u22n/utils/typeid';
import { useCallback } from 'react';
import SuperJSON from 'superjson';
import { create } from 'zustand';

type Draft = {
  content: JSONContent;
  attachments: Attachment[];
};

type ComposingDraft = Draft & {
  participants: NewConvoParticipant[];
  from: string | null;
  topic: string;
};

export type DraftStoreState = {
  composingDraft: Map<string, ComposingDraft>; // map key is `${orgShortcode}_${spaceShortcode}` or `${orgShortcode}` in case of no space
  drafts: Map<TypeId<'convos'>, Draft>;
};

export type DraftStoreActions = {
  getComposingDraft: (
    orgShortcode: string,
    spaceShortcode: string | null
  ) => ComposingDraft;
  setComposingDraft: (
    orgShortcode: string,
    spaceShortcode: string | null,
    draft: ComposingDraft
  ) => void;
  clearComposingDraft: (
    orgShortcode: string,
    spaceShortcode: string | null
  ) => void;
  getDraft: (convoId: TypeId<'convos'>) => Draft;
  setDraft: (convoId: TypeId<'convos'>, draft: Draft) => void;
  clearDraft: (convoId: TypeId<'convos'>) => void;
};

const initialState: DraftStoreState = {
  composingDraft: new Map(),
  drafts: new Map()
};

const storage: PersistStorage<DraftStoreState> = {
  getItem: (name) => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    return SuperJSON.parse(str);
  },
  setItem: (name, value) => {
    localStorage.setItem(name, SuperJSON.stringify(value));
  },
  removeItem: (name) => localStorage.removeItem(name)
};

const getComposingDraftKey = (
  orgShortcode: string,
  spaceShortcode: string | null
) => (spaceShortcode ? `${orgShortcode}_${spaceShortcode}` : orgShortcode);

export const useDraftStoreCore = create<DraftStoreState & DraftStoreActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      getComposingDraft: (orgShortcode, spaceShortcode) => {
        const key = getComposingDraftKey(orgShortcode, spaceShortcode);
        return (
          get().composingDraft.get(key) ?? {
            participants: [],
            from: null,
            topic: '',
            content: emptyTiptapEditorContent,
            attachments: []
          }
        );
      },

      setComposingDraft: (orgShortcode, spaceShortcode, draft) => {
        const key = getComposingDraftKey(orgShortcode, spaceShortcode);
        get().composingDraft.set(key, structuredClone(draft));

        set((state) => ({
          ...state,
          composingDraft: get().composingDraft
        }));
      },

      clearComposingDraft: (orgShortcode, spaceShortcode) => {
        const key = getComposingDraftKey(orgShortcode, spaceShortcode);
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        get().composingDraft.delete(key);
        set((state) => ({
          ...state,
          composingDraft: get().composingDraft
        }));
      },

      getDraft: (convoId) =>
        get().drafts.get(convoId) ?? {
          content: emptyTiptapEditorContent,
          attachments: []
        },

      setDraft: (convoId, draft) => {
        get().drafts.set(convoId, structuredClone(draft));
        set((state) => ({
          ...state,
          drafts: get().drafts
        }));
      },

      clearDraft: (convoId) => {
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        get().drafts.delete(convoId);
        set((state) => ({
          ...state,
          drafts: get().drafts
        }));
      }
    }),
    {
      name: 'draft-store',
      partialize: (state) => ({
        drafts: state.drafts,
        composingDraft: state.composingDraft
      }),
      storage,
      version: 1
    }
  )
);

export const useDraft = (convoId: TypeId<'convos'>) => {
  const [getDraft, setDraftById, clearDraft] = useDraftStoreCore((state) => [
    state.getDraft,
    state.setDraft,
    state.clearDraft
  ]);

  const draft = getDraft(convoId);
  const setDraft = useCallback(
    (draft: Draft) => setDraftById(convoId, draft),
    [convoId, setDraftById]
  );
  const resetDraft = useCallback(
    () => clearDraft(convoId),
    [convoId, clearDraft]
  );

  return { draft, setDraft, resetDraft } as const;
};

export const useComposingDraft = () => {
  const orgShortcode = useOrgShortcode();
  // Add this when we support spaces
  const spaceShortcode = null;

  const [get, set, clear] = useDraftStoreCore(
    (state) =>
      [
        state.getComposingDraft,
        state.setComposingDraft,
        state.clearComposingDraft
      ] as const
  );

  const draft = get(orgShortcode, spaceShortcode);

  const setDraft = useCallback(
    (draft: ComposingDraft) => set(orgShortcode, spaceShortcode, draft),
    [set, orgShortcode]
  );
  const resetDraft = useCallback(
    () => clear(orgShortcode, spaceShortcode),
    [clear, orgShortcode]
  );

  return { draft, setDraft, resetDraft } as const;
};
