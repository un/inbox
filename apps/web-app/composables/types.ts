import { useNuxtApp } from '#imports';
import { uiColors } from '@u22n/types/ui';
import type { TypeId } from '@u22n/utils';

const { $trpc } = useNuxtApp();

export type UserConvosDataType = Awaited<
  ReturnType<typeof $trpc.convos.getUserConvos.query>
>['data'];
export type UserConvoDataType = Awaited<
  ReturnType<typeof $trpc.convos.getConvo.useLazyQuery>
>['data'];

export type ConvoAttachmentUpload = {
  fileName: string;
  attachmentPublicId: string;
  size: number;
  type: string;
};

export type ConvoParticipantEntry = {
  participantPublicId: TypeId<'convoParticipants'>;
  typePublicId: TypeId<'orgMembers' | 'groups' | 'contacts'>;
  avatarProfilePublicId: TypeId<'orgMemberProfile' | 'groups' | 'contacts'>;
  avatarTimestamp: Date | null;
  name: string;
  type: 'orgMember' | 'group' | 'contact';
  role:
    | 'assigned'
    | 'contributor'
    | 'commenter'
    | 'watcher'
    | 'groupMember'
    | 'guest';
  color: (typeof uiColors)[number] | null;
  signaturePlainText?: string | null;
  signatureHtml?: string | null;
};
