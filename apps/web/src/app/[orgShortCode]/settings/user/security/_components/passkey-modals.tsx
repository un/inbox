import { type ModalComponent } from '@/src/hooks/use-awaitable-modal';
import { Dialog, TextField, Button } from '@radix-ui/themes';
import { useState } from 'react';

export function PasskeyNameModal({
  open,
  onClose,
  onResolve
}: ModalComponent<NonNullable<unknown>, string>) {
  const [name, setName] = useState('Passkey');
  return (
    <Dialog.Root open={open}>
      <Dialog.Content className="w-full max-w-96 p-4">
        <Dialog.Title className="mx-auto w-fit">
          Name your new passkey
        </Dialog.Title>
        <Dialog.Description className="mx-auto flex w-fit text-balance p-2 text-center text-sm font-bold">
          This will help you identify your passkey in the future. Keep it simple
          like Android Phone, Apple ID, Windows Hello, YubiKey etc.
        </Dialog.Description>
        <div className="my-6 flex flex-col gap-2">
          <TextField.Root
            defaultValue={'Passkey'}
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
        </div>
        <div className="flex flex-col gap-3">
          <Button
            className="w-full"
            onClick={async () => {
              onResolve(name);
            }}>
            Save
          </Button>
          <Button
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
