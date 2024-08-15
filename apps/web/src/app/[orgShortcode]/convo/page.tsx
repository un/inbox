'use client';
import { useOrgScopedRouter } from '@/src/hooks/use-params';
import { Button } from '@/src/components/shadcn-ui/button';
import { useIsMobile } from '@/src/hooks/use-is-mobile';
import Link from 'next/link';

export default function Page() {
  const { scopedUrl } = useOrgScopedRouter();
  const isMobile = useIsMobile();

  return isMobile ? null : (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
      <span className="text-pretty font-medium">
        Select a Convo from Sidebar or Create a New One
      </span>
      <Button asChild>
        <Link href={scopedUrl(`/convo/new`)}>Create New Convo</Link>
      </Button>
    </div>
  );
}
