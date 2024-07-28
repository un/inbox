'use client';

import {
  TurnstileComponent,
  turnstileEnabled
} from '@/src/components/turnstile';
import { PasskeyCard, PasswordCard } from './_components/secure-cards';
import { Separator } from '@/src/components/shadcn-ui/separator';
import { startRegistration } from '@simplewebauthn/browser';
import { Button } from '@/src/components/shadcn-ui/button';
import { useCallback, useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useCookies } from 'next-client-cookies';
import Stepper from '../_components/stepper';
import { useRouter } from 'next/navigation';
import { At } from '@phosphor-icons/react';
import { useForm } from 'react-hook-form';
import { platform } from '@/src/lib/trpc';
import Image from 'next/image';
import { toast } from 'sonner';
import { z } from 'zod';

type PasskeyCreationOptions = Parameters<typeof startRegistration>[0];

const passwordFormSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  validated: z.boolean()
});

export default function Page() {
  const cookies = useCookies();
  const username = cookies.get('un-join-username');
  const [selectedAuth, setSelectedAuth] = useState<'passkey' | 'password'>(
    'passkey'
  );
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const router = useRouter();
  const form = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
      validated: false
    }
  });
  const formValid = form.watch('validated');
  const {
    mutateAsync: signUpWithPassword,
    isPending: signUpWithPasswordPending
  } = platform.auth.password.signUpWithPassword.useMutation();
  const { mutateAsync: startPasskey, isPending: passkeyOptionsPending } =
    platform.auth.passkey.signUpWithPasskeyStart.useMutation();
  const { mutateAsync: finishPasskey, isPending: signUpWithPasskeyPending } =
    platform.auth.passkey.signUpWithPasskeyFinish.useMutation();
  const { mutateAsync: registerPasskey, isPending: registerPasskeyPending } =
    useMutation({
      mutationFn: (options: PasskeyCreationOptions) =>
        startRegistration(options),
      onError: (error) => {
        if (error.name === 'NotAllowedError') {
          toast.error('Passkey verification was timed out or cancelled');
        }
      }
    });

  useEffect(() => {
    if (!username) router.replace('/join');
  }, [username, router]);

  const createAccount = useCallback(async () => {
    if (turnstileEnabled && !turnstileToken) {
      return toast.error('Turnstile token not found');
    }
    if (!username) return;
    if (selectedAuth === 'passkey') {
      const { options, publicId } = await startPasskey({
        turnstileToken,
        username
      });
      const response = await registerPasskey(options);
      const { success, error } = await finishPasskey({
        username,
        publicId,
        registrationResponseRaw: response
      })
        .then(({ success }) => ({
          success,
          error: null
        }))
        .catch((error) => ({
          success: false,
          error: (error as Error).message
        }));
      if (!success)
        return toast.error('Failed to create account', { description: error });
    } else {
      if (!formValid) return;
      const { success, error } = await signUpWithPassword({
        turnstileToken,
        username,
        password: form.getValues('password')
      })
        .then(({ success }) => ({
          success,
          error: null
        }))
        .catch((error) => ({
          success: false,
          error: (error as Error).message
        }));

      if (!success)
        return toast.error('Failed to create account', { description: error });
    }

    toast.success(
      'Your account has been created! Redirecting for Organization Creation'
    );
    router.push('/join/org');
  }, [
    turnstileToken,
    username,
    selectedAuth,
    router,
    startPasskey,
    registerPasskey,
    finishPasskey,
    formValid,
    signUpWithPassword,
    form
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[416px] flex-col gap-5 p-2">
      <div className="flex items-center justify-between">
        <Image
          src="/logo.png"
          alt="UnInbox Logo"
          height={40}
          width={40}
          className="rounded-xl"
        />
        <Stepper
          step={2}
          total={4}
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-base-12 flex items-center gap-2 text-2xl font-medium">
          <span className="whitespace-nowrap">Secure your account</span>
          <div className="border-base-5 shadow-base-4 text-base-12 flex w-fit items-center gap-1 rounded-xl border px-2 py-[6px] text-sm shadow-sm">
            <At
              size={16}
              className="size-4"
            />
            <span className="overflow-hidden whitespace-nowrap">
              {username}
            </span>
          </div>
        </div>

        <span className="text-base-11 text-pretty text-base">
          This will be your username across the whole Un ecosystem. It&apos;s
          yours personally and can join as many organizations as you want.
        </span>
      </div>

      <div className="flex w-full flex-col gap-1">
        <div className="w-full text-start font-medium">
          How do you want to secure your account?
        </div>
      </div>
      <div className="flex w-full flex-wrap gap-2">
        <PasskeyCard
          selected={selectedAuth}
          setSelected={setSelectedAuth}
        />
        <div className="flex w-full items-center justify-center gap-[10px]">
          <Separator className="bg-base-6 flex-1" />
          <span className="text-base-11 text-xs font-semibold uppercase">
            or
          </span>
          <Separator className="bg-base-6 flex-1" />
        </div>
        <PasswordCard
          selected={selectedAuth}
          setSelected={setSelectedAuth}
          form={form}
        />
      </div>
      <TurnstileComponent onSuccess={setTurnstileToken} />
      <Button
        onClick={() =>
          createAccount().catch((err: Error) => {
            if (err.name === 'NotAllowedError') return;
            toast.error('Something went wrong', {
              description: err.message
            });
          })
        }
        loading={
          passkeyOptionsPending ||
          registerPasskeyPending ||
          signUpWithPasskeyPending ||
          signUpWithPasswordPending
        }
        disabled={
          (turnstileEnabled && !turnstileToken) ||
          (selectedAuth === 'password' && !formValid)
        }>
        Create my account
      </Button>
    </div>
  );
}
