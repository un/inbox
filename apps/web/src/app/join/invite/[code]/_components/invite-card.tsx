'use client';

import { datePlus } from '@u22n/utils/ms';
import { Button } from '@/src/components/shadcn-ui/button';
import {
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@/src/components/shadcn-ui/avatar';
import Link from 'next/link';
import { platform, isAuthenticated } from '@/src/lib/trpc';
import useLoading from '@/src/hooks/use-loading';
import { useCookies } from 'next-client-cookies';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { generateAvatarUrl, getInitials } from '@/src/lib/utils';
import { useQuery } from '@tanstack/react-query';

export default function InviteCard({ code }: { code: string }) {
  const inviteDataApi = platform.useUtils().org.users.invites.validateInvite;
  const router = useRouter();
  const cookies = useCookies();

  const {
    data: inviteData,
    error: inviteError,
    loading: inviteLoading,
    run: checkInvite
  } = useLoading(async (signal) => {
    if (code.length !== 32) throw new Error('Invalid Invite code');
    return await inviteDataApi.fetch(
      {
        inviteToken: code
      },
      { signal }
    );
  });

  const { isLoading: signedInLoading, data: signedIn } = useQuery({
    enabled: true,
    queryKey: ['auth', 'status'],
    queryFn: isAuthenticated
  });

  useEffect(() => {
    checkInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (inviteLoading || (!inviteData && !inviteError) || signedInLoading) {
    return (
      <div className="bg-card mx-auto my-4 max-w-[450px] rounded border p-4">
        <div className="text-base-11 text-sm font-bold">
          Checking your Invite...
        </div>
      </div>
    );
  }

  if (inviteError) {
    return (
      <>
        <div className="bg-card mx-auto my-4 max-w-[450px] rounded border p-4">
          <div className="flex flex-col items-center gap-2">
            <div className="text-red-11 text-pretty font-bold">
              You received an Invite for UnInbox, but an error occurred
            </div>
            <div className="text-red-11 text-pretty text-sm">
              {inviteError.message}
            </div>
          </div>
        </div>
        {signedIn ? (
          <Button
            className="mx-auto my-4 max-w-[450px]"
            asChild>
            <Link href="/">Go Back Home</Link>
          </Button>
        ) : (
          <div className="my-4 flex flex-col gap-2">
            <div className="text-sm font-bold">
              You can still create a new UnInbox account
            </div>
            <Button
              className="mx-auto max-w-[450px]"
              asChild>
              <Link href="/join">Create an UnInbox Account</Link>
            </Button>
          </div>
        )}
      </>
    );
  }

  if (inviteData) {
    const orgAvatar = generateAvatarUrl({
      publicId: inviteData.orgPublicId,
      avatarTimestamp: inviteData.orgAvatarTimestamp
    });

    return (
      <>
        <div className="bg-card mx-auto my-4 max-w-[450px] rounded border p-4">
          <div className="flex flex-col items-center gap-2">
            <div className="font-bold">
              You have received an Invite for UnInbox
            </div>
            <div className="mt-4 w-full text-xs font-bold">
              You are invited to
            </div>
            <div className="bg-muted w-full">
              <div className="flex items-center gap-2">
                <Avatar>
                  <AvatarImage
                    src={orgAvatar ?? undefined}
                    className="h-10 w-10 rounded-full"
                  />
                  <AvatarFallback className="h-10 w-10 rounded-full">
                    {getInitials(inviteData.orgName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <div className="text-xs font-bold">{inviteData.orgName}</div>
                  <div className="text-xs">{inviteData.orgShortcode}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {signedIn ? (
          <Button
            className="mx-auto my-4 max-w-[450px]"
            onClick={() => {
              cookies.set('un-invite-code', code, {
                expires: datePlus('1 week')
              });
              router.push('/join/org');
            }}>
            Join as {inviteData.username}
          </Button>
        ) : (
          <Button
            className="mx-auto my-4 max-w-[450px]"
            onClick={() => {
              cookies.set('un-invite-code', code, {
                expires: datePlus('1 week')
              });
              router.push('/join');
            }}>
            Create an UnInbox Account
          </Button>
        )}
      </>
    );
  }
}
