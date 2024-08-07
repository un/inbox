'use client';

import { GlobalStoreProvider } from '@/src/providers/global-store-provider';
import { ClaimEmailIdentity } from './_components/claim-email-identity';
import { RealtimeProvider } from '@/src/providers/realtime-provider';
import { NewConvoSheet } from './convo/_components/new-convo-sheet';
import { Button } from '@/src/components/shadcn-ui/button';
import { useIsMobile } from '@/src/hooks/use-is-mobile';
import { BottomNav } from './_components/bottom-nav';
import { SpinnerGap } from '@phosphor-icons/react';
import Sidebar from './_components/sidebar';
import { platform } from '@/src/lib/trpc';
import { cn } from '@/src/lib/utils';
import Link from 'next/link';

export default function Layout({
  children,
  params: { orgShortcode }
}: Readonly<{ children: React.ReactNode; params: { orgShortcode: string } }>) {
  const {
    data: storeData,
    isLoading: storeDataLoading,
    error: storeError
  } = platform.org.store.getStoreData.useQuery(
    { orgShortcode },
    { retry: 3, retryDelay: (attemptIndex) => attemptIndex * 5000 }
  );

  const isMobile = useIsMobile();

  const { data: hasEmailIdentity } =
    platform.org.mail.emailIdentities.userHasEmailIdentities.useQuery({
      orgShortcode
    });

  if (storeDataLoading) {
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

  if (storeError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
        <h1 className="text-red-11 text-2xl font-bold">An Error Occurred!</h1>
        <span className="text-red-11 whitespace-pre font-mono text-xl">
          {storeError.message}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            asChild>
            <Link href="/">Go Back</Link>
          </Button>
          <Button
            className="flex-1"
            onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!storeData?.currentOrg) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
        <h1 className="text-red-11 text-2xl font-bold">Invalid Org</h1>

        <span className="whitespace-pre text-xl">
          Org with Shortcode{' '}
          <span className="font-mono underline">{orgShortcode}</span> either
          does not exists or you are not part of that org!
        </span>

        <Button
          variant="outline"
          className="flex-1"
          asChild>
          <Link href="/">Go Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <GlobalStoreProvider initialState={storeData}>
      <RealtimeProvider>
        <div
          className={cn('bg-base-1 flex h-full gap-0', isMobile && 'flex-col')}>
          {!isMobile && <Sidebar />}
          <div className="min-w-0 flex-1 grow overflow-x-auto">{children}</div>

          {isMobile && <BottomNav />}
          {!isMobile && <NewConvoSheet />}
          {hasEmailIdentity && !hasEmailIdentity.hasIdentity && (
            <ClaimEmailIdentity />
          )}
        </div>
      </RealtimeProvider>
    </GlobalStoreProvider>
  );
}
