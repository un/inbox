'use client';

import { Separator } from '@/src/components/shadcn-ui/separator';
import { PageTitle } from '../../../../_components/page-title';
import { AddNewMember } from './_components/add-new-member';
import { Button } from '@/src/components/shadcn-ui/button';
import { DataTable } from '@/src/components/shared/table';
import { useOrgShortcode } from '@/src/hooks/use-params';
import { type TypeId } from '@u22n/utils/typeid';
import { columns } from './_components/columns';
import { platform } from '@/src/lib/trpc';
import { useState } from 'react';
import Link from 'next/link';

export default function Page({
  params
}: {
  params: { teamId: TypeId<'teams'> };
}) {
  const orgShortcode = useOrgShortcode();
  const [editMode, setEditMode] = useState(false);

  const {
    data: teamInfo,
    isLoading,
    refetch
  } = platform.org.users.teams.getTeam.useQuery({
    orgShortcode,
    teamPublicId: params.teamId
  });

  return (
    <div className="flex h-full w-full flex-col gap-2 p-4">
      <PageTitle title="Team Info">
        <Button asChild>
          <Link href={`/${orgShortcode}/settings/org/users/invites`}>
            Invite a Member
          </Link>
        </Button>
      </PageTitle>
      {isLoading && <div>Loading...</div>}
      {teamInfo ? (
        <>
          <div>
            <span className="font-bold">Team Name:</span> {teamInfo.team?.name}
          </div>
          <div>
            <span className="font-bold">Team Email:</span>{' '}
            {teamInfo.defaultEmailIdentity?.domainName
              ? handleEmail(teamInfo.defaultEmailIdentity)
              : 'No email set'}
          </div>
          <Separator />
          <div className="font-bold">Team Members</div>
          <DataTable
            columns={columns}
            data={teamInfo.team?.members ?? []}
          />
          <div>
            {editMode ? (
              <AddNewMember
                complete={async () => {
                  await refetch();
                  setEditMode(false);
                }}
                teamId={params.teamId}
                existingMembers={
                  teamInfo.team?.members.map((m) => m.orgMember.publicId) ?? []
                }
              />
            ) : (
              <Button onClick={() => setEditMode(true)}>Add New Member</Button>
            )}
          </div>
        </>
      ) : (
        !isLoading && (
          <div className="flex h-full flex-1 flex-col items-center justify-center gap-2">
            <div className="text-lg font-bold">Team not found</div>
            <Button
              asChild
              className="w-fit">
              <Link href="./">Go Back</Link>
            </Button>
          </div>
        )
      )}
    </div>
  );
}

const handleEmail = (email?: {
  domainName: string;
  username: string;
  sendName: string | null;
}) =>
  email
    ? email.sendName
      ? `${email.sendName} <${email.username}@${email.domainName}>`
      : `${email.username}@${email.domainName}`
    : 'Not Assigned';
