'use client';

import { Button } from '@/src/components/shadcn-ui/button';
import { Fingerprint } from '@phosphor-icons/react';
import { api } from '@/src/lib/trpc';
import { startAuthentication } from '@simplewebauthn/browser';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCallback, useState } from 'react';

export function PasskeyLoginButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const generatePasskey = api.useUtils().auth.passkey.generatePasskeyChallenge;
  const verifyPasskey = api.auth.passkey.verifyPasskey.useMutation();

  const login = useCallback(async () => {
    try {
      setLoading(true);
      const data = await generatePasskey.fetch({});
      const response = await startAuthentication(data.options);
      const { defaultOrg } = await verifyPasskey.mutateAsync({
        verificationResponseRaw: response
      });

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
  }, [generatePasskey, router, verifyPasskey]);

  return (
    <Button
      onClick={() => login()}
      loading={loading}
      className="mb-2 w-72 cursor-pointer gap-2 font-semibold">
      <Fingerprint size={20} />
      <span>Login with my passkey</span>
    </Button>
  );
}
