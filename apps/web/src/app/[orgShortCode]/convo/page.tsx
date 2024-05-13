'use client';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { Button, Text } from '@radix-ui/themes';
import Link from 'next/link';

export default function Page() {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4">
      <Text
        weight="bold"
        size="2">
        Select a Convo from Sidebar or Create a New One
      </Text>
      <Link href={`/${orgShortCode}/convo/new`}>
        <Button>Create New Convo</Button>
      </Link>
    </div>
  );
}
