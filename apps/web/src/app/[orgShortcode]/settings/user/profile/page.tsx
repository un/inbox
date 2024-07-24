'use client';

import { Camera, SpinnerGap } from '@phosphor-icons/react';
import { useEffect, useState, useMemo } from 'react';
import { cn, generateAvatarUrl, openFilePicker } from '@/src/lib/utils';
import useLoading from '@/src/hooks/use-loading';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { platform } from '@/src/lib/trpc';
import { Button } from '@/src/components/shadcn-ui/button';
import { Input } from '@/src/components/shadcn-ui/input';
import { PageTitle } from '../../_components/page-title';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription
} from '@/src/components/shadcn-ui/alert-dialog';
import AvatarCrop from '@/src/components/avatar-crop';
import { useAvatarUploader } from '@/src/hooks/use-avatar-uploader';
import { toast } from 'sonner';

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
  const [file, setFile] = useState<File | null>(null);
  const { uploading, progress, upload } = useAvatarUploader({
    onError: (error) => {
      toast.error("Couldn't upload avatar", {
        description: error.message
      });
    },
    onUploaded: (response) => {
      setAvatarTimestamp(response.avatarTimestamp);
    }
  });

  const avatarUrl = useMemo(() => {
    if (!initData || !avatarTimestamp) return null;
    return generateAvatarUrl({
      publicId: initData.profile.publicId,
      avatarTimestamp,
      size: '5xl'
    });
  }, [avatarTimestamp, initData]);

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

  if (isInitDataLoading)
    return (
      <div className="flex h-12 w-full items-center justify-center">
        <SpinnerGap className="size-4 animate-ping" />
        <span className="text-base-11 text-sm">Loading Profile...</span>
      </div>
    );

  return (
    <div className="flex w-full flex-col gap-3 p-4">
      <PageTitle title="Your Profile" />

      <div className="flex flex-col gap-3">
        <Button
          disabled={uploading}
          variant="outline"
          className="mx-0 flex aspect-square h-full max-h-[100px] w-full max-w-[100px] cursor-pointer items-center justify-center rounded-full p-0"
          onClick={() => openFilePicker((files) => setFile(files[0] ?? null))}>
          {uploading ? (
            <span className="font-bold text-white">
              {Math.round(progress)}%
            </span>
          ) : (
            <div
              className={cn(
                avatarUrl
                  ? 'bg-cover'
                  : 'from-cyan-9 to-green-9 bg-gradient-to-bl',
                'flex h-full w-full flex-col rounded-full bg-gradient-to-r *:opacity-0 *:transition-opacity *:duration-300 *:ease-in-out *:hover:opacity-80'
              )}
              style={{
                backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined
              }}>
              <div className="bg-base-5 flex h-full w-full flex-col items-center justify-center rounded-full">
                <Camera size={24} />
                <span className="text-sm">Upload</span>
              </div>
            </div>
          )}
        </Button>

        <div className="flex gap-2">
          <Input
            label="First Name"
            value={firstNameValue}
            onChange={(e) => setFirstNameValue(e.target.value)}
          />

          <Input
            label="Last Name"
            value={lastNameValue}
            onChange={(e) => setLastNameValue(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Input
            label="Title"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
          />

          <Input
            label="Blurb"
            value={bioValue}
            onChange={(e) => setBioValue(e.target.value)}
          />
        </div>
        <div className="flex w-full gap-2">
          <Button
            loading={saveLoading}
            onClick={() => saveProfile({ clearData: true, clearError: true })}>
            Save
          </Button>
        </div>
      </div>
      {file && (
        <AlertDialog
          open={file !== null}
          onOpenChange={() => setFile(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Upload Avatar</AlertDialogTitle>
              <AlertDialogDescription className="sr-only">
                Upload new Avatar
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col items-center justify-center gap-2">
              <AvatarCrop
                input={file}
                onCrop={(e) => {
                  upload({
                    file: new File([e], profile.publicId, {
                      type: 'image/png'
                    }),
                    publicId: profile.publicId,
                    type: 'orgMember'
                  });
                  setFile(null);
                }}
                onCancel={() => setFile(null)}
              />
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
