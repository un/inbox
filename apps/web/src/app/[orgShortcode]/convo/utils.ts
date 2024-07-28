import { useGlobalStore } from '@/src/providers/global-store-provider';
import { platform, type RouterOutputs } from '@/src/lib/trpc';
import { type InfiniteData } from '@tanstack/react-query';
import { type TypeId } from '@u22n/utils/typeid';
import { useCallback } from 'react';

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

  const participantAddress = participant.contact
    ? participant.contact.emailUsername + '@' + participant.contact.emailDomain
    : null;

  return {
    participantPublicId: participant.publicId,
    typePublicId: typePublicId,
    avatarProfilePublicId: avatarProfilePublicId,
    avatarTimestamp: avatarTimestampProp,
    name: nameProp,
    color: participant.team?.color,
    type: participant.orgMember
      ? 'orgMember'
      : participant.team
        ? 'team'
        : 'contact',
    role: participant.role,
    signatureHtml: participant.contact?.signatureHtml ?? null,
    signaturePlainText: participant.contact?.signaturePlainText ?? null,
    address: participantAddress
  };
}

export function useAddSingleConvo$Cache() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const utils = platform.useUtils();
  const convoListApi = utils.convos.getOrgMemberConvos;
  const getOrgMemberSpecificConvoApi = utils.convos.getOrgMemberSpecificConvo;

  return useCallback(
    async (convoId: TypeId<'convos'>) => {
      const convo = await getOrgMemberSpecificConvoApi.fetch({
        convoPublicId: convoId,
        orgShortcode
      });
      convoListApi.setInfiniteData({ orgShortcode }, (updater) => {
        if (!updater) return;
        // If convo already exists in the cache, don't add it again
        if (
          updater.pages.some((page) =>
            page.data.some((c) => c.publicId === convoId)
          )
        )
          return;
        const clonedUpdater = structuredClone(updater);
        const clonedConvo = structuredClone(convo)!;
        clonedUpdater.pages.at(0)?.data.unshift(clonedConvo);
        return clonedUpdater;
      });
    },
    [convoListApi, getOrgMemberSpecificConvoApi, orgShortcode]
  );
}

export function useDeleteConvo$Cache() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const convoListApi = platform.useUtils().convos.getOrgMemberConvos;
  const deleteFn = useCallback(
    (
      convoId: TypeId<'convos'>,
      // TODO: figure out these types later
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updater?: InfiniteData<RouterOutputs['convos']['getOrgMemberConvos'], any>
    ) => {
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
    },
    []
  );

  return useCallback(
    async (convoId: TypeId<'convos'>) => {
      await convoListApi.cancel({ orgShortcode });
      await convoListApi.cancel({ orgShortcode, includeHidden: true });

      convoListApi.setInfiniteData({ orgShortcode }, (updater) =>
        deleteFn(convoId, updater)
      );
      // deleteFn(convoId, updater)
      convoListApi.setInfiniteData(
        { orgShortcode, includeHidden: true },
        (updater) => deleteFn(convoId, updater)
      );
    },
    [convoListApi, deleteFn, orgShortcode]
  );
}

// TODO: Simplify this function later, its too complex
export function useToggleConvoHidden$Cache() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const utils = platform.useUtils();
  const convoApi = utils.convos.getConvo;
  const convoListApi = utils.convos.getOrgMemberConvos;
  const specificConvoApi = utils.convos.getOrgMemberSpecificConvo;

  // This function is a bit complex, but basically what it does is updates the provided updater by either removing or adding a convo based on the parameters
  const convoListUpdaterFn = useCallback(
    (
      hideFromList: boolean,
      convoToAdd: RouterOutputs['convos']['getOrgMemberSpecificConvo'] | null,
      convoToRemove: TypeId<'convos'> | null,
      // TODO: figure out these types later
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updater?: InfiniteData<RouterOutputs['convos']['getOrgMemberConvos'], any>
    ) => {
      if (!updater) return;
      const clonedUpdater = structuredClone(updater);

      if (hideFromList) {
        for (const page of clonedUpdater.pages) {
          const convoIndex = page.data.findIndex(
            (convo) => convo.publicId === convoToRemove
          );
          if (convoIndex === -1) continue;
          page.data.splice(convoIndex, 1);
          break;
        }
      } else {
        if (!convoToAdd)
          throw new Error(
            'Trying to unhide from convo list without providing the convo to add'
          );
        const clonedConvo = structuredClone(convoToAdd);
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
    },
    []
  );

  return useCallback(
    async (convoId: TypeId<'convos'>, hide = false) => {
      await convoApi.cancel({ convoPublicId: convoId, orgShortcode });
      convoApi.setData({ convoPublicId: convoId, orgShortcode }, (updater) => {
        if (!updater) return;
        const clonedUpdater = structuredClone(updater);
        const participantIndex = clonedUpdater.data.participants.findIndex(
          (participant) =>
            participant.publicId === updater.ownParticipantPublicId
        );
        if (participantIndex === -1) return;
        clonedUpdater.data.participants[participantIndex]!.hidden = hide;
        return clonedUpdater;
      });

      const convoToAdd = await specificConvoApi.fetch({
        convoPublicId: convoId,
        orgShortcode
      });

      // Update both hidden and non-hidden convo lists
      await convoListApi.cancel({ orgShortcode, includeHidden: true });
      await convoListApi.cancel({ orgShortcode });

      // if we are hiding a convo, we need to remove it from the non-hidden list and add to hidden list
      if (hide) {
        convoListApi.setInfiniteData({ orgShortcode }, (updater) =>
          convoListUpdaterFn(
            /* hide from non-hidden */ true,
            null,
            convoId,
            updater
          )
        );
        convoListApi.setInfiniteData(
          { orgShortcode, includeHidden: true },
          (updater) =>
            convoListUpdaterFn(
              /* add from hidden */ false,
              convoToAdd,
              null,
              updater
            )
        );
      } else {
        // if we are un-hiding a convo, we need to remove it from the hidden list and add to non-hidden list
        convoListApi.setInfiniteData({ orgShortcode }, (updater) =>
          convoListUpdaterFn(
            /* add to non-hidden */ false,
            convoToAdd,
            null,
            updater
          )
        );
        convoListApi.setInfiniteData(
          { orgShortcode, includeHidden: true },
          (updater) =>
            convoListUpdaterFn(
              /* hide from hidden */ true,
              null,
              convoId,
              updater
            )
        );
      }
    },
    [convoApi, convoListApi, convoListUpdaterFn, orgShortcode, specificConvoApi]
  );
}

export function useUpdateConvoMessageList$Cache() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const utils = platform.useUtils();
  const convoEntiresApi = utils.convos.entries.getConvoEntries;
  const singleConvoEntryApi = utils.convos.entries.getConvoSingleEntry;
  const updateConvoData = useUpdateConvoData$Cache();

  // TODO: make the reply mutation return the new convo entry, to save one API call
  return useCallback(
    async (
      convoId: TypeId<'convos'>,
      convoEntryPublicId: TypeId<'convoEntries'>
    ) => {
      await convoEntiresApi.cancel({ convoPublicId: convoId, orgShortcode });
      const convo = await singleConvoEntryApi.fetch({
        convoPublicId: convoId,
        convoEntryPublicId,
        orgShortcode
      });

      await updateConvoData(convoId, (oldData) => {
        const author = oldData.participants.find(
          (participant) =>
            participant.publicId === oldData.entries[0]?.author.publicId
        );
        if (!author) return oldData;

        const newEntry: (typeof oldData.entries)[0] = {
          author: structuredClone(author),
          bodyPlainText: convo.entry.bodyPlainText,
          type: convo.entry.type
        };

        oldData.lastUpdatedAt = new Date();
        oldData.entries.unshift(newEntry);
        return oldData;
      });

      convoEntiresApi.setInfiniteData(
        { convoPublicId: convoId, orgShortcode },
        (updater) => {
          if (!updater) return;
          // If convo entry already exists in the cache, don't add it again
          if (
            updater.pages.some((page) =>
              page.entries.some((c) => c.publicId === convoEntryPublicId)
            )
          )
            return;
          const clonedUpdater = structuredClone(updater);
          const page = clonedUpdater.pages.at(-1)!;
          if (!page || !convo) return;
          const clonedConvo = structuredClone(convo.entry);
          page.entries.unshift(clonedConvo);
          return clonedUpdater;
        }
      );
    },
    [convoEntiresApi, orgShortcode, singleConvoEntryApi, updateConvoData]
  );
}

type ConvoUpdater =
  RouterOutputs['convos']['getOrgMemberConvos']['data'][number];

export function useUpdateConvoData$Cache() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const utils = platform.useUtils();
  const convoApi = utils.convos.getConvo;
  const orgMemberConvoApi = utils.convos.getOrgMemberConvos;

  return useCallback(
    async (
      convoId: TypeId<'convos'>,
      dataUpdater: (oldData: ConvoUpdater) => ConvoUpdater
    ) => {
      await orgMemberConvoApi.cancel({ orgShortcode });
      orgMemberConvoApi.setInfiniteData({ orgShortcode }, (updater) => {
        if (!updater) return;
        const clonedUpdater = structuredClone(updater);

        // find the page
        const page = clonedUpdater.pages.find((page) =>
          page.data.some((convo) => convo.publicId === convoId)
        );
        if (!page) return;

        // find the target convo
        const targetConvo = page.data.find(
          (convo) => convo.publicId === convoId
        )!;

        // get the updated data
        const updatedConvo = dataUpdater(targetConvo);

        // refetch the updated convo (we don't have enough info to update the cache)
        void convoApi.refetch({
          orgShortcode,
          convoPublicId: updatedConvo.publicId
        });

        // remove the target convo from the list
        page.data.splice(
          page.data.findIndex((convo) => convo.publicId === convoId),
          1
        );

        // add the updated convo to the the 1st page 1st item
        clonedUpdater.pages[0]?.data.unshift(updatedConvo);

        return clonedUpdater;
      });
    },
    [convoApi, orgMemberConvoApi, orgShortcode]
  );
}
