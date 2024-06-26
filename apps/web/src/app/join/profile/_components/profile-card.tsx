'use client';

import { Button } from '@/src/components/shadcn-ui/button';
import { AvatarModal } from '@/src/components/shared/avatar-modal';
import { type RouterOutputs, api } from '@/src/lib/trpc';
import Stepper from '../../_components/stepper';
import { useEffect, useState } from 'react';
import { cn, generateAvatarUrl } from '@/src/lib/utils';
import useLoading from '@/src/hooks/use-loading';
import { Camera, Checks, SkipForward } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import useAwaitableModal from '@/src/hooks/use-awaitable-modal';
import { Input } from '@/src/components/shadcn-ui/input';

type ProfileCardProps = {
  orgData: RouterOutputs['account']['profile']['getOrgMemberProfile'];
  wasInvited: boolean;
};

export function ProfileCard({ orgData, wasInvited }: ProfileCardProps) {
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
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-4">
      <div className="mt-3 text-lg font-bold">
        {wasInvited ? 'Got time for a profile?' : 'Edit your profile'}
      </div>
      <Stepper
        step={4}
        total={4}
      />
      <div className="flex flex-col gap-2">
        <div>
          {wasInvited
            ? 'This profile has been set by the person who invited you. You can have a separate profile for each organization you join.'
            : 'You can have a different profile for each organization you join, lets start with your first one!'}
        </div>
        <div className="italic">Skip this step if you like</div>
      </div>

      <div className="my-4 flex w-full flex-col items-center justify-center gap-5">
        <Button
          variant="outline"
          loading={avatarLoading}
          className="aspect-square h-full max-h-[100px] w-full max-w-[100px] cursor-pointer rounded-full p-0"
          onClick={() => {
            openModal({});
          }}>
          <div
            className={cn(
              avatarUrl ? 'bg-cover' : 'from-yellow-9 to-red-9',
              'flex h-full w-full rounded-full bg-gradient-to-r *:opacity-0 *:transition-opacity *:duration-300 *:ease-in-out *:hover:opacity-100'
            )}
            style={{
              backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined
            }}>
            <div className="bg-gray-11/50 flex h-full w-full flex-col items-center justify-center rounded-full">
              <Camera size={24} />
              <span className="text-sm font-bold">Upload</span>
            </div>
          </div>
        </Button>
        {avatarError && (
          <div className="text-red-10 text-sm">{avatarError.message}</div>
        )}

        <div className="flex gap-2">
          <label>
            <div className="mb-1 text-left text-sm font-bold">First Name</div>
            <Input
              value={firstNameValue}
              onChange={(e) => setFirstNameValue(e.target.value)}
            />
          </label>
          <label>
            <div className="mb-1 text-left text-sm font-bold">Last Name</div>
            <Input
              value={lastNameValue}
              onChange={(e) => setLastNameValue(e.target.value)}
            />
          </label>
        </div>
        <div className="flex w-full gap-2">
          <Button
            className="flex-1"
            variant="secondary"
            onClick={() => router.push('/')}>
            Skip
            <SkipForward size={16} />
          </Button>
          <Button
            className="flex-1"
            disabled={!avatarUrl || !firstNameValue || !lastNameValue}
            loading={saveLoading}
            onClick={() => saveProfile({ clearData: true, clearError: true })}>
            Next
            <Checks size={16} />
          </Button>
        </div>
      </div>
      <AvatarModalRoot />
    </div>
  );
}
