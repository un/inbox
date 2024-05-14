import { type TypeId } from '@u22n/utils';
import { atom } from 'jotai';

export const replyToMessageAtom = atom<null | TypeId<'convoEntries'>>(null);
