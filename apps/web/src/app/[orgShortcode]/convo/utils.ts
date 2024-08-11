import { platform, type RouterOutputs } from '@/src/lib/trpc';
import { type InfiniteData } from '@tanstack/react-query';
import { useOrgShortcode } from '@/src/hooks/use-params';
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
  const orgShortcode = useOrgShortcode();
  const utils = platform.useUtils();

  return useCallback(
    async (convoId: TypeId<'convos'>) => {
      const convo = await utils.convos.getOrgMemberSpecificConvo.ensureData({
        convoPublicId: convoId,
        orgShortcode
      });
      utils.convos.getOrgMemberConvos.setInfiniteData(
        { orgShortcode },
        (updater) => {
          if (!updater || !convo) return;
          // If convo already exists in the cache, don't add it again
          if (
            updater.pages.some((page) =>
              page.data.some((c) => c.publicId === convoId)
            )
          )
            return;
          const clonedUpdater = structuredClone(updater);
          const clonedConvo = structuredClone(convo);
          clonedUpdater.pages.at(0)?.data.unshift(clonedConvo);
          return clonedUpdater;
        }
      );
    },
    [
      orgShortcode,
      utils.convos.getOrgMemberConvos,
      utils.convos.getOrgMemberSpecificConvo
    ]
  );
}

const deleteConvoFromInfiniteData = (
  convoId: TypeId<'convos'>,
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
};

export function useDeleteConvo$Cache() {
  const orgShortcode = useOrgShortcode();
  const utils = platform.useUtils();

  return useCallback(
    async (convoId: TypeId<'convos'> | TypeId<'convos'>[]) => {
      const convos = Array.isArray(convoId) ? convoId : [convoId];
      await utils.convos.getOrgMemberConvos.cancel({ orgShortcode });
      await utils.convos.getOrgMemberConvos.cancel({
        orgShortcode,
        includeHidden: true
      });

      await Promise.allSettled(
        convos.map(async (convoId) => {
          await utils.convos.getConvo.invalidate({
            convoPublicId: convoId,
            orgShortcode
          });
          await utils.convos.getOrgMemberSpecificConvo.invalidate({
            convoPublicId: convoId,
            orgShortcode
          });
          await utils.convos.entries.getConvoEntries.invalidate({
            convoPublicId: convoId,
            orgShortcode
          });
          utils.convos.getOrgMemberConvos.setInfiniteData(
            { orgShortcode },
            (updater) => deleteConvoFromInfiniteData(convoId, updater)
          );

          utils.convos.getOrgMemberConvos.setInfiniteData(
            { orgShortcode, includeHidden: true },
            (updater) => deleteConvoFromInfiniteData(convoId, updater)
          );
        })
      );
    },
    [
      orgShortcode,
      utils.convos.getConvo,
      utils.convos.getOrgMemberConvos,
      utils.convos.entries.getConvoEntries,
      utils.convos.getOrgMemberSpecificConvo
    ]
  );
}

const infiniteConvoListUpdater = (
  hideFromList: boolean,
  convoToAdd: RouterOutputs['convos']['getOrgMemberSpecificConvo'] | null,
  convoToRemove: TypeId<'convos'> | null,
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
};

// TODO: Simplify this function later, its too complex
export function useToggleConvoHidden$Cache() {
  const orgShortcode = useOrgShortcode();
  const utils = platform.useUtils();

  return useCallback(
    async (convoId: TypeId<'convos'> | TypeId<'convos'>[], hide = false) => {
      const convos = Array.isArray(convoId) ? convoId : [convoId];
      await Promise.allSettled(
        convos.map(async (convoId) => {
          await utils.convos.getConvo.cancel({
            convoPublicId: convoId,
            orgShortcode
          });
          utils.convos.getConvo.setData(
            { convoPublicId: convoId, orgShortcode },
            (updater) => {
              if (!updater) return;
              const clonedUpdater = structuredClone(updater);
              const participantIndex =
                clonedUpdater.data.participants.findIndex(
                  (participant) =>
                    participant.publicId === updater.ownParticipantPublicId
                );
              if (participantIndex === -1) return;
              clonedUpdater.data.participants[participantIndex]!.hidden = hide;
              return clonedUpdater;
            }
          );

          const convoToAdd =
            await utils.convos.getOrgMemberSpecificConvo.ensureData({
              convoPublicId: convoId,
              orgShortcode
            });

          // Update both hidden and non-hidden convo lists
          await utils.convos.getOrgMemberConvos.cancel({
            orgShortcode,
            includeHidden: true
          });
          await utils.convos.getOrgMemberConvos.cancel({ orgShortcode });

          // if we are hiding a convo, we need to remove it from the non-hidden list and add to hidden list
          if (hide) {
            utils.convos.getOrgMemberConvos.setInfiniteData(
              { orgShortcode },
              (updater) =>
                infiniteConvoListUpdater(
                  /* hide from non-hidden */ true,
                  null,
                  convoId,
                  updater
                )
            );
            utils.convos.getOrgMemberConvos.setInfiniteData(
              { orgShortcode, includeHidden: true },
              (updater) =>
                infiniteConvoListUpdater(
                  /* add from hidden */ false,
                  convoToAdd,
                  null,
                  updater
                )
            );
          } else {
            // if we are un-hiding a convo, we need to remove it from the hidden list and add to non-hidden list
            utils.convos.getOrgMemberConvos.setInfiniteData(
              { orgShortcode },
              (updater) =>
                infiniteConvoListUpdater(
                  /* add to non-hidden */ false,
                  convoToAdd,
                  null,
                  updater
                )
            );
            utils.convos.getOrgMemberConvos.setInfiniteData(
              { orgShortcode, includeHidden: true },
              (updater) =>
                infiniteConvoListUpdater(
                  /* hide from hidden */ true,
                  null,
                  convoId,
                  updater
                )
            );
          }
        })
      );
    },
    [
      orgShortcode,
      utils.convos.getConvo,
      utils.convos.getOrgMemberConvos,
      utils.convos.getOrgMemberSpecificConvo
    ]
  );
}

export function useUpdateConvoMessageList$Cache() {
  const orgShortcode = useOrgShortcode();
  const utils = platform.useUtils();
  const updateConvoData = useUpdateConvoData$Cache();

  // TODO: make the reply mutation return the new convo entry, to save one API call
  return useCallback(
    async (
      convoId: TypeId<'convos'>,
      convoEntryPublicId: TypeId<'convoEntries'>
    ) => {
      await utils.convos.entries.getConvoEntries.cancel({
        convoPublicId: convoId,
        orgShortcode
      });
      const convoEntry =
        await utils.convos.entries.getConvoSingleEntry.ensureData({
          convoPublicId: convoId,
          convoEntryPublicId,
          orgShortcode
        });

      await updateConvoData(convoId, (oldData) => {
        const author = oldData.participants.find(
          (participant) =>
            participant.publicId === convoEntry.entry.author.publicId
        );

        if (!author) return oldData;

        const newEntry: (typeof oldData.entries)[0] = {
          author: structuredClone(author),
          bodyPlainText: convoEntry.entry.bodyPlainText,
          type: convoEntry.entry.type
        };

        oldData.lastUpdatedAt = new Date();
        oldData.entries.unshift(newEntry);
        return oldData;
      });

      utils.convos.entries.getConvoEntries.setInfiniteData(
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
          if (!page || !convoEntry) return;
          const clonedConvo = structuredClone(convoEntry.entry);
          page.entries.unshift(clonedConvo);
          return clonedUpdater;
        }
      );

      await utils.convos.getConvo.refetch({
        orgShortcode,
        convoPublicId: convoId
      });
    },
    [
      orgShortcode,
      updateConvoData,
      utils.convos.getConvo,
      utils.convos.entries.getConvoEntries,
      utils.convos.entries.getConvoSingleEntry
    ]
  );
}

type ConvoUpdater =
  RouterOutputs['convos']['getOrgMemberConvos']['data'][number];

export function useUpdateConvoData$Cache() {
  const orgShortcode = useOrgShortcode();
  const utils = platform.useUtils();

  return useCallback(
    async (
      convoId: TypeId<'convos'>,
      dataUpdater: (oldData: ConvoUpdater) => ConvoUpdater
    ) => {
      await utils.convos.getOrgMemberConvos.cancel({ orgShortcode });
      utils.convos.getOrgMemberConvos.setInfiniteData(
        { orgShortcode },
        (updater) => {
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
          const updatedConvo = dataUpdater(structuredClone(targetConvo));

          // remove the target convo from the list
          page.data.splice(
            page.data.findIndex((convo) => convo.publicId === convoId),
            1
          );

          // add the updated convo to the the 1st page 1st item
          clonedUpdater.pages[0]?.data.unshift(updatedConvo);

          return clonedUpdater;
        }
      );
    },
    [orgShortcode, utils.convos.getOrgMemberConvos]
  );
}
