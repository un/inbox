import { PageTitle } from '../../../_components/page-title';
import { Button } from '@/components/shadcn-ui/button';
import { DataTable } from '@/components/shared/table';
import { useOrgShortcode } from '@/hooks/use-params';
import { columns } from './_components/columns';
import { Link } from '@remix-run/react';
import { platform } from '@/lib/trpc';

export default function Page() {
  const orgShortcode = useOrgShortcode();
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
          <Link to={`/${orgShortcode}/settings/org/users/invites`}>
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
