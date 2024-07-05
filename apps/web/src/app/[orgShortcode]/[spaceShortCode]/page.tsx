'use client';

import { useGlobalStore } from '@/src/providers/global-store-provider';
import { useParams } from 'next/navigation';
import { platform } from '@/src/lib/trpc';

export default function ShorcodeTestPage() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);

  const spaceShortcode = useParams().spaceShortCode;

  const { data: spaceData } = platform.spaces.getOrgMemberSpaces.useQuery({
    orgShortcode: orgShortcode
  });
  const { data: allSpaceData } = platform.spaces.getAllOrgSpaces.useQuery({
    orgShortcode: orgShortcode
  });

  return (
    <div className="flex h-full w-full flex-col items-start gap-4 overflow-y-auto p-4">
      <span>
        Hello {spaceShortcode} {JSON.stringify(spaceData)}
      </span>
      <span>
        Hello {spaceShortcode} {JSON.stringify(allSpaceData, null, '\t')}
      </span>
    </div>
  );
}
