'use client';

import { Button } from '@/src/components/shadcn-ui/button';
import Link from 'next/link';
import { ProfileCard } from './_components/profile-card';
import { platform } from '@/src/lib/trpc';
import { useCookies } from 'next-client-cookies';

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

  const { data: orgData, isLoading: orgDataLoading } =
    platform.account.profile.getOrgMemberProfile.useQuery({
      orgShortcode: searchParams.org
    });

  if (orgDataLoading) {
    return (
      <div className="bg-card mx-auto my-4 max-w-[450px] rounded border p-4">
        <div className="flex items-center justify-center gap-2">
          <div className="text-muted-foreground text-sm font-bold">
            Loading Profile
          </div>
        </div>
      </div>
    );
  }

  if (!orgData) {
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
  return (
    <ProfileCard
      orgData={orgData}
      wasInvited={wasInvited}
    />
  );
}
