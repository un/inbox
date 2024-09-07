import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/shadcn-ui/dialog';
import { DialogDescription } from '@radix-ui/react-dialog';
import { useOrgScopedRouter } from '@/hooks/use-params';
import { Button } from '@/components/shadcn-ui/button';
import { Link } from '@remix-run/react';

export function ClaimEmailIdentity() {
  const { scopedUrl } = useOrgScopedRouter();
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
              <Link to={scopedUrl('/settings/user/addresses')}>
                Claim Free @uninbox.me Address
              </Link>
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
