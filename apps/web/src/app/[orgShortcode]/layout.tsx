'use client';

import {
  useAddSingleConvo$Cache,
  useDeleteConvo$Cache,
  // useToggleConvoHidden$Cache,
  useUpdateConvoMessageList$Cache
} from './convo/utils';
import { useCurrentConvoId, useOrgShortcode } from '@/src/hooks/use-params';
// import { ClaimEmailIdentity } from './_components/claim-email-identity';
import { RealtimeProvider } from '@/src/providers/realtime-provider';
import { NewConvoSheet } from './convo/_components/new-convo-sheet';
import { useRealtime } from '@/src/providers/realtime-provider';
import { Button } from '@/src/components/shadcn-ui/button';
import { useIsMobile } from '@/src/hooks/use-is-mobile';
import { BottomNav } from './_components/bottom-nav';
import { SpinnerGap } from '@phosphor-icons/react';
import { usePrevious } from '@uidotdev/usehooks';
import { memo, useEffect, useMemo } from 'react';
import Sidebar from './_components/sidebar';
import { platform } from '@/src/lib/trpc';
import { cn } from '@/src/lib/utils';
import { ms } from '@u22n/utils/ms';
import Link from 'next/link';

function UnWrappedLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const orgShortcode = useOrgShortcode();
  const convoId = useCurrentConvoId();
  const isMobile = useIsMobile();

  const { data: access, isLoading: accessLoading } =
    platform.org.store.hasAccessToOrg.useQuery(
      {
        orgShortcode
      },
      {
        staleTime: ms('1 hour'),
        refetchOnWindowFocus: true
      }
    );

  //! TODO: enable this later
  // const { data: hasEmailIdentity } =
  //   platform.org.mail.emailIdentities.userHasEmailIdentities.useQuery(
  //     {
  //       orgShortcode
  //     },
  //     {
  //       staleTime: ms('1 hour'),
  //       enabled: !!access?.hasAccess
  //     }
  //   );

  if (accessLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
        <SpinnerGap className="text-base-11 h-20 w-20 animate-spin" />
        <span className="text-slate-11 font-bold">
          <span className="font-display text-slate-12 text-bold">UnInbox</span>{' '}
          is Loading...
        </span>
      </div>
    );
  }

  if (!access?.hasAccess) {
    return (
      <div className="mx-auto flex h-full w-full max-w-[500px] flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-2xl font-bold">Not Found!</h1>
        <span className="text-base-10 text-balance text-center text-sm font-bold">
          The org you are trying to access does not exist or you do not have
          access to it.
        </span>
        <Button asChild>
          <Link href="/">Take me home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('bg-base-1 flex h-full gap-0', isMobile && 'flex-col')}>
      {!isMobile && <Sidebar />}
      <div className="min-w-0 flex-1 grow overflow-x-auto">{children}</div>
      {isMobile && !convoId && <BottomNav />}
      {!isMobile && <NewConvoSheet />}
      {/* {hasEmailIdentity && !hasEmailIdentity.hasIdentity && (
          <ClaimEmailIdentity />
        )} */}
    </div>
  );
}

const RealtimeHandlers = memo(function RealtimeHandler() {
  const client = useRealtime();
  const orgShortcode = useOrgShortcode();
  const addConvo = useAddSingleConvo$Cache();
  // const toggleConvoHidden = useToggleConvoHidden$Cache();
  const deleteConvo = useDeleteConvo$Cache();
  const updateConvoMessageList = useUpdateConvoMessageList$Cache();
  const utils = platform.useUtils();
  const adminIssuesCache = utils.org.store.getOrgIssues;
  const getConvoSpaceWorkflows = utils.convos.getConvoSpaceWorkflows;

  const { data: spacesData } = platform.spaces.getOrgMemberSpaces.useQuery(
    {
      orgShortcode
    },
    {
      staleTime: ms('1 hour')
    }
  );
  const previousSpaces = usePrevious(spacesData?.spaces);

  // Root subscribers
  useEffect(() => {
    const unsubscribe = client.subscribe('admin:issue:refresh', () =>
      adminIssuesCache.refetch()
    );
    return () => unsubscribe();
  }, [client, adminIssuesCache]);

  // Spaces subscribers
  useEffect(() => {
    if (!spacesData?.spaces) return;

    spacesData.spaces.map((space) => {
      const { listen, unsubscribe } = client.subscribeChannel(
        `private-space-${space.publicId}`
      );

      const spaceShortcode = space.personalSpace ? 'personal' : space.shortcode;

      listen('convo:new', ({ publicId }) => {
        return addConvo({ convoPublicId: publicId, spaceShortcode });
      });
      // listen('convo:hidden', ({ publicId, hidden }) =>
      //   toggleConvoHidden({ convoId: publicId, spaceShortcode, hide: hidden })
      // );
      listen('convo:deleted', ({ publicId }) =>
        deleteConvo({ convoPublicId: publicId, spaceShortcode })
      );
      listen('convo:entry:new', ({ convoPublicId, convoEntryPublicId }) =>
        updateConvoMessageList({
          convoId: convoPublicId,
          convoEntryPublicId,
          spaceShortcode
        })
      );

      listen('convo:workflow:update', ({ convoPublicId, orgShortcode }) =>
        getConvoSpaceWorkflows.invalidate({ convoPublicId, orgShortcode })
      );
      return unsubscribe;
    });
  }, [
    addConvo,
    client,
    deleteConvo,
    getConvoSpaceWorkflows,
    previousSpaces,
    spacesData?.spaces,
    updateConvoMessageList
  ]);

  return null;
});

export default function Layout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const realtime = useMemo(() => <RealtimeHandlers />, []);
  return (
    <RealtimeProvider>
      {realtime}
      <UnWrappedLayout>{children}</UnWrappedLayout>
    </RealtimeProvider>
  );
}
