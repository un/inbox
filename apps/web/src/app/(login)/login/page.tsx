'use client';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/src/components/shadcn-ui/form';
import { zodSchemas } from '@u22n/utils/zodSchemas';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/src/components/shadcn-ui/input';
import { PasswordInput } from '@/src/components/password-input';
import { Button } from '@/src/components/shadcn-ui/button';
import { api } from '@/src/lib/trpc';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle
} from '@/src/components/shadcn-ui/alert-dialog';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from '@/src/components/shadcn-ui/input-otp';
import {
  TurnstileComponent,
  turnstileEnabled
} from '@/src/components/turnstile';

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
  } = api.auth.password.signIn.useMutation();

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    try {
      const { status, defaultOrgShortCode } = await login(values);
      if (status === 'NO_2FA_SETUP') {
        if (!defaultOrgShortCode) {
          router.push('/join/org');
        } else {
          router.push(
            `/${defaultOrgShortCode}/settings/user/security?code=NO_2FA_SETUP`
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
    <div className="flex h-full items-center justify-center">
      <div className="-mt-4">
        <h1 className="mb-2 text-center text-2xl font-medium">Login to your</h1>
        <h2 className="font-display mb-6 text-center text-5xl">UnInbox</h2>
        <div className="bg-card w-96 rounded border p-8">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleLogin)}
              className="flex w-full flex-col items-center justify-center gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <PasswordInput {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <FormMessage>{error.message}</FormMessage>}

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
          <TwoFactorDialog open={twoFactorDialogOpen} />
        </div>
      </div>
    </div>
  );
}

function TwoFactorDialog({ open }: { open: boolean }) {
  const [code, setCode] = useState('');
  const router = useRouter();
  const { isSuccess, error, mutateAsync, isPending } =
    api.auth.twoFactorAuthentication.verifyTwoFactorChallenge.useMutation();

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="w-min p-8">
        <AlertDialogTitle>Two Factor Authentication</AlertDialogTitle>
        <AlertDialogDescription>
          Please enter the 6-digit code from your authenticator app
        </AlertDialogDescription>
        <div className="mx-auto w-fit">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e)}>
            <InputOTPGroup>
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
          <div className="text-destructive text-center text-sm">
            {error.message}
          </div>
        )}
        <Button
          className="mx-auto w-full"
          variant="secondary"
          disabled={code.length !== 6 || isPending || isSuccess}
          loading={isPending || isSuccess}
          onClick={async () => {
            try {
              const { defaultOrgSlug } = await mutateAsync({
                twoFactorCode: code
              });
              if (!defaultOrgSlug) {
                router.push('/join/org');
              } else {
                router.push(`/${defaultOrgSlug}`);
              }
            } catch {
              /* do nothing */
            }
          }}>
          {isSuccess ? 'Redirecting...' : isPending ? 'Verifying...' : 'Verify'}
        </Button>
      </AlertDialogContent>
    </AlertDialog>
  );
}
