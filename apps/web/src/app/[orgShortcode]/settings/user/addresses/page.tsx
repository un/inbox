'use client';

import { useGlobalStore } from '@/src/providers/global-store-provider';
import { ClaimAddressModal } from './_components/claim-address-modal';
import useAwaitableModal from '@/src/hooks/use-awaitable-modal';
import { Skeleton } from '@/src/components/shadcn-ui/skeleton';
import { Button } from '@/src/components/shadcn-ui/button';
import { DataTable } from '@/src/components/shared/table';
import { PageTitle } from '../../_components/page-title';
import { columns } from './_components/columns';
import { platform } from '@/src/lib/trpc';

export default function Page() {
  const username = useGlobalStore((state) => state.user.username);
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);

  const { data: proStatus } = platform.org.setup.billing.isPro.useQuery({
    orgShortcode
  });

  const {
    data: personalAddresses,
    isLoading: personalAddressesLoading,
    error: personalAddressesError,
    refetch: refetchPersonalAddresses
  } = platform.account.addresses.getPersonalAddresses.useQuery();

  const [ClaimAddressModalRoot, claimAddress] = useAwaitableModal(
    ClaimAddressModal,
    { address: '' }
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageTitle title="Your Addresses" />

      {personalAddressesLoading && <Skeleton className="h-10 w-full" />}

      {personalAddressesError && (
        <div className="flex flex-col gap-2 px-2">
          <span className="text-red-10 text-sm">
            An error occurred while fetching addresses.
          </span>
          {personalAddressesError?.message}
        </div>
      )}

      {personalAddresses && personalAddresses.available.free.length > 0 && (
        <div className="flex flex-col gap-2 px-2">
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
        <div className="flex flex-col gap-2 px-2">
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
                disabled={!proStatus?.isPro || !personalAddresses.hasUninBonus}>
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
