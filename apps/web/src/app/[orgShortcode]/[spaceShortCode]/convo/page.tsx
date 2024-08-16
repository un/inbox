'use client';

import { Button } from '@/src/components/shadcn-ui/button';
import { useOrgShortcode } from '@/src/hooks/use-params';
import { useIsMobile } from '@/src/hooks/use-is-mobile';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function Page() {
  const orgShortcode = useOrgShortcode();
  const { spaceShortCode } = useParams();
  const isMobile = useIsMobile();

  if (!orgShortcode || !spaceShortCode || Array.isArray(spaceShortCode)) {
    return <div>No org or space shortcode</div>;
  }

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
