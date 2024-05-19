import { type ModalComponent } from '@/src/hooks/use-awaitable-modal';
import { api } from '@/src/lib/trpc';
import { Button, Dialog } from '@radix-ui/themes';

export function DeleteAllSessions({
  open,
  onResolve,
  onClose,
  verificationToken
}: ModalComponent<{ verificationToken: string }>) {
  const {
    mutateAsync: logoutAll,
    isLoading: loggingOut,
    error
  } = api.account.security.deleteAllSessions.useMutation();
  return (
    <Dialog.Root open={open}>
      <Dialog.Content className="w-full max-w-96 p-4">
        <Dialog.Title className="mx-auto w-fit">
          Delete All Sessions
        </Dialog.Title>
        <Dialog.Description className="mx-auto flex w-fit text-balance p-2 text-center text-sm font-bold">
          This will log you out of all devices and sessions including the
          current device. Are you sure you want to continue?
        </Dialog.Description>
        <div className="text-red-10 w-full">{error?.message}</div>
        <div className="flex flex-col gap-2">
          <Button
            color="red"
            onClick={async () => {
              await logoutAll({ verificationToken });
              onResolve(null);
            }}
            loading={loggingOut}>
            Logout of all sessions
          </Button>
          <Button
            color="gray"
            variant="soft"
            onClick={() => onClose()}>
            Cancel
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
