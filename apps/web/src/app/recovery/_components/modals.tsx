import { type ModalComponent } from '@/src/hooks/use-awaitable-modal';
import {
  AlertDialog as Dialog,
  Button,
  TextField,
  Spinner
} from '@radix-ui/themes';
import { memo, Suspense, useState } from 'react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from '@/src/components/shadcn-ui/input-otp';
import CopyButton from '@/src/components/copy-button';
import { toDataURL } from 'qrcode';
import Image from 'next/image';
import TogglePasswordBox from '@/src/components/toggle-password';
import { useDebounce } from '@uidotdev/usehooks';
import { api } from '@/src/lib/trpc';
import { cn } from '@/src/lib/utils';
import { type TypeId } from '@u22n/utils/typeid';

export function PasswordRecoveryModal({
  open,
  accountPublicId,
  onResolve
}: ModalComponent<{ accountPublicId: TypeId<'account'> }>) {
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const debouncedPassword = useDebounce(password, 1000);

  const { data: passwordStrength, isLoading: strengthLoading } =
    api.auth.signup.checkPasswordStrength.useQuery(
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
  } = api.auth.recovery.resetPassword.useMutation();

  const passwordValid =
    password === confirmPassword && passwordStrength?.allowed;

  return (
    <Dialog.Root open={open}>
      <Dialog.Content className="w-full max-w-96 p-4">
        <Dialog.Title className="mx-auto w-fit">
          Reset Your Password
        </Dialog.Title>
        <Dialog.Description className="mx-auto w-fit">
          Enter Your New Password
        </Dialog.Description>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col">
            <TogglePasswordBox
              passwordValue={password}
              setPasswordValue={setPassword}
              label="Password"
              textFieldProps={{
                autoComplete: 'new-password',
                id: 'password',
                color: passwordStrength
                  ? 'error' in passwordStrength || passwordStrength.score < 3
                    ? 'red'
                    : 'green'
                  : undefined
              }}
            />
            {password.length > 0 && (
              <div className="flex gap-1">
                {strengthLoading ? (
                  <>
                    <Spinner loading />
                    <span>Checking...</span>
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

          <div className="flex flex-col">
            <TogglePasswordBox
              passwordValue={confirmPassword}
              setPasswordValue={setConfirmPassword}
              label="Confirm Password"
              textFieldProps={{
                id: 'confirm-password',
                color:
                  confirmPassword && confirmPassword.length > 0
                    ? password === confirmPassword
                      ? 'green'
                      : 'red'
                    : undefined
              }}
            />
          </div>

          {error && (
            <div className="text-xs font-bold text-red-500">
              {error.message}
            </div>
          )}

          <Button
            disabled={!passwordValid}
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
      </Dialog.Content>
    </Dialog.Root>
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
  } = api.auth.recovery.resetTwoFactor.useMutation();

  return (
    <Dialog.Root open={open}>
      <Dialog.Content className="w-full max-w-96 p-4">
        <Dialog.Title className="mx-auto w-fit">
          Setup Your Two Factor Auth
        </Dialog.Title>
        <Dialog.Description className="mx-auto w-fit">
          Scan the QR Code with your Authenticator App and enter the code
        </Dialog.Description>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <MemoizedQrCode text={uri} />
            <TextField.Root
              defaultValue={qrCodeSecret}
              readOnly
              className="w-full font-mono"
              size="3">
              <TextField.Slot className="p-1" />
              <TextField.Slot>
                <CopyButton text={qrCodeSecret} />
              </TextField.Slot>
            </TextField.Root>
          </div>

          <div className="flex flex-col gap-1">
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
              <InputOTPGroup className="w-fit justify-center gap-2">
                <InputOTPSlot
                  index={0}
                  className="rounded-md border"
                />
                <InputOTPSlot
                  index={1}
                  className="rounded-md border"
                />
                <InputOTPSlot
                  index={2}
                  className="rounded-md border"
                />
                <InputOTPSlot
                  index={3}
                  className="rounded-md border"
                />
                <InputOTPSlot
                  index={4}
                  className="rounded-md border"
                />
                <InputOTPSlot
                  index={5}
                  className="rounded-md border"
                />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {error && (
            <div className="text-xs font-bold text-red-500">
              {error.message}
            </div>
          )}

          <Button
            disabled={otp.length < 6}
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
      </Dialog.Content>
    </Dialog.Root>
  );
}

const MemoizedQrCode = memo(
  function QRCode({ text }: { text?: string }) {
    const qrCode = !text
      ? Promise.resolve(null)
      : toDataURL(text, { margin: 2 });

    return (
      <div className="mx-auto flex h-[200px] w-[200px] items-center justify-center rounded p-4">
        <Suspense fallback={<Spinner loading />}>
          {qrCode.then((src) =>
            src ? (
              <Image
                src={src}
                width={200}
                height={200}
                alt="QrCode for 2FA"
                className="h-full w-full rounded"
              />
            ) : null
          )}
        </Suspense>
      </div>
    );
  },
  (prev, next) => prev.text === next.text
);
