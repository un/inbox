'use client';

import { Button, Flex, Heading, Text, Card, Spinner } from '@radix-ui/themes';
import { DataTable } from './table';
import { useGlobalStore } from '@/providers/global-store-provider';
import { api } from '@/lib/trpc';
import { columns } from './columns';
import useAwaitableModal from '@/hooks/use-awaitable-modal';
import { ClaimAddressModal } from './claim-address-modal';

export default function Page() {
  const username = useGlobalStore((state) => state.user.username);
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);

  const { data: proStatus } = api.org.setup.billing.isPro.useQuery({
    orgShortCode
  });

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
    <Flex
      className="p-4"
      direction="column"
      gap="4">
      <Heading
        as="h1"
        size="5">
        Your Personal Addresses
      </Heading>

      {personalAddressesLoading && <Spinner loading />}

      {personalAddressesError && (
        <Card>
          <Text
            color="red"
            size="2">
            An error occurred while fetching addresses.
          </Text>
          {personalAddressesError?.message}
        </Card>
      )}

      {personalAddresses && personalAddresses.available.free.length > 0 && (
        <Flex
          direction="column"
          gap="2">
          <Heading
            as="h2"
            size="3">
            Available Free Addresses
          </Heading>
          {personalAddresses.available.free.map((domain) => (
            <Card key={domain}>
              <Flex
                direction="row"
                gap="3"
                align="center"
                justify="between">
                <Text className="font-mono">
                  {username}@{domain}
                </Text>
                <Button
                  variant="solid"
                  size="2"
                  onClick={() => {
                    void claimAddress({
                      address: `${username}@${domain}`
                    })
                      .then(() => refetchPersonalAddresses())
                      .catch(() => null);
                  }}>
                  Claim
                </Button>
              </Flex>
            </Card>
          ))}
        </Flex>
      )}

      {personalAddresses && personalAddresses.available.premium.length > 0 && (
        <Flex
          direction="column"
          gap="2">
          <Heading
            as="h2"
            size="3">
            Available Premium Addresses
          </Heading>
          {personalAddresses.available.premium.map((domain) => (
            <Card key={domain}>
              <Flex
                direction="row"
                gap="3"
                align="center"
                justify="between">
                <Text className="font-mono">
                  {username}@{domain}
                </Text>
                <Button
                  variant="solid"
                  size="2"
                  disabled={
                    !proStatus?.isPro || !personalAddresses.hasUninBonus
                  }>
                  Claim
                </Button>
              </Flex>
            </Card>
          ))}
        </Flex>
      )}

      {personalAddresses && personalAddresses.identities.length > 0 && (
        <>
          <Heading
            as="h2"
            size="3">
            Your claimed addresses
          </Heading>
          <DataTable
            columns={columns}
            data={personalAddresses.identities}
          />
        </>
      )}

      <ClaimAddressModalRoot />
    </Flex>
  );
}
