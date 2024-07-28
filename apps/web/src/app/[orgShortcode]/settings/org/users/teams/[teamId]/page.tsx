'use client';

import { useGlobalStore } from '@/src/providers/global-store-provider';
import { Separator } from '@/src/components/shadcn-ui/separator';
// import { EditMemberList } from './_components/member-editor';
import { AddNewMember } from './_components/add-new-member';
import { Button } from '@/src/components/shadcn-ui/button';
import { DataTable } from '@/src/components/shared/table';
import { ArrowLeft } from '@phosphor-icons/react';
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
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
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
      <div className="flex w-full gap-4">
        <Button
          asChild
          size="icon"
          variant="outline">
          <Link href="./">
            <ArrowLeft className="size-6" />
          </Link>
        </Button>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl leading-5">Team Info</h1>
          <div>Information about your Team</div>
        </div>
      </div>
      {isLoading && <div>Loading...</div>}
      {teamInfo ? (
        <>
          <div>
            <span className="font-bold">Team Name:</span> {teamInfo.team?.name}
          </div>
          <div>
            <span className="font-bold">Team Email:</span>{' '}
            {handleEmail(
              teamInfo.team?.authorizedEmailIdentities[0]?.emailIdentity
            )}
          </div>
          <Separator />
          <div className="font-bold">Team Members</div>
          <DataTable
            columns={columns}
            data={teamInfo.team?.members ?? []}
          />
          <div>
            {editMode ? (
              // <EditMemberList
              //   complete={() => setEditMode(false)}
              //   teamId={params.teamId}
              //   existingMembers={
              //     teamInfo.team?.members.map((m) => m.orgMember.publicId) ?? []
              //   }
              // />
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
