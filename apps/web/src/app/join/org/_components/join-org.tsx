'use client';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/src/components/shadcn-ui/dialog';
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@/src/components/shadcn-ui/avatar';
import { generateAvatarUrl, getInitials } from '@/src/lib/utils';
import { Button } from '@/src/components/shadcn-ui/button';
import { DialogDescription } from '@radix-ui/react-dialog';
import { Input } from '@/src/components/shadcn-ui/input';
import { UsersThree } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { platform } from '@/src/lib/trpc';
import { toast } from 'sonner';

export function JoinOrg({
  hasInviteCode,
  inviteCode: initialInviteCode
}: {
  hasInviteCode: boolean;
  inviteCode?: string;
}) {
  const [inviteCode, setInviteCode] = useState(initialInviteCode ?? '');
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const {
    data: inviteData,
    isLoading: inviteLoading,
    error: inviteError
  } = platform.org.users.invites.validateInvite.useQuery(
    {
      inviteToken: inviteCode
    },
    {
      enabled: inviteCode.length === 32
    }
  );
  const {
    mutateAsync: joinOrg,
    error: joinError,
    isPending: isJoining
  } = platform.org.users.invites.redeemInvite.useMutation({
    onSuccess: ({ success }) => {
      if (success) {
        toast.success(`You have joined ${inviteData?.orgName}!`);
        router.push(`/join/profile?org=${inviteData?.orgShortcode}`);
        setModalOpen(false);
      }
    }
  });

  useEffect(() => {
    if (hasInviteCode) {
      setModalOpen(true);
    }
  }, [hasInviteCode]);

  const orgAvatar = inviteData
    ? generateAvatarUrl({
        publicId: inviteData.orgPublicId,
        avatarTimestamp: inviteData.orgAvatarTimestamp
      })
    : null;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !hasInviteCode) {
          setInviteCode('');
        }
        setModalOpen(open);
      }}
      open={modalOpen}>
      <DialogTrigger asChild>
        <Button
          className="flex-1"
          variant={hasInviteCode ? 'default' : 'ghost'}>
          Join Existing organization
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader className="sr-only">
          <DialogTitle>Join an Organization</DialogTitle>
          <DialogDescription>
            Enter the invite code you received to join an organization
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <div className="text-sm font-bold">Invite Code</div>
            <Input
              label="Invite Code"
              inputSize="lg"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              leadingSlot={UsersThree}
            />
          </label>

          {!inviteData && inviteLoading && (
            <div className="text-base-11 text-sm font-bold">
              Validating Invite Code...
            </div>
          )}

          {inviteData && !inviteLoading && (
            <>
              <div className="text-sm font-bold">You are invited to</div>
              <div className="bg-card rounded border p-4">
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
                    <div className="text-xs font-bold">
                      {inviteData.orgName}
                    </div>
                    <div className="text-xs">{inviteData.orgShortcode}</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {inviteError && !inviteLoading && (
            <div className="text-red-10 text-sm font-bold">
              {inviteError.message}
            </div>
          )}

          {joinError && !isJoining && (
            <div className="text-red-10 text-sm font-bold">
              {joinError.message}
            </div>
          )}

          <div className="flex gap-2">
            <DialogClose asChild>
              <Button
                variant="outline"
                className="flex-1">
                Cancel
              </Button>
            </DialogClose>
            <Button
              loading={inviteLoading || isJoining}
              disabled={inviteCode.length !== 32}
              className="flex-1"
              onClick={async () => {
                if (!inviteData) return;
                await joinOrg({ inviteToken: inviteCode });
              }}>
              Join Organization
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
