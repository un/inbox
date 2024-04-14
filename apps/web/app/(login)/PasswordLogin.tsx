'use client';

import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/input-otp';
import useLoading from '@/hooks/use-loading';
import { api } from '@/lib/trpc';
import { useRouter } from 'next/navigation';
import {
  Button,
  Dialog,
  Text,
  Flex,
  TextField,
  Tooltip,
  Checkbox
} from '@radix-ui/themes';
import { Eye, EyeOff, Key, KeyRound, User } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

export default function PasswordLoginButton() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOTP] = useState('');
  const [noOtp, setNoOtp] = useState(false);
  const [passwordShown, setPasswordShown] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const dialogCloseRef = useRef<HTMLButtonElement | null>(null);
  const router = useRouter();

  const loginValid = username.length >= 2 && password.length >= 8;
  const otpValid = otp.length === 6 || noOtp;

  const signInWithPassword = api.auth.password.signInWithPassword.useMutation();

  const {
    loading: loginLoading,
    error: passwordError,
    run: loginWithPassword
  } = useLoading(async () => {
    if (!username || !password) {
      toast.error('Username and Password are required');
      return;
    }
    const { defaultOrg } = await signInWithPassword.mutateAsync({
      username,
      password,
      twoFactorCode: noOtp ? undefined : otp
    });

    dialogCloseRef.current?.click();

    if (!defaultOrg) {
      toast.error('You are not a member of any organization', {
        description: 'Redirecting you to create an organization'
      });
      router.push('/join/org');
    }
    toast.success('Sign in successful!', {
      description: 'Redirecting you to your conversations'
    });
    router.push(`/${defaultOrg}/convo`);
  });

  return (
    <Dialog.Root
      onOpenChange={() => {
        setUsername('');
        setPassword('');
        setOTP('');
        setNoOtp(false);
        setPasswordShown(false);
        setCurrentStep(0);
      }}>
      <Dialog.Trigger>
        <Button
          size="3"
          className="w-full cursor-pointer font-semibold"
          variant="surface">
          <KeyRound size={20} />
          <Text>Login with my Password</Text>
        </Button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="450px">
        <Dialog.Title>Login with Password</Dialog.Title>
        {currentStep === 0 && (
          <Flex
            direction="column"
            gap="3">
            <label>
              <Text
                as="div"
                size="2"
                mb="1"
                weight="bold">
                Username
              </Text>
              <TextField.Root
                placeholder="Enter your username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}>
                <TextField.Slot>
                  <User size={16} />
                </TextField.Slot>
              </TextField.Root>
            </label>
            <label>
              <Text
                as="div"
                size="2"
                mb="1"
                weight="bold">
                Password
              </Text>
              <TextField.Root
                type={passwordShown ? 'text' : 'password'}
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}>
                <TextField.Slot>
                  <Tooltip content="Password length is greater or equal to 8">
                    <Key
                      size={16}
                      className="cursor-help"
                    />
                  </Tooltip>
                </TextField.Slot>
                <TextField.Slot>
                  <Button
                    variant="ghost"
                    onClick={() => setPasswordShown(!passwordShown)}>
                    {passwordShown ? <Eye size={16} /> : <EyeOff size={16} />}
                  </Button>
                </TextField.Slot>
              </TextField.Root>
            </label>
          </Flex>
        )}
        {currentStep === 1 && (
          <Flex
            direction="column"
            gap="4">
            <Text
              as="div"
              size="2"
              mb="1"
              weight="bold">
              Enter your 2FA Code
            </Text>

            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(e) => {
                setOTP(e);
              }}
              disabled={noOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>

            <Text
              as="label"
              size="2">
              <Flex
                as="span"
                gap="2"
                align="center">
                <Checkbox
                  size="1"
                  checked={noOtp}
                  onCheckedChange={() => setNoOtp(!noOtp)}
                />
                <Text
                  as="span"
                  size="1"
                  weight="medium">
                  I don't have 2FA on my account yet
                </Text>
              </Flex>
            </Text>
          </Flex>
        )}

        <Flex
          gap="3"
          mt="4"
          justify="end"
          align="center">
          {passwordError && (
            <Text
              className="flex-1"
              align="left"
              wrap="pretty"
              color="red"
              weight="bold">
              {passwordError?.message}
            </Text>
          )}
          <Dialog.Close ref={dialogCloseRef}>
            <Button
              variant="soft"
              color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          {currentStep === 1 && (
            <Button
              onClick={() => setCurrentStep(0)}
              disabled={!loginValid}
              variant="soft">
              Back
            </Button>
          )}
          {currentStep === 0 && (
            <Button
              onClick={() => setCurrentStep(1)}
              disabled={!loginValid}>
              Next
            </Button>
          )}
          {currentStep === 1 && (
            <Button
              onClick={loginWithPassword.bind(null, { clearError: true })}
              loading={loginLoading}
              disabled={loginLoading || !otpValid}>
              Login
            </Button>
          )}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
