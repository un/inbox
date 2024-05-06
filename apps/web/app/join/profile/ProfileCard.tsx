'use client';

import { Button, Flex, Text, TextField } from '@radix-ui/themes';
import { AvatarModal } from './avatar-modal';
import { type RouterOutputs, api } from '@/lib/trpc';
import Stepper from '../Stepper';
import { useEffect, useState } from 'react';
import { cn, generateAvatarUrl } from '@/lib/utils';
import useLoading from '@/hooks/use-loading';
import { Camera, CheckCheck, SkipForward } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import useAwaitableModal from '@/hooks/use-awaitable-modal';

type ProfileCardProps = {
  orgData: RouterOutputs['account']['profile']['getOrgMemberProfile'];
  wasInvited: boolean;
};

export default function ProfileCard({ orgData, wasInvited }: ProfileCardProps) {
  const [AvatarModalRoot, openAvatarModal] = useAwaitableModal(AvatarModal, {
    publicId: orgData.profile.publicId
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [firstNameValue, setFirstNameValue] = useState<string>(
    orgData.profile.firstName ?? orgData.profile.handle ?? ''
  );
  const [lastNameValue, setLastNameValue] = useState<string>(
    orgData.profile.lastName ?? ''
  );

  const router = useRouter();

  const {
    error: avatarError,
    loading: avatarLoading,
    run: openModal
  } = useLoading(async () => {
    const avatarTimestamp = new Date(await openAvatarModal({}));
    setAvatarUrl(
      generateAvatarUrl({
        publicId: orgData.profile.publicId,
        avatarTimestamp,
        size: '5xl'
      })
    );
  });

  const updateProfileApi =
    api.account.profile.updateOrgMemberProfile.useMutation();
  const {
    loading: saveLoading,
    error: saveError,
    run: saveProfile
  } = useLoading(async () => {
    await updateProfileApi.mutateAsync({
      fName: firstNameValue,
      lName: lastNameValue,
      blurb: orgData.profile.blurb ?? '',
      handle: orgData.profile.handle ?? '',
      profilePublicId: orgData.profile.publicId,
      title: orgData.profile.title ?? ''
    });
    router.push('/');
  });

  useEffect(() => {
    if (saveError) {
      toast.error(saveError.message);
    }
  }, [saveError]);

  return (
    <Flex
      direction="column"
      gap="3"
      className="mx-auto w-full max-w-[560px] px-4">
      <Text
        mt="3"
        size="4"
        weight="bold">
        {wasInvited ? 'Got time for a profile?' : 'Edit your profile'}
      </Text>
      <Stepper
        step={4}
        total={4}
      />
      <Flex
        direction="column"
        gap="2">
        <Text>
          {wasInvited
            ? 'This profile has been set by the person who invited you. You can have a separate profile for each organization you join.'
            : 'You can have a different profile for each organization you join, lets start with your first one!'}
        </Text>
        <Text className="italic">Skip this step if you like</Text>
      </Flex>

      <Flex
        className="my-4 w-full"
        align="center"
        justify="center"
        direction="column"
        gap="5">
        <Button
          variant="ghost"
          size="4"
          loading={avatarLoading}
          className="aspect-square h-full max-h-[100px] w-full max-w-[100px] cursor-pointer rounded-full p-0"
          onClick={() => {
            openModal({});
          }}>
          <Flex
            className={cn(
              avatarUrl ? 'bg-cover' : 'from-yellow-9 to-red-9',
              'h-full w-full rounded-full bg-gradient-to-r *:opacity-0 *:transition-opacity *:duration-300 *:ease-in-out *:hover:opacity-100'
            )}
            style={{
              backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined
            }}>
            <Flex
              align="center"
              justify="center"
              direction="column"
              className="bg-gray-12/50 h-full w-full rounded-full">
              <Camera size={24} />
              <Text
                size="2"
                weight="bold">
                Upload
              </Text>
            </Flex>
          </Flex>
        </Button>
        {avatarError && (
          <Text
            size="2"
            color="red">
            {avatarError.message}
          </Text>
        )}

        <Flex gap="2">
          <label>
            <Text
              as="div"
              size="2"
              mb="1"
              weight="bold"
              className="text-left">
              First Name
            </Text>
            <TextField.Root
              value={firstNameValue}
              onChange={(e) => setFirstNameValue(e.target.value)}
            />
          </label>
          <label>
            <Text
              as="div"
              size="2"
              mb="1"
              weight="bold"
              className="text-left">
              Last Name
            </Text>
            <TextField.Root
              value={lastNameValue}
              onChange={(e) => setLastNameValue(e.target.value)}
            />
          </label>
        </Flex>
        <Flex
          gap="2"
          className="w-full">
          <Button
            size="2"
            className="flex-1"
            variant="surface"
            onClick={() => router.push('/')}>
            Skip
            <SkipForward size={16} />
          </Button>
          <Button
            size="2"
            className="flex-1"
            disabled={!avatarUrl || !firstNameValue || !lastNameValue}
            loading={saveLoading}
            onClick={() => saveProfile({ clearData: true, clearError: true })}>
            Next
            <CheckCheck size={16} />
          </Button>
        </Flex>
      </Flex>
      <AvatarModalRoot />
    </Flex>
  );
}
