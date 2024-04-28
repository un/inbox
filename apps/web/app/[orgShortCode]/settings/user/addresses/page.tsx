'use client';

import {
  Button,
  Flex,
  Heading,
  Text,
  Card,
  Spinner,
  Dialog
} from '@radix-ui/themes';
import { DataTable } from './table';
import { useGlobalStore } from '@/providers/global-store-provider';
import { api } from '@/lib/trpc';
import { columns } from './columns';
import useAwaitableModal from '@/hooks/use-awaitable-modal';
import Link from 'next/link';
import { toast } from 'sonner';

export default function Page() {
  const username = useGlobalStore((state) => state.user.username);
  const currentOrg = useGlobalStore((state) => state.currentOrg);

  const { data: proStatus } = api.org.setup.billing.isPro.useQuery({});

  const {
    data: personalAddresses,
    isLoading: personalAddressesLoading,
    error: personalAddressesError,
    refetch: refetchPersonalAddresses
  } = api.account.addresses.getPersonalAddresses.useQuery({});

  const { ModalRoot, openModal: claimAddress } = useAwaitableModal<
    unknown,
    { address: string }
  >(({ open, onClose, onResolve, args }) => {
    const { mutateAsync: claimAddressConfirm, isPending: isClaiming } =
      api.account.addresses.claimPersonalAddress.useMutation({
        onSuccess: () => refetchPersonalAddresses()
      });

    return (
      <Dialog.Root
        open={open}
        onOpenChange={(open) => {
          if (!open) {
            onClose();
          }
        }}>
        <Dialog.Content className="w-full max-w-96 p-4">
          <Dialog.Title
            className="mx-auto w-fit py-2"
            size="2">
            Do you want to claim{' '}
            <span className="underline">{args?.address}</span> ?
          </Dialog.Title>

          <Flex
            gap="4"
            direction="column">
            <Text
              size="2"
              as="div">
              You are about to link {args?.address} to the Org {currentOrg.name}
              . This action is irreversible.
            </Text>
            <Text
              size="2"
              as="div">
              If you&apos;re removed from this organization in the future,
              you&apos;ll lose all associated conversations. Our support team
              may be able to reset the address for use in another organization.
            </Text>

            <Text
              size="2"
              as="div">
              We suggest to claim your personal addresses with a personal Org.
              You can{' '}
              <Link
                className="underline"
                href="/">
                create a personal Org
              </Link>{' '}
              if you don&apos;t have one already.
            </Text>

            <Text
              size="2"
              as="div"
              color="red">
              Make sure you want to claim this address with {currentOrg.name},
              if not Cancel this action, change the selected Org and try again.
            </Text>
          </Flex>

          <Flex
            gap="3"
            align="center"
            justify="end"
            className="mt-4">
            <Button
              size="2"
              variant="surface"
              onClick={() => onClose()}>
              Cancel
            </Button>
            <Button
              size="2"
              variant="solid"
              onClick={() => {
                if (!args) return;
                claimAddressConfirm({
                  emailIdentity: args.address
                })
                  .then(() => {
                    onResolve({});
                  })
                  .catch((e: Error) => {
                    toast.error(e.message);
                    onClose();
                  });
              }}
              loading={isClaiming}>
              I Understand, Claim Address
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    );
  });

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
                    }).catch(() => null);
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

      <ModalRoot />
    </Flex>
  );
}
