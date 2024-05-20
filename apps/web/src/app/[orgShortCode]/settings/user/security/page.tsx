'use client';

import {
  Flex,
  Heading,
  Spinner,
  Text,
  Switch,
  Button,
  IconButton
} from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { api } from '@/src/lib/trpc';
import { VerificationModal } from './_components/verification-modal';
import { DeletePasskeyModal } from './_components/delete-modals';
import {
  PasswordModal,
  TOTPModal,
  RecoveryCodeModal
} from './_components/reset-modals';
import useAwaitableModal from '@/src/hooks/use-awaitable-modal';
import { toast } from 'sonner';
import { Trash } from '@phosphor-icons/react';
import { format } from 'date-fns';
import useLoading from '@/src/hooks/use-loading';
import { startRegistration } from '@simplewebauthn/browser';
import { useRouter } from 'next/navigation';
import { DeleteAllSessions } from './_components/session-modals';
import { useQueryClient } from '@tanstack/react-query';
// import { PasskeyNameModal } from './_components/passkey-modals';

export default function Page() {
  const queryClient = useQueryClient();
  const router = useRouter();

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

  const [RecoveryModalRoot, openRecoveryModal] = useAwaitableModal(
    RecoveryCodeModal,
    {
      verificationToken: '',
      mode: 'reset'
    }
  );

  const [DeletePasskeyModalRoot, openDeletePasskeyModal] = useAwaitableModal(
    DeletePasskeyModal,
    {
      publicId: 'ap_',
      name: '',
      verificationToken: ''
    }
  );

  const [DeleteAllSessionsModalRoot, openDeleteAllSessionsModal] =
    useAwaitableModal(DeleteAllSessions, { verificationToken: '' });

  // const [PasskeyNameModalRoot, openPasskeyNameModal] = useAwaitableModal(
  //   PasskeyNameModal,
  //   {}
  // );

  const fetchPasskeyChallengeApi =
    api.useUtils().account.security.generateNewPasskeyChallenge;
  const { mutateAsync: addNewPasskey } =
    api.account.security.addNewPasskey.useMutation({
      onSuccess: () => {
        void refreshSecurityData();
      },
      onError: (err) => {
        toast.error('Something went wrong while adding new passkey', {
          description: err.message
        });
      }
    });

  const { loading: passkeyAddLoading, run: addPasskey } = useLoading(
    async () => {
      const token = await waitForVerification();
      if (!token) return;
      const challenge = await fetchPasskeyChallengeApi.fetch({
        verificationToken: token
      });
      const response = await startRegistration(challenge.options);

      // Need to have a separate endpoint for rename
      // const passkeyName = await openPasskeyNameModal().catch(() => null);
      // if (!passkeyName) return;

      await addNewPasskey({
        verificationToken: token,
        // nickname: passkeyName,
        registrationResponseRaw: response
      });
    }
  );

  const { mutateAsync: logoutSingle } =
    api.account.security.deleteSession.useMutation();

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
  const canDeletePasskey =
    (initData?.passkeys.length ?? 0) > 1 || isPassword2FaEnabled;

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
        <div className="my-4 flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <span className="text-lg font-bold">Legacy Security</span>
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
                    (isPassword2FaEnabled && !canDisableLegacySecurity)
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
          </div>
          {(initData.recoveryCodeSet || isPassword2FaEnabled) && (
            <div className="flex flex-col gap-3">
              <span className="text-lg font-bold">Account Recovery</span>
              <Button
                className="w-fit"
                onClick={async () => {
                  const token = await waitForVerification();
                  if (!token) return;
                  await openRecoveryModal({
                    verificationToken: verificationToken ?? token,
                    mode: isPassword2FaEnabled ? 'reset' : 'disable'
                  }).catch(() => null);
                  await refreshSecurityData();
                }}>
                {initData.recoveryCodeSet
                  ? isPassword2FaEnabled
                    ? 'Reset Recovery Code'
                    : 'Disable Recovery Code'
                  : 'Setup Recovery'}
              </Button>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <span className="text-lg font-bold">Passkeys</span>
            <div className="flex flex-wrap gap-2">
              {initData?.passkeys.map((passkey) => (
                <div
                  key={passkey.publicId}
                  className="bg-muted flex items-center justify-center gap-2 rounded border px-2 py-1">
                  <div className="flex flex-col">
                    <span>{passkey.nickname}</span>
                    <span className="text-muted-foreground text-xs">
                      {format(passkey.createdAt, ' HH:mm, do MMM yyyy')}
                    </span>
                  </div>
                  <div>
                    <IconButton
                      size="2"
                      variant="soft"
                      disabled={!canDeletePasskey}
                      onClick={async () => {
                        const token = await waitForVerification();
                        if (!token) return;
                        await openDeletePasskeyModal({
                          publicId: passkey.publicId,
                          name: passkey.nickname,
                          verificationToken: verificationToken ?? token
                        })
                          .then(() => refreshSecurityData())
                          .catch(() => null);
                      }}>
                      <Trash size={16} />
                    </IconButton>
                  </div>
                </div>
              ))}
              {initData?.passkeys.length === 0 && (
                <div className="text-muted-foreground">No passkeys found</div>
              )}
            </div>
            <Button
              className="w-fit"
              loading={passkeyAddLoading}
              onClick={() => addPasskey({ clearError: true, clearData: true })}>
              Add New Passkey
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-lg font-bold">Sessions</span>
            <div className="flex flex-wrap gap-2">
              {initData?.sessions.map((session) => (
                <div
                  key={session.publicId}
                  className="bg-muted flex items-center justify-center gap-2 rounded border px-2 py-1">
                  <div className="flex flex-col">
                    <span>
                      {session.device} - {session.os}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {format(session.createdAt, ' HH:mm, do MMM yyyy')}
                    </span>
                  </div>
                  <div>
                    <IconButton
                      size="2"
                      variant="soft"
                      onClick={async () => {
                        const token = await waitForVerification();
                        if (!token) return;
                        await logoutSingle({
                          sessionPublicId: session.publicId,
                          verificationToken: verificationToken ?? token
                        })
                          .then(() => refreshSecurityData())
                          .catch(() => null);
                      }}>
                      <Trash size={16} />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
            <Button
              className="w-fit"
              onClick={async () => {
                const token = await waitForVerification();
                if (!token) return;
                await openDeleteAllSessionsModal({
                  verificationToken: verificationToken ?? token
                })
                  .then(() => {
                    queryClient.removeQueries();
                    router.replace('/');
                  })
                  .catch(() => null);
              }}>
              Logout of All Sessions
            </Button>
          </div>
        </div>
      )}

      <VerificationModalRoot />
      <PasswordModalRoot />
      <TOTPModalRoot />
      <RecoveryModalRoot />
      <DeletePasskeyModalRoot />
      {/* <PasskeyNameModalRoot /> */}
      <DeleteAllSessionsModalRoot />
    </Flex>
  );
}
