'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { platform } from '@/src/lib/trpc';
import { toast } from 'sonner';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const called = useRef(false);

  const { mutateAsync: oauthCallback } =
    platform.auth.atproto.oauthCallback.useMutation();

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const iss = searchParams.get('iss');
    const error = searchParams.get('error');

    if (error) {
      toast.error(`Sign-in failed: ${searchParams.get('error_description') ?? error}`);
      router.replace('/');
      return;
    }

    if (!code || !state || !iss) {
      toast.error('Invalid OAuth callback parameters');
      router.replace('/');
      return;
    }

    oauthCallback({ code, state, iss })
      .then(({ defaultOrgShortcode }) => {
        if (!defaultOrgShortcode) {
          router.replace('/join/org');
        } else {
          router.replace(`/${defaultOrgShortcode}/personal/convo`);
        }
      })
      .catch((err) => {
        toast.error(err?.message ?? 'Sign-in failed');
        router.replace('/');
      });
  }, [oauthCallback, router, searchParams]);

  return (
    <div className="bg-base-2 flex h-full items-center justify-center">
      <p className="text-base-11 text-sm">Completing sign-in…</p>
    </div>
  );
}
