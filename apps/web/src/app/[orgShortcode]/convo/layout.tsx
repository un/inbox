'use client';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator
} from '@/src/components/shadcn-ui/breadcrumb';
import {
  CaretRight,
  ChatCircle,
  // Eye,
  // EyeSlash,
  Minus,
  SpinnerGap,
  SquaresFour,
  Trash
} from '@phosphor-icons/react';
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
  // type Dispatch,
  type ReactNode,
  // type SetStateAction,
  useMemo
} from 'react';
import {
  convoListSelecting,
  convoListSelection,
  showNewConvoPanel
} from './atoms';
import { DeleteMultipleConvosModal } from './_components/delete-convos-modal';
import { OrgIssueAlerts } from './_components/org-issue-alerts';
import { Button } from '@/src/components/shadcn-ui/button';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useIsMobile } from '@/src/hooks/use-is-mobile';
import { ConvoList } from './_components/convo-list';
import { usePathname } from 'next/navigation';
import { platform } from '@/src/lib/trpc';
import { cn } from '@/src/lib/utils';
import { ms } from '@u22n/utils/ms';
import Link from 'next/link';

function ChildrenWithOrgIssues({ children }: { children: ReactNode }) {
  const orgShortcode = useOrgShortcode();
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

function ConvoNavHeader() {
  const orgShortcode = useOrgShortcode();
  const spaceShortcode = useSpaceShortcode();
  const { scopedUrl } = useOrgScopedRouter();

  // const { mutate: hideConvo } = platform.convos.hideConvo.useMutation({
  //   onSettled: () => {
  //     setSelection([]);
  //   }
  // });

  const spaceDisplayPropertiesQuery =
    platform.spaces.getSpaceDisplayProperties.useQuery({
      orgShortcode: orgShortcode,
      spaceShortcode: spaceShortcode ?? 'all'
    });

  const {
    data: spaceDisplayProperties,
    isLoading: spaceDisplayPropertiesLoading,
    error: spaceDisplayPropertiesError
  } = spaceDisplayPropertiesQuery;

  const pathname = usePathname();
  const setNewPanelOpen = useSetAtom(showNewConvoPanel);
  const selectingMode = useAtomValue(convoListSelecting);
  const [selection, setSelection] = useAtom(convoListSelection);

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
            {/* <Button
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
            </Button> */}
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
                  {spaceDisplayPropertiesLoading ? (
                    <SpinnerGap
                      className="size-4 animate-spin"
                      size={16}
                    />
                  ) : spaceDisplayPropertiesError ? (
                    <span>Unnamed Space</span>
                  ) : (
                    <div className="flex w-full max-w-full flex-row items-center gap-2 truncate p-1">
                      <div
                        className="flex h-6 min-h-6 w-6 min-w-6 items-center justify-center rounded-sm"
                        style={{
                          backgroundColor: `var(--${spaceDisplayProperties?.space?.color ?? 'base'}4)`,
                          color: `var(--${spaceDisplayProperties?.space?.color ?? 'base'}9)`
                        }}>
                        <SquaresFour
                          className="h-4 w-4"
                          weight="bold"
                        />
                      </div>
                      <span className="text-slate-11 h-full truncate">
                        {spaceDisplayProperties?.space?.name ?? 'Unnamed Space'}
                      </span>
                    </div>
                  )}
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
                    <Link href={scopedUrl('/convo', true)}>
                      Conversations
                      {/* {showHidden ? 'Hidden Conversations' : 'Conversations'} */}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className={'flex w-fit flex-row gap-2'}>
            {/* <Button
              variant="outline"
              size="icon"
              onClick={() => setShowHidden(!showHidden)}>
              {showHidden ? <EyeSlash /> : <Eye />}
            </Button> */}
            {!isInConvo ? (
              <Button
                variant="default"
                asChild
                size="xs">
                <Link href={scopedUrl('/convo/new', true)}>New</Link>
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

// function ConvoNav({
//   showHidden,
//   setShowHidden
// }: {
//   showHidden: boolean;
//   setShowHidden: Dispatch<SetStateAction<boolean>>;
// }) {
//   return (
//     <div className="flex h-full w-full min-w-96 flex-col gap-2 p-2 pt-3 xl:col-span-1 xl:min-w-80">
//       <ConvoNavHeader
//         showHidden={showHidden}
//         setShowHidden={setShowHidden}
//       />
//       <OrgConvoList hidden={showHidden} />
//     </div>
//   );
// }

function ConvoLayoutWrapper({
  children,
  convoList
  // showHidden,
  // setShowHidden
}: {
  children: React.ReactNode;
  convoList: React.ReactNode;
  // showHidden: boolean;
  // setShowHidden: Dispatch<SetStateAction<boolean>>;
}) {
  const isMobile = useIsMobile();
  const convoId = useCurrentConvoId();
  const pathname = usePathname();
  const isWelcomeMessage = pathname.endsWith('/convo/welcome');

  const isInConvo = Boolean(convoId) || isWelcomeMessage;
  const isNewPage = pathname.endsWith('/convo/new');

  return (
    <div
      className={cn(
        'flex h-full w-full flex-row gap-0 xl:grid xl:grid-cols-3'
      )}>
      {!isMobile && (
        <>
          <div className="flex h-full w-full min-w-96 flex-col gap-2 p-2 pt-3 xl:col-span-1 xl:min-w-80">
            <ConvoNavHeader
            // showHidden={showHidden}
            // setShowHidden={setShowHidden}
            />
            {convoList}
          </div>
          <ChildrenWithOrgIssues>{children}</ChildrenWithOrgIssues>
        </>
      )}

      {isMobile &&
        (!isInConvo && !isNewPage ? (
          <div className="flex h-full w-full min-w-96 flex-col gap-2 p-2 pt-3 xl:col-span-1 xl:min-w-80">
            <ConvoNavHeader
            // showHidden={showHidden}
            // setShowHidden={setShowHidden}
            />
            {convoList}
          </div>
        ) : (
          <ChildrenWithOrgIssues>{children}</ChildrenWithOrgIssues>
        ))}
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  // const [showHidden, setShowHidden] = useState(false);
  const convoList = useMemo(
    () => (
      <ConvoList
      //  hidden={showHidden}
      />
    ),
    // [showHidden]
    []
  );

  return (
    <ConvoLayoutWrapper
      convoList={convoList}
      // showHidden={showHidden}
      // setShowHidden={setShowHidden}
    >
      {children}
    </ConvoLayoutWrapper>
  );
}
