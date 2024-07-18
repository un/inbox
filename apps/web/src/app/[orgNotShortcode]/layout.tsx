'use client';

import Sidebar from './_components/sidebar';
import { GlobalStoreProvider } from '@/src/providers/global-store-provider';
import { buttonVariants } from '@/src/components/shadcn-ui/button';
import { SpinnerGap } from '@phosphor-icons/react';
import Link from 'next/link';
import { platform } from '@/src/lib/trpc';
import { RealtimeProvider } from '@/src/providers/realtime-provider';
import { NewConvoSheet } from './convo/_components/new-convo-sheet';
import { ClaimEmailIdentity } from './_components/claim-email-identity';

export default function Layout({
  children,
  params: { orgShortcode }
}: Readonly<{ children: React.ReactNode; params: { orgShortcode: string } }>) {
  const {
    data: storeData,
    isLoading: storeDataLoading,
    error: storeError
  } = platform.org.store.getStoreData.useQuery({ orgShortcode });

  const { data: hasEmailIdentity } =
    platform.org.mail.emailIdentities.userHasEmailIdentities.useQuery({
      orgShortcode
    });

  if (storeDataLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
        <SpinnerGap className="text-base-11 h-20 w-20 animate-spin" />
      </div>
    );
  }

  if (storeError && !storeDataLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
        <h1 className="text-red-11 text-2xl font-bold">An Error Occurred!</h1>
        <span className="text-red-11 whitespace-pre font-mono text-xl">
          {storeError.message}
        </span>

        <Link
          className={buttonVariants({ variant: 'outline' })}
          href="/">
          Go Back Home
        </Link>
      </div>
    );
  }

  if (!storeDataLoading && !storeData?.currentOrg) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
        <h1 className="text-red-11 text-2xl font-bold">Invalid Org</h1>

        <span className="whitespace-pre text-xl">
          Org with Shortcode{' '}
          <span className="font-mono underline">{orgShortcode}</span> either
          does not exists or you are not part of that org!
        </span>

        <Link
          className={buttonVariants({ variant: 'outline' })}
          href="/">
          Go Back Home
        </Link>
      </div>
    );
  }

  if (storeData) {
    return (
      <GlobalStoreProvider initialState={storeData}>
        <div className="bg-base-1 max-w-svh flex h-full max-h-svh w-full flex-row gap-0 overflow-hidden p-0">
          <div className="h-full max-h-full w-fit">
            <Sidebar />
          </div>
          <div className="flex h-full w-full flex-row p-0">
            <RealtimeProvider>{children}</RealtimeProvider>
          </div>

          <NewConvoSheet />
          {hasEmailIdentity && !hasEmailIdentity.hasIdentity && (
            <ClaimEmailIdentity />
          )}
        </div>
      </GlobalStoreProvider>
    );
  }
}
