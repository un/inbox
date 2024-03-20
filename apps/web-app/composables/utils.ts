import { cva, type VariantProps } from 'class-variance-authority';
import type { UserConvosDataType } from '~/composables/types';
import { useRuntimeConfig } from '#imports';

function generateAvatarUrl(
  type: 'user' | 'org' | 'group' | 'contact',
  avatarId: string,
  size:
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
    | '5xl'
    | undefined
) {
  const types = [
    { name: 'user', value: 'u' },
    { name: 'org', value: 'o' },
    { name: 'contact', value: 'c' },
    { name: 'group', value: 'g' }
  ];
  const typeObject = types.find((t) => t.name === type);
  if (!typeObject) {
    return undefined;
  }
  //@ts-ignore
  const storageBaseUrl = useRuntimeConfig().public.storageUrl;

  return `${storageBaseUrl}/avatar/${typeObject.value}_${avatarId}/${
    size ? size : '5xl'
  }`;
}

function useParticipantData(
  participant: UserConvosDataType[number]['participants'][0]
) {
  const {
    publicId: participantPublicId,
    contact,
    userGroup,
    orgMember,
    role: participantRole
  } = participant;

  let participantType: 'user' | 'group' | 'contact',
    participantTypePublicId,
    avatarPublicId,
    participantName,
    participantColor;

  switch (true) {
    case !!contact?.publicId:
      participantType = 'contact';
      participantTypePublicId = contact.publicId;
      avatarPublicId = contact.avatarId || '';
      participantName =
        contact.name || `${contact.emailUsername}@${contact.emailDomain}`;
      participantColor = null;
      break;
    case !!userGroup?.name:
      participantType = 'group';
      participantTypePublicId = userGroup.publicId;
      avatarPublicId = userGroup.avatarId || '';
      participantName = userGroup.name;
      participantColor = userGroup.color;
      break;
    case !!orgMember?.publicId:
      participantType = 'user';
      participantTypePublicId = orgMember.publicId;
      avatarPublicId = orgMember.profile.avatarId || '';
      participantName = `${orgMember.profile.firstName} ${orgMember.profile.lastName}`;
      participantColor = null;
      break;
    default:
      participantType = 'user';
      participantTypePublicId = '';
      avatarPublicId = '';
      participantName = '';
      participantColor = null;
  }

  return {
    participantPublicId,
    participantType,
    participantTypePublicId,
    avatarPublicId,
    participantName,
    participantColor,
    participantRole
  };
}

export const useUtils = () => {
  return { cva, generateAvatarUrl, convos: { useParticipantData } };
};

// TODO: Fix exporting types under namespace UseUtilTypes
export type { VariantProps };
