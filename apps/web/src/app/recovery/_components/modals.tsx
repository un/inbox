import { type ModalComponent } from '@/src/hooks/use-awaitable-modal';
import { Button } from '@/src/components/shadcn-ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription
} from '@/src/components/shadcn-ui/alert-dialog';
import { useState } from 'react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from '@/src/components/shadcn-ui/input-otp';
import { CopyButton } from '@/src/components/copy-button';
import { PasswordInput } from '@/src/components/password-input';
import { useDebounce } from '@uidotdev/usehooks';
import { platform } from '@/src/lib/trpc';
import { cn } from '@/src/lib/utils';
import { type TypeId } from '@u22n/utils/typeid';
import { QRCodeSVG } from 'qrcode.react';

export function PasswordRecoveryModal({
  open,
  accountPublicId,
  onResolve
}: ModalComponent<{ accountPublicId: TypeId<'account'> }>) {
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const debouncedPassword = useDebounce(password, 1000);

  const { data: passwordStrength, isLoading: strengthLoading } =
    platform.auth.signup.checkPasswordStrength.useQuery(
      {
        password: debouncedPassword
      },
      {
        enabled: !!debouncedPassword.length
      }
    );
  const {
    mutateAsync: resetPassword,
    isPending: isResetting,
    error
  } = platform.auth.recovery.resetPassword.useMutation();

  const passwordValid =
    password === confirmPassword && passwordStrength?.allowed;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="w-full">
        <AlertDialogTitle>Reset Your Password</AlertDialogTitle>
        <AlertDialogDescription>Enter Your New Password</AlertDialogDescription>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <PasswordInput
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              id="password"
              className={
                passwordStrength
                  ? 'error' in passwordStrength || passwordStrength.score < 3
                    ? 'red'
                    : 'green'
                  : undefined
              }
            />
            {password.length > 0 && (
              <div className="flex gap-1">
                {strengthLoading ? (
                  <>
                    <span className="text-base-11 text-xs font-bold">
                      Checking...
                    </span>
                  </>
                ) : (
                  passwordStrength && (
                    <div
                      className={cn(
                        'text-xs font-bold',
                        passwordStrength.allowed
                          ? 'text-green-500'
                          : 'text-red-500'
                      )}>
                      Your Password is{' '}
                      {
                        ['very weak', 'weak', 'fair', 'strong', 'very strong'][
                          passwordStrength.score
                        ]
                      }
                      . It would take {passwordStrength.crackTime} to crack.
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <PasswordInput
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              id="confirm-password"
              color={
                confirmPassword && confirmPassword.length > 0
                  ? password === confirmPassword
                    ? 'green'
                    : 'red'
                  : undefined
              }
            />

            {confirmPassword && confirmPassword.length > 0 && (
              <div className="text-base-11 text-xs font-bold">
                {password !== confirmPassword && 'Passwords do not match'}
              </div>
            )}
          </div>

          {error && (
            <div className="text-xs font-bold text-red-500">
              {error.message}
            </div>
          )}

          <Button
            disabled={!passwordValid || isResetting}
            loading={isResetting}
            className="w-full"
            onClick={async () => {
              await resetPassword({
                accountPublicId,
                newPassword: password
              });
              onResolve(null);
            }}>
            Submit
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function TwoFactorModal({
  uri,
  accountPublicId,
  open,
  onResolve
}: ModalComponent<{ uri: string; accountPublicId: TypeId<'account'> }>) {
  const [otp, setOtp] = useState('');
  const qrCodeSecret = uri.match(/secret=([^&]+)/)?.[1] ?? '';
  const {
    mutateAsync: resetTwoFactor,
    isPending: isResetting,
    error
  } = platform.auth.recovery.resetTwoFactor.useMutation();

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="w-fit">
        <AlertDialogTitle>Setup Your Two Factor Auth</AlertDialogTitle>
        <AlertDialogDescription>
          Scan the QR Code with your Authenticator App and enter the code
        </AlertDialogDescription>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <QRCodeSVG
              value={uri}
              size={200}
              className="bg-base-1 mx-auto rounded p-2"
            />
            <div className="border-base-6 flex w-full rounded border">
              <div className="bg-muted text-base-11 text-bold flex w-[32ch] flex-1 items-center overflow-hidden truncate text-clip rounded rounded-r-none p-1 font-mono">
                {qrCodeSecret}
              </div>
              <CopyButton
                text={qrCodeSecret}
                className="bg-muted size-10 min-h-10 min-w-10 rounded rounded-l-none border-none"
              />
            </div>
          </div>

          <div className="mx-auto flex w-fit flex-col gap-1">
            <label
              htmlFor="code"
              className="text-xs font-bold">
              Two Factor Code
            </label>
            <InputOTP
              id="code"
              maxLength={6}
              value={otp}
              onChange={setOtp}>
              <InputOTPGroup className="mx-auto w-fit">
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {error && (
            <div className="text-xs font-bold text-red-500">
              {error.message}
            </div>
          )}

          <Button
            disabled={otp.length < 6 || isResetting}
            loading={isResetting}
            className="w-full"
            onClick={async () => {
              await resetTwoFactor({
                accountPublicId,
                twoFactorCode: otp
              });
              onResolve(null);
            }}>
            Submit
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
