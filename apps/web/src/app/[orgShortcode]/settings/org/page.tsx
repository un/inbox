'use client';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/src/components/shadcn-ui/alert-dialog';
import {
  useState,
  useMemo,
  useEffect,
  type Dispatch,
  type SetStateAction
} from 'react';
import { useOrgScopedRouter, useOrgShortcode } from '@/src/hooks/use-params';
import { cn, generateAvatarUrl, openFilePicker } from '@/src/lib/utils';
import { useAvatarUploader } from '@/src/hooks/use-avatar-uploader';
import { Camera, FloppyDisk, Trash } from '@phosphor-icons/react';
import { Skeleton } from '@/src/components/shadcn-ui/skeleton';
import { platform, type RouterOutputs } from '@/src/lib/trpc';
import { Button } from '@/src/components/shadcn-ui/button';
import { Input } from '@/src/components/shadcn-ui/input';
import AvatarCrop from '@/src/components/avatar-crop';
import { PageTitle } from '../_components/page-title';
import { toast } from 'sonner';

export default function ProfileComponent() {
  const orgShortcode = useOrgShortcode();
  const { scopedRedirect } = useOrgScopedRouter();

  const utils = platform.useUtils();

  const { data: orgData, refetch } =
    platform.org.setup.profile.getOrgProfile.useQuery({
      orgShortcode
    });
  const { data: isAdmin, isLoading: adminLoading } =
    platform.org.users.members.isOrgMemberAdmin.useQuery({
      orgShortcode
    });
  const { mutate: updateOrgProfile, isPending: updatingOrgProfile } =
    platform.org.setup.profile.setOrgProfile.useMutation();

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
      void refetch();
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

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

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
          onClick={() => {
            updateOrgProfile(
              { orgName: orgNameValue, orgShortcode },
              {
                onSuccess: () => {
                  void utils.org.crud.getAccountOrgs.refetch();
                }
              }
            );
          }}>
          <FloppyDisk size={20} />
          Save
        </Button>
      </div>
      {orgData?.isOwner && (
        <div className="flex flex-col gap-2">
          <span className="font-display font-semibold text-white">
            Danger Zone
          </span>
          <Button
            variant="destructive"
            className="gap-2"
            onClick={() => setDeleteModalOpen(true)}>
            <Trash size={20} />
            Delete Organization
          </Button>
        </div>
      )}
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
      {deleteModalOpen && orgData && (
        <DeleteOrganizationModal
          open={deleteModalOpen}
          setOpen={setDeleteModalOpen}
          orgProfile={orgData.orgProfile}
        />
      )}
    </div>
  );
}

function DeleteOrganizationModal({
  open,
  setOpen,
  orgProfile
}: {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  orgProfile: RouterOutputs['org']['setup']['profile']['getOrgProfile']['orgProfile'];
}) {
  const [confirm, setConfirm] = useState('');
  const orgShortcode = useOrgShortcode();

  const { mutate: deleteOrg, isPending } =
    platform.org.crud.deleteOrg.useMutation({
      onSuccess: () => {
        // Redirect to home page to clear out cache and redirect to next available org or create new org
        window.location.replace('/');
      }
    });

  return (
    <AlertDialog
      open={open}
      onOpenChange={() => {
        if (isPending) return;
        setOpen(!open);
      }}>
      <AlertDialogContent>
        <AlertDialogTitle>Delete Organization</AlertDialogTitle>
        <AlertDialogDescription className="flex flex-col gap-2">
          <span>Are you sure you want to delete this organization?</span>
          <span className="text-red-10 font-semibold">
            This action is irreversible. All data associated with this
            organization would be deleted along with all members.
          </span>
          <span>All active subscriptions will also be cancelled.</span>
          <span>
            {`To confirm deletion of ${orgProfile.name} - type it's name below.`}
          </span>
        </AlertDialogDescription>
        <Input
          label={`Type "${orgProfile.name}" to confirm`}
          inputSize="lg"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <AlertDialogFooter className="flex gap-2">
          <AlertDialogCancel asChild>
            <Button
              variant="secondary"
              className="flex-1"
              disabled={isPending}>
              Cancel
            </Button>
          </AlertDialogCancel>
          <Button
            variant="destructive"
            className="flex-1"
            disabled={confirm !== orgProfile.name}
            loading={isPending}
            onClick={() => deleteOrg({ orgShortcode })}>
            Confirm Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
