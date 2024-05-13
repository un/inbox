import { api, type RouterOutputs } from '@/lib/trpc';
import { useGlobalStore } from '@/providers/global-store-provider';
import { type TypeId } from '@u22n/utils';

export function formatParticipantData(
  participant: RouterOutputs['convos']['getOrgMemberConvos']['data'][number]['participants'][number]
) {
  const typePublicId =
    participant.orgMember?.publicId ??
    participant.team?.publicId ??
    participant.contact?.publicId;
  const avatarProfilePublicId =
    participant.orgMember?.profile.publicId ??
    participant.team?.publicId ??
    participant.contact?.publicId ??
    null;
  if (!typePublicId || !avatarProfilePublicId) return null;

  const avatarTimestampProp = participant.orgMember?.profile.avatarTimestamp
    ? participant.orgMember?.profile.avatarTimestamp
    : participant.team?.avatarTimestamp
      ? participant.team?.avatarTimestamp
      : participant.contact?.avatarTimestamp
        ? participant.contact?.avatarTimestamp
        : null;

  const nameProp = participant.team?.name
    ? participant.team?.name
    : participant.orgMember?.profile.firstName
      ? `${participant.orgMember?.profile.firstName} ${participant.orgMember?.profile.lastName ?? ''}`
      : participant.contact?.setName
        ? participant.contact?.setName
        : participant.contact?.name
          ? participant.contact?.name
          : participant.contact?.emailUsername
            ? `${participant.contact?.emailUsername}@${participant.contact?.emailDomain}`
            : 'unnamed';

  return {
    participantPublicId: participant.publicId,
    typePublicId: typePublicId,
    avatarProfilePublicId: avatarProfilePublicId,
    avatarTimestamp: avatarTimestampProp,
    name: nameProp,
    color: participant.team?.color ?? null,
    type: participant.orgMember
      ? 'orgMember'
      : participant.team
        ? 'team'
        : 'contact',
    role: participant.role,
    signatureHtml: participant.contact?.signatureHtml ?? null,
    signaturePlainText: participant.contact?.signaturePlainText ?? null
  };
}

export function useRemoveConvoFromList() {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const convoListApi = api.useUtils().convos.getOrgMemberConvos;

  return (convoId: TypeId<'convos'>) =>
    convoListApi.setInfiniteData({ orgShortCode }, (updater) => {
      if (!updater) return;
      const pageIndex = updater.pages.findIndex((page) =>
        page.data.some((convo) => convo.publicId === convoId)
      );
      const newPage = updater.pages[pageIndex]?.data.filter(
        (convo) => convo.publicId !== convoId
      );

      if (!newPage) return;

      const newPages = updater.pages.slice();

      newPages[pageIndex] = {
        data: newPage,
        cursor: updater.pages[pageIndex]?.cursor ?? null
      };

      return {
        pages: newPages,
        pageParams: updater?.pageParams.slice()
      };
    });
}
