'use client';

import { Button, Flex, Text } from '@radix-ui/themes';
import { useCookies } from 'next-client-cookies';
import { RedirectType, redirect, useRouter } from 'next/navigation';
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
    redirect('/join', RedirectType.replace);
  }

  const [PasskeyModalRoot, signUpWithPasskey] = useAwaitableModal(
    PasskeyModal,
    { username }
  );

  const [PasswordModalRoot, signUpWithPassword] = useAwaitableModal(
    PasswordModal,
    { username }
  );

  const [RecoveryCodeModalRoot, showRecoveryCode] = useAwaitableModal(
    RecoveryCodeModal,
    { username, recoveryCode: '' }
  );

  const { loading, run: createAccount } = useLoading(
    async () => {
      if (selectedAuth === 'passkey') {
        await signUpWithPasskey({});
      } else {
        const { recoveryCode } = await signUpWithPassword({});
        await showRecoveryCode({
          recoveryCode
        });
      }
      cookie.remove('un-join-username');
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
    <Flex
      direction="column"
      gap="3"
      className="mx-auto w-full max-w-[560px] px-4">
      <Text
        mt="3"
        size="4"
        weight="bold">
        Secure your account {username}
      </Text>
      <Stepper
        step={2}
        total={4}
      />
      <Flex
        direction="column"
        gap="1"
        className="w-full">
        <Text
          size="3"
          className="w-full text-start"
          weight="medium">
          How do you want to secure your account?
        </Text>
      </Flex>
      <Flex
        wrap="wrap"
        gap="2">
        <PasskeyCard
          selected={selectedAuth}
          setSelected={setSelectedAuth}
        />
        <PasswordCard
          selected={selectedAuth}
          setSelected={setSelectedAuth}
        />
      </Flex>
      <Button
        onClick={() => createAccount()}
        loading={loading}>
        Create my account
      </Button>
      <PasskeyModalRoot />
      <PasswordModalRoot />
      <RecoveryCodeModalRoot />
    </Flex>
  );
}
