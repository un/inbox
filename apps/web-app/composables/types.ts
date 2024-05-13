import { useNuxtApp } from '#imports';
import type { TypeId, UiColor } from '@u22n/utils';

const { $trpc } = useNuxtApp();

export type UserConvosDataType = Awaited<
  ReturnType<typeof $trpc.convos.getOrgMemberConvos.query>
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
  typePublicId: TypeId<'orgMembers' | 'teams' | 'contacts'>;
  avatarProfilePublicId: TypeId<'orgMemberProfile' | 'teams' | 'contacts'>;
  avatarTimestamp: Date | null;
  name: string;
  type: 'orgMember' | 'team' | 'contact';
  role:
    | 'assigned'
    | 'contributor'
    | 'commenter'
    | 'watcher'
    | 'teamMember'
    | 'guest';
  color: UiColor | null;
  signaturePlainText?: string | null;
  signatureHtml?: string | null;
};
