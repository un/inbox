import { Button } from '@/src/components/shadcn-ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/src/components/shadcn-ui/dialog';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import Link from 'next/link';

export function ClaimEmailIdentity() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  return (
    // This dialog should be opened when it is mounted
    <Dialog defaultOpen>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base">
            No Associated Email found for your account
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <p>
            You don&apos;t have any email addresses assigned to your account.
            <br />
            Do you want to claim a free @uninbox.me email address?
          </p>
          <p className="text-base-11 text-sm">
            You can also ask your Organization admin to assign a email to you
          </p>
        </div>
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
