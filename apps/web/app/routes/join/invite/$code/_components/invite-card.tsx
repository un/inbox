import {
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@/components/shadcn-ui/avatar';
import { generateAvatarUrl, getInitials } from '@/lib/utils';
import { Button } from '@/components/shadcn-ui/button';
import { platform, isAuthenticated } from '@/lib/trpc';
import { SpinnerGap } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@remix-run/react';
import { datePlus } from '@u22n/utils/ms';
import { Link } from '@remix-run/react';
import Cookies from 'js-cookie';

export function InviteCard({ code }: { code?: string }) {
  const navigate = useNavigate();

  const {
    data: inviteData,
    error: inviteError,
    isLoading: inviteLoading
  } = platform.org.users.invites.validateInvite.useQuery(
    {
      inviteToken: code ?? ''
    },
    {
      enabled: code?.length === 32
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

  if (inviteError ?? code?.length !== 32) {
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
            <Link
              to="/"
              reloadDocument>
              Go Back Home
            </Link>
          </Button>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="text-sm font-bold">
              You can still create a new UnInbox account
            </div>
            <Button
              className="w-fit"
              asChild>
              <Link to="/join">Create an UnInbox Account</Link>
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
              Cookies.set('un-invite-code', code, {
                expires: datePlus('1 week')
              });
              navigate('/join/org');
            }}>
            Join as {inviteData.username}
          </Button>
        ) : (
          <Button
            className="mx-auto my-4 max-w-[450px]"
            onClick={() => {
              Cookies.set('un-invite-code', code, {
                expires: datePlus('1 week')
              });
              navigate('/join');
            }}>
            Create an UnInbox Account
          </Button>
        )}
      </>
    );
  }
}
