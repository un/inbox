import {
  Dialog,
  DialogContent,
  DialogTitle
} from '@/src/components/shadcn-ui/dialog';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { Button } from '@/src/components/shadcn-ui/button';
import { platform } from '@/src/lib/trpc';
import Link from 'next/link';

type ClaimAddressModalProps = {
  address: string;
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
};

export function ClaimAddressModal({
  setOpen,
  address,
  onSuccess
}: ClaimAddressModalProps) {
  const currentOrgName = useGlobalStore((state) => state.currentOrg.name);
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);

  const { mutate: claimAddressConfirm, isPending: isClaiming } =
    platform.account.addresses.claimPersonalAddress.useMutation({
      onSuccess: () => {
        setOpen(false);
        onSuccess();
      }
    });

  return (
    <Dialog
      open={!!address}
      onOpenChange={() => {
        if (isClaiming) return;
        setOpen(!open);
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
            onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={() => {
              claimAddressConfirm({
                emailIdentity: address,
                orgShortcode
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
