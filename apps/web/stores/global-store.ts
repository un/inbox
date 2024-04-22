import { type TypeId } from '@u22n/utils';
import { createStore } from 'zustand/vanilla';

type Org = {
  shortCode: string;
  name: string;
  publicId: TypeId<'org'>;
  avatarTimestamp: Date | null;
  orgMemberProfile: {
    firstName: string | null;
    lastName: string | null;
    title: string | null;
    blurb: string | null;
    publicId: TypeId<'orgMemberProfile'>;
    avatarTimestamp: Date | null;
  };
};

type User = {
  username: string;
  publicId: TypeId<'account'>;
};

export type GlobalStoreState = {
  currentOrg: Org;
  orgs: Org[];
  user: User;
};

export type GlobalStoreActions = {
  setCurrentOrg: (shortCode: string) => void;
  addOrg: (...orgs: Org[]) => void;
  updateOrg: (shortCode: string, data: Partial<Org>) => void;
};

export type GlobalStore = GlobalStoreState & GlobalStoreActions;

export const createGlobalStore = (initState: GlobalStoreState) =>
  createStore<GlobalStore>()((set) => ({
    ...initState,
    setCurrentOrg: (shortCode: string) =>
      set((state) => ({
        currentOrg: state.orgs.find((org) => org.shortCode === shortCode)
      })),
    addOrg: (...orgs: Org[]) =>
      set((state) => ({ orgs: state.orgs.concat(orgs) })),
    updateOrg: (shortCode: string, data: Partial<Org>) =>
      set((state) => ({
        orgs: state.orgs.map((org) =>
          org.shortCode === shortCode ? { ...org, ...data } : org
        ),
        currentOrg:
          state.currentOrg.shortCode === shortCode
            ? { ...state.currentOrg, ...data }
            : state.currentOrg
      }))
  }));
