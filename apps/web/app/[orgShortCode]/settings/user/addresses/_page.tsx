'use client';

import {
  Skeleton,
  Button,
  Flex,
  Heading,
  Text,
  TextField
} from '@radix-ui/themes';
import { DataTable } from './table';
import { useAvatarModal } from '@/app/join/profile/avatar-modal';
import { Camera } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { cn, generateAvatarUrl } from '@/lib/utils';
import useLoading from '@/hooks/use-loading';
import { useGlobalStore } from '@/providers/global-store-provider';
import { api } from '@/lib/trpc';
import { columns } from './columns';

export default function Page() {
  const profile = useGlobalStore((state) => state.currentOrg.orgMemberProfile);
  const currentOrg = useGlobalStore((state) => state.currentOrg);
  const updateOrg = useGlobalStore((state) => state.updateOrg);

  const {
    data: proStatus,
    isLoading: proLoading,
    error: proError
  } = api.org.setup.billing.isPro.useQuery({});

  const {
    data: personalAddresses,
    isLoading: personalAddressesLoading,
    error: personalAddressesError
  } = api.account.addresses.getPersonalAddresses.useQuery({});

  //     data: initData,
  //     isLoading: isInitDataLoading,
  //     refetch: revalidateProfile
  //   } = api.account.profile.getOrgMemberProfile.useQuery({
  //     orgShortcode: currentOrg.shortCode
  //   });

  //   const [avatarTimestamp, setAvatarTimestamp] = useState<Date | null>(null);
  //   const [firstNameValue, setFirstNameValue] = useState('');
  //   const [lastNameValue, setLastNameValue] = useState('');
  //   const [titleValue, setTitleValue] = useState('');
  //   const [bioValue, setBioValue] = useState('');

  //   const avatarUrl = useMemo(() => {
  //     if (!initData || !avatarTimestamp) return null;
  //     return generateAvatarUrl({
  //       publicId: initData.profile.publicId,
  //       avatarTimestamp,
  //       size: '5xl'
  //     });
  //   }, [avatarTimestamp, initData]);

  //   const { ModalRoot: AvatarModalRoot, openModal: avatarModalOpen } =
  //     useAvatarModal({
  //       publicId: profile.publicId
  //     });

  //   useEffect(() => {
  //     if (initData) {
  //       updateOrg(currentOrg.shortCode, { orgMemberProfile: initData.profile });
  //       setFirstNameValue(initData.profile.firstName ?? '');
  //       setLastNameValue(initData.profile.lastName ?? '');
  //       setTitleValue(initData.profile.title ?? '');
  //       setBioValue(initData.profile.blurb ?? '');
  //       setAvatarTimestamp(initData.profile.avatarTimestamp);
  //     }
  //     // eslint-disable-next-line react-hooks/exhaustive-deps
  //   }, [initData]);

  //   const {
  //     error: avatarError,
  //     loading: avatarLoading,
  //     run: openModal
  //   } = useLoading(async () => {
  //     if (!initData) return;
  //     const avatarTimestamp = new Date(await avatarModalOpen({}));
  //     setAvatarTimestamp(avatarTimestamp);
  //   });

  //   const updateProfileApi =
  //     api.account.profile.updateOrgMemberProfile.useMutation();
  //   const { loading: saveLoading, run: saveProfile } = useLoading(async () => {
  //     if (!initData) return;
  //     await updateProfileApi.mutateAsync({
  //       fName: firstNameValue,
  //       lName: lastNameValue,
  //       blurb: bioValue,
  //       title: titleValue,
  //       handle: initData.profile.handle ?? '',
  //       profilePublicId: initData.profile.publicId
  //     });
  //     await revalidateProfile();
  //   });
  //const config = useConfig();
  return (
    <Flex
      className="p-4"
      direction="column"
      gap="3">
      <Heading
        as="h1"
        size="5">
        Your Personal Addresses
      </Heading>

      {personalAddresses && (
        <DataTable
          columns={columns}
          data={personalAddresses}
        />
      )}

      {/* <Flex
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
                First Name
              </Text>
              <TextField.Root
                value={firstNameValue}
                onChange={(e) => setFirstNameValue(e.target.value)}
              />
            </label>
          </Skeleton>
          <Skeleton loading={isInitDataLoading}>
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
          </Skeleton>
        </Flex>
        <Flex gap="2">
          <Skeleton loading={isInitDataLoading}>
            <label>
              <Text
                as="div"
                size="2"
                mb="1"
                weight="bold"
                className="text-left">
                Title
              </Text>
              <TextField.Root
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
              />
            </label>
          </Skeleton>
          <Skeleton loading={isInitDataLoading}>
            <label>
              <Text
                as="div"
                size="2"
                mb="1"
                weight="bold"
                className="text-left">
                Bio
              </Text>
              <TextField.Root
                value={bioValue}
                onChange={(e) => setBioValue(e.target.value)}
              />
            </label>
          </Skeleton>
        </Flex>
        <Flex
          gap="2"
          className="w-full">
          <Skeleton loading={isInitDataLoading}>
            <Button
              size="2"
              className="flex-1"
              loading={saveLoading}
              onClick={() =>
                saveProfile({ clearData: true, clearError: true })
              }>
              Save
            </Button>
          </Skeleton>
        </Flex>
      </Flex> */}
      {/* <AvatarModalRoot /> */}
    </Flex>
  );
}
