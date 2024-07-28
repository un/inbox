import {
  Dialog,
  DialogContent,
  DialogTitle
} from '@/src/components/shadcn-ui/dialog';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { type ModalComponent } from '@/src/hooks/use-awaitable-modal';
import { Button } from '@/src/components/shadcn-ui/button';
import { platform } from '@/src/lib/trpc';
import { useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';

export function ClaimAddressModal({
  address,
  open,
  onClose,
  onResolve
}: ModalComponent<{ address: string }>) {
  const [isClaiming, setIsClaiming] = useState(false);
  const currentOrgName = useGlobalStore((state) => state.currentOrg.name);
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);

  const { mutateAsync: claimAddressConfirm } =
    platform.account.addresses.claimPersonalAddress.useMutation({
      onSuccess: async () => {
        setIsClaiming(false);
      }
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}>
      <DialogContent>
        <DialogTitle>
          Do you want to claim <span className="underline">{address}</span> ?
        </DialogTitle>

        <div className="flex flex-col gap-4">
          <div className="text-sm">
            You are about to link {address} to the Org {currentOrgName}. This
            action is irreversible.
          </div>
          <div className="text-sm">
            If you&apos;re removed from this organization in the future,
            you&apos;ll lose all associated conversations. Our support team may
            be able to reset the address for use in another organization.
          </div>

          <div className="text-sm">
            We suggest to claim your personal addresses with a personal Org. You
            can{' '}
            <Link
              className="underline"
              href="/">
              create a personal Org
            </Link>{' '}
            if you don&apos;t have one already.
          </div>

          <div className="text-red-10 text-sm">
            Make sure you want to claim this address with {currentOrgName}, if
            not Cancel this action, change the selected Org and try again.
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onClose()}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={() => {
              if (address === '') return;
              setIsClaiming(true);
              claimAddressConfirm({
                emailIdentity: address,
                orgShortcode
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
