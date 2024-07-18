'use client';

import useLoading from '@/src/hooks/use-loading';
import { platform } from '@/src/lib/trpc';
import { generateAvatarUrl, getInitials } from '@/src/lib/utils';
import { Button } from '@/src/components/shadcn-ui/button';
import { Input } from '@/src/components/shadcn-ui/input';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger
} from '@/src/components/shadcn-ui/dialog';
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@/src/components/shadcn-ui/avatar';
import { Users } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function JoinOrgButton({
  hasInviteCode,
  inviteCode: initialInviteCode
}: {
  hasInviteCode: boolean;
  inviteCode?: string;
}) {
  const [inviteCode, setInviteCode] = useState(initialInviteCode ?? '');
  const validateInviteCodeApi =
    platform.useUtils().org.users.invites.validateInvite;
  const joinOrgApi = platform.org.users.invites.redeemInvite.useMutation();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const {
    data: inviteData,
    loading: inviteLoading,
    error: inviteError,
    run: validateInvite,
    clearData: clearInviteData
  } = useLoading(async (signal) => {
    return await validateInviteCodeApi.fetch(
      {
        inviteToken: inviteCode
      },
      { signal }
    );
  });

  const {
    loading: joinLoading,
    error: joinError,
    run: joinOrg
  } = useLoading(async () => {
    const { success, orgShortcode } = await joinOrgApi.mutateAsync({
      inviteToken: inviteCode
    });
    if (success) {
      toast.success(`You have joined ${inviteData?.orgName}!`);
      router.push(`/join/profile?org=${orgShortcode}`);
      setModalOpen(false);
    } else {
      throw new Error('Unknown Error Occurred');
    }
  });

  useEffect(() => {
    if (inviteCode && modalOpen) {
      validateInvite();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen]);

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
          className="flex-1 gap-1"
          variant={hasInviteCode ? 'default' : 'outline'}>
          <Users size={20} />
          <span className="whitespace-nowrap">Join an organization</span>
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogTitle>Join an Organization</DialogTitle>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <div className="text-sm font-bold">Invite Code</div>
            <Input
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value);
                clearInviteData();
              }}
            />
          </label>

          {!inviteData && inviteLoading && (
            <div className="text-muted-foreground text-sm font-bold">
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

          {joinError && !joinLoading && (
            <div className="text-red-10 text-sm font-bold">
              {joinError.message}
            </div>
          )}

          <Button
            loading={inviteLoading || joinLoading}
            disabled={inviteCode.length !== 32}
            className="mt-4"
            onClick={() => {
              if (!inviteData) {
                validateInvite({ clearData: true, clearError: true });
              } else {
                joinOrg({ clearData: true, clearError: true });
              }
            }}>
            {inviteData ? 'Join Organization' : 'Validate Invite Code'}
          </Button>
          <DialogClose asChild>
            <Button
              variant="outline"
              className="w-full">
              Cancel
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
