'use client';

import Metadata from '@/src/components/metadata';
import { DataTable } from '@/src/components/shared/table';
import { api } from '@/src/lib/trpc';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { columns } from './_components/columns';
import { AddDomainModal } from './_components/add-domain-modal';

export default function Page() {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const { data: domainList, isLoading } =
    api.org.mail.domains.getOrgDomains.useQuery({
      orgShortCode
    });

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <Metadata
        title="Org Settings - Domains"
        description="Manage your organization"
      />
      <div className="flex w-full justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl leading-5">Domains</h1>
          <div>Manage Your Org Domains</div>
        </div>
        <AddDomainModal />
      </div>
      {isLoading && <div>Loading...</div>}
      {domainList && (
        <DataTable
          columns={columns}
          data={domainList.domainData ?? []}
          linkTo={(row) =>
            `/${orgShortCode}/settings/org/mail/domains/${row.publicId}`
          }
        />
      )}
    </div>
  );
}
