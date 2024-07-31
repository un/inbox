'use client';

import { useAvatarUploader } from '@/src/hooks/use-avatar-uploader';
import { generateAvatarUrl, openFilePicker } from '@/src/lib/utils';
import { type RouterOutputs, platform } from '@/src/lib/trpc';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/src/components/shadcn-ui/button';
import { Input } from '@/src/components/shadcn-ui/input';
import { useEffect, useMemo, useState } from 'react';
import Stepper from '../../_components/stepper';
import { User } from '@phosphor-icons/react';
import Image from 'next/image';
import { toast } from 'sonner';

type ProfileCardProps = {
  orgData: RouterOutputs['account']['profile']['getOrgMemberProfile'];
  wasInvited: boolean;
};

export function ProfileCard({ orgData, wasInvited }: ProfileCardProps) {
  const [name, setName] = useState<string>(
    `${orgData.profile.firstName ?? orgData.profile.handle ?? ''} ${orgData.profile.lastName ?? ''}`
  );
  const router = useRouter();
  const query = useSearchParams();
  const orgShortCode = query.get('org');
  const { upload, uploadResponse, uploading, error, progress } =
    useAvatarUploader();

  const { mutateAsync: updateProfile, isPending } =
    platform.account.profile.updateOrgMemberProfile.useMutation({
      onError: (error) => {
        toast.error("Couldn't update profile", { description: error.message });
      }
    });

  const avatarUrl = useMemo(() => {
    if (!orgData.profile.avatarTimestamp && !uploadResponse) {
      return null;
    }
    return generateAvatarUrl({
      publicId: orgData.profile.publicId,
      avatarTimestamp:
        uploadResponse?.avatarTimestamp ?? orgData.profile.avatarTimestamp
    });
  }, [
    orgData.profile.avatarTimestamp,
    orgData.profile.publicId,
    uploadResponse
  ]);

  useEffect(() => {
    if (error) {
      toast.error("Couldn't upload avatar", { description: error.message });
    }
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-[416px] flex-col gap-5 p-2">
      <div className="flex items-center justify-between">
        <Image
          src="/logo.png"
          alt="UnInbox Logo"
          height={40}
          width={40}
          className="rounded-xl"
        />
        <Stepper
          step={4}
          total={4}
        />
      </div>
      <div className="flex flex-col gap-2 pb-8">
        <div className="text-base-12 text-2xl font-medium">
          {wasInvited ? 'Got time for a profile?' : 'Complete your profile'}
        </div>

        <span className="text-base-11 text-pretty text-base">
          {wasInvited
            ? 'This profile has been set by the person who invited you. You can have a separate profile for each organization you join.'
            : 'You can have a different profile for each organization you join, lets start with your first one!'}
        </span>
      </div>

      <div className="flex gap-4">
        <div>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={`${name}'s Profile`}
              width={90}
              height={90}
              className="rounded-xl"
            />
          ) : (
            <DefaultAvatar />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <div className="font-base font-semibold">Upload Image</div>
          <div className="text-base-11 text-sm">Min 400x400px, PNG or JPEG</div>
          <Button
            size="sm"
            className="w-fit"
            variant="outline"
            loading={uploading}
            onClick={() =>
              openFilePicker((files) => {
                upload({
                  type: 'orgMember',
                  publicId: orgData.profile.publicId,
                  file: files[0]!
                });
              })
            }>
            {uploading ? `Uploading ${progress.toFixed(2)}%` : 'Upload'}
          </Button>
        </div>
      </div>

      <div className="my-4 flex w-full flex-col items-center justify-center gap-4">
        <Input
          label="Full Name"
          fullWidth
          inputSize="lg"
          value={name}
          onChange={(e) => setName(e.target.value)}
          leadingSlot={User}
        />

        <div className="flex w-full flex-col items-center gap-1">
          <Button
            className="w-full"
            disabled={!name}
            loading={isPending}
            onClick={async () => {
              await updateProfile({
                name,
                profilePublicId: orgData.profile.publicId
              });
              router.push(`/${orgShortCode}`);
            }}>
            Save Profile
          </Button>
          <Button
            className="text-base-11 w-full"
            variant="ghost"
            onClick={() => router.push(`/${orgShortCode}`)}>
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}

const DefaultAvatar = () => {
  return (
    <svg
      width="90"
      height="90"
      viewBox="0 0 64 65"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <rect
        y="0.980469"
        width="64"
        height="64"
        rx="12"
        fill="#E2E4E9"
      />
      <g filter="url(#filter0_i_829_21621)">
        <g clipPath="url(#clip0_829_21621)">
          <rect
            y="0.980469"
            width="64"
            height="64"
            rx="12"
            fill="#E2E4E9"
          />
          <g filter="url(#filter1_di_829_21621)">
            <ellipse
              cx="31.9999"
              cy="61.7801"
              rx="25.6"
              ry="19.2"
              fill="url(#paint0_radial_829_21621)"
              shapeRendering="crispEdges"
            />
            <path
              d="M57.0999 61.7801C57.0999 66.8893 54.3398 71.553 49.8018 74.9565C45.2637 78.3601 38.9714 80.4801 31.9999 80.4801C25.0284 80.4801 18.7361 78.3601 14.198 74.9565C9.65999 71.553 6.8999 66.8893 6.8999 61.7801C6.8999 56.6708 9.65999 52.0071 14.198 48.6036C18.7361 45.2 25.0284 43.0801 31.9999 43.0801C38.9714 43.0801 45.2637 45.2 49.8018 48.6036C54.3398 52.0071 57.0999 56.6708 57.0999 61.7801Z"
              stroke="url(#paint1_radial_829_21621)"
              shapeRendering="crispEdges"
            />
          </g>
          <g filter="url(#filter2_di_829_21621)">
            <circle
              cx="32"
              cy="26.5803"
              r="12.8"
              fill="url(#paint2_radial_829_21621)"
              shapeRendering="crispEdges"
            />
            <circle
              cx="32"
              cy="26.5803"
              r="12.3"
              stroke="url(#paint3_radial_829_21621)"
              shapeRendering="crispEdges"
            />
          </g>
        </g>
      </g>
      <defs>
        <filter
          id="filter0_i_829_21621"
          x="0"
          y="-7.01953"
          width="64"
          height="72"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB">
          <feFlood
            floodOpacity="0"
            result="BackgroundImageFix"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="-8" />
          <feGaussianBlur stdDeviation="8" />
          <feComposite
            in2="hardAlpha"
            operator="arithmetic"
            k2="-1"
            k3="1"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.7712 0 0 0 0 0.78 0 0 0 0 0.7888 0 0 0 0.48 0"
          />
          <feBlend
            mode="normal"
            in2="shape"
            result="effect1_innerShadow_829_21621"
          />
        </filter>
        <filter
          id="filter1_di_829_21621"
          x="2.3999"
          y="34.5801"
          width="59.2"
          height="54.4004"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB">
          <feFlood
            floodOpacity="0"
            result="BackgroundImageFix"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite
            in2="hardAlpha"
            operator="out"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.541176 0 0 0 0 0.560784 0 0 0 0 0.576471 0 0 0 0.16 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_829_21621"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_829_21621"
            result="shape"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="-8" />
          <feGaussianBlur stdDeviation="4" />
          <feComposite
            in2="hardAlpha"
            operator="arithmetic"
            k2="-1"
            k3="1"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"
          />
          <feBlend
            mode="normal"
            in2="shape"
            result="effect2_innerShadow_829_21621"
          />
        </filter>
        <filter
          id="filter2_di_829_21621"
          x="15.2"
          y="5.78027"
          width="33.6001"
          height="41.5996"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB">
          <feFlood
            floodOpacity="0"
            result="BackgroundImageFix"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite
            in2="hardAlpha"
            operator="out"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.541176 0 0 0 0 0.560784 0 0 0 0 0.576471 0 0 0 0.16 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_829_21621"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_829_21621"
            result="shape"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="-8" />
          <feGaussianBlur stdDeviation="4" />
          <feComposite
            in2="hardAlpha"
            operator="arithmetic"
            k2="-1"
            k3="1"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"
          />
          <feBlend
            mode="normal"
            in2="shape"
            result="effect2_innerShadow_829_21621"
          />
        </filter>
        <radialGradient
          id="paint0_radial_829_21621"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(31.9999 42.5801) rotate(90) scale(38.4 51.2)">
          <stop stopColor="white" />
          <stop
            offset="1"
            stopColor="white"
            stopOpacity="0"
          />
        </radialGradient>
        <radialGradient
          id="paint1_radial_829_21621"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(31.9999 42.5801) rotate(90) scale(38.4 51.2)">
          <stop stopColor="white" />
          <stop
            offset="1"
            stopColor="white"
            stopOpacity="0"
          />
        </radialGradient>
        <radialGradient
          id="paint2_radial_829_21621"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(32 13.7803) rotate(90) scale(25.6)">
          <stop stopColor="white" />
          <stop
            offset="1"
            stopColor="white"
            stopOpacity="0"
          />
        </radialGradient>
        <radialGradient
          id="paint3_radial_829_21621"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(32 13.7803) rotate(90) scale(25.6)">
          <stop stopColor="white" />
          <stop
            offset="1"
            stopColor="white"
            stopOpacity="0"
          />
        </radialGradient>
        <clipPath id="clip0_829_21621">
          <rect
            y="0.980469"
            width="64"
            height="64"
            rx="12"
            fill="white"
          />
        </clipPath>
      </defs>
    </svg>
  );
};
