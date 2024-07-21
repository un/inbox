'use client';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/src/components/shadcn-ui/alert-dialog';
import { cn, generateAvatarUrl, openFilePicker } from '@/src/lib/utils';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { useAvatarUploader } from '@/src/hooks/use-avatar-uploader';
import { Skeleton } from '@/src/components/shadcn-ui/skeleton';
import { Button } from '@/src/components/shadcn-ui/button';
import { Camera, FloppyDisk } from '@phosphor-icons/react';
import { Input } from '@/src/components/shadcn-ui/input';
import AvatarCrop from '@/src/components/avatar-crop';
import { PageTitle } from '../_components/page-title';
import { useRouter } from 'next/navigation';
import { platform } from '@/src/lib/trpc';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';

export default function ProfileComponent() {
  const router = useRouter();
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const currentOrg = useGlobalStore((state) => state.currentOrg);
  const updateOrg = useGlobalStore((state) => state.updateOrg);

  const { data: isAdmin, isLoading: adminLoading } =
    platform.org.users.members.isOrgMemberAdmin.useQuery({
      orgShortcode
    });

  const [orgNameValue, setOrgNameValue] = useState<string>(currentOrg.name);
  const [file, setFile] = useState<File | null>(null);

  const avatarUrl = useMemo(() => {
    return generateAvatarUrl({
      publicId: currentOrg.publicId,
      avatarTimestamp: currentOrg.avatarTimestamp,
      size: '5xl'
    });
  }, [currentOrg.publicId, currentOrg.avatarTimestamp]);

  const { uploading, progress, upload } = useAvatarUploader({
    onError: (error) => {
      toast.error("Couldn't upload avatar", {
        description: error.message
      });
    },
    onUploaded: (response) => {
      updateOrg(orgShortcode, {
        avatarTimestamp: response.avatarTimestamp
      });
    }
  });

  const { mutateAsync: updateOrgProfile, isPending: updatingOrgProfile } =
    platform.org.setup.profile.setOrgProfile.useMutation({
      onError: (error) => {
        toast.error("Couldn't update org profile", {
          description: error.message
        });
      },
      onSuccess: () => {
        updateOrg(orgShortcode, { name: orgNameValue });
      }
    });

  if (!adminLoading && !isAdmin) {
    router.push(`/${orgShortcode}/settings`);
  }

  return (
    <div className="flex h-full w-full flex-col items-start gap-4 overflow-y-auto p-4">
      <PageTitle title="Your Profile" />

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
                    file: new File([e], currentOrg.publicId, {
                      type: 'image/png'
                    }),
                    publicId: currentOrg.publicId,
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
