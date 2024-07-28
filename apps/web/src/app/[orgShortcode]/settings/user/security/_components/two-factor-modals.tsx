import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/src/components/shadcn-ui/dialog';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from '@/src/components/shadcn-ui/input-otp';
import { Separator } from '@/src/components/shadcn-ui/separator';
import { Button } from '@/src/components/shadcn-ui/button';
import { CopyButton } from '@/src/components/copy-button';
import { SpinnerGap } from '@phosphor-icons/react';
import { platform } from '@/src/lib/trpc';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { toast } from 'sonner';

type EnableOrResetTwoFactorModalProps = {
  open: 'enable' | 'reset' | null;
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
};

export function EnableOrResetTwoFactorModal({
  open,
  setOpen,
  onSuccess
}: EnableOrResetTwoFactorModalProps) {
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const {
    data: twoFactorResetChallenge,
    isLoading: twoFactorResetChallengeLoading,
    error: twoFactorResetChallengeError
  } = platform.account.security.generateTwoFactorResetChallenge.useQuery(
    void 0,
    {
      enabled: Boolean(open)
    }
  );
  const {
    mutateAsync: resetOrEnableTwoFactor,
    isPending: enablingTwoFactor,
    error: twoFactorResetError
  } = platform.account.security.enableOrResetTwoFactor.useMutation({
    onSuccess: ({ success }) => {
      if (success) {
        onSuccess();
        setOpen(false);
        toast.info(`2FA has been ${open === 'enable' ? 'enabled' : 'reset'}`);
      }
    }
  });

  const totpSecret = twoFactorResetChallenge?.uri
    ? twoFactorResetChallenge.uri.match(/secret=([^&]+)/)?.[1] ?? null
    : null;

  return (
    <Dialog
      open={Boolean(open)}
      onOpenChange={() => setOpen(!open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {open === 'enable' ? 'Enable' : 'Reset'} Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            {open === 'enable'
              ? "Two Factor authentication adds an extra layer of security to your account. It's recommended to enable it after you've set up your password."
              : 'Scan the QR code with your authenticator app to reset your 2FA'}
          </DialogDescription>
          <div className="flex flex-col gap-2 p-4">
            <div className="flex flex-col gap-2">
              {twoFactorResetChallengeLoading && (
                <div className="flex h-40 w-full items-center justify-center gap-2">
                  <SpinnerGap className="size-4 animate-spin" />
                  <span className="text-base-10 text-sm">
                    Generating 2FA Challenge...
                  </span>
                </div>
              )}
              {twoFactorResetChallenge && (
                <div className="flex flex-col items-center justify-center gap-4">
                  <QRCodeSVG
                    value={twoFactorResetChallenge.uri}
                    size={200}
                    className="rounded-xl bg-white p-4"
                  />
                  <div>
                    <span className="text-base-11 text-xs font-bold">
                      If you can&apos;t scan the QR code, copy the secret below
                    </span>
                    <div className="flex items-center justify-center gap-1 rounded-lg border p-2">
                      <span className="text-base-11 w-[32ch] flex-1 select-all font-mono text-sm">
                        {totpSecret}
                      </span>
                      <CopyButton text={totpSecret!} />
                    </div>
                  </div>
                  <Separator className="w-full" />
                  <div>
                    <span className="text-base-11 text-xs font-bold">
                      Enter the 6-digit code from your 2FA app
                    </span>
                    <div className="mx-auto w-fit">
                      <InputOTP
                        maxLength={6}
                        value={twoFactorCode}
                        onChange={setTwoFactorCode}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>
                </div>
              )}

              {(twoFactorResetChallengeError ?? twoFactorResetError) && (
                <span className="text-red-10 text-center text-xs">
                  {twoFactorResetChallengeError?.message ??
                    twoFactorResetError?.message}
                </span>
              )}
            </div>
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
              loading={enablingTwoFactor}
              disabled={twoFactorCode.length !== 6}
              onClick={() =>
                void resetOrEnableTwoFactor({
                  code: twoFactorCode
                })
              }>
              {open === 'enable' ? 'Enable' : 'Reset'} 2FA
            </Button>
          </DialogFooter>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

type DisableTwoFactorModalProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
};

export function DisableTwoFactorModal({
  open,
  setOpen,
  onSuccess
}: DisableTwoFactorModalProps) {
  const { mutateAsync: disableTwoFactor, isPending: disablingTwoFactor } =
    platform.account.security.disableTwoFactor.useMutation({
      onError: (error) => {
        toast.error('Something went wrong while disabling 2FA', {
          description: error.message,
          className: 'z-[1000]'
        });
      },
      onSuccess: () => {
        onSuccess();
        setOpen(false);
        toast.info('2FA has been disabled');
      }
    });

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        if (disablingTwoFactor) return;
        setOpen(!open);
      }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
          <DialogDescription>
            This will disable your 2FA app and you will not have to enter a 2FA
            Code while logging in. It is generally discouraged to disable 2FA if
            you are using a Password.
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
            loading={disablingTwoFactor}
            onClick={() => disableTwoFactor()}>
            Disable 2FA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
