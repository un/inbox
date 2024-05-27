'use client';

import { DataTable } from '@/src/components/shared/table';
import { api } from '@/src/lib/trpc';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { columns } from './_components/columns';
import { NewTeamModal } from './_components/new-team-modal';

export default function Page() {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const { data: teamList, isLoading } =
    api.org.users.teams.getOrgTeams.useQuery({
      orgShortCode
    });

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <div className="flex w-full justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl leading-5">Teams</h1>
          <div>Manage Your Org Teams</div>
        </div>
        <NewTeamModal />
      </div>
      {isLoading && <div>Loading...</div>}
      {teamList && (
        <DataTable
          columns={columns}
          data={teamList.teams ?? []}
          linkTo={(row) =>
            `/${orgShortCode}/settings/org/users/teams/${row.publicId}`
          }
        />
      )}
    </div>
  );
}
