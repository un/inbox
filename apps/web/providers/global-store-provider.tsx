'use client';

import { type ReactNode, createContext, useRef, useContext } from 'react';
import { type StoreApi, useStore } from 'zustand';

import {
  type GlobalStore,
  createGlobalStore,
  GlobalStoreState
} from '@/stores/global-store';

export const GlobalStoreContext = createContext<StoreApi<GlobalStore> | null>(
  null
);

export interface GlobalStoreProviderProps {
  children: ReactNode;
  initialState: GlobalStoreState;
}

export const GlobalStoreProvider = ({
  children,
  initialState
}: GlobalStoreProviderProps) => {
  const storeRef = useRef<StoreApi<GlobalStore>>();
  if (!storeRef.current) {
    storeRef.current = createGlobalStore(initialState);
  }

  return (
    <GlobalStoreContext.Provider value={storeRef.current}>
      {children}
    </GlobalStoreContext.Provider>
  );
};

export const useGlobalStore = <T,>(selector: (store: GlobalStore) => T): T => {
  const globalStoreContext = useContext(GlobalStoreContext);
  if (!globalStoreContext) {
    throw new Error(`useGlobalStore must be use within GlobalStoreProvider`);
  }
  return useStore(globalStoreContext, selector);
};
