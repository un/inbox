import {
  Dialog,
  DialogContent,
  DialogTitle
} from '@/components/shadcn-ui/dialog';
import { Button } from '@/components/shadcn-ui/button';
import { useOrgShortcode } from '@/hooks/use-params';
import { Link } from '@remix-run/react';
import { platform } from '@/lib/trpc';

type ClaimAddressModalProps = {
  address: string;
  setOpen: (open: boolean) => void;
};

export function ClaimAddressModal({
  setOpen,
  address
}: ClaimAddressModalProps) {
  const orgShortcode = useOrgShortcode();
  const utils = platform.useUtils();

  const { mutate: claimAddressConfirm, isPending: isClaiming } =
    platform.account.addresses.claimPersonalAddress.useMutation({
      onSuccess: async () => {
        await utils.account.addresses.getPersonalAddresses.invalidate();
        await utils.org.mail.emailIdentities.getOrgEmailIdentities.invalidate();
        await utils.org.mail.emailIdentities.getUserEmailIdentities.invalidate();
        setOpen(false);
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
            You are about to link {address} to the Org {orgShortcode}. This
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
              to="/">
              create a personal Org
            </Link>{' '}
            if you don&apos;t have one already.
          </div>

          <div className="text-red-10 text-sm">
            Make sure you want to claim this address with {orgShortcode}, if not
            Cancel this action, change the selected Org and try again.
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
