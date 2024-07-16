import { type ModalComponent } from '@/src/hooks/use-awaitable-modal';
import { Button } from '@/src/components/shadcn-ui/button';
import {
  Dialog,
  DialogDescription,
  DialogTitle,
  DialogContent
} from '@/src/components/shadcn-ui/dialog';
import { type TypeId } from '@u22n/utils/typeid';
import { platform } from '@/src/lib/trpc';

export function DeletePasskeyModal({
  open,
  publicId,
  name,
  verificationToken,
  onClose,
  onResolve
}: ModalComponent<{
  publicId: TypeId<'accountPasskey'>;
  name: string;
  verificationToken: string;
}>) {
  const {
    mutateAsync: deletePasskey,
    isPending: deletePasskeyLoading,
    error
  } = platform.account.security.deletePasskey.useMutation();

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogTitle>Delete Passkey</DialogTitle>
        <DialogDescription>
          This action is irreversible. You will not be able to recover this
          passkey. Are you sure you want to delete {name}?
        </DialogDescription>
        <div className="text-red-10 w-full">{error?.message}</div>
        <div className="flex flex-col gap-3">
          <Button
            color="red"
            className="w-full"
            loading={deletePasskeyLoading}
            onClick={async () => {
              await deletePasskey({
                passkeyPublicId: publicId,
                verificationToken
              });
              onResolve(null);
            }}>
            Delete
          </Button>
          <Button
            disabled={deletePasskeyLoading}
            onClick={() => onClose()}
            className="w-full"
            variant="outline"
            color="gray">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
