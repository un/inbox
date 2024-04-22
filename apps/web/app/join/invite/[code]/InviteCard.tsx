'use client';

import { datePlus } from 'itty-time';
import { Avatar, Button, Card, Flex, Spinner, Text } from '@radix-ui/themes';
import Link from 'next/link';
import { api, isAuthenticated } from '@/lib/trpc';
import useLoading from '@/hooks/use-loading';
import { useCookies } from 'next-client-cookies';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { generateAvatarUrl, getInitials } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

export default function InviteCard({ code }: { code: string }) {
  const inviteDataApi = api.useUtils().org.users.invites.validateInvite;
  const router = useRouter();
  const cookies = useCookies();

  const {
    data: inviteData,
    error: inviteError,
    loading: inviteLoading,
    run: checkInvite
  } = useLoading(async (signal) => {
    if (code.length !== 32) throw new Error('Invalid Invite code');
    return await inviteDataApi.fetch(
      {
        inviteToken: code
      },
      { signal }
    );
  });

  const { isPending: signedInLoading, data: signedIn } = useQuery({
    enabled: true,
    queryKey: ['auth', 'status'],
    queryFn: isAuthenticated
  });

  useEffect(() => {
    checkInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (inviteLoading || (!inviteData && !inviteError) || signedInLoading) {
    return (
      <Card className="mx-auto my-4 max-w-[450px]">
        <Flex
          gap="2"
          align="center">
          <Spinner loading />
          <Text
            size="2"
            weight="bold">
            Checking your Invite...
          </Text>
        </Flex>
      </Card>
    );
  }

  if (inviteError) {
    return (
      <>
        <Card className="mx-auto my-4 max-w-[450px]">
          <Flex
            direction="column"
            gap="2"
            align="center">
            <Text
              size="3"
              color="red"
              weight="bold">
              You received an Invite for UnInbox, but an error occurred
            </Text>
            <Text
              size="2"
              color="red"
              className="w-full text-balance px-2">
              {inviteError.message}
            </Text>
          </Flex>
        </Card>
        {signedIn ? (
          <Button className="mx-auto my-4 max-w-[450px]">
            <Link href="/">Go Back Home</Link>
          </Button>
        ) : (
          <Flex
            direction="column"
            gap="2"
            className="my-4">
            <Text
              size="2"
              weight="bold">
              You can still create a new UnInbox account
            </Text>
            <Button className="mx-auto max-w-[450px]">
              <Link href="/join">Create an UnInbox Account</Link>
            </Button>
          </Flex>
        )}
      </>
    );
  }

  if (inviteData) {
    const orgAvatar = generateAvatarUrl({
      publicId: inviteData.orgPublicId,
      avatarTimestamp: inviteData.orgAvatarTimestamp
    });

    return (
      <>
        <Card className="mx-auto my-4 max-w-[450px]">
          <Flex
            direction="column"
            gap="2"
            align="center">
            <Text
              size="3"
              weight="bold">
              You have received an Invite for UnInbox
            </Text>

            <Text
              size="2"
              weight="bold"
              className="mt-4 w-full">
              You are invited to
            </Text>
            <Card className="w-full">
              <Flex
                align="center"
                gap="2">
                <Avatar
                  src={orgAvatar ?? undefined}
                  fallback={getInitials(inviteData.orgName)}
                  className="h-10 w-10 rounded-full"
                />
                <Flex direction="column">
                  <Text
                    weight="bold"
                    size="2">
                    {inviteData.orgName}
                  </Text>
                  <Text size="2">{inviteData.orgShortcode}</Text>
                </Flex>
              </Flex>
            </Card>
          </Flex>
        </Card>

        {signedIn ? (
          <Button
            className="mx-auto my-4 max-w-[450px]"
            onClick={() => {
              cookies.set('un-invite-code', code, {
                expires: datePlus('1 week')
              });
              router.push('/join/org');
            }}>
            Join as {inviteData.username}
          </Button>
        ) : (
          <Button
            className="mx-auto my-4 max-w-[450px]"
            onClick={() => {
              cookies.set('un-invite-code', code, {
                expires: datePlus('1 week')
              });
              router.push('/join');
            }}>
            Create an UnInbox Account
          </Button>
        )}
      </>
    );
  }
}
