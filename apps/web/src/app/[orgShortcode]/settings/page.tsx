'use client';

import { useGlobalStore } from '@/src/providers/global-store-provider';
import SettingsSidebarContent from './_components/settings-sidebar';
import { useIsMobile } from '@/src/hooks/use-is-mobile';
import { redirect } from 'next/navigation';

export default function Page() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const isMobile = useIsMobile();
  if (!isMobile) {
    redirect(`/${orgShortcode}/settings/user/profile`);
  }
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <SettingsSidebarContent />
    </div>
  );
}
