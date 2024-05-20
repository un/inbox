'use client';
import ConvoList from './_components/convo-list';

export default function Layout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex h-full w-full flex-row gap-0">
      <ConvoList />
      <div className="w-full">{children}</div>
    </div>
  );
}
