'use client';

import { Button } from '@/src/components/shadcn-ui/button';
import { useCookies } from 'next-client-cookies';
import { useRouter } from 'next/navigation';
import Stepper from '../_components/stepper';
import { PasskeyCard, PasswordCard } from './_components/secure-cards';
import { useQueryState, parseAsStringLiteral } from 'nuqs';
import useLoading from '@/src/hooks/use-loading';
import { toast } from 'sonner';
import {
  PasskeyModal,
  PasswordModal,
  RecoveryCodeModal
} from './_components/modals';
import useAwaitableModal from '@/src/hooks/use-awaitable-modal';

export default function Page() {
  const cookie = useCookies();
  const username = cookie.get('un-join-username');
  const [selectedAuth, setSelectedAuth] = useQueryState(
    'auth',
    parseAsStringLiteral(['passkey', 'password']).withDefault('passkey')
  );
  const router = useRouter();

  if (!username) {
    router.push('/join');
  }

  const [PasskeyModalRoot, signUpWithPasskey] = useAwaitableModal(
    PasskeyModal,
    { username: username ?? '' }
  );

  const [PasswordModalRoot, signUpWithPassword] = useAwaitableModal(
    PasswordModal,
    { username: username ?? '' }
  );

  const [RecoveryCodeModalRoot, showRecoveryCode] = useAwaitableModal(
    RecoveryCodeModal,
    { username: username ?? '', recoveryCode: '' }
  );

  const { loading, run: createAccount } = useLoading(
    async () => {
      if (selectedAuth === 'passkey') {
        await signUpWithPasskey({
          username: username ?? ''
        });
      } else {
        const { recoveryCode } = await signUpWithPassword({
          username: username ?? ''
        });
        await showRecoveryCode({
          recoveryCode
        });
      }
      toast.success(
        'Your account has been created! Redirecting for Organization Creation'
      );
      router.push('/join/org');
    },
    {
      onError: (error) => {
        if (error) {
          toast.error(error.message);
        }
      }
    }
  );

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-4">
      <div className="text-bold mt-3 text-lg font-bold">
        Secure your account {username}
      </div>
      <Stepper
        step={2}
        total={4}
      />
      <div className="flex w-full flex-col gap-1">
        <div className="w-full text-start font-medium">
          How do you want to secure your account?
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <PasskeyCard
          selected={selectedAuth}
          setSelected={setSelectedAuth}
        />
        <PasswordCard
          selected={selectedAuth}
          setSelected={setSelectedAuth}
        />
      </div>
      <Button
        onClick={() => createAccount()}
        loading={loading}>
        Create my account
      </Button>
      <PasskeyModalRoot />
      <PasswordModalRoot />
      <RecoveryCodeModalRoot />
    </div>
  );
}
