'use client';

import { Flex, Heading, Spinner, Text, Switch } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { api } from '@/lib/trpc';
import { VerificationModal } from './VerificationModal';
import { PasswordModal } from './PasswordModal';
import useAwaitableModal from '@/hooks/use-awaitable-modal';

export default function Page() {
  const { data: initData, isLoading: isInitDataLoading } =
    api.account.security.getSecurityOverview.useQuery({});

  const [verificationToken, setVerificationToken] = useState<null | string>(
    null
  );

  const [isPassword2FaEnabled, setIsPassword2FaEnabled] = useState(false);

  useEffect(() => {
    if (!isInitDataLoading && initData) {
      setIsPassword2FaEnabled(
        initData.passwordSet && initData.twoFactorEnabled
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initData?.passwordSet, initData?.twoFactorEnabled]);

  const [VerificationModalRoot, verifyModal] = useAwaitableModal(
    VerificationModal,
    {
      has2Fa: false,
      hasPassword: false,
      hasPasskey: false
    }
  );
  const [PasswordSetModal, updatePassword] = useAwaitableModal(PasswordModal, {
    verificationToken: ''
  });

  async function waitForVerification() {
    if (!initData) throw new Error('No init data');
    if (verificationToken) return verificationToken;
    const token = await verifyModal({
      hasPasskey: initData.passkeys.length > 0,
      hasPassword: initData.passwordSet,
      has2Fa: initData.twoFactorEnabled
    }).catch(() => null);
    setVerificationToken(token);
    return token;
  }

  return (
    <Flex
      className="p-4"
      direction="column"
      gap="3">
      <Heading
        as="h1"
        size="5">
        Your Account Security
      </Heading>

      {isInitDataLoading && (
        <Flex
          align="center"
          justify="center"
          className="h-20 w-56">
          <Spinner loading />
        </Flex>
      )}

      {!isInitDataLoading && initData && (
        <Flex
          className="my-4"
          direction="column"
          gap="5">
          <Text
            as="label"
            size="3"
            weight="medium">
            <Flex gap="2">
              Enable Password and 2FA Login
              <Switch
                size="2"
                checked={isPassword2FaEnabled}
                onCheckedChange={async () => {
                  const token = await waitForVerification();
                  if (!token) return;

                  const passwordSet = await updatePassword({
                    verificationToken: verificationToken ?? token
                  }).catch(() => false);

                  if (!passwordSet) return;

                  setIsPassword2FaEnabled(!isPassword2FaEnabled);
                }}
              />
            </Flex>
          </Text>
        </Flex>
      )}
      <VerificationModalRoot />
      <PasswordSetModal />
    </Flex>
  );
}
