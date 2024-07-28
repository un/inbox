'use client';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription
} from '@/src/components/shadcn-ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from '@/src/components/shadcn-ui/form';
import { cn, generateAvatarUrl, openFilePicker } from '@/src/lib/utils';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { useAvatarUploader } from '@/src/hooks/use-avatar-uploader';
import { Button } from '@/src/components/shadcn-ui/button';
import { Camera, SpinnerGap } from '@phosphor-icons/react';
import { Input } from '@/src/components/shadcn-ui/input';
import { PageTitle } from '../../_components/page-title';
import AvatarCrop from '@/src/components/avatar-crop';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { platform } from '@/src/lib/trpc';
import { toast } from 'sonner';
import { z } from 'zod';

const profileFormSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string(),
  title: z.string(),
  blurb: z.string()
});

export default function Page() {
  const profile = useGlobalStore((state) => state.currentOrg.orgMemberProfile);
  const currentOrg = useGlobalStore((state) => state.currentOrg);
  const updateOrg = useGlobalStore((state) => state.updateOrg);

  const {
    data: profileData,
    isLoading: profileLoading,
    refetch: revalidateProfile
  } = platform.account.profile.getOrgMemberProfile.useQuery({
    orgShortcode: currentOrg.shortcode
  });

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      title: '',
      blurb: ''
    }
  });

  const [avatarTimestamp, setAvatarTimestamp] = useState<Date | null>(null);
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
    if (!profileData || !avatarTimestamp) return null;
    return generateAvatarUrl({
      publicId: profileData.profile.publicId,
      avatarTimestamp,
      size: '5xl'
    });
  }, [avatarTimestamp, profileData]);

  useEffect(() => {
    if (profileData) {
      updateOrg(currentOrg.shortcode, {
        orgMemberProfile: profileData.profile
      });
      form.setValue('firstName', profileData.profile.firstName ?? '');
      form.setValue('lastName', profileData.profile.lastName ?? '');
      form.setValue('title', profileData.profile.title ?? '');
      form.setValue('blurb', profileData.profile.blurb ?? '');
      setAvatarTimestamp(profileData.profile.avatarTimestamp);
    }
  }, [currentOrg.shortcode, form, profileData, updateOrg]);

  const { mutateAsync: updateProfile, isPending: updatingProfile } =
    platform.account.profile.updateOrgMemberProfile.useMutation({
      onError: (error) => {
        toast.error("Couldn't update profile", {
          description: error.message
        });
      },
      onSuccess: () => {
        void revalidateProfile();
      }
    });

  if (profileLoading)
    return (
      <div className="flex h-32 w-full items-center justify-center gap-2">
        <SpinnerGap className="size-4 animate-spin" />
        <span className="text-base-11 text-sm font-semibold">
          Loading Profile...
        </span>
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
        <div className="flex w-fit flex-col gap-2">
          <Form {...form}>
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        inputSize="lg"
                        label="First Name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        inputSize="lg"
                        label="Last Name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        inputSize="lg"
                        label="Title"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="blurb"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        inputSize="lg"
                        label="Bio"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex w-full gap-2">
              <Button
                loading={updatingProfile}
                onClick={(e) => {
                  if (!profileData) return;
                  return form.handleSubmit((data) =>
                    updateProfile({
                      name: `${data.firstName} ${data.lastName}`,
                      blurb: data.blurb,
                      title: data.title,
                      handle: profileData.profile.handle ?? '',
                      profilePublicId: profileData.profile.publicId
                    })
                  )(e);
                }}>
                Save
              </Button>
            </div>
          </Form>
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
