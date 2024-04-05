import type { ConvoParticipantEntry } from './types';
import { cva, type VariantProps } from 'class-variance-authority';
import type { UserConvosDataType } from '~/composables/types';
import { useRuntimeConfig } from '#imports';
import type { TypeId } from '@u22n/utils';

function generateAvatarUrl({
  publicId,
  avatarTimestamp,
  size
}: {
  publicId: TypeId<'orgMemberProfile' | 'contacts' | 'groups' | 'org'>;
  avatarTimestamp: Date | null;
  size?:
    | '3xs'
    | '2xs'
    | 'xs'
    | 'sm'
    | 'md'
    | 'lg'
    | 'xl'
    | '2xl'
    | '3xl'
    | '4xl'
    | '5xl';
}) {
  if (!avatarTimestamp) {
    return null;
  }
  const epochTs = new Date(avatarTimestamp).getTime() / 1000;

  //@ts-ignore
  const storageBaseUrl = useRuntimeConfig().public.storageUrl;

  return `${storageBaseUrl}/avatar/${publicId}/${
    size ? size : '5xl'
  }?t=${epochTs}`;
}

function useParticipantData(
  participant: UserConvosDataType[number]['participants'][0]
) {
  const typePublicId =
    participant.orgMember?.publicId ||
    participant.group?.publicId ||
    participant.contact?.publicId;
  const avatarProfilePublicId =
    participant.orgMember?.profile.publicId ||
    participant.group?.publicId ||
    participant.contact?.publicId ||
    null;
  if (!typePublicId || !avatarProfilePublicId) return null;

  const avatarTimestampProp = participant.orgMember?.profile.avatarTimestamp
    ? participant.orgMember?.profile.avatarTimestamp
    : participant.group?.avatarTimestamp
      ? participant.group?.avatarTimestamp
      : participant.contact?.avatarTimestamp
        ? participant.contact?.avatarTimestamp
        : null;

  const nameProp = participant.group?.name
    ? participant.group?.name
    : participant.orgMember?.profile.firstName
      ? `${participant.orgMember?.profile.firstName} ${participant.orgMember?.profile.lastName || ''}`
      : participant.contact?.setName
        ? participant.contact?.setName
        : participant.contact?.name
          ? participant.contact?.name
          : participant.contact?.emailUsername
            ? `${participant.contact?.emailUsername}@${participant.contact?.emailDomain}`
            : 'unnamed';

  const participantData: ConvoParticipantEntry = {
    participantPublicId: participant.publicId,
    typePublicId: typePublicId,
    avatarProfilePublicId: avatarProfilePublicId,
    avatarTimestamp: avatarTimestampProp,
    name: nameProp,
    color: participant.group?.color || null,
    type: participant.orgMember
      ? 'orgMember'
      : participant.group
        ? 'group'
        : 'contact',
    role: participant.role,
    signatureHtml: participant.contact?.signatureHtml || null,
    signaturePlainText: participant.contact?.signaturePlainText || null
  };
  return participantData;
}

export const useUtils = () => {
  return { cva, generateAvatarUrl, convos: { useParticipantData } };
};

// TODO: Fix exporting types under namespace UseUtilTypes
export type { VariantProps };
