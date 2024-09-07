import { PageTitle } from '../../../../_components/page-title';
import { Button } from '@/components/shadcn-ui/button';
import { DataTable } from '@/components/shared/table';
import { useOrgShortcode } from '@/hooks/use-params';
import { SpinnerGap } from '@phosphor-icons/react';
import { columns } from '../_components/columns';
import { Link } from '@remix-run/react';
import { platform } from '@/lib/trpc';

export default function Page() {
  const orgShortcode = useOrgShortcode();
  const { data: emailsList, isLoading } =
    platform.org.mail.emailIdentities.getOrgEmailIdentities.useQuery({
      orgShortcode
    });

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <PageTitle
        title="Addresses"
        description="Manage Your Org Members">
        <Button asChild>
          <Link to={`/${orgShortcode}/settings/org/mail/addresses/add`}>
            Add new
          </Link>
        </Button>
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
