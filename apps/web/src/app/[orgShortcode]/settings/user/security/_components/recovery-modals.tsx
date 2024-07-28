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
import { Download } from '@phosphor-icons/react';
import { downloadAsFile } from '@/src/lib/utils';
import { platform } from '@/src/lib/trpc';
import { useState } from 'react';
import { toast } from 'sonner';

type EnableOrResetRecoveryCodeModalProps = {
  open: 'enable' | 'reset' | null;
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
};

export function EnableOrResetRecoveryCodeModal({
  open,
  setOpen,
  onSuccess
}: EnableOrResetRecoveryCodeModalProps) {
  const [downloadFileName, setDownloadFileName] = useState('');
  const [downloaded, setDownloaded] = useState(false);
  const [newRecoveryCode, setNewRecoveryCode] = useState<string | null>(null);

  const { mutateAsync: enableRecoveryCode, isPending: enablingRecoveryCode } =
    platform.account.security.enableOrResetRecoveryCode.useMutation({
      onError: (err) => {
        toast.error(
          `Something went wrong while ${open === 'enable' ? 'enabling' : 'resetting'} recovery code`,
          {
            description: err.message,
            className: 'z-[1000]'
          }
        );
      },
      onSuccess: ({ recoveryCode, username }) => {
        setNewRecoveryCode(recoveryCode);
        setDownloadFileName(`Recovery Code for ${username}.txt`);
        onSuccess();
      }
    });

  return (
    <Dialog
      open={Boolean(open)}
      onOpenChange={() => {
        if (enablingRecoveryCode) return;
        setOpen(!open);
      }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {open === 'enable' ? 'Enable' : 'Reset'} Recovery Code
          </DialogTitle>
          <DialogDescription>
            {open === 'enable'
              ? 'Recovery Codes are used to recover your account if you lose access to your authenticator app'
              : 'Resetting your Recovery code will disable your current Recovery Code and generate a new one'}
          </DialogDescription>
        </DialogHeader>

        {newRecoveryCode && (
          <div className="flex w-full items-center justify-center p-6">
            <Button
              className="w-fit gap-2"
              onClick={() => {
                setDownloaded(true);
                downloadAsFile(downloadFileName, newRecoveryCode);
              }}>
              <Download
                size={16}
                weight="bold"
              />
              <span>
                {downloaded ? 'Download Again' : 'Download Recovery Code'}
              </span>
            </Button>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {!newRecoveryCode && (
            <DialogClose asChild>
              <Button
                variant="secondary"
                className="flex-1">
                Cancel
              </Button>
            </DialogClose>
          )}
          <Button
            variant={newRecoveryCode ? 'outline' : 'default'}
            className="flex-1"
            loading={enablingRecoveryCode}
            onClick={async () => {
              if (newRecoveryCode) {
                setOpen(false);
              } else {
                await enableRecoveryCode();
              }
            }}>
            {newRecoveryCode
              ? 'Done'
              : `${open === 'enable' ? 'Enable' : 'Reset'} Recovery Code`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type DisableRecoveryCodeModalProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
};

export function DisableRecoveryCodeModal({
  open,
  setOpen,
  onSuccess
}: DisableRecoveryCodeModalProps) {
  const { mutateAsync: disableRecoveryCode, isPending: disablingRecoveryCode } =
    platform.account.security.disableRecoveryCode.useMutation({
      onError: (err) => {
        toast.error('Something went wrong while disabling recovery code', {
          description: err.message,
          className: 'z-[1000]'
        });
      },
      onSuccess: ({ success }) => {
        if (success) {
          onSuccess();
          setOpen(false);
        }
      }
    });

  return (
    <Dialog
      open={open}
      onOpenChange={() => setOpen(!open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disable Recovery Code</DialogTitle>
          <DialogDescription>
            Disabling your recovery code will make it harder to recover your
            account if you lose access to your authenticator app
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
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
              loading={disablingRecoveryCode}
              onClick={() => disableRecoveryCode()}>
              Disable Recovery Code
            </Button>
          </DialogFooter>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
