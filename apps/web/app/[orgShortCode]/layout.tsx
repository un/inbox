'use client';

import { Button, Flex, Heading, Spinner, Text } from '@radix-ui/themes';
import Sidebar from './Sidebar';
import { GlobalStoreProvider } from '@/providers/global-store-provider';
import { ConvoStoreProvider } from '@/providers/convo-store-provider';
import Link from 'next/link';
import { api } from '@/lib/trpc';

export default function Layout({
  children,
  params: { orgShortCode }
}: Readonly<{ children: React.ReactNode; params: { orgShortCode: string } }>) {
  const {
    data: storeData,
    isPending: storeDataLoading,
    error: storeError
  } = api.org.store.getStoreData.useQuery({ orgShortCode });

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
