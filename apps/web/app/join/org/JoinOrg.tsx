'use client';

import useLoading from '@/hooks/use-loading';
import { api } from '@/lib/trpc';
import { generateAvatarUrl, getInitials } from '@/lib/utils';
import {
  Button,
  Text,
  Dialog,
  Flex,
  TextField,
  Spinner,
  Card,
  Avatar
} from '@radix-ui/themes';
import { Users } from 'lucide-react';
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
  const validateInviteCodeApi = api.useUtils().org.users.invites.validateInvite;
  const joinOrgApi = api.org.users.invites.redeemInvite.useMutation();
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
    const { success, orgShortCode } = await joinOrgApi.mutateAsync({
      inviteToken: inviteCode
    });
    if (success) {
      toast.success(`You have joined ${inviteData?.orgName}!`);
      router.push(`/join/profile?org=${orgShortCode}`);
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
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open && !hasInviteCode) {
          setInviteCode('');
        }
        setModalOpen(open);
      }}
      open={modalOpen}>
      <Dialog.Trigger>
        <Button
          size="3"
          className="flex-1"
          variant={hasInviteCode ? 'solid' : 'surface'}>
          <Users size={20} />
          <Text className="whitespace-nowrap">Join an organization</Text>
        </Button>
      </Dialog.Trigger>
      <Dialog.Content className="w-full max-w-96 p-4">
        <Dialog.Title className="mx-auto w-fit py-4">
          Join an Organization
        </Dialog.Title>
        <Flex
          direction="column"
          gap="4">
          <label>
            <Text
              as="div"
              size="2"
              mb="1"
              weight="bold">
              Invite Code
            </Text>
            <TextField.Root
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value);
                clearInviteData();
              }}
            />
          </label>

          {!inviteData && inviteLoading && (
            <Flex
              align="center"
              gap="1">
              <Spinner loading />
              <Text
                weight="bold"
                size="2">
                Validating Invite Code...
              </Text>
            </Flex>
          )}

          {inviteData && !inviteLoading && (
            <>
              <Text
                size="2"
                weight="bold">
                You are invited to
              </Text>
              <Card>
                <Flex
                  align="center"
                  gap="2">
                  <Avatar
                    src={orgAvatar ?? undefined}
                    fallback={getInitials(inviteData.orgName)}
                    className="h-10 w-10 rounded-full"
                  />
                  <Flex direction="column">
                    <Text
                      weight="bold"
                      size="2">
                      {inviteData.orgName}
                    </Text>
                    <Text size="2">{inviteData.orgShortCode}</Text>
                  </Flex>
                </Flex>
              </Card>
            </>
          )}

          {inviteError && !inviteLoading && (
            <Text
              color="red"
              weight="bold"
              size="2">
              {inviteError.message}
            </Text>
          )}

          {joinError && !joinLoading && (
            <Text
              color="red"
              weight="bold"
              size="2">
              {joinError.message}
            </Text>
          )}

          <Button
            loading={inviteLoading || joinLoading}
            size="2"
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
          <Dialog.Close>
            <Button
              variant="soft"
              color="gray"
              size="2">
              Cancel
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
