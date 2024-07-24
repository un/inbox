import { Button } from '@/src/components/shadcn-ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle
} from '@/src/components/shadcn-ui/alert-dialog';
import { Separator } from '@/src/components/shadcn-ui/separator';
import { type ModalComponent } from '@/src/hooks/use-awaitable-modal';
import { useEffect, useState } from 'react';
import { platform } from '@/src/lib/trpc';
import useLoading from '@/src/hooks/use-loading';
import { Check, Plus } from '@phosphor-icons/react';
import { PasswordInput } from '@/src/components/password-input';
import { useDebounce } from '@uidotdev/usehooks';
import { QRCodeSVG } from 'qrcode.react';
import { CopyButton } from '@/src/components/copy-button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from '@/src/components/shadcn-ui/input-otp';
import { ms } from '@u22n/utils/ms';
import { cn, downloadAsFile } from '@/src/lib/utils';
import { toast } from 'sonner';

export function PasswordModal({
  open,
  onClose,
  onResolve,
  verificationToken
}: ModalComponent<{ verificationToken: string }, boolean>) {
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [confirmPassword, setConfirmPassword] = useState<string>(
    password ?? ''
  );
  const debouncedPassword = useDebounce(password, 1000);

  const checkPasswordStrength =
    platform.useUtils().auth.signup.checkPasswordStrength;

  const {
    data: passwordCheckData,
    loading: passwordCheckLoading,
    run: checkPassword
  } = useLoading(
    async (signal) => {
      if (!password) return;
      if (password.length < 8) {
        return { error: 'Password must be at least 8 characters long' };
      }
      return await checkPasswordStrength.fetch({ password }, { signal });
    },
    {
      onError: (err) => {
        setError(err.message);
      }
    }
  );

  useEffect(() => {
    if (typeof debouncedPassword === 'undefined') return;
    checkPassword({ clearData: true, clearError: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedPassword]);

  const passwordValid =
    passwordCheckData &&
    'score' in passwordCheckData &&
    passwordCheckData.score >= 3 &&
    password === confirmPassword;

  const setPasswordApi = platform.account.security.resetPassword.useMutation();
  const { loading: passwordLoading, run: updatePassword } = useLoading(
    async () => {
      if (verificationToken === '')
        throw new Error('No verification token provided');
      if (!password) throw new Error('Password is required');
      await setPasswordApi.mutateAsync({
        newPassword: password,
        verificationToken
      });
      onResolve(true);
    },
    {
      onError: (err) => {
        setError(err.message);
      }
    }
  );

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogTitle>Set your Password</AlertDialogTitle>
        <AlertDialogDescription>Choose a Password</AlertDialogDescription>
        <div className="flex w-full flex-col gap-4 p-2">
          <PasswordInput
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            id="password"
          />
          {passwordCheckLoading && (
            <div className="text-base-11 w-full font-bold">
              Checking password strength...
            </div>
          )}
          {passwordCheckData && 'error' in passwordCheckData && (
            <div className="text-red-10 text-sm font-bold">
              {passwordCheckData.error}
            </div>
          )}
          {passwordCheckData && 'score' in passwordCheckData && (
            <div className="flex items-center gap-1">
              {passwordCheckData.score >= 3 ? (
                <Check
                  size={16}
                  className="stroke-green-10"
                />
              ) : (
                <Plus
                  size={16}
                  className="stroke-red-10 rotate-45"
                />
              )}
              <span
                className={cn(
                  'flex-1 text-sm font-bold',
                  passwordCheckData.score >= 3 ? 'text-green-10' : 'text-red-10'
                )}>
                Your password is{' '}
                {
                  ['very weak', 'weak', 'fair', 'strong', 'very strong'][
                    passwordCheckData.score
                  ]
                }
              </span>
            </div>
          )}
          <PasswordInput
            label="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            id="confirm-password"
            autoComplete="new-password"
          />

          <div className="text-red-10 text-center text-sm">{error}</div>

          <Button
            disabled={!passwordValid}
            loading={passwordLoading}
            className="w-full"
            onClick={() => updatePassword()}>
            Set Password
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onClose()}>
            Cancel
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function TOTPModal({
  open,
  onClose,
  onResolve,
  verificationToken
}: ModalComponent<{ verificationToken: string }, boolean>) {
  const {
    data: twoFaChallenge,
    isLoading: twoFaChallengeLoading,
    error: twoFaChallengeError
  } = platform.account.security.generateTwoFactorResetChallenge.useQuery(
    {
      verificationToken
    },
    {
      enabled: open && verificationToken !== '',
      gcTime: ms('4 minutes'), // it can be cached for 5 minutes, using 4 to be safe
      staleTime: ms('5 minutes')
    }
  );

  const qrCodeSecret = twoFaChallenge?.uri
    ? twoFaChallenge.uri.match(/secret=([^&]+)/)?.[1] ?? null
    : null;

  const [twoFactorCode, setTwoFactorCode] = useState<string>('');
  const {
    mutateAsync: completeTwoFactorReset,
    isPending: twoFactorResetLoading,
    error: twoFactorResetError
  } = platform.account.security.verifyTwoFactorResetChallenge.useMutation({
    onSuccess: () => onResolve(true)
  });

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogTitle>Set up 2FA</AlertDialogTitle>
        <AlertDialogDescription>
          Setup your 2FA app and enter the code
        </AlertDialogDescription>

        <div className="flex w-full flex-col gap-2 p-2">
          {twoFaChallengeLoading && (
            <div className="flex w-full items-center justify-center gap-2">
              <span className="font-bold">Generating 2FA challenge...</span>
            </div>
          )}

          <QRCodeSVG
            value={twoFaChallenge?.uri ?? ''}
            size={200}
            className="bg-base-1 mx-auto rounded p-2"
          />

          {qrCodeSecret && (
            <div className="border-base-6 flex w-full rounded border">
              <div className="bg-muted text-base-11 text-bold flex w-[32ch] flex-1 items-center overflow-hidden truncate text-clip rounded rounded-r-none p-1 font-mono">
                {qrCodeSecret}
              </div>
              <CopyButton
                text={qrCodeSecret}
                className="bg-muted size-10 min-h-10 min-w-10 rounded rounded-l-none border-none"
              />
            </div>
          )}

          <Separator className="w-full" />
          <span className="text-center font-bold">
            Enter the 6-digit code from your 2FA app
          </span>
          <InputOTP
            maxLength={6}
            value={twoFactorCode}
            onChange={setTwoFactorCode}
            containerClassName="mx-auto w-fit">
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          <div className="text-red-10 flex text-center text-sm">
            {twoFaChallengeError?.message ?? twoFactorResetError?.message}
          </div>

          <Button
            disabled={twoFaChallengeLoading || twoFactorCode.length !== 6}
            loading={twoFactorResetLoading}
            onClick={() =>
              completeTwoFactorReset({ code: twoFactorCode, verificationToken })
            }>
            Complete 2FA Setup
          </Button>
          <Button
            variant="outline"
            onClick={() => onClose()}>
            Cancel
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RecoveryCodeModal({
  open,
  mode,
  onResolve,
  onClose,
  verificationToken
}: ModalComponent<{ mode: 'reset' | 'disable'; verificationToken: string }>) {
  const {
    mutateAsync: resetRecovery,
    isPending: resetRecoveryLoading,
    error: resetError
  } = platform.account.security.resetRecoveryCode.useMutation();
  const {
    mutateAsync: disableRecovery,
    isPending: disableRecoveryLoading,
    error: disableError
  } = platform.account.security.disableRecoveryCode.useMutation();

  const [code, setCode] = useState<string>('');

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogTitle>
          {mode === 'reset' ? 'Set up Recovery' : 'Disable Recovery'}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {mode === 'reset' ? (
            <span>
              You are going to setup/reset your Recovery Code, If you already
              had a recovery code that would be invalidated after this.
            </span>
          ) : (
            <span>Are you sure you want to disable your Recovery Code?</span>
          )}
        </AlertDialogDescription>
        <div className="flex w-full flex-col gap-2">
          <div className="text-red-10 p-1">
            {resetError?.message ?? disableError?.message}
          </div>
          {code ? (
            <Button
              className="w-full"
              onClick={() => downloadAsFile('recovery-code.txt', code)}>
              Download Again
            </Button>
          ) : (
            <Button
              className="w-full"
              loading={resetRecoveryLoading || disableRecoveryLoading}
              onClick={async () => {
                if (mode === 'reset') {
                  const { recoveryCode } = await resetRecovery({
                    verificationToken
                  });
                  downloadAsFile('recovery-code.txt', recoveryCode);
                  toast.success('Recovery Code has been downloaded');
                  setCode(recoveryCode);
                } else {
                  await disableRecovery({ verificationToken });
                  onResolve(null);
                }
              }}>
              {mode === 'reset'
                ? 'Setup/Reset Recovery Code'
                : 'Disable Recovery'}
            </Button>
          )}
          <Button
            className="w-full"
            variant="outline"
            disabled={resetRecoveryLoading || disableRecoveryLoading}
            onClick={() => (code ? onResolve(null) : onClose())}>
            {code ? 'Close' : 'Cancel'}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
