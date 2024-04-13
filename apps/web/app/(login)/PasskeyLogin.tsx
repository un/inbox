'use client';

import { Button } from '@radix-ui/themes';
import { Fingerprint } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/trpc';
import { startAuthentication } from '@simplewebauthn/browser';
import { useRouter } from 'next/navigation';

export default function PasskeyLoginButton() {
  const [loading, setLoading] = useState(false);
  const utils = api.useUtils();
  const router = useRouter();
  const verifyPasskey = api.auth.passkey.verifyPasskey.useMutation();

  async function passkeyLogin() {
    setLoading(true);
    const data = await utils.auth.passkey.generatePasskeyChallenge
      .fetch({})
      .catch(() => null);
    if (!data) return setLoading(false);
    const response = await startAuthentication(data.options);
    verifyPasskey.mutate(
      { verificationResponseRaw: response },
      {
        // TODO: need to change this
        onSuccess: () => router.replace('/un')
      }
    );
  }

  return (
    <Button
      size="3"
      onClick={passkeyLogin}
      loading={loading}
      className="w-fit cursor-pointer font-semibold">
      <Fingerprint size={16} />
      <span>Login with my Passkey</span>
    </Button>
  );
}
