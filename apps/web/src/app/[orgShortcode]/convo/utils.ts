import { platform, type RouterOutputs } from '@/src/lib/trpc';
import { type InfiniteData } from '@tanstack/react-query';
import { useOrgShortcode } from '@/src/hooks/use-params';
import { type TypeId } from '@u22n/utils/typeid';
import { convoListSelection } from './atoms';
import { ms } from '@u22n/utils/ms';
import { useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { produce } from 'immer';

type GetSpacesConvo = RouterOutputs['spaces']['getSpaceConvos'];
export type Convo = GetSpacesConvo['data'][number];

type InfiniteConvoListUpdater = InfiniteData<
  GetSpacesConvo,
  { lastUpdatedAt?: Date; lastPublicId?: string } | null
>;

export function formatParticipantData(
  participant: Convo['participants'][number]
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
    async ({
      convoPublicId,
      spaceShortcode
    }: {
      convoPublicId: TypeId<'convos'>;
      spaceShortcode: string;
    }) => {
      const convo = await utils.convos.getOrgMemberSpecificConvo.ensureData(
        {
          convoPublicId,
          orgShortcode
        },
        { staleTime: ms('1 minute') }
      );
      const targets = [spaceShortcode, 'all'].map((spaceShortcode) => ({
        orgShortcode,
        spaceShortcode
      }));
      // Update the target space and all conversations
      for (const target of targets) {
        utils.spaces.getSpaceConvos.setInfiniteData(target, (updater) => {
          if (!updater || !convo) return;
          // If convo already exists in the cache, don't add it again
          if (
            updater.pages.some((page) =>
              page.data.some((c) => c.publicId === convoPublicId)
            )
          )
            return;
          return produce(updater, (draft) => {
            const targetPage = draft.pages[0];
            if (targetPage) targetPage.data.unshift(structuredClone(convo));
          });
        });
      }
    },
    [
      orgShortcode,
      utils.convos.getOrgMemberSpecificConvo,
      utils.spaces.getSpaceConvos
    ]
  );
}

const deleteConvoFromInfiniteData = (
  convoId: TypeId<'convos'>,
  updater?: InfiniteConvoListUpdater
) => {
  if (!updater) return;
  // If convo is not in the cache, don't delete it
  if (
    !updater.pages.some((page) =>
      page.data.some((convo) => convo.publicId === convoId)
    )
  )
    return;

  return produce(updater, (draft) => {
    draft.pages = draft.pages.map((page) => {
      const convoIndex = page.data.findIndex(
        (convo) => convo.publicId === convoId
      );
      if (convoIndex === -1) return page;
      page.data.splice(convoIndex, 1);
      return page;
    });
  });
};

export function useDeleteConvo$Cache() {
  const orgShortcode = useOrgShortcode();
  const utils = platform.useUtils();
  const setSelection = useSetAtom(convoListSelection);

  return useCallback(
    async ({
      convoPublicId,
      spaceShortcode
    }: {
      convoPublicId: TypeId<'convos'> | TypeId<'convos'>[];
      spaceShortcode: string;
    }) => {
      const convos = Array.isArray(convoPublicId)
        ? convoPublicId
        : [convoPublicId];

      // Find if any of the convos are open and add the deleted query param
      if (
        convos.some((convoPublicId) =>
          window.location.pathname.includes(convoPublicId)
        )
      ) {
        window.history.replaceState(
          {},
          document.title,
          `${window.location.pathname}?deleted=true`
        );
      }

      await Promise.allSettled(
        convos.map(async (convoPublicId) => {
          void utils.convos.getConvo
            .fetch(
              { convoPublicId, orgShortcode },
              { meta: { noGlobalError: true } }
            )
            .catch(() => void 0);
          void utils.convos.getOrgMemberSpecificConvo
            .fetch(
              { convoPublicId, orgShortcode },
              { meta: { noGlobalError: true } }
            )
            .catch(() => void 0);
          void utils.convos.entries.getConvoEntries
            .fetch(
              { convoPublicId, orgShortcode },
              { meta: { noGlobalError: true } }
            )
            .catch(() => void 0);

          const targets = [spaceShortcode, 'all'].map((spaceShortcode) => ({
            orgShortcode,
            spaceShortcode
          }));

          for (const target of targets) {
            utils.spaces.getSpaceConvos.setInfiniteData(target, (updater) =>
              deleteConvoFromInfiniteData(convoPublicId, updater)
            );
          }
        })
      );

      setSelection((prev) => prev.filter((convo) => !convos.includes(convo)));
    },
    [
      setSelection,
      utils.convos.getConvo,
      utils.convos.getOrgMemberSpecificConvo,
      utils.convos.entries.getConvoEntries,
      utils.spaces.getSpaceConvos,
      orgShortcode
    ]
  );
}

// const infiniteConvoListUpdater = (
//   hideFromList: boolean,
//   convoToAdd: Convo | null,
//   convoToRemove: TypeId<'convos'> | null,
//   updater?: InfiniteConvoListUpdater
// ) => {
//   if (!updater) return;
//   const clonedUpdater = structuredClone(updater);

//   if (hideFromList) {
//     for (const page of clonedUpdater.pages) {
//       const convoIndex = page.data.findIndex(
//         (convo) => convo.publicId === convoToRemove
//       );
//       if (convoIndex === -1) continue;
//       page.data.splice(convoIndex, 1);
//       break;
//     }
//   } else {
//     if (!convoToAdd)
//       throw new Error(
//         'Trying to unhide from convo list without providing the convo to add'
//       );
//     const clonedConvo = structuredClone(convoToAdd);
//     let convoAlreadyAdded = false;
//     for (const page of clonedUpdater.pages) {
//       const insertIndex = page.data.findIndex(
//         (convo) => convo.lastUpdatedAt < clonedConvo.lastUpdatedAt
//       );
//       if (insertIndex === -1) {
//         continue;
//       } else {
//         page.data.splice(insertIndex, 0, clonedConvo);
//       }
//       convoAlreadyAdded = true;
//       break;
//     }

//     // If convo is the oldest, add it to the last page as the last item
//     if (!convoAlreadyAdded) {
//       clonedUpdater.pages.at(-1)?.data.push(clonedConvo);
//     }
//   }
//   return clonedUpdater;
// };

// TODO: Simplify this function later, its too complex
// export function useToggleConvoHidden$Cache() {
//   const orgShortcode = useOrgShortcode();
//   const utils = platform.useUtils();

//   return useCallback(
//     async ({
//       convoId,
//       spaceShortcode,
//       hide = false
//     }: {
//       convoId: TypeId<'convos'> | TypeId<'convos'>[];
//       spaceShortcode: string;
//       hide: boolean;
//     }) => {
//       const convos = Array.isArray(convoId) ? convoId : [convoId];

//       await Promise.allSettled(
//         convos.map(async (convoId) => {
//           utils.convos.getConvo.setData(
//             { convoPublicId: convoId, orgShortcode },
//             (updater) => {
//               if (!updater) return;
//               const clonedUpdater = structuredClone(updater);
//               const participantIndex =
//                 clonedUpdater.data.participants.findIndex(
//                   (participant) =>
//                     participant.publicId === updater.ownParticipantPublicId
//                 );
//               if (participantIndex === -1) return;
//               clonedUpdater.data.participants[participantIndex]!.hidden = hide;
//               return clonedUpdater;
//             }
//           );

//           const convoToAdd =
//             await utils.convos.getOrgMemberSpecificConvo.ensureData(
//               {
//                 convoPublicId: convoId,
//                 orgShortcode
//               },
//               { staleTime: ms('1 minute') }
//             );

//           const targets = [spaceShortcode, 'all']
//             .map((spaceShortcode) =>
//               [true, false].map((includeHidden) => ({
//                 orgShortcode,
//                 spaceShortcode,
//                 includeHidden
//               }))
//             )
//             .flat();

//           for (const target of targets) {
//             if (hide) {
//               utils.spaces.getSpaceConvos.setInfiniteData(target, (updater) =>
//                 infiniteConvoListUpdater(
//                   /* hide from non-hidden */ true,
//                   null,
//                   convoId,
//                   updater
//                 )
//               );
//             } else {
//               utils.spaces.getSpaceConvos.setInfiniteData(target, (updater) =>
//                 infiniteConvoListUpdater(
//                   /* add from hidden */ false,
//                   convoToAdd,
//                   null,
//                   updater
//                 )
//               );
//             }
//           }
//         })
//       );
//     },
//     [
//       orgShortcode,
//       utils.convos.getConvo,
//       utils.spaces.getSpaceConvos,
//       utils.convos.getOrgMemberSpecificConvo
//     ]
//   );
// }

export function useUpdateConvoMessageList$Cache() {
  const orgShortcode = useOrgShortcode();
  const utils = platform.useUtils();
  const updateConvoData = useUpdateConvoData$Cache();

  // TODO: make the reply mutation return the new convo entry, to save one API call
  return useCallback(
    async ({
      convoEntryPublicId,
      spaceShortcode,
      convoId
    }: {
      convoId: TypeId<'convos'>;
      convoEntryPublicId: TypeId<'convoEntries'>;
      spaceShortcode: string;
    }) => {
      await utils.convos.entries.getConvoEntries.cancel({
        convoPublicId: convoId,
        orgShortcode
      });
      const convoEntry =
        await utils.convos.entries.getConvoSingleEntry.ensureData(
          {
            convoPublicId: convoId,
            convoEntryPublicId,
            orgShortcode
          },
          { staleTime: ms('1 minute') }
        );

      const targets = [spaceShortcode, 'all'];

      for (const target of targets) {
        await updateConvoData({
          convoId,
          dataUpdater: (oldData) => {
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
          },
          spaceShortcode: target
        });
      }

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
      utils.convos.entries.getConvoEntries,
      utils.convos.entries.getConvoSingleEntry,
      utils.convos.getConvo,
      orgShortcode,
      updateConvoData
    ]
  );
}

export function useUpdateConvoData$Cache() {
  const orgShortcode = useOrgShortcode();
  const utils = platform.useUtils();

  return useCallback(
    async ({
      convoId,
      dataUpdater,
      spaceShortcode
    }: {
      convoId: TypeId<'convos'>;
      dataUpdater: (oldData: Convo) => Convo;
      spaceShortcode: string;
    }) => {
      const targets = [spaceShortcode, 'all'].map((spaceShortcode) => ({
        orgShortcode,
        spaceShortcode
      }));

      for (const target of targets) {
        utils.spaces.getSpaceConvos.setInfiniteData(target, (updater) => {
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
        });
      }
    },
    [orgShortcode, utils.spaces.getSpaceConvos]
  );
}
