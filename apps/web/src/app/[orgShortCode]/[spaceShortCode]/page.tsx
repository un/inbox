'use client';

import { useParams } from 'next/navigation';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { api } from '@/src/lib/trpc';

export default function ShorcodeTestPage() {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);

  const spaceShortcode = useParams().spaceShortCode;

  const { data: spaceData } = api.spaces.getOrgMemberSpaces.useQuery({
    orgShortCode
  });
  const { data: allSpaceData } = api.spaces.getAllOrgSpaces.useQuery({
    orgShortCode
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
