'use client';

import { ExternalEmailModal } from './_components/add-external-email-modal';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { AddEmailModal } from './_components/add-address-modal';
import { PageTitle } from '../../../_components/page-title';
import { DataTable } from '@/src/components/shared/table';
import { SpinnerGap } from '@phosphor-icons/react';
import { columns } from './_components/columns';
import { platform } from '@/src/lib/trpc';
import { useState } from 'react';

export default function Page() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const { data: emailsList, isLoading } =
    platform.org.mail.emailIdentities.getOrgEmailIdentities.useQuery({
      orgShortcode
    });

  const [addExternalModalOpen, setAddExternalModalOpen] =
    useState<boolean>(false);

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <PageTitle
        title="Addresses"
        description="Manage Your Org Members">
        <AddEmailModal addExternalModalOpen={setAddExternalModalOpen} />
        <ExternalEmailModal
          open={addExternalModalOpen}
          addExternalModalOpen={setAddExternalModalOpen}
        />
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
