'use client';

import { DataTable } from '@/src/components/shared/table';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { api } from '@/src/lib/trpc';
import { columns } from './_components/columns';
import useAwaitableModal from '@/src/hooks/use-awaitable-modal';
import { ClaimAddressModal } from './_components/claim-address-modal';
import { PageTitle } from '../../_components/page-title';
import { Skeleton } from '@/src/components/shadcn-ui/skeleton';
import { Button } from '@/src/components/shadcn-ui/button';
import { isEnterpriseEdition } from '@/src/lib/utils';

export default function Page() {
  const username = useGlobalStore((state) => state.user.username);
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const isEE = isEnterpriseEdition();

  const { data: proStatus } = api.org.setup.billing.isPro.useQuery(
    {
      orgShortCode
    },
    {
      enabled: isEE
    }
  );

  const {
    data: personalAddresses,
    isLoading: personalAddressesLoading,
    error: personalAddressesError,
    refetch: refetchPersonalAddresses
  } = api.account.addresses.getPersonalAddresses.useQuery({});

  const [ClaimAddressModalRoot, claimAddress] = useAwaitableModal(
    ClaimAddressModal,
    { address: '' }
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageTitle title="Your Addresses" />

      {personalAddressesLoading && <Skeleton className="h-10 w-full" />}

      {personalAddressesError && (
        <div className="flex flex-col gap-2 p-2">
          <span className="text-red-10 text-sm">
            An error occurred while fetching addresses.
          </span>
          {personalAddressesError?.message}
        </div>
      )}

      {personalAddresses && personalAddresses.available.free.length > 0 && (
        <div className="flex flex-col gap-2 p-2">
          <span>Available Free Addresses</span>
          {personalAddresses.available.free.map((domain) => (
            <div
              className="flex flex-row items-center justify-between gap-2"
              key={domain}>
              <span className="font-mono">
                {username}@{domain}
              </span>
              <Button
                variant="default"
                onClick={() => {
                  void claimAddress({
                    address: `${username}@${domain}`
                  })
                    .then(() => refetchPersonalAddresses())
                    .catch(() => null);
                }}>
                Claim
              </Button>
            </div>
          ))}
        </div>
      )}

      {personalAddresses && personalAddresses.available.premium.length > 0 && (
        <div className="flex flex-col gap-2">
          <span>
            Available Premium Addresses{' '}
            <span className="text-base-11 text-sm">
              (with a pro subscription)
            </span>
          </span>

          {personalAddresses.available.premium.map((domain) => (
            <div
              className="flex flex-row items-center justify-between gap-2"
              key={domain}>
              <span className="font-mono">
                {username}@{domain}
              </span>
              <Button
                onClick={() => {
                  void claimAddress({
                    address: `${username}@${domain}`
                  })
                    .then(() => refetchPersonalAddresses())
                    .catch(() => null);
                }}
                disabled={
                  isEE
                    ? !proStatus?.isPro || !personalAddresses.hasUninBonus
                    : false
                }>
                Claim
              </Button>
            </div>
          ))}
        </div>
      )}

      {personalAddresses && personalAddresses.identities.length > 0 && (
        <>
          <span>Your claimed addresses</span>
          <DataTable
            columns={columns}
            data={personalAddresses.identities}
          />
        </>
      )}

      <ClaimAddressModalRoot />
    </div>
  );
}
