'use client';

import { useGlobalStore } from '@/src/providers/global-store-provider';
import { AddDomainModal } from './_components/add-domain-modal';
import { DataTable } from '@/src/components/shared/table';
import { columns } from './_components/columns';
import { platform } from '@/src/lib/trpc';

export default function Page() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const { data: domainList, isLoading } =
    platform.org.mail.domains.getOrgDomains.useQuery({
      orgShortcode
    });

  return (
    <div className="flex w-full flex-col gap-2 p-4">
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
            `/${orgShortcode}/settings/org/mail/domains/${row.publicId}`
          }
        />
      )}
    </div>
  );
}
