'use client';

import { Flex, Heading, Spinner, Text, Switch, Button } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { api } from '@/src/lib/trpc';
import { VerificationModal } from './_components/verification-modal';
import { PasswordModal, TOTPModal } from './_components/reset-modals';
import useAwaitableModal from '@/src/hooks/use-awaitable-modal';
import { toast } from 'sonner';

export default function Page() {
  const {
    data: initData,
    isLoading: isInitDataLoading,
    refetch: refreshSecurityData
  } = api.account.security.getSecurityOverview.useQuery({});

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
  }, [initData, isInitDataLoading]);

  const [VerificationModalRoot, openVerifyModal] = useAwaitableModal(
    VerificationModal,
    {
      has2Fa: false,
      hasPassword: false,
      hasPasskey: false
    }
  );
  const [PasswordModalRoot, openPasswordModal] = useAwaitableModal(
    PasswordModal,
    {
      verificationToken: ''
    }
  );
  const [TOTPModalRoot, openTOTPModal] = useAwaitableModal(TOTPModal, {
    verificationToken: ''
  });

  async function waitForVerification() {
    if (!initData) throw new Error('No init data');
    if (verificationToken) return verificationToken;
    const token = await openVerifyModal({
      hasPasskey: initData.passkeys.length > 0,
      hasPassword: initData.passwordSet,
      has2Fa: initData.twoFactorEnabled
    }).catch(() => null);
    setVerificationToken(token);
    return token;
  }

  const {
    mutate: disableLegacySecurity,
    isLoading: isDisablingLegacySecurity
  } = api.account.security.disableLegacySecurity.useMutation({
    onError: (err) => {
      toast.error('Something went wrong while disabling Legacy Security', {
        description: err.message
      });
    }
  });

  const canDisableLegacySecurity = (initData?.passkeys.length ?? 0) > 0;

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
            <Flex
              gap="2"
              align="center">
              Enable Password and 2FA Login
              <Switch
                size="2"
                checked={isPassword2FaEnabled}
                disabled={
                  isDisablingLegacySecurity ||
                  !(isPassword2FaEnabled && canDisableLegacySecurity)
                }
                onCheckedChange={async () => {
                  const token = await waitForVerification();
                  if (!token) return;

                  if (isPassword2FaEnabled) {
                    disableLegacySecurity({
                      verificationToken: verificationToken ?? token
                    });
                    await refreshSecurityData();
                    setIsPassword2FaEnabled(false);
                  } else {
                    const passwordSet = await openPasswordModal({
                      verificationToken: verificationToken ?? token
                    }).catch(() => false);
                    const otpSet = await openTOTPModal({
                      verificationToken: verificationToken ?? token
                    }).catch(() => false);
                    if (!passwordSet || !otpSet) return;
                    await refreshSecurityData();
                    setIsPassword2FaEnabled(true);
                  }
                }}
              />
              {isDisablingLegacySecurity && <Spinner loading />}
            </Flex>
          </Text>

          <div className="flex gap-2">
            {initData?.passwordSet && (
              <Button
                onClick={async () => {
                  const token = await waitForVerification();
                  if (!token) return;
                  await openPasswordModal({
                    verificationToken: verificationToken ?? token
                  }).catch(() => null);
                }}>
                Reset Password
              </Button>
            )}

            {initData?.twoFactorEnabled && (
              <Button
                onClick={async () => {
                  const token = await waitForVerification();
                  if (!token) return;
                  await openTOTPModal({
                    verificationToken: verificationToken ?? token
                  }).catch(() => null);
                }}>
                Reset 2FA
              </Button>
            )}
          </div>
        </Flex>
      )}

      <VerificationModalRoot />
      <PasswordModalRoot />
      <TOTPModalRoot />
    </Flex>
  );
}
