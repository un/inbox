import { type ModalComponent } from '@/src/hooks/use-awaitable-modal';
import { Button } from '@/src/components/shadcn-ui/button';
import { Input } from '@/src/components/shadcn-ui/input';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogDescription
} from '@/src/components/shadcn-ui/dialog';
import { useState } from 'react';

export function PasskeyNameModal({
  open,
  onClose,
  onResolve
}: ModalComponent<NonNullable<unknown>, string>) {
  const [name, setName] = useState('Passkey');
  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogTitle>Name your new passkey</DialogTitle>
        <DialogDescription>
          This will help you identify your passkey in the future. Keep it simple
          like Android Phone, Apple ID, Windows Hello, YubiKey etc.
        </DialogDescription>
        <div className="my-6 flex flex-col gap-2">
          <Input
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
            variant="outline"
            color="gray">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
