import { Flex } from '@radix-ui/themes';
import ChatList from './ChatList';
import { unstable_noStore } from 'next/cache';

export default function Layout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  unstable_noStore();
  return (
    <Flex className="h-full">
      <ChatList />
      <Flex className="flex-1">{children}</Flex>
    </Flex>
  );
}
