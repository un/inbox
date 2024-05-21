import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PreferencesStoreState = {
  sidebarDocked: boolean;
  sidebarExpanded: boolean;
};
export type PreferencesStoreActions = {
  setSidebarDocking: (docked: boolean) => void;
  setSidebarExpanded: (expanded: boolean) => void;
};

const initialState: PreferencesStoreState = {
  sidebarDocked: true,
  sidebarExpanded: true
};

export const usePreferencesState = create<
  PreferencesStoreState & PreferencesStoreActions
>()(
  persist(
    (set) => ({
      ...initialState,
      setSidebarDocking: (docked: boolean) =>
        set((state) => ({
          ...state,
          sidebarDocked: docked
        })),
      setSidebarExpanded: (expanded: boolean) =>
        set((state) => ({
          ...state,
          sidebarExpanded: expanded
        }))
    }),
    {
      name: 'user-preferences',
      partialize: (state) => ({
        sidebarDocked: state.sidebarDocked
      })
    }
  )
);
