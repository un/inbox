'use client';

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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/src/components/shadcn-ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/src/components/shadcn-ui/tooltip';
import { useDeleteConvo$Cache, type formatParticipantData } from '../../utils';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { type VariantProps, cva } from 'class-variance-authority';
import { type RouterOutputs, platform } from '@/src/lib/trpc';
import { Button } from '@/src/components/shadcn-ui/button';
import { type TypeId } from '@u22n/utils/typeid';
import { Participants } from './participants';
import { useRouter } from 'next/navigation';
import { cn } from '@/src/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';

type TopBarProps = {
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
  subjects?: RouterOutputs['convos']['getConvo']['data']['subjects'];
};

export default function TopBar({
  isConvoLoading,
  convoId,
  convoHidden,
  subjects,
  participants,
  attachments
}: TopBarProps) {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const router = useRouter();
  const removeConvoFromList = useDeleteConvo$Cache();

  const { mutateAsync: hideConvo, isPending: hidingConvo } =
    platform.convos.hideConvo.useMutation();
  const { mutateAsync: deleteConvo, isPending: deletingConvo } =
    platform.convos.deleteConvo.useMutation({
      onSuccess: () => {
        void removeConvoFromList(convoId);
        router.push(`/${orgShortcode}/convo`);
      },
      onError: (error) => {
        toast.error('Something went wrong while deleting the convo', {
          description: error.message
        });
      }
    });

  return (
    <div className="border-base-5 bg-base-1 flex w-full flex-col items-center justify-between border-b p-0">
      <div className="border-base-5 flex h-14 w-full flex-row items-center justify-between border-b p-4">
        <div className="flex flex-1 flex-row items-center gap-4 overflow-hidden">
          <Button
            variant={'outline'}
            size={'icon-sm'}
            asChild>
            <Link href={`/${orgShortcode}/convo`}>
              <CaretLeft size={16} />
            </Link>
          </Button>
          {subjects?.map((subject) => (
            <span
              key={subject.subject}
              className="min-w-fit max-w-0 truncate text-lg font-medium leading-tight">
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
                loading={deletingConvo}
                onClick={async (e) => {
                  e.preventDefault();
                  if (e.shiftKey) {
                    return deleteConvo({
                      convoPublicId: convoId,
                      orgShortcode
                    }).catch(() => null);
                  } else {
                    setDeleteModalOpen(true);
                  }
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
                loading={hidingConvo}
                onClick={() =>
                  hideConvo({
                    convoPublicId: convoId,
                    orgShortcode,
                    unhide: convoHidden ? true : undefined
                  })
                }>
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
                {...attachment}
              />
            ))
          ) : (
            <span className="text-xs">No Attachments</span>
          )}
        </div>
      </div>
      {deleteModalOpen && (
        <DeleteModal
          open={deleteModalOpen}
          setOpen={setDeleteModalOpen}
          convoId={convoId}
          convoHidden={convoHidden}
          onSuccess={() => router.push(`/${orgShortcode}/convo`)}
        />
      )}
    </div>
  );
}

type DeleteModalProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
  convoId: TypeId<'convos'>;
  convoHidden: boolean | null;
};

function DeleteModal({
  open,
  convoId,
  convoHidden,
  setOpen
}: DeleteModalProps) {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const removeConvoFromList = useDeleteConvo$Cache();

  const { mutateAsync: hideConvo, isPending: hidingConvo } =
    platform.convos.hideConvo.useMutation({
      onSuccess: () => {
        void removeConvoFromList(convoId);
        setOpen(false);
      },
      onError: (error) => {
        toast.error('Something went wrong while hiding the convo', {
          description: error.message
        });
        setOpen(false);
      }
    });

  const { mutateAsync: deleteConvo, isPending: deletingConvo } =
    platform.convos.deleteConvo.useMutation({
      onSuccess: () => {
        void removeConvoFromList(convoId);
        setOpen(false);
      },
      onError: (error) => {
        toast.error('Something went wrong while deleting the convo', {
          description: error.message
        });
        setOpen(false);
      }
    });

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        if (deletingConvo || hidingConvo) return;
        setOpen(false);
      }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Convo?</DialogTitle>
          <DialogDescription>
            <div>
              This will permanently and immediately delete this conversation for
              all the participants.
            </div>
            <div>Are you sure you want to delete this conversation?</div>
            {!convoHidden && (
              <div className="py-2">You can also choose to hide this Convo</div>
            )}
            <div className="py-3 text-xs font-semibold">
              ProTip: Hold{' '}
              <kbd className="bg-base-2 rounded-md border p-1">Shift</kbd> next
              time to skip this confirmation prompt
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex gap-2">
          <DialogClose asChild>
            <Button
              variant="secondary"
              className="flex-1"
              disabled={hidingConvo || deletingConvo}>
              Cancel
            </Button>
          </DialogClose>
          {convoHidden ? null : (
            <Button
              variant="secondary"
              className="flex-1"
              loading={hidingConvo}
              disabled={deletingConvo}
              onClick={() =>
                hideConvo({
                  convoPublicId: convoId,
                  orgShortcode
                })
              }>
              Hide Instead
            </Button>
          )}
          <Button
            variant="destructive"
            className="flex-1"
            disabled={hidingConvo}
            onClick={() =>
              deleteConvo({
                convoPublicId: convoId,
                orgShortcode
              })
            }>
            Delete
          </Button>
        </DialogFooter>
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

function AttachmentBlock({ name, url, type, publicId }: AttachmentBlockProps) {
  const fileType = type.split('/')[1] ?? type;

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

  let shownName = name;
  // Limit the length of the attachment name to just 12 characters and replace the rest with ... and include the extension at the end
  const [fileName = '', extension] = name.split('.');
  if (fileName.length > 15) {
    shownName = `${fileName?.slice(0, 12)}...` + `.${extension}`;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          target="_blank"
          key={publicId}
          href={url}>
          <div className="border-base-6 flex flex-row items-center gap-2 rounded-md border px-2 py-1.5">
            <div
              className={cn(
                iconClasses({ color: fileType as IconClassProps['color'] })
              )}>
              <FileTypeIcon />
            </div>
            <div className="flex flex-col gap-0">
              <span className="text-xs font-medium">{shownName}</span>
            </div>
          </div>
        </a>
      </TooltipTrigger>
      <TooltipContent>
        <span className="text-xs font-medium">{name}</span>
      </TooltipContent>
    </Tooltip>
  );
}
