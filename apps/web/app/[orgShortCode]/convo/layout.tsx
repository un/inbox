'use client';

import { Flex } from '@radix-ui/themes';
import ConvoList from './ConvoList';

export default function Layout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Flex className="h-full w-full">
      <ConvoList />
      <Flex className="flex-1">{children}</Flex>
    </Flex>
  );
}
