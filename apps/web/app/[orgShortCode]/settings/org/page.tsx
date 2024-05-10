'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import {
  Flex,
  Heading,
  Skeleton,
  Button,
  Text,
  TextField
} from '@radix-ui/themes';
import { Camera, Save } from 'lucide-react';
import { api } from '@/lib/trpc';
import { useGlobalStore } from '@/providers/global-store-provider';
import useLoading from '@/hooks/use-loading';
import { cn, generateAvatarUrl } from '@/lib/utils';
import useAwaitableModal from '@/hooks/use-awaitable-modal';
import { AvatarModal } from '@/app/join/profile/avatar-modal';

export default function ProfileComponent() {
  // Added a name here

  const router = useRouter();
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const { data: isAdmin } = api.org.users.members.isOrgMemberAdmin.useQuery({
    orgShortCode
  });

  if (!isAdmin) {
    router.push(`/${[orgShortCode]}/settings`);
  }

  const currentOrg = useGlobalStore((state) => state.currentOrg);

  const [avatarTimestamp, setAvatarTimestamp] = useState<Date | null>(null);
  const [orgNameValue, setOrgNameValue] = useState<string>('');
  const {
    data: initData,
    isLoading: isInitDataLoading,
    refetch: revalidateOrgProfile
  } = api.org.setup.profile.getOrgProfile.useQuery({
    orgShortCode: currentOrg.shortCode
  });

  const avatarUrl = useMemo(() => {
    if (!initData || !avatarTimestamp) return null;
    return generateAvatarUrl({
      publicId: initData.orgProfile.publicId,
      avatarTimestamp,
      size: '5xl'
    });
  }, [avatarTimestamp, initData]);

  const [AvatarModalRoot, avatarModalOpen] = useAwaitableModal(AvatarModal, {
    publicId: currentOrg.publicId
  });

  const {
    error: avatarError,
    loading: avatarLoading,
    run: openModal
  } = useLoading(async () => {
    if (!initData) return;
    const avatarTimestamp = new Date(await avatarModalOpen({}));
    setAvatarTimestamp(avatarTimestamp);
  });

  useEffect(() => {
    if (initData) {
      setOrgNameValue(initData.orgProfile.name ?? '');
    }
    console.log(currentOrg.publicId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initData]);

  const updateOrgProfileApi = api.org.setup.profile.setOrgProfile.useMutation();
  const { loading: saveLoading, run: saveOrgProfile } = useLoading(async () => {
    if (!initData) return;
    await updateOrgProfileApi.mutateAsync({
      orgName: orgNameValue,
      orgShortCode
    });
    await revalidateOrgProfile();
  });

  return (
    <Flex
      className="p-4"
      direction="column"
      gap="3">
      <Heading
        as="h1"
        size="5">
        Organization Profile
      </Heading>
      <Flex
        className="my-4"
        direction="column"
        gap="5">
        <Skeleton loading={isInitDataLoading}>
          <Button
            variant="ghost"
            size="4"
            loading={avatarLoading}
            className="mx-0 aspect-square h-full max-h-[100px] w-full max-w-[100px] cursor-pointer rounded-full p-0"
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
        </Skeleton>
        {avatarError && (
          <Text
            size="2"
            color="red">
            {avatarError.message}
          </Text>
        )}

        <Flex gap="2">
          <Skeleton loading={isInitDataLoading}>
            <label>
              <Text
                as="div"
                size="2"
                mb="1"
                weight="bold"
                className="text-left">
                Organization Name
              </Text>
              <TextField.Root
                value={orgNameValue}
                onChange={(e) => setOrgNameValue(e.target.value)}
              />
            </label>
          </Skeleton>
        </Flex>
        <Flex gap="2">
          <Skeleton loading={isInitDataLoading}>
            <Button
              size="2"
              className="flex-1"
              loading={saveLoading}
              onClick={() =>
                saveOrgProfile({ clearData: true, clearError: true })
              }>
              <Save size={20} />
              Save
            </Button>
          </Skeleton>
        </Flex>
      </Flex>
      <AvatarModalRoot />
    </Flex>
  );
}
