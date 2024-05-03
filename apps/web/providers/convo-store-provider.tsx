'use client';

import { type ReactNode, createContext, useRef, useContext } from 'react';
import { type StoreApi, useStore } from 'zustand';

import {
  type ConvoStore,
  createConvoStore
  // ConvoStoreState
} from '@/stores/convo-store';

export const ConvoStoreContext = createContext<StoreApi<ConvoStore> | null>(
  null
);

export interface ConvoStoreProviderProps {
  children: ReactNode;
  // initialState: ConvoStoreState;
}

export const ConvoStoreProvider = ({ children }: ConvoStoreProviderProps) => {
  const storeRef = useRef<StoreApi<ConvoStore>>();
  if (!storeRef.current) {
    storeRef.current = createConvoStore({
      convos: [],
      convoQueryParams: {},
      convoQueryPending: false,
      convoError: null,
      convoCursor: {
        lastUpdatedAt: null,
        lastPublicId: null
      }
    });
  }

  return (
    <ConvoStoreContext.Provider value={storeRef.current}>
      {children}
    </ConvoStoreContext.Provider>
  );
};

export const useConvoStore = <T,>(selector: (store: ConvoStore) => T): T => {
  const convoStoreContext = useContext(ConvoStoreContext);
  if (!convoStoreContext) {
    throw new Error(`useConvoStore must be use within ConvoStoreProvider`);
  }
  return useStore(convoStoreContext, selector);
};
