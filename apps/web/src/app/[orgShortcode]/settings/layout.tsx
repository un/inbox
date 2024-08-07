'use client';
import SettingsSidebarContent from './_components/settings-sidebar';
import { useIsMobile } from '@/src/hooks/use-is-mobile';

export default function Layout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const isMobile = useIsMobile();
  return (
    <div className="flex h-full w-full">
      {!isMobile && <SettingsSidebarContent />}
      <div className="flex h-full flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
