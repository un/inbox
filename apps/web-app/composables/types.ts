import { useNuxtApp } from '#imports';
import { uiColors } from '@u22n/types/ui';

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
  participantPublicId: string;
  typePublicId: string;
  avatarPublicId: string;
  name: string;
  type: 'orgMember' | 'group' | 'contact';
  role: 'assigned' | 'contributor' | 'commenter' | 'watcher' | 'guest';
  color: (typeof uiColors)[number] | null;
  signaturePlainText?: string | null;
  signatureHtml?: string | null;
};
