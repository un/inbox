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
          <p className="text-muted-foreground text-sm">
            You can also ask your Organization admin to assign a email to you
          </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Ignore for now</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button asChild>
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
