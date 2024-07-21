'use client';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { Button } from '@/src/components/shadcn-ui/button';
import Link from 'next/link';

export default function Page() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4">
      <span className="font-medium">
        Select a Convo from Sidebar or Create a New One
      </span>
      <Button asChild>
        <Link href={`/${orgShortcode}/convo/new`}>Create New Convo</Link>
      </Button>
    </div>
  );
}
