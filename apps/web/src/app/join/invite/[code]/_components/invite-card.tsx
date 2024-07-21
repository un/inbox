'use client';

import {
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@/src/components/shadcn-ui/avatar';
import { generateAvatarUrl, getInitials } from '@/src/lib/utils';
import { Button } from '@/src/components/shadcn-ui/button';
import { platform, isAuthenticated } from '@/src/lib/trpc';
import { SpinnerGap } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useCookies } from 'next-client-cookies';
import { useRouter } from 'next/navigation';
import { datePlus } from '@u22n/utils/ms';
import Link from 'next/link';

export default function InviteCard({ code }: { code: string }) {
  const router = useRouter();
  const cookies = useCookies();

  const {
    data: inviteData,
    error: inviteError,
    isLoading: inviteLoading
  } = platform.org.users.invites.validateInvite.useQuery(
    {
      inviteToken: code
    },
    {
      enabled: code.length === 32
    }
  );

  const { isLoading: signedInLoading, data: signedIn } = useQuery({
    enabled: true,
    queryKey: ['auth', 'status'],
    queryFn: isAuthenticated
  });

  if (inviteLoading || signedInLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="text-base-11 flex items-center justify-center gap-2 text-sm font-bold">
          <SpinnerGap className="size-4 animate-spin" />
          <span>Checking your Invite...</span>
        </div>
      </div>
    );
  }

  if (inviteError ?? code.length !== 32) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
        <div className="mx-auto rounded p-4">
          <div className="flex flex-col items-center gap-2">
            <div className="text-red-11 text-pretty font-bold">
              You received an Invite for UnInbox, but an error occurred
            </div>
            <div className="text-red-11 text-pretty text-sm">
              {inviteError?.message ?? 'Invalid Invite code'}
            </div>
          </div>
        </div>
        {signedIn ? (
          <Button
            className="w-fit"
            asChild>
            <Link href="/">Go Back Home</Link>
          </Button>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="text-sm font-bold">
              You can still create a new UnInbox account
            </div>
            <Button
              className="w-fit"
              asChild>
              <Link href="/join">Create an UnInbox Account</Link>
            </Button>
          </div>
        )}
      </div>
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
