'use client';
import { Flex, ScrollArea } from '@radix-ui/themes';
import SettingsSidebar from './_components/settings-sidebar';

export default function Layout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Flex className="h-full w-full">
      <SettingsSidebar />
      <Flex className="flex-1">
        <ScrollArea className="h-full">{children}</ScrollArea>
      </Flex>
    </Flex>
  );
}
