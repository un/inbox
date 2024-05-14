import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from '@/src/components/input-otp';
import TogglePasswordBox from '@/src/components/toggle-password';
import { type ModalComponent } from '@/src/hooks/use-awaitable-modal';
import useLoading from '@/src/hooks/use-loading';
import { api } from '@/src/lib/trpc';
import { Badge, Button, Dialog, Flex, Separator, Text } from '@radix-ui/themes';
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
    <Dialog.Root open={open}>
      <Dialog.Content className="w-full max-w-96 p-4">
        <Dialog.Title
          className="mx-auto w-fit py-2"
          size="3">
          Verification Needed
        </Dialog.Title>
        <Flex
          gap="3"
          direction="column"
          align="center">
          <Text size="3">
            We need to verify your identity before you can proceed changing your
            Security settings.
          </Text>
          {hasPasskey && (
            <Flex>
              <Button
                onClick={() =>
                  verifyWithPasskey({ clearError: true, clearData: true })
                }
                loading={passkeyVerificationLoading}>
                Verify with Passkey
              </Button>
            </Flex>
          )}

          {hasPasskey && hasPassword ? (
            <Flex
              align="center"
              gap="2"
              className="py-4">
              <Separator
                size="4"
                color="grass"
              />
              <Badge className="uppercase">or</Badge>
              <Separator
                size="4"
                color="grass"
              />
            </Flex>
          ) : null}

          {hasPassword && (
            <TogglePasswordBox
              passwordValue={password}
              setPasswordValue={setPassword}
              textFieldProps={{ disabled: passwordLoading }}
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
              disabled={password.length < 8}
              loading={passwordLoading}
              onClick={() => verifyWithPassword2Fa()}>
              Verify with Password
            </Button>
          )}

          {passkeyVerificationError && (
            <Text
              size="3"
              color="red">
              {passkeyVerificationError.message}
            </Text>
          )}

          {passwordError && (
            <Text
              size="3"
              color="red">
              {passwordError.message}
            </Text>
          )}

          <Button
            onClick={() => onClose()}
            className="mt-4"
            variant="soft">
            Cancel
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
