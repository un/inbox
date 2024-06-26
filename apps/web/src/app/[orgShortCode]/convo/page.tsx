'use client';
import { Button } from '@/src/components/shadcn-ui/button';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import Link from 'next/link';

export default function Page() {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4">
      <span className="font-medium">
        Select a Convo from the Sidebar or Create a New One
      </span>
      <Link href={`/${orgShortCode}/convo/new`}>
        <Button>Create New Convo</Button>
      </Link>
    </div>
  );
}
