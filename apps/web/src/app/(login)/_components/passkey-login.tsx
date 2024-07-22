'use client';

import { Button } from '@/src/components/shadcn-ui/button';
import { Fingerprint } from '@phosphor-icons/react';
import { platform } from '@/src/lib/trpc';
import { startAuthentication } from '@simplewebauthn/browser';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCallback, useState } from 'react';
import {
  TurnstileComponent,
  turnstileEnabled
} from '@/src/components/turnstile';

export function PasskeyLoginButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const generatePasskey =
    platform.useUtils().auth.passkey.generatePasskeyChallenge;
  const verifyPasskey = platform.auth.passkey.verifyPasskey.useMutation();

  const login = useCallback(async () => {
    if (turnstileEnabled && !turnstileToken) {
      toast.error('Turnstile token not found');
      return;
    }
    try {
      setLoading(true);
      const data = await generatePasskey.fetch({
        turnstileToken
      });
      const response = await startAuthentication(data.options);
      const { defaultOrg } = await verifyPasskey.mutateAsync({
        verificationResponseRaw: response
      });

      if (!defaultOrg) {
        toast.error('You are not a member of any organization', {
          description: 'Redirecting you to create an organization'
        });
        router.push('/join/org');
        return;
      }

      toast.success('Sign in successful!', {
        description: 'Redirecting you to your conversations'
      });
      router.push(`/${defaultOrg}/convo`);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          toast.warning('Passkey login either timed out or was cancelled');
        } else {
          toast.error(error.name, {
            description: error.message
          });
        }
      } else {
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  }, [generatePasskey, router, turnstileToken, verifyPasskey]);

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={() => login()}
        loading={loading}
        disabled={loading || (turnstileEnabled && !turnstileToken)}
        className="mb-2 w-72 cursor-pointer gap-2 font-semibold">
        <Fingerprint size={20} />
        <span>Login with my passkey</span>
      </Button>
      <TurnstileComponent onSuccess={setTurnstileToken} />
    </div>
  );
}
