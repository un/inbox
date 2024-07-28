import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/src/components/shadcn-ui/dialog';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { Button } from '@/src/components/shadcn-ui/button';
import { DialogDescription } from '@radix-ui/react-dialog';
import Link from 'next/link';

export function ClaimEmailIdentity() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  return (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>No Associated Email found for your account</DialogTitle>
          <DialogDescription>
            <span className="flex">
              You don&apos;t have any email addresses assigned to your account.
              Do you want to claim a free @uninbox.me email address?
            </span>
            <span className="text-base-11 text-sm">
              You can also ask your Organization admin to assign a email to you
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <DialogClose asChild>
            <Button
              variant="secondary"
              className="flex-1">
              Ignore for now
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              asChild
              className="flex-1">
              <Link href={`/${orgShortcode}/settings/user/addresses`}>
                Claim Free @uninbox.me Address
              </Link>
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
