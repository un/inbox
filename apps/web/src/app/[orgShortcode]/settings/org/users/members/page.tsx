'use client';

import { useGlobalStore } from '@/src/providers/global-store-provider';
import { PageTitle } from '../../../_components/page-title';
import { Button } from '@/src/components/shadcn-ui/button';
import { DataTable } from '@/src/components/shared/table';
import { columns } from './_components/columns';
import { platform } from '@/src/lib/trpc';
import Link from 'next/link';

export default function Page() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const { data: memberList, isLoading } =
    platform.org.users.members.getOrgMembers.useQuery({
      orgShortcode
    });

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <PageTitle
        title="Members"
        description="Manage Your Org Members">
        <Button asChild>
          <Link href={`/${orgShortcode}/settings/org/users/invites`}>
            Invite a Member
          </Link>
        </Button>
      </PageTitle>

      {isLoading && <div>Loading...</div>}
      {memberList && (
        <DataTable
          columns={columns}
          data={memberList.members ?? []}
        />
      )}
    </div>
  );
}
