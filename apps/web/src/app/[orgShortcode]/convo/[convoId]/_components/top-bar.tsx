'use client';

import {
  // EyeSlash,
  // Eye,
  Trash,
  FilePdf,
  FileDoc,
  FileXls,
  FilePng,
  FileJpg,
  FilePpt,
  FileZip,
  FileTxt,
  File,
  ArrowLeft,
  SquaresFour,
  CaretRight,
  Circle,
  Check,
  ArrowSquareOut,
  ArrowSquareIn
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator
} from '@/src/components/shadcn-ui/breadcrumb';
import {
  useCurrentConvoId,
  useOrgScopedRouter,
  useOrgShortcode,
  useSpaceShortcode
} from '@/src/hooks/use-params';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/src/components/shadcn-ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/src/components/shadcn-ui/popover';
import { useDeleteConvo$Cache, type formatParticipantData } from '../../utils';
import { useModifierKeys } from '@/src/components/modifier-class-provider';
import { type VariantProps, cva } from 'class-variance-authority';
import { type RouterOutputs, platform } from '@/src/lib/trpc';
import { type SpaceWorkflowType } from '@u22n/utils/spaces';
import { Button } from '@/src/components/shadcn-ui/button';
import { useIsMobile } from '@/src/hooks/use-is-mobile';
import { memo, useCallback, useState } from 'react';
import { type UiColor } from '@u22n/utils/colors';
import { type TypeId } from '@u22n/utils/typeid';
import { Participants } from './participants';
import { cn } from '@/src/lib/utils';
// import { toast } from 'sonner';
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
  // convoHidden: boolean | null;
  subjects?: RouterOutputs['convos']['getConvo']['data']['subjects'];
};

export default function TopBar({
  isConvoLoading,
  convoId,
  // convoHidden,
  subjects,
  participants,
  attachments
}: TopBarProps) {
  // const orgShortcode = useOrgShortcode();
  const isMobile = useIsMobile();
  // const { mutate: hideConvo, isPending: hidingConvo } =
  //   platform.convos.hideConvo.useMutation();

  return (
    <div className="border-base-5 bg-base-1 flex w-full flex-col items-center justify-between border-b p-0">
      <div className="border-base-5 flex h-14 w-full flex-row items-center justify-between border-b p-4">
        <div className="flex flex-1 flex-row items-center gap-4 overflow-hidden">
          {isMobile && (
            <Button
              variant="outline"
              size="icon-sm"
              asChild>
              <Link href={`./`}>
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          )}
          {subjects?.map((subject) => (
            <span
              key={subject.subject}
              className="min-w-0 truncate text-lg font-medium leading-tight">
              {subject.subject}
            </span>
          ))}
        </div>
        <div className="flex flex-row gap-2">
          <Participants participants={participants} />
          <AddToSpaceButton convoId={convoId} />
          <MoveToSpaceButton convoId={convoId} />
          <DeleteButton
            convoId={convoId}
            // hidden={convoHidden}
          />
          {/* <Tooltip>
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
          </Tooltip> */}
        </div>
      </div>
      <div className="flex w-full max-w-full items-center justify-between gap-2 sm:flex-col md:flex-row">
        <SpaceWorkflowBlock />
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
      </div>
    </div>
  );
}

type AddToSpaceButtonProps = {
  convoId: TypeId<'convos'>;
};

function AddToSpaceButton({ convoId }: AddToSpaceButtonProps) {
  const [showSpaceList, setShowSpaceList] = useState(false);
  const orgShortcode = useOrgShortcode();

  const convoSpaceQuery = platform.useUtils().convos.getConvoSpaceWorkflows;

  const { data: spaces, isLoading: spacesLoading } =
    platform.spaces.getAllOrgSpacesWithPersonalSeparately.useQuery({
      orgShortcode
    });

  const { mutateAsync: addConvoToSpace, isPending } =
    platform.convos.addConvoToSpace.useMutation({
      onSuccess: () => {
        void convoSpaceQuery.invalidate();
      }
    });

  async function handleAddToSpace(spacePublicId: TypeId<'spaces'>) {
    await addConvoToSpace({
      orgShortcode: orgShortcode,
      convoPublicId: convoId,
      spacePublicId: spacePublicId
    });
    setShowSpaceList(false);
  }

  return (
    <>
      <Popover open={showSpaceList}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger
              asChild
              onClick={() => setShowSpaceList(!showSpaceList)}>
              <Button
                variant={'outline'}
                size={'icon-sm'}
                loading={isPending}>
                <ArrowSquareIn className="size-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Add Conversation to another Space</TooltipContent>
        </Tooltip>
        <PopoverContent onPointerDownOutside={() => setShowSpaceList(false)}>
          <div className="flex max-h-96 w-full flex-col gap-4 overflow-x-auto">
            <span className="text-base-11 text-sm font-semibold">
              Add Conversation to another Space
            </span>
            {!spacesLoading &&
              spaces?.personalSpaces &&
              spaces?.personalSpaces?.length > 0 && (
                <div className="flex w-full flex-col gap-2">
                  <span className="text-base-10 text-xs font-semibold">
                    Personal Spaces
                  </span>
                  {spaces?.personalSpaces.map((space) => (
                    <Button
                      variant={'ghost'}
                      onClick={() => handleAddToSpace(space.publicId)}
                      className="hover:bg-slate-1 group flex w-full max-w-full flex-row items-center gap-2 truncate rounded-lg p-0.5"
                      key={space.publicId}>
                      <div className="flex w-full max-w-full flex-row items-center gap-4 truncate p-1">
                        <div
                          className="flex h-6 min-h-6 w-6 min-w-6 items-center justify-center rounded-sm"
                          style={{
                            backgroundColor: `var(--${space.color}4)`,
                            color: `var(--${space.color}9)`
                          }}>
                          <SquaresFour
                            className="h-4 w-4"
                            weight="bold"
                          />
                        </div>
                        <span className="text-slate-12 h-full truncate font-medium">
                          {space.name || 'Unnamed Space'}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            {!spacesLoading &&
              spaces?.orgSpaces &&
              spaces?.orgSpaces?.length > 0 && (
                <div className="flex w-full flex-col gap-2">
                  <span className="text-base-10 text-xs font-semibold">
                    Shared Spaces
                  </span>
                  {spaces?.orgSpaces.map((space) => (
                    <Button
                      variant={'ghost'}
                      onClick={() => handleAddToSpace(space.publicId)}
                      className="hover:bg-slate-1 group flex w-full max-w-full flex-row items-center gap-2 truncate rounded-lg p-0.5"
                      key={space.publicId}>
                      <div className="flex w-full max-w-full flex-row items-center gap-4 truncate p-1">
                        <div
                          className="flex h-6 min-h-6 w-6 min-w-6 items-center justify-center rounded-sm"
                          style={{
                            backgroundColor: `var(--${space.color}4)`,
                            color: `var(--${space.color}9)`
                          }}>
                          <SquaresFour
                            className="h-4 w-4"
                            weight="bold"
                          />
                        </div>
                        <span className="text-slate-12 h-full truncate font-medium">
                          {space.name || 'Unnamed Space'}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

type MoveToSpaceButtonProps = {
  convoId: TypeId<'convos'>;
};

function MoveToSpaceButton({ convoId }: MoveToSpaceButtonProps) {
  const [showSpaceList, setShowSpaceList] = useState(false);
  const orgShortcode = useOrgShortcode();

  const convoSpaceQuery = platform.useUtils().convos.getConvoSpaceWorkflows;

  const { data: spaces, isLoading: spacesLoading } =
    platform.spaces.getAllOrgSpacesWithPersonalSeparately.useQuery({
      orgShortcode
    });

  const { mutateAsync: moveConvoToSpace, isPending } =
    platform.convos.moveConvoToSpace.useMutation({
      onSuccess: () => {
        void convoSpaceQuery.invalidate();
      }
    });

  async function handleMoveToSpace(spacePublicId: TypeId<'spaces'>) {
    await moveConvoToSpace({
      orgShortcode: orgShortcode,
      convoPublicId: convoId,
      spacePublicId: spacePublicId
    });
    setShowSpaceList(false);
  }

  return (
    <>
      <Popover open={showSpaceList}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger
              asChild
              onClick={() => setShowSpaceList(!showSpaceList)}>
              <Button
                variant={'outline'}
                size={'icon-sm'}
                loading={isPending}>
                <ArrowSquareOut className="size-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            Move Conversation to a different Space
          </TooltipContent>
        </Tooltip>
        <PopoverContent onPointerDownOutside={() => setShowSpaceList(false)}>
          <div className="flex max-h-96 w-full flex-col gap-4 overflow-x-auto">
            <span className="text-base-11 text-sm font-semibold">
              Move Conversation to a different Space
            </span>
            {!spacesLoading &&
              spaces?.personalSpaces &&
              spaces?.personalSpaces?.length > 0 && (
                <div className="flex w-full flex-col gap-2">
                  <span className="text-base-10 text-xs font-semibold">
                    Personal Spaces
                  </span>
                  {spaces?.personalSpaces.map((space) => (
                    <Button
                      variant={'ghost'}
                      onClick={() => handleMoveToSpace(space.publicId)}
                      className="hover:bg-slate-1 group flex w-full max-w-full flex-row items-center gap-2 truncate rounded-lg p-0.5"
                      key={space.publicId}>
                      <div className="flex w-full max-w-full flex-row items-center gap-4 truncate p-1">
                        <div
                          className="flex h-6 min-h-6 w-6 min-w-6 items-center justify-center rounded-sm"
                          style={{
                            backgroundColor: `var(--${space.color}4)`,
                            color: `var(--${space.color}9)`
                          }}>
                          <SquaresFour
                            className="h-4 w-4"
                            weight="bold"
                          />
                        </div>
                        <span className="text-slate-12 h-full truncate font-medium">
                          {space.name || 'Unnamed Space'}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            {!spacesLoading &&
              spaces?.orgSpaces &&
              spaces?.orgSpaces?.length > 0 && (
                <div className="flex w-full flex-col gap-2">
                  <span className="text-base-10 text-xs font-semibold">
                    Shared Spaces
                  </span>
                  {spaces?.orgSpaces.map((space) => (
                    <Button
                      variant={'ghost'}
                      onClick={() => handleMoveToSpace(space.publicId)}
                      className="hover:bg-slate-1 group flex w-full max-w-full flex-row items-center gap-2 truncate rounded-lg p-0.5"
                      key={space.publicId}>
                      <div className="flex w-full max-w-full flex-row items-center gap-4 truncate p-1">
                        <div
                          className="flex h-6 min-h-6 w-6 min-w-6 items-center justify-center rounded-sm"
                          style={{
                            backgroundColor: `var(--${space.color}4)`,
                            color: `var(--${space.color}9)`
                          }}>
                          <SquaresFour
                            className="h-4 w-4"
                            weight="bold"
                          />
                        </div>
                        <span className="text-slate-12 h-full truncate font-medium">
                          {space.name || 'Unnamed Space'}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

type DeleteButtonProps = {
  convoId: TypeId<'convos'>;
  // hidden: boolean | null;
};

const DeleteButton = memo(function DeleteButton({
  convoId
  // hidden
}: DeleteButtonProps) {
  const { shiftKey } = useModifierKeys();
  const orgShortcode = useOrgShortcode();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const removeConvoFromList = useDeleteConvo$Cache();
  const { scopedNavigate } = useOrgScopedRouter();
  const currentConvo = useCurrentConvoId();
  const spaceShortcode = useSpaceShortcode();

  const { mutate: deleteConvo, isPending: deletingConvo } =
    platform.convos.deleteConvo.useMutation({
      onSuccess: () =>
        removeConvoFromList({
          convoPublicId: convoId,
          spaceShortcode: spaceShortcode ?? 'personal'
        })
    });

  const onDelete = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (e.shiftKey) {
        if (currentConvo === convoId) {
          scopedNavigate('/convo', true);
        }
        return deleteConvo({
          convoPublicId: convoId,
          orgShortcode
        });
      } else {
        setDeleteModalOpen(true);
      }
    },
    [convoId, currentConvo, deleteConvo, orgShortcode, scopedNavigate]
  );

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={shiftKey ? 'destructive' : 'outline'}
            size={'icon-sm'}
            className={cn(
              !shiftKey && 'hover:bg-red-5 hover:text-red-11 hover:border-red-8'
            )}
            loading={deletingConvo}
            onClick={onDelete}>
            <Trash size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {shiftKey ? 'Delete Convo without confirmation' : 'Delete Convo'}
        </TooltipContent>
      </Tooltip>
      {deleteModalOpen && (
        <DeleteModal
          open={deleteModalOpen}
          setOpen={setDeleteModalOpen}
          convoId={convoId}
          // convoHidden={hidden}
        />
      )}
    </>
  );
});

type DeleteModalProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  convoId: TypeId<'convos'>;
  // convoHidden: boolean | null;
};

function DeleteModal({
  open,
  convoId,
  // convoHidden,
  setOpen
}: DeleteModalProps) {
  const orgShortcode = useOrgShortcode();
  const { scopedNavigate } = useOrgScopedRouter();
  const currentConvo = useCurrentConvoId();
  const spaceShortcode = useSpaceShortcode();
  const removeConvoFromList = useDeleteConvo$Cache();

  // const { mutate: hideConvo, isPending: hidingConvo } =
  //   platform.convos.hideConvo.useMutation({
  //     onSuccess: async () => {
  //       await removeConvoFromList({
  //         convoPublicId: convoId,
  //         spaceShortcode: spaceShortcode ?? 'personal'
  //       });
  //       setOpen(false);
  //     },
  //     onError: (error) => {
  //       toast.error('Something went wrong while hiding the convo', {
  //         description: error.message
  //       });
  //       setOpen(false);
  //     }
  //   });

  const { mutate: deleteConvo, isPending: deletingConvo } =
    platform.convos.deleteConvo.useMutation({
      onSuccess: async () => {
        await removeConvoFromList({
          convoPublicId: convoId,
          spaceShortcode: spaceShortcode ?? 'personal'
        });
        setOpen(false);
      }
    });

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        if (deletingConvo) return;
        setOpen(false);
      }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Convo?</DialogTitle>
          <DialogDescription className="flex flex-col">
            <span>
              This will permanently and immediately delete this conversation for
              all the participants.
            </span>
            <span>Are you sure you want to delete this conversation?</span>
            {/* {!convoHidden && (
              <span className="py-2">
                You can also choose to hide this Convo
              </span>
            )} */}
            <span className="py-3 text-xs font-semibold">
              ProTip: Hold{' '}
              <kbd className="bg-base-2 rounded-md border p-1">Shift</kbd> next
              time to skip this confirmation prompt
            </span>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex gap-2">
          <DialogClose asChild>
            <Button
              variant="secondary"
              className="flex-1"
              disabled={deletingConvo}>
              Cancel
            </Button>
          </DialogClose>
          {/* {convoHidden ? null : (
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
          )} */}
          <Button
            variant="destructive"
            className="flex-1"
            // disabled={hidingConvo}
            loading={deletingConvo}
            onClick={() => {
              if (currentConvo === convoId) {
                scopedNavigate('/convo', true);
              }
              deleteConvo({
                convoPublicId: convoId,
                orgShortcode
              });
            }}>
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

function SpaceWorkflowBlock() {
  const orgShortcode = useOrgShortcode();
  const currentConvo = useCurrentConvoId();

  const { data: convoSpaceWorkflows } =
    platform.convos.getConvoSpaceWorkflows.useQuery({
      orgShortcode: orgShortcode,
      convoPublicId: currentConvo!
    });

  return (
    <div className="flex w-full max-w-full flex-col items-center justify-between gap-2 overflow-clip p-2">
      {convoSpaceWorkflows?.map((spaceWorkflow) => (
        <div
          key={spaceWorkflow.space.publicId}
          className="flex w-full max-w-full flex-row items-center justify-between gap-2 overflow-clip">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                {
                  <div className="flex w-full max-w-full flex-row items-center gap-2 truncate p-1">
                    <div
                      className="flex h-6 min-h-6 w-6 min-w-6 items-center justify-center rounded-sm"
                      style={{
                        backgroundColor: `var(--${spaceWorkflow?.space?.color ?? 'base'}4)`,
                        color: `var(--${spaceWorkflow?.space?.color ?? 'base'}9)`
                      }}>
                      <SquaresFour
                        className="h-4 w-4"
                        weight="bold"
                      />
                    </div>
                    <span className="text-slate-11 h-full truncate">
                      {spaceWorkflow?.space?.name ?? 'Unnamed Space'}
                    </span>
                  </div>
                }
              </BreadcrumbItem>
              {spaceWorkflow.spaceWorkflows.open.length > 0 ||
              spaceWorkflow.spaceWorkflows.active.length > 0 ||
              spaceWorkflow.spaceWorkflows.closed.length > 0 ? (
                <>
                  <BreadcrumbSeparator>
                    <CaretRight />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <SpaceWorkflowBlockWorkflowList
                      currentWorkflow={spaceWorkflow.currentWorkflow}
                      spaceWorkflows={spaceWorkflow.spaceWorkflows}
                      spacePublicId={spaceWorkflow.space.publicId}
                    />
                  </BreadcrumbItem>
                </>
              ) : null}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      ))}
    </div>
  );
}

type SpaceWorkflowData = {
  publicId: TypeId<'spaceWorkflows'>;
  name: string;
  color: UiColor;
  icon: string;
  description: string | null;
  type: SpaceWorkflowType;
  order: number;
  disabled: boolean;
};

type SpaceWorkflowBlockWorkflowList = {
  spacePublicId: TypeId<'spaces'>;
  currentWorkflow: {
    publicId: TypeId<'spaceWorkflows'> | null;
  };
  spaceWorkflows: {
    open: SpaceWorkflowData[];
    active: SpaceWorkflowData[];
    closed: SpaceWorkflowData[];
  };
};

function SpaceWorkflowBlockWorkflowList({
  currentWorkflow,
  spaceWorkflows,
  spacePublicId
}: SpaceWorkflowBlockWorkflowList) {
  const convoId = useCurrentConvoId();
  const orgShortcode = useOrgShortcode();
  const [showWorkflowList, setShowWorkflowList] = useState(false);

  const findWorkflow = (
    workflows: SpaceWorkflowData[]
  ): SpaceWorkflowData | undefined =>
    workflows.find(
      (spaceWorkflow: SpaceWorkflowData) =>
        spaceWorkflow.publicId === currentWorkflow?.publicId
    );

  const currentWorkflowItem =
    findWorkflow(spaceWorkflows.open) ??
    findWorkflow(spaceWorkflows.active) ??
    findWorkflow(spaceWorkflows.closed);

  const { mutateAsync: setConvoWorkflow } =
    platform.convos.setConvoSpaceWorkflow.useMutation({
      onSuccess: () => {
        setShowWorkflowList(false);
      }
    });

  async function handleSetConvoWorkflow(
    spaceWorkflowPublicId: TypeId<'spaceWorkflows'>
  ) {
    if (!convoId) return;
    await setConvoWorkflow({
      orgShortcode: orgShortcode,
      convoPublicId: convoId,
      spacePublicId: spacePublicId,
      workflowPublicId: spaceWorkflowPublicId
    });
  }

  return (
    <>
      <Popover open={showWorkflowList}>
        <PopoverTrigger
          asChild
          onClick={() => setShowWorkflowList(!showWorkflowList)}>
          <Button
            variant={'ghost'}
            className="pl-2"
            asChild>
            <div
              className={cn(
                'bg-base-1 flex w-full cursor-pointer flex-row items-center justify-between gap-8 border'
              )}>
              <div className="flex w-full flex-row items-center gap-4">
                <div
                  className={
                    'flex size-6 min-h-6 min-w-6 items-center justify-center rounded-sm'
                  }
                  style={{
                    backgroundColor: `var(--${currentWorkflowItem?.color ?? 'slate'}4)`
                  }}>
                  <Circle
                    className={'size-4'}
                    weight="regular"
                    style={{
                      color: `var(--${currentWorkflowItem?.color ?? 'slate'}9)`
                    }}
                  />
                </div>
                <span className="text-base-11 text-sm font-medium">
                  {currentWorkflowItem?.name ?? 'No Workflow Status'}
                </span>
              </div>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent onPointerDownOutside={() => setShowWorkflowList(false)}>
          <div className="flex w-full flex-col gap-4">
            <div className="flex w-full flex-col gap-2">
              <span className="text-base-10 text-xs font-semibold">Open</span>
              {spaceWorkflows.open.map((spaceWorkflow: SpaceWorkflowData) => (
                <WorkflowItem
                  key={spaceWorkflow.publicId}
                  workflow={spaceWorkflow}
                  activeWorkflowPublicId={currentWorkflow?.publicId}
                  handler={() => handleSetConvoWorkflow(spaceWorkflow.publicId)}
                />
              ))}
            </div>
            <div className="flex w-full flex-col gap-2">
              <span className="text-base-10 text-xs font-semibold">Active</span>
              {spaceWorkflows.active.map((spaceWorkflow: SpaceWorkflowData) => (
                <WorkflowItem
                  key={spaceWorkflow.publicId}
                  workflow={spaceWorkflow}
                  activeWorkflowPublicId={currentWorkflow?.publicId}
                  handler={() => handleSetConvoWorkflow(spaceWorkflow.publicId)}
                />
              ))}
            </div>
            <div className="flex w-full flex-col gap-2">
              <span className="text-base-10 text-xs font-semibold">Closed</span>
              {spaceWorkflows.closed.map((spaceWorkflow: SpaceWorkflowData) => (
                <WorkflowItem
                  key={spaceWorkflow.publicId}
                  workflow={spaceWorkflow}
                  activeWorkflowPublicId={currentWorkflow?.publicId}
                  handler={() => handleSetConvoWorkflow(spaceWorkflow.publicId)}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

function WorkflowItem({
  workflow,
  activeWorkflowPublicId,
  handler
}: {
  workflow: SpaceWorkflowData;
  activeWorkflowPublicId: TypeId<'spaceWorkflows'> | null;
  handler: () => void;
}) {
  return (
    <Button
      variant={'ghost'}
      className="pl-2"
      asChild
      onClick={handler}>
      <div
        className={cn(
          'bg-base-1 flex w-full cursor-pointer flex-row items-center justify-between gap-8 border',
          workflow.disabled ? 'opacity-70' : null
        )}>
        <div className="flex w-full flex-row items-center gap-4">
          <div
            className={
              'flex size-6 min-h-6 min-w-6 items-center justify-center rounded-sm'
            }
            style={{
              backgroundColor: `var(--${workflow.color}4)`
            }}>
            <Circle
              className={'size-4'}
              weight="regular"
              style={{
                color: `var(--${workflow.color}9)`
              }}
            />
          </div>
          <span className="text-base-11 text-sm font-medium">
            {workflow.name}
          </span>
        </div>
        {activeWorkflowPublicId === workflow.publicId && (
          <Check
            className={'size-4'}
            weight="regular"
            style={{
              color: `var(--${workflow.color}9)`
            }}
          />
        )}
      </div>
    </Button>
  );
}
