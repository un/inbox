import { type TypeId } from '@u22n/utils/typeid';
import { createStore } from 'zustand/vanilla';

type Org = {
  shortcode: string;
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
  setCurrentOrg: (shortcode: string) => void;
  addOrg: (...orgs: Org[]) => void;
  updateOrg: (shortcode: string, data: Partial<Org>) => void;
};

export type GlobalStore = GlobalStoreState & GlobalStoreActions;

export const createGlobalStore = (initState: GlobalStoreState) =>
  createStore<GlobalStore>()((set) => ({
    ...initState,
    setCurrentOrg: (shortcode: string) =>
      set((state) => ({
        currentOrg: state.orgs.find((org) => org.shortcode === shortcode)
      })),
    addOrg: (...orgs: Org[]) =>
      set((state) => ({ orgs: state.orgs.concat(orgs) })),
    updateOrg: (shortcode: string, data: Partial<Org>) =>
      set((state) => ({
        orgs: state.orgs.map((org) =>
          org.shortcode === shortcode ? { ...org, ...data } : org
        ),
        currentOrg:
          state.currentOrg.shortcode === shortcode
            ? { ...state.currentOrg, ...data }
            : state.currentOrg
      }))
  }));
