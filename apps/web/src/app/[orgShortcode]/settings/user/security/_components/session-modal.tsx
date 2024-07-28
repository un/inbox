import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/src/components/shadcn-ui/dialog';
import { Button } from '@/src/components/shadcn-ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { platform } from '@/src/lib/trpc';
import { toast } from 'sonner';

type DeleteAllSessionsModalProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export function RemoveAllSessionsModal({
  open,
  setOpen
}: DeleteAllSessionsModalProps) {
  const { mutateAsync: logoutAll, isPending: isLoggingOut } =
    platform.account.security.removeAllSessions.useMutation({
      onError: (err) => {
        toast.error('Something went wrong', {
          description: err.message,
          className: 'z-[1000]'
        });
      }
    });

  const router = useRouter();
  const queryClient = useQueryClient();

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        if (isLoggingOut) return;
        setOpen(!open);
      }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove All Sessions</DialogTitle>
          <DialogDescription>
            This will log you out of all devices and sessions including the
            current device. Are you sure you want to continue?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col gap-2">
          <DialogClose asChild>
            <Button
              variant="secondary"
              className="flex-1">
              Cancel
            </Button>
          </DialogClose>
          <Button
            className="flex-1"
            variant="destructive"
            onClick={async () => {
              await logoutAll();
              router.push('/');
              queryClient.removeQueries();
            }}
            loading={isLoggingOut}>
            Logout of all sessions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
