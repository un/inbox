'use client';

import { Button } from '@radix-ui/themes';
import { Fingerprint } from 'lucide-react';
import { api } from '@/lib/trpc';
import { startAuthentication } from '@simplewebauthn/browser';
import { useRouter } from 'next/navigation';
import useLoading from '@/hooks/use-loading';
import { toast } from 'sonner';
import { useEffect } from 'react';

export default function PasskeyLoginButton() {
  const router = useRouter();
  const generatePasskey = api.useUtils().auth.passkey.generatePasskeyChallenge;
  const verifyPasskey = api.auth.passkey.verifyPasskey.useMutation();

  const {
    loading,
    error,
    run: passkeyLogin
  } = useLoading(async () => {
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
  });

  useEffect(() => {
    if (error) {
      if (error.name === 'NotAllowedError') {
        toast.warning('Passkey login either timed out or was cancelled');
      } else {
        toast.error(error.name, {
          description: error.message
        });
      }
    }
  }, [error]);

  return (
    <Button
      size="3"
      onClick={passkeyLogin.bind(null, {})}
      loading={loading}
      disabled={loading}
      className="w-full cursor-pointer font-semibold">
      <Fingerprint size={20} />
      <span>Login with my Passkey</span>
    </Button>
  );
}
