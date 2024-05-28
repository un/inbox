'use client';

import { Dialog, IconButton, Tooltip, Skeleton } from '@radix-ui/themes';
import { EyeSlash, Eye, Trash, ArrowLeft } from '@phosphor-icons/react';
import Link from 'next/link';
import { useDeleteConvo$Cache, useToggleConvoHidden$Cache } from '../../utils';
import useAwaitableModal, {
  type ModalComponent
} from '@/src/hooks/use-awaitable-modal';
import { type RouterOutputs, api } from '@/src/lib/trpc';
import { type TypeId } from '@u22n/utils/typeid';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { useRouter } from 'next/navigation';
import { Button } from '@/src/components/shadcn-ui/button';

export default function TopBar({
  isConvoLoading,
  convoId,
  convoHidden,
  subjects
}: {
  isConvoLoading: boolean;
  convoId: TypeId<'convos'>;
  convoHidden: boolean | null;
  subjects: RouterOutputs['convos']['getConvo']['data']['subjects'] | undefined;
}) {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const [ModalRoot, openDeleteModal] = useAwaitableModal(DeleteModal, {
    convoId,
    convoHidden
  });
  const hideConvo = api.convos.hideConvo.useMutation();
  const router = useRouter();
  const toggleConvoHiddenState = useToggleConvoHidden$Cache();

  return (
    <div className=" bg-base-2 flex h-12 w-full flex-row items-center justify-between  p-2">
      <div className="flex flex-row items-center gap-4">
        <Link href={`/${orgShortCode}/convo`}>
          <IconButton
            variant="soft"
            size="2">
            <ArrowLeft size={16} />
          </IconButton>
        </Link>
        <Skeleton loading={isConvoLoading}>
          <span className="w-full truncate p-1">
            {subjects ? subjects[0]?.subject : ''}
          </span>
        </Skeleton>
      </div>
      <div className="flex flex-row ">
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
            {convoHidden ? <Eye size={16} /> : <EyeSlash size={16} />}
          </IconButton>
        </Tooltip>
      </div>
      <ModalRoot />
    </div>
  );
}

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

        <div className="flex flex-col">
          <span>
            This will permanently and immediately delete this conversation for
            all the participants.
          </span>
          <span>Are you sure you want to delete this conversation?</span>
          {convoHidden ? null : (
            <span>Tip: You can also choose to hide this Convo</span>
          )}
        </div>

        <div className="flex flex-row ">
          <Button
            variant="secondary"
            disabled={deleteConvo.isLoading || hideConvo.isLoading}
            onClick={() => onClose()}>
            Cancel
          </Button>
          {convoHidden ? null : (
            <Button
              variant="secondary"
              disabled={deleteConvo.isLoading || hideConvo.isLoading}
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
            variant="destructive"
            color="red"
            disabled={hideConvo.isLoading || deleteConvo.isLoading}
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
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
