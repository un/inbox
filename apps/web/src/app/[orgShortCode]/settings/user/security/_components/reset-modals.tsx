import {
  AlertDialog as Dialog, // Alert Dialogs don't close on outside click
  Flex,
  Button,
  Text,
  Spinner,
  Tooltip,
  TextField,
  Separator
} from '@radix-ui/themes';
import { type ModalComponent } from '@/src/hooks/use-awaitable-modal';
import { useEffect, useState, Suspense, memo } from 'react';
import { api } from '@/src/lib/trpc';
import useLoading from '@/src/hooks/use-loading';
import { Check, Plus, Question } from '@phosphor-icons/react';
import TogglePasswordBox from '@/src/components/toggle-password';
import { useDebounce } from '@uidotdev/usehooks';
import { toDataURL } from 'qrcode';
import CopyButton from '@/src/components/copy-button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot
} from '@/src/components/shadcn-ui/input-otp';
import { ms } from '@u22n/utils/ms';
import Image from 'next/image';
import { downloadAsFile } from '@/src/lib/utils';
import { toast } from 'sonner';

export function PasswordModal({
  open,
  onClose,
  onResolve,
  verificationToken
}: ModalComponent<{ verificationToken: string }, boolean>) {
  const [password, setPassword] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [confirmPassword, setConfirmPassword] = useState<string>(
    password ?? ''
  );
  const debouncedPassword = useDebounce(password, 1000);

  const checkPasswordStrength =
    api.useUtils().auth.signup.checkPasswordStrength;

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

  const setPasswordApi = api.account.security.resetPassword.useMutation();
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
    <Dialog.Root open={open}>
      <Dialog.Content className="w-full max-w-96 p-4">
        <Dialog.Title className="mx-auto w-fit">Set your Password</Dialog.Title>
        <Dialog.Description>
          <Text
            weight="bold"
            size="2"
            align="center"
            className="p-2">
            Choose a Password
          </Text>
        </Dialog.Description>

        <Flex
          className="w-full p-2"
          direction="column"
          gap="4">
          <TogglePasswordBox
            passwordValue={password}
            setPasswordValue={setPassword}
            textFieldProps={{
              autoComplete: 'new-password',
              id: 'password',
              color: passwordCheckData
                ? 'error' in passwordCheckData || passwordCheckData.score < 3
                  ? 'red'
                  : 'green'
                : undefined
            }}
            label="Password"
          />
          {passwordCheckLoading && (
            <Flex
              align="center"
              gap="2"
              className="w-full">
              <Spinner loading />
              <Text
                size="2"
                weight="bold">
                Checking password strength
              </Text>
            </Flex>
          )}
          {passwordCheckData && 'error' in passwordCheckData && (
            <Text
              size="2"
              color="red"
              weight="bold">
              {passwordCheckData.error}
            </Text>
          )}
          {passwordCheckData && 'score' in passwordCheckData && (
            <Flex
              gap="1"
              align="center">
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
              <Text
                size="2"
                weight="bold"
                className="flex-1"
                color={passwordCheckData.score >= 3 ? 'green' : 'red'}>
                Your password is{' '}
                {
                  ['very weak', 'weak', 'fair', 'strong', 'very strong'][
                    passwordCheckData.score
                  ]
                }
              </Text>
              <Tooltip
                content={
                  <Text size="2">
                    It would take a computer {passwordCheckData.crackTime} to
                    crack it
                  </Text>
                }>
                <Question />
              </Tooltip>
            </Flex>
          )}
          <TogglePasswordBox
            passwordValue={confirmPassword}
            setPasswordValue={setConfirmPassword}
            textFieldProps={{
              id: 'confirm-password',
              color:
                confirmPassword && confirmPassword.length > 0
                  ? password === confirmPassword
                    ? 'green'
                    : 'red'
                  : undefined
            }}
            label="Confirm Password"
          />

          <Text
            as="div"
            size="2"
            color="red"
            className="text-center">
            {error}
          </Text>

          <Button
            size="2"
            disabled={!passwordValid}
            loading={passwordLoading}
            onClick={() => updatePassword()}>
            Set Password
          </Button>
          <Button
            variant="soft"
            color="gray"
            size="2"
            onClick={() => onClose()}>
            Cancel
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
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
  } = api.account.security.generateTwoFactorResetChallenge.useQuery(
    {
      verificationToken
    },
    {
      enabled: open && verificationToken !== '',
      cacheTime: ms('4 minutes'), // it can be cached for 5 minutes, using 4 to be safe
      staleTime: ms('5 minutes')
    }
  );

  const qrCodeSecret = twoFaChallenge?.uri
    ? twoFaChallenge.uri.match(/secret=([^&]+)/)?.[1] ?? null
    : null;

  const [twoFactorCode, setTwoFactorCode] = useState<string>('');
  const {
    mutateAsync: completeTwoFactorReset,
    isLoading: twoFactorResetLoading,
    error: twoFactorResetError
  } = api.account.security.verifyTwoFactorResetChallenge.useMutation({
    onSuccess: () => onResolve(true)
  });

  return (
    <Dialog.Root open={open}>
      <Dialog.Content className="w-full max-w-96 p-4">
        <Dialog.Title className="mx-auto w-fit">Set up 2FA</Dialog.Title>
        <Dialog.Description className="mx-auto flex w-fit p-2 text-center text-sm font-bold">
          Setup your 2FA app and enter the code
        </Dialog.Description>

        <div className="flex w-full flex-col gap-2 p-2">
          {twoFaChallengeLoading && (
            <div className="flex w-full items-center justify-center gap-2">
              <Spinner loading />
              <span className="font-bold">Generating 2FA challenge</span>
            </div>
          )}

          <MemoizedQrCode text={twoFaChallenge?.uri} />

          {qrCodeSecret && (
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
          )}

          <Separator size="4" />
          <span className="text-center font-bold">
            Enter the 6-digit code from your 2FA app
          </span>
          <InputOTP
            maxLength={6}
            value={twoFactorCode}
            onChange={setTwoFactorCode}
            containerClassName="mx-auto">
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          <div className="text-red-10 flex text-center text-sm">
            {twoFaChallengeError?.message ?? twoFactorResetError?.message}
          </div>

          <Button
            size="2"
            disabled={twoFaChallengeLoading || twoFactorCode.length !== 6}
            loading={twoFactorResetLoading}
            onClick={() =>
              completeTwoFactorReset({ code: twoFactorCode, verificationToken })
            }>
            Complete 2FA Setup
          </Button>
          <Button
            variant="soft"
            color="gray"
            size="2"
            onClick={() => onClose()}>
            Cancel
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

export function RecoveryCodeModal({
  open,
  mode,
  onResolve,
  onClose,
  verificationToken
}: ModalComponent<{ mode: 'reset' | 'disable'; verificationToken: string }>) {
  const {
    mutateAsync: resetRecovery,
    isLoading: resetRecoveryLoading,
    error: resetError
  } = api.account.security.resetRecoveryCode.useMutation();
  const {
    mutateAsync: disableRecovery,
    isLoading: disableRecoveryLoading,
    error: disableError
  } = api.account.security.disableRecoveryCode.useMutation();

  const [code, setCode] = useState<string>('');

  return (
    <Dialog.Root open={open}>
      <Dialog.Content className="w-full max-w-96 p-4">
        <Dialog.Title className="mx-auto w-fit">
          {mode === 'reset' ? 'Set up Recovery' : 'Disable Recovery'}
        </Dialog.Title>
        <Dialog.Description className="mx-auto flex w-fit text-balance p-2 text-center text-sm font-bold">
          {mode === 'reset' ? (
            <span>
              You are going to setup/reset your Recovery Code, If you already
              had a recovery code that would be invalidated after this.
            </span>
          ) : (
            <span>Are you sure you want to disable your Recovery Code?</span>
          )}
        </Dialog.Description>
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
            variant="soft"
            disabled={resetRecoveryLoading || disableRecoveryLoading}
            color="gray"
            onClick={() => (code ? onResolve(null) : onClose())}>
            {code ? 'Close' : 'Cancel'}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
