'use client';
import SettingsSidebarContent from './_components/settings-sidebar';
import { useIsMobile } from '@/src/hooks/use-is-mobile';
import { BottomNav } from '../_components/bottom-nav';
import { settingsSidebarTunnel } from '../tunnels';

export default function Layout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const isMobile = useIsMobile();
  return (
    <div className="flex h-full w-full">
      <settingsSidebarTunnel.In>
        <SettingsSidebarContent />
      </settingsSidebarTunnel.In>
      {isMobile ? (
        <div className="flex h-full w-full flex-col">
          <div className="h-full w-full overflow-auto">{children}</div>
          <BottomNav type="settings" />
        </div>
      ) : (
        <>
          <settingsSidebarTunnel.Out />
          <div className="flex h-full flex-1 overflow-y-auto">{children}</div>
        </>
      )}
    </div>
  );
}
