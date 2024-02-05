import { uiColors } from '@uninbox/types/ui';

const { $trpc } = useNuxtApp();
type PromiseType<T> = T extends Promise<infer U> ? U : never;
export type UserConvosDataType = PromiseType<
  ReturnType<typeof $trpc.convos.getUserConvos.query>
>['data'];

export type ConvoParticipantEntry = {
  participantPublicId: string;
  typePublicId: string;
  avatarPublicId: string;
  name: string;
  type: 'user' | 'group' | 'contact';
  role: 'assigned' | 'contributor' | 'commenter' | 'watcher' | 'guest';
  color: (typeof uiColors)[number] | null;
};
