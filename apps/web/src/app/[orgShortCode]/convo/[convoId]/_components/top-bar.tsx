'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/src/components/shadcn-ui/tooltip';
import {
  EyeSlash,
  Eye,
  Trash,
  CaretLeft,
  FilePdf,
  FileDoc,
  FileXls,
  FilePng,
  FileJpg,
  FilePpt,
  FileZip,
  FileTxt,
  File
} from '@phosphor-icons/react';
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
import { cn } from '@/src/lib/utils';
import { type formatParticipantData } from '../../utils';
import {
  Dialog,
  DialogContent,
  DialogTitle
} from '@/src/components/shadcn-ui/dialog';
import { Participants } from './participants';
import { type VariantProps, cva } from 'class-variance-authority';

export default function TopBar({
  isConvoLoading,
  convoId,
  convoHidden,
  subjects,
  participants,
  attachments
}: {
  participants: NonNullable<ReturnType<typeof formatParticipantData>>[];
  attachments: {
    name: string;
    url: string;
    type: string;
    publicId: TypeId<'convoAttachments'>;
  }[];
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
    <div className="border-base-5 bg-base-1 flex w-full flex-col items-center justify-between border-b p-0">
      <div className="border-base-5 flex h-14 w-full flex-row items-center justify-between border-b p-4">
        <div className="flex w-full max-w-full flex-row items-center gap-4 overflow-hidden">
          <Button
            variant={'outline'}
            size={'icon-sm'}
            asChild>
            <Link href={`/${orgShortCode}/convo`}>
              <CaretLeft size={16} />
            </Link>
          </Button>
          {subjects?.map((subject) => (
            <span
              key={subject.subject}
              className="truncate text-lg font-medium leading-tight">
              {subject.subject}
            </span>
          ))}
        </div>
        <div className="flex flex-row gap-2">
          <Participants participants={participants} />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={'outline'}
                size={'icon-sm'}
                className={
                  'hover:bg-red-5 hover:text-red-11 hover:border-red-8'
                }
                onClick={() => {
                  openDeleteModal({ convoHidden })
                    // Navigate to empty page on delete
                    .then(() => router.push(`/${orgShortCode}/convo`))
                    // Do nothing if Hide is chosen or Modal is Closed
                    .catch(() => null);
                }}>
                <Trash size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete Convo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={'outline'}
                size={'icon-sm'}
                onClick={async () => {
                  await hideConvo.mutateAsync({
                    convoPublicId: convoId,
                    orgShortCode,
                    unhide: convoHidden ? true : undefined
                  });
                  await toggleConvoHiddenState(convoId, !convoHidden);
                }}>
                {convoHidden ? <Eye size={16} /> : <EyeSlash size={16} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {convoHidden ? 'Unhide Convo' : 'Hide Convo'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div
        className={cn(
          'flex w-full flex-row flex-wrap items-center justify-end gap-2 transition-all',
          isConvoLoading ? 'max-h-0 p-0' : 'max-h-52 p-4'
        )}>
        <div
          className={cn(
            'justify-ends flex flex-wrap items-center justify-end gap-2 transition-all',
            isConvoLoading ? 'max-h-0' : 'max-h-52'
          )}>
          {attachments.length > 0 ? (
            attachments.map((attachment) => (
              <AttachmentBlock
                key={attachment.publicId}
                attachment={attachment}
              />
            ))
          ) : (
            <span className="text-xs">No Attachments</span>
          )}
        </div>
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
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open && !deleteConvo.isPending && !hideConvo.isPending) {
          onClose();
        }
      }}>
      <DialogContent className="w-full max-w-96 p-4">
        <DialogTitle>Delete Convo?</DialogTitle>

        <div className="flex flex-col gap-1">
          <span>
            This will permanently and immediately delete this conversation for
            all the participants.
          </span>
          <span>Are you sure you want to delete this conversation?</span>
          {convoHidden ? null : (
            <span>Tip: You can also choose to hide this Convo</span>
          )}
        </div>

        <div className="flex flex-row gap-2">
          <Button
            variant="outline"
            disabled={deleteConvo.isPending || hideConvo.isPending}
            onClick={() => onClose()}>
            Cancel
          </Button>
          {convoHidden ? null : (
            <Button
              variant="secondary"
              disabled={deleteConvo.isPending || hideConvo.isPending}
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
            disabled={hideConvo.isPending || deleteConvo.isPending}
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
      </DialogContent>
    </Dialog>
  );
}

type AttachmentBlockProps = {
  name: string;
  url: string;
  type: string;
  publicId: TypeId<'convoAttachments'>;
};

function AttachmentBlock({ attachment }: { attachment: AttachmentBlockProps }) {
  const fileType = attachment.type.split('/')[1] ?? attachment.type;

  const iconClasses = cva(
    'bg-accent-9 text-accent-1 flex h-5 w-5 items-center justify-center rounded-sm',
    {
      variants: {
        color: {
          pdf: 'bg-red-9 text-red-1',
          ppt: 'bg-pink-9 text-pink-1',
          zip: 'bg-amber-9 text-amber-1',
          txt: 'bg-base-9 text-base-1',
          doc: 'bg-blue-9 text-blue-1',
          xls: 'bg-green-9 text-green-1',
          png: 'bg-iris-9 text-iris-1',
          jpg: 'bg-iris-9 text-iris-1',
          jpeg: 'bg-iris-9 text-iris-1',
          misc: 'bg-accent-9 text-accent-1'
        }
      },
      defaultVariants: {
        color: 'misc'
      }
    }
  );
  type IconClassProps = VariantProps<typeof iconClasses>;

  const FileTypeIcon = () => {
    switch (fileType) {
      case 'pdf':
        return <FilePdf />;
      case 'ppt':
        return <FilePpt />;
      case 'zip':
        return <FileZip />;
      case 'txt':
        return <FileTxt />;
      case 'doc':
        return <FileDoc />;
      case 'xls':
        return <FileXls />;
      case 'png':
        return <FilePng />;
      case 'jpg':
        return <FileJpg />;
      default:
        return <File />;
    }
  };

  // Limit the length of the attachment name to just 12 characters and replace the rest with ... and include the extension at the end
  if (attachment.name.length > 12) {
    const extension = attachment.name.split('.').pop();
    attachment.name = `${attachment.name.slice(0, 12)}...` + `.${extension}`;
  }

  return (
    <a
      target="_blank"
      key={attachment.publicId}
      href={attachment.url}>
      <div className="border-base-6 flex flex-row items-center gap-2 rounded-md border px-2 py-1.5">
        <div
          className={cn(
            iconClasses({ color: fileType as IconClassProps['color'] })
          )}>
          <FileTypeIcon />
        </div>
        <div className="flex flex-col gap-0">
          <span className="text-xs font-medium">{attachment.name}</span>
        </div>
      </div>
    </a>
  );
}
