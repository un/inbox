'use client';

import { useGlobalStore } from '@/src/providers/global-store-provider';
import { AddEmailModal } from './_components/add-address-modal';
import { DataTable } from '@/src/components/shared/table';
import { SpinnerGap } from '@phosphor-icons/react';
import { columns } from './_components/columns';
import { platform } from '@/src/lib/trpc';

export default function Page() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const { data: emailsList, isLoading } =
    platform.org.mail.emailIdentities.getOrgEmailIdentities.useQuery({
      orgShortcode
    });

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <div className="flex w-full justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl leading-5">Addresses</h1>
          <div>Manage Your Org Email Addresses</div>
        </div>
        <AddEmailModal />
      </div>
      {isLoading && (
        <div className="flex w-full justify-center gap-2 text-center font-bold">
          <SpinnerGap
            className="size-4 animate-spin"
            size={16}
          />
          Loading...
        </div>
      )}
      {emailsList && (
        <DataTable
          columns={columns}
          data={emailsList.emailIdentityData ?? []}
          linkTo={(row) =>
            `/${orgShortcode}/settings/org/mail/addresses/${row.publicId}`
          }
        />
      )}
    </div>
  );
}
