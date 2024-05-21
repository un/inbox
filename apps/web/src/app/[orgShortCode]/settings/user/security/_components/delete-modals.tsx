import { type ModalComponent } from '@/src/hooks/use-awaitable-modal';
import { Button, Dialog } from '@radix-ui/themes';
import { type TypeId } from '@u22n/utils/typeid';
import { api } from '@/src/lib/trpc';

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
    isLoading: deletePasskeyLoading,
    error
  } = api.account.security.deletePasskey.useMutation();

  return (
    <Dialog.Root open={open}>
      <Dialog.Content className="w-full max-w-96 p-4">
        <Dialog.Title className="mx-auto w-fit">Delete Passkey</Dialog.Title>
        <Dialog.Description className="mx-auto my-6 flex w-fit text-balance p-2 text-center text-sm font-bold">
          This action is irreversible. You will not be able to recover this
          passkey. Are you sure you want to delete {name}?
        </Dialog.Description>
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
            variant="soft"
            color="gray">
            Cancel
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
