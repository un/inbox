'use client';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from '@/src/components/shadcn-ui/form';
import {
  TurnstileComponent,
  turnstileEnabled
} from '@/src/components/turnstile';
import { TwoFactorDialog } from './_components/two-factor-dialog';
import { Separator } from '@/src/components/shadcn-ui/separator';
import { PasswordInput } from '@/src/components/password-input';
import { startAuthentication } from '@simplewebauthn/browser';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/src/components/shadcn-ui/button';
import { Badge } from '@/src/components/shadcn-ui/badge';
import { Input } from '@/src/components/shadcn-ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { zodSchemas } from '@u22n/utils/zodSchemas';
import { Fingerprint } from '@phosphor-icons/react';
import { useMutation } from '@tanstack/react-query';
import { At, Lock } from '@phosphor-icons/react';
import { useForm } from 'react-hook-form';
import { platform } from '@/src/lib/trpc';
import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import Link from 'next/link';
import { z } from 'zod';

const loginSchema = z.object({
  username: zodSchemas.username(2),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export default function Page() {
  const router = useRouter();
  const [twoFactorDialogOpen, setTwoFactorDialogOpen] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect_to');

  const { mutateAsync: generatePasskeyChallenge } =
    platform.auth.passkey.generatePasskeyChallenge.useMutation({
      onError: () => void 0
    });
  const { mutateAsync: loginPasskey } =
    platform.auth.passkey.verifyPasskey.useMutation({ onError: () => void 0 });
  const { mutateAsync: loginPassword, error: passwordError } =
    platform.auth.password.signIn.useMutation({ onError: () => void 0 });

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: ''
    }
  });

  const { mutate: loginWithPasskey, isPending: loadingPasskey } = useMutation({
    mutationFn: async () => {
      if (turnstileEnabled && !turnstileToken) {
        toast.error(
          'Captcha has not been completed yet, if you can see the Captcha, complete it manually'
        );
        return;
      }

      const { options } = await generatePasskeyChallenge({
        turnstileToken
      });

      const passkeyResponse = await startAuthentication(options).catch(
        (error) => {
          if (error instanceof Error) {
            if (error.name === 'NotAllowedError') {
              toast.warning('Passkey login either timed out or was cancelled');
            } else {
              toast.error(
                'Something went wrong while trying to get passkey response'
              );
            }
          }
        }
      );

      if (!passkeyResponse) return;

      const { defaultOrg } = await loginPasskey({
        verificationResponseRaw: passkeyResponse
      });

      if (redirectTo) {
        router.replace(decodeURIComponent(redirectTo));
      }

      if (!defaultOrg) {
        toast.error('You are not a member of any organization', {
          description: 'Redirecting you to create an organization'
        });
        router.replace('/join/org');
      } else {
        toast.success('Sign in successful!', {
          description: 'Redirecting you to your conversations'
        });
        router.replace(`/${defaultOrg}/personal/convo`);
      }
    }
  });

  const { mutate: loginWithPassword, isPending: loadingPassword } = useMutation(
    {
      mutationFn: async ({
        username,
        password
      }: z.infer<typeof loginSchema>) => {
        if (turnstileEnabled && !turnstileToken) {
          toast.error(
            'Captcha has not been completed yet, if you can see the Captcha, complete it manually'
          );
          return;
        }

        const { status, defaultOrgShortcode } = await loginPassword({
          username,
          password,
          turnstileToken
        });

        if (status === 'NO_2FA_SETUP') {
          if (redirectTo) {
            router.replace(decodeURIComponent(redirectTo));
          }
          if (!defaultOrgShortcode) {
            router.replace('/join/org');
          } else {
            router.replace(`/${defaultOrgShortcode}/personal/convo`);
          }
        } else {
          setTwoFactorDialogOpen(true);
        }
      }
    }
  );

  return (
    <div className="bg-base-2 flex h-full items-center justify-center">
      <div className="-mt-4 text-start">
        <Image
          src="/logo.png"
          alt="UnInbox Logo"
          height={40}
          width={40}
          className="mb-5 rounded-xl"
        />
        <h1 className="mb-2 text-2xl font-medium">Login to your UnInbox</h1>
        <div className="py-6">
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => loginWithPasskey()}
              loading={loadingPasskey}
              disabled={loadingPasskey || (turnstileEnabled && !turnstileToken)}
              className="mb-2 w-full cursor-pointer gap-2 font-semibold">
              <Fingerprint size={20} />
              <span>Login with my passkey</span>
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2 py-4">
            <Separator className="bg-base-5 w-28" />
            <Badge
              className="uppercase"
              variant="outline">
              or
            </Badge>
            <Separator className="bg-base-5 w-28" />
          </div>
          <h2 className="text-base-10 text-sm">Enter your details to login.</h2>
          <div className="flex flex-col items-center justify-center gap-4 py-2">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((values) =>
                  loginWithPassword(values)
                )}
                className="flex w-full flex-col items-center justify-center gap-3">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          label="Username"
                          {...field}
                          leadingSlot={At}
                          inputSize="lg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <PasswordInput
                          label="Password"
                          {...field}
                          leadingSlot={Lock}
                          inputSize="lg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {passwordError && (
                  <div className="text-red-10 text-sm">
                    {passwordError.message}
                  </div>
                )}

                <Button
                  className="w-full"
                  loading={loadingPassword}
                  type="submit">
                  Login
                </Button>
              </form>
            </Form>
          </div>
          <TurnstileComponent onSuccess={setTurnstileToken} />
        </div>
        <div className="text-base-10 flex flex-col gap-2 text-sm">
          <Link
            href="/recovery/reset-password/request"
            className="font-semibold underline underline-offset-4">
            Recover my Account
          </Link>
          <p>
            Not a member yet?
            <Link
              href="/join"
              className="text-accent-9 pl-1 font-medium underline underline-offset-2">
              Join instead
            </Link>
          </p>
        </div>
      </div>
      <TwoFactorDialog open={twoFactorDialogOpen} />
    </div>
  );
}
