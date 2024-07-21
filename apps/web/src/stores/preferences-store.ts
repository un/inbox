import { persist } from 'zustand/middleware';
import { ms } from '@u22n/utils/ms';
import { create } from 'zustand';

export type PreferencesStoreState = {
  sidebarDocked: boolean;
  sidebarExpanded: boolean;
  ignoredIssues: {
    issueId: string;
    ignoredAt: number;
  }[];
};
export type PreferencesStoreActions = {
  setSidebarDocking: (docked: boolean) => void;
  setSidebarExpanded: (expanded: boolean) => void;
  ignoreIssue: (issueId: string) => void;
  shouldIgnoreIssue: (issueId: string) => boolean;
};

const initialState: PreferencesStoreState = {
  sidebarDocked: true,
  sidebarExpanded: true,
  ignoredIssues: []
};

export const usePreferencesState = create<
  PreferencesStoreState & PreferencesStoreActions
>()(
  persist(
    (set, get) => ({
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
        })),
      ignoreIssue: (issueId: string) =>
        set((state) => ({
          ...state,
          ignoredIssues: [
            ...state.ignoredIssues.filter((i) => i.issueId !== issueId),
            { issueId, ignoredAt: Date.now() }
          ]
        })),
      shouldIgnoreIssue: (issueId: string) => {
        const ignoreIssue = get().ignoredIssues.find(
          (i) => i.issueId === issueId
        );
        if (!ignoreIssue) return false;

        if (ignoreIssue.ignoredAt + ms('7 days') <= Date.now()) {
          set((state) => ({
            ...state,
            ignoredIssues: state.ignoredIssues.filter(
              (i) => i.issueId !== issueId
            )
          }));
          return false;
        }
        return true;
      }
    }),
    {
      name: 'user-preferences',
      partialize: (state) => ({
        sidebarDocked: state.sidebarDocked,
        ignoredIssues: state.ignoredIssues
      })
    }
  )
);
