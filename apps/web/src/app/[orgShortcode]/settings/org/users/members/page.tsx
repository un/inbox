'use client';

import { useGlobalStore } from '@/src/providers/global-store-provider';
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
      <div className="flex w-full justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl leading-5">Members</h1>
          <div>Manage Your Org Members</div>
        </div>
        <Button asChild>
          <Link href={`/${orgShortcode}/settings/org/users/invites`}>
            Invite a Member
          </Link>
        </Button>
      </div>
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
