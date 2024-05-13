'use client';

import { cn, generateAvatarUrl, getInitials } from '@/src/lib/utils';
import {
  Avatar,
  Box,
  Dialog,
  Flex,
  Heading,
  IconButton,
  Text,
  HoverCard,
  Button,
  Tooltip
} from '@radix-ui/themes';
import { ChevronUp, ChevronDown, EyeOff, Eye, Trash } from 'lucide-react';
import { useState } from 'react';
import {
  useDeleteConvo$Cache,
  useToggleConvoHidden$Cache,
  type formatParticipantData
} from '../../utils';
import { memo } from 'react';
import useAwaitableModal, {
  type ModalComponent
} from '@/src/hooks/use-awaitable-modal';
import { api } from '@/src/lib/trpc';
import { type TypeId } from '@u22n/utils';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { useRouter } from 'next/navigation';

export default function ChatSideBar({
  participants,
  convoId,
  convoHidden
}: {
  participants: NonNullable<ReturnType<typeof formatParticipantData>>[];
  convoId: TypeId<'convos'>;
  convoHidden: boolean | null;
}) {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const [participantOpen, setParticipantOpen] = useState(false);
  const [ModalRoot, openDeleteModal] = useAwaitableModal(DeleteModal, {
    convoId,
    convoHidden
  });
  const hideConvo = api.convos.hideConvo.useMutation();
  const router = useRouter();
  const toggleConvoHiddenState = useToggleConvoHidden$Cache();

  return (
    <Flex
      className="h-full w-[300px]"
      direction="column"
      gap="2">
      <Flex
        justify="end"
        gap="2"
        align="center"
        className="border-gray-11 h-12 w-full border-b p-2">
        <Tooltip content="Delete Convo">
          <IconButton
            color="red"
            variant="soft"
            disabled={convoHidden === null || hideConvo.isLoading}
            onClick={() => {
              openDeleteModal({ convoHidden })
                // Navigate to empty page on delete
                .then(() => router.push(`/${orgShortCode}/convo`))
                // Do nothing if Hide is chosen or Modal is Closed
                .catch(() => null);
            }}>
            <Trash size={16} />
          </IconButton>
        </Tooltip>
        <Tooltip content={convoHidden ? 'Unhide Convo' : 'Hide Convo'}>
          <IconButton
            variant="soft"
            loading={hideConvo.isLoading}
            disabled={convoHidden === null}
            onClick={async () => {
              await hideConvo.mutateAsync({
                convoPublicId: convoId,
                orgShortCode,
                unhide: convoHidden ? true : undefined
              });
              await toggleConvoHiddenState(convoId, !convoHidden);
            }}>
            {convoHidden ? <Eye size={16} /> : <EyeOff size={16} />}
          </IconButton>
        </Tooltip>
      </Flex>
      <Flex className="border-gray-11 h-full w-full border-l">
        <Flex
          direction="column"
          className="w-full">
          <Flex
            className="w-full p-1"
            justify="between"
            align="center"
            onClick={() => setParticipantOpen((open) => !open)}>
            <Heading
              size="3"
              className="select-none p-2">
              Participants
            </Heading>
            {participantOpen ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
          </Flex>
          {participants.length === 0 && <Text className="p-2">Loading...</Text>}
          <Flex
            direction={participantOpen ? 'column' : 'row'}
            className="px-2"
            gap={participantOpen ? '2' : undefined}>
            {participants.map((participant, i) => (
              <Flex
                gap="2"
                align="center"
                key={participant.participantPublicId}>
                <HoverCard.Root>
                  <HoverCard.Trigger>
                    <Box
                      style={{ zIndex: 100 + i }}
                      className={cn(
                        !participantOpen && i !== 0 ? '-ml-2' : '',
                        'dark:outline-graydark-1 dark:bg-graydark-1 outline-gray-1 bg-gray-1 w-fit rounded-full outline'
                      )}>
                      <Avatar
                        src={
                          generateAvatarUrl({
                            avatarTimestamp: participant.avatarTimestamp,
                            publicId: participant.avatarProfilePublicId,
                            size: 'lg'
                          }) ?? undefined
                        }
                        fallback={getInitials(participant.name)}
                        radius="full"
                      />
                    </Box>
                  </HoverCard.Trigger>
                  <HoverCard.Content
                    className="max-w-[300px] px-2 py-1"
                    side={participantOpen ? 'left' : 'bottom'}>
                    <Flex
                      direction="column"
                      align="center"
                      gap="2">
                      <Text className="truncate">{participant.name}</Text>
                      {participantOpen && participant.signatureHtml && (
                        <Flex
                          direction="column"
                          align="center"
                          justify="center"
                          gap="1">
                          <Text className="uppercase">Signature</Text>
                          <SignatureHTML html={participant.signatureHtml} />
                        </Flex>
                      )}
                    </Flex>
                  </HoverCard.Content>
                </HoverCard.Root>
                {participantOpen && (
                  <Text className="truncate">{participant.name}</Text>
                )}
              </Flex>
            ))}
          </Flex>
        </Flex>
      </Flex>
      <ModalRoot />
    </Flex>
  );
}

const SignatureHTML = memo(
  function SIgnatureHTML({ html }: { html: string }) {
    return (
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        className="w-full"
      />
    );
  },
  (prev, curr) => prev.html === curr.html
);

function DeleteModal({
  onClose,
  onResolve,
  open,
  convoId,
  convoHidden
}: ModalComponent<{ convoId: TypeId<'convos'>; convoHidden: boolean | null }>) {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const hideConvo = api.convos.hideConvo.useMutation();
  const deleteConvo = api.convos.deleteConvo.useMutation();
  const removeConvoFromList = useDeleteConvo$Cache();
  const toggleConvoHiddenState = useToggleConvoHidden$Cache();

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(open) => {
        if (!open && !deleteConvo.isLoading && !hideConvo.isLoading) {
          onClose();
        }
      }}>
      <Dialog.Content className="w-full max-w-96 p-4">
        <Dialog.Title
          className="mx-auto w-fit py-2"
          size="2">
          Delete Convo?
        </Dialog.Title>

        <Flex
          gap="4"
          direction="column">
          <Text
            size="2"
            as="div">
            This will permanently and immediately delete this conversation for
            all the participants.
          </Text>
          <Text
            size="2"
            as="div">
            Are you sure you want to delete this conversation?
          </Text>
          {convoHidden ? null : (
            <Text
              size="1"
              as="div"
              color="gray">
              Tip: You can also choose to hide this Convo
            </Text>
          )}
        </Flex>

        <Flex
          gap="3"
          align="center"
          justify="end"
          className="mt-4">
          <Button
            size="2"
            variant="surface"
            disabled={deleteConvo.isLoading || hideConvo.isLoading}
            onClick={() => onClose()}>
            Cancel
          </Button>
          {convoHidden ? null : (
            <Button
              size="2"
              variant="soft"
              loading={hideConvo.isLoading}
              disabled={deleteConvo.isLoading}
              onClick={async () => {
                await hideConvo.mutateAsync({
                  convoPublicId: convoId,
                  orgShortCode
                });
                await toggleConvoHiddenState(convoId, true);
                onClose();
              }}>
              Hide Instead
            </Button>
          )}
          <Button
            size="2"
            variant="solid"
            color="red"
            loading={deleteConvo.isLoading}
            disabled={hideConvo.isLoading}
            onClick={async () => {
              await deleteConvo.mutateAsync({
                convoPublicId: convoId,
                orgShortCode
              });
              await removeConvoFromList(convoId);
              onResolve(null);
            }}>
            Delete
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
