import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogClose
} from '@/src/components/shadcn-ui/dialog';
import { Button } from '@/src/components/shadcn-ui/button';
import { Input } from '@/src/components/shadcn-ui/input';
import { Pencil } from '@phosphor-icons/react';
import { platform } from '@/src/lib/trpc';
import { useState } from 'react';
import { toast } from 'sonner';

type PasskeyDeleteModalProps = {
  passkey: {
    nickname: string;
    publicId: string;
  } | null;
  setOpen: (open: boolean) => void;
  onSuccess: (publicId: string) => void;
};

export function PasskeyDeleteModal({
  setOpen,
  onSuccess,
  passkey
}: PasskeyDeleteModalProps) {
  const { mutateAsync: deletePasskey, isPending: deletingPasskey } =
    platform.account.security.deletePasskey.useMutation({
      onSuccess: ({ success }) => {
        if (success) {
          onSuccess(passkey?.publicId ?? '');
          toast.success(`${passkey?.nickname} has been deleted`);
          setOpen(false);
        }
      },
      onError: (err) => {
        toast.error('Something went wrong', {
          description: err.message,
          className: 'z-[1000]'
        });
      }
    });
  return (
    <Dialog
      open={Boolean(passkey)}
      onOpenChange={() => {
        if (deletingPasskey) return;
        setOpen(!open);
      }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Delete <span className="font-semibold">{passkey?.nickname}</span>
          </DialogTitle>
          <DialogDescription>
            This will delete this passkey from your account. You will not be
            able to recover it.{' '}
            <span className="font-semibold">
              Note that you will need to delete the associated passkeys from
              your authenticator yourself.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <DialogClose asChild>
            <Button
              variant="secondary"
              className="flex-1">
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            className="flex-1"
            loading={deletingPasskey}
            onClick={async () => {
              if (!passkey) return;
              await deletePasskey({
                passkeyPublicId: passkey.publicId
              });
            }}>
            Delete Passkey
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type PasskeyRenameModalProps = {
  passkey: {
    nickname: string;
    publicId: string;
  } | null;
  setOpen: (open: boolean) => void;
  onSuccess: (data: { publicId: string; newNickname: string }) => void;
};

export function PasskeyRenameModal({
  setOpen,
  onSuccess,
  passkey
}: PasskeyRenameModalProps) {
  const [nickname, setNickname] = useState(passkey?.nickname ?? '');

  const { mutateAsync: renamePasskey, isPending: renamingPasskey } =
    platform.account.security.renamePasskey.useMutation({
      onSuccess: ({ success }, { newNickname }) => {
        if (success) {
          onSuccess({ publicId: passkey?.publicId ?? '', newNickname });
          toast.success(
            `${passkey?.nickname} has been renamed to ${newNickname}`
          );
          setOpen(false);
        }
      },
      onError: (err) => {
        toast.error('Something went wrong while renaming passkey', {
          description: err.message,
          className: 'z-[1000]'
        });
      }
    });
  return (
    <Dialog
      open={Boolean(passkey)}
      onOpenChange={() => {
        if (renamingPasskey) return;
        setOpen(!open);
      }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Rename <span className="font-semibold">{passkey?.nickname}</span>
          </DialogTitle>
          <DialogDescription>
            Rename this passkey to something convenient for you. You might want
            to call it something like Phone, Apple ID, YubiKey etc
          </DialogDescription>
        </DialogHeader>
        <div className="p-4">
          <Input
            fullWidth
            label="New Nickname"
            inputSize="lg"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            leadingSlot={Pencil}
          />
        </div>
        <DialogFooter className="flex gap-2">
          <DialogClose asChild>
            <Button
              variant="secondary"
              className="flex-1">
              Cancel
            </Button>
          </DialogClose>
          <Button
            className="flex-1"
            disabled={
              nickname === passkey?.nickname ||
              nickname.length < 2 ||
              nickname.length > 64
            }
            loading={renamingPasskey}
            onClick={async () => {
              if (!passkey) return;
              await renamePasskey({
                passkeyPublicId: passkey.publicId,
                newNickname: nickname
              }).catch(() => null);
            }}>
            Rename Passkey
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
