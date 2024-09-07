import { AddDomainModal } from '../_components/add-domain-modal';
import { PageTitle } from '../../../../_components/page-title';
import { DataTable } from '@/components/shared/table';
import { useOrgShortcode } from '@/hooks/use-params';
import { columns } from '../_components/columns';
import { platform } from '@/lib/trpc';

export default function Page() {
  const orgShortcode = useOrgShortcode();
  const { data: domainList, isLoading } =
    platform.org.mail.domains.getOrgDomains.useQuery({
      orgShortcode
    });

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <PageTitle title="Domains">
        <AddDomainModal />
      </PageTitle>

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
