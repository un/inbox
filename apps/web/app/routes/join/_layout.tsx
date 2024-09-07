import { Outlet } from '@remix-run/react';

export default function Layout() {
  return (
    <div className="bg-base-2 flex h-full w-full flex-col items-center justify-center">
      <Outlet />
    </div>
  );
}
