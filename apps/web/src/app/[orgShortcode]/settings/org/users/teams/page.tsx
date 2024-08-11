'use client';

import { PageTitle } from '../../../_components/page-title';
import { NewTeamModal } from './_components/new-team-modal';
import { DataTable } from '@/src/components/shared/table';
import { useOrgShortcode } from '@/src/hooks/use-params';
import { columns } from './_components/columns';
import { platform } from '@/src/lib/trpc';

export default function Page() {
  const orgShortcode = useOrgShortcode();
  const { data: teamList, isLoading } =
    platform.org.users.teams.getOrgTeams.useQuery({
      orgShortcode
    });

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <PageTitle title="Teams">
        <NewTeamModal />
      </PageTitle>
      {isLoading && <div>Loading...</div>}
      {teamList && (
        <DataTable
          columns={columns}
          data={teamList.teams ?? []}
          linkTo={(row) =>
            `/${orgShortcode}/settings/org/users/teams/${row.publicId}`
          }
        />
      )}
    </div>
  );
}
