import { type ModalComponent } from '@/src/hooks/use-awaitable-modal';
import { api } from '@/src/lib/trpc';
import { Button } from '@/src/components/shadcn-ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle
} from '@/src/components/shadcn-ui/dialog';

export function DeleteAllSessions({
  open,
  onResolve,
  onClose,
  verificationToken
}: ModalComponent<{ verificationToken: string }>) {
  const {
    mutateAsync: logoutAll,
    isPending: loggingOut,
    error
  } = api.account.security.deleteAllSessions.useMutation();
  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogTitle>Delete All Sessions</DialogTitle>
        <DialogDescription>
          This will log you out of all devices and sessions including the
          current device. Are you sure you want to continue?
        </DialogDescription>
        <div className="text-red-10 w-full">{error?.message}</div>
        <div className="flex flex-col gap-2">
          <Button
            className="bg-red-10 w-full"
            onClick={async () => {
              await logoutAll({ verificationToken });
              onResolve(null);
            }}
            loading={loggingOut}>
            Logout of all sessions
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onClose()}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
