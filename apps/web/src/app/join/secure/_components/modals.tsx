import { Button } from '@/src/components/shadcn-ui/button';
import { Separator } from '@/src/components/shadcn-ui/separator';
import {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription
} from '@/src/components/shadcn-ui/alert-dialog';
import { type ModalComponent } from '@/src/hooks/use-awaitable-modal';
import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import { api } from '@/src/lib/trpc';
import useLoading from '@/src/hooks/use-loading';
import { startRegistration } from '@simplewebauthn/browser';
import { Check, Plus, Fingerprint } from '@phosphor-icons/react';
import { TogglePasswordBox } from '@/src/components/toggle-password';
import { useDebounce } from '@uidotdev/usehooks';
import { QRCodeSVG } from 'qrcode.react';
import { CopyButton } from '@/src/components/copy-button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from '@/src/components/shadcn-ui/input-otp';
import { cn, downloadAsFile } from '@/src/lib/utils';

export function PasskeyModal({
  open,
  onClose,
  onResolve,
  username
}: ModalComponent<{ username: string }>) {
  const [state, setState] = useState<string | null>(null);

  const getPasskeyChallenge =
    api.useUtils().auth.passkey.signUpWithPasskeyStart;
  const verifyPasskeyChallenge =
    api.auth.passkey.signUpWithPasskeyFinish.useMutation();

  const { error, loading, run } = useLoading(async () => {
    setState('Getting a passkey challenge from server');
    const { options, publicId } = await getPasskeyChallenge.fetch({
      username
    });
    setState('Waiting for your passkey to respond');
    const passkeyData = await startRegistration(options).catch((e: Error) => {
      if (e.name === 'NotAllowedError') {
        e.message = 'Passkey verification was timed out or cancelled';
      }
      throw e;
    });
    setState("Verifying your passkey's response");
    await verifyPasskeyChallenge.mutateAsync({
      username,
      publicId,
      registrationResponseRaw: passkeyData
    });
    onResolve(null);
  });

  useEffect(() => {
    if (error) {
      setState(error.message);
    }
  }, [error]);

  return (
    <AlertDialog
      open={open}
      onOpenChange={() => {
        if (open) onClose();
      }}>
      <AlertDialogPortal>
        <AlertDialogContent>
          <AlertDialogTitle>Sign up with Passkey</AlertDialogTitle>
          <AlertDialogDescription>
            Press the button below to use your passkey to sign up
          </AlertDialogDescription>
          <div className="text-pretty p-2 text-center text-sm font-bold">
            {state}
          </div>
          <div className="flex w-full flex-col gap-2 p-2">
            <Button
              loading={loading}
              className="mx-auto w-full gap-1"
              onClick={() => run()}>
              <Fingerprint size={20} />
              <span>Use your Passkey</span>
            </Button>
            <Button
              variant="outline"
              className="mx-auto w-full"
              onClick={() => onClose()}>
              Cancel
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialog>
  );
}

export function PasswordModal({
  open,
  onClose,
  onResolve,
  username
}: ModalComponent<{ username: string }, { recoveryCode: string }>) {
  const [password, setPassword] = useState<string>();
  const [twoFactorCode, setTwoFactorCode] = useState<string>('');
  const [step, setStep] = useState(1);

  return (
    <AlertDialog
      open={open}
      onOpenChange={() => {
        if (open) onClose();
      }}>
      <AlertDialogPortal>
        <AlertDialogContent>
          <AlertDialogTitle>Sign up with Password</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="p-2 font-bold">
              {step === 1 ? 'Choose a password' : 'Setup 2FA'}
            </span>
          </AlertDialogDescription>
          {step === 1 && (
            <PasswordModalStep1
              password={password}
              setPassword={setPassword}
              onClose={onClose}
              setStep={setStep}
            />
          )}
          {step === 2 && (
            <PasswordModalStep2
              username={username}
              password={password}
              twoFactorCode={twoFactorCode}
              setTwoFactorCode={setTwoFactorCode}
              onResolve={onResolve}
              setStep={setStep}
            />
          )}
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialog>
  );
}

const PasswordModalStep1 = ({
  password,
  setPassword,
  onClose,
  setStep
}: {
  password?: string;
  setPassword: Dispatch<SetStateAction<string | undefined>>;
  onClose: () => void;
  setStep: Dispatch<SetStateAction<number>>;
}) => {
  const [error, setError] = useState<string | null>(null);
  const [confirmPassword, setConfirmPassword] = useState<string>(
    password ?? ''
  );
  const debouncedPassword = useDebounce(password, 1000);

  const checkPasswordStrength =
    api.useUtils().auth.signup.checkPasswordStrength;

  const {
    data: passwordCheckData,
    error: passwordCheckError,
    loading: passwordCheckLoading,
    run: checkPassword
  } = useLoading(async (signal) => {
    if (!password) return;
    if (password.length < 8) {
      return { error: 'Password must be at least 8 characters long' };
    }
    return await checkPasswordStrength.fetch({ password }, { signal });
  });

  useEffect(() => {
    if (passwordCheckError) {
      setError(passwordCheckError.message);
    }
  }, [passwordCheckError]);

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

  return (
    <div className="flex w-full flex-col gap-2 p-2">
      <TogglePasswordBox
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        id="password"
        placeholder="Password"
      />
      {passwordCheckLoading && (
        <div className="text-muted-foreground w-full text-sm font-bold">
          Checking password strength...
        </div>
      )}

      {passwordCheckData && 'error' in passwordCheckData && (
        <div className="text-red-10 w-full text-sm font-bold">
          {passwordCheckData.error}
        </div>
      )}

      {passwordCheckData && 'score' in passwordCheckData && (
        <div className="flex items-center gap-1">
          {passwordCheckData.score >= 3 ? (
            <Check
              size={16}
              className="text-green-10"
            />
          ) : (
            <Plus
              size={16}
              className="text-red-10 rotate-45"
            />
          )}
          <div
            className={cn(
              'text-red-10 w-full flex-1 text-sm font-bold',
              passwordCheckData.score >= 3 ? 'text-green-10' : 'text-red-10'
            )}>
            Your password is{' '}
            {
              ['very weak', 'weak', 'fair', 'strong', 'very strong'][
                passwordCheckData.score
              ]
            }
          </div>
        </div>
      )}
      <TogglePasswordBox
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        id="confirm-password"
        placeholder="Confirm Password"
      />

      <div className="text-red-10 text-center text-sm">{error}</div>

      <Button
        disabled={!passwordValid}
        onClick={() => setStep(2)}>
        Next
      </Button>
      <Button
        variant="outline"
        onClick={() => onClose()}>
        Cancel
      </Button>
    </div>
  );
};

const PasswordModalStep2 = ({
  username,
  password,
  twoFactorCode,
  setTwoFactorCode,
  onResolve,
  setStep
}: {
  username: string;
  password?: string;
  twoFactorCode: string;
  setTwoFactorCode: Dispatch<SetStateAction<string>>;
  onResolve: (e: { recoveryCode: string }) => void;
  setStep: Dispatch<SetStateAction<number>>;
}) => {
  const [error, setError] = useState<Error | null>(null);

  const twoFaChallenge =
    api.useUtils().auth.twoFactorAuthentication.createTwoFactorChallenge;
  const signUpWithPassword =
    api.auth.password.signUpWithPassword2FA.useMutation();

  const {
    data: twoFaData,
    loading: twoFaLoading,
    run: generate2Fa
  } = useLoading(async (signal) => {
    return await twoFaChallenge
      .fetch({ username }, { signal })
      .catch((e: Error) => {
        setError(e);
        throw e;
      });
  });

  const totpSecret = twoFaData
    ? twoFaData.uri.match(/secret=([^&]+)/)?.[1] ?? ''
    : '';

  const { loading: signUpLoading, run: signUp } = useLoading(async () => {
    if (!password || twoFactorCode.length !== 6) return;
    const data = await signUpWithPassword.mutateAsync({
      username,
      password,
      twoFactorCode
    });

    if (data.success) {
      onResolve({
        recoveryCode: data.recoveryCode!
      });
    } else {
      setError(new Error(data.error ?? 'An unknown error occurred'));
    }
  });

  useEffect(() => {
    generate2Fa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inputValid = Boolean(password) && twoFactorCode.length === 6;

  return (
    <div className="flex w-full flex-col gap-2 p-2">
      {twoFaLoading && (
        <div className="text-muted-foreground w-full font-bold">
          Generating 2FA challenge
        </div>
      )}

      {twoFaData && !twoFaLoading && (
        <div className="flex w-full flex-col gap-4">
          <div className="text-bold text-sm">
            Scan this QR code with your 2FA app
          </div>
          <div className="mx-auto w-full max-w-48">
            <>
              {twoFaData && (
                <QRCodeSVG
                  value={twoFaData.uri}
                  size={200}
                  className="mx-auto rounded bg-white p-2"
                />
              )}
            </>
          </div>

          <div className="border-muted/80 flex rounded border">
            <div className="bg-muted text-muted-foreground text-bold flex w-[32ch] flex-1 items-center overflow-hidden truncate text-clip rounded rounded-r-none p-1 font-mono">
              {totpSecret}
            </div>
            <CopyButton
              text={totpSecret}
              className="bg-muted size-10 min-h-10 min-w-10 rounded rounded-l-none border-none"
            />
          </div>

          <Separator className="w-full" />
          <div className="mx-auto flex w-fit flex-col gap-1">
            <label
              htmlFor="code"
              className="text-xs font-bold">
              Two Factor Code
            </label>
            <InputOTP
              id="code"
              maxLength={6}
              value={twoFactorCode}
              onChange={setTwoFactorCode}>
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
        </div>
      )}

      <Button
        disabled={!inputValid || signUpLoading}
        loading={signUpLoading}
        onClick={() => signUp({ clearData: true, clearError: true })}>
        Finish
      </Button>
      <Button
        variant="outline"
        onClick={() => setStep(1)}>
        Back
      </Button>
    </div>
  );
};

export function RecoveryCodeModal({
  open,
  onResolve,
  recoveryCode,
  username
}: ModalComponent<{ username: string; recoveryCode: string }>) {
  const [downloaded, setDownloaded] = useState(false);

  return (
    <AlertDialog open={open}>
      <AlertDialogPortal>
        <AlertDialogContent>
          <AlertDialogTitle>Recovery Code</AlertDialogTitle>
          <div className="flex w-full flex-col gap-4 p-2">
            <div className="text-pretty text-center text-sm font-bold">
              Save this recovery code in a safe place, without this code you
              would not be able to recover your account
            </div>
            <div className="bg-card rounded border">
              <div className="flex gap-1">
                <div className="w-full break-words font-mono">
                  {recoveryCode}
                </div>
                <CopyButton
                  text={recoveryCode}
                  onCopy={() => {
                    setDownloaded(true);
                  }}
                />
              </div>
            </div>
            <Button
              onClick={() => {
                downloadAsFile(`${username}-recovery-code.txt`, recoveryCode);
                setDownloaded(true);
              }}>
              {!downloaded ? 'Download' : 'Download Again'}
            </Button>
            <Button
              variant="outline"
              disabled={!downloaded}
              onClick={() => onResolve(null)}>
              Close
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialog>
  );
}
