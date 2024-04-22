'use client';

import { Button, Flex, Heading, Spinner, Text } from '@radix-ui/themes';
import Sidebar from './Sidebar';
import { GlobalStoreProvider } from '@/providers/global-store-provider';
import { ConvoStoreProvider } from '@/providers/convo-store-provider';
import Link from 'next/link';
import { api } from '@/lib/trpc';
import { useQuery } from '@tanstack/react-query';

export default function Layout({
  children,
  params: { orgShortCode }
}: Readonly<{ children: React.ReactNode; params: { orgShortCode: string } }>) {
  const getStoreDataApi = api.useUtils().org.store.getStoreData;

  const {
    data: storeData,
    isPending: storeDataLoading,
    error: storeError
  } = useQuery({
    queryKey: ['org.store.getStoreData', {}],
    queryFn: async () => {
      return await getStoreDataApi
        .fetch({})
        .then(({ publicId, username, orgMemberships }) => {
          const transformed = {
            user: { publicId, username },
            orgs: orgMemberships.map(({ org, profile }) => ({
              name: org.name,
              publicId: org.publicId,
              shortCode: org.shortcode,
              avatarTimestamp: org.avatarTimestamp,
              orgMemberProfile: profile
            }))
          };
          const currentOrg =
            transformed.orgs.find((o) => o.shortCode === orgShortCode) ?? null;
          return { ...transformed, currentOrg };
        });
    }
  });

  if (storeDataLoading) {
    return (
      <Flex
        className="h-full w-full"
        align="center"
        justify="center"
        gap="2"
        direction="column">
        <Spinner loading />
      </Flex>
    );
  }

  if (storeError && !storeDataLoading) {
    return (
      <Flex
        className="h-full w-full"
        align="center"
        justify="center"
        gap="2"
        direction="column">
        <Heading
          as="h1"
          color="red">
          An Error Occurred!
        </Heading>
        <Text
          className="whitespace-pre"
          size="2"
          color="red">
          {storeError.message}
        </Text>
        <Button asChild>
          <Link href="/">Go Back Home</Link>
        </Button>
      </Flex>
    );
  }

  if (!storeDataLoading && !storeData?.currentOrg) {
    return (
      <Flex
        className="h-full w-full"
        align="center"
        justify="center"
        gap="2"
        direction="column">
        <Heading
          as="h1"
          color="red">
          Invalid Org
        </Heading>
        <Text
          className="whitespace-pre"
          size="2">
          Org with ShortCode{' '}
          <span className="font-mono underline">{orgShortCode}</span> either
          does not exists or you are not part of that org!
        </Text>
        <Button asChild>
          <Link href="/">Go Back Home</Link>
        </Button>
      </Flex>
    );
  }

  return (
    // @ts-expect-error, idk why this is behaving like this
    <GlobalStoreProvider initialState={storeData}>
      <ConvoStoreProvider>
        <Flex className="h-full w-full">
          <div className="h-full w-fit">
            <Sidebar />
          </div>
          <Flex className="h-full w-full">{children}</Flex>
        </Flex>
      </ConvoStoreProvider>
    </GlobalStoreProvider>
  );
}
