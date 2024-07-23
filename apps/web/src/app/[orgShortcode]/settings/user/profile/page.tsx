'use client';

import { AvatarModal } from '@/src/components/shared/avatar-modal';
import { Camera } from '@phosphor-icons/react';
import { useEffect, useState, useMemo } from 'react';
import { cn, generateAvatarUrl } from '@/src/lib/utils';
import useLoading from '@/src/hooks/use-loading';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { platform } from '@/src/lib/trpc';
import useAwaitableModal from '@/src/hooks/use-awaitable-modal';
import { Skeleton } from '@/src/components/shadcn-ui/skeleton';
import { Button } from '@/src/components/shadcn-ui/button';
import { Input } from '@/src/components/shadcn-ui/input';
import { PageTitle } from '../../_components/page-title';

export default function Page() {
  const profile = useGlobalStore((state) => state.currentOrg.orgMemberProfile);
  const currentOrg = useGlobalStore((state) => state.currentOrg);
  const updateOrg = useGlobalStore((state) => state.updateOrg);

  const {
    data: initData,
    isLoading: isInitDataLoading,
    refetch: revalidateProfile
  } = platform.account.profile.getOrgMemberProfile.useQuery({
    orgShortcode: currentOrg.shortcode
  });

  const [avatarTimestamp, setAvatarTimestamp] = useState<Date | null>(null);
  const [firstNameValue, setFirstNameValue] = useState('');
  const [lastNameValue, setLastNameValue] = useState('');
  const [titleValue, setTitleValue] = useState('');
  const [bioValue, setBioValue] = useState('');

  const avatarUrl = useMemo(() => {
    if (!initData || !avatarTimestamp) return null;
    return generateAvatarUrl({
      publicId: initData.profile.publicId,
      avatarTimestamp,
      size: '5xl'
    });
  }, [avatarTimestamp, initData]);

  const [AvatarModalRoot, avatarModalOpen] = useAwaitableModal(AvatarModal, {
    publicId: profile.publicId
  });

  useEffect(() => {
    if (initData) {
      updateOrg(currentOrg.shortcode, { orgMemberProfile: initData.profile });
      setFirstNameValue(initData.profile.firstName ?? '');
      setLastNameValue(initData.profile.lastName ?? '');
      setTitleValue(initData.profile.title ?? '');
      setBioValue(initData.profile.blurb ?? '');
      setAvatarTimestamp(initData.profile.avatarTimestamp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initData]);

  const {
    error: avatarError,
    loading: avatarLoading,
    run: openModal
  } = useLoading(async () => {
    if (!initData) return;
    const avatarTimestamp = new Date(await avatarModalOpen({}));
    setAvatarTimestamp(avatarTimestamp);
  });

  const updateProfileApi =
    platform.account.profile.updateOrgMemberProfile.useMutation();
  const { loading: saveLoading, run: saveProfile } = useLoading(async () => {
    if (!initData) return;
    await updateProfileApi.mutateAsync({
      name: `${firstNameValue} ${lastNameValue}`,
      blurb: bioValue,
      title: titleValue,
      handle: initData.profile.handle ?? '',
      profilePublicId: initData.profile.publicId
    });
    await revalidateProfile();
  });

  return (
    <div className="flex flex-col gap-3 p-4">
      <PageTitle title="Your Profile" />

      <div className="flex flex-col gap-3">
        {isInitDataLoading && <Skeleton />}

        <Button
          loading={avatarLoading}
          className="mx-0 aspect-square h-full max-h-[100px] w-full max-w-[100px] cursor-pointer rounded-full p-0"
          onClick={() => {
            openModal({});
          }}>
          <div
            className={cn(
              avatarUrl ? 'bg-cover' : 'from-accent-9 to-base-9',
              'flex h-full w-full flex-col rounded-full bg-gradient-to-r *:opacity-0 *:transition-opacity *:duration-300 *:ease-in-out *:hover:opacity-100'
            )}
            style={{
              backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined
            }}>
            <div className="bg-gray-5 flex h-full w-full flex-col items-center justify-center rounded-full">
              <Camera size={24} />
              <span className="text-sm">Upload</span>
            </div>
          </div>
        </Button>

        {avatarError && (
          <span className="text-red-10 text-sm">{avatarError.message}</span>
        )}

        <div className="flex gap-2">
          {isInitDataLoading && <Skeleton />}

          <Input
            label="First Name"
            value={firstNameValue}
            onChange={(e) => setFirstNameValue(e.target.value)}
          />

          {isInitDataLoading && <Skeleton />}

          <Input
            label="Last Name"
            value={lastNameValue}
            onChange={(e) => setLastNameValue(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {isInitDataLoading && <Skeleton />}

          <Input
            label="Title"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
          />

          {isInitDataLoading && <Skeleton />}

          <Input
            label="Blurb"
            value={bioValue}
            onChange={(e) => setBioValue(e.target.value)}
          />
        </div>
        <div className="flex w-full gap-2">
          {isInitDataLoading && <Skeleton />}
          <Button
            loading={saveLoading}
            onClick={() => saveProfile({ clearData: true, clearError: true })}>
            Save
          </Button>
        </div>
      </div>
      <AvatarModalRoot />
    </div>
  );
}
