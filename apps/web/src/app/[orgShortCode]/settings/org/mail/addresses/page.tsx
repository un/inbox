'use client';

import { DataTable } from '@/src/components/shared/table';
import { platform } from '@/src/lib/trpc';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { columns } from './_components/columns';
import { AddEmailModal } from './_components/add-address-modal';

export default function Page() {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const { data: emailsList, isLoading } =
    platform.org.mail.emailIdentities.getOrgEmailIdentities.useQuery({
      orgShortCode
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
      {isLoading && <div>Loading...</div>}
      {emailsList && (
        <DataTable
          columns={columns}
          data={emailsList.emailIdentityData ?? []}
          linkTo={(row) =>
            `/${orgShortCode}/settings/org/mail/addresses/${row.publicId}`
          }
        />
      )}
    </div>
  );
}
