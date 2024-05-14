import { type ModalComponent } from '@/src/hooks/use-awaitable-modal';
import { api } from '@/src/lib/trpc';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { Dialog, Flex, Text, Button } from '@radix-ui/themes';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

export function ClaimAddressModal({
  address,
  open,
  onClose,
  onResolve
}: ModalComponent<{ address: string }>) {
  const [isClaiming, setIsClaiming] = useState(false);
  const currentOrgName = useGlobalStore((state) => state.currentOrg.name);
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);

  const { mutateAsync: claimAddressConfirm } =
    api.account.addresses.claimPersonalAddress.useMutation({
      onSuccess: async () => {
        setIsClaiming(false);
      }
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
          Do you want to claim <span className="underline">{address}</span> ?
        </Dialog.Title>

        <Flex
          gap="4"
          direction="column">
          <Text
            size="2"
            as="div">
            You are about to link {address} to the Org {currentOrgName}. This
            action is irreversible.
          </Text>
          <Text
            size="2"
            as="div">
            If you&apos;re removed from this organization in the future,
            you&apos;ll lose all associated conversations. Our support team may
            be able to reset the address for use in another organization.
          </Text>

          <Text
            size="2"
            as="div">
            We suggest to claim your personal addresses with a personal Org. You
            can{' '}
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
            Make sure you want to claim this address with {currentOrgName}, if
            not Cancel this action, change the selected Org and try again.
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
              if (address === '') return;
              setIsClaiming(true);
              claimAddressConfirm({
                emailIdentity: address,
                orgShortCode
              })
                .then(() => {
                  onResolve(null);
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
}
