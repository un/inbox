'use client';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator
} from '@/src/components/shadcn-ui/breadcrumb';
import {
  useAddSingleConvo$Cache,
  useDeleteConvo$Cache,
  useToggleConvoHidden$Cache,
  useUpdateConvoMessageList$Cache
} from './utils';
import {
  CaretRight,
  ChatCircle,
  Eye,
  EyeSlash,
  Minus,
  Trash,
  User
} from '@phosphor-icons/react';
import {
  convoListSelecting,
  convoListSelection,
  shiftKeyPressed,
  showNewConvoPanel
} from './atoms';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/src/components/shadcn-ui/tooltip';
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useEffect
} from 'react';
import { DeleteMultipleConvosModal } from './_components/delete-convos-modal';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { useRealtime } from '@/src/providers/realtime-provider';
import { OrgIssueAlerts } from './_components/org-issue-alerts';
import { Button } from '@/src/components/shadcn-ui/button';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useParams, usePathname } from 'next/navigation';
import { useIsMobile } from '@/src/hooks/use-is-mobile';
import { ConvoList } from './_components/convo-list';
import { platform } from '@/src/lib/trpc';
import { cn } from '@/src/lib/utils';
import { ms } from '@u22n/utils/ms';
import { useState } from 'react';
import Link from 'next/link';

function ChildrenWithOrgIssues({ children }: { children: ReactNode }) {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const { data: issueData } = platform.org.store.getOrgIssues.useQuery(
    {
      orgShortcode
    },
    {
      staleTime: ms('1 hour')
    }
  );
  return (
    <div className="border-base-5 flex w-full min-w-0 flex-col justify-stretch rounded-2xl border-l xl:col-span-2">
      {issueData && issueData.issues.length > 0 && (
        <OrgIssueAlerts issues={issueData.issues} />
      )}
      {children}
    </div>
  );
}

function ConvoNavHeader({
  showHidden,
  setShowHidden
}: {
  showHidden: boolean;
  setShowHidden: Dispatch<SetStateAction<boolean>>;
}) {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  // const isMobile = useIsMobile();

  const { mutate: hideConvo } = platform.convos.hideConvo.useMutation({
    onSettled: () => {
      setSelection([]);
    }
  });

  const adminIssuesCache = platform.useUtils().org.store.getOrgIssues;

  const addConvo = useAddSingleConvo$Cache();
  const toggleConvoHidden = useToggleConvoHidden$Cache();
  const deleteConvo = useDeleteConvo$Cache();
  const updateConvoMessageList = useUpdateConvoMessageList$Cache();
  const client = useRealtime();

  const pathname = usePathname();
  const setNewPanelOpen = useSetAtom(showNewConvoPanel);
  const selectingMode = useAtomValue(convoListSelecting);
  const [selection, setSelection] = useAtom(convoListSelection);
  const setShiftKeyPressed = useSetAtom(shiftKeyPressed);

  useEffect(() => {
    client.on('convo:new', ({ publicId }) => addConvo(publicId));
    client.on('convo:hidden', ({ publicId, hidden }) =>
      toggleConvoHidden(publicId, hidden)
    );
    client.on('convo:deleted', ({ publicId }) => deleteConvo(publicId));
    client.on('convo:entry:new', ({ convoPublicId, convoEntryPublicId }) =>
      updateConvoMessageList(convoPublicId, convoEntryPublicId)
    );
    client.on(
      'admin:issue:refresh',
      async () => void adminIssuesCache.refetch()
    );

    return () => {
      client.off('convo:new');
      client.off('convo:hidden');
      client.off('convo:deleted');
      client.off('convo:entry:new');
      client.off('admin:issue:refresh');
    };
  }, [
    client,
    addConvo,
    toggleConvoHidden,
    deleteConvo,
    updateConvoMessageList,
    adminIssuesCache
  ]);

  useEffect(() => {
    const globalModifierListener = (e: Event) => {
      if (e instanceof KeyboardEvent) {
        if (e.key !== 'Shift') return;
        setShiftKeyPressed(e.shiftKey);
      } else {
        setShiftKeyPressed(false);
      }
    };
    window.addEventListener('keydown', globalModifierListener);
    window.addEventListener('keyup', globalModifierListener);
    window.addEventListener('focus', globalModifierListener);
    window.addEventListener('blur', globalModifierListener);
    return () => {
      window.removeEventListener('keydown', globalModifierListener);
      window.removeEventListener('keyup', globalModifierListener);
      window.removeEventListener('focus', globalModifierListener);
      window.removeEventListener('blur', globalModifierListener);
    };
  }, [setShiftKeyPressed]);

  const isInConvo =
    !pathname.endsWith('/convo') && !pathname.endsWith('/convo/new');

  return (
    <>
      {selectingMode ? (
        <div className="flex h-[47px] items-center justify-between p-2.5">
          <div className="flex items-center justify-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="bg-accent-1 rounded-lg"
                  onClick={() => setSelection([])}>
                  <Minus
                    size={12}
                    weight="bold"
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Unselect all</TooltipContent>
            </Tooltip>
            <span className="text-base-11 text-sm font-semibold">
              {`${selection.length} convo${selection.length > 1 ? 's' : ''} selected`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DeleteMultipleConvosModal>
              <Button
                variant="outline"
                size="icon-sm">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Trash />
                  </TooltipTrigger>
                  <TooltipContent>Delete all selected</TooltipContent>
                </Tooltip>
              </Button>
            </DeleteMultipleConvosModal>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() =>
                hideConvo({
                  orgShortcode,
                  convoPublicId: selection,
                  unhide: showHidden
                })
              }>
              <Tooltip>
                <TooltipTrigger asChild>
                  {!showHidden ? <EyeSlash /> : <Eye />}
                </TooltipTrigger>
                <TooltipContent>
                  {!showHidden ? 'Hide all selected' : 'Unhide all selected'}
                </TooltipContent>
              </Tooltip>
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={
            'flex w-full flex-row items-center justify-between gap-2 overflow-visible p-2.5 pt-0'
          }>
          <div className="flex h-fit w-full grow flex-row gap-2 overflow-visible">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <div className="bg-blue-5 text-blue-9 flex h-6 w-6 items-center justify-center rounded-sm">
                    <User
                      weight="bold"
                      className="h-4 w-4"
                    />
                  </div>
                  <BreadcrumbEllipsis />
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <CaretRight />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <div className="bg-base-5 text-base-9 flex h-6 w-6 items-center justify-center rounded-sm">
                    <ChatCircle
                      weight="bold"
                      className="h-4 w-4"
                    />
                  </div>
                  <BreadcrumbLink asChild>
                    <Link href={`/${orgShortcode}/convo`}>
                      {showHidden ? 'Hidden Conversations' : 'Conversations'}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className={'flex w-fit flex-row gap-2'}>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowHidden(!showHidden)}>
              {showHidden ? <EyeSlash /> : <Eye />}
            </Button>
            {!isInConvo ? (
              <Button
                variant="default"
                asChild
                size="xs">
                <Link href={`/${orgShortcode}/convo/new`}>New</Link>
              </Button>
            ) : (
              <Button
                variant="default"
                size="xs"
                onClick={() => isInConvo && setNewPanelOpen(true)}>
                <span>New</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ConvoNav({
  showHidden,
  setShowHidden
}: {
  showHidden: boolean;
  setShowHidden: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <div className="flex h-full w-full min-w-96 flex-col gap-2 p-2 pt-3 xl:col-span-1 xl:min-w-80">
      <ConvoNavHeader
        showHidden={showHidden}
        setShowHidden={setShowHidden}
      />
      <ConvoList hidden={showHidden} />
    </div>
  );
}

export default function Layout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const isMobile = useIsMobile();

  const params = useParams();
  const pathname = usePathname();
  const [showHidden, setShowHidden] = useState(false);

  const isInConvo = !!params.convoId;
  const isNewPage = pathname.endsWith('/convo/new');

  return (
    <div
      className={cn(
        'flex h-full w-full flex-row gap-0 xl:grid xl:grid-cols-3'
      )}>
      {!isMobile && (
        <>
          <ConvoNav
            setShowHidden={setShowHidden}
            showHidden={showHidden}
          />
          <ChildrenWithOrgIssues>{children}</ChildrenWithOrgIssues>
        </>
      )}

      {isMobile &&
        (!isInConvo && !isNewPage ? (
          <ConvoNav
            setShowHidden={setShowHidden}
            showHidden={showHidden}
          />
        ) : (
          <ChildrenWithOrgIssues>{children}</ChildrenWithOrgIssues>
        ))}
    </div>
  );
}
