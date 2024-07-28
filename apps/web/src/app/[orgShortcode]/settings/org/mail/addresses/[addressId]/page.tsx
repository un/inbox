'use client';

import {
  Alert,
  AlertDescription,
  AlertTitle
} from '@/src/components/shadcn-ui/alert';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { ArrowLeft, Info, SpinnerGap } from '@phosphor-icons/react';
import { Button } from '@/src/components/shadcn-ui/button';
import { Badge } from '@/src/components/shadcn-ui/badge';
import { Avatar } from '@/src/components/avatar';
import { type TypeId } from '@u22n/utils/typeid';
import { platform } from '@/src/lib/trpc';
import Link from 'next/link';

export default function Page({
  params
}: {
  params: { addressId: TypeId<'emailIdentities'> };
}) {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);

  const { data: emailInfo, isLoading } =
    platform.org.mail.emailIdentities.getEmailIdentity.useQuery({
      orgShortcode,
      emailIdentityPublicId: params.addressId
    });

  return (
    <div className="flex h-full w-full flex-col gap-2 p-4">
      <div className="flex w-full gap-4 py-2">
        <Button
          asChild
          size="icon"
          variant="outline">
          <Link href="./">
            <ArrowLeft className="size-6" />
          </Link>
        </Button>
        <div className="flex flex-1 items-center">
          <h1 className="font-display text-2xl leading-5">
            Edit Email Address
          </h1>
        </div>
      </div>
      <Alert className="w-fit">
        <Info className="size-4" />
        <AlertTitle className="font-lg font-bold">
          Sorry, Editing email addresses is not implemented yet.
        </AlertTitle>
        <AlertDescription>
          We are actively working on everything. Please Contact support if you
          need help.
        </AlertDescription>
      </Alert>
      {isLoading && (
        <div className="flex w-full justify-center gap-2 text-center font-bold">
          <SpinnerGap
            className="size-4 animate-spin"
            size={16}
          />
          Loading...
        </div>
      )}
      {emailInfo ? (
        <>
          <div>
            <div className="text-base-11 font-bold uppercase">
              Email Address
            </div>
            <div>
              {`${emailInfo.emailIdentityData?.username}@${emailInfo.emailIdentityData?.domainName}`}
            </div>
          </div>
          <div>
            <div className="text-base-11 font-bold uppercase">
              Forwarding Address
            </div>
            <div>
              {emailInfo.emailIdentityData?.forwardingAddress ?? 'None'}
            </div>
          </div>
          <div>
            <div className="text-base-11 font-bold uppercase">Send Name</div>
            <div>{emailInfo.emailIdentityData?.sendName ?? 'None'}</div>
          </div>
          <div>
            <div className="text-base-11 font-bold uppercase">Catch All</div>
            <div>
              <Badge className="uppercase">
                {emailInfo.emailIdentityData?.isCatchAll ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
          <div>
            <div className="text-base-11 font-bold uppercase">Delivers To</div>
            <div className="flex flex-wrap gap-2">
              {emailInfo.emailIdentityData?.authorizedOrgMembers.map(
                (member) => {
                  const profile = member.orgMember?.profile;
                  if (!profile) return null;
                  return (
                    <div
                      key={profile.publicId}
                      className="bg-muted flex gap-2 rounded p-3">
                      <Avatar
                        avatarProfilePublicId={profile.publicId}
                        avatarTimestamp={profile.avatarTimestamp}
                        name={`${profile.firstName} ${profile.lastName}`}
                        size="lg"
                      />
                      <div className="flex flex-col">
                        <div>{`${profile.firstName} ${profile.lastName}`}</div>
                        <div className="text-base-11 text-xs">
                          @{profile.handle}
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </>
      ) : (
        !isLoading && (
          <div className="flex h-full flex-1 flex-col items-center justify-center gap-2">
            <div className="text-lg font-bold">Address not found</div>
            <Button
              asChild
              className="w-fit">
              <Link href="./">Go Back</Link>
            </Button>
          </div>
        )
      )}
    </div>
  );
}
