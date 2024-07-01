'use client';
import { ScrollArea } from '@/src/components/shadcn-ui/scroll-area';
import SettingsSidebar from './_components/settings-sidebar';

export default function Layout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex h-full w-full">
      <SettingsSidebar />
      <div className="flex flex-1">
        <ScrollArea className="h-full">{children}</ScrollArea>
      </div>
    </div>
  );
}
