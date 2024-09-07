import { useOrgScopedRouter } from '@/hooks/use-params';
import { Button } from '@/components/shadcn-ui/button';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Link } from '@remix-run/react';

export default function Page() {
  const { scopedUrl } = useOrgScopedRouter();
  const isMobile = useIsMobile();

  return isMobile ? null : (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
      <Button asChild>
        <Link to={scopedUrl(`/convo/new`, true)}>New Conversation</Link>
      </Button>
    </div>
  );
}
