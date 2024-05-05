'use client';

import { Button, Card, Flex, Spinner, Text } from '@radix-ui/themes';
import Link from 'next/link';
import ProfileCard from './ProfileCard';
import { api } from '@/lib/trpc';
import { useCookies } from 'next-client-cookies';

export default function Page({
  searchParams
}: {
  searchParams: { org: string };
}) {
  const cookies = useCookies();

  if (!searchParams.org) {
    return (
      <Card className="mx-auto my-4 max-w-[450px]">
        <Flex
          gap="2"
          align="center"
          direction="column">
          <Text
            size="2"
            weight="bold">
            Missing Org Parameter
          </Text>
          <Text size="2">
            If you think this is an error, please contact support.
          </Text>
          <Button className="mt-4">
            <Link href="/">Back to Home</Link>
          </Button>
        </Flex>
      </Card>
    );
  }

  const { data: orgData, isLoading: orgDataLoading } =
    api.account.profile.getOrgMemberProfile.useQuery({
      orgShortCode: searchParams.org
    });

  if (orgDataLoading) {
    return (
      <Card className="mx-auto my-4 max-w-[450px]">
        <Flex
          gap="2"
          align="center"
          justify="center">
          <Flex>
            <Spinner loading />
            <Text
              size="2"
              weight="bold">
              Loading Profile
            </Text>
          </Flex>
        </Flex>
      </Card>
    );
  }

  if (!orgData) {
    return (
      <Card className="mx-auto my-4 max-w-[450px]">
        <Flex
          gap="2"
          align="center"
          justify="center"
          direction="column">
          <Text
            size="2"
            weight="bold">
            Invalid Org Parameter
          </Text>
          <Text
            size="2"
            color="red">
            The Org you are trying to setup a profile for does not exist or you
            do not have permission to access it.
          </Text>
          <Text size="2">
            If you think this is an error, please contact support.
          </Text>
          <Button className="mt-2">
            <Link href="/">Back to Home</Link>
          </Button>
        </Flex>
      </Card>
    );
  }

  const wasInvited = Boolean(cookies.get('un-invite-code'));
  return (
    <ProfileCard
      orgData={orgData}
      wasInvited={wasInvited}
    />
  );
}
