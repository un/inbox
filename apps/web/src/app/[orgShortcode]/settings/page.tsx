'use client';

import SettingsSidebarContent from './_components/settings-sidebar';
import { useIsMobile } from '@/src/hooks/use-is-mobile';
import UserProfilePage from './user/profile/page';

export default function Page() {
  const isMobile = useIsMobile();
  return (
    <div className="flex h-full w-full flex-col items-start justify-start">
      {isMobile ? <SettingsSidebarContent /> : <UserProfilePage />}
    </div>
  );
}
