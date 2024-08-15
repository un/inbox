import { type TypeId } from '@u22n/utils/typeid';
import { atom } from 'jotai';

export const replyToMessageAtom = atom<TypeId<'convoEntries'> | null>(null);
export const emailIdentityAtom = atom<TypeId<'emailIdentities'> | null>(null);
