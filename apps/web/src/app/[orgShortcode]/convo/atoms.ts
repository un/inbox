import { type TypeId } from '@u22n/utils/typeid';
import { atom } from 'jotai';

export const showNewConvoPanel = atom<boolean>(false);
export const convoListSelection = atom<TypeId<'convos'>[]>([]);
export const convoListSelecting = atom(
  (get) => get(convoListSelection).length > 0
);
export const lastSelectedConvo = atom<TypeId<'convos'> | null>(null);

export const shiftKeyPressed = atom(false);
