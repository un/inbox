'use client';

import Metadata from '@/src/components/metadata';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { Button } from '@/src/components/shadcn-ui/button';
import { Camera, FloppyDisk } from '@phosphor-icons/react';
import { api } from '@/src/lib/trpc';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import useLoading from '@/src/hooks/use-loading';
import { cn, generateAvatarUrl } from '@/src/lib/utils';
import useAwaitableModal from '@/src/hooks/use-awaitable-modal';
import { AvatarModal } from '@/src/components/shared/avatar-modal';
import { PageTitle } from '../_components/page-title';
import { Skeleton } from '@/src/components/shadcn-ui/skeleton';
import { Input } from '@/src/components/shadcn-ui/input';

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

  if (!adminLoading && !isAdmin) {
    router.push(`/${orgShortCode}/settings`);
  }

  return (
    <div className="flex h-full w-full flex-col items-start gap-4 overflow-y-auto p-4">
      <Metadata
        title="Org Settings - Profile"
        description="Manage your organization"
      />
      <PageTitle title="Your Profile" />

      <div className="flex flex-col gap-3">
        {adminLoading && (
          <Skeleton className="h-20 w-56 items-center justify-center" />
        )}
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

        <div className="flex flex-row gap-2">
          <label>
            <span>Organization Name</span>
            <Input
              value={orgNameValue}
              onChange={(e) => setOrgNameValue(e.target.value)}
            />
          </label>
        </div>

        <Button
          loading={saveLoading}
          onClick={() => saveOrgProfile({ clearData: true, clearError: true })}>
          <FloppyDisk size={20} />
          Save
        </Button>
      </div>
      <AvatarModalRoot />
    </div>
  );
}
