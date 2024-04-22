import { type TypeId } from '@u22n/utils';
import { createStore } from 'zustand/vanilla';

type Convo = {};
type UserConvoQueryParams =
  | {
      cursorLastUpdatedAt: Date;
      cursorLastPublicId: TypeId<'convos'>;
    }
  | {};
type UserConvoCursor = {
  lastUpdatedAt: Date | null;
  lastPublicId: TypeId<'convos'> | null;
};

export type ConvoStoreState = {
  convos: Convo[];
  convoQueryParams: UserConvoQueryParams | {};
  convoQueryPending: boolean;
  convoError: Error | null;
  convoCursor: UserConvoCursor;
};

export type ConvoStoreActions = {
  getConvoList: () => Promise<void>;
  fetchSingleConvo: (convoId: TypeId<'convos'>) => Promise<void>;
  hideConvo: (convoId: TypeId<'convos'>) => Promise<void>;
  deleteConvo: (convoId: TypeId<'convos'>) => Promise<void>;
};

export type ConvoStore = ConvoStoreState & ConvoStoreActions;

export const createConvoStore = (initState: ConvoStoreState) =>
  createStore<ConvoStore>()((set, get) => ({
    ...initState,
    getConvoList: async () => {},
    fetchSingleConvo: async (convoId: TypeId<'convos'>) => {
      set((state) => ({}));
    },
    hideConvo: async (convoId: TypeId<'convos'>) => set((state) => ({})),
    deleteConvo: async (convoId: TypeId<'convos'>) => set((state) => ({}))
  }));
