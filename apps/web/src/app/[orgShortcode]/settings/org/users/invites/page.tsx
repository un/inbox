'use client';

import { useGlobalStore } from '@/src/providers/global-store-provider';
import { PageTitle } from '../../../_components/page-title';
import { DataTable } from '@/src/components/shared/table';
import { InviteModal } from './_components/invite-modal';
import { SpinnerGap } from '@phosphor-icons/react';
import { columns } from './_components/columns';
import { platform } from '@/src/lib/trpc';

export default function Page() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const { data: inviteList, isLoading } =
    platform.org.users.invites.viewInvites.useQuery({
      orgShortcode
    });

  return (
    <div className="flex flex-col gap-2 p-4">
      <PageTitle
        title="Invites"
        description="Grow your Org with Invitations">
        <InviteModal />
      </PageTitle>

      {isLoading && (
        <div className="flex w-full justify-center gap-2 text-center font-bold">
          <SpinnerGap
            className="size-4 animate-spin"
            size={16}
          />
          Loading...
        </div>
      )}
      {inviteList && (
        <div className="flex flex-1 flex-col gap-2 overflow-auto">
          <DataTable
            columns={columns}
            data={inviteList.invites ?? []}
          />
        </div>
      )}
    </div>
  );
}
