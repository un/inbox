'use client';
import { Button } from '@/src/components/shadcn-ui/button';
import ConvoList from './_components/convo-list';
import { usePreferencesState } from '@/src/stores/preferences-store';

export default function Layout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const {
    sidebarDocked,
    sidebarExpanded,
    setSidebarExpanded,
    setSidebarDocking
  } = usePreferencesState();
  return (
    <div className="grid h-full w-full grid-cols-3 gap-0">
      <div className="bg-red-5 col-span-1 flex w-full flex-col">
        {/* <Button onClick={() => setSidebarExpanded(true)}>Show</Button> */}
        <ConvoList />
      </div>
      <div className="col-span-2 w-full">{children}</div>
    </div>
  );
}
