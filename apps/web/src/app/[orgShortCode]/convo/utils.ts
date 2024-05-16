import { api, type RouterOutputs } from '@/src/lib/trpc';
import { useGlobalStore } from '@/src/providers/global-store-provider';
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

export function useAddSingleConvo$Cache() {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const convoListApi = api.useUtils().convos.getOrgMemberConvos;
  const getOrgMemberSpecificConvoApi =
    api.useUtils().convos.getOrgMemberSpecificConvo;

  return async (convoId: TypeId<'convos'>) => {
    const convo = await getOrgMemberSpecificConvoApi.fetch({
      convoPublicId: convoId,
      orgShortCode
    });
    convoListApi.setInfiniteData({ orgShortCode }, (updater) => {
      if (!updater) return;
      const clonedUpdater = structuredClone(updater);
      const clonedConvo = structuredClone(convo)!;
      clonedUpdater.pages.at(0)?.data.unshift(clonedConvo);
      return clonedUpdater;
    });
  };
}

export function useDeleteConvo$Cache() {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const convoListApi = api.useUtils().convos.getOrgMemberConvos;

  return async (convoId: TypeId<'convos'>) => {
    await convoListApi.cancel({ orgShortCode });
    convoListApi.setInfiniteData({ orgShortCode }, (updater) => {
      if (!updater) return;
      const clonedUpdater = structuredClone(updater);
      for (const page of clonedUpdater.pages) {
        const convoIndex = page.data.findIndex(
          (convo) => convo.publicId === convoId
        );
        if (convoIndex === -1) continue;
        page.data.splice(convoIndex, 1);
        break;
      }
      return clonedUpdater;
    });
  };
}

export function useToggleConvoHidden$Cache() {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const convoApi = api.useUtils().convos.getConvo;
  const convoListApi = api.useUtils().convos.getOrgMemberConvos;
  const specificConvoApi = api.useUtils().convos.getOrgMemberSpecificConvo;

  return async (convoId: TypeId<'convos'>, hide = false) => {
    const convoToAdd = !hide
      ? await specificConvoApi.fetch({
          convoPublicId: convoId,
          orgShortCode
        })
      : null;

    await convoApi.cancel({ convoPublicId: convoId, orgShortCode });
    convoApi.setData({ convoPublicId: convoId, orgShortCode }, (updater) => {
      if (!updater) return;
      const clonedUpdater = structuredClone(updater);
      const participantIndex = clonedUpdater.data.participants.findIndex(
        (participant) => participant.publicId === updater.ownParticipantPublicId
      );
      if (participantIndex === -1) return;
      clonedUpdater.data.participants[participantIndex]!.hidden = hide;
      return clonedUpdater;
    });

    await convoListApi.cancel({ orgShortCode });
    convoListApi.setInfiniteData({ orgShortCode }, (updater) => {
      if (!updater) return;
      const clonedUpdater = structuredClone(updater);

      if (hide) {
        for (const page of clonedUpdater.pages) {
          const convoIndex = page.data.findIndex(
            (convo) => convo.publicId === convoId
          );
          if (convoIndex === -1) continue;
          page.data.splice(convoIndex, 1);
          break;
        }
      } else {
        const clonedConvo = structuredClone(convoToAdd)!; // We know it's not null as we are not hiding
        let convoAlreadyAdded = false;
        for (const page of clonedUpdater.pages) {
          const insertIndex = page.data.findIndex(
            (convo) => convo.lastUpdatedAt < clonedConvo.lastUpdatedAt
          );
          if (insertIndex === -1) {
            continue;
          } else {
            page.data.splice(insertIndex, 0, clonedConvo);
          }
          convoAlreadyAdded = true;
          break;
        }

        // If convo is the oldest, add it to the last page as the last item
        if (!convoAlreadyAdded) {
          clonedUpdater.pages.at(-1)?.data.push(clonedConvo);
        }
      }
      return clonedUpdater;
    });
  };
}

export function useUpdateConvoMessageList$Cache() {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const convoEntiresApi = api.useUtils().convos.entries.getConvoEntries;
  const singleConvoEntryApi = api.useUtils().convos.entries.getConvoSingleEntry;

  // TODO: make the reply mutation return the new convo entry, to save one API call
  return async (
    convoId: TypeId<'convos'>,
    convoEntryPublicId: TypeId<'convoEntries'>
  ) => {
    await convoEntiresApi.cancel({ convoPublicId: convoId, orgShortCode });
    const convo = await singleConvoEntryApi.fetch({
      convoPublicId: convoId,
      convoEntryPublicId,
      orgShortCode
    });
    convoEntiresApi.setInfiniteData(
      { convoPublicId: convoId, orgShortCode },
      (updater) => {
        if (!updater) return;
        const clonedUpdater = structuredClone(updater);
        const page = clonedUpdater.pages.at(-1)!;
        if (!page || !convo) return;
        const clonedConvo = structuredClone(convo.entry);
        page.entries.unshift(clonedConvo);
        return clonedUpdater;
      }
    );
  };
}
