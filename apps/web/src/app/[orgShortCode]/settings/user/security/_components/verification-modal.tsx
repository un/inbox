import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from '@/src/components/shadcn-ui/input-otp';
import { PasswordInput } from '@/src/components/password-input';
import { type ModalComponent } from '@/src/hooks/use-awaitable-modal';
import useLoading from '@/src/hooks/use-loading';
import { api } from '@/src/lib/trpc';
import { Button } from '@/src/components/shadcn-ui/button';
import { Badge } from '@/src/components/shadcn-ui/badge';
import { Separator } from '@/src/components/shadcn-ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle
} from '@/src/components/shadcn-ui/dialog';
import { startAuthentication } from '@simplewebauthn/browser';
import { useState } from 'react';

export function VerificationModal({
  open,
  onClose,
  onResolve,
  hasPasskey,
  hasPassword,
  has2Fa
}: ModalComponent<
  { hasPasskey: boolean; hasPassword: boolean; has2Fa: boolean },
  string
>) {
  const getPasskeyVerificationChallenge =
    api.useUtils().account.security.generatePasskeyVerificationChallenge;
  const getVerificationToken =
    api.useUtils().account.security.getVerificationToken;

  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  const {
    loading: passkeyVerificationLoading,
    error: passkeyVerificationError,
    run: verifyWithPasskey
  } = useLoading(
    async (signal) => {
      const challenge = await getPasskeyVerificationChallenge.fetch(
        {},
        { signal }
      );
      const response = await startAuthentication(challenge.options);
      const token = await getVerificationToken.fetch({
        verificationResponseRaw: response
      });
      return token;
    },
    {
      onSuccess: ({ token }) => onResolve(token)
    }
  );

  const {
    error: passwordError,
    loading: passwordLoading,
    run: verifyWithPassword2Fa
  } = useLoading(
    async () => {
      const token = await getVerificationToken.fetch({
        password,
        twoFactorCode: otp
      });
      return token;
    },
    {
      onSuccess: ({ token }) => onResolve(token)
    }
  );

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogTitle>Verification Needed</DialogTitle>
        <DialogDescription>
          We need to verify your identity before you can proceed changing your
          Security settings.
        </DialogDescription>
        <div className="flex flex-col items-center gap-3">
          {hasPasskey && (
            <div className="flex">
              <Button
                onClick={() =>
                  verifyWithPasskey({ clearError: true, clearData: true })
                }
                loading={passkeyVerificationLoading}>
                Verify with Passkey
              </Button>
            </div>
          )}

          {hasPasskey && hasPassword ? (
            <div className="flex w-fit items-center gap-2 py-4">
              <Separator className="bg-green-8 flex-1" />
              <Badge className="uppercase">or</Badge>
              <Separator className="bg-green-8 flex-1" />
            </div>
          ) : null}

          {hasPassword && (
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={passwordLoading}
            />
          )}

          {has2Fa && (
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(e) => {
                setOtp(e);
              }}
              disabled={passwordLoading}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          )}

          {hasPassword && (
            <Button
              disabled={password.length < 8 || (has2Fa && otp.length < 6)}
              loading={passwordLoading}
              onClick={() => verifyWithPassword2Fa()}>
              Verify with Password
            </Button>
          )}

          {passkeyVerificationError && (
            <span className="text-red-10">
              {passkeyVerificationError.message}
            </span>
          )}

          {passwordError && (
            <span className="text-red-10">{passwordError.message}</span>
          )}

          <Button
            onClick={() => onClose()}
            className="mt-4 w-full"
            variant="outline">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
