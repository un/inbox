import SettingsSidebarContent from './_components/settings-sidebar';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Outlet } from '@remix-run/react';

export default function Layout() {
  const isMobile = useIsMobile();
  return (
    <div className="flex h-full w-full">
      {!isMobile && <SettingsSidebarContent />}
      <div className="flex h-full flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
