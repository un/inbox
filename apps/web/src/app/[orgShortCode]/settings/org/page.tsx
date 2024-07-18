'use client';

import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/src/components/shadcn-ui/button';
import { Camera, FloppyDisk } from '@phosphor-icons/react';
import { platform } from '@/src/lib/trpc';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import useLoading from '@/src/hooks/use-loading';
import { cn, generateAvatarUrl } from '@/src/lib/utils';
import useAwaitableModal from '@/src/hooks/use-awaitable-modal';
import { AvatarModal } from '@/src/components/shared/avatar-modal';
import { PageTitle } from '../_components/page-title';
import { Skeleton } from '@/src/components/shadcn-ui/skeleton';
import { Input } from '@/src/components/shadcn-ui/input';
import { useDebounce } from '@uidotdev/usehooks';
import { z } from 'zod';
import { Check, Plus } from '@phosphor-icons/react';

export default function ProfileComponent() {
  const router = useRouter();
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const currentOrg = useGlobalStore((state) => state.currentOrg);
  const updateOrg = useGlobalStore((state) => state.updateOrg);

  const { data: isAdmin, isLoading: adminLoading } =
    platform.org.users.members.isOrgMemberAdmin.useQuery({
      orgShortCode
    });

  const [orgNameValue, setOrgNameValue] = useState<string>(currentOrg.name);
  const [orgShortCodeValue, setOrgShortCodeValue] = useState<string>(
    currentOrg.shortCode
  );

  const debouncedOrgShortCode = useDebounce(orgShortCodeValue, 500);
  const checkOrgShortCodeApi =
    api.useUtils().org.crud.checkShortCodeAvailability;

  const {
    loading: orgShortCodeDataLoading,
    data: orgShortCodeData,
    error: orgShortCodeError,
    run: checkOrgShortCode
  } = useLoading(async (signal) => {
    if (!debouncedOrgShortCode) return;
    //set to initial state
    if (debouncedOrgShortCode === orgShortCode) {
      return null;
    }
    const parsed = z
      .string()
      .min(5)
      .max(64)
      .regex(/^[a-z0-9]*$/, {
        message: 'Only lowercase letters and numbers'
      })
      .safeParse(debouncedOrgShortCode);

    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? null,
        available: null
      };
    }
    return await checkOrgShortCodeApi.fetch(
      { shortcode: debouncedOrgShortCode },
      { signal }
    );
  });

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

  const updateOrgProfileApi =
    platform.org.setup.profile.setOrgProfile.useMutation();
  const { loading: saveLoading, run: saveOrgProfile } = useLoading(async () => {
    await updateOrgProfileApi.mutateAsync({
      orgName: orgNameValue,
      orgShortCode,
      orgShortCodeNew: orgShortCodeValue
    });
    updateOrg(orgShortCode, {
      name: orgNameValue,
      shortCode: orgShortCodeValue
    });
  });

  if (!adminLoading && !isAdmin) {
    router.push(`/${orgShortCode}/settings`);
  }

  useEffect(() => {
    if (!debouncedOrgShortCode) return;
    checkOrgShortCode({ clearData: true, clearError: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedOrgShortCode]);

  return (
    <div className="flex h-full w-full flex-col items-start gap-4 overflow-y-auto p-4">
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

        <div className="flex flex-row gap-2">
          <label>
            <span>Organization Short Code</span>
            <Input
              value={orgShortCodeValue}
              onChange={(e) => setOrgShortCodeValue(e.target.value)}
            />
          </label>
        </div>

        {!orgShortCodeData && orgShortCodeDataLoading && (
          <div className="text-muted-foreground text-sm font-bold">
            Checking...
          </div>
        )}

        {orgShortCodeData && !orgShortCodeDataLoading && (
          <div className="flex items-center gap-1">
            {orgShortCodeData.available ? (
              <Check
                size={16}
                className="text-green-10"
              />
            ) : (
              <Plus
                size={16}
                className="text-red-10 rotate-45"
              />
            )}

            <div
              className={cn(
                'text-sm font-bold',
                orgShortCodeData.available ? 'text-green-10' : 'text-red-10'
              )}>
              {orgShortCodeData.available
                ? 'Looks good!'
                : orgShortCodeData.error}
            </div>
          </div>
        )}

        {orgShortCodeError && !orgShortCodeDataLoading && (
          <div className="text-red-10 text-sm font-bold">
            {orgShortCodeError.message}
          </div>
        )}

        <Button
          className="w-48"
          loading={saveLoading}
          disabled={
            (!orgShortCodeData?.available &&
              currentOrg.name === orgNameValue) ||
            saveLoading
          }
          onClick={() => saveOrgProfile({ clearData: true, clearError: true })}>
          <FloppyDisk size={20} />
          Save
        </Button>
      </div>
      <AvatarModalRoot />
    </div>
  );
}
