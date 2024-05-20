'use client';

import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import {
  Flex,
  Heading,
  Button,
  Text,
  TextField,
  Spinner
} from '@radix-ui/themes';
import { Camera, FloppyDisk } from '@phosphor-icons/react';
import { api } from '@/src/lib/trpc';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import useLoading from '@/src/hooks/use-loading';
import { cn, generateAvatarUrl } from '@/src/lib/utils';
import useAwaitableModal from '@/src/hooks/use-awaitable-modal';
import { AvatarModal } from '@/src/components/shared/avatar-modal';

export default function ProfileComponent() {
  const router = useRouter();
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const currentOrg = useGlobalStore((state) => state.currentOrg);
  const updateOrg = useGlobalStore((state) => state.updateOrg);

  const { data: isAdmin, isLoading: adminLoading } =
    api.org.users.members.isOrgMemberAdmin.useQuery({
      orgShortCode
    });

  const [orgNameValue, setOrgNameValue] = useState<string>(currentOrg.name);

  const avatarUrl = useMemo(() => {
    return generateAvatarUrl({
      publicId: currentOrg.publicId,
      avatarTimestamp: currentOrg.avatarTimestamp,
      size: '5xl'
    });
  }, [currentOrg.publicId, currentOrg.avatarTimestamp]);

  const [AvatarModalRoot, avatarModalOpen] = useAwaitableModal(AvatarModal, {
    publicId: currentOrg.publicId
  });

  const {
    error: avatarError,
    loading: avatarLoading,
    run: openModal
  } = useLoading(async () => {
    const avatarTimestamp = new Date(
      await avatarModalOpen({
        publicId: currentOrg.publicId
      })
    );
    updateOrg(orgShortCode, { avatarTimestamp });
  });

  const updateOrgProfileApi = api.org.setup.profile.setOrgProfile.useMutation();
  const { loading: saveLoading, run: saveOrgProfile } = useLoading(async () => {
    await updateOrgProfileApi.mutateAsync({
      orgName: orgNameValue,
      orgShortCode
    });
    updateOrg(orgShortCode, { name: orgNameValue });
  });

  if (adminLoading) {
    return (
      <Flex
        align="center"
        justify="center"
        className="h-fit">
        <Text
          weight="bold"
          className="flex items-center gap-2 p-4">
          <Spinner loading /> Loading...
        </Text>
      </Flex>
    );
  }

  if (!adminLoading && !isAdmin) {
    router.push(`/${orgShortCode}/settings`);
  }

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
              Organization Name
            </Text>
            <TextField.Root
              value={orgNameValue}
              onChange={(e) => setOrgNameValue(e.target.value)}
            />
          </label>
        </Flex>
        <Flex gap="2">
          <Button
            size="2"
            className="flex-1"
            loading={saveLoading}
            onClick={() =>
              saveOrgProfile({ clearData: true, clearError: true })
            }>
            <FloppyDisk size={20} />
            Save
          </Button>
        </Flex>
      </Flex>
      <AvatarModalRoot />
    </Flex>
  );
}
