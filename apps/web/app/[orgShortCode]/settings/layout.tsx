'use client';
import { Flex } from '@radix-ui/themes';
import SettingsSidebar from './SettingsSidebar';

export default function Layout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Flex className="h-full">
      <SettingsSidebar />
      <Flex className="flex-1">{children}</Flex>
    </Flex>
  );
}
