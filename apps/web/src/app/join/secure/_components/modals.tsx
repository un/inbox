import {
  AlertDialog as Dialog, // Alert Dialogs don't close on outside click
  Flex,
  Button,
  Text,
  Spinner,
  Tooltip,
  Box,
  TextField,
  Separator,
  Card
} from '@radix-ui/themes';
import { type ModalComponent } from '@/src/hooks/use-awaitable-modal';
import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import { api } from '@/src/lib/trpc';
import useLoading from '@/src/hooks/use-loading';
import { startRegistration } from '@simplewebauthn/browser';
import { Check, Plus, Fingerprint, Question } from '@phosphor-icons/react';
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
import { downloadAsFile } from '@/src/lib/utils';
import Image from 'next/image';

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
    <Dialog.Root
      open={open}
      onOpenChange={() => {
        if (open) onClose();
      }}>
      <Dialog.Content className="w-full max-w-96 p-4">
        <Dialog.Title className="mx-auto w-fit py-4">
          Sign up with Passkey
        </Dialog.Title>
        <Flex
          gap="2"
          justify="center">
          <Spinner loading={loading && !error} />
          <Text
            as="div"
            size="2"
            mb="1"
            weight="bold">
            {state}
          </Text>
        </Flex>

        <Flex
          className="w-full p-2"
          direction="column"
          gap="4">
          <Button
            loading={loading}
            size="3"
            className="mx-auto my-4"
            onClick={() => run()}>
            <Fingerprint size={20} />
            <Text>Use your Passkey</Text>
          </Button>
          <Button
            variant="soft"
            color="gray"
            size="3"
            onClick={() => onClose()}>
            Cancel
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
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
    <Dialog.Root
      open={open}
      onOpenChange={() => {
        if (open) onClose();
      }}>
      <Dialog.Content className="w-full max-w-96 p-4">
        <Dialog.Title className="mx-auto w-fit">
          Sign up with Password
        </Dialog.Title>
        <Dialog.Description>
          <Text
            weight="bold"
            size="2"
            align="center"
            className="p-2">
            {step === 1 ? 'Choose a password' : 'Setup 2FA'}
          </Text>
        </Dialog.Description>
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
      </Dialog.Content>
    </Dialog.Root>
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
                It would take a computer {passwordCheckData.crackTime} to crack
                it
              </Text>
            }>
            <Question size={14} />
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
        onClick={() => setStep(2)}>
        Next
      </Button>
      <Button
        variant="soft"
        color="gray"
        size="2"
        onClick={() => onClose()}>
        Cancel
      </Button>
    </Flex>
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
  const [qrCode, setQrCode] = useState<string | null>(null);

  const twoFaChallenge =
    api.useUtils().auth.twoFactorAuthentication.createTwoFactorChallenge;
  const signUpWithPassword =
    api.auth.password.signUpWithPassword2FA.useMutation();

  const {
    data: twoFaData,
    loading: twoFaLoading,
    run: generate2Fa
  } = useLoading(
    async (signal) => {
      return await twoFaChallenge
        .fetch({ username }, { signal })
        .catch((e: Error) => {
          setError(e);
          throw e;
        });
    },
    {
      onSuccess({ uri }) {
        void toDataURL(uri, { margin: 3 }).then((qr) => setQrCode(qr));
      }
    }
  );

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
    <Flex
      className="w-full p-2"
      direction="column"
      gap="4">
      {twoFaLoading && (
        <Flex
          align="center"
          gap="2"
          className="w-full">
          <Spinner loading />
          <Text
            size="2"
            weight="bold">
            Generating 2FA challenge
          </Text>
        </Flex>
      )}

      {twoFaData && !twoFaLoading && (
        <Flex
          className="w-full"
          direction="column"
          gap="4">
          <Text
            size="2"
            weight="bold">
            Scan this QR code with your 2FA app
          </Text>
          <Box className="mx-auto w-full max-w-48">
            <>
              {qrCode && (
                <Image
                  src={qrCode}
                  width={200}
                  height={200}
                  alt="QrCode for 2FA"
                  className="w-fit rounded"
                />
              )}
            </>
          </Box>

          <TextField.Root
            defaultValue={totpSecret}
            readOnly
            className="w-full font-mono"
            size="3">
            <TextField.Slot className="p-1" />
            <TextField.Slot>
              <CopyButton text={totpSecret} />
            </TextField.Slot>
          </TextField.Root>

          <Separator size="4" />
          <Flex
            gap="2"
            direction="column">
            <Text
              size="2"
              weight="bold">
              Enter the 6-digit code from your 2FA app
            </Text>
            <InputOTP
              maxLength={6}
              value={twoFactorCode}
              onChange={setTwoFactorCode}>
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
          </Flex>

          {error && (
            <Text
              size="2"
              color="red"
              weight="bold">
              {error.message}
            </Text>
          )}
        </Flex>
      )}

      <Button
        size="2"
        disabled={!inputValid}
        loading={signUpLoading}
        onClick={() => signUp({ clearData: true, clearError: true })}>
        Finish
      </Button>
      <Button
        variant="soft"
        color="gray"
        size="2"
        onClick={() => setStep(1)}>
        Back
      </Button>
    </Flex>
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
    <Dialog.Root open={open}>
      <Dialog.Content className="w-full max-w-96 p-4">
        <Dialog.Title className="mx-auto w-fit py-2">
          Recovery Code
        </Dialog.Title>
        <Flex
          className="w-full p-2"
          direction="column"
          gap="4">
          <Text
            size="2"
            weight="bold"
            align="center">
            Save this recovery code in a safe place, without this code you would
            not be able to recover your account
          </Text>
          <Card>
            <div className="flex gap-1">
              <Text className="w-full break-words font-mono">
                {recoveryCode}
              </Text>
              <CopyButton
                text={recoveryCode}
                onCopy={() => {
                  setDownloaded(true);
                }}
              />
            </div>
          </Card>
          <Button
            size="2"
            onClick={() => {
              downloadAsFile(`${username}-recovery-code.txt`, recoveryCode);
              setDownloaded(true);
            }}>
            {!downloaded ? 'Download' : 'Download Again'}
          </Button>
          <Button
            size="2"
            disabled={!downloaded}
            onClick={() => onResolve(null)}>
            Close
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
