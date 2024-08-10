'use client';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { Button } from '@/src/components/shadcn-ui/button';
import { useIsMobile } from '@/src/hooks/use-is-mobile';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function Page() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const { spaceShortCode } = useParams();
  const isMobile = useIsMobile();

  return isMobile ? null : (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
      <span className="text-pretty font-medium">
        Select a Convo from Sidebar or Create a New One
      </span>
      <Button asChild>
        <Link href={`/${orgShortcode}/${spaceShortCode}/convo/new`}>
          Create New Convo
        </Link>
      </Button>
    </div>
  );
}
