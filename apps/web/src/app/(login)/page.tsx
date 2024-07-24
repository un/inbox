'use client';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from '@/src/components/shadcn-ui/form';
import { Button } from '@/src/components/shadcn-ui/button';
import { Separator } from '@/src/components/shadcn-ui/separator';
import { Badge } from '@/src/components/shadcn-ui/badge';
import { PasskeyLoginButton } from './_components/passkey-login';
import { At, Lock } from '@phosphor-icons/react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodSchemas } from '@u22n/utils/zodSchemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/src/components/shadcn-ui/input';
import { PasswordInput } from '@/src/components/password-input';
import {
  TurnstileComponent,
  turnstileEnabled
} from '@/src/components/turnstile';
import { platform } from '@/src/lib/trpc';
import { useState } from 'react';
import { TwoFactorDialog } from './_components/two-factor-dialog';

const loginSchema = z.object({
  username: zodSchemas.username(2),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  turnstileToken: turnstileEnabled
    ? z.string({
        required_error:
          'Waiting for Captcha. If you can see the Captcha, complete it manually'
      })
    : z.undefined()
});

export default function Page() {
  const router = useRouter();
  const [twoFactorDialogOpen, setTwoFactorDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: ''
    }
  });

  const {
    mutateAsync: login,
    error,
    isPending
  } = platform.auth.password.signIn.useMutation();

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    try {
      const { status, defaultOrgShortcode } = await login(values);
      if (status === 'NO_2FA_SETUP') {
        if (!defaultOrgShortcode) {
          router.push('/join/org');
        } else {
          router.push(
            `/${defaultOrgShortcode}/settings/user/security?code=NO_2FA_SETUP`
          );
        }
      } else {
        setTwoFactorDialogOpen(true);
      }
    } catch {
      /* do nothing */
    }
  };

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
        <h2 className="text-base-10 text-sm">Enter your details to login.</h2>
        <div className="py-6">
          <PasskeyLoginButton />
          <div className="flex items-center justify-center gap-2 py-4">
            <Separator className="bg-base-5 w-28" />
            <Badge
              className="uppercase"
              variant="outline">
              or
            </Badge>
            <Separator className="bg-base-5 w-28" />
          </div>
          <div className="flex flex-col items-center justify-center gap-4 py-2">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleLogin)}
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
                {error && (
                  <div className="text-red-10 text-sm">{error.message}</div>
                )}

                <FormField
                  control={form.control}
                  name="turnstileToken"
                  render={() => (
                    <FormItem>
                      <FormControl>
                        <TurnstileComponent
                          onSuccess={(value) =>
                            form.setValue('turnstileToken', value)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  className="w-full"
                  loading={isPending}
                  type="submit">
                  Login
                </Button>
              </form>
            </Form>
          </div>
        </div>
        <div className="text-base-10 flex flex-col gap-2 text-sm">
          <Link
            href="/recovery"
            className="font-semibold underline underline-offset-4">
            Recover my Account
          </Link>
          <p>
            Not a member yet?
            <Link
              href="/join"
              className="text-accent-9 pl-1 font-medium underline underline-offset-2">
              {' '}
              Join instead
            </Link>
          </p>
        </div>
      </div>
      <TwoFactorDialog open={twoFactorDialogOpen} />
    </div>
  );
}
