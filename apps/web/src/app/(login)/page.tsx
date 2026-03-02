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
import { Separator } from '@/src/components/shadcn-ui/separator';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/src/components/shadcn-ui/button';
import { Badge } from '@/src/components/shadcn-ui/badge';
import { Input } from '@/src/components/shadcn-ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { zodSchemas } from '@u22n/utils/zodSchemas';
import { At, ArrowRight } from '@phosphor-icons/react';
import { useForm } from 'react-hook-form';
import { platform } from '@/src/lib/trpc';
import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import Link from 'next/link';
import { z } from 'zod';

const oauthSchema = z.object({
  handle: z.string().min(3, 'Enter your AT Protocol handle (e.g. alice.bsky.social)')
});

const signupSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  handle: zodSchemas.username()
});

export default function Page() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect_to');

  const { mutateAsync: initiateOAuth, isPending: oauthPending } =
    platform.auth.atproto.initiateOAuth.useMutation();

  const { mutateAsync: custodialSignup, isPending: signupPending } =
    platform.auth.atproto.custodialSignup.useMutation();

  const oauthForm = useForm<z.infer<typeof oauthSchema>>({
    resolver: zodResolver(oauthSchema),
    defaultValues: { handle: '' }
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', handle: '' }
  });

  async function onOAuthSubmit({ handle }: z.infer<typeof oauthSchema>) {
    const { authUrl } = await initiateOAuth({ handle }).catch((err) => {
      toast.error(err?.message ?? 'Failed to start sign-in');
      throw err;
    });
    window.location.href = authUrl;
  }

  async function onSignupSubmit({ email, handle }: z.infer<typeof signupSchema>) {
    if (turnstileEnabled && !turnstileToken) {
      toast.error('Complete the captcha first');
      return;
    }
    await custodialSignup({ email, handle, turnstileToken }).catch((err) => {
      toast.error(err?.message ?? 'Signup failed');
      throw err;
    });

    toast.success('Account created!');
    if (redirectTo) {
      router.replace(decodeURIComponent(redirectTo));
    } else {
      router.replace('/join/org');
    }
  }

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
        <h1 className="mb-2 text-2xl font-medium">
          {mode === 'login' ? 'Login to your UnInbox' : 'Create your UnInbox'}
        </h1>

        {mode === 'login' ? (
          <div className="py-6">
            <p className="text-base-11 mb-4 text-sm">
              Sign in with your AT Protocol identity (Bluesky, any PDS, or a
              UnInbox-hosted handle).
            </p>
            <Form {...oauthForm}>
              <form
                onSubmit={oauthForm.handleSubmit(onOAuthSubmit)}
                className="flex w-full flex-col gap-3">
                <FormField
                  control={oauthForm.control}
                  name="handle"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          label="Handle"
                          placeholder="alice.bsky.social"
                          {...field}
                          leadingSlot={At}
                          inputSize="lg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  className="w-full"
                  loading={oauthPending}
                  type="submit">
                  Sign in with AT Protocol
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </form>
            </Form>

            <div className="text-base-10 mt-6 flex flex-col gap-2 text-sm">
              <p>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-accent-9 font-medium underline underline-offset-2">
                  Create one
                </button>
              </p>
            </div>
          </div>
        ) : (
          <div className="py-6">
            <p className="text-base-11 mb-4 text-sm">
              We&apos;ll create an AT Protocol identity on our PDS for you.
            </p>
            <Form {...signupForm}>
              <form
                onSubmit={signupForm.handleSubmit(onSignupSubmit)}
                className="flex w-full flex-col gap-3">
                <FormField
                  control={signupForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          label="Email"
                          type="email"
                          {...field}
                          inputSize="lg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="handle"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          label="Handle"
                          placeholder="alice"
                          {...field}
                          leadingSlot={At}
                          inputSize="lg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <TurnstileComponent onSuccess={setTurnstileToken} />
                <Button
                  className="w-full"
                  loading={signupPending}
                  type="submit">
                  Create Account
                </Button>
              </form>
            </Form>

            <div className="text-base-10 mt-6 flex flex-col gap-2 text-sm">
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-accent-9 font-medium underline underline-offset-2">
                  Sign in
                </button>
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 py-2">
          <Separator className="bg-base-5 w-28" />
          <Badge className="uppercase" variant="outline">
            or
          </Badge>
          <Separator className="bg-base-5 w-28" />
        </div>
        <p className="text-base-10 text-sm">
          Have a Bluesky or custom PDS account?{' '}
          <button
            type="button"
            onClick={() => setMode('login')}
            className="text-accent-9 font-medium underline underline-offset-2">
            Sign in with AT Protocol
          </button>
        </p>
      </div>
    </div>
  );
}
