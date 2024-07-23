'use client';
import SettingsSidebar from './_components/settings-sidebar';

export default function Layout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex h-full w-full">
      <SettingsSidebar />
      <div className="flex h-full w-full flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
