'use client';

import { LoadingSpinner } from '@/src/components/shared/loading-spinner';
import { Button } from '@/src/components/shadcn-ui/button';
import { ProfileCard } from './_components/profile-card';
import { useCookies } from 'next-client-cookies';
import { platform } from '@/src/lib/trpc';
import Link from 'next/link';

export default function Page({
  searchParams
}: {
  searchParams: { org: string };
}) {
  const cookies = useCookies();

  if (!searchParams.org) {
    return (
      <div className="bg-card mx-auto my-4 max-w-[450px] rounded border p-4">
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm font-bold">Missing Org Parameter</div>
          <div className="text-sm">
            If you think this is an error, please contact support.
          </div>
          <Button
            className="mt-4"
            asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const {
    data: orgData,
    error,
    isLoading
  } = platform.account.profile.getOrgMemberProfile.useQuery({
    orgShortcode: searchParams.org
  });

  if (error && !orgData) {
    return (
      <div className="bg-card mx-auto my-4 max-w-[450px] rounded border p-4">
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="text-sm font-bold">Invalid Org Parameter</div>
          <div className="text-red-10 text-sm">
            The Org you are trying to setup a profile for does not exist or you
            do not have permission to access it.
          </div>
          <div className="text-sm">
            If you think this is an error, please contact support.
          </div>
          <Button
            className="mt-2"
            asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const wasInvited = Boolean(cookies.get('un-invite-code'));
  if (isLoading || !orgData) {
    return <LoadingSpinner spinnerSize={32} />;
  }

  return (
    <ProfileCard
      orgData={orgData}
      wasInvited={wasInvited}
    />
  );
}
