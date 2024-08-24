'use client';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/src/components/shadcn-ui/alert-dialog';
import { useOrgScopedRouter, useOrgShortcode } from '@/src/hooks/use-params';
import { cn, generateAvatarUrl, openFilePicker } from '@/src/lib/utils';
import { useAvatarUploader } from '@/src/hooks/use-avatar-uploader';
import { Skeleton } from '@/src/components/shadcn-ui/skeleton';
import { Button } from '@/src/components/shadcn-ui/button';
import { Camera, FloppyDisk } from '@phosphor-icons/react';
import { Input } from '@/src/components/shadcn-ui/input';
import AvatarCrop from '@/src/components/avatar-crop';
import { PageTitle } from '../_components/page-title';
import { useState, useMemo, useEffect } from 'react';
import { platform } from '@/src/lib/trpc';
import { toast } from 'sonner';

export default function ProfileComponent() {
  const orgShortcode = useOrgShortcode();
  const { scopedRedirect } = useOrgScopedRouter();

  const utils = platform.useUtils();

  const { data: orgData, refetch: revalidateOrgProfile } =
    platform.org.setup.profile.getOrgProfile.useQuery({
      orgShortcode
    });
  const { data: isAdmin, isLoading: adminLoading } =
    platform.org.users.members.isOrgMemberAdmin.useQuery({
      orgShortcode
    });
  const { mutate: updateOrgProfile, isPending: updatingOrgProfile } =
    platform.org.setup.profile.setOrgProfile.useMutation({
      onSuccess: async () => {
        toast.success('Organization profile updated');
        revalidateOrgProfile();
      }
    });

  const [orgNameValue, setOrgNameValue] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);

  const avatarUrl = useMemo(() => {
    if (!orgData?.orgProfile) return null;
    return generateAvatarUrl({
      publicId: orgData.orgProfile.publicId,
      avatarTimestamp: orgData.orgProfile.avatarTimestamp,
      size: '5xl'
    });
  }, [orgData?.orgProfile]);

  const { uploading, progress, upload } = useAvatarUploader({
    onError: (error) => {
      toast.error("Couldn't upload avatar", {
        description: error.message
      });
    },
    onUploaded: () => {
      void utils.org.crud.getAccountOrgs.refetch();
      void revalidateOrgProfile();
    }
  });

  useEffect(() => {
    if (orgData?.orgProfile.name) {
      setOrgNameValue(orgData.orgProfile.name);
    }
  }, [orgData?.orgProfile.name]);

  if (!adminLoading && !isAdmin) {
    scopedRedirect('/settings');
  }

  useEffect(() => {
    utils.org.crud.getAccountOrgs.invalidate();
  }, [orgData?.orgProfile.name]);

  return (
    <div className="flex h-full w-full flex-col items-start gap-4 overflow-y-auto p-4">
      <PageTitle title="Organization Profile" />

      <div className="flex flex-col gap-3">
        {adminLoading && (
          <Skeleton className="h-20 w-56 items-center justify-center" />
        )}
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

        <div className="flex flex-row gap-2">
          <label>
            <Input
              label="Organization Name"
              value={orgNameValue}
              onChange={(e) => setOrgNameValue(e.target.value)}
            />
          </label>
        </div>

        <Button
          loading={updatingOrgProfile}
          onClick={() =>
            updateOrgProfile({ orgName: orgNameValue, orgShortcode })
          }>
          <FloppyDisk size={20} />
          Save
        </Button>
      </div>
      {file && orgData && (
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
                    file: new File([e], orgData.orgProfile.publicId, {
                      type: 'image/png'
                    }),
                    publicId: orgData.orgProfile.publicId,
                    type: 'org'
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
